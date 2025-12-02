// ==========================================
// AI LEADERBOARD DATABASE FUNCTIONS
// ==========================================

import prisma from './prisma';
import { AI_AGENTS, AILeaderboardEntry } from '../ai/types';
import { getCached, setCache } from '../redis';

const CACHE_KEY = 'ai-leaderboard';
const CACHE_TTL = 300; // 5 minutes

// ==========================================
// GET LEADERBOARD
// ==========================================

export async function getAILeaderboard(): Promise<Record<string, AILeaderboardEntry>> {
  // Check cache first
  const cached = await getCached<Record<string, AILeaderboardEntry>>(CACHE_KEY);
  if (cached) return cached;

  try {
    const entries = await prisma.aILeaderboard.findMany();
    
    const leaderboard: Record<string, AILeaderboardEntry> = {};
    
    entries.forEach(entry => {
      leaderboard[entry.agentId] = {
        agentId: entry.agentId,
        wins: entry.wins,
        losses: entry.losses,
        pushes: entry.pushes,
        totalPredictions: entry.totalPredictions,
        winRate: entry.winRate,
        currentStreak: entry.currentStreak,
        bestStreak: entry.bestStreak,
        voteWeight: entry.voteWeight,
      };
    });

    // Ensure all agents exist
    AI_AGENTS.forEach(agent => {
      if (!leaderboard[agent.id]) {
        leaderboard[agent.id] = {
          agentId: agent.id,
          wins: 0,
          losses: 0,
          pushes: 0,
          totalPredictions: 0,
          winRate: 0.5,
          currentStreak: 0,
          bestStreak: 0,
          voteWeight: 1.0,
        };
      }
    });

    // Cache the result
    await setCache(CACHE_KEY, leaderboard, CACHE_TTL);
    
    return leaderboard;
  } catch (error) {
    console.error('Failed to get AI leaderboard:', error);
    
    // Return default leaderboard
    const defaultLeaderboard: Record<string, AILeaderboardEntry> = {};
    AI_AGENTS.forEach(agent => {
      defaultLeaderboard[agent.id] = {
        agentId: agent.id,
        wins: 0,
        losses: 0,
        pushes: 0,
        totalPredictions: 0,
        winRate: 0.5,
        currentStreak: 0,
        bestStreak: 0,
        voteWeight: 1.0,
      };
    });
    return defaultLeaderboard;
  }
}

// ==========================================
// UPDATE AGENT STATS
// ==========================================

export async function updateAgentStats(
  agentId: string,
  result: 'won' | 'lost' | 'push'
): Promise<void> {
  const agent = AI_AGENTS.find(a => a.id === agentId);
  if (!agent) return;

  try {
    // Get current stats
    const current = await prisma.aILeaderboard.findUnique({
      where: { agentId },
    });

    const wins = (current?.wins || 0) + (result === 'won' ? 1 : 0);
    const losses = (current?.losses || 0) + (result === 'lost' ? 1 : 0);
    const pushes = (current?.pushes || 0) + (result === 'push' ? 1 : 0);
    const totalPredictions = wins + losses + pushes;
    
    // Calculate win rate (excluding pushes)
    const winRate = (wins + losses) > 0 ? wins / (wins + losses) : 0.5;
    
    // Calculate streak
    let currentStreak = current?.currentStreak || 0;
    if (result === 'won') {
      currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
    } else if (result === 'lost') {
      currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
    }
    // Push doesn't affect streak
    
    const bestStreak = Math.max(current?.bestStreak || 0, currentStreak);
    const worstStreak = Math.min(current?.worstStreak || 0, currentStreak);
    
    // Calculate vote weight (0.5x to 2x based on win rate)
    const voteWeight = Math.max(0.5, Math.min(2.0, winRate * 2));

    // Upsert
    await prisma.aILeaderboard.upsert({
      where: { agentId },
      create: {
        agentId,
        agentName: agent.name,
        emoji: agent.emoji,
        wins,
        losses,
        pushes,
        totalPredictions,
        winRate,
        currentStreak,
        bestStreak,
        worstStreak,
        voteWeight,
      },
      update: {
        wins,
        losses,
        pushes,
        totalPredictions,
        winRate,
        currentStreak,
        bestStreak,
        worstStreak,
        voteWeight,
      },
    });

    // Invalidate cache
    await setCache(CACHE_KEY, null, 0);
    
  } catch (error) {
    console.error(`Failed to update agent stats for ${agentId}:`, error);
  }
}

// ==========================================
// SETTLE AI PREDICTION
// ==========================================

