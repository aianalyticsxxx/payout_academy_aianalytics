// ==========================================
// SPORTS EVENTS API ROUTE
// ==========================================
// GET /api/sports/events?sport=basketball_nba

import { NextRequest, NextResponse } from 'next/server';
import {
  getSports,
  getUpcomingEvents,
  getLiveEvents,
  convertToSportEvent,
  findBestOdds,
  detectArbitrage,
  getMarketsForSport,
  MARKETS,
} from '@/lib/sports/odds-api';

export const dynamic = 'force-dynamic';

// Market display names
const MARKET_LABELS: Record<string, string> = {
  h2h: 'Match Winner',
  h2h_3_way: '1X2',
  spreads: 'Handicap',
  totals: 'Over/Under',
  btts: 'BTTS',
  draw_no_bet: 'Draw No Bet',
  h2h_h1: '1st Half',
  h2h_h2: '2nd Half',
  alternate_spreads: 'Alt Handicap',
  alternate_totals: 'Alt Total',
  team_totals: 'Team Total',
  player_points: 'Player Points',
  player_rebounds: 'Player Rebounds',
  player_assists: 'Player Assists',
};

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const sport = searchParams.get('sport');
  const live = searchParams.get('live') === 'true';
  const includeArbitrage = searchParams.get('arbitrage') === 'true';

  try {
    // If no sport specified, return list of sports
    if (!sport) {
      const sports = await getSports();
      return NextResponse.json({ sports });
    }

    console.log(`[Events API] Fetching ${live ? 'live' : 'upcoming'} events for ${sport}`);

    // Get events for the sport
    const events = live
      ? await getLiveEvents(sport)
      : await getUpcomingEvents(sport);

    console.log(`[Events API] Got ${events?.length ?? 0} raw events for ${sport}`);

    // Filter to only show upcoming events (not started yet)
    const now = new Date();
    const upcomingEvents = (events || []).filter(event => {
      const commenceTime = new Date(event.commence_time);
      return commenceTime > now;
    });

    console.log(`[Events API] ${upcomingEvents.length} upcoming events after filtering past events`);

    // Get available markets for this sport
    const availableMarkets = getMarketsForSport(sport);

    // Transform and enrich events
    const enrichedEvents = upcomingEvents.map(event => {
      const sportEvent = convertToSportEvent(event);
      const bestOdds = findBestOdds(event);

      let arbitrage = undefined;
      if (includeArbitrage) {
        arbitrage = detectArbitrage(event);
      }

      // Extract all available markets from the event
      const eventMarkets = extractEventMarkets(event);

      return {
        ...sportEvent,
        bestOdds,
        arbitrage,
        markets: eventMarkets,
      };
    });

    return NextResponse.json({
      sport,
      count: enrichedEvents.length,
      events: enrichedEvents,
      availableMarkets: availableMarkets,
      marketLabels: MARKET_LABELS,
    });

  } catch (error) {
    console.error('Sports API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', details: String(error) },
      { status: 500 }
    );
  }
}

// Extract all markets from an event with best odds for each
function extractEventMarkets(event: any): Record<string, any> {
  const markets: Record<string, any> = {};

  for (const bookmaker of event.bookmakers || []) {
    for (const market of bookmaker.markets || []) {
      if (!markets[market.key]) {
        markets[market.key] = {
          key: market.key,
          label: MARKET_LABELS[market.key] || formatMarketKey(market.key),
          outcomes: {},
        };
      }

      // Track best odds for each outcome
      for (const outcome of market.outcomes) {
        const outcomeKey = outcome.point !== undefined
          ? `${outcome.name}:${outcome.point}`
          : outcome.name;

        if (!markets[market.key].outcomes[outcomeKey] ||
            markets[market.key].outcomes[outcomeKey].price < outcome.price) {
          markets[market.key].outcomes[outcomeKey] = {
            name: outcome.name,
            price: outcome.price,
            point: outcome.point,
            bookmaker: bookmaker.title,
          };
        }
      }
    }
  }

  // Convert outcomes from object to array
  for (const marketKey of Object.keys(markets)) {
    markets[marketKey].outcomes = Object.values(markets[marketKey].outcomes);
  }

  return markets;
}

// Format market key for display
function formatMarketKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/h2h/g, 'Winner')
    .replace(/\b\w/g, c => c.toUpperCase());
}
