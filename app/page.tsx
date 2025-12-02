'use client';

// ==========================================
// PAYOUT ACADEMY - MAIN DASHBOARD
// ==========================================

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// ==========================================
// TYPES
// ==========================================

interface SportEvent {
  id: string;
  sportKey: string;
  sportTitle: string;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  league?: string;
  bookmakers?: any[];
  bestOdds?: any;
}

interface AIAnalysis {
  agentId: string;
  agentName: string;
  emoji: string;
  opinion: string;
  verdict: string;
  confidence: string;
  probability?: number;
  betType?: string;
  betSelection?: string;
  betOdds?: number;
  betExplanation?: string;
}

interface SwarmResult {
  eventId: string;
  eventName: string;
  analyses: AIAnalysis[];
  consensus: {
    verdict: string;
    score: string;
    betVotes: number;
    passVotes: number;
    confidence: string;
    topBetType?: string;
    topSelection?: string;
    avgOdds?: number;
    reasoning?: string;
  };
}

interface Bet {
  id: string;
  sport: string;
  league?: string;
  matchup: string;
  betType: string;
  selection: string;
  odds: string;
  stake: number;
  result: string;
  profitLoss?: number;
  createdAt: string;
}

// ==========================================
// CONSTANTS
// ==========================================

const SPORTS = [
  { key: 'basketball_nba', name: 'NBA', emoji: '🏀' },
  { key: 'americanfootball_nfl', name: 'NFL', emoji: '🏈' },
  { key: 'baseball_mlb', name: 'MLB', emoji: '⚾' },
  { key: 'icehockey_nhl', name: 'NHL', emoji: '🏒' },
  { key: 'soccer_epl', name: 'Premier League', emoji: '⚽' },
  { key: 'soccer_spain_la_liga', name: 'La Liga', emoji: '⚽' },
  { key: 'mma_mixed_martial_arts', name: 'UFC', emoji: '🥊' },
];

