-- ==========================================
-- PAYOUT ACADEMY - SUPABASE SQL SETUP
-- ==========================================
-- Run this in Supabase SQL Editor if not using Prisma
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- USERS & AUTH (extends Supabase auth.users)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  avatar TEXT DEFAULT '🎲',
  tier TEXT DEFAULT 'Bronze',
  
  -- Stripe
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  stripe_current_period_end TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- BETS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Event
  event_id TEXT,
  sport TEXT NOT NULL,
  league TEXT,
  matchup TEXT NOT NULL,
  
  -- Bet details
  bet_type TEXT NOT NULL, -- spread, moneyline, totals, prop
  selection TEXT NOT NULL,
  odds TEXT NOT NULL,
  odds_decimal NUMERIC(10,4) NOT NULL,
  stake NUMERIC(10,2) NOT NULL,
  
  -- Results
  result TEXT DEFAULT 'pending', -- pending, won, lost, push
  profit_loss NUMERIC(10,2),
  
  -- Meta
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  settled_at TIMESTAMPTZ
);

CREATE INDEX idx_bets_user ON public.bets(user_id);
CREATE INDEX idx_bets_result ON public.bets(result);
CREATE INDEX idx_bets_event ON public.bets(event_id);
CREATE INDEX idx_bets_created ON public.bets(created_at DESC);

-- ==========================================
-- BANKROLL HISTORY
-- ==========================================

CREATE TABLE IF NOT EXISTS public.bankroll_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  balance NUMERIC(12,2) NOT NULL,
  change NUMERIC(10,2) DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bankroll_user ON public.bankroll_history(user_id);
CREATE INDEX idx_bankroll_created ON public.bankroll_history(created_at DESC);

-- ==========================================
-- AI PREDICTIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.ai_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Event
  event_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  sport TEXT,
  league TEXT,
  home_team TEXT,
  away_team TEXT,
  commence_time TIMESTAMPTZ,
  
  -- AI Analysis
  consensus_verdict TEXT, -- STRONG BET, SLIGHT EDGE, RISKY, AVOID
  consensus_score NUMERIC(5,2),
  bet_votes INTEGER DEFAULT 0,
  pass_votes INTEGER DEFAULT 0,
  ai_votes JSONB NOT NULL DEFAULT '[]',
  
  -- Bet details
  bet_selection TEXT,
  bet_odds NUMERIC(10,4),
  
  -- Results
  result TEXT DEFAULT 'pending',
  actual_score TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  settled_at TIMESTAMPTZ
);

CREATE INDEX idx_predictions_event ON public.ai_predictions(event_id);
CREATE INDEX idx_predictions_result ON public.ai_predictions(result);
CREATE INDEX idx_predictions_created ON public.ai_predictions(created_at DESC);

-- ==========================================
-- AI LEADERBOARD
-- ==========================================

CREATE TABLE IF NOT EXISTS public.ai_leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT UNIQUE NOT NULL, -- claude, chatgpt, gemini, etc.
  agent_name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  
  -- Stats
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  pushes INTEGER DEFAULT 0,
  total_predictions INTEGER DEFAULT 0,
  
  -- Performance
  win_rate NUMERIC(5,2) DEFAULT 0,
  roi NUMERIC(8,4) DEFAULT 0,
  
  -- Streaks
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  worst_streak INTEGER DEFAULT 0,
  
  -- Weighting
  vote_weight NUMERIC(4,2) DEFAULT 1.0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed AI agents
INSERT INTO public.ai_leaderboard (agent_id, agent_name, emoji) VALUES
  ('claude', 'Claude', '🟠'),
  ('chatgpt', 'ChatGPT', '💚'),
  ('gemini', 'Gemini', '🔵'),
  ('grok', 'Grok', '⚡'),
  ('llama', 'Llama', '🦙'),
  ('copilot', 'Copilot', '🤖'),
  ('perplexity', 'Perplexity', '🔍')
ON CONFLICT (agent_id) DO NOTHING;

-- ==========================================
-- GLOBAL LEADERBOARD
-- ==========================================

