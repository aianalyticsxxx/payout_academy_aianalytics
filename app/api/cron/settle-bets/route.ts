// ==========================================
// CRON: AUTO-SETTLE BETS
// ==========================================
// Runs every 15 minutes via Vercel Cron

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getEventScores, getSportKey } from '@/lib/sports/odds-api';

// Verify cron secret
function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!process.env.CRON_SECRET) return true; // Allow if no secret configured
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  // Verify this is a legitimate cron request
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron] Starting bet settlement...');

    // Get all pending bets with event IDs
    const pendingBets = await prisma.bet.findMany({
      where: {
        result: 'pending',
        eventId: { not: null },
      },
    });

    if (pendingBets.length === 0) {
      console.log('[Cron] No pending bets to settle');
      return NextResponse.json({ message: 'No pending bets', settled: 0 });
    }

    console.log(`[Cron] Found ${pendingBets.length} pending bets`);

    // Group bets by sport
    const betsBySport = new Map<string, typeof pendingBets>();
    for (const bet of pendingBets) {
      const sport = bet.sport;
      if (!betsBySport.has(sport)) {
        betsBySport.set(sport, []);
      }
      betsBySport.get(sport)!.push(bet);
    }

    let settledCount = 0;
    const settledBets: string[] = [];
    const errors: string[] = [];

    // Process each sport
    for (const [sport, bets] of betsBySport) {
      const sportKey = getSportKey(sport);
      if (!sportKey) {
        console.log(`[Cron] Unknown sport key for: ${sport}`);
        continue;
      }

      try {
        // Get scores for this sport
        const scores = await getEventScores(sportKey, 3);
        
        for (const bet of bets) {
          const score = scores.find(s => s.id === bet.eventId);
          
          if (!score || !score.completed) {
            continue; // Game not finished yet
          }

          try {
            const result = determineBetResult(bet, score);
            if (!result) continue;

            const profitLoss = calculateProfitLoss(
              bet.stake,
              bet.oddsDecimal,
              result
            );

            // Update bet
            await prisma.bet.update({
              where: { id: bet.id },
              data: {
                result,
                profitLoss,
                settledAt: new Date(),
              },
            });

            // Update user leaderboard
            await updateUserStats(bet.userId);

            settledCount++;
            settledBets.push(bet.id);
            console.log(`[Cron] Settled bet ${bet.id}: ${result}`);
            
          } catch (error) {
            console.error(`[Cron] Error settling bet ${bet.id}:`, error);
            errors.push(bet.id);
          }
        }
      } catch (error) {
        console.error(`[Cron] Error fetching scores for ${sport}:`, error);
      }
    }

    // Also settle AI predictions
    const aiSettled = await settleAIPredictions();

    console.log(`[Cron] Settlement complete. Settled ${settledCount} bets, ${aiSettled} AI predictions`);

    return NextResponse.json({
      message: 'Settlement complete',
      settled: settledCount,
      aiSettled,
      settledBets,
      errors: errors.length > 0 ? errors : undefined,
    });
    
  } catch (error) {
    console.error('[Cron] Settlement error:', error);
    return NextResponse.json(
      { error: 'Settlement failed' },
      { status: 500 }
    );
  }
}

// ==========================================
// HELPERS
// ==========================================

function determineBetResult(
  bet: any,
  score: any
): 'won' | 'lost' | 'push' | null {
  if (!score.scores || score.scores.length < 2) {
    return null;
  }

  const homeScore = parseInt(score.scores.find((s: any) => s.name === score.home_team)?.score || '0');
  const awayScore = parseInt(score.scores.find((s: any) => s.name === score.away_team)?.score || '0');

  const selection = bet.selection.toLowerCase();
  const betType = bet.betType.toLowerCase();

  // Moneyline bet
  if (betType === 'moneyline' || betType === 'h2h') {
    if (selection.includes(score.home_team.toLowerCase())) {
      return homeScore > awayScore ? 'won' : 'lost';
    }
    if (selection.includes(score.away_team.toLowerCase())) {
      return awayScore > homeScore ? 'won' : 'lost';
    }
    if (selection.includes('draw')) {
      return homeScore === awayScore ? 'won' : 'lost';
    }
  }

  // Spread bet
  if (betType === 'spread') {
    const spreadMatch = selection.match(/([+-]?\d+\.?\d*)/);
    if (spreadMatch) {
      const spread = parseFloat(spreadMatch[1]);
      const isHome = selection.includes(score.home_team.toLowerCase());
      const adjustedScore = isHome 
        ? homeScore + spread 
        : awayScore + spread;
      const opposingScore = isHome ? awayScore : homeScore;
      
      if (adjustedScore === opposingScore) return 'push';
      return adjustedScore > opposingScore ? 'won' : 'lost';
    }
  }

  // Totals (over/under)
  if (betType === 'totals' || betType === 'over/under') {
    const totalMatch = selection.match(/(\d+\.?\d*)/);
    if (totalMatch) {
      const line = parseFloat(totalMatch[1]);
      const actualTotal = homeScore + awayScore;
      
      if (actualTotal === line) return 'push';
      
      if (selection.includes('over')) {
        return actualTotal > line ? 'won' : 'lost';
      }
      if (selection.includes('under')) {
        return actualTotal < line ? 'won' : 'lost';
      }
    }
  }

  return null; // Could not determine
}