export async function settleAIPrediction(
  predictionId: string,
  result: 'won' | 'lost' | 'push'
): Promise<void> {
  try {
    // Get the prediction
    const prediction = await prisma.aIPrediction.findUnique({
      where: { id: predictionId },
    });

    if (!prediction || prediction.result !== 'pending') {
      return;
    }

    // Update prediction
    await prisma.aIPrediction.update({
      where: { id: predictionId },
      data: {
        result,
        settledAt: new Date(),
      },
    });

    // Update each AI agent's stats based on their individual votes
    const aiVotes = prediction.aiVotes as any[];
    
    for (const vote of aiVotes) {
      const wasBet = ['STRONG BET', 'SLIGHT EDGE'].includes(vote.verdict);
      const wasCorrect = (result === 'won' && wasBet) || (result === 'lost' && !wasBet);
      
      const agentResult = result === 'push' ? 'push' : (wasCorrect ? 'won' : 'lost');
      await updateAgentStats(vote.agentId, agentResult);
    }

  } catch (error) {
    console.error('Failed to settle AI prediction:', error);
    throw error;
  }
}

// ==========================================
// SAVE AI PREDICTION
// ==========================================

export async function saveAIPrediction(data: {
  eventId: string;
  eventName: string;
  sport?: string;
  league?: string;
  homeTeam?: string;
  awayTeam?: string;
  commenceTime?: Date;
  consensus: {
    verdict: string;
    score: string;
    betVotes: number;
    passVotes: number;
  };
  aiVotes: any[];
  betSelection?: string;
  betOdds?: number;
}): Promise<string> {
  try {
    const prediction = await prisma.aIPrediction.create({
      data: {
        eventId: data.eventId,
        eventName: data.eventName,
        sport: data.sport,
        league: data.league,
        homeTeam: data.homeTeam,
        awayTeam: data.awayTeam,
        commenceTime: data.commenceTime,
        consensusVerdict: data.consensus.verdict,
        consensusScore: parseFloat(data.consensus.score),
        betVotes: data.consensus.betVotes,
        passVotes: data.consensus.passVotes,
        aiVotes: data.aiVotes,
        betSelection: data.betSelection,
        betOdds: data.betOdds,
      },
    });

    return prediction.id;
  } catch (error) {
    console.error('Failed to save AI prediction:', error);
    throw error;
  }
}

// ==========================================
// GET PREDICTION BY EVENT ID
// ==========================================

export async function getPredictionByEventId(eventId: string): Promise<any | null> {
  try {
    // Find the most recent prediction for this event
    const prediction = await prisma.aIPrediction.findFirst({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });

    if (!prediction) return null;

    // Return in swarm result format
    return {
      eventId: prediction.eventId,
      eventName: prediction.eventName,
      sport: prediction.sport,
      analyses: prediction.aiVotes,
      consensus: {
        verdict: prediction.consensusVerdict,
        score: prediction.consensusScore?.toString() || '0',
        betVotes: prediction.betVotes,
        passVotes: prediction.passVotes,
        confidence: prediction.betVotes >= 5 ? 'HIGH' : prediction.betVotes >= 3 ? 'MEDIUM' : 'LOW',
        reasoning: '',
      },
      betSelection: prediction.betSelection,
      betOdds: prediction.betOdds,
      timestamp: prediction.createdAt.toISOString(),
      cached: true, // Flag to indicate this is a cached result
    };
  } catch (error) {
    console.error('Failed to get prediction by event ID:', error);
    return null;
  }
}

// ==========================================
// GET AI PREDICTIONS
// ==========================================

export async function getAIPredictions(options: {
  limit?: number;
  result?: string;
  sport?: string;
  days?: number;
}): Promise<any[]> {
  const { limit = 50, result, sport, days = 7 } = options;

  // Calculate date range
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const predictions = await prisma.aIPrediction.findMany({
      where: {
        ...(result && result !== 'all' && { result }),
        ...(sport && sport !== 'all' && { sport }),
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return predictions;
  } catch (error) {
    console.error('Failed to get AI predictions:', error);
    return [];
  }
}

// ==========================================
// SEED AI LEADERBOARD
// ==========================================

export async function seedAILeaderboard(): Promise<void> {
  try {
    for (const agent of AI_AGENTS) {
      await prisma.aILeaderboard.upsert({
        where: { agentId: agent.id },
        create: {
          agentId: agent.id,
          agentName: agent.name,
          emoji: agent.emoji,
          wins: 0,
          losses: 0,
          pushes: 0,
          totalPredictions: 0,
          winRate: 0.5,
          voteWeight: 1.0,
        },
        update: {
          agentName: agent.name,
          emoji: agent.emoji,
        },
      });
    }
    console.log('AI leaderboard seeded successfully');
  } catch (error) {
    console.error('Failed to seed AI leaderboard:', error);
  }
}
