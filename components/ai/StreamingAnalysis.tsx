'use client';

// ==========================================
// STREAMING ANALYSIS COMPONENT
// ==========================================
// Real-time visualization of AI models analyzing

import { useEffect, useState } from 'react';

interface StreamingAnalysisProps {
  currentAgent: string | null;
  progress: number;
  completedAgents: string[];
  isStreaming: boolean;
}

const AI_AGENTS = [
  { id: 'claude', name: 'Claude', emoji: '🟠', color: 'text-orange-400', bg: 'bg-orange-500' },
  { id: 'chatgpt', name: 'ChatGPT', emoji: '💚', color: 'text-green-400', bg: 'bg-green-500' },
  { id: 'gemini', name: 'Gemini', emoji: '🔵', color: 'text-blue-400', bg: 'bg-blue-500' },
  { id: 'grok', name: 'Grok', emoji: '⚡', color: 'text-purple-400', bg: 'bg-purple-500' },
  { id: 'llama', name: 'Llama', emoji: '🦙', color: 'text-indigo-400', bg: 'bg-indigo-500' },
  { id: 'copilot', name: 'Copilot', emoji: '🤖', color: 'text-cyan-400', bg: 'bg-cyan-500' },
  { id: 'perplexity', name: 'Perplexity', emoji: '🔍', color: 'text-teal-400', bg: 'bg-teal-500' },
];

export function StreamingAnalysis({
  currentAgent,
  progress,
  completedAgents,
  isStreaming,
}: StreamingAnalysisProps) {
  const [dots, setDots] = useState('');

  // Animate dots for current agent
  useEffect(() => {
    if (!isStreaming || !currentAgent) return;

    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);

    return () => clearInterval(interval);
  }, [isStreaming, currentAgent]);

  return (
    <div className="bg-surface border border-zinc-800/50 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">AI Swarm Analysis</h3>
          <p className="text-sm text-zinc-500">
            {isStreaming
              ? `Analyzing with ${currentAgent ? AI_AGENTS.find(a => a.id === currentAgent)?.name : '...'}`
              : `${completedAgents.length}/7 models completed`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-teal-400 font-mono">{Math.round(progress)}%</div>
          <div className="text-xs text-zinc-500">Complete</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-zinc-900 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-teal-600 to-teal-400 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-7 gap-2">
        {AI_AGENTS.map(agent => {
          const isComplete = completedAgents.includes(agent.id);
          const isCurrent = currentAgent === agent.id;
          const isPending = !isComplete && !isCurrent;

          return (
            <div
              key={agent.id}
              className={`relative flex flex-col items-center p-3 rounded-xl transition-all duration-300 ${
                isComplete
                  ? 'bg-zinc-800/50 border border-zinc-700/50'
                  : isCurrent
                  ? 'bg-teal-900/30 border border-teal-600/50 shadow-lg shadow-teal-500/10'
                  : 'bg-zinc-900/30 border border-zinc-800/30 opacity-50'
              }`}
            >
              {/* Pulse animation for current agent */}
              {isCurrent && (
                <div className="absolute inset-0 rounded-xl animate-pulse bg-teal-500/10" />
              )}

              {/* Emoji */}
              <div className={`text-2xl mb-1 ${isCurrent ? 'animate-bounce' : ''}`}>
                {agent.emoji}
              </div>

              {/* Name */}
              <div className={`text-[10px] font-medium truncate w-full text-center ${
                isComplete ? agent.color : isCurrent ? 'text-teal-400' : 'text-zinc-600'
              }`}>
                {agent.name}
              </div>

              {/* Status indicator */}
              <div className="mt-1.5">
                {isComplete ? (
                  <span className="text-emerald-400 text-xs">✓</span>
                ) : isCurrent ? (
                  <span className="text-teal-400 text-xs">{dots}</span>
                ) : (
                  <span className="text-zinc-700 text-xs">○</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Updates */}
      {isStreaming && currentAgent && (
        <div className="mt-6 p-4 bg-dark/50 rounded-xl border border-teal-900/30">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 bg-teal-500 rounded-full animate-ping absolute" />
              <div className="w-3 h-3 bg-teal-500 rounded-full relative" />
            </div>
            <span className="text-sm text-zinc-400">
              <span className="text-teal-400 font-medium">
                {AI_AGENTS.find(a => a.id === currentAgent)?.name}
              </span>
              {' '}is analyzing the matchup{dots}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
