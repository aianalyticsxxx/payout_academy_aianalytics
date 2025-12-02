// ==========================================
// AI COMPETITION API
// ==========================================
// 1-Week Competition: Dec 4, 2025 - Dec 11, 2025

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCached, setCache } from '@/lib/redis';

// Competition dates - Season 1: Dec 4, 2025 - Dec 11, 2025 (1 week)
const COMPETITION_START = new Date('2025-12-04T00:00:00Z');
const COMPETITION_END = new Date('2025-12-11T23:59:59Z');
const COMPETITION_WEEKS = 1;

const CACHE_KEY = 'ai-competition-stats';
const CACHE_TTL = 60; // 1 minute

interface AICompetitionStats {
  agentId: string;
  agentName: string;
  emoji: string;
  wins: number;
  losses: number;
  pushes: number;
  totalPredictions: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  weeklyPerformance: WeeklyStats[];
  roi: number;
  units: number; // Net units (1 unit per bet)
}

interface WeeklyStats {
  week: number;
  startDate: string;
  endDate: string;
  wins: number;
  losses: number;
  winRate: number;
}

export async function GET(req: NextRequest) {
  try {
    // Check cache first
    const cached = await getCached<any>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Calculate competition status
    const now = new Date();
    const isActive = now >= COMPETITION_START && now <= COMPETITION_END;
    const hasStarted = now >= COMPETITION_START;
    const hasEnded = now > COMPETITION_END;

    // Calculate current week (1-7)
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const currentWeek = hasStarted
      ? Math.min(Math.ceil((now.getTime() - COMPETITION_START.getTime()) / msPerWeek), COMPETITION_WEEKS)
      : 0;

    // Days remaining
    const daysRemaining = hasEnded ? 0 : Math.ceil((COMPETITION_END.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    // Get all settled predictions within competition period
    const predictions = await prisma.aIPrediction.findMany({
      where: {
        createdAt: {
          gte: COMPETITION_START,
          lte: COMPETITION_END,
        },
        result: {
          not: 'pending',
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Get pending predictions count
    const pendingCount = await prisma.aIPrediction.count({
      where: {
        createdAt: {
          gte: COMPETITION_START,
          lte: COMPETITION_END,
        },
        result: 'pending',
      },
    });

    // AI Agents config
    const AI_AGENTS = [
      { id: 'claude', name: 'Claude', emoji: '🟠' },
      { id: 'chatgpt', name: 'ChatGPT', emoji: '💚' },
      { id: 'gemini', name: 'Gemini', emoji: '🔵' },
      { id: 'grok', name: 'Grok', emoji: '⚡' },
      { id: 'llama', name: 'Llama', emoji: '🦙' },
      { id: 'copilot', name: 'Copilot', emoji: '🤖' },
      { id: 'perplexity', name: 'Perplexity', emoji: '🔍' },
    ];

    // Initialize stats for each AI
    const aiStats = new Map<string, AICompetitionStats>();
    AI_AGENTS.forEach(agent => {
      aiStats.set(agent.id, {
        agentId: agent.id,
        agentName: agent.name,
        emoji: agent.emoji,
        wins: 0,
        losses: 0,
        pushes: 0,
        totalPredictions: 0,
        winRate: 0,
        currentStreak: 0,
        bestStreak: 0,
        weeklyPerformance: [],
        roi: 0,
        units: 0,
      });
    });

    // Calculate weekly date ranges
    const weekRanges: { week: number; start: Date; end: Date }[] = [];
    for (let w = 0; w < COMPETITION_WEEKS; w++) {
      const weekStart = new Date(COMPETITION_START.getTime() + w * msPerWeek);
      const weekEnd = new Date(weekStart.getTime() + msPerWeek - 1);
      weekRanges.push({ week: w + 1, start: weekStart, end: weekEnd });
    }

    // Initialize weekly stats for each AI
    AI_AGENTS.forEach(agent => {
      const stats = aiStats.get(agent.id)!;
      stats.weeklyPerformance = weekRanges.map(wr => ({
        week: wr.week,
        startDate: wr.start.toISOString().split('T')[0],
        endDate: wr.end.toISOString().split('T')[0],
        wins: 0,
        losses: 0,
        winRate: 0,
      }));
    });

    // Track streaks for each AI
    const aiStreaks = new Map<string, { current: number; best: number; lastResults: ('won' | 'lost' | 'push')[] }>();
    AI_AGENTS.forEach(agent => {
      aiStreaks.set(agent.id, { current: 0, best: 0, lastResults: [] });
    });

    // Process each prediction
    for (const prediction of predictions) {
      const aiVotes = prediction.aiVotes as any[];
      if (!aiVotes) continue;

      // Determine which week this prediction belongs to
      const predictionWeek = Math.min(
        Math.ceil((prediction.createdAt.getTime() - COMPETITION_START.getTime()) / msPerWeek),
        COMPETITION_WEEKS
      );

      // Process each AI's vote in this prediction
      for (const vote of aiVotes) {
        const agentStats = aiStats.get(vote.agentId);
        if (!agentStats) continue;

        // Determine if this AI was correct
        const isBet = ['STRONG BET', 'SLIGHT EDGE'].includes(vote.verdict);
        const predictionResult = prediction.result;

        // AI is "correct" if:
        // - They recommended BET and it won
        // - They recommended PASS and it lost (or they'd have lost money)
        let wasCorrect: 'won' | 'lost' | 'push';

        if (predictionResult === 'push') {
          wasCorrect = 'push';
          agentStats.pushes++;
        } else if (predictionResult === 'won') {
          // The bet won - AIs who said BET are correct
          wasCorrect = isBet ? 'won' : 'lost';
          if (isBet) {
            agentStats.wins++;
            agentStats.units += (vote.betOdds ? vote.betOdds - 1 : 0.9); // Profit from bet
          } else {
            agentStats.losses++;
            agentStats.units -= 1; // Missed opportunity (not a real loss)
          }
        } else {
          // The bet lost - AIs who said PASS are correct
          wasCorrect = isBet ? 'lost' : 'won';
          if (isBet) {
            agentStats.losses++;
            agentStats.units -= 1; // Lost 1 unit
          } else {
            agentStats.wins++;
            agentStats.units += 1; // Saved 1 unit
          }
        }

        agentStats.totalPredictions++;

        // Update weekly stats
        if (predictionWeek > 0 && predictionWeek <= COMPETITION_WEEKS) {
          const weekStats = agentStats.weeklyPerformance[predictionWeek - 1];
          if (wasCorrect === 'won') weekStats.wins++;
          if (wasCorrect === 'lost') weekStats.losses++;
        }

        // Update streaks
        const streak = aiStreaks.get(vote.agentId)!;
        streak.lastResults.push(wasCorrect);

        if (wasCorrect === 'won') {
          if (streak.current >= 0) {
            streak.current++;
          } else {
            streak.current = 1;
          }
        } else if (wasCorrect === 'lost') {
          if (streak.current <= 0) {
            streak.current--;
          } else {
            streak.current = -1;
          }
        }
        // Push doesn't affect streak

        if (streak.current > streak.best) {
          streak.best = streak.current;
        }
      }
    }

    // Calculate final stats and weekly win rates
    const leaderboard: AICompetitionStats[] = [];

    for (const [agentId, stats] of aiStats) {
      const streak = aiStreaks.get(agentId)!;
      stats.currentStreak = streak.current;
      stats.bestStreak = streak.best;

      // Calculate overall win rate
      const totalDecided = stats.wins + stats.losses;
      stats.winRate = totalDecided > 0 ? (stats.wins / totalDecided) * 100 : 50;

      // Calculate ROI (units won / total predictions)
      stats.roi = stats.totalPredictions > 0 ? (stats.units / stats.totalPredictions) * 100 : 0;

      // Calculate weekly win rates
      for (const week of stats.weeklyPerformance) {
        const weekTotal = week.wins + week.losses;
        week.winRate = weekTotal > 0 ? (week.wins / weekTotal) * 100 : 0;
      }

      leaderboard.push(stats);
    }

    // Sort by win rate (primary), then total predictions (secondary)
    leaderboard.sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.totalPredictions - a.totalPredictions;
    });

    // Add rank
    const rankedLeaderboard = leaderboard.map((stats, index) => ({
      ...stats,
      rank: index + 1,
    }));

    // Calculate total stats
    const totalPredictions = predictions.length;
    const totalWins = predictions.filter(p => p.result === 'won').length;
    const totalLosses = predictions.filter(p => p.result === 'lost').length;
    const overallWinRate = (totalWins + totalLosses) > 0
      ? (totalWins / (totalWins + totalLosses)) * 100
      : 0;

    const response = {
      competition: {
        name: 'AI Sharp Showdown',
        season: 'Season 1',
        startDate: COMPETITION_START.toISOString(),
        endDate: COMPETITION_END.toISOString(),
        totalWeeks: COMPETITION_WEEKS,
        currentWeek,
        daysRemaining,
        isActive,
        hasStarted,
        hasEnded,
      },
      summary: {
        totalPredictions,
        settledPredictions: predictions.length,
        pendingPredictions: pendingCount,
        totalWins,
        totalLosses,
        overallWinRate: Math.round(overallWinRate * 10) / 10,
      },
      leaderboard: rankedLeaderboard,
      updatedAt: new Date().toISOString(),
    };

    // Cache the response
    await setCache(CACHE_KEY, response, CACHE_TTL);

    return NextResponse.json(response);
  } catch (error) {
    console.error('AI Competition API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competition data' },
      { status: 500 }
    );
  }
}
