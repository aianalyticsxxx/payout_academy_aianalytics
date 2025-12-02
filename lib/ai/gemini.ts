// ==========================================
// GOOGLE GEMINI IMPLEMENTATION
// ==========================================

import { AIAnalysis, SportEvent, AI_AGENTS, getAnalysisPrompt, parseAIResponse } from './types';

const AGENT = AI_AGENTS.find(a => a.id === 'gemini')!;

let genAI: any = null;

async function getClient() {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY is not configured');
  }
  if (!genAI) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  }
  return genAI;
}

export async function analyzeWithGemini(
  event: SportEvent,
  context: string = ''
): Promise<AIAnalysis> {
  const startTime = Date.now();
  
  try {
    const client = await getClient();
    const model = client.getGenerativeModel({ 
      model: AGENT.model,
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.7,
      },
    });

    const prompt = getAnalysisPrompt(event, context, AGENT);
    const result = await model.generateContent(prompt);
    const response = result.response;
    const content = response.text();

    const parsed = parseAIResponse('gemini', content);
    
    return {
      ...parsed,
      agentId: 'gemini',
      agentName: AGENT.name,
      emoji: AGENT.emoji,
      opinion: content,
      verdict: parsed.verdict || 'UNKNOWN',
      confidence: parsed.confidence || 'MEDIUM',
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    } as AIAnalysis;
    
  } catch (error) {
    console.error('Gemini analysis error:', error);
    
    return {
      agentId: 'gemini',
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
