// ==========================================
// PERPLEXITY IMPLEMENTATION (WITH LIVE WEB)
// ==========================================
// Perplexity has real-time web access, making it excellent
// for finding recent news, injuries, and roster changes
// https://www.perplexity.ai/settings/api

import { AIAnalysis, SportEvent, AI_AGENTS, parseAIResponse } from './types';

const AGENT = AI_AGENTS.find(a => a.id === 'perplexity')!;

export async function analyzeWithPerplexity(
  event: SportEvent,
  context: string = ''
): Promise<AIAnalysis> {
  const startTime = Date.now();
  
  try {
    if (!process.env.PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    // Perplexity-specific prompt that leverages web search
    const prompt = `You are a sports betting research analyst with access to live information.

RESEARCH AND ANALYZE THIS UPCOMING GAME:
${event.awayTeam} @ ${event.homeTeam}
Sport: ${event.sportTitle}
League: ${event.league || 'N/A'}
Game Time: ${new Date(event.commenceTime).toLocaleString()}

SEARCH FOR AND INCLUDE:
1. Recent team news and injuries (last 48 hours)
2. Head-to-head record
3. Current form (last 5 games)
4. Any relevant betting line movement or sharp action

${context ? `ADDITIONAL CONTEXT:\n${context}\n` : ''}

PROVIDE YOUR ANALYSIS:
Key Insight: [Most important factor from your research]
Win Probability: [X]%
Verdict: [STRONG BET/SLIGHT EDGE/RISKY/AVOID]
Confidence: [HIGH/MEDIUM/LOW]
Reasoning: [Brief reasoning based on your research]

Keep response under 150 words. Be decisive with your verdict.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AGENT.model, // llama-3.1-sonar-large-128k-online
        max_tokens: 400,
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content: `You are Perplexity, a research-oriented sports analyst. ${AGENT.personality} Use your web search capabilities to find the most current information.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const parsed = parseAIResponse('perplexity', content);
    
    return {
      ...parsed,
      agentId: 'perplexity',
      agentName: AGENT.name,
      emoji: AGENT.emoji,
      opinion: content,
      verdict: parsed.verdict || 'UNKNOWN',
      confidence: parsed.confidence || 'MEDIUM',
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    } as AIAnalysis;
    
  } catch (error) {
    console.error('Perplexity analysis error:', error);
    
    return {
      agentId: 'perplexity',
      agentName: AGENT.name,
      emoji: AGENT.emoji,
      opinion: '',
      verdict: 'UNKNOWN',
      confidence: 'LOW',
      error: error instanceof Error ? error.message : 'Analysis failed',
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}
