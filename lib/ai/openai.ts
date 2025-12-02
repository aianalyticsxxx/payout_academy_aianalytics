// ==========================================
// OPENAI (CHATGPT & COPILOT) IMPLEMENTATION
// ==========================================

import { AIAnalysis, SportEvent, AI_AGENTS, getAnalysisPrompt, parseAIResponse } from './types';

let OpenAIClient: any = null;
let client: any = null;

async function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!client) {
    if (!OpenAIClient) {
      const module = await import('openai');
      OpenAIClient = module.default;
    }
    client = new OpenAIClient({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return client;
}

// ChatGPT (GPT-4o)
export async function analyzeWithChatGPT(
  event: SportEvent,
  context: string = ''
): Promise<AIAnalysis> {
  const AGENT = AI_AGENTS.find(a => a.id === 'chatgpt')!;
  const startTime = Date.now();

  try {
    const openai = await getClient();
    const response = await openai.chat.completions.create({
      model: AGENT.model,
      max_tokens: 300,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: `You are ChatGPT, an enthusiastic sports analyst. ${AGENT.personality}`,
        },
        {
          role: 'user',
          content: getAnalysisPrompt(event, context, AGENT),
        },
      ],
    });

    const content = response.choices[0]?.message?.content || '';
    const parsed = parseAIResponse('chatgpt', content);

    return {
      ...parsed,
      agentId: 'chatgpt',
      agentName: AGENT.name,
      emoji: AGENT.emoji,
      opinion: content,
      verdict: parsed.verdict || 'UNKNOWN',
      confidence: parsed.confidence || 'MEDIUM',
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    } as AIAnalysis;

  } catch (error) {
    console.error('ChatGPT analysis error:', error);

    return {
      agentId: 'chatgpt',
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

// Copilot (GPT-4o-mini) - Faster, cheaper alternative
export async function analyzeWithCopilot(
  event: SportEvent,
  context: string = ''
): Promise<AIAnalysis> {
  const AGENT = AI_AGENTS.find(a => a.id === 'copilot')!;
  const startTime = Date.now();

  try {
    const openai = await getClient();
    const response = await openai.chat.completions.create({
      model: AGENT.model,
      max_tokens: 300,
      temperature: 0.5, // More consistent
      messages: [
        {
          role: 'system',
          content: `You are Copilot, a technical sports analyst. ${AGENT.personality}`,
        },
        {
          role: 'user',
          content: getAnalysisPrompt(event, context, AGENT),
        },
      ],
    });

    const content = response.choices[0]?.message?.content || '';
    const parsed = parseAIResponse('copilot', content);

    return {
      ...parsed,
      agentId: 'copilot',
      agentName: AGENT.name,
      emoji: AGENT.emoji,
      opinion: content,
      verdict: parsed.verdict || 'UNKNOWN',
      confidence: parsed.confidence || 'MEDIUM',
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    } as AIAnalysis;

  } catch (error) {
    console.error('Copilot analysis error:', error);

    return {
      agentId: 'copilot',
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
