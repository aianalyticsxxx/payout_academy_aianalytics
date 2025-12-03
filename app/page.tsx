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

interface ParlayLeg {
  id: string;
  eventId?: string;
  sport: string;
  league?: string;
  matchup: string;
  betType: string;
  selection: string;
  odds: string;
  oddsDecimal: number;
  result: string;
}

interface Parlay {
  id: string;
  stake: number;
  totalOdds: number;
  result: string;
  profitLoss?: number;
  legs: ParlayLeg[];
  createdAt: string;
  settledAt?: string;
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
  const [activeTab, setActiveTab] = useState<'events' | 'ai' | 'bets' | 'rewards' | 'competition'>('events');
  const [claimedRewards, setClaimedRewards] = useState<number[]>([]);
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [rewardToClaim, setRewardToClaim] = useState<number | null>(null);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(50);
  const [totalEarnings, setTotalEarnings] = useState<number>(0); // Track total earned from rewards
  const [selectedAccountSize, setSelectedAccountSize] = useState<number>(1000); // Account size selection
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

  // Bet placement modal state
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [betStake, setBetStake] = useState<number>(10);
  const [placingBet, setPlacingBet] = useState(false);
  const [betSuccess, setBetSuccess] = useState(false);
  const [betsSubTab, setBetsSubTab] = useState<'active' | 'history'>('active');

  // Event AI analysis cache (for showing verdict on event cards)
  const [eventAnalysisCache, setEventAnalysisCache] = useState<Record<string, SwarmResult>>({});
  const [loadingEventAnalysis, setLoadingEventAnalysis] = useState<Record<string, boolean>>({});

  // Quick bet from odds click
  const [quickBetEvent, setQuickBetEvent] = useState<SportEvent | null>(null);
  const [quickBetSelection, setQuickBetSelection] = useState<{ type: string; name: string; odds: number } | null>(null);

  // Parlay builder state
  const [parlayLegs, setParlayLegs] = useState<Array<{
    eventId: string;
    sport: string;
    league?: string;
    matchup: string;
    betType: string;
    selection: string;
    odds: string;
    oddsDecimal: number;
  }>>([]);
  const [parlayModalOpen, setParlayModalOpen] = useState(false);
  const [parlayStake, setParlayStake] = useState<number>(10);
  const [placingParlay, setPlacingParlay] = useState(false);
  const [parlaySuccess, setParlaySuccess] = useState(false);
  const [parlays, setParlays] = useState<Parlay[]>([]);

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

