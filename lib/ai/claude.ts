// ==========================================
// CLAUDE (ANTHROPIC) IMPLEMENTATION
// ==========================================

import { AIAnalysis, SportEvent, AI_AGENTS, getAnalysisPrompt, parseAIResponse } from './types';

const AGENT = AI_AGENTS.find(a => a.id === 'claude')!;

let client: any = null;

async function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  if (!client) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

export async function analyzeWithClaude(
  event: SportEvent,
  context: string = ''
): Promise<AIAnalysis> {
  const startTime = Date.now();
  
  try {
    const anthropic = await getClient();
    const response = await anthropic.messages.create({
      model: AGENT.model,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: getAnalysisPrompt(event, context, AGENT),
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const parsed = parseAIResponse('claude', content.text);
    
    return {
      ...parsed,
      agentId: 'claude',
      agentName: AGENT.name,
      emoji: AGENT.emoji,
      opinion: content.text,
      verdict: parsed.verdict || 'UNKNOWN',
      confidence: parsed.confidence || 'MEDIUM',
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    } as AIAnalysis;
    
  } catch (error) {
    console.error('Claude analysis error:', error);
    
    return {
      agentId: 'claude',
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
