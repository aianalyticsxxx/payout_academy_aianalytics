-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- Run this in Supabase SQL Editor after initial migration
-- These policies ensure users can only access their own data

-- ==========================================
-- ENABLE RLS ON ALL TABLES
-- ==========================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Parlay" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParlayLeg" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankrollHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Challenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChallengeBet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChallengeReward" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GlobalLeaderboard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PendingPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayoutRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Referral" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIPrediction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AILeaderboard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyMetrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UsageLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomReferralLink" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- SERVICE ROLE BYPASS
-- ==========================================
-- The service role (used by the app) bypasses RLS
-- This is handled by Supabase automatically

-- ==========================================
-- USER TABLE POLICIES
-- ==========================================

-- Users can read their own data
CREATE POLICY "Users can view own profile"
  ON "User" FOR SELECT
  USING (auth.uid()::text = id);

-- Users can update their own non-sensitive fields
CREATE POLICY "Users can update own profile"
  ON "User" FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (
    auth.uid()::text = id
    AND role = (SELECT role FROM "User" WHERE id = auth.uid()::text)  -- Prevent role escalation
  );

-- ==========================================
-- ACCOUNT TABLE POLICIES (OAuth)
-- ==========================================

CREATE POLICY "Users can view own accounts"
  ON "Account" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can manage own accounts"
  ON "Account" FOR ALL
  USING (auth.uid()::text = "userId");

-- ==========================================
-- SESSION POLICIES
-- ==========================================

CREATE POLICY "Users can view own sessions"
  ON "Session" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own sessions"
  ON "Session" FOR DELETE
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can view own user sessions"
  ON "UserSession" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can manage own user sessions"
  ON "UserSession" FOR ALL
  USING (auth.uid()::text = "userId");

-- ==========================================
-- BET POLICIES
-- ==========================================

CREATE POLICY "Users can view own bets"
  ON "Bet" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create own bets"
  ON "Bet" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own bets"
  ON "Bet" FOR UPDATE
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own bets"
  ON "Bet" FOR DELETE
  USING (auth.uid()::text = "userId");

-- ==========================================
-- PARLAY POLICIES
-- ==========================================

CREATE POLICY "Users can view own parlays"
  ON "Parlay" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create own parlays"
  ON "Parlay" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own parlays"
  ON "Parlay" FOR UPDATE
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own parlays"
  ON "Parlay" FOR DELETE
  USING (auth.uid()::text = "userId");

-- Parlay legs inherit from parlay ownership
CREATE POLICY "Users can view own parlay legs"
  ON "ParlayLeg" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Parlay"
      WHERE "Parlay".id = "ParlayLeg"."parlayId"
      AND "Parlay"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can manage own parlay legs"
  ON "ParlayLeg" FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Parlay"
      WHERE "Parlay".id = "ParlayLeg"."parlayId"
      AND "Parlay"."userId" = auth.uid()::text
    )
  );

-- ==========================================
-- CHALLENGE POLICIES
-- ==========================================

CREATE POLICY "Users can view own challenges"
  ON "Challenge" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create own challenges"
  ON "Challenge" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

-- Challenge bets inherit from challenge ownership
CREATE POLICY "Users can view own challenge bets"
  ON "ChallengeBet" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Challenge"
      WHERE "Challenge".id = "ChallengeBet"."challengeId"
      AND "Challenge"."userId" = auth.uid()::text
    )
  );

-- Challenge rewards inherit from challenge ownership
CREATE POLICY "Users can view own challenge rewards"
  ON "ChallengeReward" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Challenge"
      WHERE "Challenge".id = "ChallengeReward"."challengeId"
      AND "Challenge"."userId" = auth.uid()::text
    )
  );

-- ==========================================
-- FINANCIAL POLICIES
-- ==========================================

CREATE POLICY "Users can view own bankroll history"
  ON "BankrollHistory" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can view own pending payments"
  ON "PendingPayment" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can view own payout requests"
  ON "PayoutRequest" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create payout requests"
  ON "PayoutRequest" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

-- ==========================================
-- LEADERBOARD POLICIES
-- ==========================================

-- Leaderboard is public for viewing (anonymous stats)
CREATE POLICY "Anyone can view leaderboard"
  ON "GlobalLeaderboard" FOR SELECT
  USING (true);

-- Users can only update their own entry (via service role)
CREATE POLICY "Users can update own leaderboard"
  ON "GlobalLeaderboard" FOR UPDATE
  USING (auth.uid()::text = "userId");

-- ==========================================
-- REFERRAL POLICIES
-- ==========================================

-- Users can view referrals they made
CREATE POLICY "Users can view referrals they made"
  ON "Referral" FOR SELECT
  USING (auth.uid()::text = "referrerId");

-- Users can view if they were referred
CREATE POLICY "Users can view their referral"
  ON "Referral" FOR SELECT
  USING (auth.uid()::text = "referredId");

-- ==========================================
-- AI PREDICTION POLICIES (PUBLIC READ)
-- ==========================================

-- AI predictions are public (consensus data)
CREATE POLICY "Anyone can view AI predictions"
  ON "AIPrediction" FOR SELECT
  USING (true);

-- AI leaderboard is public
CREATE POLICY "Anyone can view AI leaderboard"
  ON "AILeaderboard" FOR SELECT
  USING (true);

-- ==========================================
-- ADMIN POLICIES
-- ==========================================

-- Only admins can view admin logs (via role check)
CREATE POLICY "Admins can view admin logs"
  ON "AdminLog" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
      AND "User".role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Only admins can view daily metrics
CREATE POLICY "Admins can view daily metrics"
  ON "DailyMetrics" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
      AND "User".role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ==========================================
-- CUSTOM REFERRAL LINKS (ADMIN ONLY)
-- ==========================================

CREATE POLICY "Admins can manage referral links"
  ON "CustomReferralLink" FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
      AND "User".role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Public can view active referral links (for landing pages)
CREATE POLICY "Public can view active referral links"
  ON "CustomReferralLink" FOR SELECT
  USING ("isActive" = true);

-- ==========================================
-- PUSH SUBSCRIPTION POLICIES
-- ==========================================

CREATE POLICY "Users can manage own push subscriptions"
  ON "PushSubscription" FOR ALL
  USING (auth.uid()::text = "userId");

-- ==========================================
-- USAGE LOG (SERVICE ROLE ONLY)
-- ==========================================
-- No user policies - only service role can write/read

-- ==========================================
-- VERIFICATION TOKEN (NO USER ACCESS)
-- ==========================================
ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;
-- No policies - only service role access

-- ==========================================
-- IMPORTANT NOTES
-- ==========================================
-- 1. The Prisma client uses the service role key which bypasses RLS
-- 2. Direct Supabase client connections respect RLS
-- 3. These policies are defense-in-depth
-- 4. Always validate permissions in API routes as primary control
-- 5. Test thoroughly after applying these policies
