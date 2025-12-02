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
  probability?: number;        // True probability estimate
  impliedProbability?: number; // Implied probability from odds
  edge?: number;               // Edge = true prob - implied prob
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
// PROMPT TEMPLATES - PROFESSIONAL SHARP BETTING
// ==========================================

export function getAnalysisPrompt(event: SportEvent, context: string, agent: AIAgent): string {
  // Check if it's a soccer match (has draw option)
  const isSoccer = event.sportTitle?.toLowerCase().includes('soccer') ||
                   event.sportTitle?.toLowerCase().includes('football') ||
                   event.league?.toLowerCase().includes('premier') ||
                   event.league?.toLowerCase().includes('liga') ||
                   event.league?.toLowerCase().includes('serie') ||
                   event.league?.toLowerCase().includes('bundesliga');

  const isNBA = event.sportTitle?.toLowerCase().includes('nba') ||
                event.sportTitle?.toLowerCase().includes('basketball');

  const isNFL = event.sportTitle?.toLowerCase().includes('nfl') ||
                event.sportTitle?.toLowerCase().includes('football');

  const isNHL = event.sportTitle?.toLowerCase().includes('nhl') ||
                event.sportTitle?.toLowerCase().includes('hockey');

  const betTypeOptions = isSoccer
    ? '1X2 (Home/Draw/Away), OVER/UNDER (Goals), BTTS (Both Teams To Score), DOUBLE CHANCE'
    : '1X2 (Home/Away), OVER/UNDER (Points/Goals), SPREAD';

  // Sport-specific factors
  const sportFactors = isSoccer
    ? `
SOCCER-SPECIFIC FACTORS TO ANALYZE:
- Home advantage (typically worth 0.3-0.5 goals)
- Recent form (last 5 matches, home/away splits)
- Head-to-head history
- Goal scoring/conceding trends
- Key player injuries/suspensions
- Fixture congestion (Champions League, cup games)
- Motivation (relegation battle, title race, nothing to play for)
- Weather conditions for totals`
    : isNBA
    ? `
NBA-SPECIFIC FACTORS TO ANALYZE:
- Back-to-back games (fatigue = lower scoring, worse defense)
- Home/road splits and altitude (Denver, Utah)
- Pace of play matchups (fast vs slow teams)
- Rest days advantage
- Key player injuries (star players = 3-7 point swing)
- Travel schedule (coast-to-coast, 4-in-5 nights)
- Motivation (playoff seeding, tank mode)
- Offensive/Defensive ratings and efficiency`
    : isNFL
    ? `
NFL-SPECIFIC FACTORS TO ANALYZE:
- Home field advantage (worth ~3 points)
- Weather impact on totals (wind, cold, rain)
- Divisional rivalry intensity
- Bye week rest advantage
- Key injuries (QB = 3-7 points, other positions)
- Travel distance and time zone changes
- Motivation (playoff implications, draft positioning)
- Offensive/Defensive DVOA rankings`
    : isNHL
    ? `
NHL-SPECIFIC FACTORS TO ANALYZE:
- Back-to-back situations
- Home ice advantage
- Goalie matchups and recent performance
- Power play/Penalty kill efficiency
- Travel schedule
- Divisional games intensity
- Injury report (goalies especially critical)`
    : `
KEY FACTORS TO ANALYZE:
- Home advantage
- Recent form and momentum
- Head-to-head history
- Key injuries
- Motivation and stakes`;

  return `You are ${agent.name}, a professional sharp sports bettor with a proven edge. ${agent.personality}

YOUR METHODOLOGY:
You find VALUE by identifying when bookmaker odds UNDERVALUE the true probability of an outcome. You ONLY bet when you have a mathematical edge (positive Expected Value). You think like a professional who needs to beat the closing line.

=== MATCHUP ===
${event.awayTeam} @ ${event.homeTeam}
Sport: ${event.sportTitle}
League: ${event.league || 'N/A'}
Game Time: ${new Date(event.commenceTime).toLocaleString()}

${context ? `=== MARKET DATA ===\n${context}\n` : ''}
${sportFactors}

=== YOUR ANALYSIS PROCESS ===
1. ESTIMATE TRUE PROBABILITY: Based on all factors, what is your estimated true probability for each outcome?
2. COMPARE TO ODDS: Convert the bookmaker odds to implied probability. Where is the value?
3. CALCULATE EDGE: Your probability minus implied probability = edge. Only bet with 3%+ edge.
4. IDENTIFY BEST BET: Which market offers the highest expected value?

AVAILABLE MARKETS: ${betTypeOptions}

=== VERDICT CRITERIA ===
- STRONG BET: 5%+ edge, high confidence in your probability estimate
- SLIGHT EDGE: 3-5% edge, moderate confidence
- RISKY: <3% edge or high uncertainty in estimate
- AVOID: No value, or negative EV

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
Key Insight: [The main factor driving your edge - what the market is missing]
True Probability: [X]%
Implied Probability: [Y]%
Edge: [X-Y]%
Verdict: [STRONG BET/SLIGHT EDGE/RISKY/AVOID]
Confidence: [HIGH/MEDIUM/LOW]
Bet Type: [1X2/OVER/UNDER/BTTS/DOUBLE CHANCE/SPREAD]
Selection: [Your specific pick]
Odds: [X.XX]
Explanation: [Why you have an edge - what factor is the market underweighting?]

Be disciplined. If there's no edge, say AVOID. Professional bettors pass on most games.`;
}

