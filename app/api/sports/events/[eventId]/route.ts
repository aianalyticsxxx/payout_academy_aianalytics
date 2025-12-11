// ==========================================
// EVENT DETAILS API ROUTE
// ==========================================
// GET /api/sports/events/[eventId]?sport=basketball_nba&markets=all
// Returns detailed odds for a specific event with all available markets

import { NextRequest, NextResponse } from 'next/server';
import {
  getEventOdds,
  getEventPlayerProps,
  getMarketsForSport,
  MARKETS,
} from '@/lib/sports/odds-api';

export const dynamic = 'force-dynamic';

// Market display names for the UI
const MARKET_LABELS: Record<string, string> = {
  // Core markets
  h2h: 'Match Winner',
  h2h_3_way: '1X2',
  spreads: 'Handicap',
  totals: 'Over/Under',

  // Soccer
  btts: 'Both Teams To Score',
  draw_no_bet: 'Draw No Bet',

  // Period markets
  h2h_h1: '1st Half Winner',
  h2h_h2: '2nd Half Winner',
  h2h_q1: '1st Quarter Winner',
  h2h_q2: '2nd Quarter Winner',
  h2h_q3: '3rd Quarter Winner',
  h2h_q4: '4th Quarter Winner',
  h2h_p1: '1st Period Winner',
  h2h_p2: '2nd Period Winner',
  h2h_p3: '3rd Period Winner',

  // Totals
  totals_h1: '1st Half Total',
  totals_h2: '2nd Half Total',
  totals_q1: '1st Quarter Total',
  totals_q2: '2nd Quarter Total',
  totals_q3: '3rd Quarter Total',
  totals_q4: '4th Quarter Total',
  totals_p1: '1st Period Total',
  totals_p2: '2nd Period Total',
  totals_p3: '3rd Period Total',

  // Alternates
  alternate_spreads: 'Alternate Handicap',
  alternate_totals: 'Alternate Total',
  team_totals: 'Team Total',

  // Player props
  player_points: 'Player Points',
  player_rebounds: 'Player Rebounds',
  player_assists: 'Player Assists',
  player_threes: 'Player 3-Pointers',
  player_blocks: 'Player Blocks',
  player_steals: 'Player Steals',
  player_turnovers: 'Player Turnovers',
  player_points_rebounds_assists: 'Points + Rebounds + Assists',
  player_points_rebounds: 'Points + Rebounds',
  player_points_assists: 'Points + Assists',
  player_rebounds_assists: 'Rebounds + Assists',
  player_double_double: 'Double-Double',
  player_first_basket: 'First Basket Scorer',

  // NFL props
  player_pass_tds: 'Passing TDs',
  player_pass_yds: 'Passing Yards',
  player_pass_completions: 'Pass Completions',
  player_pass_attempts: 'Pass Attempts',
  player_pass_interceptions: 'Interceptions',
  player_rush_yds: 'Rushing Yards',
  player_rush_attempts: 'Rush Attempts',
  player_receptions: 'Receptions',
  player_reception_yds: 'Receiving Yards',
  player_anytime_td: 'Anytime TD Scorer',
  player_first_td: 'First TD Scorer',
  player_last_td: 'Last TD Scorer',

  // Baseball
  batter_home_runs: 'Home Runs',
  batter_hits: 'Hits',
  batter_total_bases: 'Total Bases',
  batter_rbis: 'RBIs',
  batter_runs_scored: 'Runs Scored',
  pitcher_strikeouts: 'Pitcher Strikeouts',
  pitcher_hits_allowed: 'Hits Allowed',
  pitcher_outs: 'Pitcher Outs',
};

