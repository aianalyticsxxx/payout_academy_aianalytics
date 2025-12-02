// ==========================================
// AI SWARM ORCHESTRATOR
// ==========================================
// Coordinates all 7 AI models for consensus betting analysis

import { 
  AIAnalysis, 
  SportEvent, 
  SwarmResult, 
  SwarmConsensus,
  AI_AGENTS,
  AILeaderboardEntry,
  VERDICT_SCORES,
  Verdict,
} from './types';

import { redis } from '../redis';
import { getAILeaderboard } from '../db/ai-leaderboard';

// ==========================================
// ANALYZER MAPPING (lazy loaded to avoid build-time API key checks)
// ==========================================

type AnalyzerFunction = (event: SportEvent, context: string) => Promise<AIAnalysis>;

async function getAnalyzer(agentId: string): Promise<AnalyzerFunction | null> {
  switch (agentId) {
    case 'claude':
      const { analyzeWithClaude } = await import('./claude');
      return analyzeWithClaude;
    case 'chatgpt':
      const { analyzeWithChatGPT } = await import('./openai');
      return analyzeWithChatGPT;
    case 'copilot':
      const { analyzeWithCopilot } = await import('./openai');
      return analyzeWithCopilot;
    case 'gemini':
      const { analyzeWithGemini } = await import('./gemini');
      return analyzeWithGemini;
    case 'grok':
      const { analyzeWithGrok } = await import('./grok');
      return analyzeWithGrok;
    case 'llama':
      const { analyzeWithLlama } = await import('./llama');
      return analyzeWithLlama;
    case 'perplexity':
      const { analyzeWithPerplexity } = await import('./perplexity');
      return analyzeWithPerplexity;
    default:
      return null;
  }
}

// Keep ANALYZERS for backwards compatibility but make it empty - use getAnalyzer instead
const ANALYZERS: Record<string, AnalyzerFunction> = {};

// ==========================================
// MAIN SWARM FUNCTION
// ==========================================

export interface SwarmOptions {
  useCache?: boolean;
  cacheTtl?: number; // seconds
  agents?: string[]; // Specific agents to use (default: all)
  parallel?: boolean; // Run in parallel or sequential
  includeContext?: boolean; // Include odds/form context
}

export async function runSwarmAnalysis(
  event: SportEvent,
  options: SwarmOptions = {}
): Promise<SwarmResult> {
  const {
    useCache = true,
    cacheTtl = 1800, // 30 minutes
    agents = AI_AGENTS.map(a => a.id),
    parallel = true,
    includeContext = true,
  } = options;

  // Check cache
  if (useCache) {
    const cacheKey = `swarm:${event.id}`;
    const cached = await redis?.get(cacheKey);
    if (cached) {
      console.log(`[Swarm] Cache hit for ${event.id}`);
      return JSON.parse(cached as string);
    }
  }

  console.log(`[Swarm] Analyzing: ${event.awayTeam} @ ${event.homeTeam}`);
  
  // Get AI leaderboard for weighted voting
  const leaderboard = await getAILeaderboard();
  
  // Build context
  const context = includeContext ? buildEventContext(event) : '';
  
  // Run analyses
  const selectedAgents = agents;
  let analyses: AIAnalysis[];

  if (parallel) {
    // Run all in parallel (faster, but more API calls at once)
    const results = await Promise.allSettled(
      selectedAgents.map(async agentId => {
        const analyzer = await getAnalyzer(agentId);
        if (!analyzer) throw new Error(`Unknown agent: ${agentId}`);
        return analyzer(event, context);
      })
    );

    analyses = results
      .filter((r): r is PromiseFulfilledResult<AIAnalysis> => r.status === 'fulfilled')
      .map(r => r.value);
  } else {
    // Run sequentially (slower, but gentler on rate limits)
    analyses = [];
    for (const agentId of selectedAgents) {
      try {
        const analyzer = await getAnalyzer(agentId);
        if (!analyzer) continue;
        const result = await analyzer(event, context);
        analyses.push(result);
      } catch (error) {
        console.error(`[Swarm] ${agentId} failed:`, error);
      }
    }
  }

  // Calculate consensus
  const consensus = calculateConsensus(analyses, leaderboard);
  
  // Determine bet selection if betting
  const betSelection = consensus.verdict === 'STRONG BET' || consensus.verdict === 'SLIGHT EDGE'
    ? determineBetSelection(event, analyses)
    : undefined;

  const result: SwarmResult = {
    eventId: event.id,
    eventName: `${event.awayTeam} @ ${event.homeTeam}`,
    sport: event.sportTitle,
    analyses,
    consensus,
    betSelection: betSelection?.selection,
    betOdds: betSelection?.odds,
    timestamp: new Date().toISOString(),
  };

  // Cache result
  if (useCache && redis) {
    await redis.set(`swarm:${event.id}`, JSON.stringify(result), { ex: cacheTtl });
  }

  console.log(`[Swarm] Consensus: ${consensus.verdict} (${consensus.score})`);
  
  return result;
}

// ==========================================
// CONSENSUS CALCULATION
// ==========================================