  // Fetch bets and parlays on mount
  useEffect(() => {
    if (session) {
      fetchBets();
      fetchParlays();
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

  // Fetch AI analysis for event card preview (doesn't switch tabs)
  const fetchEventAnalysis = async (event: SportEvent) => {
    if (eventAnalysisCache[event.id] || loadingEventAnalysis[event.id]) return;

    setLoadingEventAnalysis(prev => ({ ...prev, [event.id]: true }));
    try {
      const res = await fetch('/api/ai/swarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      });
      const data = await res.json();
      setEventAnalysisCache(prev => ({ ...prev, [event.id]: data }));
    } catch (error) {
      console.error('Event analysis failed:', error);
    } finally {
      setLoadingEventAnalysis(prev => ({ ...prev, [event.id]: false }));
    }
  };

  // Open bet modal for a specific event with its analysis
  const openBetModalForEvent = (event: SportEvent) => {
    const cachedResult = eventAnalysisCache[event.id];
    if (cachedResult) {
      setSelectedEvent(event);
      setSwarmResult(cachedResult);
      setBetModalOpen(true);
    }
  };

  // View full AI analysis for an event
  const viewEventAnalysis = (event: SportEvent) => {
    const cachedResult = eventAnalysisCache[event.id];
    if (cachedResult) {
      setSelectedEvent(event);
      setSwarmResult(cachedResult);
      setActiveTab('ai');
      setAiSubTab('swarm');
    }
  };

  // Open quick bet modal from odds click
  const openQuickBet = (event: SportEvent, selectionType: 'home' | 'draw' | 'away', selectionName: string, odds: number) => {
    if (!session) return; // Must be logged in
    setQuickBetEvent(event);
    setQuickBetSelection({ type: selectionType, name: selectionName, odds });
    setBetStake(10);
    setBetModalOpen(true);
  };

  // Handle quick bet placement (from odds click)
  const handleQuickBetPlace = async () => {
    if (!quickBetEvent || !quickBetSelection) return;

    setPlacingBet(true);
    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: quickBetEvent.id,
          sport: quickBetEvent.sportTitle,
          league: quickBetEvent.league || selectedLeague.name,
          matchup: `${quickBetEvent.awayTeam} @ ${quickBetEvent.homeTeam}`,
          betType: '1X2',
          selection: quickBetSelection.name,
          odds: quickBetSelection.odds.toFixed(2),
          stake: betStake,
          aiConsensus: 'MANUAL',
          aiScore: '0',
        }),
      });

      if (res.ok) {
        setBetSuccess(true);
        fetchBets();
        fetchUserStats();
        setTimeout(() => {
          setBetModalOpen(false);
          setBetSuccess(false);
          setQuickBetEvent(null);
          setQuickBetSelection(null);
          setBetStake(10);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to place bet:', error);
    } finally {
      setPlacingBet(false);
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

  // Parlay functions
  const addToParlay = (event: SportEvent, selection: { type: string; name: string; odds: number }) => {
    // Check if this event is already in the parlay
    const exists = parlayLegs.some(leg => leg.eventId === event.id);
    if (exists) {
      // Remove it (toggle behavior)
      setParlayLegs(parlayLegs.filter(leg => leg.eventId !== event.id));
    } else {
      // Add it
      setParlayLegs([...parlayLegs, {
        eventId: event.id,
        sport: event.sportTitle,
        league: event.league || selectedLeague.name,
        matchup: `${event.awayTeam} @ ${event.homeTeam}`,
        betType: selection.type === 'draw' ? 'Draw' : '1X2',
        selection: selection.name,
        odds: selection.odds.toFixed(2),
        oddsDecimal: selection.odds,
      }]);
    }
  };

  const removeFromParlay = (eventId: string) => {
    setParlayLegs(parlayLegs.filter(leg => leg.eventId !== eventId));
  };

  const calculateParlayOdds = () => {
    return parlayLegs.reduce((acc, leg) => acc * leg.oddsDecimal, 1);
  };

  const fetchParlays = async () => {
    try {
      const res = await fetch('/api/parlays');
      const data = await res.json();
      setParlays(data.parlays || []);
    } catch (error) {
      console.error('Failed to fetch parlays:', error);
    }
  };

  const handlePlaceParlay = async () => {
    if (parlayLegs.length < 2) return;

    setPlacingParlay(true);
    try {
      const res = await fetch('/api/parlays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stake: parlayStake,
          legs: parlayLegs,
        }),
      });

      if (res.ok) {
        setParlaySuccess(true);
        fetchParlays();
        fetchUserStats();
        setTimeout(() => {
          setParlayModalOpen(false);
          setParlaySuccess(false);
          setParlayLegs([]);
          setParlayStake(10);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to place parlay:', error);
    } finally {
      setPlacingParlay(false);
    }
  };

  const settleParlay = async (parlayId: string, result: 'won' | 'lost' | 'push') => {
    try {
      await fetch('/api/parlays', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parlayId, result }),
      });
      fetchParlays();
      fetchUserStats();
    } catch (error) {
      console.error('Failed to settle parlay:', error);
    }
  };

  const handlePlaceBet = async () => {
    if (!selectedEvent || !swarmResult) return;

    // Get the recommended bet selection from swarm result
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
      : 1.91; // Default odds

    setPlacingBet(true);
    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          sport: selectedEvent.sportTitle,
          league: selectedEvent.league || selectedLeague.name,
          matchup: `${selectedEvent.awayTeam} @ ${selectedEvent.homeTeam}`,
          betType: topBetType?.[0] || '1X2',
          selection: topSelection?.[0] || 'Unknown',
          odds: avgOdds.toFixed(2),
          stake: betStake,
          aiConsensus: swarmResult.consensus.verdict,
          aiScore: swarmResult.consensus.score,
        }),
      });

      if (res.ok) {
        setBetSuccess(true);
        fetchBets();
        fetchUserStats();
        // Auto close modal after 2 seconds
        setTimeout(() => {
          setBetModalOpen(false);
          setBetSuccess(false);
          setBetStake(10);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to place bet:', error);
    } finally {
      setPlacingBet(false);
    }
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'STRONG BET': return 'text-emerald-400 bg-emerald-950/60';
      case 'SLIGHT EDGE': return 'text-amber-400 bg-amber-950/40';
      case 'RISKY': return 'text-orange-400 bg-zinc-900/60';
      case 'AVOID': return 'text-red-400 bg-red-950/40';
      default: return 'text-zinc-400 bg-zinc-900/40';
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
            { id: 'rewards', label: 'Rewards', icon: '🎁' },
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
                              <button
                                onClick={() => session && event.bestOdds.home?.price && openQuickBet(event, 'home', event.homeTeam, event.bestOdds.home.price)}
                                disabled={!session || !event.bestOdds.home?.price}
                                className={`bg-zinc-800/50 backdrop-blur rounded-xl p-3 text-center border border-zinc-700/50 transition-all ${
                                  session && event.bestOdds.home?.price
                                    ? 'hover:border-teal-500 hover:bg-teal-900/20 cursor-pointer hover:scale-105'
                                    : 'cursor-default'
                                }`}
                                title={session ? `Bet on ${event.homeTeam}` : 'Sign in to place bets'}
                              >
                                <div className="text-[10px] text-zinc-500 font-medium mb-1 truncate" title={event.homeTeam}>
                                  {event.homeTeam.length > 12 ? event.homeTeam.slice(0, 10) + '...' : event.homeTeam}
                                </div>
                                <div className="text-lg font-bold text-teal-400">
                                  {event.bestOdds.home?.price?.toFixed(2)}
                                </div>
                              </button>
                              {event.bestOdds.draw?.price > 0 ? (
                                <button
                                  onClick={() => session && event.bestOdds.draw?.price && openQuickBet(event, 'draw', 'Draw', event.bestOdds.draw.price)}
                                  disabled={!session || !event.bestOdds.draw?.price}
                                  className={`bg-zinc-800/50 backdrop-blur rounded-xl p-3 text-center border border-zinc-700/50 transition-all ${
                                    session && event.bestOdds.draw?.price
                                      ? 'hover:border-teal-500 hover:bg-teal-900/20 cursor-pointer hover:scale-105'
                                      : 'cursor-default'
                                  }`}
                                  title={session ? 'Bet on Draw' : 'Sign in to place bets'}
                                >
                                  <div className="text-[10px] text-zinc-500 font-medium mb-1">DRAW</div>
                                  <div className="text-lg font-bold text-teal-400">
                                    {event.bestOdds.draw?.price?.toFixed(2)}
                                  </div>
                                </button>
                              ) : (
                                <div className="bg-zinc-900/50 rounded-xl p-3 text-center border border-zinc-800/30">
                                  <div className="text-[10px] text-zinc-600 font-medium mb-1">—</div>
                                  <div className="text-lg font-bold text-zinc-700">—</div>
                                </div>
                              )}
                              <button
                                onClick={() => session && event.bestOdds.away?.price && openQuickBet(event, 'away', event.awayTeam, event.bestOdds.away.price)}
                                disabled={!session || !event.bestOdds.away?.price}
                                className={`bg-zinc-800/50 backdrop-blur rounded-xl p-3 text-center border border-zinc-700/50 transition-all ${
                                  session && event.bestOdds.away?.price
                                    ? 'hover:border-teal-500 hover:bg-teal-900/20 cursor-pointer hover:scale-105'
                                    : 'cursor-default'
                                }`}
                                title={session ? `Bet on ${event.awayTeam}` : 'Sign in to place bets'}
                              >
                                <div className="text-[10px] text-zinc-500 font-medium mb-1 truncate" title={event.awayTeam}>
                                  {event.awayTeam.length > 12 ? event.awayTeam.slice(0, 10) + '...' : event.awayTeam}
                                </div>
                                <div className="text-lg font-bold text-teal-400">
                                  {event.bestOdds.away?.price?.toFixed(2)}
                                </div>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* AI Verdict & Actions */}
                        {(() => {
                          const cachedAnalysis = eventAnalysisCache[event.id];
                          const isLoading = loadingEventAnalysis[event.id];

                          if (cachedAnalysis) {
                            // Show AI verdict with clickable card and Place Bet button
                            const verdict = cachedAnalysis.consensus.verdict;
                            const isBettable = ['STRONG BET', 'SLIGHT EDGE'].includes(verdict);

                            // Get top selection info
                            const selections: Record<string, { count: number; odds: number[] }> = {};
                            cachedAnalysis.analyses.forEach(a => {
                              if (a.betSelection) {
                                if (!selections[a.betSelection]) {
                                  selections[a.betSelection] = { count: 0, odds: [] };
                                }
                                selections[a.betSelection].count++;
                                if (a.betOdds) selections[a.betSelection].odds.push(a.betOdds);
                              }
                            });
                            const topSelection = Object.entries(selections).sort((a, b) => b[1].count - a[1].count)[0];
                            const avgOdds = topSelection?.[1].odds.length
                              ? topSelection[1].odds.reduce((a, b) => a + b, 0) / topSelection[1].odds.length
                              : null;

                            return (
                              <div className="space-y-3">
                                {/* AI Verdict Card - Clickable */}
                                <button
                                  onClick={() => viewEventAnalysis(event)}
                                  className={`w-full p-3 rounded-xl border transition-all text-left group/verdict ${
                                    verdict === 'STRONG BET' ? 'bg-emerald-950/50 border-emerald-700/50 hover:border-emerald-500/70' :
                                    verdict === 'SLIGHT EDGE' ? 'bg-amber-950/30 border-amber-700/40 hover:border-amber-500/60' :
                                    verdict === 'RISKY' ? 'bg-orange-950/30 border-orange-700/40 hover:border-orange-500/60' :
                                    'bg-red-950/30 border-red-700/40 hover:border-red-500/60'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">🤖</span>
                                      <span className="text-xs text-zinc-400 font-medium">AI CONSENSUS</span>
                                    </div>
                                    <svg className="w-4 h-4 text-zinc-500 group-hover/verdict:text-white group-hover/verdict:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className={`text-lg font-bold ${
                                      verdict === 'STRONG BET' ? 'text-emerald-400' :
                                      verdict === 'SLIGHT EDGE' ? 'text-amber-400' :
                                      verdict === 'RISKY' ? 'text-orange-400' : 'text-red-400'
                                    }`}>
                                      {verdict}
                                    </span>
                                    {topSelection && avgOdds && (
                                      <div className="text-right">
                                        <div className="text-xs text-zinc-500">{topSelection[0]}</div>
                                        <div className="text-sm font-mono font-bold text-teal-400">@{avgOdds.toFixed(2)}</div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs text-zinc-500 mt-1">
                                    {cachedAnalysis.consensus.betVotes}/{cachedAnalysis.consensus.betVotes + cachedAnalysis.consensus.passVotes} AIs recommend betting
                                  </div>
                                </button>

                                {/* Place Bet Button - Only for bettable verdicts */}
                                {isBettable && session && (
                                  <button
                                    onClick={() => openBetModalForEvent(event)}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
                                  >
                                    <span>Place Bet</span>
                                    {avgOdds && <span className="text-emerald-200 text-sm">@{avgOdds.toFixed(2)}</span>}
                                  </button>
                                )}
                              </div>
                            );
                          }

                          // Show Get AI Analysis button (initial state or loading)
                          return (
                            <button
                              onClick={() => fetchEventAnalysis(event)}
                              disabled={isLoading}
                              className="w-full text-dark font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-teal-900/30 hover:shadow-teal-500/30 flex items-center justify-center gap-2 group/btn disabled:opacity-70"
                              style={{ background: 'linear-gradient(180deg, #2DD4BF 0%, #14B8A6 100%)' }}
                            >
                              {isLoading ? (
                                <span className="flex items-center gap-2">
                                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  <span>Analyzing...</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-2">
                                  <span className="text-lg">🤖</span>
                                  <span>Get AI Analysis</span>
                                  <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                  </svg>
                                </span>
                              )}
                            </button>
                          );
                        })()}
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

                    {/* Consensus Card - Premium Emerald Design */}
                    <div className="relative rounded-2xl overflow-hidden border border-emerald-900/30 bg-gradient-to-b from-emerald-950/40 to-zinc-950/80">
                      {/* Subtle glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

                      <div className="relative">
                        {/* Header with Verdict - Clean Modern */}
                        <div className={`p-6 border-b border-emerald-900/20 ${getVerdictColor(swarmResult.consensus.verdict)}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-[10px] font-semibold text-emerald-500/80 uppercase tracking-[0.2em] mb-1">AI Consensus</div>
                              <div className="text-3xl font-bold tracking-tight">{swarmResult.consensus.verdict}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-4xl font-bold font-mono">{swarmResult.consensus.score}</div>
                              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.2em] mt-1">Score</div>
                            </div>
                          </div>
                        </div>

                        {/* Stats Grid - Modern Clean */}
                        {(() => {
                          // Calculate average edge from analyses
                          const edges = swarmResult.analyses.filter(a => a.edge != null).map(a => a.edge!);
                          const avgEdge = edges.length > 0 ? edges.reduce((a, b) => a + b, 0) / edges.length : null;

                          return (
                            <div className="grid grid-cols-4 gap-px bg-emerald-900/10">
                              <div className="bg-zinc-950/50 p-4 text-center">
                                <div className="text-2xl font-bold text-emerald-400">{swarmResult.consensus.betVotes}</div>
                                <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.15em] mt-1">Bet</div>
                              </div>
                              <div className="bg-zinc-950/50 p-4 text-center">
                                <div className="text-2xl font-bold text-rose-400">{swarmResult.consensus.passVotes}</div>
                                <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.15em] mt-1">Pass</div>
                              </div>
                              <div className="bg-zinc-950/50 p-4 text-center">
                                <div className={`text-2xl font-bold ${
                                  swarmResult.consensus.confidence === 'HIGH' ? 'text-emerald-400' :
                                  swarmResult.consensus.confidence === 'MEDIUM' ? 'text-amber-400' : 'text-rose-400'
                                }`}>
                                  {swarmResult.consensus.confidence}
                                </div>
                                <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.15em] mt-1">Confidence</div>
                              </div>
                              <div className="bg-zinc-950/50 p-4 text-center">
                                {avgEdge !== null ? (
                                  <>
                                    <div className={`text-2xl font-bold font-mono ${
                                      avgEdge >= 5 ? 'text-emerald-400' :
                                      avgEdge >= 3 ? 'text-amber-400' :
                                      avgEdge > 0 ? 'text-orange-400' : 'text-rose-400'
                                    }`}>
                                      {avgEdge > 0 ? '+' : ''}{avgEdge.toFixed(1)}%
                                    </div>
                                    <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.15em] mt-1">Avg Edge</div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-2xl font-bold text-zinc-700">—</div>
                                    <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.15em] mt-1">Avg Edge</div>
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
                            <div className="p-5 border-t border-emerald-900/20 bg-emerald-950/30">
                              <div className="text-[10px] font-semibold text-emerald-500/80 uppercase tracking-[0.2em] mb-3">Recommended Bet</div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {topBetType && (
                                    <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-500/20">
                                      {topBetType[0]}
                                    </span>
                                  )}
                                  {topSelection && (
                                    <span className="text-lg font-bold text-white">
                                      {topSelection[0]}
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  {avgOdds && (
                                    <div className="text-2xl font-bold text-amber-400 font-mono">
                                      @{avgOdds.toFixed(2)}
                                    </div>
                                  )}
                                  {topSelection && (
                                    <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wide mt-1">
                                      {topSelection[1].count}/{swarmResult.analyses.length} AIs agree
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Vote Distribution Bar - Modern */}
                        <div className="p-5 border-t border-emerald-900/20">
                          <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.2em] mb-3">Vote Distribution</div>
                          <div className="h-2 bg-zinc-900/80 rounded-full overflow-hidden flex">
                            <div
                              className="bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all"
                              style={{
                                width: `${(swarmResult.consensus.betVotes / (swarmResult.consensus.betVotes + swarmResult.consensus.passVotes)) * 100}%`
                              }}
                            />
                            <div
                              className="bg-gradient-to-r from-rose-600 to-rose-400 transition-all"
                              style={{
                                width: `${(swarmResult.consensus.passVotes / (swarmResult.consensus.betVotes + swarmResult.consensus.passVotes)) * 100}%`
                              }}
                            />
                          </div>
                          <div className="flex justify-between mt-2 text-xs font-semibold">
                            <span className="text-emerald-400">
                              {Math.round((swarmResult.consensus.betVotes / (swarmResult.consensus.betVotes + swarmResult.consensus.passVotes)) * 100)}% Bet
                            </span>
                            <span className="text-rose-400">
                              {Math.round((swarmResult.consensus.passVotes / (swarmResult.consensus.betVotes + swarmResult.consensus.passVotes)) * 100)}% Pass
                            </span>
                          </div>
                        </div>

                        {/* Place This Bet Button - Only for STRONG BET or SLIGHT EDGE */}
                        {session && ['STRONG BET', 'SLIGHT EDGE'].includes(swarmResult.consensus.verdict) && (
                          <div className="p-5 border-t border-emerald-900/20">
                            <button
                              onClick={() => setBetModalOpen(true)}
                              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/30"
                            >
                              <span className="text-lg">Place This Bet</span>
                              <span className="bg-emerald-700/50 px-2 py-0.5 rounded-md text-emerald-200 text-sm">
                                Track &amp; Win
                              </span>
                            </button>
                          </div>
                        )}
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
                        Browse upcoming matches and click "Get AI Analysis" to see the AI verdict and place bets
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

        {/* BETS TAB - PlayerProfit Style Dashboard */}
        {activeTab === 'bets' && (
          <div className="space-y-6">
            {/* Top Row: Win Streak Challenge */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Win Streak Challenge Card */}
              {(() => {
                // Calculate current win streak from settled bets
                const settledBets = bets.filter(b => b.result !== 'pending').sort((a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                let currentStreak = 0;
                for (const bet of settledBets) {
                  if (bet.result === 'won') {
                    currentStreak++;
                  } else {
                    break;
                  }
                }
                // Check if challenge failed (most recent bet is a loss and we had progress)
                const mostRecentBet = settledBets[0];
                const challengeFailed = mostRecentBet?.result === 'lost';

                // Find best streak ever
                let bestStreak = 0;
                let tempStreak = 0;
                for (const bet of [...settledBets].reverse()) {
                  if (bet.result === 'won') {
                    tempStreak++;
                    bestStreak = Math.max(bestStreak, tempStreak);
                  } else {
                    tempStreak = 0;
                  }
                }
                const targetStreak = 20;
                const levels = [5, 10, 15, 20];
                const currentLevel = levels.filter(l => currentStreak >= l).length;
                const nextLevel = levels.find(l => currentStreak < l) || 20;
                const challengeCompleted = currentStreak >= 20;

                return (
                  <div className={`bg-gradient-to-br ${
                    challengeFailed
                      ? 'from-red-950/80 via-red-900/60 to-red-950/80 border-red-800/50'
                      : challengeCompleted
                        ? 'from-amber-950/60 via-amber-900/40 to-amber-950/60 border-amber-700/50'
                        : 'from-[#1a3a3a] via-[#153030] to-[#102828] border-[#2a5555]/50'
                  } border rounded-2xl p-6 relative overflow-hidden`}>
                    <div className={`absolute inset-0 ${
                      challengeFailed
                        ? 'bg-[radial-gradient(circle_at_30%_20%,rgba(220,38,38,0.15),transparent_50%)]'
                        : challengeCompleted
                          ? 'bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.15),transparent_50%)]'
                          : 'bg-[radial-gradient(circle_at_30%_20%,rgba(45,180,180,0.12),transparent_50%)]'
                    }`}></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <span className={`text-sm font-medium ${
                          challengeFailed ? 'text-red-400' : challengeCompleted ? 'text-amber-400' : 'text-[#7cc4c4]'
                        }`}>Win Streak Challenge</span>
                        {challengeFailed ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 animate-pulse">
                            FAILED
                          </span>
                        ) : challengeCompleted ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-400">
                            COMPLETED!
                          </span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            currentStreak >= 15 ? 'bg-purple-500/20 text-purple-400' :
                            currentStreak >= 10 ? 'bg-blue-500/20 text-blue-400' :
                            currentStreak >= 5 ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-zinc-500/20 text-zinc-400'
                          }`}>
                            Level {currentLevel}/4
                          </span>
                        )}
                      </div>

                      {challengeFailed ? (
                        <>
                          <div className="text-5xl font-bold text-red-400 mb-1 flex items-center gap-3">
                            <span className="text-4xl">✕</span>
                            <span>0</span>
                            <span className="text-lg text-red-500/60 font-normal">/ {targetStreak}</span>
                          </div>
                          <div className="text-red-400/70 text-sm mb-4">Challenge Failed - Start Over</div>

                          {/* Failed progress bar */}
                          <div className="h-3 bg-red-950/50 rounded-full overflow-hidden mb-4">
                            <div className="h-full w-0 rounded-full bg-red-500/50"></div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-5xl font-bold text-white mb-1 flex items-baseline gap-2">
                            {currentStreak}
                            <span className="text-lg text-[#5a9090] font-normal">/ {targetStreak}</span>
                            {challengeCompleted && <span className="text-3xl ml-2">🏆</span>}
                          </div>
                          <div className="text-[#5a9090] text-sm mb-4">Consecutive Wins</div>

                          {/* Progress bar to target */}
                          <div className="h-3 bg-[#0d1f1f] rounded-full overflow-hidden mb-4">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                currentStreak >= 20 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                                currentStreak >= 15 ? 'bg-gradient-to-r from-purple-500 to-purple-400' :
                                currentStreak >= 10 ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                                currentStreak >= 5 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                                'bg-gradient-to-r from-[#2d9090] to-[#3db5b5]'
                              }`}
                              style={{ width: `${(currentStreak / targetStreak) * 100}%` }}
                            ></div>
                          </div>
                        </>
                      )}

                      {/* Level markers - Clickable when reward available */}
                      <div className="flex justify-between mb-4">
                        {levels.map((level, idx) => {
                          const levelNum = idx + 1;
                          const isComplete = bestStreak >= level;
                          const canClaimReward = isComplete && !claimedRewards.includes(levelNum);

                          return (
                            <button
                              key={level}
                              onClick={() => {
                                if (canClaimReward) {
                                  setRewardToClaim(levelNum);
                                  setRewardModalOpen(true);
                                }
                              }}
                              disabled={!canClaimReward}
                              className={`flex flex-col items-center ${canClaimReward ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                                challengeFailed
                                  ? 'bg-red-950/50 border-red-800/50 text-red-500/50'
                                  : currentStreak >= level
                                    ? level === 20 ? 'bg-amber-500 border-amber-400 text-black' :
                                      level === 15 ? 'bg-purple-500 border-purple-400 text-white' :
                                      level === 10 ? 'bg-blue-500 border-blue-400 text-white' :
                                      'bg-emerald-500 border-emerald-400 text-white'
                                    : 'bg-[#0d1f1f] border-[#2a5555] text-[#5a9090]'
                              } ${canClaimReward ? 'ring-2 ring-teal-400/50 animate-pulse' : ''}`}>
                                {challengeFailed ? '✕' : currentStreak >= level ? '✓' : level}
                              </div>
                              <span className={`text-[10px] mt-1 ${
                                challengeFailed ? 'text-red-500/50' : currentStreak >= level ? 'text-[#7cc4c4]' : 'text-[#5a9090]'
                              }`}>
                                {level === 5 ? 'Lvl 1' : level === 10 ? 'Lvl 2' : level === 15 ? 'Lvl 3' : 'Lvl 4'}
                              </span>
                              {canClaimReward && (
                                <span className="text-[8px] text-teal-400 font-medium mt-0.5">CLAIM</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className={`pt-4 border-t ${challengeFailed ? 'border-red-800/40' : 'border-[#2a5555]/40'} grid grid-cols-3 gap-4`}>
                        <div>
                          <div className={`text-xs mb-1 ${challengeFailed ? 'text-red-500/60' : 'text-[#5a9090]'}`}>Best Streak</div>
                          <div className={`font-semibold ${challengeFailed ? 'text-red-300' : 'text-white'}`}>{bestStreak}</div>
                        </div>
                        <div>
                          <div className={`text-xs mb-1 ${challengeFailed ? 'text-red-500/60' : 'text-[#5a9090]'}`}>
                            {challengeFailed ? 'Status' : 'Next Level'}
                          </div>
                          <div className={`font-semibold ${
                            challengeFailed ? 'text-red-400' : 'text-[#7cc4c4]'
                          }`}>
                            {challengeFailed ? 'Restart' : currentStreak >= 20 ? 'Completed!' : `${nextLevel - currentStreak} more`}
                          </div>
                        </div>
                        <div>
                          <div className={`text-xs mb-1 ${challengeFailed ? 'text-red-500/60' : 'text-[#5a9090]'}`}>Record</div>
                          <div className={`font-semibold ${challengeFailed ? 'text-red-300' : 'text-white'}`}>{userStats?.wins || 0}-{userStats?.losses || 0}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Streak History / Recent Results */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-zinc-300 font-medium">Recent Results</span>
                  <span className="text-xs text-zinc-500">Last 20 bets</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(() => {
                    const recentBets = bets
                      .filter(b => b.result !== 'pending')
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 20);
                    if (recentBets.length === 0) {
                      return <div className="text-zinc-500 text-sm">No settled bets yet</div>;
                    }
                    return recentBets.map((bet, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          bet.result === 'won'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : bet.result === 'lost'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                        }`}
                        title={`${bet.matchup} - ${bet.result}`}
                      >
                        {bet.result === 'won' ? 'W' : bet.result === 'lost' ? 'L' : 'P'}
                      </div>
                    ));
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Win Rate</div>
                    <div className={`font-semibold ${(userStats?.winRate || 0) >= 55 ? 'text-emerald-400' : (userStats?.winRate || 0) >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                      {(userStats?.winRate || 0).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Profit/Loss</div>
                    <div className={`font-semibold ${(userStats?.totalProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {(userStats?.totalProfit || 0) >= 0 ? '+' : ''}${(userStats?.totalProfit || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Row: Challenge Info + Trading Objectives + Calendar */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Challenge Info */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
                <h3 className="text-zinc-300 font-medium mb-4">Challenge Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Start Date</div>
                    <div className="text-white font-medium text-sm">
                      {bets.length > 0
                        ? new Date(bets[bets.length - 1]?.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'No bets yet'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Challenge</div>
                    <div className="text-white font-medium text-sm">AI Betting</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Account Size</div>
                    <div className="text-white font-medium text-sm">$1,000</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Inactivity</div>
                    <div className="text-white font-medium text-sm">
                      {bets.length > 0
                        ? `${Math.floor((Date.now() - new Date(bets[0]?.createdAt).getTime()) / 86400000)} days`
                        : '0 days'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Streak Objectives */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
                <h3 className="text-zinc-300 font-medium mb-4">Streak Objectives</h3>
                {(() => {
                  const settledBets = bets.filter(b => b.result !== 'pending').sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  );
                  let currentStreak = 0;
                  for (const bet of settledBets) {
                    if (bet.result === 'won') currentStreak++;
                    else break;
                  }
                  return (
                    <div className="space-y-3">
                      {/* Level 1: Bronze (5 wins) */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-500">Level 1: Bronze (5)</span>
                          <span className={currentStreak >= 5 ? 'text-emerald-400' : 'text-zinc-400'}>
                            {Math.min(currentStreak, 5)}/5
                          </span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${currentStreak >= 5 ? 'bg-emerald-500' : 'bg-[#2d9090]'}`}
                            style={{ width: `${Math.min((currentStreak / 5) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      {/* Level 2: Silver (10 wins) */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-500">Level 2: Silver (10)</span>
                          <span className={currentStreak >= 10 ? 'text-blue-400' : 'text-zinc-400'}>
                            {Math.min(currentStreak, 10)}/10
                          </span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${currentStreak >= 10 ? 'bg-blue-500' : 'bg-[#2d9090]'}`}
                            style={{ width: `${Math.min((currentStreak / 10) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      {/* Level 3: Gold (15 wins) */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-500">Level 3: Gold (15)</span>
                          <span className={currentStreak >= 15 ? 'text-purple-400' : 'text-zinc-400'}>
                            {Math.min(currentStreak, 15)}/15
                          </span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${currentStreak >= 15 ? 'bg-purple-500' : 'bg-[#2d9090]'}`}
                            style={{ width: `${Math.min((currentStreak / 15) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      {/* Level 4: Elite (20 wins) */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-500">Level 4: Elite (20)</span>
                          <span className={currentStreak >= 20 ? 'text-amber-400' : 'text-zinc-400'}>
                            {Math.min(currentStreak, 20)}/20
                          </span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${currentStreak >= 20 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-[#2d9090]'}`}
                            style={{ width: `${Math.min((currentStreak / 20) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Calendar */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
                <h3 className="text-zinc-300 font-medium mb-3">
                  {new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                    <div key={d} className="text-[10px] text-zinc-600 py-1">{d}</div>
                  ))}
                  {(() => {
                    const now = new Date();
                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    const startOffset = (firstDay.getDay() + 6) % 7;
                    const days = [];
                    for (let i = 0; i < startOffset; i++) {
                      days.push(<div key={`empty-${i}`} className="h-7"></div>);
                    }
                    for (let d = 1; d <= lastDay.getDate(); d++) {
                      const dayDate = new Date(now.getFullYear(), now.getMonth(), d);
                      const dayBets = bets.filter(b =>
                        b.result !== 'pending' &&
                        new Date(b.createdAt).toDateString() === dayDate.toDateString()
                      );
                      const dayPL = dayBets.reduce((sum, b) => {
                        return sum + (b.result === 'won'
                          ? (b.stake * parseFloat(b.odds)) - b.stake
                          : -b.stake);
                      }, 0);
                      const isToday = d === now.getDate();
                      days.push(
                        <div
                          key={d}
                          className={`h-7 flex items-center justify-center text-[10px] rounded ${
                            isToday ? 'ring-1 ring-[#2d9090]' : ''
                          } ${
                            dayPL > 0 ? 'bg-emerald-900/40 text-emerald-400' :
                            dayPL < 0 ? 'bg-red-900/40 text-red-400' :
                            'text-zinc-600'
                          }`}
                          title={dayPL !== 0 ? `${dayPL >= 0 ? '+' : ''}$${dayPL.toFixed(2)}` : ''}
                        >
                          {d}
                        </div>
                      );
                    }
                    return days;
                  })()}
                </div>
              </div>
            </div>

            {/* Sub-tab Switcher */}
            <div className="flex gap-2 p-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
              <button
                onClick={() => setBetsSubTab('active')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  betsSubTab === 'active'
                    ? 'bg-[#2d9090] text-white shadow-lg'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                Active Picks ({bets.filter(b => b.result === 'pending').length})
              </button>
              <button
                onClick={() => setBetsSubTab('history')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  betsSubTab === 'history'
                    ? 'bg-[#2d9090] text-white shadow-lg'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                Pick History ({bets.filter(b => b.result !== 'pending').length})
              </button>
            </div>

            {/* Active Picks Section */}
            {betsSubTab === 'active' && (
              <div className="space-y-4">
                {loadingBets ? (
                  <div className="bg-surface border border-zinc-800/50 rounded-2xl p-12 text-center">
                    <div className="animate-pulse text-zinc-400">Loading your active picks...</div>
                  </div>
                ) : bets.filter(b => b.result === 'pending').length === 0 ? (
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-[#1a3030] rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-[#2d9090]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No Active Picks</h3>
                    <p className="text-zinc-400 mb-4">Place a bet from the AI Swarm analysis to start tracking!</p>
                    <button
                      onClick={() => setActiveTab('events')}
                      className="px-4 py-2 bg-[#2d9090] hover:bg-[#3aa0a0] text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Browse Events
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {bets.filter(b => b.result === 'pending').map(bet => (
                      <div key={bet.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 hover:border-[#3a3a3a] transition-all">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">
                                {bet.sport?.includes('basketball') ? '🏀' :
                                 bet.sport?.includes('football') || bet.sport?.includes('nfl') ? '🏈' :
                                 bet.sport?.includes('soccer') ? '⚽' :
                                 bet.sport?.includes('hockey') ? '🏒' : '🎲'}
                              </span>
                              <span className="text-xs text-zinc-500 uppercase tracking-wide">{bet.league || bet.sport}</span>
                            </div>
                            <div className="font-semibold text-white text-lg">{bet.matchup}</div>
                          </div>
                          <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-semibold">
                            PENDING
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-zinc-900/50 rounded-xl">
                          <div>
                            <div className="text-xs text-zinc-500 mb-1">Selection</div>
                            <div className="font-medium text-[#5cc4c4]">{bet.selection}</div>
                          </div>
                          <div>
                            <div className="text-xs text-zinc-500 mb-1">Odds</div>
                            <div className="font-mono font-bold text-amber-400">@{bet.odds}</div>
                          </div>
                          <div>
                            <div className="text-xs text-zinc-500 mb-1">Stake</div>
                            <div className="font-medium text-white">${bet.stake}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-zinc-500 mb-1">Potential Return</div>
                            <div className="text-xl font-bold text-emerald-400 font-mono">
                              ${(bet.stake * parseFloat(bet.odds)).toFixed(2)}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => settleBet(bet.id, 'won')}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                            >
                              <span>Won</span>
                              <span className="text-emerald-200">+${((bet.stake * parseFloat(bet.odds)) - bet.stake).toFixed(2)}</span>
                            </button>
                            <button
                              onClick={() => settleBet(bet.id, 'lost')}
                              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                            >
                              <span>Lost</span>
                              <span className="text-red-200">-${bet.stake.toFixed(2)}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* History Section */}
            {betsSubTab === 'history' && (
              <div className="space-y-4">
                {loadingBets ? (
                  <div className="bg-surface border border-zinc-800/50 rounded-2xl p-12 text-center">
                    <div className="animate-pulse text-zinc-400">Loading pick history...</div>
                  </div>
                ) : bets.filter(b => b.result !== 'pending').length === 0 ? (
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No Pick History Yet</h3>
                    <p className="text-zinc-400">Your settled picks will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bets.filter(b => b.result !== 'pending').map(bet => {
                      const isWon = bet.result === 'won';
                      const profit = isWon
                        ? (bet.stake * parseFloat(bet.odds)) - bet.stake
                        : -bet.stake;

                      return (
                        <div
                          key={bet.id}
                          className={`bg-surface border rounded-xl p-4 flex items-center justify-between ${
                            isWon ? 'border-emerald-800/30' : 'border-red-900/30'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isWon ? 'bg-emerald-900/50' : 'bg-red-900/50'
                            }`}>
                              {isWon ? (
                                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-white">{bet.matchup}</div>
                              <div className="text-sm text-zinc-400">
                                {bet.selection} @ {bet.odds} &middot; ${bet.stake} stake
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold font-mono ${isWon ? 'text-emerald-400' : 'text-red-400'}`}>
                              {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
                            </div>
                            <div className={`text-xs font-semibold uppercase ${isWon ? 'text-emerald-500' : 'text-red-500'}`}>
                              {bet.result}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* REWARDS TAB */}
        {activeTab === 'rewards' && (
          <div className="space-y-6">
            {/* Earnings Balance Card */}
            <div className="bg-gradient-to-br from-emerald-950/60 via-emerald-900/40 to-emerald-950/60 border border-emerald-700/40 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.15),transparent_50%)]"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-emerald-400 font-medium mb-1">Available Balance</div>
                    <div className="text-4xl font-bold text-white">${totalEarnings.toLocaleString()}</div>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <span className="text-3xl">💰</span>
                  </div>
                </div>
                <button
                  onClick={() => setPayoutModalOpen(true)}
                  disabled={totalEarnings < 50}
                  className={`w-full py-3 rounded-xl font-bold transition-all ${
                    totalEarnings >= 50
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {totalEarnings >= 50 ? 'Request Payout' : `Minimum $50 to withdraw (need $${50 - totalEarnings} more)`}
                </button>
              </div>
            </div>

            {/* Account Size Selection */}
            {(() => {
              const accountSizes = [
                { size: 1000, cost: 19.99, label: '$1K', rewards: [3, 100, 500, 1000] },
                { size: 5000, cost: 99, label: '$5K', rewards: [20, 350, 2000, 5000] },
                { size: 10000, cost: 199, label: '$10K', rewards: [60, 700, 4500, 10000] },
                { size: 25000, cost: 399, label: '$25K', rewards: [100, 1400, 10000, 25000] },
                { size: 50000, cost: 699, label: '$50K', rewards: [150, 2800, 20000, 50000] },
                { size: 100000, cost: 999, label: '$100K', rewards: [250, 5000, 50000, 100000] },
              ];
              const currentAccount = accountSizes.find(a => a.size === selectedAccountSize) || accountSizes[0];

              return (
                <div className="bg-gradient-to-br from-[#1a3a3a] via-[#153030] to-[#102828] border border-[#2a5555]/50 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(45,180,180,0.12),transparent_50%)]"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Choose Your Account Size</h2>
                        <p className="text-[#7cc4c4]">Higher accounts unlock bigger rewards</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-zinc-400">Current Account</div>
                        <div className="text-2xl font-bold text-teal-400">${selectedAccountSize.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Account Size Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {accountSizes.map((account) => (
                        <button
                          key={account.size}
                          onClick={() => setSelectedAccountSize(account.size)}
                          className={`p-4 rounded-xl border transition-all ${
                            selectedAccountSize === account.size
                              ? 'bg-teal-500/20 border-teal-500 shadow-lg shadow-teal-500/20'
                              : 'bg-zinc-900/50 border-zinc-700/50 hover:border-teal-600/50'
                          }`}
                        >
                          <div className={`text-xl font-bold mb-1 ${selectedAccountSize === account.size ? 'text-teal-400' : 'text-white'}`}>
                            {account.label}
                          </div>
                          <div className="text-sm text-zinc-400">${account.cost}</div>
                          <div className="text-xs text-zinc-500 mt-2">
                            Max: ${account.rewards[3].toLocaleString()}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Rewards Header - Teal Theme */}
            <div className="bg-gradient-to-br from-[#1a3a3a] via-[#153030] to-[#102828] border border-[#2a5555]/50 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(45,180,180,0.12),transparent_50%)]"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Win Streak Rewards</h2>
                  <p className="text-[#7cc4c4]">Claim exclusive rewards for reaching streak milestones</p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Rewards Grid */}
            {(() => {
              // Account sizes with their rewards
              const accountSizes: Record<number, number[]> = {
                1000: [3, 100, 500, 1000],
                5000: [20, 350, 2000, 5000],
                10000: [60, 700, 4500, 10000],
                25000: [100, 1400, 10000, 25000],
                50000: [150, 2800, 20000, 50000],
                100000: [250, 5000, 50000, 100000],
              };
              const currentRewards = accountSizes[selectedAccountSize] || accountSizes[1000];

              // Calculate current streak (same logic as Bet Analysis)
              const settledBets = bets.filter(b => b.result !== 'pending').sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
              let currentStreak = 0;
              for (const bet of settledBets) {
                if (bet.result === 'won') {
                  currentStreak++;
                } else {
                  break;
                }
              }
              // Find best streak ever
              let bestStreak = 0;
              let tempStreak = 0;
              for (const bet of [...settledBets].reverse()) {
                if (bet.result === 'won') {
                  tempStreak++;
                  bestStreak = Math.max(bestStreak, tempStreak);
                } else {
                  tempStreak = 0;
                }
              }

              const rewards = [
                { level: 1, streak: 5, title: 'Lvl 1', description: '5 consecutive wins', reward: `$${currentRewards[0].toLocaleString()}`, value: currentRewards[0], icon: '💵', accent: 'emerald' },
                { level: 2, streak: 10, title: 'Lvl 2', description: '10 consecutive wins', reward: `$${currentRewards[1].toLocaleString()}`, value: currentRewards[1], icon: '💰', accent: 'blue' },
                { level: 3, streak: 15, title: 'Lvl 3', description: '15 consecutive wins', reward: `$${currentRewards[2].toLocaleString()}`, value: currentRewards[2], icon: '💎', accent: 'purple' },
                { level: 4, streak: 20, title: 'Lvl 4', description: '20 consecutive wins', reward: `$${currentRewards[3].toLocaleString()}`, value: currentRewards[3], icon: '🏆', accent: 'amber' },
              ];

              // Accent colors for progress bar and badge only
              const accentColors: Record<string, { bar: string; badge: string; glow: string }> = {
                emerald: { bar: 'bg-emerald-500', badge: 'text-emerald-400 bg-emerald-500/20', glow: 'shadow-emerald-500/20' },
                blue: { bar: 'bg-blue-500', badge: 'text-blue-400 bg-blue-500/20', glow: 'shadow-blue-500/20' },
                purple: { bar: 'bg-purple-500', badge: 'text-purple-400 bg-purple-500/20', glow: 'shadow-purple-500/20' },
                amber: { bar: 'bg-amber-500', badge: 'text-amber-400 bg-amber-500/20', glow: 'shadow-amber-500/20' },
              };

              return (
                <div className="grid gap-4 md:grid-cols-2">
                  {rewards.map((reward) => {
                    const isUnlocked = bestStreak >= reward.streak;
                    const isClaimed = claimedRewards.includes(reward.level);
                    const canClaim = isUnlocked && !isClaimed;
                    const progress = Math.min(100, (bestStreak / reward.streak) * 100);
                    const accent = accentColors[reward.accent];

                    return (
                      <div
                        key={reward.level}
                        className={`bg-[#111111] border rounded-2xl p-6 relative overflow-hidden transition-all duration-300 ${
                          isUnlocked
                            ? 'border-[#2a5555]/50 hover:border-teal-600/60'
                            : 'border-zinc-800/50 opacity-50'
                        }`}
                      >
                        {/* Subtle glow for unlocked */}
                        {isUnlocked && (
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(45,180,180,0.08),transparent_60%)]"></div>
                        )}

                        <div className="relative">
                          {/* Header Row */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                isUnlocked ? accent.badge : 'bg-zinc-800 text-zinc-500'
                              }`}>
                                {reward.title}
                              </span>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                              isClaimed
                                ? 'bg-teal-500/20 text-teal-400'
                                : isUnlocked
                                  ? 'bg-emerald-500/20 text-emerald-400 animate-pulse'
                                  : 'bg-zinc-800 text-zinc-500'
                            }`}>
                              {isClaimed ? '✓ CLAIMED' : isUnlocked ? 'READY' : 'LOCKED'}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-4">
                            <div className="h-2 bg-zinc-800/80 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${isUnlocked ? accent.bar : 'bg-zinc-700'}`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between mt-1.5">
                              <span className="text-xs text-zinc-500">{reward.description}</span>
                              <span className={`text-xs font-medium ${isUnlocked ? 'text-white' : 'text-zinc-500'}`}>
                                {Math.min(bestStreak, reward.streak)}/{reward.streak}
                              </span>
                            </div>
                          </div>

                          {/* Reward Display */}
                          <div className={`flex items-center gap-2 mb-4 p-3 rounded-xl ${
                            isUnlocked ? 'bg-[#1a1a1a] border border-zinc-800' : 'bg-zinc-900/50'
                          }`}>
                            <span className="text-xl">{reward.icon}</span>
                            <span className={`font-medium ${isUnlocked ? 'text-teal-300' : 'text-zinc-500'}`}>
                              {reward.reward}
                            </span>
                          </div>

                          {/* Action Button */}
                          {canClaim ? (
                            <button
                              onClick={() => {
                                setClaimedRewards(prev => [...prev, reward.level]);
                                setTotalEarnings(prev => prev + reward.value);
                              }}
                              className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 transition-all shadow-lg shadow-teal-500/20"
                            >
                              Claim Reward
                            </button>
                          ) : isClaimed ? (
                            <div className="w-full py-3 rounded-xl font-medium text-center bg-zinc-800/50 text-zinc-500 border border-zinc-700/30">
                              Reward Claimed
                            </div>
                          ) : (
                            <div className="w-full py-3 rounded-xl font-medium text-center bg-zinc-900/50 text-zinc-600 border border-zinc-800/50">
                              <span className="opacity-60">🔒</span> {reward.streak - bestStreak} more wins needed
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Stats Summary - Teal Theme */}
            <div className="bg-[#111111] border border-zinc-800/50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Your Progress</h3>
              {(() => {
                const settledBets = bets.filter(b => b.result !== 'pending').sort((a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                let currentStreak = 0;
                for (const bet of settledBets) {
                  if (bet.result === 'won') {
                    currentStreak++;
                  } else {
                    break;
                  }
                }
                let bestStreak = 0;
                let tempStreak = 0;
                for (const bet of [...settledBets].reverse()) {
                  if (bet.result === 'won') {
                    tempStreak++;
                    bestStreak = Math.max(bestStreak, tempStreak);
                  } else {
                    tempStreak = 0;
                  }
                }
                const rewardsUnlocked = [5, 10, 15, 20].filter(s => bestStreak >= s).length;
                const rewardsClaimed = claimedRewards.length;

                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-teal-400">{currentStreak}</div>
                      <div className="text-xs text-zinc-500">Current Streak</div>
                    </div>
                    <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-white">{bestStreak}</div>
                      <div className="text-xs text-zinc-500">Best Streak</div>
                    </div>
                    <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-emerald-400">{rewardsUnlocked}/4</div>
                      <div className="text-xs text-zinc-500">Unlocked</div>
                    </div>
                    <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-[#7cc4c4]">{rewardsClaimed}/4</div>
                      <div className="text-xs text-zinc-500">Claimed</div>
                    </div>
                  </div>
                );
              })()}
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

      {/* Bet Placement Modal */}
      {betModalOpen && selectedEvent && swarmResult && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-teal-950 to-zinc-950 border border-teal-800/50 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-teal-900/20">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Place Your Bet</h3>
              <button
                onClick={() => {
                  setBetModalOpen(false);
                  setBetSuccess(false);
                  setBetStake(10);
                }}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {betSuccess ? (
              /* Success State */
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-teal-400 mb-2">Bet Placed Successfully!</h4>
                <p className="text-zinc-400 text-sm">Track your bet in the Bet Analysis tab</p>
              </div>
            ) : (
              /* Bet Form */
              <>
                {/* Event Info */}
                <div className="bg-teal-950/50 border border-teal-900/30 rounded-xl p-4 mb-5">
                  <div className="text-sm text-zinc-400 mb-1">{selectedEvent.sportTitle}</div>
                  <div className="font-semibold text-white text-lg">
                    {selectedEvent.awayTeam} @ {selectedEvent.homeTeam}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {new Date(selectedEvent.commenceTime).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {/* Bet Details */}
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
                    : 1.91;

                  return (
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Selection</span>
                        <span className="font-semibold text-white">{topSelection?.[0] || 'Best Pick'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Bet Type</span>
                        <span className="bg-teal-900/50 text-teal-400 px-2 py-0.5 rounded text-sm">
                          {topBetType?.[0] || '1X2'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Odds</span>
                        <span className="font-mono font-bold text-amber-400 text-lg">@{avgOdds.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">AI Consensus</span>
                        <span className={`px-2 py-0.5 rounded text-sm font-semibold ${getVerdictColor(swarmResult.consensus.verdict)}`}>
                          {swarmResult.consensus.verdict}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Stake Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Stake Amount ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">$</span>
                    <input
                      type="number"
                      min="1"
                      step="5"
                      value={betStake}
                      onChange={(e) => setBetStake(Math.max(1, Number(e.target.value)))}
                      className="w-full pl-8 pr-4 py-3 bg-zinc-900/80 border border-teal-800/30 rounded-xl text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                    />
                  </div>
                  {/* Quick stake buttons */}
                  <div className="flex gap-2 mt-3">
                    {[10, 25, 50, 100].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setBetStake(amount)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                          betStake === amount
                            ? 'bg-teal-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Potential Return */}
                {(() => {
                  const selections: Record<string, { count: number; odds: number[] }> = {};
                  swarmResult.analyses.forEach(a => {
                    if (a.betSelection) {
                      if (!selections[a.betSelection]) {
                        selections[a.betSelection] = { count: 0, odds: [] };
                      }
                      selections[a.betSelection].count++;
                      if (a.betOdds) selections[a.betSelection].odds.push(a.betOdds);
                    }
                  });
                  const topSelection = Object.entries(selections).sort((a, b) => b[1].count - a[1].count)[0];
                  const avgOdds = topSelection?.[1].odds.length
                    ? topSelection[1].odds.reduce((a, b) => a + b, 0) / topSelection[1].odds.length
                    : 1.91;
                  const potentialReturn = betStake * avgOdds;
                  const profit = potentialReturn - betStake;

                  return (
                    <div className="bg-teal-900/30 border border-teal-800/30 rounded-xl p-4 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Potential Return</span>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-teal-400 font-mono">${potentialReturn.toFixed(2)}</div>
                          <div className="text-xs text-teal-500">+${profit.toFixed(2)} profit</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setBetModalOpen(false);
                      setBetStake(10);
                    }}
                    className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePlaceBet}
                    disabled={placingBet}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {placingBet ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Placing...</span>
                      </>
                    ) : (
                      <span>Confirm Bet</span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Quick Bet Modal (from clicking odds directly) */}
      {betModalOpen && quickBetEvent && quickBetSelection && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-teal-950 to-zinc-950 border border-teal-800/50 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-teal-900/20">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Quick Bet</h3>
              <button
                onClick={() => {
                  setBetModalOpen(false);
                  setBetSuccess(false);
                  setBetStake(10);
                  setQuickBetEvent(null);
                  setQuickBetSelection(null);
                }}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {betSuccess ? (
              /* Success State */
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-teal-400 mb-2">Bet Placed Successfully!</h4>
                <p className="text-zinc-400 text-sm">Track your bet in the Bet Analysis tab</p>
              </div>
            ) : (
              /* Bet Form */
              <>
                {/* Event Info */}
                <div className="bg-teal-950/50 border border-teal-900/30 rounded-xl p-4 mb-5">
                  <div className="text-sm text-zinc-400 mb-1">{quickBetEvent.sportTitle}</div>
                  <div className="font-semibold text-white text-lg">
                    {quickBetEvent.awayTeam} @ {quickBetEvent.homeTeam}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {new Date(quickBetEvent.commenceTime).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {/* Bet Details */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Selection</span>
                    <span className="font-semibold text-white">{quickBetSelection.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Bet Type</span>
                    <span className="bg-teal-900/50 text-teal-400 px-2 py-0.5 rounded text-sm">
                      {quickBetSelection.type === 'draw' ? 'Draw' : '1X2'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Odds</span>
                    <span className="font-mono font-bold text-amber-400 text-lg">@{quickBetSelection.odds.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Source</span>
                    <span className="text-zinc-300 text-sm">Direct Odds Selection</span>
                  </div>
                </div>

                {/* Stake Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Stake Amount ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">$</span>
                    <input
                      type="number"
                      min="1"
                      step="5"
                      value={betStake}
                      onChange={(e) => setBetStake(Math.max(1, Number(e.target.value)))}
                      className="w-full pl-8 pr-4 py-3 bg-zinc-900/80 border border-teal-800/30 rounded-xl text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                    />
                  </div>
                  {/* Quick stake buttons */}
                  <div className="flex gap-2 mt-3">
                    {[10, 25, 50, 100].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setBetStake(amount)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                          betStake === amount
                            ? 'bg-teal-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Potential Return */}
                {(() => {
                  const potentialReturn = betStake * quickBetSelection.odds;
                  const profit = potentialReturn - betStake;

                  return (
                    <div className="bg-teal-900/30 border border-teal-800/30 rounded-xl p-4 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Potential Return</span>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-teal-400 font-mono">${potentialReturn.toFixed(2)}</div>
                          <div className="text-xs text-teal-500">+${profit.toFixed(2)} profit</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Add to Parlay Button */}
                  <button
                    onClick={() => {
                      addToParlay(quickBetEvent, quickBetSelection);
                      setBetModalOpen(false);
                      setQuickBetEvent(null);
                      setQuickBetSelection(null);
                    }}
                    className={`w-full py-3 px-4 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
                      parlayLegs.some(leg => leg.eventId === quickBetEvent.id)
                        ? 'bg-teal-600 text-white'
                        : 'bg-teal-900/50 border border-teal-700/50 text-teal-300 hover:bg-teal-800/50'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {parlayLegs.some(leg => leg.eventId === quickBetEvent.id)
                      ? 'Remove from Parlay'
                      : `Add to Parlay ${parlayLegs.length > 0 ? `(${parlayLegs.length} legs)` : ''}`
                    }
                  </button>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setBetModalOpen(false);
                        setBetStake(10);
                        setQuickBetEvent(null);
                        setQuickBetSelection(null);
                      }}
                      className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleQuickBetPlace}
                      disabled={placingBet}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {placingBet ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Placing...</span>
                        </>
                      ) : (
                        <span>Straight Bet</span>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating Parlay Slip */}
      {parlayLegs.length > 0 && !parlayModalOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setParlayModalOpen(true)}
            className="bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-teal-900/50 flex items-center gap-3 transition-all hover:scale-105"
          >
            <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center font-bold">
              {parlayLegs.length}
            </div>
            <div className="text-left">
              <div className="font-semibold">Parlay Slip</div>
              <div className="text-xs text-teal-200">
                @{calculateParlayOdds().toFixed(2)} combined odds
              </div>
            </div>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Parlay Modal */}
      {parlayModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-teal-950 to-zinc-950 border border-teal-800/50 rounded-2xl p-6 w-full max-w-lg shadow-2xl shadow-teal-900/20 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-teal-500/20 rounded-full w-10 h-10 flex items-center justify-center">
                  <span className="text-xl">🎯</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Parlay Slip</h3>
                  <p className="text-sm text-teal-300">{parlayLegs.length} {parlayLegs.length === 1 ? 'leg' : 'legs'}</p>
                </div>
              </div>
              <button
                onClick={() => setParlayModalOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {parlaySuccess ? (
              /* Success State */
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-teal-400 mb-2">Parlay Placed!</h4>
                <p className="text-zinc-400 text-sm">Track your parlay in the Bet Analysis tab</p>
              </div>
            ) : (
              <>
                {/* Parlay Legs */}
                <div className="space-y-3 mb-6">
                  {parlayLegs.map((leg, index) => (
                    <div key={leg.eventId} className="bg-teal-950/50 border border-teal-900/30 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-xs text-teal-400 mb-1">Leg {index + 1}</div>
                          <div className="font-medium text-white text-sm">{leg.matchup}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="bg-teal-900/50 text-teal-300 px-2 py-0.5 rounded text-xs">{leg.betType}</span>
                            <span className="text-zinc-300 text-sm">{leg.selection}</span>
                            <span className="font-mono font-bold text-amber-400 text-sm">@{leg.odds}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromParlay(leg.eventId)}
                          className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {parlayLegs.length < 2 && (
                  <div className="bg-amber-900/20 border border-amber-800/30 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-2 text-amber-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-sm">Add at least 2 legs to place a parlay</span>
                    </div>
                  </div>
                )}

                {/* Combined Odds */}
                <div className="bg-teal-900/30 border border-teal-800/30 rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-zinc-300">Combined Odds</span>
                    <span className="font-mono font-bold text-2xl text-teal-400">@{calculateParlayOdds().toFixed(2)}</span>
                  </div>
                </div>

                {/* Stake Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Stake Amount ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">$</span>
                    <input
                      type="number"
                      min="1"
                      step="5"
                      value={parlayStake}
                      onChange={(e) => setParlayStake(Math.max(1, Number(e.target.value)))}
                      className="w-full pl-8 pr-4 py-3 bg-zinc-900/80 border border-teal-800/30 rounded-xl text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                    />
                  </div>
                  {/* Quick stake buttons */}
                  <div className="flex gap-2 mt-3">
                    {[10, 25, 50, 100].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setParlayStake(amount)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                          parlayStake === amount
                            ? 'bg-teal-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Potential Return */}
                {(() => {
                  const potentialReturn = parlayStake * calculateParlayOdds();
                  const profit = potentialReturn - parlayStake;

                  return (
                    <div className="bg-teal-900/30 border border-teal-800/30 rounded-xl p-4 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Potential Return</span>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-teal-400 font-mono">${potentialReturn.toFixed(2)}</div>
                          <div className="text-xs text-teal-500">+${profit.toFixed(2)} profit</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setParlayLegs([]);
                      setParlayModalOpen(false);
                    }}
                    className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={handlePlaceParlay}
                    disabled={placingParlay || parlayLegs.length < 2}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {placingParlay ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Placing...</span>
                      </>
                    ) : (
                      <span>Place Parlay</span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* REWARD CLAIM MODAL */}
      {rewardModalOpen && rewardToClaim && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setRewardModalOpen(false)}>
          <div
            className="bg-gradient-to-b from-[#1a3a3a] via-[#153030] to-[#111111] border border-[#2a5555]/50 rounded-2xl p-6 w-full max-w-md relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(45,180,180,0.15),transparent_60%)]"></div>

            {/* Close button */}
            <button
              onClick={() => setRewardModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative text-center">
              {/* Celebration animation */}
              <div className="text-6xl mb-4 animate-bounce">
                🎉
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white mb-2">
                LEVEL {rewardToClaim} COMPLETE!
              </h2>

              {/* Subtitle */}
              <p className="text-[#7cc4c4] mb-6">
                You&apos;ve reached {rewardToClaim === 1 ? 5 : rewardToClaim === 2 ? 10 : rewardToClaim === 3 ? 15 : 20} consecutive wins!
              </p>

              {/* Reward Box */}
              <div className="bg-[#111111] border border-zinc-800 rounded-xl p-4 mb-6">
                <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">Your Reward</div>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl">
                    {rewardToClaim === 1 ? '💵' : rewardToClaim === 2 ? '💰' : rewardToClaim === 3 ? '💎' : '🏆'}
                  </span>
                  <span className="text-2xl font-bold text-emerald-400">
                    {rewardToClaim === 1 ? '$3' :
                     rewardToClaim === 2 ? '$100' :
                     rewardToClaim === 3 ? '$500' :
                     '$1,000'}
                  </span>
                </div>
              </div>

              {/* Claim Button */}
              <button
                onClick={() => {
                  const rewardValues: Record<number, number> = { 1: 3, 2: 100, 3: 500, 4: 1000 };
                  setClaimedRewards(prev => [...prev, rewardToClaim]);
                  setTotalEarnings(prev => prev + (rewardValues[rewardToClaim] || 0));
                  setRewardModalOpen(false);
                  // Navigate to rewards tab
                  setActiveTab('rewards');
                }}
                className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 transition-all shadow-lg shadow-teal-500/30 mb-4"
              >
                Claim Reward
              </button>

              {/* View All Link */}
              <button
                onClick={() => {
                  setRewardModalOpen(false);
                  setActiveTab('rewards');
                }}
                className="text-teal-400 hover:text-teal-300 text-sm font-medium transition-colors"
              >
                View All Rewards →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYOUT REQUEST MODAL */}
      {payoutModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPayoutModalOpen(false)}>
          <div
            className="bg-gradient-to-b from-emerald-950/80 via-emerald-900/60 to-[#111111] border border-emerald-700/40 rounded-2xl p-6 w-full max-w-md relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.15),transparent_60%)]"></div>

            {/* Close button */}
            <button
              onClick={() => setPayoutModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative">
              {/* Header */}
              <div className="text-center mb-6">
                <span className="text-4xl mb-2 block">💸</span>
                <h2 className="text-2xl font-bold text-white">Request Payout</h2>
                <p className="text-emerald-400 text-sm mt-1">Available: ${totalEarnings.toLocaleString()}</p>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-300 mb-2">Withdrawal Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-xl">$</span>
                  <input
                    type="number"
                    min="50"
                    max={totalEarnings}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(Math.max(50, Math.min(totalEarnings, Number(e.target.value))))}
                    className="w-full pl-10 pr-4 py-4 bg-zinc-900/80 border border-emerald-800/30 rounded-xl text-white font-mono text-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  />
                </div>
                <div className="text-xs text-zinc-500 mt-2">Minimum withdrawal: $50</div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                {[50, 100, 250, totalEarnings].map((amount, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPayoutAmount(Math.min(amount, totalEarnings))}
                    disabled={amount > totalEarnings}
                    className={`py-2 rounded-lg text-sm font-medium transition-all ${
                      payoutAmount === amount
                        ? 'bg-emerald-600 text-white'
                        : amount > totalEarnings
                          ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {idx === 3 ? 'Max' : `$${amount}`}
                  </button>
                ))}
              </div>

              {/* Summary */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-zinc-400">Withdrawal Amount</span>
                  <span className="text-white font-mono">${payoutAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Remaining Balance</span>
                  <span className="text-emerald-400 font-mono">${(totalEarnings - payoutAmount).toLocaleString()}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={() => {
                  setTotalEarnings(prev => prev - payoutAmount);
                  setPayoutModalOpen(false);
                  alert(`Payout request for $${payoutAmount} submitted! You will receive your funds within 3-5 business days.`);
                }}
                disabled={payoutAmount < 50 || payoutAmount > totalEarnings}
                className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Payout Request
              </button>

              <p className="text-xs text-zinc-500 text-center mt-4">
                Payouts are processed within 3-5 business days via your preferred payment method.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