const AI_AGENTS = [
  { id: 'claude', name: 'Claude', emoji: '🟠', color: 'text-orange-400', bg: 'bg-orange-900/30' },
  { id: 'chatgpt', name: 'ChatGPT', emoji: '💚', color: 'text-green-400', bg: 'bg-green-900/30' },
  { id: 'gemini', name: 'Gemini', emoji: '🔵', color: 'text-blue-400', bg: 'bg-blue-900/30' },
  { id: 'grok', name: 'Grok', emoji: '⚡', color: 'text-purple-400', bg: 'bg-purple-900/30' },
  { id: 'llama', name: 'Llama', emoji: '🦙', color: 'text-indigo-400', bg: 'bg-indigo-900/30' },
  { id: 'copilot', name: 'Copilot', emoji: '🤖', color: 'text-cyan-400', bg: 'bg-cyan-900/30' },
  { id: 'perplexity', name: 'Perplexity', emoji: '🔍', color: 'text-teal-400', bg: 'bg-teal-900/30' },
];

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State
  const [activeTab, setActiveTab] = useState<'events' | 'ai' | 'bets' | 'competition'>('events');
  const [selectedSport, setSelectedSport] = useState(SPORTS[0]);
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SportEvent | null>(null);
  const [swarmResult, setSwarmResult] = useState<SwarmResult | null>(null);
  const [analyzingSwarm, setAnalyzingSwarm] = useState(false);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loadingBets, setLoadingBets] = useState(false);
  const [userStats, setUserStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [aiSubTab, setAiSubTab] = useState<'swarm' | 'predictions' | 'rankings'>('swarm');

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch events when sport changes
  useEffect(() => {
    fetchEvents();
  }, [selectedSport]);

  // Fetch bets on mount
  useEffect(() => {
    if (session) {
      fetchBets();
      fetchUserStats();
      fetchLeaderboard();
    }
  }, [session]);

  // ==========================================
  // API CALLS
  // ==========================================

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch(`/api/sports/events?sport=${selectedSport.key}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchBets = async () => {
    setLoadingBets(true);
    try {
      const res = await fetch('/api/bets');
      const data = await res.json();
      setBets(data.bets || []);
    } catch (error) {
      console.error('Failed to fetch bets:', error);
    } finally {
      setLoadingBets(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const res = await fetch('/api/user/profile');
      const data = await res.json();
      setUserStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard?limit=10');
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  const runSwarmAnalysis = async (event: SportEvent) => {
    setSelectedEvent(event);
    setAnalyzingSwarm(true);
    setSwarmResult(null);
    setActiveTab('ai');
    setAiSubTab('swarm');

    try {
      const res = await fetch('/api/ai/swarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      });
      const data = await res.json();
      setSwarmResult(data);
    } catch (error) {
      console.error('Swarm analysis failed:', error);
    } finally {
      setAnalyzingSwarm(false);
    }
  };

  const settleBet = async (betId: string, result: 'won' | 'lost' | 'push') => {
    try {
      await fetch('/api/bets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: betId, result }),
      });
      fetchBets();
      fetchUserStats();
    } catch (error) {
      console.error('Failed to settle bet:', error);
    }
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'STRONG BET': return 'text-green-400 bg-green-900/30';
      case 'SLIGHT EDGE': return 'text-yellow-400 bg-yellow-900/30';
      case 'RISKY': return 'text-orange-400 bg-orange-900/30';
      case 'AVOID': return 'text-red-400 bg-red-900/30';
      default: return 'text-zinc-400 bg-zinc-900/30';
    }
  };

  const getTierInfo = (tier: string) => {
    const tiers: Record<string, { icon: string; color: string }> = {
      'Diamond': { icon: '💎', color: 'text-cyan-400' },
      'Platinum': { icon: '⭐', color: 'text-purple-400' },
      'Gold': { icon: '🏆', color: 'text-yellow-400' },
      'Silver': { icon: '🥈', color: 'text-gray-300' },
      'Bronze': { icon: '🥉', color: 'text-orange-400' },
    };
    return tiers[tier] || tiers['Bronze'];
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-yellow-400 text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="p-4 md:p-6" style={{ background: 'linear-gradient(to right, #FFD608, #e6c107)' }}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-black">🎓 Payout Academy</h1>
            <p className="text-black/70 text-sm">AI-Powered Betting Analytics</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-black/80 text-sm hidden md:block">
              {(session.user as any)?.username || session.user?.email}
            </span>
            <button
              onClick={() => signOut()}
              className="bg-black/20 hover:bg-black/30 text-black px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto flex overflow-x-auto">
          {[
            { id: 'events', label: '🎯 Events', icon: '🎯' },
            { id: 'ai', label: '🤖 AI Hub', icon: '🤖' },
            { id: 'bets', label: '📊 Bet Analysis', icon: '📊' },
            { id: 'competition', label: '🏆 Competition', icon: '🏆' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 md:px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-yellow-400 border-b-2 border-yellow-400 bg-zinc-800'
                  : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        
        {/* EVENTS TAB */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            {/* Sport Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {SPORTS.map(sport => (
                <button
                  key={sport.key}
                  onClick={() => setSelectedSport(sport)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedSport.key === sport.key
                      ? 'bg-yellow-500 text-black'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {sport.emoji} {sport.name}
                </button>
              ))}
            </div>

            {/* Events Grid */}
            {loadingEvents ? (
              <div className="text-center py-12 text-zinc-400">Loading events...</div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">No upcoming events found</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {events.map(event => (
                  <div key={event.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="text-xs text-zinc-500 mb-2">
                      {new Date(event.commenceTime).toLocaleString()}
                    </div>
                    <div className="font-semibold mb-3">
                      {event.awayTeam} @ {event.homeTeam}
                    </div>
                    
                    {/* Best Odds - European 1-X-2 Format */}
                    {event.bestOdds && (
                      <div className="mb-3">
                        <div className="text-xs text-zinc-500 mb-1">Best Odds (1-X-2)</div>
                        <div className="flex gap-2 text-sm flex-wrap">
                          <span className="bg-zinc-800 px-2 py-1 rounded flex items-center gap-1">
                            <span className="text-zinc-400">1</span>
                            <span className="text-yellow-400 font-mono">{event.bestOdds.home?.price?.toFixed(2)}</span>
                          </span>
                          {event.bestOdds.draw?.price > 0 && (
                            <span className="bg-zinc-800 px-2 py-1 rounded flex items-center gap-1">
                              <span className="text-zinc-400">X</span>
                              <span className="text-yellow-400 font-mono">{event.bestOdds.draw?.price?.toFixed(2)}</span>
                            </span>
                          )}
                          <span className="bg-zinc-800 px-2 py-1 rounded flex items-center gap-1">
                            <span className="text-zinc-400">2</span>
                            <span className="text-yellow-400 font-mono">{event.bestOdds.away?.price?.toFixed(2)}</span>
                          </span>
                        </div>
                        {event.bestOdds.home?.bookmaker && (
                          <div className="text-xs text-zinc-600 mt-1">
                            via {event.bestOdds.home.bookmaker}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => runSwarmAnalysis(event)}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium py-2 rounded-lg transition-all"
                    >
                      🤖 Ask 7 AIs
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI HUB TAB */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-600/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-purple-400">🤖 AI Command Center</h2>
              <p className="text-zinc-400 mt-1">7-Model Swarm Analysis • Performance Tracking • AI Leaderboard</p>
            </div>

            {/* Sub Navigation */}
            <div className="flex gap-2">
              {[
                { id: 'swarm', label: '🤖 Swarm Analysis' },
                { id: 'predictions', label: '🔮 Predictions' },
                { id: 'rankings', label: '🏆 AI Rankings' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setAiSubTab(tab.id as any)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    aiSubTab === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Swarm Analysis */}
            {aiSubTab === 'swarm' && (
              <div>
                {analyzingSwarm ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4 animate-bounce">🤖</div>
                    <div className="text-lg text-purple-400">AI Swarm is analyzing...</div>
                    <div className="text-sm text-zinc-500 mt-2">
                      Consulting Claude, ChatGPT, Gemini, Grok, Llama, Copilot & Perplexity
                    </div>
                  </div>
                ) : swarmResult ? (
                  <div className="space-y-6">
                    {/* Event */}
                    <div className="text-center">
                      <div className="text-xl font-bold">{swarmResult.eventName}</div>
                    </div>

                    {/* Consensus - Enhanced */}
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
                      {/* Header with Verdict */}
                      <div className={`p-6 ${getVerdictColor(swarmResult.consensus.verdict)}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm opacity-75 mb-1">AI Consensus</div>
                            <div className="text-3xl font-bold">{swarmResult.consensus.verdict}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-4xl font-bold">{swarmResult.consensus.score}</div>
                            <div className="text-sm opacity-75">Score</div>
                          </div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 divide-x divide-zinc-700 border-t border-zinc-700">
                        <div className="p-4 text-center">
                          <div className="text-2xl font-bold text-green-400">{swarmResult.consensus.betVotes}</div>
                          <div className="text-xs text-zinc-500">BET Votes</div>
                        </div>
                        <div className="p-4 text-center">
                          <div className="text-2xl font-bold text-red-400">{swarmResult.consensus.passVotes}</div>
                          <div className="text-xs text-zinc-500">PASS Votes</div>
                        </div>
                        <div className="p-4 text-center">
                          <div className={`text-2xl font-bold ${
                            swarmResult.consensus.confidence === 'HIGH' ? 'text-green-400' :
                            swarmResult.consensus.confidence === 'MEDIUM' ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {swarmResult.consensus.confidence}
                          </div>
                          <div className="text-xs text-zinc-500">Confidence</div>
                        </div>
                      </div>

                      {/* Recommended Bet Section */}
                      {(() => {
                        // Calculate most popular bet type and selection from analyses
                        const betTypes: Record<string, number> = {};
                        const selections: Record<string, { count: number; odds: number[] }> = {};

                        swarmResult.analyses.forEach(a => {
                          if (a.betType) {
                            betTypes[a.betType] = (betTypes[a.betType] || 0) + 1;
                          }
                          if (a.betSelection) {
                            if (!selections[a.betSelection]) {
                              selections[a.betSelection] = { count: 0, odds: [] };
                            }
                            selections[a.betSelection].count++;
                            if (a.betOdds) selections[a.betSelection].odds.push(a.betOdds);
                          }
                        });

                        const topBetType = Object.entries(betTypes).sort((a, b) => b[1] - a[1])[0];
                        const topSelection = Object.entries(selections).sort((a, b) => b[1].count - a[1].count)[0];
                        const avgOdds = topSelection?.[1].odds.length
                          ? topSelection[1].odds.reduce((a, b) => a + b, 0) / topSelection[1].odds.length
                          : null;

                        if (!topBetType && !topSelection) return null;

                        return (
                          <div className="p-4 border-t border-zinc-700 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
                            <div className="text-xs text-zinc-500 mb-2">RECOMMENDED BET</div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {topBetType && (
                                  <span className="bg-purple-600/30 text-purple-300 px-2 py-1 rounded text-sm font-medium">
                                    {topBetType[0]}
                                  </span>
                                )}
                                {topSelection && (
                                  <span className="text-lg font-semibold text-white">
                                    {topSelection[0]}
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                {avgOdds && (
                                  <div className="text-2xl font-bold text-yellow-400 font-mono">
                                    @{avgOdds.toFixed(2)}
                                  </div>
                                )}
                                {topSelection && (
                                  <div className="text-xs text-zinc-500">
                                    {topSelection[1].count}/{swarmResult.analyses.length} AIs agree
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Vote Distribution Bar */}
                      <div className="p-4 border-t border-zinc-700">
                        <div className="text-xs text-zinc-500 mb-2">VOTE DISTRIBUTION</div>
                        <div className="h-4 bg-zinc-800 rounded-full overflow-hidden flex">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-400 transition-all"
                            style={{
                              width: `${(swarmResult.consensus.betVotes / (swarmResult.consensus.betVotes + swarmResult.consensus.passVotes)) * 100}%`
                            }}
                          />
                          <div
                            className="bg-gradient-to-r from-red-500 to-red-400 transition-all"
                            style={{
                              width: `${(swarmResult.consensus.passVotes / (swarmResult.consensus.betVotes + swarmResult.consensus.passVotes)) * 100}%`
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-1 text-xs">
                          <span className="text-green-400">
                            {Math.round((swarmResult.consensus.betVotes / (swarmResult.consensus.betVotes + swarmResult.consensus.passVotes)) * 100)}% Bet
                          </span>
                          <span className="text-red-400">
                            {Math.round((swarmResult.consensus.passVotes / (swarmResult.consensus.betVotes + swarmResult.consensus.passVotes)) * 100)}% Pass
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* AI Opinions */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {swarmResult.analyses.map(analysis => {
                        const agent = AI_AGENTS.find(a => a.id === analysis.agentId);
                        return (
                          <div
                            key={analysis.agentId}
                            className={`p-4 rounded-xl border ${agent?.bg} border-zinc-700`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">{analysis.emoji}</span>
                              <span className={`font-semibold ${agent?.color}`}>{analysis.agentName}</span>
                            </div>
                            <div className={`text-sm px-2 py-1 rounded inline-block ${getVerdictColor(analysis.verdict)}`}>
                              {analysis.verdict}
                            </div>

                            {/* Bet Type & Selection */}
                            {analysis.betType && (
                              <div className="mt-3 p-2 bg-black/30 rounded-lg">
                                <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                                  <span className="bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded">
                                    {analysis.betType}
                                  </span>
                                </div>
                                {analysis.betSelection && (
                                  <div className="text-sm font-medium text-white">
                                    {analysis.betSelection}
                                    {analysis.betOdds && (
                                      <span className="ml-2 text-yellow-400 font-mono">
                                        @{analysis.betOdds.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {analysis.betExplanation && (
                                  <p className="text-xs text-zinc-400 mt-1 italic">
                                    {analysis.betExplanation}
                                  </p>
                                )}
                              </div>
                            )}

                            <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{analysis.opinion}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎯</div>
                    <div className="text-xl font-semibold mb-2">Select an Event</div>
                    <div className="text-zinc-400">Go to Events tab and click "Ask 7 AIs" on any matchup</div>
                    <button
                      onClick={() => setActiveTab('events')}
                      className="mt-4 bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2 rounded-lg font-medium"
                    >
                      Browse Events →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* AI Rankings */}
            {aiSubTab === 'rankings' && (
              <div className="space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-zinc-800">
                      <tr>
                        <th className="px-4 py-3 text-left">Rank</th>
                        <th className="px-4 py-3 text-left">AI Model</th>
                        <th className="px-4 py-3 text-right">Record</th>
                        <th className="px-4 py-3 text-right">Win %</th>
                        <th className="px-4 py-3 text-right">Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {AI_AGENTS.map((agent, i) => (
                        <tr key={agent.id} className="border-t border-zinc-800">
                          <td className="px-4 py-3 font-bold">{i + 1}</td>
                          <td className="px-4 py-3">
                            <span className="text-xl mr-2">{agent.emoji}</span>
                            <span className={agent.color}>{agent.name}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-zinc-400">-</td>
                          <td className="px-4 py-3 text-right text-zinc-400">-</td>
                          <td className="px-4 py-3 text-right text-zinc-400">1.0x</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BETS TAB */}
        {activeTab === 'bets' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-600/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-yellow-400">📊 Bet Analysis Center</h2>
              <p className="text-zinc-400 mt-1">Track, analyze, and improve your betting performance</p>
            </div>

            {/* Stats */}
            {userStats && (
              <div className="grid gap-4 md:grid-cols-5">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <div className="text-sm text-zinc-400">Record</div>
                  <div className="text-2xl font-bold">{userStats.wins}-{userStats.losses}</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <div className="text-sm text-zinc-400">Win Rate</div>
                  <div className={`text-2xl font-bold ${userStats.winRate >= 55 ? 'text-green-400' : userStats.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {userStats.winRate?.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <div className="text-sm text-zinc-400">ROI</div>
                  <div className={`text-2xl font-bold ${userStats.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {userStats.roi >= 0 ? '+' : ''}{userStats.roi?.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <div className="text-sm text-zinc-400">Profit/Loss</div>
                  <div className={`text-2xl font-bold ${userStats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${Math.abs(userStats.totalProfit)?.toFixed(2)}
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <div className="text-sm text-zinc-400">Streak</div>
                  <div className="text-2xl font-bold">
                    {userStats.currentStreak > 0 ? '🔥' : userStats.currentStreak < 0 ? '❄️' : '➖'}
                    {Math.abs(userStats.currentStreak || 0)}
                  </div>
                </div>
              </div>
            )}

            {/* Bet History */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800">
                <h3 className="font-semibold">Recent Bets</h3>
              </div>
              {loadingBets ? (
                <div className="p-8 text-center text-zinc-400">Loading...</div>
              ) : bets.length === 0 ? (
                <div className="p-8 text-center text-zinc-400">No bets yet. Start tracking!</div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {bets.slice(0, 10).map(bet => (
                    <div key={bet.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{bet.matchup}</div>
                        <div className="text-sm text-zinc-400">
                          {bet.selection} @ {bet.odds} • ${bet.stake}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {bet.result === 'pending' ? (
                          <>
                            <button
                              onClick={() => settleBet(bet.id, 'won')}
                              className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm"
                            >
                              Won
                            </button>
                            <button
                              onClick={() => settleBet(bet.id, 'lost')}
                              className="bg-red-600 hover:bg-red-500 px-3 py-1 rounded text-sm"
                            >
                              Lost
                            </button>
                          </>
                        ) : (
                          <span className={`px-3 py-1 rounded text-sm ${
                            bet.result === 'won' ? 'bg-green-900/50 text-green-400' :
                            bet.result === 'lost' ? 'bg-red-900/50 text-red-400' :
                            'bg-zinc-700 text-zinc-400'
                          }`}>
                            {bet.result.toUpperCase()}
                            {bet.profitLoss !== undefined && ` (${bet.profitLoss >= 0 ? '+' : ''}$${bet.profitLoss.toFixed(2)})`}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* COMPETITION TAB */}
        {activeTab === 'competition' && (
          <div className="space-y-6">
            {/* User Profile Card */}
            <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-600/50 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="text-5xl">{(session.user as any)?.avatar || '🎲'}</div>
                <div>
                  <div className="text-xl font-bold">
                    {(session.user as any)?.username || 'Set Username'}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`${getTierInfo((session.user as any)?.tier || 'Bronze').color}`}>
                      {getTierInfo((session.user as any)?.tier || 'Bronze').icon} {(session.user as any)?.tier || 'Bronze'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Global Leaderboard */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 bg-gradient-to-r from-yellow-900/30 to-orange-900/30">
                <h3 className="font-semibold text-yellow-400">🌍 Global Leaderboard</h3>
              </div>
              
              {leaderboard.length === 0 ? (
                <div className="p-8 text-center text-zinc-400">
                  No ranked players yet. Get 10+ bets to appear on the leaderboard!
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-zinc-800">
                    <tr>
                      <th className="px-4 py-3 text-left">Rank</th>
                      <th className="px-4 py-3 text-left">Player</th>
                      <th className="px-4 py-3 text-right">Record</th>
                      <th className="px-4 py-3 text-right">Win %</th>
                      <th className="px-4 py-3 text-right">ROI</th>
                      <th className="px-4 py-3 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((player, i) => (
                      <tr
                        key={player.userId}
                        className={`border-t border-zinc-800 ${
                          i < 3 ? 'bg-yellow-900/10' : ''
                        } ${player.userId === (session.user as any)?.id ? 'bg-purple-900/20' : ''}`}
                      >
                        <td className="px-4 py-3 font-bold">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : player.rank}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xl mr-2">{player.avatar}</span>
                          <span className={getTierInfo(player.tier).color}>{player.username}</span>
                          {player.userId === (session.user as any)?.id && (
                            <span className="text-zinc-500 ml-1">(You)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {player.wins}W-{player.losses}L
                        </td>
                        <td className={`px-4 py-3 text-right ${
                          player.winRate >= 55 ? 'text-green-400' : 
                          player.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {player.winRate?.toFixed(1)}%
                        </td>
                        <td className={`px-4 py-3 text-right ${
                          player.roi >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {player.roi >= 0 ? '+' : ''}{player.roi?.toFixed(1)}%
                        </td>
                        <td className={`px-4 py-3 text-right ${
                          player.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          ${Math.abs(player.totalProfit)?.toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Tier Progress */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="font-semibold mb-4">🎖️ Tier Progress</h3>
              <div className="flex justify-between">
                {['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].map((tier, i) => {
                  const tierInfo = getTierInfo(tier);
                  const currentTierIndex = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].indexOf(
                    (session.user as any)?.tier || 'Bronze'
                  );
                  const isAchieved = i <= currentTierIndex;
                  
                  return (
                    <div
                      key={tier}
                      className={`text-center ${isAchieved ? '' : 'opacity-30'}`}
                    >
                      <div className="text-2xl">{tierInfo.icon}</div>
                      <div className={`text-xs mt-1 ${tierInfo.color}`}>{tier}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400"
                  style={{
                    width: `${((['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].indexOf(
                      (session.user as any)?.tier || 'Bronze'
                    ) + 1) / 5) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-zinc-800 text-center text-xs text-zinc-500">
        <p>🎓 Payout Academy Analytics • For Entertainment Only • Gamble Responsibly</p>
      </footer>
    </div>
  );
}