CREATE TABLE IF NOT EXISTS public.global_leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Stats
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  pushes INTEGER DEFAULT 0,
  total_bets INTEGER DEFAULT 0,
  
  -- Performance
  total_profit NUMERIC(12,2) DEFAULT 0,
  total_staked NUMERIC(12,2) DEFAULT 0,
  roi NUMERIC(8,4) DEFAULT 0,
  win_rate NUMERIC(5,2) DEFAULT 0,
  
  -- Streaks
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  
  -- Rank
  rank INTEGER,
  tier TEXT DEFAULT 'Bronze',
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_rank ON public.global_leaderboard(rank);
CREATE INDEX idx_leaderboard_roi ON public.global_leaderboard(roi DESC);

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Recalculate leaderboard ranks
CREATE OR REPLACE FUNCTION recalculate_leaderboard_ranks()
RETURNS void AS $$
BEGIN
  WITH ranked AS (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (
        ORDER BY roi DESC, win_rate DESC, wins DESC
      ) as new_rank
    FROM public.global_leaderboard
    WHERE total_bets >= 10 -- Minimum bets for ranking
  )
  UPDATE public.global_leaderboard gl
  SET rank = r.new_rank
  FROM ranked r
  WHERE gl.user_id = r.user_id;
  
  -- Unranked users (< 10 bets)
  UPDATE public.global_leaderboard
  SET rank = NULL
  WHERE total_bets < 10;
END;
$$ LANGUAGE plpgsql;

-- Update user stats after bet settlement
CREATE OR REPLACE FUNCTION update_user_stats(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_wins INTEGER;
  v_losses INTEGER;
  v_pushes INTEGER;
  v_total_profit NUMERIC;
  v_total_staked NUMERIC;
  v_win_rate NUMERIC;
  v_roi NUMERIC;
  v_tier TEXT;
BEGIN
  -- Calculate stats from bets
  SELECT 
    COUNT(*) FILTER (WHERE result = 'won'),
    COUNT(*) FILTER (WHERE result = 'lost'),
    COUNT(*) FILTER (WHERE result = 'push'),
    COALESCE(SUM(profit_loss), 0),
    COALESCE(SUM(stake) FILTER (WHERE result != 'push'), 0)
  INTO v_wins, v_losses, v_pushes, v_total_profit, v_total_staked
  FROM public.bets
  WHERE user_id = p_user_id AND result != 'pending';
  
  -- Calculate rates
  v_win_rate := CASE WHEN (v_wins + v_losses) > 0 
    THEN (v_wins::NUMERIC / (v_wins + v_losses)) * 100 
    ELSE 0 END;
    
  v_roi := CASE WHEN v_total_staked > 0 
    THEN (v_total_profit / v_total_staked) * 100 
    ELSE 0 END;
  
  -- Determine tier
  v_tier := CASE
    WHEN v_wins >= 100 AND v_win_rate >= 60 AND v_roi >= 15 THEN 'Diamond'
    WHEN v_wins >= 75 AND v_win_rate >= 57 AND v_roi >= 10 THEN 'Platinum'
    WHEN v_wins >= 50 AND v_win_rate >= 55 AND v_roi >= 5 THEN 'Gold'
    WHEN v_wins >= 25 AND v_win_rate >= 52 THEN 'Silver'
    ELSE 'Bronze'
  END;
  
  -- Upsert leaderboard
  INSERT INTO public.global_leaderboard (
    user_id, wins, losses, pushes, total_bets, 
    total_profit, total_staked, roi, win_rate, tier
  ) VALUES (
    p_user_id, v_wins, v_losses, v_pushes, v_wins + v_losses + v_pushes,
    v_total_profit, v_total_staked, v_roi, v_win_rate, v_tier
  )
  ON CONFLICT (user_id) DO UPDATE SET
    wins = EXCLUDED.wins,
    losses = EXCLUDED.losses,
    pushes = EXCLUDED.pushes,
    total_bets = EXCLUDED.total_bets,
    total_profit = EXCLUDED.total_profit,
    total_staked = EXCLUDED.total_staked,
    roi = EXCLUDED.roi,
    win_rate = EXCLUDED.win_rate,
    tier = EXCLUDED.tier,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bankroll_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_leaderboard ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/edit their own
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Bets: users can only manage their own
CREATE POLICY "Users can view own bets" ON public.bets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bets" ON public.bets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bets" ON public.bets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bets" ON public.bets
  FOR DELETE USING (auth.uid() = user_id);

-- Bankroll: users can only see their own
CREATE POLICY "Users can view own bankroll" ON public.bankroll_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bankroll" ON public.bankroll_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Leaderboard: anyone can view, only system can update
CREATE POLICY "Anyone can view leaderboard" ON public.global_leaderboard
  FOR SELECT TO authenticated USING (true);

-- AI predictions: anyone can view
CREATE POLICY "Anyone can view AI predictions" ON public.ai_predictions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can view AI leaderboard" ON public.ai_leaderboard
  FOR SELECT USING (true);

-- ==========================================
-- REALTIME SUBSCRIPTIONS
-- ==========================================

-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_leaderboard;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_leaderboard;
