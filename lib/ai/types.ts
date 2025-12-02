// ==========================================
// AI TYPES AND AGENT DEFINITIONS
// ==========================================

export type AIProvider = 'anthropic' | 'openai' | 'google' | 'xai' | 'groq' | 'perplexity';

export type Verdict = 'STRONG BET' | 'SLIGHT EDGE' | 'RISKY' | 'AVOID' | 'UNKNOWN';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type BetType = '1X2' | 'OVER/UNDER' | 'PLAYER PROP' | 'DOUBLE CHANCE' | 'BTTS';

export interface AIAgent {
  id: string;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  provider: AIProvider;
  model: string;
  personality: string;
}

export interface AIAnalysis {
  agentId: string;
  agentName: string;
  emoji: string;
  opinion: string;
  verdict: Verdict;
  confidence: Confidence;
  probability?: number;
  reasoning?: string;
  betType?: BetType;
  betSelection?: string;
  betOdds?: number;
  betExplanation?: string;
  timestamp: string;
  latencyMs?: number;
  error?: string;
}

export interface SwarmConsensus {
  verdict: Verdict;
  score: string;
  betVotes: number;
  passVotes: number;
  confidence: Confidence;
  reasoning: string;
}

export interface SwarmResult {
  eventId: string;
  eventName: string;
  sport: string;
  analyses: AIAnalysis[];
  consensus: SwarmConsensus;
  betSelection?: string;
  betOdds?: number;
  timestamp: string;
}

export interface SportEvent {
  id: string;
  sportKey?: string;
  sportTitle: string;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  league?: string;
  bookmakers?: Bookmaker[];
}

export interface Bookmaker {
  key: string;
  title: string;
  markets: Market[];
}

export interface Market {
  key: string;
  outcomes: Outcome[];
}

export interface Outcome {
  name: string;
  price: number;
}

export interface AILeaderboardEntry {
  agentId: string;
  wins: number;
  losses: number;
  pushes: number;
  totalPredictions: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  voteWeight: number;
}

// ==========================================
// AI AGENTS CONFIGURATION
// ==========================================

export const AI_AGENTS: AIAgent[] = [
  {
    id: 'claude',
    name: 'Claude',
    emoji: '🟠',
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/30',
    borderColor: 'border-orange-700',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    personality: 'Thoughtful, balanced analysis with careful consideration of multiple factors. Excels at identifying value and edge cases.',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    emoji: '💚',
    color: 'text-green-400',
    bgColor: 'bg-green-900/30',
    borderColor: 'border-green-700',
    provider: 'openai',
    model: 'gpt-4o',
    personality: 'Enthusiastic, data-driven analysis. Strong at synthesizing statistics and historical trends.',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    emoji: '🔵',
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/30',
    borderColor: 'border-blue-700',
    provider: 'google',
    model: 'gemini-2.0-flash',
    personality: 'Current events focused with emphasis on recent form and breaking news. Good at spotting momentum shifts.',
  },
  {
    id: 'grok',
    name: 'Grok',
    emoji: '⚡',
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/30',
    borderColor: 'border-purple-700',
    provider: 'xai',
    model: 'grok-2',
    personality: 'Witty, contrarian perspective. Willing to go against public consensus and identify sharp money moves.',
  },
  {
    id: 'llama',
    name: 'Llama',
    emoji: '🦙',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-900/30',
    borderColor: 'border-indigo-700',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    personality: 'Straightforward, analytical approach. Focuses on fundamentals and statistical models.',
  },
  {
    id: 'copilot',
    name: 'Copilot',
    emoji: '🤖',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-900/30',
    borderColor: 'border-cyan-700',
    provider: 'openai',
    model: 'gpt-4o-mini',
    personality: 'Technical, statistical analysis. Strong at parsing numbers and calculating expected value.',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    emoji: '🔍',
    color: 'text-teal-400',
    bgColor: 'bg-teal-900/30',
    borderColor: 'border-teal-700',
    provider: 'perplexity',
    model: 'sonar',
    personality: 'Research-oriented with live web access. Excellent at finding recent news, injuries, and insider information.',
  },
];

// ==========================================
// VERDICT SCORING
// ==========================================

export const VERDICT_SCORES: Record<Verdict, number> = {
  'STRONG BET': 2,
  'SLIGHT EDGE': 1,
  'RISKY': -1,
  'AVOID': -2,
  'UNKNOWN': 0,
};

export const CONFIDENCE_WEIGHTS: Record<Confidence, number> = {
  'HIGH': 1.5,
  'MEDIUM': 1.0,
  'LOW': 0.5,
};

// ==========================================
// PROMPT TEMPLATES
// ==========================================

