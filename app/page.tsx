'use client';

// ==========================================
// PAYOUT ACADEMY - MAIN DASHBOARD
// PlayerProfit-inspired Deep Teal Theme
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
  probability?: number;        // True probability estimate
  impliedProbability?: number; // Implied probability from odds
  edge?: number;               // Edge = true prob - implied prob
  betType?: string;
  betSelection?: string;
  betOdds?: number;
  betExplanation?: string;
  error?: string;              // Error message if AI failed
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
  timestamp?: string;
  cached?: boolean;
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

interface AIPrediction {
  id: string;
  eventId: string;
  eventName: string;
  sport?: string;
  league?: string;
  homeTeam?: string;
  awayTeam?: string;
  commenceTime?: string;
  consensusVerdict?: string;
  consensusScore?: number;
  betVotes: number;
  passVotes: number;
  aiVotes: any[];
  betSelection?: string;
  betOdds?: number;
  result: string;
  actualScore?: string;
  createdAt: string;
  settledAt?: string;
}

interface PredictionStats {
  total: number;
  won: number;
  lost: number;
  pending: number;
  winRate: string;
  currentStreak: number;
}

// ==========================================
// CONSTANTS
// ==========================================

// Sports Categories with Leagues
interface League {
  key: string;
  name: string;
}

interface SportCategory {
  id: string;
  name: string;
  emoji: string;
  leagues: League[];
}