function calculateProfitLoss(
  stake: number,
  oddsDecimal: number,
  result: string
): number {
  if (result === 'push') return 0;
  if (result === 'won') return stake * (oddsDecimal - 1);
  if (result === 'lost') return -stake;
  return 0;
}

async function updateUserStats(userId: string) {
  const bets = await prisma.bet.findMany({
    where: { userId, result: { not: 'pending' } },
  });

  const wins = bets.filter(b => b.result === 'won').length;
  const losses = bets.filter(b => b.result === 'lost').length;
  const pushes = bets.filter(b => b.result === 'push').length;
  const totalProfit = bets.reduce((sum, b) => sum + (b.profitLoss || 0), 0);
  const totalStaked = bets
    .filter(b => b.result !== 'push')
    .reduce((sum, b) => sum + b.stake, 0);

  const winRate = (wins + losses) > 0 ? wins / (wins + losses) : 0;
  const roi = totalStaked > 0 ? totalProfit / totalStaked : 0;

  let tier = 'Bronze';
  if (wins >= 100 && winRate >= 0.60 && roi >= 0.15) tier = 'Diamond';
  else if (wins >= 75 && winRate >= 0.57 && roi >= 0.10) tier = 'Platinum';
  else if (wins >= 50 && winRate >= 0.55 && roi >= 0.05) tier = 'Gold';
  else if (wins >= 25 && winRate >= 0.52) tier = 'Silver';

  await prisma.globalLeaderboard.upsert({
    where: { userId },
    create: {
      userId,
      wins,
      losses,
      pushes,
      totalBets: wins + losses + pushes,
      totalProfit,
      totalStaked,
      roi,
      winRate,
      tier,
    },
    update: {
      wins,
      losses,
      pushes,
      totalBets: wins + losses + pushes,
      totalProfit,
      totalStaked,
      roi,
      winRate,
      tier,
    },
  });
}

async function settleAIPredictions(): Promise<number> {
  // Get pending AI predictions
  const predictions = await prisma.aIPrediction.findMany({
    where: {
      result: 'pending',
      commenceTime: { lt: new Date() }, // Game should have started
    },
  });

  let settled = 0;

  for (const prediction of predictions) {
    if (!prediction.sport) continue;

    const sportKey = getSportKey(prediction.sport);
    if (!sportKey) continue;

    try {
      const scores = await getEventScores(sportKey, 3);
      const score = scores.find(s => s.id === prediction.eventId);

      if (!score || !score.completed) continue;

      // Determine if the AI bet would have won
      const result = determineAIPredictionResult(prediction, score);
      if (!result) continue;

      // Update prediction
      await prisma.aIPrediction.update({
        where: { id: prediction.id },
        data: {
          result,
          actualScore: `${score.scores?.[0]?.score || 0}-${score.scores?.[1]?.score || 0}`,
          settledAt: new Date(),
        },
      });

      // Update each AI agent's stats
      const aiVotes = prediction.aiVotes as any[];
      for (const vote of aiVotes) {
        const wasBet = ['STRONG BET', 'SLIGHT EDGE'].includes(vote.verdict);
        const wasCorrect = (result === 'won' && wasBet) || (result === 'lost' && !wasBet);
        
        await updateAIAgentStats(
          vote.agentId,
          result === 'push' ? 'push' : (wasCorrect ? 'won' : 'lost')
        );
      }

      settled++;
    } catch (error) {
      console.error(`[Cron] Error settling AI prediction ${prediction.id}:`, error);
    }
  }

  return settled;
}

function determineAIPredictionResult(prediction: any, score: any): 'won' | 'lost' | 'push' | null {
  if (!prediction.betSelection || !prediction.betOdds) {
    return null;
  }

  // Simple moneyline check
  const homeScore = parseInt(score.scores?.[0]?.score || '0');
  const awayScore = parseInt(score.scores?.[1]?.score || '0');

  const selection = prediction.betSelection.toLowerCase();

  if (selection.includes(score.home_team?.toLowerCase())) {
    if (homeScore === awayScore) return 'push';
    return homeScore > awayScore ? 'won' : 'lost';
  }
  
  if (selection.includes(score.away_team?.toLowerCase())) {
    if (homeScore === awayScore) return 'push';
    return awayScore > homeScore ? 'won' : 'lost';
  }

  return null;
}

async function updateAIAgentStats(agentId: string, result: 'won' | 'lost' | 'push') {
  const current = await prisma.aILeaderboard.findUnique({
    where: { agentId },
  });

  if (!current) return;

  const wins = current.wins + (result === 'won' ? 1 : 0);
  const losses = current.losses + (result === 'lost' ? 1 : 0);
  const pushes = current.pushes + (result === 'push' ? 1 : 0);
  const totalPredictions = wins + losses + pushes;
  const winRate = (wins + losses) > 0 ? wins / (wins + losses) : 0.5;
  const voteWeight = Math.max(0.5, Math.min(2.0, winRate * 2));

  await prisma.aILeaderboard.update({
    where: { agentId },
    data: {
      wins,
      losses,
      pushes,
      totalPredictions,
      winRate,
      voteWeight,
    },
  });
}