export function getAnalysisPrompt(event: SportEvent, context: string, agent: AIAgent): string {
  // Check if it's a soccer match (has draw option)
  const isSoccer = event.sportTitle?.toLowerCase().includes('soccer') ||
                   event.sportTitle?.toLowerCase().includes('football') ||
                   event.league?.toLowerCase().includes('premier') ||
                   event.league?.toLowerCase().includes('liga') ||
                   event.league?.toLowerCase().includes('serie') ||
                   event.league?.toLowerCase().includes('bundesliga');

  const betTypeOptions = isSoccer
    ? '1X2 (Home/Draw/Away), OVER/UNDER (Goals), BTTS (Both Teams To Score), DOUBLE CHANCE'
    : '1X2 (Home/Away), OVER/UNDER (Points/Goals)';

  return `You are ${agent.name}, a European sports betting analyst. ${agent.personality}

ANALYZE THIS MATCHUP:
${event.awayTeam} @ ${event.homeTeam}
Sport: ${event.sportTitle}
League: ${event.league || 'N/A'}
Game Time: ${new Date(event.commenceTime).toLocaleString()}

${context ? `ADDITIONAL CONTEXT:\n${context}\n` : ''}

AVAILABLE BET TYPES: ${betTypeOptions}

PROVIDE YOUR ANALYSIS:
1. Key insight (1-2 sentences about what matters most)
2. Win probability for the favorite (as a percentage)
3. Your verdict: STRONG BET / SLIGHT EDGE / RISKY / AVOID
4. Confidence level: HIGH / MEDIUM / LOW
5. Recommended bet type: ${isSoccer ? '1X2 / OVER/UNDER / BTTS / DOUBLE CHANCE' : '1X2 / OVER/UNDER'}
6. Your specific bet selection (e.g., "Home Win", "Over 2.5", "BTTS Yes")
7. Recommended odds (decimal format, e.g., 1.85, 2.10)
8. Brief explanation of WHY you chose this specific bet

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
Key Insight: [your insight]
Win Probability: [X]%
Verdict: [STRONG BET/SLIGHT EDGE/RISKY/AVOID]
Confidence: [HIGH/MEDIUM/LOW]
Bet Type: [1X2/OVER/UNDER/BTTS/DOUBLE CHANCE]
Selection: [Your specific pick, e.g., "Home Win" or "Over 2.5 Goals"]
Odds: [X.XX]
Explanation: [Why this bet offers value - 1-2 sentences]

Keep your total response under 150 words. Be decisive. Use European decimal odds format.`;
}

export function parseAIResponse(agentId: string, response: string): Partial<AIAnalysis> {
  const agent = AI_AGENTS.find(a => a.id === agentId);

  // Extract verdict
  const verdictMatch = response.match(/verdict[:\s]*(STRONG BET|SLIGHT EDGE|RISKY|AVOID)/i);
  const verdict = verdictMatch
    ? verdictMatch[1].toUpperCase() as Verdict
    : 'UNKNOWN';

  // Extract probability
  const probMatch = response.match(/(\d{1,2}(?:\.\d+)?)\s*%/);
  const probability = probMatch ? parseFloat(probMatch[1]) : undefined;

  // Extract confidence
  const confMatch = response.match(/confidence[:\s]*(HIGH|MEDIUM|LOW)/i);
  const confidence = confMatch
    ? confMatch[1].toUpperCase() as Confidence
    : 'MEDIUM';

  // Extract bet type
  const betTypeMatch = response.match(/bet\s*type[:\s]*(1X2|OVER\/?UNDER|BTTS|DOUBLE CHANCE|PLAYER PROP)/i);
  const betType = betTypeMatch
    ? betTypeMatch[1].toUpperCase().replace('/', '/') as BetType
    : undefined;

  // Extract selection
  const selectionMatch = response.match(/selection[:\s]*(.+?)(?:\n|$)/i);
  const betSelection = selectionMatch ? selectionMatch[1].trim() : undefined;

  // Extract odds (decimal format like 1.85, 2.10)
  const oddsMatch = response.match(/odds[:\s]*(\d+\.\d{1,2})/i);
  const betOdds = oddsMatch ? parseFloat(oddsMatch[1]) : undefined;

  // Extract explanation
  const explanationMatch = response.match(/explanation[:\s]*(.+?)(?:\n|$)/i);
  const betExplanation = explanationMatch ? explanationMatch[1].trim() : undefined;

  return {
    agentId,
    agentName: agent?.name || agentId,
    emoji: agent?.emoji || '🤖',
    opinion: response,
    verdict,
    confidence,
    probability,
    betType,
    betSelection,
    betOdds,
    betExplanation,
    timestamp: new Date().toISOString(),
  };
}