// Group markets by category for the UI
function groupMarkets(markets: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {
    'Main Markets': [],
    'Period Markets': [],
    'Alternate Lines': [],
    'Player Props': [],
  };

  for (const market of markets) {
    if (market.startsWith('player_') || market.startsWith('batter_') || market.startsWith('pitcher_')) {
      groups['Player Props'].push(market);
    } else if (market.startsWith('alternate_') || market === 'team_totals') {
      groups['Alternate Lines'].push(market);
    } else if (market.includes('_h1') || market.includes('_h2') || market.includes('_q') || market.includes('_p')) {
      groups['Period Markets'].push(market);
    } else {
      groups['Main Markets'].push(market);
    }
  }

  // Remove empty groups
  return Object.fromEntries(
    Object.entries(groups).filter(([, v]) => v.length > 0)
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const searchParams = req.nextUrl.searchParams;
  const sport = searchParams.get('sport');
  const includeProps = searchParams.get('props') === 'true';

  if (!sport) {
    return NextResponse.json(
      { error: 'Sport parameter required' },
      { status: 400 }
    );
  }

  try {
    console.log(`[Event API] Fetching odds for event ${eventId} (${sport})`);

    // Get main market odds
    const eventOdds = await getEventOdds(sport, eventId);

    if (!eventOdds) {
      return NextResponse.json(
        { error: 'Event not found or no odds available' },
        { status: 404 }
      );
    }

    // Optionally get player props (separate API call)
    let playerProps = null;
    if (includeProps) {
      playerProps = await getEventPlayerProps(sport, eventId);
    }

    // Get available markets for this sport
    const availableMarkets = getMarketsForSport(sport);
    const groupedMarkets = groupMarkets(availableMarkets);

    // Transform the response for the UI
    const response = {
      event: {
        id: eventOdds.id,
        sportKey: eventOdds.sport_key,
        sportTitle: eventOdds.sport_title,
        commenceTime: eventOdds.commence_time,
        homeTeam: eventOdds.home_team,
        awayTeam: eventOdds.away_team,
      },
      markets: transformMarkets(eventOdds.bookmakers, playerProps?.bookmakers),
      availableMarkets: groupedMarkets,
      marketLabels: MARKET_LABELS,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Event odds API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event odds', details: String(error) },
      { status: 500 }
    );
  }
}

// Transform bookmaker data into a more usable format
function transformMarkets(
  mainBookmakers: any[],
  propsBookmakers?: any[]
): Record<string, any> {
  const markets: Record<string, any> = {};

  // Process main markets
  for (const bookmaker of mainBookmakers || []) {
    for (const market of bookmaker.markets || []) {
      if (!markets[market.key]) {
        markets[market.key] = {
          key: market.key,
          label: MARKET_LABELS[market.key] || market.key,
          outcomes: [],
          bookmakers: [],
        };
      }

      markets[market.key].bookmakers.push({
        key: bookmaker.key,
        title: bookmaker.title,
        lastUpdate: bookmaker.last_update,
        outcomes: market.outcomes,
      });

      // Merge unique outcomes
      for (const outcome of market.outcomes) {
        const existing = markets[market.key].outcomes.find(
          (o: any) => o.name === outcome.name && o.point === outcome.point
        );
        if (!existing) {
          markets[market.key].outcomes.push(outcome);
        }
      }
    }
  }

  // Process player props
  for (const bookmaker of propsBookmakers || []) {
    for (const market of bookmaker.markets || []) {
      if (!markets[market.key]) {
        markets[market.key] = {
          key: market.key,
          label: MARKET_LABELS[market.key] || market.key,
          outcomes: [],
          bookmakers: [],
        };
      }

      markets[market.key].bookmakers.push({
        key: bookmaker.key,
        title: bookmaker.title,
        lastUpdate: bookmaker.last_update,
        outcomes: market.outcomes,
      });

      for (const outcome of market.outcomes) {
        const existing = markets[market.key].outcomes.find(
          (o: any) => o.name === outcome.name && o.point === outcome.point
        );
        if (!existing) {
          markets[market.key].outcomes.push(outcome);
        }
      }
    }
  }

  return markets;
}
