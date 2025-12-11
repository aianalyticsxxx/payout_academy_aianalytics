-- ==========================================
-- RESTORE ZALOGCHE DATABASE SCHEMA
-- ==========================================
-- Run this in Supabase SQL Editor for database: bpuyioyyarnpyjtnbnci
-- This will DROP all crowdgrowing tables and restore betting platform schema
-- ==========================================

-- Drop crowdgrowing tables
DROP TABLE IF EXISTS "MushroomVariety" CASCADE;
DROP TABLE IF EXISTS "Grow" CASCADE;
DROP TABLE IF EXISTS "Harvest" CASCADE;
DROP TABLE IF EXISTS "Order" CASCADE;
DROP TABLE IF EXISTS "OrderItem" CASCADE;
DROP TABLE IF EXISTS "Withdrawal" CASCADE;
DROP TABLE IF EXISTS "Deposit" CASCADE;

-- Now the User, Account, Session tables should still exist
-- We need to add the betting-specific tables

-- ==========================================
-- BETTING
-- ==========================================

CREATE TABLE IF NOT EXISTS "Bet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventId" TEXT,
  "sport" TEXT NOT NULL,
  "league" TEXT,
  "matchup" TEXT NOT NULL,
  "betType" TEXT NOT NULL,
  "selection" TEXT NOT NULL,
  "odds" TEXT NOT NULL,
  "oddsDecimal" DOUBLE PRECISION NOT NULL,
  "stake" DOUBLE PRECISION NOT NULL,
  "result" TEXT NOT NULL DEFAULT 'pending',
  "profitLoss" DOUBLE PRECISION,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settledAt" TIMESTAMP(3),
  CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BankrollHistory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balance" DOUBLE PRECISION NOT NULL,
  "change" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BankrollHistory_pkey" PRIMARY KEY ("id")
);

-- ==========================================
-- PARLAYS
-- ==========================================

CREATE TABLE IF NOT EXISTS "Parlay" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stake" DOUBLE PRECISION NOT NULL,
  "totalOdds" DOUBLE PRECISION NOT NULL,
  "result" TEXT NOT NULL DEFAULT 'pending',
  "profitLoss" DOUBLE PRECISION,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settledAt" TIMESTAMP(3),
  CONSTRAINT "Parlay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ParlayLeg" (
  "id" TEXT NOT NULL,
  "parlayId" TEXT NOT NULL,
  "eventId" TEXT,
  "sport" TEXT NOT NULL,
  "league" TEXT,
  "matchup" TEXT NOT NULL,
  "betType" TEXT NOT NULL,
  "selection" TEXT NOT NULL,
  "odds" TEXT NOT NULL,
  "oddsDecimal" DOUBLE PRECISION NOT NULL,
  "result" TEXT NOT NULL DEFAULT 'pending',
  CONSTRAINT "ParlayLeg_pkey" PRIMARY KEY ("id")
);

-- ==========================================
-- AI PREDICTIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS "AIPrediction" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "sport" TEXT,
  "league" TEXT,
  "homeTeam" TEXT,
  "awayTeam" TEXT,
  "commenceTime" TIMESTAMP(3),
  "consensusVerdict" TEXT,
  "consensusScore" DOUBLE PRECISION,
  "betVotes" INTEGER NOT NULL DEFAULT 0,
  "passVotes" INTEGER NOT NULL DEFAULT 0,
  "aiVotes" JSONB NOT NULL,
  "betSelection" TEXT,
  "betOdds" DOUBLE PRECISION,
  "result" TEXT NOT NULL DEFAULT 'pending',
  "actualScore" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settledAt" TIMESTAMP(3),
  CONSTRAINT "AIPrediction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AILeaderboard" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "agentName" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "wins" INTEGER NOT NULL DEFAULT 0,
  "losses" INTEGER NOT NULL DEFAULT 0,
  "pushes" INTEGER NOT NULL DEFAULT 0,
  "totalPredictions" INTEGER NOT NULL DEFAULT 0,
  "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "roi" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currentStreak" INTEGER NOT NULL DEFAULT 0,
  "bestStreak" INTEGER NOT NULL DEFAULT 0,
  "worstStreak" INTEGER NOT NULL DEFAULT 0,
  "voteWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AILeaderboard_pkey" PRIMARY KEY ("id")
);

