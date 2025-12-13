'use client';

// ==========================================
// AI COMPARISON MATRIX COMPONENT
// ==========================================
// Shows all AI models' picks in a clean table format

interface AIAnalysis {
  agentId: string;
  agentName: string;
  emoji: string;
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

interface AIComparisonMatrixProps {
  analyses: AIAnalysis[];
  translations: {
    model: string;
    verdict: string;
    edge: string;
    pick: string;
    odds: string;
    noData: string;
  };
}

const AI_AGENTS = [
  { id: 'claude', name: 'Claude', emoji: '🟠', color: 'text-orange-400', bg: 'bg-orange-900/30' },
  { id: 'chatgpt', name: 'ChatGPT', emoji: '💚', color: 'text-green-400', bg: 'bg-green-900/30' },
  { id: 'gemini', name: 'Gemini', emoji: '🔵', color: 'text-blue-400', bg: 'bg-blue-900/30' },
  { id: 'grok', name: 'Grok', emoji: '⚡', color: 'text-purple-400', bg: 'bg-purple-900/30' },
  { id: 'llama', name: 'Llama', emoji: '🦙', color: 'text-indigo-400', bg: 'bg-indigo-900/30' },
  { id: 'copilot', name: 'Copilot', emoji: '🤖', color: 'text-cyan-400', bg: 'bg-cyan-900/30' },
  { id: 'perplexity', name: 'Perplexity', emoji: '🔍', color: 'text-teal-400', bg: 'bg-teal-900/30' },
];

function getVerdictStyle(verdict: string) {
  switch (verdict) {
    case 'STRONG BET':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'SLIGHT EDGE':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'RISKY':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'AVOID':
      return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    default:
      return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  }
}

export function AIComparisonMatrix({ analyses, translations }: AIComparisonMatrixProps) {
  return (
    <div className="bg-surface border border-zinc-800/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-zinc-900/50 border-b border-zinc-800/50">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <span>🤖</span> AI Model Comparison
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800/50 bg-zinc-900/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                {translations.model}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                {translations.verdict}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                {translations.edge}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                {translations.pick}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                {translations.odds}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/30">
            {AI_AGENTS.map(agent => {
              const analysis = analyses.find(a => a.agentId === agent.id);
              const hasResponse = analysis && !analysis.error && analysis.verdict !== 'UNKNOWN';
              const agentStyle = AI_AGENTS.find(a => a.id === agent.id);

              return (
                <tr
                  key={agent.id}
                  className={`transition-colors ${hasResponse ? 'hover:bg-zinc-800/30' : 'opacity-50'}`}
                >
                  {/* Model */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{agent.emoji}</span>
                      <span className={`font-medium ${agentStyle?.color || 'text-white'}`}>
                        {agent.name}
                      </span>
                    </div>
                  </td>

                  {/* Verdict */}
                  <td className="px-4 py-3 text-center">
                    {hasResponse ? (
                      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold border ${getVerdictStyle(analysis.verdict)}`}>
                        {analysis.verdict}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>

                  {/* Edge */}
                  <td className="px-4 py-3 text-center">
                    {hasResponse && analysis.edge != null ? (
                      <span className={`font-mono font-semibold ${
                        analysis.edge >= 5 ? 'text-emerald-400' :
                        analysis.edge >= 3 ? 'text-amber-400' :
                        analysis.edge > 0 ? 'text-orange-400' : 'text-rose-400'
                      }`}>
                        {analysis.edge > 0 ? '+' : ''}{analysis.edge.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>

                  {/* Pick */}
                  <td className="px-4 py-3">
                    {hasResponse && analysis.betSelection ? (
                      <div className="flex items-center gap-2">
                        {analysis.betType && (
                          <span className="px-1.5 py-0.5 bg-teal-900/40 text-teal-400 rounded text-[10px] font-medium">
                            {analysis.betType}
                          </span>
                        )}
                        <span className="text-white font-medium truncate max-w-[120px]">
                          {analysis.betSelection}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>

                  {/* Odds */}
                  <td className="px-4 py-3 text-right">
                    {hasResponse && analysis.betOdds ? (
                      <span className="font-mono font-semibold text-amber-400">
                        @{analysis.betOdds.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="px-4 py-3 bg-zinc-900/30 border-t border-zinc-800/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">
            {analyses.filter(a => !a.error && a.verdict !== 'UNKNOWN').length}/7 models responded
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-emerald-400">
                {analyses.filter(a => ['STRONG BET', 'SLIGHT EDGE'].includes(a.verdict)).length} Bet
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-rose-400">
                {analyses.filter(a => ['RISKY', 'AVOID'].includes(a.verdict)).length} Pass
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
