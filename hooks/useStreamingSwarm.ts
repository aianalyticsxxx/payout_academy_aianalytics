'use client';

// ==========================================
// STREAMING SWARM HOOK
// ==========================================
// Real-time AI analysis with Server-Sent Events

import { useState, useCallback, useRef } from 'react';

interface AIAnalysis {
  agentId: string;
  agentName: string;
  emoji: string;
  opinion: string;
  verdict: string;
  confidence: string;
  probability?: number;
  impliedProbability?: number;
  edge?: number;
  betType?: string;
  betSelection?: string;
  betOdds?: number;
  error?: string;
}

interface SwarmConsensus {
  verdict: string;
  score: string;
  betVotes: number;
  passVotes: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning?: string;
}

interface SportEvent {
  id: string;
  sportKey?: string;
  sportTitle: string;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  league?: string;
  bookmakers?: any[];
}

interface StreamingState {
  isStreaming: boolean;
  analyses: AIAnalysis[];
  consensus: SwarmConsensus | null;
  currentAgent: string | null;
  progress: number; // 0-100
  error: string | null;
}

const AI_AGENT_ORDER = ['claude', 'chatgpt', 'gemini', 'grok', 'llama', 'copilot', 'perplexity'];

export function useStreamingSwarm() {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    analyses: [],
    consensus: null,
    currentAgent: null,
    progress: 0,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startStreaming = useCallback(async (event: SportEvent) => {
    // Abort any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState({
      isStreaming: true,
      analyses: [],
      consensus: null,
      currentAgent: AI_AGENT_ORDER[0],
      progress: 0,
      error: null,
    });

    try {
      const eventParam = encodeURIComponent(JSON.stringify(event));
      const response = await fetch(`/api/ai/swarm?event=${eventParam}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to start streaming analysis');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              setState(prev => ({
                ...prev,
                isStreaming: false,
                progress: 100,
                currentAgent: null,
              }));
              break;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'analysis') {
                const analysis = parsed.data as AIAnalysis;
                const agentIndex = AI_AGENT_ORDER.indexOf(analysis.agentId);
                const nextAgentIndex = agentIndex + 1;
                const nextAgent = nextAgentIndex < AI_AGENT_ORDER.length ? AI_AGENT_ORDER[nextAgentIndex] : null;

                setState(prev => ({
                  ...prev,
                  analyses: [...prev.analyses, analysis],
                  currentAgent: nextAgent,
                  progress: ((agentIndex + 1) / AI_AGENT_ORDER.length) * 100,
                }));
              } else if (parsed.type === 'consensus') {
                setState(prev => ({
                  ...prev,
                  consensus: parsed.data as SwarmConsensus,
                  isStreaming: false,
                  progress: 100,
                  currentAgent: null,
                }));
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // User cancelled, not an error
        return;
      }

      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: error.message || 'Streaming failed',
      }));
    }
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState(prev => ({
      ...prev,
      isStreaming: false,
      currentAgent: null,
    }));
  }, []);

  const reset = useCallback(() => {
    stopStreaming();
    setState({
      isStreaming: false,
      analyses: [],
      consensus: null,
      currentAgent: null,
      progress: 0,
      error: null,
    });
  }, [stopStreaming]);

  return {
    ...state,
    startStreaming,
    stopStreaming,
    reset,
  };
}