-- ==========================================
-- USER COMPETITION
-- ==========================================

CREATE TABLE IF NOT EXISTS "GlobalLeaderboard" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "wins" INTEGER NOT NULL DEFAULT 0,
  "losses" INTEGER NOT NULL DEFAULT 0,
  "pushes" INTEGER NOT NULL DEFAULT 0,
  "totalBets" INTEGER NOT NULL DEFAULT 0,
  "totalProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalStaked" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "roi" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currentStreak" INTEGER NOT NULL DEFAULT 0,
  "bestStreak" INTEGER NOT NULL DEFAULT 0,
  "rank" INTEGER,
  "tier" TEXT NOT NULL DEFAULT 'Bronze',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GlobalLeaderboard_pkey" PRIMARY KEY ("id")
);

-- ==========================================
-- PUSH NOTIFICATIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- ==========================================
-- RATE LIMITING / USAGE
-- ==========================================

CREATE TABLE IF NOT EXISTS "UsageLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "ipAddress" TEXT,
  "endpoint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- ==========================================
-- CHALLENGES
-- ==========================================

CREATE TABLE IF NOT EXISTS "Challenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tier" INTEGER NOT NULL,
  "cost" DOUBLE PRECISION NOT NULL,
  "resetFee" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "currentStreak" INTEGER NOT NULL DEFAULT 0,
  "currentLevel" INTEGER NOT NULL DEFAULT 1,
  "level1Completed" BOOLEAN NOT NULL DEFAULT false,
  "level2Completed" BOOLEAN NOT NULL DEFAULT false,
  "level3Completed" BOOLEAN NOT NULL DEFAULT false,
  "level4Completed" BOOLEAN NOT NULL DEFAULT false,
  "totalRewardsEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChallengeBet" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "betId" TEXT NOT NULL,
  "streakBefore" INTEGER NOT NULL,
  "levelBefore" INTEGER NOT NULL,
  "result" TEXT,
  "streakAfter" INTEGER,
  "levelAfter" INTEGER,
  "levelCompleted" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settledAt" TIMESTAMP(3),
  CONSTRAINT "ChallengeBet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChallengeReward" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "level" INTEGER NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  CONSTRAINT "ChallengeReward_pkey" PRIMARY KEY ("id")
);

-- ==========================================
-- ADD MISSING USER FIELDS
-- ==========================================

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tier" TEXT DEFAULT 'Bronze';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCurrentPeriodEnd" TIMESTAMP(3);

-- ==========================================
-- CREATE UNIQUE CONSTRAINTS
-- ==========================================

