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

  // Determine final verdict based on weighted score
  let verdict: Verdict;
  if (avgScore >= 1.2) verdict = 'STRONG BET';
  else if (avgScore >= 0.5) verdict = 'STRONG BET';
  else if (avgScore >= 0) verdict = 'SLIGHT EDGE';
  else if (avgScore >= -0.5) verdict = 'RISKY';
  else verdict = 'AVOID';

  // Determine confidence
  const confidence = Math.abs(avgScore) >= 1.2 ? 'HIGH' 
    : Math.abs(avgScore) >= 0.5 ? 'MEDIUM' 
    : 'LOW';

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
// CONTEXT BUILDER
// ==========================================

function buildEventContext(event: SportEvent): string {
  const parts: string[] = [];
  
  if (event.bookmakers?.length) {
    const book = event.bookmakers[0];
    const h2h = book.markets.find(m => m.key === 'h2h');
    
    if (h2h) {
      parts.push('CURRENT ODDS:');
      h2h.outcomes.forEach(o => {
        parts.push(`  ${o.name}: ${o.price.toFixed(2)}`);
      });
    }
    
    const spread = book.markets.find(m => m.key === 'spreads');
    if (spread) {
      parts.push('SPREAD:');
      spread.outcomes.forEach(o => {
        const point = (o as any).point;
        parts.push(`  ${o.name} ${point > 0 ? '+' : ''}${point}: ${o.price.toFixed(2)}`);
      });
    }
  }
  
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