const SPORTS_CATEGORIES: SportCategory[] = [
  {
    id: 'basketball',
    name: 'Basketball',
    emoji: '🏀',
    leagues: [
      { key: 'basketball_nba', name: 'NBA' },
      { key: 'basketball_ncaab', name: 'NCAA' },
      { key: 'basketball_euroleague', name: 'EuroLeague' },
    ],
  },
  {
    id: 'football',
    name: 'Football',
    emoji: '🏈',
    leagues: [
      { key: 'americanfootball_nfl', name: 'NFL' },
      { key: 'americanfootball_ncaaf', name: 'NCAA' },
    ],
  },
  {
    id: 'soccer',
    name: 'Soccer',
    emoji: '⚽',
    leagues: [
      { key: 'soccer_epl', name: 'Premier League' },
      { key: 'soccer_spain_la_liga', name: 'La Liga' },
      { key: 'soccer_italy_serie_a', name: 'Serie A' },
      { key: 'soccer_germany_bundesliga', name: 'Bundesliga' },
      { key: 'soccer_france_ligue_one', name: 'Ligue 1' },
      { key: 'soccer_uefa_champs_league', name: 'Champions League' },
    ],
  },
  {
    id: 'hockey',
    name: 'Hockey',
    emoji: '🏒',
    leagues: [
      { key: 'icehockey_nhl', name: 'NHL' },
    ],
  },
  {
    id: 'baseball',
    name: 'Baseball',
    emoji: '⚾',
    leagues: [
      { key: 'baseball_mlb', name: 'MLB' },
    ],
  },
  {
    id: 'mma',
    name: 'MMA',
    emoji: '🥊',
    leagues: [
      { key: 'mma_mixed_martial_arts', name: 'UFC' },
    ],
  },
  {
    id: 'tennis',
    name: 'Tennis',
    emoji: '🎾',
    leagues: [
      { key: 'tennis_atp_aus_open', name: 'ATP' },
      { key: 'tennis_wta_aus_open', name: 'WTA' },
    ],
  },
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
  const [selectedCategory, setSelectedCategory] = useState<SportCategory>(SPORTS_CATEGORIES[0]);
  const [selectedLeague, setSelectedLeague] = useState<League>(SPORTS_CATEGORIES[0].leagues[0]);
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SportEvent | null>(null);
  const [swarmResult, setSwarmResult] = useState<SwarmResult | null>(null);
  const [analyzingSwarm, setAnalyzingSwarm] = useState(false);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loadingBets, setLoadingBets] = useState(false);
  const [userStats, setUserStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [aiSubTab, setAiSubTab] = useState<'swarm' | 'predictions' | 'performance'>('swarm');
  const [aiLeaderboard, setAiLeaderboard] = useState<any[]>([]);
  const [loadingAiLeaderboard, setLoadingAiLeaderboard] = useState(false);
  const [aiCompetition, setAiCompetition] = useState<any>(null);
  const [loadingCompetition, setLoadingCompetition] = useState(false);
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [predictionStats, setPredictionStats] = useState<PredictionStats | null>(null);
  const [predictionFilter, setPredictionFilter] = useState<'all' | 'pending' | 'won' | 'lost'>('all');
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<AIPrediction | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch events when league changes
  useEffect(() => {
    fetchEvents();
  }, [selectedLeague]);

  // Fetch bets on mount
  useEffect(() => {
    if (session) {
      fetchBets();
      fetchUserStats();
      fetchLeaderboard();
    }
  }, [session]);

  // Fetch predictions when tab changes or filter changes
  useEffect(() => {
    if (aiSubTab === 'predictions') {
      fetchPredictions();
    }
    if (aiSubTab === 'performance') {
      fetchAiCompetition();
    }
  }, [aiSubTab, predictionFilter]);

  // ==========================================
  // API CALLS
  // ==========================================

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch(`/api/sports/events?sport=${selectedLeague.key}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Handle sport category selection
  const handleCategorySelect = (category: SportCategory) => {
    setSelectedCategory(category);
    setSelectedLeague(category.leagues[0]); // Default to first league
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

  const fetchPredictions = async () => {
    setLoadingPredictions(true);
    try {
      const res = await fetch(`/api/ai/predictions?result=${predictionFilter}&days=7`);
      const data = await res.json();
      setPredictions(data.predictions || []);
      setPredictionStats(data.stats || null);
    } catch (error) {
      console.error('Failed to fetch predictions:', error);
    } finally {
      setLoadingPredictions(false);
    }
  };

  const fetchAiLeaderboard = async () => {
    setLoadingAiLeaderboard(true);
    try {
      const res = await fetch('/api/leaderboard?type=ai');
      const data = await res.json();
      setAiLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Failed to fetch AI leaderboard:', error);
    } finally {
      setLoadingAiLeaderboard(false);
    }
  };

  const fetchAiCompetition = async () => {
    setLoadingCompetition(true);
    try {
      const res = await fetch('/api/ai/competition');
      const data = await res.json();
      setAiCompetition(data);
    } catch (error) {
      console.error('Failed to fetch AI competition:', error);
    } finally {
      setLoadingCompetition(false);
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
      case 'STRONG BET': return 'text-green-400 bg-green-900/40';
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
      'Gold': { icon: '🏆', color: 'text-gold' },
      'Silver': { icon: '🥈', color: 'text-gray-300' },
      'Bronze': { icon: '🥉', color: 'text-orange-400' },
    };
    return tiers[tier] || tiers['Bronze'];
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-teal-400 text-xl">Loading...</div>
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
    <div className="min-h-screen bg-dark text-white">
      {/* Header */}
      <header className="p-4 md:p-6 bg-surface border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-teal-400 tracking-tight">PAYOUT ACADEMY</h1>
            <p className="text-zinc-500 text-sm tracking-widest">Analytics</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400 text-sm hidden md:block">
              {(session.user as any)?.username || session.user?.email}
            </span>
            <button
              onClick={() => signOut()}
              className="bg-surface-light hover:bg-zinc-800 text-teal-400 px-3 py-1.5 rounded-xl text-sm font-medium border border-zinc-700 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-surface border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto flex overflow-x-auto">
          {[
            { id: 'events', label: 'Events', icon: '🎯' },
            { id: 'ai', label: 'AI Hub', icon: '🤖' },
            { id: 'bets', label: 'Bet Analysis', icon: '📊' },
            { id: 'competition', label: 'Competition', icon: '🏆' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 md:px-6 py-3 font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-teal-400 border-b-2 border-teal-400 bg-teal-900/20'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
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
            {/* Sport Category Selector */}
            <div className="space-y-3">
              {/* Sports Row */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {SPORTS_CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category)}
                    className={`px-5 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
                      selectedCategory.id === category.id
                        ? 'text-dark shadow-lg shadow-teal-500/25'
                        : 'bg-surface text-zinc-300 hover:bg-surface-light border border-zinc-800 hover:border-zinc-700'
                    }`}
                    style={selectedCategory.id === category.id ? { background: 'linear-gradient(180deg, #2DD4BF 0%, #14B8A6 100%)' } : {}}
                  >
                    <span className="text-lg">{category.emoji}</span>
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>

              {/* Leagues Row - Show leagues for selected sport */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {selectedCategory.leagues.map(league => (
                  <button
                    key={league.key}
                    onClick={() => setSelectedLeague(league)}
                    className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all duration-300 text-sm ${
                      selectedLeague.key === league.key
                        ? 'bg-teal-900/50 text-teal-400 border border-teal-700/50'
                        : 'bg-surface text-zinc-400 hover:bg-surface-light border border-zinc-800 hover:text-zinc-300'
                    }`}
                  >
                    {league.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Events Grid */}
            {loadingEvents ? (
              <div className="text-center py-12 text-zinc-400">Loading events...</div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">No upcoming events found</div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {events.map(event => {
                  const eventDate = new Date(event.commenceTime);
                  const isToday = new Date().toDateString() === eventDate.toDateString();
                  const isTomorrow = new Date(Date.now() + 86400000).toDateString() === eventDate.toDateString();
                  const timeLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                  return (
                    <div
                      key={event.id}
                      className="group relative bg-surface border border-zinc-800/50 rounded-2xl overflow-hidden hover:border-teal-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/10"
                    >
                      {/* Top Gradient Accent */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-teal-400 to-teal-500 opacity-40 group-hover:opacity-100 transition-opacity" />

                      {/* Card Content */}
                      <div className="p-6">
                        {/* Header - Date & Time */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isToday ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' :
                              isTomorrow ? 'bg-gold/20 text-gold border border-gold/30' :
                              'bg-zinc-800/50 text-zinc-400 border border-zinc-700/30'
                            }`}>
                              {timeLabel}
                            </div>
                            <span className="text-zinc-500 text-sm">
                              {eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-2xl">{selectedCategory.emoji}</div>
                        </div>

                        {/* Teams */}
                        <div className="space-y-3 mb-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 border border-zinc-700">
                              A
                            </div>
                            <span className="font-medium text-zinc-200 flex-1 truncate">{event.awayTeam}</span>
                          </div>
                          <div className="flex items-center gap-3 pl-4">
                            <span className="text-zinc-600 text-sm">@</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-900/30 flex items-center justify-center text-xs font-bold text-teal-400 border border-teal-500/30">
                              H
                            </div>
                            <span className="font-medium text-zinc-200 flex-1 truncate">{event.homeTeam}</span>
                          </div>
                        </div>

                        {/* Best Odds - Premium Design */}
                        {event.bestOdds && (
                          <div className="mb-5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Best Odds</span>
                              {event.bestOdds.home?.bookmaker && (
                                <span className="text-xs text-zinc-600">via {event.bestOdds.home.bookmaker}</span>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-zinc-800/50 backdrop-blur rounded-xl p-3 text-center border border-zinc-700/50 hover:border-teal-700/50 transition-colors">
                                <div className="text-[10px] text-zinc-500 font-medium mb-1">HOME</div>
                                <div className="text-lg font-bold text-teal-400">
                                  {event.bestOdds.home?.price?.toFixed(2)}
                                </div>
                              </div>
                              {event.bestOdds.draw?.price > 0 ? (
                                <div className="bg-zinc-800/50 backdrop-blur rounded-xl p-3 text-center border border-zinc-700/50 hover:border-teal-700/50 transition-colors">
                                  <div className="text-[10px] text-zinc-500 font-medium mb-1">DRAW</div>
                                  <div className="text-lg font-bold text-teal-400">
                                    {event.bestOdds.draw?.price?.toFixed(2)}
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-zinc-900/50 rounded-xl p-3 text-center border border-zinc-800/30">
                                  <div className="text-[10px] text-zinc-600 font-medium mb-1">DRAW</div>
                                  <div className="text-lg font-bold text-zinc-700">—</div>
                                </div>
                              )}
                              <div className="bg-zinc-800/50 backdrop-blur rounded-xl p-3 text-center border border-zinc-700/50 hover:border-teal-700/50 transition-colors">
                                <div className="text-[10px] text-zinc-500 font-medium mb-1">AWAY</div>
                                <div className="text-lg font-bold text-teal-400">
                                  {event.bestOdds.away?.price?.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* CTA Button - Teal Gradient */}
                        <button
                          onClick={() => runSwarmAnalysis(event)}
                          className="w-full text-dark font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-teal-900/30 hover:shadow-teal-500/30 flex items-center justify-center gap-2 group/btn"
                          style={{ background: 'linear-gradient(180deg, #2DD4BF 0%, #14B8A6 100%)' }}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-lg">🤖</span>
                            <span>Ask 7 AIs</span>
                            <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* AI HUB TAB */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-surface border border-zinc-800/50 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-teal-400">AI Command Center</h2>
              <p className="text-zinc-400 mt-1">7-Model Swarm Analysis • Performance Tracking • AI Leaderboard</p>
            </div>

            {/* Sub Navigation */}
            <div className="flex gap-2">
              {[
                { id: 'swarm', label: 'Swarm Analysis' },
                { id: 'predictions', label: 'Predictions' },
                { id: 'performance', label: 'AI Performance' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setAiSubTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    aiSubTab === tab.id
                      ? 'text-dark'
                      : 'bg-surface text-zinc-400 hover:bg-surface-light border border-zinc-800'
                  }`}
                  style={aiSubTab === tab.id ? { background: 'linear-gradient(180deg, #2DD4BF 0%, #14B8A6 100%)' } : {}}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Swarm Analysis */}
            {aiSubTab === 'swarm' && (
              <div>
                {analyzingSwarm ? (
                  <div className="relative p-[1px] rounded-2xl bg-gradient-to-b from-teal-500/50 to-teal-600/20">
                    <div className="bg-surface rounded-2xl py-16 px-8 text-center">
                      <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-xl animate-pulse" />
                        <div className="relative text-5xl animate-bounce">🤖</div>
                      </div>
                      <div className="text-xl font-semibold text-white mb-2">AI Swarm Analyzing</div>
                      <div className="text-zinc-400 max-w-md mx-auto">
                        Consulting 7 AI models for comprehensive analysis
                      </div>
                      <div className="flex justify-center gap-3 mt-6">
                        {['🧠', '💬', '✨', '⚡', '🦙', '👨‍💻', '🔍'].map((emoji, i) => (
                          <div
                            key={i}
                            className="w-10 h-10 rounded-full bg-surface-light border border-zinc-800 flex items-center justify-center text-lg"
                            style={{ animationDelay: `${i * 0.1}s` }}
                          >
                            {emoji}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : swarmResult ? (
                  <div className="space-y-8">
                    {/* Event Header with Gradient Border */}
                    <div className="relative p-[1px] rounded-2xl bg-gradient-to-r from-teal-500/50 via-teal-400/30 to-teal-500/50">
                      <div className="bg-surface rounded-2xl p-6 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Match Analysis</span>
                          {swarmResult.cached && (
                            <span className="text-[10px] font-medium text-teal-400 bg-teal-900/30 px-2 py-0.5 rounded-full border border-teal-700/30">
                              Shared Analysis
                            </span>
                          )}
                        </div>
                        <div className="text-2xl font-bold text-white">{swarmResult.eventName}</div>
                        {swarmResult.timestamp && (
                          <div className="text-xs text-zinc-600 mt-2">
                            Analyzed {new Date(swarmResult.timestamp).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Consensus Card - Premium Design */}
                    <div className="relative p-[1px] rounded-2xl bg-gradient-to-b from-teal-500/50 to-teal-600/20">
                      <div className="bg-surface rounded-2xl overflow-hidden">
                        {/* Header with Verdict - Enhanced */}
                        <div className={`p-8 ${getVerdictColor(swarmResult.consensus.verdict)}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-medium opacity-75 uppercase tracking-widest mb-2">AI Consensus</div>
                              <div className="text-4xl font-bold tracking-tight">{swarmResult.consensus.verdict}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-5xl font-bold">{swarmResult.consensus.score}</div>
                              <div className="text-xs font-medium opacity-75 uppercase tracking-widest mt-1">Score</div>
                            </div>
                          </div>
                        </div>

                        {/* Stats Grid - Refined */}
                        {(() => {
                          // Calculate average edge from analyses
                          const edges = swarmResult.analyses.filter(a => a.edge != null).map(a => a.edge!);
                          const avgEdge = edges.length > 0 ? edges.reduce((a, b) => a + b, 0) / edges.length : null;

                          return (
                            <div className="grid grid-cols-4 divide-x divide-zinc-800/50">
                              <div className="p-5 text-center">
                                <div className="text-3xl font-bold text-green-400">{swarmResult.consensus.betVotes}</div>
                                <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-1">BET</div>
                              </div>
                              <div className="p-5 text-center">
                                <div className="text-3xl font-bold text-red-400">{swarmResult.consensus.passVotes}</div>
                                <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-1">PASS</div>
                              </div>
                              <div className="p-5 text-center">
                                <div className={`text-3xl font-bold ${
                                  swarmResult.consensus.confidence === 'HIGH' ? 'text-green-400' :
                                  swarmResult.consensus.confidence === 'MEDIUM' ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  {swarmResult.consensus.confidence}
                                </div>
                                <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-1">Confidence</div>
                              </div>
                              <div className="p-5 text-center">
                                {avgEdge !== null ? (
                                  <>
                                    <div className={`text-3xl font-bold ${
                                      avgEdge >= 5 ? 'text-green-400' :
                                      avgEdge >= 3 ? 'text-yellow-400' :
                                      avgEdge > 0 ? 'text-orange-400' : 'text-red-400'
                                    }`}>
                                      {avgEdge > 0 ? '+' : ''}{avgEdge.toFixed(1)}%
                                    </div>
                                    <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-1">Avg Edge</div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-3xl font-bold text-zinc-600">—</div>
                                    <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-1">Avg Edge</div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Recommended Bet Section - Enhanced */}
                        {(() => {
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
                            <div className="p-6 border-t border-zinc-800/50 bg-gradient-to-r from-teal-950/50 to-teal-900/30">
                              <div className="text-xs font-medium text-teal-400 uppercase tracking-widest mb-3">Recommended Bet</div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  {topBetType && (
                                    <span className="bg-teal-500/20 text-teal-300 px-3 py-1.5 rounded-xl text-sm font-semibold border border-teal-500/30">
                                      {topBetType[0]}
                                    </span>
                                  )}
                                  {topSelection && (
                                    <span className="text-xl font-bold text-white">
                                      {topSelection[0]}
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  {avgOdds && (
                                    <div className="text-3xl font-bold text-gold font-mono">
                                      @{avgOdds.toFixed(2)}
                                    </div>
                                  )}
                                  {topSelection && (
                                    <div className="text-xs font-medium text-zinc-500 mt-1">
                                      {topSelection[1].count}/{swarmResult.analyses.length} AIs agree
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Vote Distribution Bar - Refined */}
                        <div className="p-6 border-t border-zinc-800/50">
                          <div className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">Vote Distribution</div>
                          <div className="h-3 bg-zinc-900 rounded-full overflow-hidden flex">
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
                          <div className="flex justify-between mt-2 text-sm font-medium">
                            <span className="text-green-400">
                              {Math.round((swarmResult.consensus.betVotes / (swarmResult.consensus.betVotes + swarmResult.consensus.passVotes)) * 100)}% Bet
                            </span>
                            <span className="text-red-400">
                              {Math.round((swarmResult.consensus.passVotes / (swarmResult.consensus.betVotes + swarmResult.consensus.passVotes)) * 100)}% Pass
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Opinions Header */}
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                      <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
                        Individual AI Analysis ({swarmResult.analyses.filter(a => !a.error && a.verdict !== 'UNKNOWN').length}/7 responded)
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                    </div>

                    {/* AI Status Summary - Show all 7 AIs */}
                    <div className="flex flex-wrap gap-2 justify-center p-3 bg-dark/30 rounded-xl border border-zinc-800/30">
                      {AI_AGENTS.map(agent => {
                        const analysis = swarmResult.analyses.find(a => a.agentId === agent.id);
                        const hasError = analysis?.error;
                        const hasResponse = analysis && !hasError && analysis.verdict !== 'UNKNOWN';
                        const isPositive = hasResponse && ['STRONG BET', 'SLIGHT EDGE'].includes(analysis.verdict);
                        const isNegative = hasResponse && ['RISKY', 'AVOID'].includes(analysis.verdict);

                        return (
                          <div
                            key={agent.id}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                              hasResponse ? (isPositive ? 'bg-green-900/40 text-green-400 border border-green-700/30' :
                                            isNegative ? 'bg-red-900/40 text-red-400 border border-red-700/30' :
                                            'bg-zinc-800 text-zinc-400 border border-zinc-700/30')
                              : 'bg-zinc-900/50 text-zinc-600 border border-zinc-800/30'
                            }`}
                            title={hasError ? `Error: ${analysis.error}` : hasResponse ? analysis.verdict : 'No response'}
                          >
                            <span>{agent.emoji}</span>
                            <span>{agent.name}</span>
                            {hasResponse && (
                              <span className="ml-1">
                                {isPositive ? '✓' : isNegative ? '✗' : '?'}
                              </span>
                            )}
                            {hasError && <span className="text-yellow-500">⚠</span>}
                            {!analysis && <span className="text-zinc-600">—</span>}
                          </div>
                        );
                      })}
                    </div>

                    {/* AI Opinions Grid - Premium Cards */}
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                      {swarmResult.analyses.filter(a => !a.error && a.verdict !== 'UNKNOWN').length > 0
                        ? swarmResult.analyses.filter(a => !a.error && a.verdict !== 'UNKNOWN').map(analysis => {
                          const agent = AI_AGENTS.find(a => a.id === analysis.agentId);
                        const isPositive = ['STRONG BET', 'SLIGHT EDGE'].includes(analysis.verdict);
                        return (
                          <div
                            key={analysis.agentId}
                            className="group relative"
                          >
                            {/* Gradient border on hover */}
                            <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-[1px] bg-gradient-to-b ${isPositive ? 'from-green-500/50 to-green-600/20' : 'from-red-500/30 to-red-600/10'}`} />
                            <div className={`relative bg-surface border border-zinc-800/50 rounded-2xl p-5 h-full group-hover:border-transparent transition-colors`}>
                              {/* AI Header */}
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl ${agent?.bg} border border-zinc-800/50 flex items-center justify-center text-xl`}>
                                    {analysis.emoji}
                                  </div>
                                  <span className={`font-semibold ${agent?.color}`}>{analysis.agentName}</span>
                                </div>
                                <div className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${getVerdictColor(analysis.verdict)}`}>
                                  {analysis.verdict}
                                </div>
                              </div>

                              {/* Edge & Probability Display */}
                              {(analysis.edge || analysis.probability) && (
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                  {analysis.probability && (
                                    <div className="bg-dark/50 rounded-lg p-2 text-center border border-zinc-800/30">
                                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide">True Prob</div>
                                      <div className="text-sm font-bold text-white">{analysis.probability}%</div>
                                    </div>
                                  )}
                                  {analysis.impliedProbability && (
                                    <div className="bg-dark/50 rounded-lg p-2 text-center border border-zinc-800/30">
                                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Implied</div>
                                      <div className="text-sm font-bold text-zinc-400">{analysis.impliedProbability}%</div>
                                    </div>
                                  )}
                                  {analysis.edge && (
                                    <div className={`rounded-lg p-2 text-center border ${
                                      analysis.edge >= 5 ? 'bg-green-900/30 border-green-700/30' :
                                      analysis.edge >= 3 ? 'bg-yellow-900/30 border-yellow-700/30' :
                                      analysis.edge > 0 ? 'bg-orange-900/30 border-orange-700/30' :
                                      'bg-red-900/30 border-red-700/30'
                                    }`}>
                                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Edge</div>
                                      <div className={`text-sm font-bold ${
                                        analysis.edge >= 5 ? 'text-green-400' :
                                        analysis.edge >= 3 ? 'text-yellow-400' :
                                        analysis.edge > 0 ? 'text-orange-400' :
                                        'text-red-400'
                                      }`}>
                                        {analysis.edge > 0 ? '+' : ''}{analysis.edge}%
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Bet Type & Selection - Enhanced */}
                              {analysis.betType && (
                                <div className="p-4 bg-dark/50 rounded-xl border border-zinc-800/30 mb-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="bg-teal-900/50 text-teal-300 px-2 py-0.5 rounded-lg text-xs font-medium">
                                      {analysis.betType}
                                    </span>
                                    {analysis.betOdds && (
                                      <span className="text-gold font-mono font-bold">
                                        @{analysis.betOdds.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                  {analysis.betSelection && (
                                    <div className="text-base font-semibold text-white">
                                      {analysis.betSelection}
                                    </div>
                                  )}
                                  {analysis.betExplanation && (
                                    <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                                      {analysis.betExplanation}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Opinion - Hidden by default, collapsed view */}
                              <details className="group/details">
                                <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors list-none flex items-center gap-1">
                                  <svg className="w-3 h-3 transition-transform group-open/details:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  Full Analysis
                                </summary>
                                <p className="text-sm text-zinc-500 leading-relaxed mt-2 pl-4 border-l border-zinc-800">{analysis.opinion}</p>
                              </details>
                            </div>
                          </div>
                        );
                      })
                        : (
                          <div className="col-span-full text-center py-8">
                            <div className="text-4xl mb-3">⚠️</div>
                            <div className="text-zinc-400 font-medium">No AI responses available</div>
                            <div className="text-zinc-600 text-sm mt-1">All models failed to respond or returned errors</div>
                          </div>
                        )
                      }
                    </div>
                  </div>
                ) : (
                  <div className="relative p-[1px] rounded-2xl bg-gradient-to-b from-teal-500/30 to-teal-600/10">
                    <div className="bg-surface rounded-2xl py-16 px-8 text-center">
                      <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-teal-500/10 rounded-full blur-2xl" />
                        <div className="relative text-6xl">🎯</div>
                      </div>
                      <div className="text-2xl font-bold text-white mb-3">Select an Event</div>
                      <div className="text-zinc-400 max-w-md mx-auto mb-6">
                        Browse upcoming matches and click "Ask 7 AIs" to get comprehensive AI analysis
                      </div>
                      <button
                        onClick={() => setActiveTab('events')}
                        className="text-dark px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-teal-900/30 hover:shadow-teal-500/30"
                        style={{ background: 'linear-gradient(180deg, #2DD4BF 0%, #14B8A6 100%)' }}
                      >
                        Browse Events →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Predictions */}
            {aiSubTab === 'predictions' && (
              <div className="space-y-6">
                {/* Filter Bar */}
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex gap-2">
                    {(['all', 'pending', 'won', 'lost'] as const).map(filter => (
                      <button
                        key={filter}
                        onClick={() => setPredictionFilter(filter)}
                        className={`px-4 py-2 rounded-xl font-medium capitalize transition-all ${
                          predictionFilter === filter
                            ? filter === 'won' ? 'bg-green-600 text-white' :
                              filter === 'lost' ? 'bg-red-600 text-white' :
                              filter === 'pending' ? 'bg-teal-600 text-white' :
                              'text-dark'
                            : 'bg-surface text-zinc-400 hover:bg-surface-light border border-zinc-800'
                        }`}
                        style={predictionFilter === filter && filter === 'all' ? { background: 'linear-gradient(180deg, #2DD4BF 0%, #14B8A6 100%)' } : {}}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                  <div className="text-sm text-zinc-500">Last 7 days</div>
                </div>

                {/* Stats Summary */}
                {predictionStats && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-surface border border-zinc-800/50 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold">{predictionStats.total}</div>
                      <div className="text-xs text-zinc-500">Total</div>
                    </div>
                    <div className="bg-surface border border-zinc-800/50 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-green-400">{predictionStats.won}</div>
                      <div className="text-xs text-zinc-500">Won</div>
                    </div>
                    <div className="bg-surface border border-zinc-800/50 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-red-400">{predictionStats.lost}</div>
                      <div className="text-xs text-zinc-500">Lost</div>
                    </div>
                    <div className="bg-surface border border-zinc-800/50 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-teal-400">{predictionStats.pending}</div>
                      <div className="text-xs text-zinc-500">Pending</div>
                    </div>
                    <div className="bg-surface border border-zinc-800/50 rounded-xl p-4 text-center">
                      <div className={`text-2xl font-bold ${parseFloat(predictionStats.winRate) >= 50 ? 'text-teal-400' : 'text-red-400'}`}>
                        {predictionStats.winRate}%
                      </div>
                      <div className="text-xs text-zinc-500">
                        Win Rate {predictionStats.currentStreak !== 0 && (
                          <span className="ml-1">
                            {predictionStats.currentStreak > 0 ? `🔥${predictionStats.currentStreak}` : `❄️${Math.abs(predictionStats.currentStreak)}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Predictions List */}
                {loadingPredictions ? (
                  <div className="text-center py-12 text-zinc-400">Loading predictions...</div>
                ) : predictions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔮</div>
                    <div className="text-xl font-semibold mb-2">No Predictions Yet</div>
                    <div className="text-zinc-400">Run swarm analysis on events to generate predictions</div>
                    <button
                      onClick={() => { setActiveTab('events'); }}
                      className="mt-4 text-dark px-6 py-2 rounded-xl font-medium transition-all"
                      style={{ background: 'linear-gradient(180deg, #2DD4BF 0%, #14B8A6 100%)' }}
                    >
                      Browse Events →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {predictions.map(prediction => (
                      <div
                        key={prediction.id}
                        className="bg-surface border border-zinc-800/50 rounded-xl overflow-hidden cursor-pointer hover:border-teal-700/50 transition-all"
                        onClick={() => setSelectedPrediction(prediction)}
                      >
                        {/* Header */}
                        <div className="p-4 flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                prediction.result === 'won' ? 'bg-green-600 text-white' :
                                prediction.result === 'lost' ? 'bg-red-600 text-white' :
                                'bg-teal-600 text-white'
                              }`}>
                                {prediction.result === 'won' ? '✓ WON' :
                                 prediction.result === 'lost' ? '✗ LOST' : '◯ PENDING'}
                              </span>
                              <span className="text-xs text-zinc-500">
                                {new Date(prediction.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="font-semibold text-lg">{prediction.eventName}</div>
                            <div className="text-sm text-zinc-400">
                              {prediction.sport} {prediction.league && `• ${prediction.league}`}
                            </div>
                          </div>
                        </div>

                        {/* Consensus */}
                        <div className={`px-4 py-3 ${getVerdictColor(prediction.consensusVerdict || '')}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm opacity-75">AI Consensus: </span>
                              <span className="font-bold">{prediction.consensusVerdict}</span>
                              <span className="ml-2 text-sm">({prediction.betVotes}/{prediction.betVotes + prediction.passVotes} AIs)</span>
                            </div>
                            {prediction.betSelection && (
                              <div className="text-right">
                                <span className="font-medium">{prediction.betSelection}</span>
                                {prediction.betOdds && (
                                  <span className="ml-2 text-gold font-mono">@{prediction.betOdds.toFixed(2)}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* AI Votes Summary */}
                        <div className="px-4 py-3 border-t border-zinc-800/50">
                          <div className="flex flex-wrap gap-2">
                            {(prediction.aiVotes || []).map((vote: any) => {
                              const agent = AI_AGENTS.find(a => a.id === vote.agentId);
                              const isBet = ['STRONG BET', 'SLIGHT EDGE'].includes(vote.verdict);
                              const wasCorrect = prediction.result === 'pending' ? null :
                                (prediction.result === 'won' && isBet) || (prediction.result === 'lost' && !isBet);

                              return (
                                <span
                                  key={vote.agentId}
                                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${agent?.bg} border border-zinc-800/50`}
                                >
                                  <span>{agent?.emoji}</span>
                                  <span className={agent?.color}>{agent?.name}</span>
                                  {prediction.result !== 'pending' && (
                                    <span className={wasCorrect ? 'text-green-400' : 'text-red-400'}>
                                      {wasCorrect ? '✓' : '✗'}
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Prediction Detail Modal */}
            {selectedPrediction && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedPrediction(null)}>
                <div className="bg-surface border border-zinc-800/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  {/* Modal Header */}
                  <div className="p-6 border-b border-zinc-800/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            selectedPrediction.result === 'won' ? 'bg-green-600 text-white' :
                            selectedPrediction.result === 'lost' ? 'bg-red-600 text-white' :
                            'bg-teal-600 text-white'
                          }`}>
                            {selectedPrediction.result.toUpperCase()}
                          </span>
                          {selectedPrediction.actualScore && (
                            <span className="text-sm text-zinc-400">Final: {selectedPrediction.actualScore}</span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold">{selectedPrediction.eventName}</h3>
                        <p className="text-sm text-zinc-400">
                          {selectedPrediction.sport} {selectedPrediction.league && `• ${selectedPrediction.league}`}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Predicted: {new Date(selectedPrediction.createdAt).toLocaleString()}
                          {selectedPrediction.settledAt && ` • Settled: ${new Date(selectedPrediction.settledAt).toLocaleString()}`}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedPrediction(null)}
                        className="text-zinc-400 hover:text-white text-2xl transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Consensus */}
                  <div className={`p-4 ${getVerdictColor(selectedPrediction.consensusVerdict || '')}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm opacity-75">AI Consensus</div>
                        <div className="text-2xl font-bold">{selectedPrediction.consensusVerdict}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">{selectedPrediction.consensusScore?.toFixed(1)}</div>
                        <div className="text-sm opacity-75">Score</div>
                      </div>
                    </div>
                    {selectedPrediction.betSelection && (
                      <div className="mt-3 p-2 bg-black/20 rounded-lg">
                        <span className="text-sm">Recommended: </span>
                        <span className="font-medium">{selectedPrediction.betSelection}</span>
                        {selectedPrediction.betOdds && (
                          <span className="ml-2 text-gold font-mono">@{selectedPrediction.betOdds.toFixed(2)}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Individual AI Votes */}
                  <div className="p-4">
                    <h4 className="text-sm font-semibold text-zinc-400 mb-3">INDIVIDUAL AI VOTES</h4>
                    <div className="space-y-3">
                      {(selectedPrediction.aiVotes || []).map((vote: any) => {
                        const agent = AI_AGENTS.find(a => a.id === vote.agentId);
                        const isBet = ['STRONG BET', 'SLIGHT EDGE'].includes(vote.verdict);
                        const wasCorrect = selectedPrediction.result === 'pending' ? null :
                          (selectedPrediction.result === 'won' && isBet) || (selectedPrediction.result === 'lost' && !isBet);

                        return (
                          <div key={vote.agentId} className={`p-3 rounded-xl border ${agent?.bg} border-zinc-800/50`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{agent?.emoji}</span>
                                <span className={`font-semibold ${agent?.color}`}>{agent?.name}</span>
                                {selectedPrediction.result !== 'pending' && (
                                  <span className={`text-sm ${wasCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                    {wasCorrect ? '✓ Correct' : '✗ Wrong'}
                                  </span>
                                )}
                              </div>
                              <span className={`px-2 py-1 rounded text-sm ${getVerdictColor(vote.verdict)}`}>
                                {vote.verdict}
                              </span>
                            </div>
                            {vote.betType && (
                              <div className="text-sm mb-1">
                                <span className="bg-teal-900/50 text-teal-300 px-1.5 py-0.5 rounded text-xs mr-2">
                                  {vote.betType}
                                </span>
                                {vote.betSelection && <span>{vote.betSelection}</span>}
                                {vote.betOdds && <span className="text-gold ml-1">@{vote.betOdds.toFixed(2)}</span>}
                              </div>
                            )}
                            {vote.betExplanation && (
                              <p className="text-xs text-zinc-400 italic">{vote.betExplanation}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Performance - Competition */}
            {aiSubTab === 'performance' && (
              <div className="space-y-6">
                {loadingCompetition ? (
                  <div className="text-center py-12 text-zinc-400">Loading competition data...</div>
                ) : aiCompetition ? (
                  <>
                    {/* Competition Header */}
                    <div className="relative overflow-hidden rounded-2xl">
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-900/50 via-teal-800/30 to-teal-900/50" />
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiMxNGI4YTYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />
                      <div className="relative p-6 md:p-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-4xl">🏆</span>
                              <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-white">AI Sharp Showdown</h2>
                                <p className="text-teal-400 font-medium">Season 1 • 1-Week Competition</p>
                              </div>
                            </div>
                            <p className="text-zinc-400 text-sm mt-2">
                              Dec 4 - Dec 11, 2025 • Which AI model is the sharpest bettor?
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center px-4 py-2 bg-dark/50 rounded-xl border border-teal-700/30">
                              <div className="text-2xl font-bold text-teal-400">Day {Math.min(7, Math.max(0, 7 - (aiCompetition.competition?.daysRemaining || 0)))}</div>
                              <div className="text-xs text-zinc-500">of 7</div>
                            </div>
                            <div className="text-center px-4 py-2 bg-dark/50 rounded-xl border border-teal-700/30">
                              <div className="text-2xl font-bold text-gold">{aiCompetition.competition?.daysRemaining || 0}</div>
                              <div className="text-xs text-zinc-500">days left</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Competition Stats */}
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="bg-surface border border-zinc-800/50 rounded-xl p-5">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total Predictions</div>
                        <div className="text-3xl font-bold text-white">{aiCompetition.summary?.settledPredictions || 0}</div>
                        <div className="text-sm text-zinc-400 mt-1">
                          {aiCompetition.summary?.pendingPredictions || 0} pending
                        </div>
                      </div>
                      <div className="bg-surface border border-zinc-800/50 rounded-xl p-5">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Overall Win Rate</div>
                        <div className={`text-3xl font-bold ${(aiCompetition.summary?.overallWinRate || 0) >= 55 ? 'text-teal-400' : (aiCompetition.summary?.overallWinRate || 0) >= 50 ? 'text-gold' : 'text-red-400'}`}>
                          {aiCompetition.summary?.overallWinRate?.toFixed(1) || '0.0'}%
                        </div>
                        <div className="text-sm text-zinc-400 mt-1">Combined AI accuracy</div>
                      </div>
                      <div className="bg-surface border border-zinc-800/50 rounded-xl p-5">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Current Leader</div>
                        {aiCompetition.leaderboard?.[0] ? (
                          <>
                            <div className="text-xl font-bold text-white flex items-center gap-2">
                              <span>{aiCompetition.leaderboard[0].emoji}</span>
                              <span>{aiCompetition.leaderboard[0].agentName}</span>
                            </div>
                            <div className="text-sm text-teal-400 mt-1">{aiCompetition.leaderboard[0].winRate?.toFixed(1)}% win rate</div>
                          </>
                        ) : (
                          <div className="text-xl font-bold text-zinc-500">TBD</div>
                        )}
                      </div>
                      <div className="bg-surface border border-zinc-800/50 rounded-xl p-5">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Hottest Streak</div>
                        {(() => {
                          const hottest = aiCompetition.leaderboard?.reduce((best: any, a: any) =>
                            (a.currentStreak > (best?.currentStreak || 0)) ? a : best, null);
                          return hottest ? (
                            <>
                              <div className="text-xl font-bold text-white flex items-center gap-2">
                                <span>{hottest.emoji}</span>
                                <span className="text-teal-400">🔥 {hottest.currentStreak}</span>
                              </div>
                              <div className="text-sm text-zinc-400 mt-1">{hottest.agentName}</div>
                            </>
                          ) : (
                            <div className="text-xl font-bold text-zinc-500">—</div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Leaderboard */}
                    <div className="bg-surface border border-zinc-800/50 rounded-2xl overflow-hidden">
                      <div className="px-5 py-4 border-b border-zinc-800/50 bg-gradient-to-r from-gold/10 to-teal-900/10">
                        <h3 className="font-semibold text-gold flex items-center gap-2">
                          <span>🏅</span> Competition Leaderboard
                        </h3>
                        <p className="text-sm text-zinc-500">Ranked by win rate • Based on settled predictions only</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-zinc-900/50">
                            <tr>
                              <th className="px-5 py-3 text-left text-xs text-zinc-500 uppercase tracking-wider">#</th>
                              <th className="px-5 py-3 text-left text-xs text-zinc-500 uppercase tracking-wider">Model</th>
                              <th className="px-5 py-3 text-center text-xs text-zinc-500 uppercase tracking-wider">Record</th>
                              <th className="px-5 py-3 text-center text-xs text-zinc-500 uppercase tracking-wider">Win %</th>
                              <th className="px-5 py-3 text-center text-xs text-zinc-500 uppercase tracking-wider">Streak</th>
                              <th className="px-5 py-3 text-center text-xs text-zinc-500 uppercase tracking-wider">Units</th>
                              <th className="px-5 py-3 text-right text-xs text-zinc-500 uppercase tracking-wider">ROI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/30">
                            {(aiCompetition.leaderboard || []).map((agent: any, i: number) => {
                              const agentStyle = AI_AGENTS.find(a => a.id === agent.agentId);
                              return (
                                <tr key={agent.agentId} className={`hover:bg-teal-900/10 transition-colors ${i === 0 ? 'bg-gold/5' : ''}`}>
                                  <td className="px-5 py-4">
                                    <span className={`text-lg font-bold ${i === 0 ? 'text-gold' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-amber-700' : 'text-zinc-500'}`}>
                                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                      <span className="text-2xl">{agent.emoji}</span>
                                      <span className={`font-medium ${agentStyle?.color || 'text-white'}`}>{agent.agentName}</span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 text-center">
                                    <span className="text-green-400 font-medium">{agent.wins}</span>
                                    <span className="text-zinc-500">-</span>
                                    <span className="text-red-400 font-medium">{agent.losses}</span>
                                    {agent.pushes > 0 && (
                                      <span className="text-zinc-500">-{agent.pushes}</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-4 text-center">
                                    <span className={`font-bold ${agent.winRate >= 55 ? 'text-teal-400' : agent.winRate >= 50 ? 'text-gold' : 'text-red-400'}`}>
                                      {agent.winRate?.toFixed(1)}%
                                    </span>
                                  </td>
                                  <td className="px-5 py-4 text-center">
                                    <span className={`font-medium ${agent.currentStreak > 0 ? 'text-teal-400' : agent.currentStreak < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                                      {agent.currentStreak > 0 ? `🔥${agent.currentStreak}` : agent.currentStreak < 0 ? `❄️${Math.abs(agent.currentStreak)}` : '—'}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4 text-center">
                                    <span className={`font-medium ${agent.units >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                                      {agent.units >= 0 ? '+' : ''}{agent.units?.toFixed(1) || '0.0'}u
                                    </span>
                                  </td>
                                  <td className="px-5 py-4 text-right">
                                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                                      agent.roi >= 10 ? 'bg-teal-900/40 text-teal-400' :
                                      agent.roi >= 0 ? 'bg-zinc-800 text-zinc-300' :
                                      'bg-red-900/30 text-red-400'
                                    }`}>
                                      {agent.roi >= 0 ? '+' : ''}{agent.roi?.toFixed(1) || '0.0'}%
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Weekly Breakdown (if data exists) */}
                    {aiCompetition.leaderboard?.[0]?.weeklyPerformance?.length > 0 && (
                      <div className="bg-surface border border-zinc-800/50 rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-zinc-800/50">
                          <h3 className="font-semibold text-white">Weekly Performance</h3>
                          <p className="text-sm text-zinc-500">Win rates by competition week</p>
                        </div>
                        <div className="p-5">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr>
                                  <th className="text-left text-zinc-500 pb-3">Model</th>
                                  {aiCompetition.leaderboard[0].weeklyPerformance.map((w: any, i: number) => (
                                    <th key={i} className={`text-center text-zinc-500 pb-3 ${i + 1 === aiCompetition.competition?.currentWeek ? 'text-teal-400' : ''}`}>
                                      W{i + 1}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {aiCompetition.leaderboard.slice(0, 5).map((agent: any) => (
                                  <tr key={agent.agentId} className="border-t border-zinc-800/30">
                                    <td className="py-2">
                                      <span className="flex items-center gap-2">
                                        <span>{agent.emoji}</span>
                                        <span className="text-zinc-300">{agent.agentName}</span>
                                      </span>
                                    </td>
                                    {agent.weeklyPerformance.map((week: any, i: number) => (
                                      <td key={i} className="text-center py-2">
                                        {week.wins + week.losses > 0 ? (
                                          <span className={`${week.winRate >= 55 ? 'text-teal-400' : week.winRate >= 50 ? 'text-zinc-300' : 'text-red-400'}`}>
                                            {week.winRate.toFixed(0)}%
                                          </span>
                                        ) : (
                                          <span className="text-zinc-600">—</span>
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Competition Rules */}
                    <div className="bg-surface border border-zinc-800/50 rounded-xl p-5">
                      <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                        <span>📋</span> Competition Rules
                      </h4>
                      <ul className="text-sm text-zinc-500 leading-relaxed space-y-2">
                        <li>• Each AI model votes on every analyzed match with BET or PASS recommendation</li>
                        <li>• A &quot;win&quot; is counted when the AI&apos;s recommendation would have been profitable</li>
                        <li>• BET recommendations that hit = Win | BET recommendations that miss = Loss</li>
                        <li>• PASS on losing bets = Win (saved money) | PASS on winning bets = Loss (missed opportunity)</li>
                        <li>• Rankings are based on win rate with settled predictions only</li>
                        <li>• Competition runs 1 week from December 4th to December 11th, 2025</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🏆</div>
                    <div className="text-xl font-semibold mb-2">AI Sharp Showdown</div>
                    <div className="text-zinc-400">Competition: Dec 4 - Dec 11, 2025</div>
                    <div className="text-sm text-zinc-500 mt-2">7 AI models compete to see who&apos;s the sharpest bettor</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* BETS TAB */}
        {activeTab === 'bets' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-900/30 to-teal-800/20 border border-teal-700/30 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-teal-400">Bet Analysis Center</h2>
              <p className="text-zinc-400 mt-1">Track, analyze, and improve your betting performance</p>
            </div>

            {/* Stats */}
            {userStats && (
              <div className="grid gap-4 md:grid-cols-5">
                <div className="bg-surface border border-zinc-800/50 rounded-xl p-4 text-center">
                  <div className="text-sm text-zinc-400">Record</div>
                  <div className="text-2xl font-bold">{userStats.wins}-{userStats.losses}</div>
                </div>
                <div className="bg-surface border border-zinc-800/50 rounded-xl p-4 text-center">
                  <div className="text-sm text-zinc-400">Win Rate</div>
                  <div className={`text-2xl font-bold ${userStats.winRate >= 55 ? 'text-teal-400' : userStats.winRate >= 50 ? 'text-gold' : 'text-red-400'}`}>
                    {userStats.winRate?.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-surface border border-zinc-800/50 rounded-xl p-4 text-center">
                  <div className="text-sm text-zinc-400">ROI</div>
                  <div className={`text-2xl font-bold ${userStats.roi >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                    {userStats.roi >= 0 ? '+' : ''}{userStats.roi?.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-surface border border-zinc-800/50 rounded-xl p-4 text-center">
                  <div className="text-sm text-zinc-400">Profit/Loss</div>
                  <div className={`text-2xl font-bold ${userStats.totalProfit >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                    ${Math.abs(userStats.totalProfit)?.toFixed(2)}
                  </div>
                </div>
                <div className="bg-surface border border-zinc-800/50 rounded-xl p-4 text-center">
                  <div className="text-sm text-zinc-400">Streak</div>
                  <div className="text-2xl font-bold">
                    {userStats.currentStreak > 0 ? '🔥' : userStats.currentStreak < 0 ? '❄️' : '➖'}
                    {Math.abs(userStats.currentStreak || 0)}
                  </div>
                </div>
              </div>
            )}

            {/* Bet History */}
            <div className="bg-surface border border-zinc-800/50 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800/50">
                <h3 className="font-semibold">Recent Bets</h3>
              </div>
              {loadingBets ? (
                <div className="p-8 text-center text-zinc-400">Loading...</div>
              ) : bets.length === 0 ? (
                <div className="p-8 text-center text-zinc-400">No bets yet. Start tracking!</div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {bets.slice(0, 10).map(bet => (
                    <div key={bet.id} className="p-4 flex items-center justify-between hover:bg-teal-900/10 transition-colors">
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
                              className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded-lg text-sm transition-colors"
                            >
                              Won
                            </button>
                            <button
                              onClick={() => settleBet(bet.id, 'lost')}
                              className="bg-red-600 hover:bg-red-500 px-3 py-1 rounded-lg text-sm transition-colors"
                            >
                              Lost
                            </button>
                          </>
                        ) : (
                          <span className={`px-3 py-1 rounded-lg text-sm ${
                            bet.result === 'won' ? 'bg-green-900/50 text-green-400' :
                            bet.result === 'lost' ? 'bg-red-900/50 text-red-400' :
                            'bg-zinc-800/30 text-zinc-400'
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
            <div className="bg-gradient-to-r from-teal-900/30 to-teal-800/20 border border-teal-700/30 rounded-2xl p-6">
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
            <div className="bg-surface border border-zinc-800/50 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800/50 bg-gradient-to-r from-gold/10 to-teal-900/10">
                <h3 className="font-semibold text-gold">Global Leaderboard</h3>
              </div>

              {leaderboard.length === 0 ? (
                <div className="p-8 text-center text-zinc-400">
                  No ranked players yet. Get 10+ bets to appear on the leaderboard!
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-teal-900/30">
                    <tr>
                      <th className="px-4 py-3 text-left text-zinc-300">Rank</th>
                      <th className="px-4 py-3 text-left text-zinc-300">Player</th>
                      <th className="px-4 py-3 text-right text-zinc-300">Record</th>
                      <th className="px-4 py-3 text-right text-zinc-300">Win %</th>
                      <th className="px-4 py-3 text-right text-zinc-300">ROI</th>
                      <th className="px-4 py-3 text-right text-zinc-300">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((player, i) => (
                      <tr
                        key={player.userId}
                        className={`border-t border-zinc-800/50 ${
                          i < 3 ? 'bg-gold/5' : ''
                        } ${player.userId === (session.user as any)?.id ? 'bg-teal-900/30' : ''} hover:bg-teal-900/10 transition-colors`}
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
                          player.winRate >= 55 ? 'text-teal-400' :
                          player.winRate >= 50 ? 'text-gold' : 'text-red-400'
                        }`}>
                          {player.winRate?.toFixed(1)}%
                        </td>
                        <td className={`px-4 py-3 text-right ${
                          player.roi >= 0 ? 'text-teal-400' : 'text-red-400'
                        }`}>
                          {player.roi >= 0 ? '+' : ''}{player.roi?.toFixed(1)}%
                        </td>
                        <td className={`px-4 py-3 text-right ${
                          player.totalProfit >= 0 ? 'text-teal-400' : 'text-red-400'
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
            <div className="bg-surface border border-zinc-800/50 rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Tier Progress</h3>
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
                  className="h-full bg-gradient-to-r from-teal-500 to-teal-400"
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
      <footer className="mt-12 py-8 border-t border-zinc-800/50 text-center">
        <p className="text-teal-400 font-semibold tracking-tight">PAYOUT ACADEMY</p>
        <p className="text-zinc-500 text-xs mt-1">Analytics • For Entertainment Only • Gamble Responsibly</p>
      </footer>
    </div>
  );
}
