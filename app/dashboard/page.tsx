'use client';

// ==========================================
// ZALOGCHE - MAIN DASHBOARD
// Teal Theme with AI Swarm Intelligence
// ==========================================

import { useState, useEffect, Suspense } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { useLanguage, LanguageSwitcher } from '@/lib/i18n';
import { ConfidenceGauge } from '@/components/ai/ConfidenceGauge';
import { AIComparisonMatrix } from '@/components/ai/AIComparisonMatrix';
import { StreamingAnalysis } from '@/components/ai/StreamingAnalysis';

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


interface ReferralData {
  referralCode: string;
  referralLink: string;
  stats: {
    totalReferrals: number;
    pendingReferrals: number;
    qualifiedReferrals: number;
    totalEarned: number;
    pendingRewards: number;
  };
  referrals: Array<{
    id: string;
    status: string;
    rewardAmount: number;
    createdAt: string;
    qualifiedAt: string | null;
    referred: {
      username: string;
      avatar: string;
      joinedAt: string;
    };
  }>;
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
    id: 'football',
    name: 'Football',
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
    id: 'tennis',
    name: 'Tennis',
    emoji: '🎾',
    leagues: [
      { key: 'tennis_atp_aus_open', name: 'ATP' },
      { key: 'tennis_wta_aus_open', name: 'WTA' },
    ],
  },
  {
    id: 'volleyball',
    name: 'Volleyball',
    emoji: '🏐',
    leagues: [
      { key: 'volleyball_world_championship', name: 'World Championship' },
      { key: 'volleyball_nations_league', name: 'Nations League' },
    ],
  },
  {
    id: 'american_football',
    name: 'American Football',
    emoji: '🏈',
    leagues: [
      { key: 'americanfootball_nfl', name: 'NFL' },
      { key: 'americanfootball_ncaaf', name: 'NCAA' },
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
    id: 'baseball',
    name: 'Baseball',
    emoji: '⚾',
    leagues: [
      { key: 'baseball_mlb', name: 'MLB' },
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

function DashboardContent() {
  const { t } = useLanguage();
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [activeTab, setActiveTab] = useState<'events' | 'challenges' | 'ai' | 'bets' | 'rewards' | 'achievements' | 'referral' | 'faq'>('bets');
  const [challengeSuccessMessage, setChallengeSuccessMessage] = useState<string | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<{ size: number; cost: number; label: string; profit: number; target: number; resetFee: number } | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'beginner' | 'pro'>('beginner');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto'>('card');
  const [challengesViewDifficulty, setChallengesViewDifficulty] = useState<'beginner' | 'pro'>('beginner');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [claimedRewards, setClaimedRewards] = useState<number[]>([]);
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [rewardToClaim, setRewardToClaim] = useState<number | null>(null);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(10);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'paypal' | 'crypto'>('bank');
  const [payoutDetails, setPayoutDetails] = useState<{
    iban?: string;
    accountName?: string;
    bankName?: string;
    paypalEmail?: string;
    walletAddress?: string;
    network?: string;
  }>({});
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);
  const [selectedAccountSize, setSelectedAccountSize] = useState<number>(1000); // Account size selection
  const [selectedCategory, setSelectedCategory] = useState<SportCategory>(SPORTS_CATEGORIES[0]);
  const [selectedLeague, setSelectedLeague] = useState<League>(SPORTS_CATEGORIES[0].leagues[0]);
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SportEvent | null>(null);
  const [swarmResult, setSwarmResult] = useState<SwarmResult | null>(null);
  const [analyzingSwarm, setAnalyzingSwarm] = useState(false);
  const [streamingAnalyses, setStreamingAnalyses] = useState<AIAnalysis[]>([]);
  const [streamingProgress, setStreamingProgress] = useState(0);
  const [currentStreamingAgent, setCurrentStreamingAgent] = useState<string | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loadingBets, setLoadingBets] = useState(false);
  const [userStats, setUserStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Referral state
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);

  // Bet placement modal state
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [betStake, setBetStake] = useState<number>(10);
  const [placingBet, setPlacingBet] = useState(false);
  const [betSuccess, setBetSuccess] = useState(false);
  const [betError, setBetError] = useState<string | null>(null);
  const [betsSubTab, setBetsSubTab] = useState<'active' | 'history'>('active');
  const [selectedBetChallengeIds, setSelectedBetChallengeIds] = useState<string[]>([]);

  // Event AI analysis cache (for showing verdict on event cards)
  const [eventAnalysisCache, setEventAnalysisCache] = useState<Record<string, SwarmResult>>({});
  const [loadingEventAnalysis, setLoadingEventAnalysis] = useState<Record<string, boolean>>({});

  // More Markets expansion state
  const [expandedEventMarkets, setExpandedEventMarkets] = useState<Record<string, boolean>>({});
  const [eventMarketsCache, setEventMarketsCache] = useState<Record<string, any>>({});
  const [loadingEventMarkets, setLoadingEventMarkets] = useState<Record<string, boolean>>({});

  // Challenge state (supports up to 5 active challenges)
  const [activeChallenges, setActiveChallenges] = useState<any[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [canCreateMoreChallenges, setCanCreateMoreChallenges] = useState(true);
  const [challengeCount, setChallengeCount] = useState(0);
  const [maxChallenges, setMaxChallenges] = useState(5);
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [purchasingChallenge, setPurchasingChallenge] = useState(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);

  // Quick bet from odds click
  const [quickBetEvent, setQuickBetEvent] = useState<SportEvent | null>(null);
  const [quickBetSelection, setQuickBetSelection] = useState<{ type: string; name: string; odds: number } | null>(null);

  // Achievements state
  const [achievements, setAchievements] = useState<Array<{ id: string; name: string; description: string; icon: string }>>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);

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

  // Profile edit modal state
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Handle Stripe checkout success/cancel redirects
  useEffect(() => {
    const challengeSuccess = searchParams.get('challenge_success');
    const challengeCancelled = searchParams.get('challenge_cancelled');
    const tier = searchParams.get('tier');
    const difficulty = searchParams.get('difficulty');

    if (challengeSuccess === 'true') {
      // Show success message and switch to challenges tab
      const tierLabel = tier ? `$${(parseInt(tier) / 1000).toFixed(0)}K` : '';
      setChallengeSuccessMessage(`${difficulty === 'pro' ? '⚡' : '🎯'} ${tierLabel} ${difficulty === 'pro' ? 'Pro' : 'Beginner'} Challenge purchased successfully!`);
      setActiveTab('challenges');

      // Refresh challenges data
      fetchActiveChallenge();

      // Clear URL parameters
      router.replace('/dashboard', { scroll: false });

      // Auto-hide message after 5 seconds
      setTimeout(() => setChallengeSuccessMessage(null), 5000);
    }

    if (challengeCancelled === 'true') {
      setChallengeSuccessMessage(null);
      // Clear URL parameters
      router.replace('/dashboard', { scroll: false });
    }
  }, [searchParams, router]);

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
      fetchActiveChallenge();
      fetchPayouts();
    }
  }, [session]);


  // Fetch achievements when achievements tab is selected
  useEffect(() => {
    if (activeTab === 'achievements' && session) {
      fetchAchievements();
    }
  }, [activeTab, session]);

  // Fetch referral data when referral tab is selected
  useEffect(() => {
    if (activeTab === 'referral' && session) {
      fetchReferralData();
    }
  }, [activeTab, session]);

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

  const fetchAchievements = async () => {
    setLoadingAchievements(true);
    try {
      const res = await fetch('/api/user/profile');
      const data = await res.json();
      setAchievements(data.achievements || []);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setLoadingAchievements(false);
    }
  };

  const fetchReferralData = async () => {
    setLoadingReferral(true);
    try {
      const res = await fetch('/api/referral');
      if (res.ok) {
        const data = await res.json();
        setReferralData(data);
      }
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
    } finally {
      setLoadingReferral(false);
    }
  };

  const copyReferralToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setReferralCopied(true);
      setTimeout(() => setReferralCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
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

  const fetchActiveChallenge = async () => {
    setLoadingChallenge(true);
    try {
      const res = await fetch('/api/challenges');
      const data = await res.json();
      const challenges = data.challenges || [];
      setActiveChallenges(challenges);
      setCanCreateMoreChallenges(data.canCreateMore ?? true);
      setChallengeCount(data.currentCount || 0);
      setMaxChallenges(data.maxAllowed || 5);
      // Auto-select first challenge if none selected
      if (challenges.length > 0 && !selectedChallengeId) {
        setSelectedChallengeId(challenges[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch active challenges:', error);
    } finally {
      setLoadingChallenge(false);
    }
  };

  const fetchPayouts = async () => {
    setLoadingPayouts(true);
    try {
      const res = await fetch('/api/payouts');
      const data = await res.json();
      setPayoutHistory(data.payouts || []);
      setAvailableBalance(data.availableBalance || 0);
    } catch (error) {
      console.error('Failed to fetch payouts:', error);
    } finally {
      setLoadingPayouts(false);
    }
  };

  const [claimingRewards, setClaimingRewards] = useState(false);

  const claimRewards = async (challengeId?: string) => {
    setClaimingRewards(true);
    try {
      const res = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      });
      const data = await res.json();
      if (res.ok) {
        // Refresh challenges and payouts to update balances
        fetchActiveChallenge();
        fetchPayouts();
        setActiveTab('rewards');
      } else {
        console.error('Claim failed:', data.error);
      }
    } catch (error) {
      console.error('Failed to claim rewards:', error);
    } finally {
      setClaimingRewards(false);
    }
  };

  const submitPayoutRequest = async () => {
    if (payoutAmount < 10 || payoutAmount > availableBalance) return;

    setSubmittingPayout(true);
    setPayoutError(null);
    setPayoutSuccess(null);

    // Build payment details based on method
    let details: any = {};
    if (payoutMethod === 'bank') {
      if (!payoutDetails.iban || !payoutDetails.accountName) {
        setPayoutError('Please fill in IBAN and Account Name');
        setSubmittingPayout(false);
        return;
      }
      details = {
        iban: payoutDetails.iban,
        accountName: payoutDetails.accountName,
        bankName: payoutDetails.bankName || undefined,
      };
    } else if (payoutMethod === 'paypal') {
      if (!payoutDetails.paypalEmail) {
        setPayoutError('Please enter your PayPal email');
        setSubmittingPayout(false);
        return;
      }
      details = { paypalEmail: payoutDetails.paypalEmail };
    } else if (payoutMethod === 'crypto') {
      if (!payoutDetails.walletAddress || !payoutDetails.network) {
        setPayoutError('Please enter wallet address and select network');
        setSubmittingPayout(false);
        return;
      }
      details = {
        walletAddress: payoutDetails.walletAddress,
        network: payoutDetails.network,
      };
    }

    try {
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: payoutAmount,
          paymentMethod: payoutMethod,
          paymentDetails: details,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to submit payout request');
      }

      setPayoutSuccess(data.message || 'Payout request submitted successfully!');
      setPayoutModalOpen(false);
      setPayoutDetails({});
      setPayoutAmount(10);
      fetchPayouts(); // Refresh the list
    } catch (error: any) {
      setPayoutError(error.message || 'Failed to submit payout request');
    } finally {
      setSubmittingPayout(false);
    }
  };

  const purchaseChallenge = async () => {
    if (!selectedChallenge) return;

    setPurchasingChallenge(true);
    setChallengeError(null);

    try {
      // Create Stripe Checkout session
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedChallenge.size, difficulty: selectedDifficulty }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }

    } catch (error: any) {
      console.error('Failed to start checkout:', error);
      setChallengeError(error.message || 'Failed to start checkout');
      setPurchasingChallenge(false);
    }
    // Note: Don't set purchasingChallenge to false on success since we're redirecting
  };

  const purchaseWithCrypto = async () => {
    if (!selectedChallenge) return;

    setPurchasingChallenge(true);
    setChallengeError(null);

    try {
      // Create Confirmo invoice
      const res = await fetch('/api/confirmo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedChallenge.size, difficulty: selectedDifficulty }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create crypto checkout');
      }

      // Redirect to Confirmo payment page
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }

    } catch (error: any) {
      console.error('Failed to start crypto checkout:', error);
      setChallengeError(error.message || 'Failed to start crypto checkout');
      setPurchasingChallenge(false);
    }
  };

  const handlePurchase = () => {
    if (paymentMethod === 'crypto') {
      purchaseWithCrypto();
    } else {
      purchaseChallenge();
    }
  };


  const AI_AGENT_ORDER = ['claude', 'chatgpt', 'gemini', 'grok', 'llama', 'copilot', 'perplexity'];

  const runSwarmAnalysis = async (event: SportEvent, useStreaming = true) => {
    setSelectedEvent(event);
    setAnalyzingSwarm(true);
    setSwarmResult(null);
    setStreamingAnalyses([]);
    setStreamingProgress(0);
    setCurrentStreamingAgent(useStreaming ? AI_AGENT_ORDER[0] : null);
    setActiveTab('ai');

    try {
      if (useStreaming) {
        // Use streaming endpoint for real-time updates
        const eventParam = encodeURIComponent(JSON.stringify(event));
        const response = await fetch(`/api/ai/swarm?event=${eventParam}`);

        if (!response.ok) {
          throw new Error('Failed to start streaming analysis');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';
        const analyses: AIAnalysis[] = [];

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
                break;
              }

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === 'analysis') {
                  const analysis = parsed.data as AIAnalysis;
                  analyses.push(analysis);
                  setStreamingAnalyses([...analyses]);

                  const agentIndex = AI_AGENT_ORDER.indexOf(analysis.agentId);
                  const nextAgentIndex = agentIndex + 1;
                  setCurrentStreamingAgent(
                    nextAgentIndex < AI_AGENT_ORDER.length ? AI_AGENT_ORDER[nextAgentIndex] : null
                  );
                  setStreamingProgress(((agentIndex + 1) / AI_AGENT_ORDER.length) * 100);
                } else if (parsed.type === 'consensus') {
                  setSwarmResult({
                    eventId: event.id,
                    eventName: `${event.awayTeam} @ ${event.homeTeam}`,
                    analyses,
                    consensus: parsed.data,
                    timestamp: new Date().toISOString(),
                  });
                  setStreamingProgress(100);
                  setCurrentStreamingAgent(null);
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      } else {
        // Fall back to regular POST endpoint
        const res = await fetch('/api/ai/swarm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event }),
        });
        const data = await res.json();
        setSwarmResult(data);
      }
    } catch (error) {
      console.error('Swarm analysis failed:', error);
      // Fall back to non-streaming if streaming fails
      try {
        const res = await fetch('/api/ai/swarm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event }),
        });
        const data = await res.json();
        setSwarmResult(data);
      } catch (fallbackError) {
        console.error('Fallback analysis also failed:', fallbackError);
      }
    } finally {
      setAnalyzingSwarm(false);
      setCurrentStreamingAgent(null);
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
    }
  };

  // Toggle and fetch more markets for an event
  const toggleEventMarkets = async (event: SportEvent) => {
    const eventId = event.id;
    const isCurrentlyExpanded = expandedEventMarkets[eventId];

    // Toggle expansion state
    setExpandedEventMarkets(prev => ({ ...prev, [eventId]: !isCurrentlyExpanded }));

    // If expanding and not cached, fetch the markets
    if (!isCurrentlyExpanded && !eventMarketsCache[eventId] && !loadingEventMarkets[eventId]) {
      setLoadingEventMarkets(prev => ({ ...prev, [eventId]: true }));
      try {
        const res = await fetch(`/api/sports/events/${eventId}?sport=${event.sportKey}&props=true`);
        const data = await res.json();
        setEventMarketsCache(prev => ({ ...prev, [eventId]: data }));
      } catch (error) {
        console.error('Failed to fetch event markets:', error);
      } finally {
        setLoadingEventMarkets(prev => ({ ...prev, [eventId]: false }));
      }
    }
  };

  // Handle profile update
  const handleProfileSave = async (username: string, avatar: string) => {
    const res = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, avatar }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update profile');
    }

    // Update session with new values
    await update({ username, avatar });
  };

  // Open quick bet modal from odds click
  const openQuickBet = (event: SportEvent, selectionType: 'home' | 'draw' | 'away', selectionName: string, odds: number) => {
    if (!session) return; // Must be logged in
    setQuickBetEvent(event);
    setQuickBetSelection({ type: selectionType, name: selectionName, odds });
    setBetStake(10);
    setBetError(null);
    setSelectedBetChallengeIds([]);
    setBetModalOpen(true);
  };

  // Handle quick bet placement (from odds click)
  const handleQuickBetPlace = async () => {
    if (!quickBetEvent || !quickBetSelection) return;

    setPlacingBet(true);
    setBetError(null);
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
          stake: 10, // Fixed stake since we removed stake input
          challengeIds: selectedBetChallengeIds.length > 0 ? selectedBetChallengeIds : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setBetSuccess(true);
        fetchBets();
        fetchUserStats();
        fetchActiveChallenge();
        fetchPayouts();
        setTimeout(() => {
          setBetModalOpen(false);
          setBetSuccess(false);
          setQuickBetEvent(null);
          setQuickBetSelection(null);
          setBetStake(10);
          setSelectedBetChallengeIds([]);
        }, 1500);
      } else {
        setBetError(data.message || data.error || 'Failed to place bet');
      }
    } catch (error) {
      console.error('Failed to place bet:', error);
      setBetError('Failed to place bet. Please try again.');
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
          challengeIds: selectedBetChallengeIds.length > 0 ? selectedBetChallengeIds : undefined,
        }),
      });

      if (res.ok) {
        setBetSuccess(true);
        fetchBets();
        fetchUserStats();
        fetchActiveChallenge();
        // Auto close modal after 2 seconds
        setTimeout(() => {
          setBetModalOpen(false);
          setBetSuccess(false);
          setBetStake(10);
          setSelectedBetChallengeIds([]);
        }, 2000);
      } else {
        const errorData = await res.json();
        alert(errorData.message || errorData.error || 'Failed to place bet');
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
            <h1 className="text-2xl md:text-3xl font-bold text-teal-400 tracking-tight">ZALOGCHE</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <a
              href="/profile"
              className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-900/40 to-teal-800/20 hover:from-teal-800/50 hover:to-teal-700/30 rounded-xl border border-teal-600/30 hover:border-teal-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/10"
              title={t.nav.profile}
            >
              <svg className="w-5 h-5 text-teal-400 group-hover:text-teal-300 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v2c0 .55.45 1 1 1h18c.55 0 1-.45 1-1v-2c0-3.33-6.67-5-10-5z"/>
              </svg>
              <span className="text-sm font-medium text-teal-400 group-hover:text-teal-300 hidden sm:inline">{t.nav.profile}</span>
            </a>
            <button
              onClick={() => signOut()}
              className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-900/30 to-rose-800/10 hover:from-rose-800/40 hover:to-rose-700/20 rounded-xl border border-rose-600/20 hover:border-rose-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/10"
              title={t.nav.logout}
            >
              <svg className="w-5 h-5 text-rose-400 group-hover:text-rose-300 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/>
              </svg>
              <span className="text-sm font-medium text-rose-400 group-hover:text-rose-300 hidden sm:inline">{t.nav.logout}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-surface border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto flex overflow-x-auto">
          {[
            { id: 'bets', label: t.dashboard.tabs.dashboard, icon: '📊' },
            { id: 'events', label: t.dashboard.tabs.events, icon: '🎯' },
            { id: 'challenges', label: t.dashboard.tabs.challenges, icon: '🎮' },
            { id: 'ai', label: t.dashboard.tabs.aiHub, icon: '🤖' },
            { id: 'rewards', label: t.dashboard.tabs.rewards, icon: '🎁' },
            { id: 'achievements', label: t.dashboard.tabs.achievements, icon: '⭐' },
            { id: 'referral', label: t.dashboard.tabs.referral, icon: '👥' },
            { id: 'faq', label: t.dashboard.tabs.faq, icon: '❓' },
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
              <div className="text-center py-12 text-zinc-400">{t.dashboard.events.loadingEvents}</div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">{t.dashboard.events.noEvents}</div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {events.map(event => {
                  const eventDate = new Date(event.commenceTime);
                  const isToday = new Date().toDateString() === eventDate.toDateString();
                  const isTomorrow = new Date(Date.now() + 86400000).toDateString() === eventDate.toDateString();
                  const timeLabel = isToday ? t.dashboard.events.today : isTomorrow ? t.dashboard.events.tomorrow : eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

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
                          <Link
                            href={`/event/${event.id}?sport=${event.sportKey}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/20 border border-teal-500/30 rounded-lg text-xs font-medium text-teal-400 hover:bg-teal-500/30 hover:border-teal-500/50 transition-all"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            <span>{t.dashboard.events.allMarkets}</span>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>

                        {/* Teams - Clickable to event detail */}
                        <Link
                          href={`/event/${event.id}?sport=${event.sportKey}`}
                          className="block space-y-3 mb-5 -mx-2 px-2 py-2 rounded-xl hover:bg-zinc-800/30 transition-colors cursor-pointer"
                        >
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
                        </Link>

                        {/* Best Odds - Premium Design */}
                        {event.bestOdds && (
                          <div className="mb-5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{t.dashboard.events.bestOdds}</span>
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
                                  <div className="text-[10px] text-zinc-500 font-medium mb-1">{t.dashboard.events.draw}</div>
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

                        {/* More Markets Button & Expandable Panel */}
                        <div className="mb-4">
                          <button
                            onClick={() => toggleEventMarkets(event)}
                            className="w-full flex items-center justify-between px-3 py-2.5 bg-zinc-800/30 hover:bg-zinc-800/50 border border-zinc-700/40 hover:border-zinc-600/60 rounded-xl transition-all text-sm"
                          >
                            <span className="text-zinc-400 font-medium flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                              </svg>
                              {t.dashboard.events.moreMarkets}
                            </span>
                            <svg
                              className={`w-4 h-4 text-zinc-500 transition-transform ${expandedEventMarkets[event.id] ? 'rotate-180' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* Expanded Markets Panel */}
                          {expandedEventMarkets[event.id] && (
                            <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                              {loadingEventMarkets[event.id] ? (
                                <div className="flex items-center justify-center py-6 text-zinc-500">
                                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  {t.dashboard.events.loadingMarkets}
                                </div>
                              ) : eventMarketsCache[event.id]?.markets ? (
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                                  {Object.entries(eventMarketsCache[event.id].markets).map(([marketKey, market]: [string, any]) => (
                                    <div key={marketKey} className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
                                      <div className="text-xs text-zinc-500 font-medium mb-2 uppercase tracking-wider">
                                        {market.label || marketKey}
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        {market.outcomes?.slice(0, 6).map((outcome: any, idx: number) => (
                                          <button
                                            key={idx}
                                            onClick={() => session && outcome.price && openQuickBet(event, marketKey as 'home' | 'draw' | 'away', `${outcome.name}${outcome.point ? ` ${outcome.point > 0 ? '+' : ''}${outcome.point}` : ''}`, outcome.price)}
                                            disabled={!session || !outcome.price}
                                            className={`bg-zinc-800/50 rounded-lg p-2 text-left border border-zinc-700/30 transition-all ${
                                              session && outcome.price
                                                ? 'hover:border-teal-500/50 hover:bg-teal-900/20 cursor-pointer'
                                                : 'cursor-default opacity-60'
                                            }`}
                                          >
                                            <div className="text-[10px] text-zinc-500 truncate">
                                              {outcome.name}{outcome.point !== undefined ? ` ${outcome.point > 0 ? '+' : ''}${outcome.point}` : ''}
                                            </div>
                                            <div className="text-sm font-bold text-teal-400">
                                              {outcome.price?.toFixed(2)}
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                      {market.outcomes?.length > 6 && (
                                        <div className="text-[10px] text-zinc-600 text-center mt-2">
                                          +{market.outcomes.length - 6} more options
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-4 text-zinc-500 text-sm">
                                  {t.dashboard.events.noAdditionalMarkets}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

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
                                      <span className="text-xs text-zinc-400 font-medium">{t.dashboard.events.aiConsensus}</span>
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
                                    {cachedAnalysis.consensus.betVotes}/{cachedAnalysis.consensus.betVotes + cachedAnalysis.consensus.passVotes} {t.dashboard.events.aisRecommend}
                                  </div>
                                </button>

                                {/* Place Bet Button - Only for bettable verdicts */}
                                {isBettable && session && (
                                  <button
                                    onClick={() => openBetModalForEvent(event)}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
                                  >
                                    <span>{t.dashboard.events.placeBet}</span>
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
                                  <span>{t.dashboard.events.analyzing}</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-2">
                                  <span className="text-lg">🤖</span>
                                  <span>{t.dashboard.events.getAiAnalysis}</span>
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

        {/* CHALLENGES TAB */}
        {activeTab === 'challenges' && (
          <div className="space-y-6">
            {/* Success Message Banner */}
            {challengeSuccessMessage && (
              <div className="bg-gradient-to-r from-emerald-900/60 to-teal-900/60 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-400">{challengeSuccessMessage}</p>
                    <p className="text-sm text-zinc-400">{t.dashboard.challengesTab.challengeActive}</p>
                  </div>
                </div>
                <button
                  onClick={() => setChallengeSuccessMessage(null)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Challenge Tiers Data */}
            {(() => {
              // 4-Level Progression System - Beginner difficulty (default)
              const beginnerLevels = [
                { level: 1, streakRequired: 3, name: 'Bronze', color: 'from-amber-700 to-amber-600' },
                { level: 2, streakRequired: 6, name: 'Silver', color: 'from-zinc-400 to-zinc-300' },
                { level: 3, streakRequired: 10, name: 'Gold', color: 'from-yellow-500 to-yellow-400' },
                { level: 4, streakRequired: 15, name: 'Diamond', color: 'from-cyan-400 to-blue-400' },
              ];

              const proLevels = [
                { level: 1, streakRequired: 2, name: 'Bronze', color: 'from-amber-700 to-amber-600' },
                { level: 2, streakRequired: 4, name: 'Silver', color: 'from-zinc-400 to-zinc-300' },
                { level: 3, streakRequired: 6, name: 'Gold', color: 'from-yellow-500 to-yellow-400' },
                { level: 4, streakRequired: 9, name: 'Diamond', color: 'from-cyan-400 to-blue-400' },
              ];

              // Beginner difficulty tiers
              const beginnerTiers = [
                {
                  size: 1000, cost: 20, label: '€1K', resetFee: 10,
                  rewards: [3, 100, 500, 1000] // Level 1-4 rewards
                },
                {
                  size: 5000, cost: 99, label: '€5K', resetFee: 49,
                  rewards: [20, 500, 2000, 5000]
                },
                {
                  size: 10000, cost: 199, label: '€10K', resetFee: 99,
                  rewards: [60, 1000, 4500, 10000]
                },
                {
                  size: 25000, cost: 399, label: '€25K', resetFee: 199,
                  rewards: [100, 2000, 10000, 25000]
                },
                {
                  size: 50000, cost: 699, label: '€50K', resetFee: 349,
                  rewards: [150, 3500, 20000, 50000]
                },
                {
                  size: 100000, cost: 999, label: '€100K', resetFee: 499,
                  rewards: [250, 5000, 30000, 100000]
                },
              ];

              // Pro difficulty tiers (higher level 2 and level 3 rewards)
              const proTiers = [
                {
                  size: 1000, cost: 20, label: '€1K', resetFee: 10,
                  rewards: [3, 120, 550, 1000]
                },
                {
                  size: 5000, cost: 99, label: '€5K', resetFee: 49,
                  rewards: [20, 600, 2200, 5000]
                },
                {
                  size: 10000, cost: 199, label: '€10K', resetFee: 99,
                  rewards: [60, 1200, 4950, 10000]
                },
                {
                  size: 25000, cost: 399, label: '€25K', resetFee: 199,
                  rewards: [100, 2400, 11000, 25000]
                },
                {
                  size: 50000, cost: 699, label: '€50K', resetFee: 349,
                  rewards: [150, 4200, 22000, 50000]
                },
                {
                  size: 100000, cost: 999, label: '€100K', resetFee: 499,
                  rewards: [250, 6000, 33000, 100000]
                },
              ];

              const challengeTiers = challengesViewDifficulty === 'pro' ? proTiers : beginnerTiers;

              const faqs = [
                { q: "How do the 4 levels work?", a: "Requirements depend on difficulty: Beginner (3, 6, 10, 15 wins with min odds 1.5) or Pro (2, 4, 6, 9 wins with min odds 2.0). You earn rewards at each level!" },
                { q: "What happens if I lose during a level?", a: "If you lose while attempting a level, your streak resets to zero but you keep any rewards already earned from completed levels. You can continue attempting the current level." },
                { q: "Do I need to complete all 4 levels?", a: "No! You can cash out your earned rewards at any time. However, completing all 4 levels unlocks the maximum payout for your account size." },
                { q: "How long do I have to complete all levels?", a: "You have 45 days from your purchase date to complete as many levels as you can. Any rewards earned during this time are yours to keep." },
                { q: "Can I reset my challenge?", a: "Yes! If your 45 days expire, you can reset at 50% of the original cost. This gives you a fresh 45 days to continue earning rewards." },
              ];

              return (
                <>
                  {/* Hero Section */}
                  <div className="bg-gradient-to-br from-[#1a3a3a] via-[#153030] to-[#102828] border border-[#2a5555]/50 rounded-2xl p-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(45,180,180,0.15),transparent_50%)]"></div>
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-4xl">🎮</span>
                        <div>
                          <h1 className="text-3xl md:text-4xl font-black text-white">{t.dashboard.challengesTab.streakChallenges}</h1>
                          <p className="text-[#7cc4c4] mt-2 text-lg">{t.dashboard.challengesTab.streakDescription}</p>
                        </div>
                      </div>

                      {/* Difficulty Toggle */}
                      <div className="grid grid-cols-2 gap-6 mt-6 mb-4">
                        <button
                          onClick={() => setChallengesViewDifficulty('beginner')}
                          className={`relative p-[2px] rounded-xl transition-all text-center ${
                            challengesViewDifficulty === 'beginner'
                              ? 'bg-gradient-to-b from-teal-500/50 to-teal-600/20 shadow-[0_0_20px_rgba(20,184,166,0.5)]'
                              : 'bg-gradient-to-b from-teal-500/30 to-teal-600/10'
                          }`}
                        >
                          <div className={`p-4 rounded-xl ${
                            challengesViewDifficulty === 'beginner'
                              ? 'bg-teal-500/10'
                              : 'bg-zinc-900/90 hover:bg-zinc-900/70'
                          }`}>
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <span className="text-xl">🎯</span>
                              <span className="text-lg font-bold text-white">{t.dashboard.challengesTab.beginner}</span>
                            </div>
                            <div className="text-xs text-zinc-400 mb-1">{t.dashboard.challengesTab.perfectForStarting}</div>
                            <div className="text-sm font-bold text-teal-400">
                              {t.dashboard.challengesTab.minOdds}: 1.5
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => setChallengesViewDifficulty('pro')}
                          className={`relative p-[2px] rounded-xl transition-all text-center ${
                            challengesViewDifficulty === 'pro'
                              ? 'bg-gradient-to-b from-yellow-400/50 to-yellow-500/20 shadow-[0_0_20px_rgba(250,204,21,0.5)]'
                              : 'bg-gradient-to-b from-yellow-400/30 to-yellow-500/10'
                          }`}
                        >
                          <div className={`p-4 rounded-xl ${
                            challengesViewDifficulty === 'pro'
                              ? 'bg-yellow-400/10'
                              : 'bg-zinc-900/90 hover:bg-zinc-900/70'
                          }`}>
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <span className="text-xl">⚡</span>
                              <span className="text-lg font-bold text-white">{t.dashboard.challengesTab.pro}</span>
                            </div>
                            <div className="text-xs text-zinc-400 mb-1">{t.dashboard.challengesTab.highRiskIntensity}</div>
                            <div className="text-sm font-bold text-yellow-400">
                              {t.dashboard.challengesTab.minOdds}: 2.0
                            </div>
                          </div>
                        </button>
                      </div>

                      {/* Level Preview */}
                      <div className="grid grid-cols-4 gap-2 mt-6 mb-4">
                        {(challengesViewDifficulty === 'beginner' ? beginnerLevels : proLevels).map((lvl) => (
                          <div key={lvl.level} className="text-center p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                            <div className={`text-xs font-bold bg-gradient-to-r ${lvl.color} bg-clip-text text-transparent`}>{t.dashboard.challengesTab.level} {lvl.level}</div>
                            <div className="text-white font-bold text-sm">{lvl.streakRequired} {t.dashboard.challengesTab.wins}</div>
                            <div className="text-zinc-500 text-xs">{lvl.name}</div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 bg-teal-500/10 px-4 py-2 rounded-lg border border-teal-500/30">
                          <span className="text-teal-400">✓</span>
                          <span className="text-zinc-300 text-sm">{t.dashboard.challengesTab.keepRewardsLevel}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-teal-500/10 px-4 py-2 rounded-lg border border-teal-500/30">
                          <span className="text-teal-400">✓</span>
                          <span className="text-zinc-300 text-sm">{t.dashboard.challengesTab.aiPoweredPicks}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-teal-500/10 px-4 py-2 rounded-lg border border-teal-500/30">
                          <span className="text-teal-400">✓</span>
                          <span className="text-zinc-300 text-sm">45 {t.dashboard.challengesTab.dayAccess}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Challenge Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {challengeTiers.map((tier, idx) => (
                      <div
                        key={tier.size}
                        className={`bg-gradient-to-br from-[#1a1a1a] via-[#151515] to-[#111111] border rounded-2xl p-6 relative overflow-hidden group transition-all hover:border-teal-600/50 ${
                          idx === 2 || idx === 3 ? 'border-amber-500/50' : 'border-zinc-800/50'
                        }`}
                      >
                        {/* Popular Badge */}
                        {(idx === 2 || idx === 3) && (
                          <div className="absolute -top-0 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-b-lg text-xs font-bold text-black uppercase tracking-wide">
                            {idx === 2 ? t.dashboard.challengesTab.mostPopular : t.dashboard.challengesTab.bestValue}
                          </div>
                        )}

                        {/* Card Header */}
                        <div className="text-center mb-4 mt-4">
                          <div className="text-4xl font-black text-white mb-1">€{tier.size.toLocaleString()}</div>
                          <div className="text-sm font-bold text-teal-400 tracking-widest uppercase">{t.dashboard.challengesTab.challenge}</div>
                        </div>

                        {/* Level Rewards Grid */}
                        <div className="bg-zinc-900/50 rounded-xl p-4 mb-4">
                          <div className="text-xs text-zinc-400 text-center mb-3 uppercase tracking-wider">
                            {t.dashboard.challengesTab.rewardsPerLevel} ({challengesViewDifficulty === 'pro' ? t.dashboard.challengesTab.pro : t.dashboard.challengesTab.beginner})
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {(challengesViewDifficulty === 'pro' ? proLevels : beginnerLevels).map((lvl, i) => (
                              <div key={lvl.level} className="bg-zinc-800/50 rounded-lg p-2 text-center">
                                <div className={`text-[10px] font-bold bg-gradient-to-r ${lvl.color} bg-clip-text text-transparent`}>
                                  LVL {lvl.level} • {lvl.streakRequired}W
                                </div>
                                <div className="text-white font-bold text-sm">€{tier.rewards[i].toLocaleString()}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Total Potential */}
                        <div className="flex items-center justify-between px-3 py-2 bg-teal-500/10 rounded-lg border border-teal-500/30 mb-4">
                          <span className="text-zinc-400 text-sm">{t.dashboard.challengesTab.maxPayout}</span>
                          <span className="text-teal-400 font-bold">€{tier.rewards.reduce((a, b) => a + b, 0).toLocaleString()}</span>
                        </div>

                        {/* Meta Info */}
                        <div className="flex items-center justify-between text-xs text-zinc-500 mb-4">
                          <span>⏱️ 45 {t.dashboard.challengesTab.days}</span>
                          <span>🔄 {t.dashboard.challengesTab.reset}: €{tier.resetFee}</span>
                        </div>

                        {/* Buy Button */}
                        <button
                          onClick={() => {
                            setSelectedChallenge({ ...tier, target: 10, profit: tier.rewards.reduce((a, b) => a + b, 0) });
                            setPurchaseModalOpen(true);
                          }}
                          className="w-full py-4 rounded-xl font-bold text-lg transition-all bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white shadow-lg shadow-teal-500/25 group-hover:shadow-teal-500/40"
                        >
                          💳 {t.dashboard.challengesTab.start} - €{tier.cost}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* My Active Challenges Section */}
                  {activeChallenges.length > 0 && (
                    <div className="bg-gradient-to-br from-[#1a2a2a] via-[#152525] to-[#102020] border border-teal-600/50 rounded-2xl p-6 relative overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(20,184,166,0.1),transparent_50%)]"></div>
                      <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🏆</span>
                            <h2 className="text-xl font-bold text-white">{t.dashboard.challengesTab.myActiveChallenges}</h2>
                            <span className="bg-teal-500/20 text-teal-400 text-xs font-bold px-2 py-1 rounded-full">
                              {challengeCount}/{maxChallenges} {t.dashboard.challengesTab.active}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {activeChallenges.map((challenge) => {
                            const tier = challengeTiers.find(t => t.size === challenge.tier);
                            // Use the challenge's actual difficulty to get level requirements
                            const isPro = challenge.difficulty === 'pro';
                            const challengeLevels = isPro ? proLevels : beginnerLevels;
                            const nextLevel = challengeLevels.find(l => challenge.currentStreak < l.streakRequired);
                            const currentLevelReq = challengeLevels.find(l => l.level === challenge.currentLevel);
                            const streakProgress = nextLevel
                              ? (challenge.currentStreak / nextLevel.streakRequired) * 100
                              : 100;

                            return (
                              <div
                                key={challenge.id}
                                className={`bg-zinc-900/80 border rounded-xl p-4 transition-all ${
                                  isPro
                                    ? 'border-amber-500/30 hover:border-amber-500/60'
                                    : 'border-zinc-700/50 hover:border-teal-500/50'
                                }`}
                              >
                                {/* Difficulty Badge */}
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isPro
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                      : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                                  }`}>
                                    {isPro ? '⚡ PRO' : '🎯 BEGINNER'} • {challenge.minOdds || (isPro ? 2.0 : 1.5)}x
                                  </span>
                                  <span className="text-zinc-400 text-xs">{challenge.daysRemaining}{t.dashboard.challengesTab.daysLeft}</span>
                                </div>

                                <div className="flex items-center gap-2 mb-3">
                                  <span className={`px-2 py-1 rounded text-xs font-bold bg-gradient-to-r ${currentLevelReq?.color || 'from-zinc-500 to-zinc-400'} text-white`}>
                                    Level {challenge.currentLevel}
                                  </span>
                                  <span className="text-white font-bold">{tier?.label || `€${challenge.tier/1000}K`}</span>
                                </div>

                                {/* Streak Progress */}
                                <div className="mb-3">
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-zinc-400">{t.dashboard.challengesTab.currentStreak}</span>
                                    <span className={`font-bold ${isPro ? 'text-amber-400' : 'text-teal-400'}`}>
                                      {challenge.currentStreak}/{nextLevel?.streakRequired || challengeLevels[challengeLevels.length - 1].streakRequired} {t.dashboard.challengesTab.winsLabel}
                                    </span>
                                  </div>
                                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full transition-all ${
                                        isPro
                                          ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                                          : 'bg-gradient-to-r from-teal-500 to-emerald-400'
                                      }`}
                                      style={{ width: `${streakProgress}%` }}
                                    ></div>
                                  </div>
                                </div>

                                {/* Level Progress Dots */}
                                <div className="flex items-center justify-center gap-2 mb-3">
                                  {[1, 2, 3, 4].map((lvl) => (
                                    <div
                                      key={lvl}
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        challenge[`level${lvl}Completed`]
                                          ? 'bg-gradient-to-r from-emerald-500 to-green-400 text-white'
                                          : lvl === challenge.currentLevel
                                          ? isPro
                                            ? 'bg-amber-500/30 border-2 border-amber-500 text-amber-400'
                                            : 'bg-teal-500/30 border-2 border-teal-500 text-teal-400'
                                          : 'bg-zinc-800 text-zinc-500'
                                      }`}
                                    >
                                      {challenge[`level${lvl}Completed`] ? '✓' : lvl}
                                    </div>
                                  ))}
                                </div>

                                {/* Place Bet Button */}
                                <button
                                  onClick={() => setActiveTab('events')}
                                  className="w-full py-2 rounded-lg font-semibold text-sm transition-all bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-lg shadow-amber-900/30"
                                >
                                  {t.dashboard.challengesTab.placeABet}
                                </button>

                                {/* Rewards Earned */}
                                <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                                  <span className="text-zinc-400 text-xs">{t.dashboard.challengesTab.earned}</span>
                                  <span className="text-emerald-400 font-bold">€{(challenge.totalRewardsEarned || 0).toLocaleString()}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Challenge Rules - Updated */}
                  <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <span>📋</span> {t.dashboard.challengesTab.rulesTitle}
                    </h3>
                    <ul className="space-y-2 text-zinc-400 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-teal-400 mt-0.5">•</span>
                        <span>{t.dashboard.challengesTab.rule1}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-teal-400 mt-0.5">•</span>
                        <span>{t.dashboard.challengesTab.rule2}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-teal-400 mt-0.5">•</span>
                        <span>{t.dashboard.challengesTab.rule3}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-teal-400 mt-0.5">•</span>
                        <span>{t.dashboard.challengesTab.rule4}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-teal-400 mt-0.5">•</span>
                        <span>{t.dashboard.challengesTab.rule5}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-teal-400 mt-0.5">•</span>
                        <span>{t.dashboard.challengesTab.rule6}</span>
                      </li>
                    </ul>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* AI HUB TAB */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-surface border border-zinc-800/50 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-teal-400">{t.dashboard.aiTab.commandCenter}</h2>
              <p className="text-zinc-400 mt-1">{t.dashboard.aiTab.consulting7Models}</p>
            </div>

            {/* Swarm Analysis */}
            <div>
                {analyzingSwarm ? (
                  <div className="space-y-6">
                    {/* Streaming Analysis Component */}
                    <StreamingAnalysis
                      currentAgent={currentStreamingAgent}
                      progress={streamingProgress}
                      completedAgents={streamingAnalyses.map(a => a.agentId)}
                      isStreaming={analyzingSwarm}
                    />

                    {/* Live Results Preview */}
                    {streamingAnalyses.length > 0 && (
                      <div className="bg-surface border border-zinc-800/50 rounded-2xl p-4">
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                          Live Results
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {streamingAnalyses.map(analysis => {
                            const agent = AI_AGENTS.find(a => a.id === analysis.agentId);
                            const isPositive = ['STRONG BET', 'SLIGHT EDGE'].includes(analysis.verdict);
                            return (
                              <div
                                key={analysis.agentId}
                                className={`p-3 rounded-xl border transition-all animate-fadeIn ${
                                  isPositive
                                    ? 'bg-emerald-900/20 border-emerald-700/30'
                                    : 'bg-rose-900/20 border-rose-700/30'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">{agent?.emoji}</span>
                                  <span className={`text-xs font-medium ${agent?.color}`}>{agent?.name}</span>
                                </div>
                                <div className={`text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {analysis.verdict}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : swarmResult ? (
                  <div className="space-y-8">
                    {/* Event Header with Gradient Border */}
                    <div className="relative p-[1px] rounded-2xl bg-gradient-to-r from-teal-500/50 via-teal-400/30 to-teal-500/50">
                      <div className="bg-surface rounded-2xl p-6 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">{t.dashboard.aiTab.matchAnalysis}</span>
                          {swarmResult.cached && (
                            <span className="text-[10px] font-medium text-teal-400 bg-teal-900/30 px-2 py-0.5 rounded-full border border-teal-700/30">
                              {t.dashboard.aiTab.sharedAnalysis}
                            </span>
                          )}
                        </div>
                        <div className="text-2xl font-bold text-white">{swarmResult.eventName}</div>
                        {swarmResult.timestamp && (
                          <div className="text-xs text-zinc-600 mt-2">
                            {t.dashboard.aiTab.analyzed} {new Date(swarmResult.timestamp).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Consensus Card - Premium Emerald Design */}
                    <div className="relative rounded-2xl overflow-hidden border border-emerald-900/30 bg-gradient-to-b from-emerald-950/40 to-zinc-950/80">
                      {/* Subtle glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

                      <div className="relative">
                        {/* Header with Verdict and Confidence Gauge */}
                        <div className={`p-6 border-b border-emerald-900/20 ${getVerdictColor(swarmResult.consensus.verdict)}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                              {/* Confidence Gauge */}
                              <ConfidenceGauge
                                betVotes={swarmResult.consensus.betVotes}
                                passVotes={swarmResult.consensus.passVotes}
                                confidence={swarmResult.consensus.confidence as 'HIGH' | 'MEDIUM' | 'LOW'}
                                verdict={swarmResult.consensus.verdict}
                                size="md"
                              />
                              <div>
                                <div className="text-[10px] font-semibold text-emerald-500/80 uppercase tracking-[0.2em] mb-1">{t.dashboard.aiTab.aiConsensus}</div>
                                <div className="text-3xl font-bold tracking-tight">{swarmResult.consensus.verdict}</div>
                                <div className="text-sm text-zinc-500 mt-1">
                                  {swarmResult.consensus.betVotes}/{swarmResult.consensus.betVotes + swarmResult.consensus.passVotes} {t.dashboard.aiTab.aisAgree}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-4xl font-bold font-mono">{swarmResult.consensus.score}</div>
                              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.2em] mt-1">{t.dashboard.aiTab.score}</div>
                            </div>
                          </div>
                        </div>

                        {/* Stats Grid - Modern Clean */}
                        {(() => {
                          // Calculate average edge from analyses
                          const edges = swarmResult.analyses.filter(a => a.edge != null).map(a => a.edge!);
                          const avgEdge = edges.length > 0 ? edges.reduce((a, b) => a + b, 0) / edges.length : null;

                          return (
                            <div className="grid grid-cols-3 gap-px bg-emerald-900/10">
                              <div className="bg-zinc-950/50 p-4 text-center">
                                <div className="text-2xl font-bold text-emerald-400">{swarmResult.consensus.betVotes}</div>
                                <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.15em] mt-1">{t.dashboard.aiTab.bet}</div>
                              </div>
                              <div className="bg-zinc-950/50 p-4 text-center">
                                <div className="text-2xl font-bold text-rose-400">{swarmResult.consensus.passVotes}</div>
                                <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.15em] mt-1">{t.dashboard.aiTab.pass}</div>
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
                                    <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.15em] mt-1">{t.dashboard.aiTab.avgEdge}</div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-2xl font-bold text-zinc-700">—</div>
                                    <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.15em] mt-1">{t.dashboard.aiTab.avgEdge}</div>
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
                              <div className="text-[10px] font-semibold text-emerald-500/80 uppercase tracking-[0.2em] mb-3">{t.dashboard.aiTab.recommendedBet}</div>
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
                                      {topSelection[1].count}/{swarmResult.analyses.length} {t.dashboard.aiTab.aisAgree}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Vote Distribution Bar - Modern */}
                        <div className="p-5 border-t border-emerald-900/20">
                          <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.2em] mb-3">{t.dashboard.aiTab.voteDistribution}</div>
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
                              {Math.round((swarmResult.consensus.betVotes / (swarmResult.consensus.betVotes + swarmResult.consensus.passVotes)) * 100)}% {t.dashboard.aiTab.bet}
                            </span>
                            <span className="text-rose-400">
                              {Math.round((swarmResult.consensus.passVotes / (swarmResult.consensus.betVotes + swarmResult.consensus.passVotes)) * 100)}% {t.dashboard.aiTab.pass}
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
                              <span className="text-lg">{t.dashboard.aiTab.placeThisBet}</span>
                              <span className="bg-emerald-700/50 px-2 py-0.5 rounded-md text-emerald-200 text-sm">
                                {t.dashboard.aiTab.trackAndWin}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Model Comparison Matrix */}
                    <AIComparisonMatrix
                      analyses={swarmResult.analyses}
                      translations={{
                        model: t.dashboard.aiTab.modelColumn || 'Model',
                        verdict: t.dashboard.aiTab.verdictColumn || 'Verdict',
                        edge: t.dashboard.aiTab.edgeColumn || 'Edge',
                        pick: t.dashboard.aiTab.pickColumn || 'Pick',
                        odds: t.dashboard.aiTab.oddsColumn || 'Odds',
                        noData: t.dashboard.aiTab.noDataAvailable || 'No data',
                      }}
                    />

                    {/* AI Opinions Header */}
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                      <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
                        {t.dashboard.aiTab.individualAiAnalysis} ({swarmResult.analyses.filter(a => !a.error && a.verdict !== 'UNKNOWN').length}/7 {t.dashboard.aiTab.responded})
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
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
                                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide">{t.dashboard.aiTab.trueProb}</div>
                                      <div className="text-sm font-bold text-white">{analysis.probability}%</div>
                                    </div>
                                  )}
                                  {analysis.impliedProbability && (
                                    <div className="bg-dark/50 rounded-lg p-2 text-center border border-zinc-800/30">
                                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide">{t.dashboard.aiTab.implied}</div>
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
                                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide">{t.dashboard.aiTab.edge}</div>
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
                                  {t.dashboard.aiTab.fullAnalysis}
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
                            <div className="text-zinc-400 font-medium">{t.dashboard.aiTab.noAiResponses}</div>
                            <div className="text-zinc-600 text-sm mt-1">{t.dashboard.aiTab.allModelsFailed}</div>
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
                      <div className="text-2xl font-bold text-white mb-3">{t.dashboard.aiTab.selectAnEvent}</div>
                      <div className="text-zinc-400 max-w-md mx-auto mb-6">
                        {t.dashboard.aiTab.selectEventDesc}
                      </div>
                      <button
                        onClick={() => setActiveTab('events')}
                        className="text-dark px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-teal-900/30 hover:shadow-teal-500/30"
                        style={{ background: 'linear-gradient(180deg, #2DD4BF 0%, #14B8A6 100%)' }}
                      >
                        {t.dashboard.aiTab.browseEvents} →
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* BETS TAB - Main Dashboard */}
        {activeTab === 'bets' && (
          <div className="space-y-6">
            {/* Challenge Accounts - Full Width */}
            <div>
              {(() => {
                // Get reward data for a tier
                const getTierRewards = (tier: number): number[] => {
                  const tierData: Record<number, number[]> = {
                    1000: [3, 100, 500, 1000],
                    5000: [20, 350, 2000, 5000],
                    10000: [60, 700, 4500, 10000],
                    25000: [100, 1400, 10000, 25000],
                    50000: [150, 2800, 20000, 50000],
                    100000: [250, 5000, 50000, 100000],
                  };
                  return tierData[tier] || [0, 0, 0, 0];
                };

                const getTierLabel = (tier: number): string => {
                  if (tier >= 1000) return `$${tier / 1000}K`;
                  return `$${tier}`;
                };

                // No active challenges - show prompt to purchase
                if (activeChallenges.length === 0) {
                  return (
                    <div className="bg-gradient-to-br from-[#1a3a3a] via-[#153030] to-[#102828] border border-[#2a5555]/50 rounded-2xl p-6 relative overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(45,180,180,0.12),transparent_50%)]"></div>
                      <div className="relative text-center py-4">
                        <div className="text-4xl mb-3">🎯</div>
                        <h3 className="text-lg font-bold text-white mb-2">{t.dashboard.betsTab.noActiveChallenges}</h3>
                        <p className="text-sm text-[#7cc4c4] mb-4">{t.dashboard.betsTab.purchaseChallenge}</p>
                        <button
                          onClick={() => setActiveTab('challenges')}
                          className="px-6 py-2 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl transition-all"
                        >
                          {t.dashboard.betsTab.browseChallenges}
                        </button>
                      </div>
                    </div>
                  );
                }

                // Find the selected challenge or default to first
                const selectedChallenge = activeChallenges.find(c => c.id === selectedChallengeId) || activeChallenges[0];
                const rewards = selectedChallenge?.tierRewards || getTierRewards(selectedChallenge?.tier || 1000);

                return (
                  <div className="bg-gradient-to-br from-[#1a3a3a] via-[#153030] to-[#102828] border border-[#2a5555]/50 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(45,180,180,0.12),transparent_50%)]"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-white mb-1">
                            {activeChallenges.length === 1 ? t.dashboard.betsTab.yourChallengeAccount : t.dashboard.betsTab.yourChallengeAccounts}
                          </h3>
                          <p className="text-sm text-[#7cc4c4]">
                            {activeChallenges.length === 1
                              ? `${selectedChallenge?.tierLabel || getTierLabel(selectedChallenge?.tier)} ${t.dashboard.betsTab.challengeActive}`
                              : `${activeChallenges.length} ${t.dashboard.betsTab.activeChallenges}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-4">
                            <div>
                              <div className="text-[10px] text-zinc-500 uppercase">{t.dashboard.betsTab.totalPotential}</div>
                              <div className="text-lg font-bold text-teal-400">€{rewards.reduce((a: number, b: number) => a + b, 0)?.toLocaleString()}</div>
                            </div>
                            <div className="w-px h-8 bg-zinc-700"></div>
                            <div>
                              <div className="text-[10px] text-zinc-500 uppercase">{t.dashboard.betsTab.resetFee}</div>
                              <div className="text-lg font-bold text-zinc-400">€{selectedChallenge?.resetFee || 0}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Challenge Switcher - Only show if more than one challenge */}
                      {activeChallenges.length > 1 && (
                        <div className={`grid gap-2 mb-4 ${activeChallenges.length <= 3 ? 'grid-cols-' + activeChallenges.length : 'grid-cols-3 md:grid-cols-5'}`}>
                          {activeChallenges.map((challenge) => {
                            const isSelected = challenge.id === (selectedChallengeId || activeChallenges[0]?.id);
                            const label = challenge.tierLabel || getTierLabel(challenge.tier);
                            const isPro = challenge.difficulty === 'pro';
                            return (
                              <button
                                key={challenge.id}
                                onClick={() => setSelectedChallengeId(challenge.id)}
                                className={`p-3 rounded-xl border transition-all ${
                                  isSelected
                                    ? isPro
                                      ? 'bg-amber-500/20 border-amber-500 shadow-lg shadow-amber-500/20'
                                      : 'bg-teal-500/20 border-teal-500 shadow-lg shadow-teal-500/20'
                                    : 'bg-zinc-900/50 border-zinc-700/50 hover:border-teal-600/50'
                                }`}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-sm">{isPro ? '⚡' : '🎯'}</span>
                                  <span className={`text-base font-bold ${isSelected ? (isPro ? 'text-amber-400' : 'text-teal-400') : 'text-white'}`}>
                                    {label}
                                  </span>
                                </div>
                                <div className="text-[10px] text-zinc-500 mt-0.5">
                                  {isPro ? 'Pro' : 'Beginner'} • {challenge.currentStreak || 0}W
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Selected Challenge Details - Enhanced */}
                      <div className={`rounded-xl p-4 mb-4 ${
                        selectedChallenge?.difficulty === 'pro'
                          ? 'bg-gradient-to-br from-amber-900/20 to-amber-950/30 border border-amber-700/30'
                          : 'bg-gradient-to-br from-teal-900/20 to-teal-950/30 border border-teal-700/30'
                      }`}>
                        {/* Difficulty Badge */}
                        <div className="flex justify-center mb-4">
                          <span className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 ${
                            selectedChallenge?.difficulty === 'pro'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
                          }`}>
                            {selectedChallenge?.difficulty === 'pro' ? `⚡ ${t.dashboard.betsTab.proMode}` : `🎯 ${t.dashboard.betsTab.beginnerMode}`} • {t.dashboard.betsTab.minOdds} {selectedChallenge?.minOdds || 1.5}x {t.dashboard.betsTab.odds}
                          </span>
                        </div>

                        {/* Circular Progress & Stats */}
                        <div className="flex items-center gap-6">
                          {/* Circular Progress */}
                          <div className="relative w-24 h-24 flex-shrink-0">
                            <svg className="w-24 h-24" viewBox="0 0 100 100">
                              <circle
                                cx="50"
                                cy="50"
                                r="42"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                className="text-zinc-800"
                              />
                              <circle
                                cx="50"
                                cy="50"
                                r="42"
                                stroke={selectedChallenge?.difficulty === 'pro' ? '#f59e0b' : '#14b8a6'}
                                strokeWidth="8"
                                fill="none"
                                strokeLinecap="round"
                                style={{
                                  strokeDasharray: 264,
                                  strokeDashoffset: 264 - ((selectedChallenge?.currentStreak || 0) / (selectedChallenge?.difficulty === 'pro' ? 9 : 15)) * 264,
                                  transform: 'rotate(-90deg)',
                                  transformOrigin: '50% 50%'
                                }}
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className={`text-2xl font-bold ${selectedChallenge?.difficulty === 'pro' ? 'text-amber-400' : 'text-teal-400'}`}>
                                {selectedChallenge?.currentStreak || 0}
                              </span>
                              <span className="text-[10px] text-zinc-500">/ {selectedChallenge?.difficulty === 'pro' ? 9 : 15} wins</span>
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div className="bg-zinc-900/50 rounded-lg p-2.5 text-center">
                              <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">{t.dashboard.betsTab.level}</div>
                              <div className="text-lg font-bold text-white">{selectedChallenge?.currentLevel || 1}<span className="text-zinc-500 text-sm">/4</span></div>
                            </div>
                            <div className="bg-zinc-900/50 rounded-lg p-2.5 text-center">
                              <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">{t.dashboard.betsTab.daysLeft}</div>
                              <div className={`text-lg font-bold ${(selectedChallenge?.daysRemaining ?? 45) <= 7 ? 'text-red-400' : (selectedChallenge?.daysRemaining ?? 45) <= 14 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {selectedChallenge?.daysRemaining ?? 45}
                              </div>
                            </div>
                            <div className="bg-zinc-900/50 rounded-lg p-2.5 text-center">
                              <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">{t.dashboard.betsTab.earnedLabel}</div>
                              <div className="text-lg font-bold text-emerald-400">€{(selectedChallenge?.totalRewardsEarned || 0).toLocaleString()}</div>
                            </div>
                            <div className="bg-zinc-900/50 rounded-lg p-2.5 text-center">
                              <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">{t.dashboard.betsTab.nextTarget}</div>
                              <div className="text-lg font-bold text-white">
                                {(() => {
                                  const streak = selectedChallenge?.currentStreak || 0;
                                  const levelReqs = selectedChallenge?.difficulty === 'pro'
                                    ? [2, 4, 6, 9]
                                    : [3, 6, 10, 15];
                                  const nextTarget = levelReqs.find(r => r > streak);
                                  return nextTarget ? `${nextTarget}W` : '✓';
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Challenge Info Row */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/50">
                          <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <span>
                              📅 {t.dashboard.betsTab.started}: {selectedChallenge?.purchasedAt
                                ? new Date(selectedChallenge.purchasedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : 'N/A'}
                            </span>
                            <span>
                              ⏰ {t.dashboard.betsTab.expires}: {selectedChallenge?.expiresAt
                                ? new Date(selectedChallenge.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-600 font-mono">
                            {t.dashboard.betsTab.account} {selectedChallenge?.id?.slice(-6).toLowerCase() || '------'}
                          </div>
                        </div>
                      </div>

                      {/* Level Progression - Enhanced */}
                      {(() => {
                        // Get level requirements from the challenge (comes from API based on difficulty)
                        const levelReqs = selectedChallenge?.levelRequirements || [
                          { level: 1, streakRequired: 3 },
                          { level: 2, streakRequired: 6 },
                          { level: 3, streakRequired: 10 },
                          { level: 4, streakRequired: 15 },
                        ];
                        const maxStreak = levelReqs[levelReqs.length - 1]?.streakRequired || 15;

                        return (
                          <div className="pt-4 border-t border-[#2a5555]/40">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs text-zinc-500 uppercase tracking-wide">{t.dashboard.betsTab.levelProgression}</span>
                              <span className="text-xs text-zinc-400">
                                {[selectedChallenge?.level1Completed, selectedChallenge?.level2Completed, selectedChallenge?.level3Completed, selectedChallenge?.level4Completed].filter(Boolean).length}/4 {t.dashboard.betsTab.completed}
                              </span>
                            </div>

                            {/* Progress Track */}
                            <div className="relative mb-4">
                              <div className="absolute top-4 left-0 right-0 h-1 bg-zinc-800 rounded-full"></div>
                              <div
                                className={`absolute top-4 left-0 h-1 rounded-full transition-all duration-500 ${
                                  selectedChallenge?.difficulty === 'pro'
                                    ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                    : 'bg-gradient-to-r from-teal-500 to-teal-400'
                                }`}
                                style={{ width: `${Math.min(100, ((selectedChallenge?.currentStreak || 0) / maxStreak) * 100)}%` }}
                              ></div>
                              <div className="flex justify-between relative">
                                {[
                                  { level: 1, wins: levelReqs[0]?.streakRequired || 3, reward: rewards[0], completed: selectedChallenge?.level1Completed, color: 'emerald' },
                                  { level: 2, wins: levelReqs[1]?.streakRequired || 6, reward: rewards[1], completed: selectedChallenge?.level2Completed, color: 'blue' },
                                  { level: 3, wins: levelReqs[2]?.streakRequired || 10, reward: rewards[2], completed: selectedChallenge?.level3Completed, color: 'purple' },
                                  { level: 4, wins: levelReqs[3]?.streakRequired || 15, reward: rewards[3], completed: selectedChallenge?.level4Completed, color: 'amber' },
                                ].map((lvl) => {
                                  const isActive = (selectedChallenge?.currentStreak || 0) >= lvl.wins;
                                  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
                                    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500' },
                                    blue: { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500' },
                                    purple: { bg: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500' },
                                    amber: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500' },
                                  };
                                  const colors = colorClasses[lvl.color];

                                  return (
                                    <div key={lvl.level} className="flex flex-col items-center">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                                        lvl.completed
                                          ? `${colors.bg} border-white/30 text-white shadow-lg`
                                          : isActive
                                            ? `bg-zinc-900 ${colors.border} ${colors.text}`
                                            : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                                      }`}>
                                        {lvl.completed ? '✓' : lvl.wins}
                                      </div>
                                      <div className={`mt-2 text-center ${lvl.completed ? colors.text : 'text-zinc-400'}`}>
                                        <div className="text-sm font-bold">${lvl.reward?.toLocaleString()}</div>
                                        <div className="text-[10px] text-zinc-500">{lvl.wins}W</div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Claim Reward Button */}
                      {selectedChallenge && (selectedChallenge.totalPendingAmount || 0) > 0 && (
                        <div className="mt-4">
                          <button
                            onClick={() => claimRewards(selectedChallenge.id)}
                            disabled={claimingRewards}
                            className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30 disabled:opacity-50"
                          >
                            <span>{claimingRewards ? '⏳' : '💰'}</span>
                            <span>{claimingRewards ? t.dashboard.betsTab.claiming : `${t.dashboard.betsTab.claimReward} €${(selectedChallenge.totalPendingAmount || 0).toLocaleString()} ${t.dashboard.betsTab.reward}`}</span>
                          </button>
                        </div>
                      )}

                      {/* Place Bet Button */}
                      <div className="mt-4 flex justify-center">
                        <button
                          onClick={() => setActiveTab('events')}
                          className="w-1/3 py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center shadow-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-amber-900/30"
                        >
                          {t.dashboard.events.placeBet}
                        </button>
                      </div>

                      {/* Recent Results - Simple W/L */}
                      <div className="pt-4 border-t border-zinc-800/50 mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-zinc-500">{t.dashboard.betsTab.recentResults}</span>
                          <span className="text-xs text-zinc-500">
                            {bets.filter(b => b.result === 'won').length}W - {bets.filter(b => b.result === 'lost').length}L
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {bets
                            .filter(b => b.result !== 'pending')
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .slice(0, 10)
                            .map((bet, i) => (
                              <div
                                key={i}
                                className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                                  bet.result === 'won'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : bet.result === 'lost'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-zinc-500/20 text-zinc-400'
                                }`}
                              >
                                {bet.result === 'won' ? 'W' : bet.result === 'lost' ? 'L' : 'P'}
                              </div>
                            ))}
                          {bets.filter(b => b.result !== 'pending').length === 0 && (
                            <span className="text-xs text-zinc-600">{t.dashboard.betsTab.noResultsYet}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Sub-tab Switcher */}
            <div className={`flex gap-2 p-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl ${activeChallenges.length === 0 ? 'opacity-40 blur-[2px] pointer-events-none select-none' : ''}`}>
              <button
                onClick={() => setBetsSubTab('active')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  betsSubTab === 'active'
                    ? 'bg-[#2d9090] text-white shadow-lg'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                {t.dashboard.betsTab.activePicks} ({bets.filter(b => b.result === 'pending').length})
              </button>
              <button
                onClick={() => setBetsSubTab('history')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  betsSubTab === 'history'
                    ? 'bg-[#2d9090] text-white shadow-lg'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                {t.dashboard.betsTab.pickHistory} ({bets.filter(b => b.result !== 'pending').length})
              </button>
            </div>

            {/* Active Picks Section */}
            {betsSubTab === 'active' && (
              <div className={`space-y-4 ${activeChallenges.length === 0 ? 'opacity-40 blur-[2px] pointer-events-none select-none' : ''}`}>
                {loadingBets ? (
                  <div className="bg-surface border border-zinc-800/50 rounded-2xl p-12 text-center">
                    <div className="animate-pulse text-zinc-400">{t.dashboard.betsTab.loadingActivePicks}</div>
                  </div>
                ) : bets.filter(b => b.result === 'pending').length === 0 ? (
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-[#1a3030] rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-[#2d9090]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{t.dashboard.betsTab.noActivePicks}</h3>
                    <p className="text-zinc-400 mb-4">{t.dashboard.betsTab.placeABetToStart}</p>
                    <button
                      onClick={() => setActiveTab('events')}
                      className="px-4 py-2 bg-[#2d9090] hover:bg-[#3aa0a0] text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {t.dashboard.betsTab.browseEvents}
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
                        </div>

                        <div className="flex items-center justify-end">
                          <div className="flex gap-2">
                            <button
                              onClick={() => settleBet(bet.id, 'won')}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                              <span>✓</span>
                              <span>Won</span>
                            </button>
                            <button
                              onClick={() => settleBet(bet.id, 'lost')}
                              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                              <span>✗</span>
                              <span>Lost</span>
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
              <div className={`space-y-4 ${activeChallenges.length === 0 ? 'opacity-40 blur-[2px] pointer-events-none select-none' : ''}`}>
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
                                {bet.selection} @ {bet.odds}
                              </div>
                            </div>
                          </div>
                          <div className={`px-4 py-2 rounded-lg font-bold uppercase text-sm ${
                            isWon ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'
                          }`}>
                            {isWon ? 'Won' : 'Lost'}
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

        {/* REWARDS TAB - Integrated with Challenge System */}
        {activeTab === 'rewards' && (
          <div className="space-y-6">
            {/* Wallet Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Available Balance Card */}
              <div className="bg-gradient-to-br from-emerald-950/80 via-emerald-900/60 to-emerald-950/80 border border-emerald-600/30 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.2),transparent_60%)]"></div>
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-lg">💰</span>
                    </div>
                    <span className="text-emerald-400 text-sm font-medium">{t.dashboard.rewardsTab.availableBalance}</span>
                  </div>
                  <div className="text-4xl font-bold text-white mb-4">€{availableBalance.toLocaleString()}</div>
                  <button
                    onClick={() => setPayoutModalOpen(true)}
                    disabled={availableBalance < 10}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>💸</span>
                    <span>{t.dashboard.rewardsTab.withdrawFunds}</span>
                  </button>
                  {availableBalance < 10 && availableBalance > 0 && (
                    <div className="text-xs text-emerald-400/70 text-center mt-2">{t.dashboard.rewardsTab.minWithdrawal}</div>
                  )}
                </div>
              </div>

              {/* Pending Rewards Card */}
              <div className="bg-gradient-to-br from-amber-950/60 via-amber-900/40 to-amber-950/60 border border-amber-600/30 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(245,158,11,0.15),transparent_60%)]"></div>
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <span className="text-lg">⏳</span>
                    </div>
                    <span className="text-amber-400 text-sm font-medium">{t.dashboard.rewardsTab.pendingRewards}</span>
                  </div>
                  <div className="text-4xl font-bold text-white mb-4">
                    €{activeChallenges.reduce((sum, c) => sum + (c.totalPendingAmount || 0), 0).toLocaleString()}
                  </div>
                  {activeChallenges.reduce((sum, c) => sum + (c.totalPendingAmount || 0), 0) > 0 ? (
                    <button
                      onClick={() => claimRewards()}
                      disabled={claimingRewards}
                      className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <span>{claimingRewards ? '⏳' : '✨'}</span>
                      <span>{claimingRewards ? t.dashboard.rewardsTab.claiming : t.dashboard.rewardsTab.claimAllRewards}</span>
                    </button>
                  ) : (
                    <div className="w-full py-3 bg-zinc-800/50 text-zinc-500 font-medium rounded-xl text-center">
                      {t.dashboard.rewardsTab.noPendingRewards}
                    </div>
                  )}
                  {activeChallenges.reduce((sum, c) => sum + (c.pendingRewards?.length || 0), 0) > 0 && (
                    <div className="text-xs text-amber-400/70 text-center mt-2">
                      {activeChallenges.reduce((sum, c) => sum + (c.pendingRewards?.length || 0), 0)} {t.dashboard.rewardsTab.levelsReadyToClaim}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-[#111]/80 border border-zinc-800/50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{activeChallenges.length}</div>
                <div className="text-xs text-zinc-500 mt-1">{t.dashboard.rewardsTab.activeChallenges}</div>
              </div>
              <div className="bg-[#111]/80 border border-zinc-800/50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-teal-400">
                  {activeChallenges.reduce((sum, c) => sum + [c.level1Completed, c.level2Completed, c.level3Completed, c.level4Completed].filter(Boolean).length, 0)}
                </div>
                <div className="text-xs text-zinc-500 mt-1">{t.dashboard.rewardsTab.levelsComplete}</div>
              </div>
              <div className="bg-[#111]/80 border border-zinc-800/50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">
                  €{activeChallenges.reduce((sum, c) => sum + (c.totalRewardsEarned || 0), 0).toLocaleString()}
                </div>
                <div className="text-xs text-zinc-500 mt-1">{t.dashboard.rewardsTab.totalEarned}</div>
              </div>
              <div className="bg-[#111]/80 border border-zinc-800/50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400">
                  {activeChallenges.filter(c => c.level4Completed).length}
                </div>
                <div className="text-xs text-zinc-500 mt-1">{t.dashboard.rewardsTab.maxPayouts}</div>
              </div>
            </div>

            {/* Withdrawal History */}
            <div className="bg-[#111]/80 border border-zinc-800/50 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <span>📜</span> {t.dashboard.rewardsTab.withdrawalHistory}
                  </h3>
                  {loadingPayouts && (
                    <div className="w-4 h-4 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin"></div>
                  )}
                </div>
                {payoutHistory.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500">
                    <div className="text-2xl mb-2">📋</div>
                    <div className="text-sm">{t.dashboard.rewardsTab.noWithdrawals}</div>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/50 max-h-[200px] overflow-y-auto">
                    {payoutHistory.slice(0, 5).map((payout) => (
                      <div key={payout.id} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {payout.paymentMethod === 'bank' ? '🏦' :
                             payout.paymentMethod === 'paypal' ? '💳' : '₿'}
                          </span>
                          <div>
                            <div className="font-medium text-white text-sm">€{payout.amount.toLocaleString()}</div>
                            <div className="text-[10px] text-zinc-600">
                              {new Date(payout.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          payout.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                          payout.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                          payout.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {payout.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Success Toast */}
            {payoutSuccess && (
              <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-4">
                <span>✓</span>
                <span>{payoutSuccess}</span>
                <button onClick={() => setPayoutSuccess(null)} className="ml-2 hover:opacity-70">×</button>
              </div>
            )}
          </div>
        )}

        {/* ACHIEVEMENTS TAB */}
        {activeTab === 'achievements' && (() => {
          // Calculate XP and level based on achievements
          const xpPerAchievement = 100;
          const totalXP = achievements.length * xpPerAchievement;
          const levelThresholds = [0, 200, 500, 900, 1400, 2000]; // XP needed for each level
          const currentLevel = levelThresholds.filter(t => totalXP >= t).length;
          const nextLevelXP = levelThresholds[currentLevel] || levelThresholds[levelThresholds.length - 1];
          const prevLevelXP = levelThresholds[currentLevel - 1] || 0;
          const xpProgress = nextLevelXP > prevLevelXP ? ((totalXP - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100 : 100;

          // Level rewards
          const levelRewards = [
            { level: 1, reward: t.dashboard.achievementsTab.bonus5, icon: '🎁', unlocked: currentLevel >= 1 },
            { level: 2, reward: t.dashboard.achievementsTab.bonus10, icon: '💵', unlocked: currentLevel >= 2 },
            { level: 3, reward: t.dashboard.achievementsTab.freeReset, icon: '🔄', unlocked: currentLevel >= 3 },
            { level: 4, reward: t.dashboard.achievementsTab.bonus25, icon: '💰', unlocked: currentLevel >= 4 },
            { level: 5, reward: t.dashboard.achievementsTab.vipStatus, icon: '👑', unlocked: currentLevel >= 5 },
            { level: 6, reward: t.dashboard.achievementsTab.bonus50Badge, icon: '🏆', unlocked: currentLevel >= 6 },
          ];

          // All achievements with XP values
          const allAchievements = [
            { icon: '🎯', name: t.dashboard.achievementsTab.firstBlood, desc: t.dashboard.achievementsTab.firstBloodDesc, xp: 50 },
            { icon: '🔟', name: t.dashboard.achievementsTab.gettingStarted, desc: t.dashboard.achievementsTab.gettingStartedDesc, xp: 75 },
            { icon: '💯', name: t.dashboard.achievementsTab.centuryClub, desc: t.dashboard.achievementsTab.centuryClubDesc, xp: 150 },
            { icon: '🔥', name: t.dashboard.achievementsTab.hotStreak, desc: t.dashboard.achievementsTab.hotStreakDesc, xp: 100 },
            { icon: '💥', name: t.dashboard.achievementsTab.onFire, desc: t.dashboard.achievementsTab.onFireDesc, xp: 200 },
            { icon: '🎰', name: t.dashboard.achievementsTab.highRoller, desc: t.dashboard.achievementsTab.highRollerDesc, xp: 125 },
            { icon: '💰', name: t.dashboard.achievementsTab.moneyMaker, desc: t.dashboard.achievementsTab.moneyMakerDesc, xp: 150 },
            { icon: '🤑', name: t.dashboard.achievementsTab.bigWinner, desc: t.dashboard.achievementsTab.bigWinnerDesc, xp: 250 },
            { icon: '🃏', name: t.dashboard.achievementsTab.parlayStarter, desc: t.dashboard.achievementsTab.parlayStarterDesc, xp: 75 },
            { icon: '🎲', name: t.dashboard.achievementsTab.parlayPro, desc: t.dashboard.achievementsTab.parlayProDesc, xp: 125 },
            { icon: '🏆', name: t.dashboard.achievementsTab.parlayMaster, desc: t.dashboard.achievementsTab.parlayMasterDesc, xp: 200 },
            { icon: '🥉', name: t.dashboard.achievementsTab.bronzeBadge, desc: t.dashboard.achievementsTab.bronzeBadgeDesc, xp: 50 },
            { icon: '🥈', name: t.dashboard.achievementsTab.silverStar, desc: t.dashboard.achievementsTab.silverStarDesc, xp: 100 },
            { icon: '🥇', name: t.dashboard.achievementsTab.goldGlory, desc: t.dashboard.achievementsTab.goldGloryDesc, xp: 150 },
            { icon: '👑', name: t.dashboard.achievementsTab.platinumCrown, desc: t.dashboard.achievementsTab.platinumCrownDesc, xp: 200 },
            { icon: '💎', name: t.dashboard.achievementsTab.diamondElite, desc: t.dashboard.achievementsTab.diamondEliteDesc, xp: 300 },
            { icon: '⭐', name: t.dashboard.achievementsTab.sharpBettor, desc: t.dashboard.achievementsTab.sharpBettorDesc, xp: 125 },
            { icon: '🌟', name: t.dashboard.achievementsTab.eliteBettor, desc: t.dashboard.achievementsTab.eliteBettorDesc, xp: 200 },
            { icon: '📈', name: t.dashboard.achievementsTab.streakKing, desc: t.dashboard.achievementsTab.streakKingDesc, xp: 175 },
            { icon: '🎮', name: t.dashboard.achievementsTab.challengeStarter, desc: t.dashboard.achievementsTab.challengeStarterDesc, xp: 100 },
            { icon: '🏅', name: t.dashboard.achievementsTab.challengeChampion, desc: t.dashboard.achievementsTab.challengeChampionDesc, xp: 250 },
          ];

          return (
          <div className="space-y-6">
            {/* Level & XP Header */}
            <div className="bg-gradient-to-r from-amber-900/30 to-yellow-800/20 border border-amber-700/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <span className="text-3xl font-bold text-black">{currentLevel}</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{t.dashboard.achievementsTab.level} {currentLevel}</h2>
                    <p className="text-amber-300/70">{t.dashboard.achievementsTab.achievementHunter}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-amber-400">{totalXP} XP</div>
                  <div className="text-sm text-zinc-400">{achievements.length} {t.dashboard.achievementsTab.achievements}</div>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">{t.dashboard.achievementsTab.level} {currentLevel}</span>
                  <span className="text-amber-400">{totalXP} / {nextLevelXP} XP</span>
                  <span className="text-zinc-400">{t.dashboard.achievementsTab.level} {currentLevel + 1}</span>
                </div>
                <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 transition-all duration-500 relative"
                    style={{ width: `${Math.min(xpProgress, 100)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-2 text-center">
                  {nextLevelXP - totalXP > 0 ? `${nextLevelXP - totalXP} ${t.dashboard.achievementsTab.xpToNextLevel}` : t.dashboard.achievementsTab.maxLevelReached}
                </p>
              </div>
            </div>

            {/* Level Rewards with Progress Bar */}
            <div className="bg-surface border border-zinc-800/50 rounded-2xl p-6">
              <h3 className="font-semibold mb-6 flex items-center gap-2">
                <span className="text-xl">🎁</span> {t.dashboard.achievementsTab.levelRewards}
              </h3>

              {/* Level Progress Track */}
              <div className="relative">
                {/* Progress bar background */}
                <div className="absolute top-8 left-0 right-0 h-2 bg-zinc-800 rounded-full mx-8 hidden md:block"></div>

                {/* Progress bar fill */}
                <div
                  className="absolute top-8 left-0 h-2 bg-gradient-to-r from-amber-500 to-teal-400 rounded-full mx-8 hidden md:block transition-all duration-500"
                  style={{ width: `calc(${Math.min((currentLevel / 6) * 100, 100)}% - 4rem)` }}
                ></div>

                {/* Level nodes */}
                <div className="flex justify-between items-start relative z-10">
                  {levelRewards.map((reward, index) => {
                    const isCurrentLevel = currentLevel === reward.level;
                    const isPastLevel = currentLevel > reward.level;
                    const isFutureLevel = currentLevel < reward.level;

                    // Calculate progress to this level
                    const levelXP = levelThresholds[reward.level] || 2000;
                    const prevLevelXP = levelThresholds[reward.level - 1] || 0;
                    const progressToLevel = isFutureLevel && currentLevel === reward.level - 1
                      ? Math.min(((totalXP - prevLevelXP) / (levelXP - prevLevelXP)) * 100, 100)
                      : 0;

                    return (
                      <div key={reward.level} className="flex flex-col items-center" style={{ width: '16.666%' }}>
                        {/* Level circle */}
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all ${
                            isPastLevel
                              ? 'bg-gradient-to-br from-teal-500 to-emerald-500 shadow-lg shadow-teal-500/30'
                              : isCurrentLevel
                              ? 'bg-gradient-to-br from-amber-500 to-yellow-500 shadow-lg shadow-amber-500/30 ring-4 ring-amber-400/30'
                              : 'bg-zinc-800 border-2 border-zinc-700'
                          }`}
                        >
                          {isPastLevel ? (
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span className={isCurrentLevel ? '' : 'grayscale opacity-50'}>{reward.icon}</span>
                          )}
                        </div>

                        {/* Level number */}
                        <div className={`mt-2 text-sm font-bold ${
                          isPastLevel ? 'text-teal-400' : isCurrentLevel ? 'text-amber-400' : 'text-zinc-500'
                        }`}>
                          {t.dashboard.achievementsTab.lvl} {reward.level}
                        </div>

                        {/* XP required */}
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {levelThresholds[reward.level] || 2000} XP
                        </div>

                        {/* Reward */}
                        <div className={`mt-2 text-xs font-medium text-center px-2 py-1 rounded-lg ${
                          isPastLevel
                            ? 'bg-teal-500/20 text-teal-400'
                            : isCurrentLevel
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {reward.reward}
                        </div>

                        {/* Status badge */}
                        {isPastLevel && (
                          <div className="mt-2 px-2 py-0.5 bg-teal-500/20 text-teal-400 text-xs rounded-full">
                            {t.dashboard.achievementsTab.claimed}
                          </div>
                        )}
                        {isCurrentLevel && (
                          <div className="mt-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full animate-pulse">
                            {t.dashboard.achievementsTab.current}
                          </div>
                        )}
                        {isFutureLevel && (
                          <div className="mt-2 px-2 py-0.5 bg-zinc-700/50 text-zinc-500 text-xs rounded-full">
                            {t.dashboard.achievementsTab.locked}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile-friendly progress */}
              <div className="mt-6 md:hidden">
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span>{t.dashboard.achievementsTab.level} {currentLevel}</span>
                  <span>{t.dashboard.achievementsTab.level} {Math.min(currentLevel + 1, 6)}</span>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-teal-400 transition-all duration-500"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Achievements Grid */}
            <div className="bg-surface border border-zinc-800/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg">{t.dashboard.achievementsTab.allAchievements}</h3>
                <span className="text-sm text-zinc-400">{achievements.length} / {allAchievements.length} {t.dashboard.achievementsTab.unlocked}</span>
              </div>

              {loadingAchievements ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-400"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {/* Show unlocked achievements first */}
                  {achievements.map((achievement) => {
                    const achData = allAchievements.find(a => a.name === achievement.name);
                    return (
                    <div
                      key={achievement.id}
                      className="bg-gradient-to-br from-amber-900/30 to-yellow-800/20 border border-amber-600/40 rounded-xl p-4 text-center hover:scale-105 transition-transform cursor-default shadow-lg shadow-amber-900/10"
                    >
                      <div className="text-4xl mb-2">{achievement.icon}</div>
                      <div className="text-sm font-semibold text-white mb-1">{achievement.name}</div>
                      <div className="text-xs text-zinc-400 mb-2">{achievement.description}</div>
                      <div className="flex items-center justify-center gap-2">
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                          +{achData?.xp || 100} XP
                        </span>
                      </div>
                    </div>
                  )})}

                  {/* Locked achievements */}
                  {allAchievements.filter(locked => !achievements.some(a => a.name === locked.name)).map((achievement, i) => (
                    <div
                      key={`locked-${i}`}
                      className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-4 text-center opacity-50 hover:opacity-70 transition-opacity"
                      title={achievement.desc}
                    >
                      <div className="text-4xl mb-2 grayscale">{achievement.icon}</div>
                      <div className="text-sm font-medium text-zinc-400 mb-1">{achievement.name}</div>
                      <div className="text-xs text-zinc-500 mb-2">{achievement.desc}</div>
                      <div className="flex items-center justify-center gap-2">
                        <span className="px-2 py-0.5 bg-zinc-700/50 text-zinc-500 text-xs rounded-full">
                          +{achievement.xp} XP
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stats Summary */}
            <div className="bg-surface border border-zinc-800/50 rounded-2xl p-6">
              <h3 className="font-semibold mb-4">{t.dashboard.achievementsTab.progressSummary}</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-400">{currentLevel}</div>
                  <div className="text-xs text-zinc-500 mt-1">{t.dashboard.achievementsTab.currentLevel}</div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-teal-400">{totalXP}</div>
                  <div className="text-xs text-zinc-500 mt-1">{t.dashboard.achievementsTab.totalXP}</div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">{achievements.length}</div>
                  <div className="text-xs text-zinc-500 mt-1">{t.dashboard.achievementsTab.achievements}</div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{levelRewards.filter(r => r.unlocked).length}</div>
                  <div className="text-xs text-zinc-500 mt-1">{t.dashboard.achievementsTab.rewardsClaimed}</div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-zinc-400">{Math.round((achievements.length / allAchievements.length) * 100)}%</div>
                  <div className="text-xs text-zinc-500 mt-1">{t.dashboard.achievementsTab.completion}</div>
                </div>
              </div>
            </div>
          </div>
          );
        })()}

        {/* REFERRAL TAB */}
        {activeTab === 'referral' && (
          <div className="space-y-6">
            {loadingReferral ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-zinc-500">{t.dashboard.referralTab.loadingReferralData}</div>
              </div>
            ) : referralData ? (
              <>
                {/* Referral Link Card */}
                <div className="bg-gradient-to-br from-teal-900/30 to-teal-800/10 border border-teal-500/30 rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-white mb-4">{t.dashboard.referralTab.yourReferralLink}</h2>
                  <div className="flex gap-3 mb-4">
                    <input
                      type="text"
                      value={referralData.referralLink}
                      readOnly
                      className="flex-1 bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white font-mono text-sm"
                    />
                    <button
                      onClick={() => copyReferralToClipboard(referralData.referralLink)}
                      className={`px-6 py-3 rounded-xl font-medium transition-all ${
                        referralCopied
                          ? 'bg-green-600 text-white'
                          : 'bg-teal-600 hover:bg-teal-700 text-white'
                      }`}
                    >
                      {referralCopied ? t.dashboard.referralTab.copied : t.dashboard.referralTab.copy}
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-zinc-400">{t.dashboard.referralTab.yourCode}</span>
                    <span className="bg-zinc-800 px-3 py-1 rounded-lg font-mono text-teal-400 font-bold">
                      {referralData.referralCode}
                    </span>
                    <button
                      onClick={() => copyReferralToClipboard(referralData.referralCode)}
                      className="text-zinc-400 hover:text-white"
                    >
                      {t.dashboard.referralTab.copyCode}
                    </button>
                  </div>
                </div>

                {/* Two-Sided Benefits */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">💰</span>
                      <h3 className="font-bold text-white">{t.dashboard.referralTab.youGet15Cashback}</h3>
                    </div>
                    <p className="text-sm text-zinc-400">
                      {t.dashboard.referralTab.youGetDescription}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🎁</span>
                      <h3 className="font-bold text-white">{t.dashboard.referralTab.theyGet15Off}</h3>
                    </div>
                    <p className="text-sm text-zinc-400">
                      {t.dashboard.referralTab.theyGetDescription}
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-surface border border-zinc-800 rounded-xl p-4">
                    <div className="text-3xl font-bold text-white">{referralData.stats.totalReferrals}</div>
                    <div className="text-sm text-zinc-400">{t.dashboard.referralTab.totalReferrals}</div>
                  </div>
                  <div className="bg-surface border border-zinc-800 rounded-xl p-4">
                    <div className="text-3xl font-bold text-teal-400">{referralData.stats.qualifiedReferrals}</div>
                    <div className="text-sm text-zinc-400">{t.dashboard.referralTab.qualified}</div>
                  </div>
                  <div className="bg-surface border border-zinc-800 rounded-xl p-4">
                    <div className="text-3xl font-bold text-green-400">€{referralData.stats.totalEarned.toFixed(2)}</div>
                    <div className="text-sm text-zinc-400">{t.dashboard.referralTab.totalEarned}</div>
                  </div>
                  <div className="bg-surface border border-zinc-800 rounded-xl p-4">
                    <div className="text-3xl font-bold text-yellow-400">€{referralData.stats.pendingRewards.toFixed(2)}</div>
                    <div className="text-sm text-zinc-400">{t.dashboard.referralTab.pendingRewards}</div>
                  </div>
                </div>

                {/* How It Works */}
                <div className="bg-surface border border-zinc-800 rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-white mb-4">{t.dashboard.referralTab.howItWorks}</h2>
                  <div className="grid md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-xl font-bold text-teal-400">1</span>
                      </div>
                      <h3 className="font-semibold text-white mb-1">{t.dashboard.referralTab.shareYourLink}</h3>
                      <p className="text-sm text-zinc-400">{t.dashboard.referralTab.shareDescription}</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-xl font-bold text-teal-400">2</span>
                      </div>
                      <h3 className="font-semibold text-white mb-1">{t.dashboard.referralTab.theySignUp}</h3>
                      <p className="text-sm text-zinc-400">{t.dashboard.referralTab.signUpDescription}</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-xl font-bold text-purple-400">3</span>
                      </div>
                      <h3 className="font-semibold text-white mb-1">{t.dashboard.referralTab.theySave15}</h3>
                      <p className="text-sm text-zinc-400">{t.dashboard.referralTab.saveDescription}</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-xl font-bold text-green-400">4</span>
                      </div>
                      <h3 className="font-semibold text-white mb-1">{t.dashboard.referralTab.youEarn15}</h3>
                      <p className="text-sm text-zinc-400">{t.dashboard.referralTab.earnDescription}</p>
                    </div>
                  </div>
                </div>

                {/* Referrals List */}
                <div className="bg-surface border border-zinc-800 rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-white mb-4">{t.dashboard.referralTab.yourReferrals}</h2>
                  {referralData.referrals.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">👥</div>
                      <p className="text-zinc-400">{t.dashboard.referralTab.noReferrals}</p>
                      <p className="text-sm text-zinc-500 mt-1">{t.dashboard.referralTab.shareToStart}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {referralData.referrals.map((referral) => (
                        <div
                          key={referral.id}
                          className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{referral.referred.avatar}</span>
                            <div>
                              <div className="font-medium text-white">{referral.referred.username}</div>
                              <div className="text-xs text-zinc-500">
                                Joined {new Date(referral.referred.joinedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${
                              referral.status === 'qualified' || referral.status === 'paid'
                                ? 'text-green-400'
                                : 'text-yellow-400'
                            }`}>
                              {referral.status === 'pending' && 'Pending'}
                              {referral.status === 'qualified' && `+€${referral.rewardAmount.toFixed(2)}`}
                              {referral.status === 'paid' && `+€${referral.rewardAmount.toFixed(2)} (Paid)`}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {referral.status === 'pending'
                                ? 'Waiting for first purchase'
                                : referral.qualifiedAt && `Qualified ${new Date(referral.qualifiedAt).toLocaleDateString()}`
                              }
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Share Buttons */}
                <div className="flex flex-wrap gap-3 justify-center">
                  <a
                    href={`https://twitter.com/intent/tweet?text=Join%20me%20on%20Zalogche%20and%20take%20on%20sports%20betting%20challenges!%20${encodeURIComponent(referralData.referralLink)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white rounded-lg font-medium transition-colors"
                  >
                    Share on Twitter
                  </a>
                  <a
                    href={`https://wa.me/?text=Join%20me%20on%20Zalogche%20and%20take%20on%20sports%20betting%20challenges!%20${encodeURIComponent(referralData.referralLink)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg font-medium transition-colors"
                  >
                    Share on WhatsApp
                  </a>
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(referralData.referralLink)}&text=Join%20me%20on%20Zalogche!`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg font-medium transition-colors"
                  >
                    Share on Telegram
                  </a>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-zinc-400">Failed to load referral data</div>
                <button
                  onClick={fetchReferralData}
                  className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* FAQ TAB */}
        {activeTab === 'faq' && (
          <div className="space-y-6">
            <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">{t.dashboard.faqTab.title}</h2>
              <div className="space-y-3">
                {[
                  { q: t.dashboard.faqTab.faq1q, a: t.dashboard.faqTab.faq1a },
                  { q: t.dashboard.faqTab.faq2q, a: t.dashboard.faqTab.faq2a },
                  { q: t.dashboard.faqTab.faq3q, a: t.dashboard.faqTab.faq3a },
                  { q: t.dashboard.faqTab.faq4q, a: t.dashboard.faqTab.faq4a },
                  { q: t.dashboard.faqTab.faq5q, a: t.dashboard.faqTab.faq5a },
                  { q: t.dashboard.faqTab.faq6q, a: t.dashboard.faqTab.faq6a },
                  { q: t.dashboard.faqTab.faq7q, a: t.dashboard.faqTab.faq7a },
                  { q: t.dashboard.faqTab.faq8q, a: t.dashboard.faqTab.faq8a },
                ].map((faq, idx) => (
                  <div key={idx} className="border border-zinc-800/50 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-900/50 transition-all"
                    >
                      <span className="text-white font-medium">{faq.q}</span>
                      <span className={`text-teal-400 transition-transform ${expandedFaq === idx ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>
                    {expandedFaq === idx && (
                      <div className="px-5 pb-4 text-zinc-400 text-sm">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Support */}
            <div className="bg-surface border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">{t.dashboard.faqTab.stillHaveQuestions}</h2>
              <p className="text-zinc-400 mb-4">{t.dashboard.faqTab.supportDescription}</p>
              <a
                href="mailto:support@zalogche.com"
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors"
              >
                <span>📧</span> {t.dashboard.faqTab.contactSupport}
              </a>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-zinc-800/50 text-center">
        <p className="text-teal-400 font-semibold tracking-tight">ZALOGCHE</p>
        <p className="text-zinc-500 text-xs mt-1">{t.dashboard.footer.forEntertainment} • {t.dashboard.footer.gambleResponsibly}</p>
      </footer>

      {/* Bet Placement Modal */}
      {betModalOpen && selectedEvent && swarmResult && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-teal-950 to-zinc-950 border border-teal-800/50 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-teal-900/20">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">{t.dashboard.modals.placeYourBet}</h3>
              <button
                onClick={() => {
                  setBetModalOpen(false);
                  setBetSuccess(false);
                  setBetStake(10);
                  setSelectedBetChallengeIds([]);
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
                <p className="text-zinc-400 text-sm">Track your bet in the Dashboard</p>
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

                {/* Challenge Selector - Only show if user has multiple challenges */}
                {activeChallenges.length > 1 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Apply to Challenges</label>
                    <div className="space-y-2">
                      {activeChallenges.map((challenge) => {
                        const isSelected = selectedBetChallengeIds.includes(challenge.id);
                        const oddsDecimal = (() => {
                          const selections: Record<string, { odds: number[] }> = {};
                          swarmResult.analyses.forEach(a => {
                            if (a.betSelection) {
                              if (!selections[a.betSelection]) selections[a.betSelection] = { odds: [] };
                              if (a.betOdds) selections[a.betSelection].odds.push(a.betOdds);
                            }
                          });
                          const topSelection = Object.entries(selections).sort((a, b) => b[1].odds.length - a[1].odds.length)[0];
                          return topSelection?.[1].odds.length
                            ? topSelection[1].odds.reduce((a, b) => a + b, 0) / topSelection[1].odds.length
                            : 1.91;
                        })();
                        const meetsMinOdds = oddsDecimal >= challenge.minOdds;

                        return (
                          <button
                            key={challenge.id}
                            onClick={() => {
                              if (!meetsMinOdds) return;
                              setSelectedBetChallengeIds(prev =>
                                prev.includes(challenge.id)
                                  ? prev.filter(id => id !== challenge.id)
                                  : [...prev, challenge.id]
                              );
                            }}
                            disabled={!meetsMinOdds}
                            className={`w-full p-3 rounded-lg border transition-all flex items-center justify-between ${
                              !meetsMinOdds
                                ? 'bg-zinc-900/30 border-zinc-800/50 opacity-50 cursor-not-allowed'
                                : isSelected
                                ? 'bg-teal-900/40 border-teal-500'
                                : 'bg-zinc-900/50 border-zinc-700/50 hover:border-teal-600/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected ? 'bg-teal-500 border-teal-500' : 'border-zinc-600'
                              }`}>
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="text-left">
                                <div className="font-semibold text-white">€{challenge.tier.toLocaleString()}</div>
                                <div className="text-xs text-zinc-400">
                                  {challenge.difficulty === 'pro' ? '⚡ Pro' : '🎯 Beginner'} • Min {challenge.minOdds.toFixed(2)} odds
                                </div>
                              </div>
                            </div>
                            {!meetsMinOdds && (
                              <span className="text-xs text-red-400">Odds too low</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {selectedBetChallengeIds.length === 0 && (
                      <p className="text-xs text-amber-400 mt-2">⚠️ Select at least one challenge or bet will apply to all eligible</p>
                    )}
                  </div>
                )}

                {/* Single challenge info - Show when user has exactly 1 challenge */}
                {activeChallenges.length === 1 && (
                  <div className="mb-6 p-3 bg-teal-900/20 border border-teal-800/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-teal-400">🎯</span>
                      <span className="text-sm text-zinc-300">
                        Bet applies to your €{activeChallenges[0].tier.toLocaleString()} {activeChallenges[0].difficulty === 'pro' ? 'Pro' : 'Beginner'} challenge
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setBetModalOpen(false);
                      setBetStake(10);
                      setSelectedBetChallengeIds([]);
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
                  setSelectedBetChallengeIds([]);
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
                <p className="text-zinc-400 text-sm">Track your bet in the Dashboard</p>
              </div>
            ) : (
              /* Bet Form */
              <>
                {/* Error Message */}
                {betError && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {betError}
                  </div>
                )}

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

                {/* Challenge/Account Selector */}
                {activeChallenges.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Apply to Challenge</label>
                    <div className="space-y-2">
                      {activeChallenges.map((challenge) => {
                        const isSelected = selectedBetChallengeIds.includes(challenge.id);
                        const meetsMinOdds = quickBetSelection.odds >= challenge.minOdds;
                        const difficultyLabel = challenge.difficulty === 'pro' ? 'Pro' : 'Beginner';

                        return (
                          <button
                            key={challenge.id}
                            onClick={() => {
                              if (!meetsMinOdds) return;
                              if (isSelected) {
                                setSelectedBetChallengeIds(prev => prev.filter(id => id !== challenge.id));
                              } else {
                                setSelectedBetChallengeIds(prev => [...prev, challenge.id]);
                              }
                            }}
                            disabled={!meetsMinOdds}
                            className={`w-full p-3 rounded-xl border transition-all text-left ${
                              !meetsMinOdds
                                ? 'border-red-800/30 bg-red-900/10 opacity-50 cursor-not-allowed'
                                : isSelected
                                  ? 'border-teal-500 bg-teal-900/30'
                                  : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                  isSelected ? 'border-teal-500 bg-teal-500' : 'border-zinc-600'
                                }`}>
                                  {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                <div>
                                  <div className="text-white font-medium">
                                    €{(challenge.tier / 1000)}K {difficultyLabel}
                                  </div>
                                  <div className="text-xs text-zinc-400">
                                    Account {challenge.id.slice(-6).toLowerCase()} • Min odds: {challenge.minOdds.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                              {!meetsMinOdds && (
                                <span className="text-xs text-red-400">Odds too low</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {selectedBetChallengeIds.length === 0 && (
                      <p className="text-xs text-zinc-500 mt-2">Bet will be tracked but not applied to any challenge</p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setBetModalOpen(false);
                      setBetStake(10);
                      setQuickBetEvent(null);
                      setQuickBetSelection(null);
                      setSelectedBetChallengeIds([]);
                      setBetError(null);
                    }}
                    className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleQuickBetPlace}
                    disabled={placingBet}
                    className="flex-[2] py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                      <span>Place Bet</span>
                    )}
                  </button>
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
                <p className="text-zinc-400 text-sm">Track your parlay in the Dashboard</p>
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
                  setClaimedRewards(prev => [...prev, rewardToClaim!]);
                  setRewardModalOpen(false);
                  // Navigate to rewards tab and refresh payouts
                  setActiveTab('rewards');
                  fetchPayouts();
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

      {/* CHALLENGE PURCHASE MODAL */}
      {purchaseModalOpen && selectedChallenge && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3" onClick={() => setPurchaseModalOpen(false)}>
          <div className="bg-gradient-to-b from-[#1a1a1a] to-[#111111] border border-zinc-800 rounded-2xl p-8 w-full max-w-[520px] max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(45,180,180,0.12),transparent_60%)] pointer-events-none rounded-xl"></div>
            <button onClick={() => setPurchaseModalOpen(false)} className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors z-10">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="relative">
              {/* Difficulty Selector */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => setSelectedDifficulty('beginner')}
                  className={`p-2.5 rounded-lg border transition-all text-center ${
                    selectedDifficulty === 'beginner'
                      ? 'bg-teal-500/20 border-teal-500'
                      : 'bg-zinc-900/50 border-zinc-700/50 hover:border-teal-600/50'
                  }`}
                >
                  <div className="text-xl">🎯</div>
                  <div className={`font-bold text-sm ${selectedDifficulty === 'beginner' ? 'text-teal-400' : 'text-white'}`}>Beginner</div>
                  <div className="text-[10px] text-zinc-400">1.5x odds • 3-15 wins</div>
                </button>
                <button
                  onClick={() => setSelectedDifficulty('pro')}
                  className={`p-2.5 rounded-lg border transition-all text-center ${
                    selectedDifficulty === 'pro'
                      ? 'bg-amber-500/20 border-amber-500'
                      : 'bg-zinc-900/50 border-zinc-700/50 hover:border-amber-600/50'
                  }`}
                >
                  <div className="text-xl">⚡</div>
                  <div className={`font-bold text-sm ${selectedDifficulty === 'pro' ? 'text-amber-400' : 'text-white'}`}>Pro</div>
                  <div className="text-[10px] text-zinc-400">2.0x odds • 2-9 wins</div>
                </button>
              </div>

              {/* Challenge Info */}
              <div className="bg-zinc-900/70 border border-zinc-700/50 rounded-lg p-3 mb-3">
                <div className="text-center mb-2">
                  <div className="text-2xl font-black text-white">€{selectedChallenge.size.toLocaleString()}</div>
                  <div className="text-[10px] font-bold text-teal-400 tracking-widest uppercase">Streak Challenge</div>
                </div>
                {/* Level Rewards */}
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {(selectedDifficulty === 'beginner'
                    ? [{ lvl: 1, wins: 3 }, { lvl: 2, wins: 6 }, { lvl: 3, wins: 10 }, { lvl: 4, wins: 15 }]
                    : [{ lvl: 1, wins: 2 }, { lvl: 2, wins: 4 }, { lvl: 3, wins: 6 }, { lvl: 4, wins: 9 }]
                  ).map((l, i) => {
                    const rewards = selectedChallenge.size === 1000 ? [3, 100, 500, 1000] :
                                   selectedChallenge.size === 5000 ? [20, 350, 2000, 5000] :
                                   selectedChallenge.size === 10000 ? [60, 700, 4500, 10000] :
                                   selectedChallenge.size === 25000 ? [100, 1400, 10000, 25000] :
                                   selectedChallenge.size === 50000 ? [150, 2800, 20000, 50000] :
                                   [250, 5000, 50000, 100000];
                    return (
                      <div key={l.lvl} className="bg-zinc-800/50 rounded p-1.5 text-center">
                        <div className="text-[9px] text-zinc-500">Lvl {l.lvl}</div>
                        <div className="text-white font-bold text-xs">€{rewards[i].toLocaleString()}</div>
                        <div className="text-[9px] text-zinc-400">{l.wins} wins</div>
                      </div>
                    );
                  })}
                </div>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-zinc-800 text-center">
                  <div>
                    <div className="text-[10px] text-zinc-500">Max Payout</div>
                    <div className="text-teal-400 font-semibold text-sm">€{selectedChallenge.profit.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500">Duration</div>
                    <div className="text-white font-semibold text-sm">45 days</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500">Reset Fee</div>
                    <div className="text-white font-semibold text-sm">${selectedChallenge.resetFee}</div>
                  </div>
                </div>
              </div>

              {/* Payment Section */}
              <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400 text-sm">Total</span>
                  <span className="text-xl font-black text-teal-400">${selectedChallenge.cost}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`p-2.5 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'card'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                        : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-blue-600/50'
                    }`}
                  >
                    <span>💳</span>
                    <span className="font-medium text-sm">Card</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('crypto')}
                    className={`p-2.5 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'crypto'
                        ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                        : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-orange-600/50'
                    }`}
                  >
                    <span>₿</span>
                    <span className="font-medium text-sm">Crypto</span>
                  </button>
                </div>
              </div>

              {/* Terms checkbox */}
              <label className="flex items-start gap-2 mb-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5 w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-teal-500 focus:ring-teal-500 focus:ring-offset-0" />
                <span className="text-[11px] text-zinc-500 leading-snug">I understand that losing a bet resets my streak, but earned rewards are kept.</span>
              </label>

              {/* Error/Status Messages */}
              {challengeError && (
                <div className="mb-2 p-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-xs">
                  {challengeError}
                </div>
              )}
              {!canCreateMoreChallenges && (
                <div className="mb-2 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400 text-xs">
                  Max {maxChallenges} active challenges reached.
                </div>
              )}
              {activeChallenges.length > 0 && canCreateMoreChallenges && (
                <div className="mb-2 p-2 bg-teal-500/20 border border-teal-500/50 rounded-lg text-teal-400 text-xs">
                  {challengeCount}/{maxChallenges} active • {maxChallenges - challengeCount} slots left
                </div>
              )}

              {/* Purchase Button */}
              <button
                className={`w-full py-3 rounded-lg font-bold transition-all ${
                  purchasingChallenge || !canCreateMoreChallenges
                    ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white shadow-lg shadow-teal-500/25'
                }`}
                onClick={handlePurchase}
                disabled={purchasingChallenge || !canCreateMoreChallenges}
              >
                {purchasingChallenge ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : !canCreateMoreChallenges ? (
                  'Max Challenges Reached'
                ) : paymentMethod === 'crypto' ? (
                  `₿ Pay with Crypto - $${selectedChallenge.cost}`
                ) : (
                  `💳 Pay with Card - $${selectedChallenge.cost}`
                )}
              </button>
              <p className="text-center text-[10px] text-zinc-500 mt-2">
                Secure checkout via {paymentMethod === 'crypto' ? 'Confirmo' : 'Stripe'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PAYOUT REQUEST MODAL */}
      {payoutModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setPayoutModalOpen(false); setPayoutError(null); }}>
          <div
            className="bg-gradient-to-b from-emerald-950/80 via-emerald-900/60 to-[#111111] border border-emerald-700/40 rounded-2xl p-6 w-full max-w-md relative overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.15),transparent_60%)]"></div>

            {/* Close button */}
            <button
              onClick={() => { setPayoutModalOpen(false); setPayoutError(null); }}
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
                <p className="text-emerald-400 text-sm mt-1">Available: €{availableBalance.toLocaleString()}</p>
              </div>

              {/* Error Message */}
              {payoutError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {payoutError}
                </div>
              )}

              {/* Amount Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-300 mb-2">Withdrawal Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-xl">€</span>
                  <input
                    type="number"
                    min="10"
                    max={availableBalance}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(Math.max(10, Math.min(availableBalance, Number(e.target.value))))}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900/80 border border-emerald-800/30 rounded-xl text-white font-mono text-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  />
                </div>
                <div className="text-xs text-zinc-500 mt-1">Minimum withdrawal: €10</div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[10, 50, 100, availableBalance].map((amount, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPayoutAmount(Math.min(amount, availableBalance))}
                    disabled={amount > availableBalance}
                    className={`py-2 rounded-lg text-sm font-medium transition-all ${
                      payoutAmount === amount
                        ? 'bg-emerald-600 text-white'
                        : amount > availableBalance
                          ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {idx === 3 ? 'Max' : `€${amount}`}
                  </button>
                ))}
              </div>

              {/* Payment Method Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-300 mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bank', label: 'Bank', icon: '🏦' },
                    { id: 'paypal', label: 'PayPal', icon: '💳' },
                    { id: 'crypto', label: 'Crypto', icon: '₿' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPayoutMethod(method.id as 'bank' | 'paypal' | 'crypto')}
                      className={`py-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                        payoutMethod === method.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      <span className="text-lg">{method.icon}</span>
                      <span>{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Details Form */}
              <div className="mb-4 space-y-3">
                {payoutMethod === 'bank' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">IBAN</label>
                      <input
                        type="text"
                        placeholder="DE89 3704 0044 0532 0130 00"
                        value={payoutDetails.iban || ''}
                        onChange={(e) => setPayoutDetails(prev => ({ ...prev, iban: e.target.value }))}
                        className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Account Holder Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={payoutDetails.accountName || ''}
                        onChange={(e) => setPayoutDetails(prev => ({ ...prev, accountName: e.target.value }))}
                        className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Bank Name (optional)</label>
                      <input
                        type="text"
                        placeholder="Deutsche Bank"
                        value={payoutDetails.bankName || ''}
                        onChange={(e) => setPayoutDetails(prev => ({ ...prev, bankName: e.target.value }))}
                        className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                  </>
                )}

                {payoutMethod === 'paypal' && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">PayPal Email</label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={payoutDetails.paypalEmail || ''}
                      onChange={(e) => setPayoutDetails(prev => ({ ...prev, paypalEmail: e.target.value }))}
                      className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                )}

                {payoutMethod === 'crypto' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Network</label>
                      <select
                        value={payoutDetails.network || ''}
                        onChange={(e) => setPayoutDetails(prev => ({ ...prev, network: e.target.value }))}
                        className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <option value="">Select network</option>
                        <option value="bitcoin">Bitcoin (BTC)</option>
                        <option value="ethereum">Ethereum (ETH)</option>
                        <option value="usdt-trc20">USDT (TRC-20)</option>
                        <option value="usdt-erc20">USDT (ERC-20)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Wallet Address</label>
                      <input
                        type="text"
                        placeholder="Enter your wallet address"
                        value={payoutDetails.walletAddress || ''}
                        onChange={(e) => setPayoutDetails(prev => ({ ...prev, walletAddress: e.target.value }))}
                        className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Summary */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-400 text-sm">Withdrawal Amount</span>
                  <span className="text-white font-mono">€{payoutAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 text-sm">Remaining Balance</span>
                  <span className="text-emerald-400 font-mono">€{(availableBalance - payoutAmount).toLocaleString()}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={submitPayoutRequest}
                disabled={payoutAmount < 10 || payoutAmount > availableBalance || submittingPayout}
                className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submittingPayout ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  'Submit Payout Request'
                )}
              </button>

              <p className="text-xs text-zinc-500 text-center mt-3">
                Payouts are processed within 1-3 business days.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUsername={(session?.user as any)?.username || null}
        currentAvatar={(session?.user as any)?.avatar || '🎲'}
        onSave={handleProfileSave}
      />
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-teal-400 text-xl">Loading...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