CREATE UNIQUE INDEX IF NOT EXISTS "AILeaderboard_agentId_key" ON "AILeaderboard"("agentId");
CREATE UNIQUE INDEX IF NOT EXISTS "GlobalLeaderboard_userId_key" ON "GlobalLeaderboard"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_userId_key" ON "PushSubscription"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ChallengeBet_betId_key" ON "ChallengeBet"("betId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- ==========================================
-- CREATE INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS "Bet_userId_idx" ON "Bet"("userId");
CREATE INDEX IF NOT EXISTS "Bet_result_idx" ON "Bet"("result");
CREATE INDEX IF NOT EXISTS "Bet_eventId_idx" ON "Bet"("eventId");
CREATE INDEX IF NOT EXISTS "Bet_createdAt_idx" ON "Bet"("createdAt");

CREATE INDEX IF NOT EXISTS "BankrollHistory_userId_idx" ON "BankrollHistory"("userId");
CREATE INDEX IF NOT EXISTS "BankrollHistory_createdAt_idx" ON "BankrollHistory"("createdAt");

CREATE INDEX IF NOT EXISTS "Parlay_userId_idx" ON "Parlay"("userId");
CREATE INDEX IF NOT EXISTS "Parlay_result_idx" ON "Parlay"("result");
CREATE INDEX IF NOT EXISTS "Parlay_createdAt_idx" ON "Parlay"("createdAt");

CREATE INDEX IF NOT EXISTS "ParlayLeg_parlayId_idx" ON "ParlayLeg"("parlayId");
CREATE INDEX IF NOT EXISTS "ParlayLeg_eventId_idx" ON "ParlayLeg"("eventId");

CREATE INDEX IF NOT EXISTS "AIPrediction_eventId_idx" ON "AIPrediction"("eventId");
CREATE INDEX IF NOT EXISTS "AIPrediction_result_idx" ON "AIPrediction"("result");
CREATE INDEX IF NOT EXISTS "AIPrediction_createdAt_idx" ON "AIPrediction"("createdAt");

CREATE INDEX IF NOT EXISTS "AILeaderboard_winRate_idx" ON "AILeaderboard"("winRate");

CREATE INDEX IF NOT EXISTS "GlobalLeaderboard_rank_idx" ON "GlobalLeaderboard"("rank");
CREATE INDEX IF NOT EXISTS "GlobalLeaderboard_roi_idx" ON "GlobalLeaderboard"("roi");
CREATE INDEX IF NOT EXISTS "GlobalLeaderboard_winRate_idx" ON "GlobalLeaderboard"("winRate");

CREATE INDEX IF NOT EXISTS "UsageLog_userId_createdAt_idx" ON "UsageLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "UsageLog_ipAddress_createdAt_idx" ON "UsageLog"("ipAddress", "createdAt");

CREATE INDEX IF NOT EXISTS "Challenge_userId_idx" ON "Challenge"("userId");
CREATE INDEX IF NOT EXISTS "Challenge_status_idx" ON "Challenge"("status");
CREATE INDEX IF NOT EXISTS "Challenge_expiresAt_idx" ON "Challenge"("expiresAt");

CREATE INDEX IF NOT EXISTS "ChallengeBet_challengeId_idx" ON "ChallengeBet"("challengeId");
CREATE INDEX IF NOT EXISTS "ChallengeBet_betId_idx" ON "ChallengeBet"("betId");

CREATE INDEX IF NOT EXISTS "ChallengeReward_challengeId_idx" ON "ChallengeReward"("challengeId");

-- ==========================================
-- ADD FOREIGN KEY CONSTRAINTS
-- ==========================================

ALTER TABLE "Bet" DROP CONSTRAINT IF EXISTS "Bet_userId_fkey";
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BankrollHistory" DROP CONSTRAINT IF EXISTS "BankrollHistory_userId_fkey";
ALTER TABLE "BankrollHistory" ADD CONSTRAINT "BankrollHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Parlay" DROP CONSTRAINT IF EXISTS "Parlay_userId_fkey";
ALTER TABLE "Parlay" ADD CONSTRAINT "Parlay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ParlayLeg" DROP CONSTRAINT IF EXISTS "ParlayLeg_parlayId_fkey";
ALTER TABLE "ParlayLeg" ADD CONSTRAINT "ParlayLeg_parlayId_fkey" FOREIGN KEY ("parlayId") REFERENCES "Parlay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GlobalLeaderboard" DROP CONSTRAINT IF EXISTS "GlobalLeaderboard_userId_fkey";
ALTER TABLE "GlobalLeaderboard" ADD CONSTRAINT "GlobalLeaderboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PushSubscription" DROP CONSTRAINT IF EXISTS "PushSubscription_userId_fkey";
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Challenge" DROP CONSTRAINT IF EXISTS "Challenge_userId_fkey";
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChallengeBet" DROP CONSTRAINT IF EXISTS "ChallengeBet_challengeId_fkey";
ALTER TABLE "ChallengeBet" ADD CONSTRAINT "ChallengeBet_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChallengeBet" DROP CONSTRAINT IF EXISTS "ChallengeBet_betId_fkey";
ALTER TABLE "ChallengeBet" ADD CONSTRAINT "ChallengeBet_betId_fkey" FOREIGN KEY ("betId") REFERENCES "Bet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChallengeReward" DROP CONSTRAINT IF EXISTS "ChallengeReward_challengeId_fkey";
ALTER TABLE "ChallengeReward" ADD CONSTRAINT "ChallengeReward_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==========================================
-- DONE!
-- ==========================================

SELECT 'Zalogche database schema restored successfully!' as message;
