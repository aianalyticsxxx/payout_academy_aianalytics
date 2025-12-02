// ==========================================
// GROQ (LLAMA) IMPLEMENTATION - FREE!
// ==========================================
// Groq provides extremely fast inference for Llama models
// Free tier: Very generous limits
// https://console.groq.com/

import { AIAnalysis, SportEvent, AI_AGENTS, getAnalysisPrompt, parseAIResponse } from './types';

const AGENT = AI_AGENTS.find(a => a.id === 'llama')!;

let client: any = null;

async function getClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }
  if (!client) {
    const Groq = (await import('groq-sdk')).default;
    client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return client;
}

export async function analyzeWithLlama(
  event: SportEvent,
  context: string = ''
): Promise<AIAnalysis> {
  const startTime = Date.now();
  
  try {
    const groq = await getClient();
    const response = await groq.chat.completions.create({
      model: AGENT.model, // llama-3.3-70b-versatile
      max_tokens: 300,
      temperature: 0.6,
      messages: [
        {
          role: 'system',
          content: `You are Llama, a straightforward sports analyst. ${AGENT.personality}`,
        },
        {
          role: 'user',
          content: getAnalysisPrompt(event, context, AGENT),
        },
      ],
    });

    const content = response.choices[0]?.message?.content || '';
    const parsed = parseAIResponse('llama', content);
    
    return {
      ...parsed,
      agentId: 'llama',
      agentName: AGENT.name,
      emoji: AGENT.emoji,
      opinion: content,
      verdict: parsed.verdict || 'UNKNOWN',
      confidence: parsed.confidence || 'MEDIUM',
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    } as AIAnalysis;
    
  } catch (error) {
    console.error('Llama analysis error:', error);
    
    return {
      agentId: 'llama',
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