export function parseAIResponse(agentId: string, response: string): Partial<AIAnalysis> {
  const agent = AI_AGENTS.find(a => a.id === agentId);

  // Extract verdict
  const verdictMatch = response.match(/verdict[:\s]*(STRONG BET|SLIGHT EDGE|RISKY|AVOID)/i);
  const verdict = verdictMatch
    ? verdictMatch[1].toUpperCase() as Verdict
    : 'UNKNOWN';

  // Extract true probability
  const trueProbMatch = response.match(/true\s*probability[:\s]*(\d{1,3}(?:\.\d+)?)\s*%/i);
  const probability = trueProbMatch ? parseFloat(trueProbMatch[1]) : undefined;

  // Extract implied probability
  const impliedProbMatch = response.match(/implied\s*probability[:\s]*(\d{1,3}(?:\.\d+)?)\s*%/i);
  const impliedProbability = impliedProbMatch ? parseFloat(impliedProbMatch[1]) : undefined;

  // Extract edge
  const edgeMatch = response.match(/edge[:\s]*([+-]?\d{1,2}(?:\.\d+)?)\s*%/i);
  const edge = edgeMatch ? parseFloat(edgeMatch[1]) : undefined;

  // Extract confidence
  const confMatch = response.match(/confidence[:\s]*(HIGH|MEDIUM|LOW)/i);
  const confidence = confMatch
    ? confMatch[1].toUpperCase() as Confidence
    : 'MEDIUM';

  // Extract bet type
  const betTypeMatch = response.match(/bet\s*type[:\s]*(1X2|OVER\/?UNDER|BTTS|DOUBLE CHANCE|PLAYER PROP|SPREAD)/i);
  const betType = betTypeMatch
    ? betTypeMatch[1].toUpperCase().replace('/', '/') as BetType
    : undefined;

  // Extract selection
  const selectionMatch = response.match(/selection[:\s]*(.+?)(?:\n|$)/i);
  const betSelection = selectionMatch ? selectionMatch[1].trim() : undefined;

  // Extract odds (decimal format like 1.85, 2.10)
  const oddsMatch = response.match(/odds[:\s]*(\d+\.\d{1,2})/i);
  const betOdds = oddsMatch ? parseFloat(oddsMatch[1]) : undefined;

  // Extract explanation (key insight)
  const explanationMatch = response.match(/explanation[:\s]*(.+?)(?:\n|$)/i);
  const keyInsightMatch = response.match(/key\s*insight[:\s]*(.+?)(?:\n|$)/i);
  const betExplanation = explanationMatch ? explanationMatch[1].trim() :
                         keyInsightMatch ? keyInsightMatch[1].trim() : undefined;

  return {
    agentId,
    agentName: agent?.name || agentId,
    emoji: agent?.emoji || '🤖',
    opinion: response,
    verdict,
    confidence,
    probability,
    impliedProbability,
    edge,
    betType,
    betSelection,
    betOdds,
    betExplanation,
    timestamp: new Date().toISOString(),
  };
}
