// ==========================================
// XAI GROK IMPLEMENTATION
// ==========================================

import { AIAnalysis, SportEvent, AI_AGENTS, getAnalysisPrompt, parseAIResponse } from './types';

const AGENT = AI_AGENTS.find(a => a.id === 'grok')!;

let client: any = null;

async function getClient() {
  if (!process.env.XAI_API_KEY) {
    throw new Error('XAI_API_KEY is not configured');
  }
  if (!client) {
    const OpenAI = (await import('openai')).default;
    client = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    });
  }
  return client;
}

export async function analyzeWithGrok(
  event: SportEvent,
  context: string = ''
): Promise<AIAnalysis> {
  const startTime = Date.now();
  
  try {
    const xai = await getClient();
    const response = await xai.chat.completions.create({
      model: AGENT.model,
      max_tokens: 300,
      temperature: 0.8, // Slightly higher for more creative/contrarian takes
      messages: [
        {
          role: 'system',
          content: `You are Grok, a witty and sometimes contrarian sports analyst. ${AGENT.personality} Don't be afraid to disagree with conventional wisdom if you see value.`,
        },
        {
          role: 'user',
          content: getAnalysisPrompt(event, context, AGENT),
        },
      ],
    });

    const content = response.choices[0]?.message?.content || '';
    const parsed = parseAIResponse('grok', content);
    
    return {
      ...parsed,
      agentId: 'grok',
      agentName: AGENT.name,
      emoji: AGENT.emoji,
      opinion: content,
      verdict: parsed.verdict || 'UNKNOWN',
      confidence: parsed.confidence || 'MEDIUM',
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    } as AIAnalysis;
    
  } catch (error) {
    console.error('Grok analysis error:', error);
    
    return {
      agentId: 'grok',
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