function calculateConsensus(
  analyses: AIAnalysis[],
  leaderboard: Record<string, AILeaderboardEntry>
): SwarmConsensus {
  if (analyses.length === 0) {
    return {
      verdict: 'UNKNOWN' as Verdict,
      score: '0',
      betVotes: 0,
      passVotes: 0,
      confidence: 'LOW',
      reasoning: 'No AI analyses available',
    };
  }

  let weightedSum = 0;
  let totalWeight = 0;
  let betVotes = 0;
  let passVotes = 0;

  const validAnalyses = analyses.filter(a => a.verdict !== 'UNKNOWN' && !a.error);

  validAnalyses.forEach(analysis => {
    // Get agent's historical performance
    const agentStats = leaderboard[analysis.agentId];
    
    // Calculate vote weight based on win rate (0.5x to 2x)
    let weight = 1.0;
    if (agentStats && agentStats.totalPredictions >= 5) {
      weight = Math.max(0.5, Math.min(2.0, agentStats.winRate * 2));
    }
    
    // Add to weighted score
    const verdictScore = VERDICT_SCORES[analysis.verdict] || 0;
    weightedSum += verdictScore * weight;
    totalWeight += weight;
    
    // Count votes
    if (['STRONG BET', 'SLIGHT EDGE'].includes(analysis.verdict)) {
      betVotes++;
    } else {
      passVotes++;
    }
  });

  const avgScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Determine final verdict based on weighted score AND vote majority
  // Need strong consensus for STRONG BET
  let verdict: Verdict;
  const totalVotes = betVotes + passVotes;
  const betRatio = totalVotes > 0 ? betVotes / totalVotes : 0;
  const validCount = validAnalyses.length;

  if (avgScore >= 1.5 && betRatio >= 0.7 && validCount >= 4) {
    verdict = 'STRONG BET';
  } else if (avgScore >= 0.8 && betRatio >= 0.6 && validCount >= 3) {
    verdict = 'SLIGHT EDGE';
  } else if (avgScore >= 0 || betRatio >= 0.4) {
    verdict = 'RISKY';
  } else {
    verdict = 'AVOID';
  }

  // Determine confidence based on agreement level and number of responses
  const agreementRatio = Math.max(betRatio, 1 - betRatio);

  const confidence =
    (validCount >= 5 && agreementRatio >= 0.8) ? 'HIGH' :
    (validCount >= 3 && agreementRatio >= 0.6) ? 'MEDIUM' :
    'LOW';

  // Generate reasoning
  const reasoning = generateConsensusReasoning(validAnalyses, verdict, betVotes, passVotes);

  return {
    verdict,
    score: avgScore.toFixed(2),
    betVotes,
    passVotes,
    confidence,
    reasoning,
  };
}

function generateConsensusReasoning(
  analyses: AIAnalysis[],
  verdict: Verdict,
  betVotes: number,
  passVotes: number
): string {
  const total = betVotes + passVotes;
  
  if (total === 0) return 'Insufficient data for analysis.';
  
  const betPct = Math.round((betVotes / total) * 100);
  
  // Find key themes from analyses
  const themes: string[] = [];
  
  // Check for unanimous or near-unanimous
  if (betPct >= 85) {
    themes.push('Strong consensus among AI models');
  } else if (betPct <= 15) {
    themes.push('AI models strongly advise passing');
  } else if (betPct >= 50 && betPct <= 60) {
    themes.push('Mixed opinions - consider carefully');
  }

  // Check for high confidence picks
  const highConfidence = analyses.filter(a => a.confidence === 'HIGH');
  if (highConfidence.length >= 3) {
    themes.push(`${highConfidence.length} models have high confidence`);
  }

  return themes.length > 0 
    ? themes.join('. ') + '.'
    : `${betVotes}/${total} models favor betting.`;
}

// ==========================================
// BET SELECTION
// ==========================================

function determineBetSelection(
  event: SportEvent,
  analyses: AIAnalysis[]
): { selection: string; odds: number } | undefined {
  if (!event.bookmakers?.length) return undefined;
  
  const market = event.bookmakers[0].markets.find(m => m.key === 'h2h');
  if (!market) return undefined;

  // Find the favored team based on AI probability estimates
  const avgProbabilities = new Map<string, number[]>();
  
  analyses.forEach(a => {
    if (a.probability) {
      // Assume probability is for the favorite
      // In a real implementation, you'd parse which team they're referring to
    }
  });

  // Default: pick the favorite (lower odds)
  const outcomes = market.outcomes.filter(o => o.name !== 'Draw');
  const favorite = outcomes.reduce((min, o) => o.price < min.price ? o : min, outcomes[0]);
  
  return {
    selection: `${favorite.name} ML`,
    odds: favorite.price,
  };
}

// ==========================================
// CONTEXT BUILDER - PROFESSIONAL MARKET DATA
// ==========================================

