'use client';

// ==========================================
// EVENT DETAIL PAGE
// Shows all available markets for an event
// ==========================================

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Outcome {
  name: string;
  price: number;
  point?: number;
}

interface Market {
  key: string;
  label: string;
  outcomes: Outcome[];
  bookmakers: Array<{
    key: string;
    title: string;
    lastUpdate: string;
    outcomes: Outcome[];
  }>;
}

interface EventData {
  event: {
    id: string;
    sportKey: string;
    sportTitle: string;
    commenceTime: string;
    homeTeam: string;
    awayTeam: string;
  };
  markets: Record<string, Market>;
  availableMarkets: Record<string, string[]>;
  marketLabels: Record<string, string>;
}

// Sport emoji mapping
const SPORT_EMOJIS: Record<string, string> = {
  basketball: '🏀',
  soccer: '⚽',
  americanfootball: '🏈',
  baseball: '⚾',
  icehockey: '🏒',
  tennis: '🎾',
  mma: '🥊',
};

export default function EventDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const eventId = params.eventId as string;
  const sport = searchParams.get('sport') || '';

  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarketGroup, setSelectedMarketGroup] = useState<string>('Main Markets');
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [selectedBet, setSelectedBet] = useState<{
    market: string;
    outcome: string;
    odds: number;
    point?: number;
  } | null>(null);
  const [betStake, setBetStake] = useState(10);
  const [placingBet, setPlacingBet] = useState(false);
  const [betSuccess, setBetSuccess] = useState(false);
  const [betError, setBetError] = useState<string | null>(null);

  // Fetch event data
  useEffect(() => {
    if (!eventId || !sport) return;

    const fetchEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/sports/events/${eventId}?sport=${sport}&props=true`);
        if (!res.ok) {
          throw new Error('Failed to load event');
        }
        const data = await res.json();
        setEventData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, sport]);

  // Get sport emoji
  const getSportEmoji = (sportKey: string) => {
    for (const [key, emoji] of Object.entries(SPORT_EMOJIS)) {
      if (sportKey.includes(key)) return emoji;
    }
    return '🎯';
  };

  // Open bet modal
  const openBetModal = (market: string, outcome: Outcome) => {
    setSelectedBet({
      market,
      outcome: outcome.name,
      odds: outcome.price,
      point: outcome.point,
    });
    setBetModalOpen(true);
    setBetSuccess(false);
    setBetError(null);
  };

  // Place bet
  const placeBet = async () => {
    if (!selectedBet || !eventData || !session) return;

    setPlacingBet(true);
    setBetError(null);

    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: eventData.event.id,
          sport: eventData.event.sportKey,
          league: eventData.event.sportTitle,
          matchup: `${eventData.event.awayTeam} @ ${eventData.event.homeTeam}`,
          betType: selectedBet.market,
          selection: selectedBet.point
            ? `${selectedBet.outcome} ${selectedBet.point > 0 ? '+' : ''}${selectedBet.point}`
            : selectedBet.outcome,
          odds: selectedBet.odds.toFixed(2),
          oddsDecimal: selectedBet.odds,
          stake: betStake,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to place bet');
      }

      setBetSuccess(true);
      setTimeout(() => {
        setBetModalOpen(false);
        setBetSuccess(false);
      }, 2000);
    } catch (err) {
      setBetError(err instanceof Error ? err.message : 'Failed to place bet');
    } finally {
      setPlacingBet(false);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === date.toDateString();

    if (isToday) return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    if (isTomorrow) return `Tomorrow, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Group markets by category
  const getMarketGroups = () => {
    if (!eventData?.availableMarkets) return {};
    return eventData.availableMarkets;
  };

  // Get markets for current group
  const getMarketsForGroup = () => {
    if (!eventData?.markets || !eventData?.availableMarkets) return [];
    const marketKeys = eventData.availableMarkets[selectedMarketGroup] || [];
    return marketKeys
      .filter(key => eventData.markets[key])
      .map(key => eventData.markets[key]);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-teal-500 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-zinc-400">Loading event...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !eventData) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-white mb-2">Event Not Found</h2>
          <p className="text-zinc-400 mb-6">{error || 'Could not load event data'}</p>
          <Link
            href="/"
            className="px-6 py-3 bg-teal-500 text-dark font-semibold rounded-xl hover:bg-teal-400 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { event, markets } = eventData;
  const marketGroups = getMarketGroups();
  const currentMarkets = getMarketsForGroup();

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <span>{getSportEmoji(event.sportKey)}</span>
                <span>{event.sportTitle}</span>
              </div>
              <h1 className="text-lg font-bold text-white truncate">
                {event.awayTeam} @ {event.homeTeam}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Event Info Card */}
        <div className="bg-surface border border-zinc-800 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Teams */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-lg font-bold text-zinc-400 border border-zinc-700">
                      A
                    </div>
                    <div>
                      <div className="font-semibold text-white text-lg">{event.awayTeam}</div>
                      <div className="text-xs text-zinc-500">Away</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-teal-900/30 flex items-center justify-center text-lg font-bold text-teal-400 border border-teal-500/30">
                      H
                    </div>
                    <div>
                      <div className="font-semibold text-white text-lg">{event.homeTeam}</div>
                      <div className="text-xs text-zinc-500">Home</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="text-right">
              <div className="text-sm text-zinc-500 mb-1">Kick-off</div>
              <div className="text-xl font-bold text-teal-400">{formatDate(event.commenceTime)}</div>
            </div>
          </div>
        </div>

        {/* Market Group Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {Object.keys(marketGroups).map(group => (
            <button
              key={group}
              onClick={() => setSelectedMarketGroup(group)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedMarketGroup === group
                  ? 'bg-teal-500 text-dark'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-white'
              }`}
            >
              {group}
            </button>
          ))}
        </div>

        {/* Markets Grid */}
        {currentMarkets.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-white mb-2">No Markets Available</h3>
            <p className="text-zinc-500">No odds available for this category yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {currentMarkets.map(market => (
              <div
                key={market.key}
                className="bg-surface border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors"
              >
                {/* Market Header */}
                <div className="px-4 py-3 bg-zinc-800/30 border-b border-zinc-800">
                  <h3 className="font-semibold text-white text-sm">{market.label}</h3>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {market.bookmakers?.length || 0} bookmaker{market.bookmakers?.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Outcomes */}
                <div className="p-3 space-y-2">
                  {market.outcomes.map((outcome, idx) => (
                    <button
                      key={idx}
                      onClick={() => session && openBetModal(market.label, outcome)}
                      disabled={!session}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                        session
                          ? 'bg-zinc-800/30 border-zinc-700/50 hover:border-teal-500/50 hover:bg-teal-900/20 cursor-pointer'
                          : 'bg-zinc-800/20 border-zinc-800/30 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="text-left">
                        <div className="text-sm text-zinc-300">
                          {outcome.name}
                          {outcome.point !== undefined && (
                            <span className="text-zinc-500 ml-1">
                              {outcome.point > 0 ? '+' : ''}{outcome.point}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-lg font-bold text-teal-400">
                        {outcome.price.toFixed(2)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sign in prompt */}
        {!session && (
          <div className="mt-8 bg-gradient-to-r from-teal-900/30 to-zinc-900/30 border border-teal-500/20 rounded-2xl p-6 text-center">
            <div className="text-2xl mb-3">🔒</div>
            <h3 className="text-lg font-semibold text-white mb-2">Sign in to Place Bets</h3>
            <p className="text-zinc-400 mb-4">Create an account to start betting on this event</p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-teal-500 text-dark font-semibold rounded-xl hover:bg-teal-400 transition-colors"
            >
              Sign In
            </Link>
          </div>
        )}
      </main>

      {/* Bet Modal */}
      {betModalOpen && selectedBet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-surface border border-zinc-700 rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
            {betSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Bet Placed!</h3>
                <p className="text-zinc-400">Your bet has been recorded successfully.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white">Place Bet</h3>
                  <button
                    onClick={() => setBetModalOpen(false)}
                    className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Bet Details */}
                <div className="bg-zinc-800/50 rounded-xl p-4 mb-4">
                  <div className="text-sm text-zinc-500 mb-1">{event.awayTeam} @ {event.homeTeam}</div>
                  <div className="text-white font-medium mb-2">{selectedBet.market}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-teal-400 font-semibold">
                      {selectedBet.outcome}
                      {selectedBet.point !== undefined && (
                        <span className="text-zinc-400 ml-1">
                          {selectedBet.point > 0 ? '+' : ''}{selectedBet.point}
                        </span>
                      )}
                    </span>
                    <span className="text-xl font-bold text-teal-400">@{selectedBet.odds.toFixed(2)}</span>
                  </div>
                </div>

                {/* Stake Input */}
                <div className="mb-4">
                  <label className="block text-sm text-zinc-400 mb-2">Stake Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                      type="number"
                      value={betStake}
                      onChange={e => setBetStake(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full pl-8 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-teal-500"
                      min="1"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[10, 25, 50, 100].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setBetStake(amount)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          betStake === amount
                            ? 'bg-teal-500 text-dark'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Potential Returns */}
                <div className="bg-zinc-800/30 rounded-xl p-4 mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-500">Stake</span>
                    <span className="text-white">${betStake.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-500">Odds</span>
                    <span className="text-white">{selectedBet.odds.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-zinc-700 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-medium">Potential Return</span>
                      <span className="text-teal-400 font-bold text-lg">
                        ${(betStake * selectedBet.odds).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Error */}
                {betError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                    <p className="text-red-400 text-sm">{betError}</p>
                  </div>
                )}

                {/* Place Bet Button */}
                <button
                  onClick={placeBet}
                  disabled={placingBet || betStake < 1}
                  className="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-400 text-dark font-bold rounded-xl hover:from-teal-400 hover:to-teal-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {placingBet ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Placing Bet...
                    </span>
                  ) : (
                    `Place Bet - $${betStake}`
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