function buildEventContext(event: SportEvent): string {
  const parts: string[] = [];

  if (!event.bookmakers?.length) {
    return 'No odds data available.';
  }

  // Collect best odds across all bookmakers
  const h2hOdds: Record<string, { price: number; bookmaker: string }[]> = {};
  const totalOdds: Record<string, { price: number; bookmaker: string; point?: number }[]> = {};
  const spreadOdds: Record<string, { price: number; bookmaker: string; point?: number }[]> = {};

  event.bookmakers.forEach(book => {
    // H2H (Moneyline) odds
    const h2h = book.markets.find(m => m.key === 'h2h');
    if (h2h) {
      h2h.outcomes.forEach(o => {
        if (!h2hOdds[o.name]) h2hOdds[o.name] = [];
        h2hOdds[o.name].push({ price: o.price, bookmaker: book.title });
      });
    }

    // Totals (Over/Under) odds
    const totals = book.markets.find(m => m.key === 'totals');
    if (totals) {
      totals.outcomes.forEach(o => {
        const key = `${o.name} ${(o as any).point}`;
        if (!totalOdds[key]) totalOdds[key] = [];
        totalOdds[key].push({
          price: o.price,
          bookmaker: book.title,
          point: (o as any).point
        });
      });
    }

    // Spreads odds
    const spreads = book.markets.find(m => m.key === 'spreads');
    if (spreads) {
      spreads.outcomes.forEach(o => {
        const point = (o as any).point;
        const key = `${o.name} ${point > 0 ? '+' : ''}${point}`;
        if (!spreadOdds[key]) spreadOdds[key] = [];
        spreadOdds[key].push({
          price: o.price,
          bookmaker: book.title,
          point
        });
      });
    }
  });

  // Helper to convert decimal odds to implied probability
  const toImpliedProb = (odds: number) => ((1 / odds) * 100).toFixed(1);

  // Helper to find best odds
  const getBestOdds = (odds: { price: number; bookmaker: string }[]) => {
    if (!odds.length) return null;
    return odds.reduce((best, curr) => curr.price > best.price ? curr : best, odds[0]);
  };

  // MONEYLINE / 1X2 MARKET
  parts.push('MONEYLINE ODDS (Best Available):');
  Object.entries(h2hOdds).forEach(([outcome, odds]) => {
    const best = getBestOdds(odds);
    if (best) {
      const impliedProb = toImpliedProb(best.price);
      parts.push(`  ${outcome}: ${best.price.toFixed(2)} (${impliedProb}% implied) via ${best.bookmaker}`);
    }
  });

  // Calculate vig/juice
  const totalImplied = Object.values(h2hOdds).reduce((sum, odds) => {
    const best = getBestOdds(odds);
    return sum + (best ? (1 / best.price) : 0);
  }, 0);
  const vig = ((totalImplied - 1) * 100).toFixed(1);
  parts.push(`  Market Vig: ${vig}%`);

  // TOTALS MARKET
  if (Object.keys(totalOdds).length > 0) {
    parts.push('\nTOTALS (Over/Under):');
    const sortedTotals = Object.entries(totalOdds).sort((a, b) => {
      const pointA = a[1][0]?.point || 0;
      const pointB = b[1][0]?.point || 0;
      return pointA - pointB;
    });

    sortedTotals.forEach(([outcome, odds]) => {
      const best = getBestOdds(odds);
      if (best) {
        const impliedProb = toImpliedProb(best.price);
        parts.push(`  ${outcome}: ${best.price.toFixed(2)} (${impliedProb}% implied)`);
      }
    });
  }

  // SPREADS MARKET
  if (Object.keys(spreadOdds).length > 0) {
    parts.push('\nSPREADS:');
    Object.entries(spreadOdds).forEach(([outcome, odds]) => {
      const best = getBestOdds(odds);
      if (best) {
        const impliedProb = toImpliedProb(best.price);
        parts.push(`  ${outcome}: ${best.price.toFixed(2)} (${impliedProb}% implied)`);
      }
    });
  }

  // Number of bookmakers for market depth indicator
  parts.push(`\nMarket Depth: ${event.bookmakers.length} bookmakers`);

  return parts.join('\n');
}

// ==========================================
// STREAMING SWARM (for real-time UI updates)
// ==========================================

export async function* streamSwarmAnalysis(
  event: SportEvent,
  options: SwarmOptions = {}
): AsyncGenerator<{ type: 'analysis' | 'consensus'; data: AIAnalysis | SwarmConsensus }> {
  const agents = options.agents || AI_AGENTS.map(a => a.id);
  const context = options.includeContext ? buildEventContext(event) : '';
  const leaderboard = await getAILeaderboard();
  
  const analyses: AIAnalysis[] = [];
  
  // Run each agent and yield results as they come in
  for (const agentId of agents) {
    const analyzer = await getAnalyzer(agentId);
    if (!analyzer) continue;

    try {
      const analysis = await analyzer(event, context);
      analyses.push(analysis);
      yield { type: 'analysis', data: analysis };
    } catch (error) {
      console.error(`[Swarm] ${agentId} failed:`, error);
    }
  }
  
  // Calculate and yield final consensus
  const consensus = calculateConsensus(analyses, leaderboard);
  yield { type: 'consensus', data: consensus };
}

// ==========================================
// EXPORTS
// ==========================================

export { AI_AGENTS, ANALYZERS };
export type { AIAnalysis, SwarmResult, SwarmConsensus };
