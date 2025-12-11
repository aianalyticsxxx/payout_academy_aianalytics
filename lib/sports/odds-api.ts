// ==========================================
// THE ODDS API INTEGRATION
// ==========================================
// https://the-odds-api.com/

import { SportEvent, Bookmaker } from '../ai/types';
import { getCached, setCache } from '../redis';

const BASE_URL = 'https://api.the-odds-api.com/v4';
const API_KEY = process.env.ODDS_API_KEY;

// ==========================================
// TYPES
// ==========================================

export interface Sport {
  key: string;
  group: string;
  title: string;
  description: string;
  active: boolean;
  has_outrights: boolean;
}

export interface OddsEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsBookmaker[];
}

export interface OddsBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: OddsMarket[];
}

export interface OddsMarket {
  key: string;
  last_update: string;
  outcomes: OddsOutcome[];
}

export interface OddsOutcome {
  name: string;
  price: number;
  point?: number;
}

export interface Score {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: { name: string; score: string }[] | null;
  last_update: string;
}

// ==========================================
// API FUNCTIONS
// ==========================================

export async function getSports(): Promise<Sport[]> {
  const cacheKey = 'odds-api:sports';
  const cached = await getCached<Sport[]>(cacheKey);
  if (cached) return cached;

  if (!API_KEY) {
    console.error('ODDS_API_KEY not configured');
    return [];
  }

  try {
    const res = await fetch(`${BASE_URL}/sports?apiKey=${API_KEY}`);
    
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    
    const sports = await res.json();
    await setCache(cacheKey, sports, 3600); // Cache for 1 hour
    return sports;
  } catch (error) {
    console.error('Failed to fetch sports:', error);
    return [];
  }
}

export async function getUpcomingEvents(
  sportKey: string,
  options: {
    regions?: string;
    markets?: string;
    oddsFormat?: 'decimal' | 'american';
    dateFormat?: 'iso' | 'unix';
  } = {}
): Promise<OddsEvent[]> {
  // Note: The /sports/{sport}/odds endpoint only supports featured markets (h2h, spreads, totals)
  // Advanced markets (alternates, periods, player props) require per-event API calls
  const {
    regions = 'eu,uk,us',
    markets = 'h2h,spreads,totals',  // Only featured markets supported by this endpoint
    oddsFormat = 'decimal',
    dateFormat = 'iso',
  } = options;

  const cacheKey = `odds-api:events:${sportKey}:${markets}`;
  const cached = await getCached<OddsEvent[]>(cacheKey);
  if (cached) {
    console.log(`[Odds API] Cache hit for ${sportKey}`);
    return cached;
  }

  console.log(`[Odds API] Fetching events for ${sportKey}, API_KEY exists: ${!!API_KEY}`);

  if (!API_KEY) {
    console.error('ODDS_API_KEY not configured');
    return [];
  }

  try {
    const url = new URL(`${BASE_URL}/sports/${sportKey}/odds`);
    url.searchParams.set('apiKey', API_KEY);
    url.searchParams.set('regions', regions);
    url.searchParams.set('markets', markets);
    url.searchParams.set('oddsFormat', oddsFormat);
    url.searchParams.set('dateFormat', dateFormat);

    console.log(`[Odds API] Calling: ${url.toString().replace(API_KEY, '***')}`);

    const res = await fetch(url.toString());

    console.log(`[Odds API] Response status: ${res.status}`);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Odds API] Error response: ${errorText}`);
      throw new Error(`API error: ${res.status} - ${errorText}`);
    }

    const events = await res.json();
    console.log(`[Odds API] Got ${events.length} events for ${sportKey}`);
    await setCache(cacheKey, events, 300); // Cache for 5 minutes
    return events;
  } catch (error) {
    console.error('[Odds API] Failed to fetch events:', error);
    return [];
  }
}

export async function getLiveEvents(sportKey: string): Promise<OddsEvent[]> {
  if (!API_KEY) {
    console.error('ODDS_API_KEY not configured');
    return [];
  }

  try {
    const url = new URL(`${BASE_URL}/sports/${sportKey}/odds-live`);
    url.searchParams.set('apiKey', API_KEY);
    url.searchParams.set('regions', 'eu,uk,us');
    url.searchParams.set('markets', 'h2h,spreads,totals');  // Only featured markets
    url.searchParams.set('oddsFormat', 'decimal');

    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Failed to fetch live events:', error);
    return [];
  }
}

// Get event odds with specific markets (including player props)
export async function getEventOdds(
  sportKey: string,
  eventId: string,
  marketKeys?: string[]
): Promise<OddsEvent | null> {
  if (!API_KEY) {
    console.error('ODDS_API_KEY not configured');
    return null;
  }

  const cacheKey = `odds-api:event:${eventId}:${marketKeys?.join(',') || 'featured'}`;
  const cached = await getCached<OddsEvent>(cacheKey);
  if (cached) return cached;

  // Only featured markets are supported by the Odds API standard tier
  // Advanced markets (alternates, periods, player props) require premium tier
  const featuredMarkets = ['h2h', 'spreads', 'totals'];
  const markets = marketKeys?.filter(m => featuredMarkets.includes(m)) || featuredMarkets;

  try {
    const url = new URL(`${BASE_URL}/sports/${sportKey}/events/${eventId}/odds`);
    url.searchParams.set('apiKey', API_KEY);
    url.searchParams.set('regions', 'eu,uk,us');
    url.searchParams.set('markets', markets.join(','));
    url.searchParams.set('oddsFormat', 'decimal');

    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const event = await res.json();
    await setCache(cacheKey, event, 120); // Cache for 2 minutes
    return event;
  } catch (error) {
    console.error('Failed to fetch event odds:', error);
    return null;
  }
}

// Get player props for an event
// NOTE: Player props require premium API tier - this function returns null for standard tier
export async function getEventPlayerProps(
  sportKey: string,
  eventId: string
): Promise<OddsEvent | null> {
  // Player props are not available on the standard API tier
  // Return null to indicate no props available
  // If you upgrade to premium tier, this function can be enabled
  console.log(`[Odds API] Player props require premium tier - skipping for ${eventId}`);
  return null;

  /* Premium tier implementation (uncomment if upgraded):
  if (!API_KEY) {
    console.error('ODDS_API_KEY not configured');
    return null;
  }

  const cacheKey = `odds-api:props:${eventId}`;
  const cached = await getCached<OddsEvent>(cacheKey);
  if (cached) return cached;

  // Get player prop markets for this sport
  const allMarkets = getMarketsForSport(sportKey);
  const propMarkets = allMarkets.filter(m =>
    m.startsWith('player_') || m.startsWith('batter_') || m.startsWith('pitcher_')
  );

  if (propMarkets.length === 0) return null;

  try {
    const url = new URL(`${BASE_URL}/sports/${sportKey}/events/${eventId}/odds`);
    url.searchParams.set('apiKey', API_KEY);
    url.searchParams.set('regions', 'us'); // Props mainly from US books
    url.searchParams.set('markets', propMarkets.join(','));
    url.searchParams.set('oddsFormat', 'decimal');

    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const event = await res.json();
    await setCache(cacheKey, event, 120); // Cache for 2 minutes
    return event;
  } catch (error) {
    console.error('Failed to fetch player props:', error);
    return null;
  }
  */
}

export async function getEventScores(
  sportKey: string,
  daysFrom: number = 3
): Promise<Score[]> {
  if (!API_KEY) {
    console.error('ODDS_API_KEY not configured');
    return [];
  }

  try {
    const url = new URL(`${BASE_URL}/sports/${sportKey}/scores`);
    url.searchParams.set('apiKey', API_KEY);
    url.searchParams.set('daysFrom', daysFrom.toString());

    const res = await fetch(url.toString());
    
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch scores:', error);
    return [];
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export function convertToSportEvent(oddsEvent: OddsEvent): SportEvent {
  return {
    id: oddsEvent.id,
    sportKey: oddsEvent.sport_key,
    sportTitle: oddsEvent.sport_title,
    commenceTime: oddsEvent.commence_time,
    homeTeam: oddsEvent.home_team,
    awayTeam: oddsEvent.away_team,
    bookmakers: oddsEvent.bookmakers.map(b => ({
      key: b.key,
      title: b.title,
      markets: b.markets.map(m => ({
        key: m.key,
        outcomes: m.outcomes.map(o => ({
          name: o.name,
          price: o.price,
          point: o.point,
        })),
      })),
    })),
  };
}

export function findBestOdds(event: OddsEvent): {
  home: { price: number; bookmaker: string };
  away: { price: number; bookmaker: string };
  draw?: { price: number; bookmaker: string };
} {
  const best = {
    home: { price: 0, bookmaker: '' },
    away: { price: 0, bookmaker: '' },
    draw: { price: 0, bookmaker: '' },
  };

  event.bookmakers.forEach(book => {
    const h2h = book.markets.find(m => m.key === 'h2h');
    if (!h2h) return;

    h2h.outcomes.forEach(outcome => {
      if (outcome.name === event.home_team && outcome.price > best.home.price) {
        best.home = { price: outcome.price, bookmaker: book.title };
      }
      if (outcome.name === event.away_team && outcome.price > best.away.price) {
        best.away = { price: outcome.price, bookmaker: book.title };
      }
      if (outcome.name === 'Draw' && outcome.price > best.draw.price) {
        best.draw = { price: outcome.price, bookmaker: book.title };
      }
    });
  });

  return best.draw.price > 0 ? best : { home: best.home, away: best.away };
}

export function detectArbitrage(event: OddsEvent): {
  hasArbitrage: boolean;
  margin: number;
  stakes?: { home: number; away: number; draw?: number };
  profit?: number;
} {
  const best = findBestOdds(event);
  const hasDraw = 'draw' in best && best.draw && best.draw.price > 0;

  // Calculate implied probabilities
  const homeProb = 1 / best.home.price;
  const awayProb = 1 / best.away.price;
  const drawProb = hasDraw ? 1 / best.draw!.price : 0;

  const totalProb = homeProb + awayProb + drawProb;
  const margin = (1 - totalProb) * 100;

  if (totalProb >= 1) {
    return { hasArbitrage: false, margin };
  }

  // Calculate optimal stakes for $1000 total
  const totalStake = 1000;
  const stakes = {
    home: (homeProb / totalProb) * totalStake,
    away: (awayProb / totalProb) * totalStake,
    ...(hasDraw && { draw: (drawProb / totalProb) * totalStake }),
  };

  // Calculate guaranteed profit
  const profit = (totalStake / totalProb) - totalStake;

  return {
    hasArbitrage: true,
    margin,
    stakes,
    profit,
  };
}

export function calculateValueBet(
  odds: number,
  estimatedProbability: number
): { hasValue: boolean; edge: number; expectedValue: number } {
  const impliedProb = 1 / odds;
  const edge = (estimatedProbability - impliedProb) * 100;
  const expectedValue = (estimatedProbability * (odds - 1)) - (1 - estimatedProbability);

  return {
    hasValue: edge > 0,
    edge,
    expectedValue,
  };
}

// ==========================================
// MARKET DEFINITIONS (bet365-style)
// ==========================================

export const MARKETS = {
  // Core markets (all sports)
  CORE: ['h2h', 'spreads', 'totals'],

  // Soccer markets
  SOCCER: [
    'h2h',
    'h2h_3_way',        // 1X2
    'spreads',          // Asian Handicap
    'totals',           // Over/Under Goals
    'btts',             // Both Teams To Score
    'draw_no_bet',      // Draw No Bet
    'h2h_h1',           // First Half Winner
    'h2h_h2',           // Second Half Winner
    'totals_h1',        // First Half Over/Under
    'alternate_totals', // Alternate Goal Lines
    'alternate_spreads', // Alternate Handicaps
    'team_totals',      // Team Total Goals
  ],

  // Basketball markets (NBA, NCAAB)
  BASKETBALL: [
    'h2h',
    'spreads',
    'totals',
    'alternate_spreads',
    'alternate_totals',
    'team_totals',
    'h2h_q1', 'h2h_q2', 'h2h_q3', 'h2h_q4',  // Quarter winners
    'h2h_h1', 'h2h_h2',                       // Half winners
    'spreads_q1', 'spreads_q2', 'spreads_q3', 'spreads_q4',
    'totals_q1', 'totals_q2', 'totals_q3', 'totals_q4',
    'totals_h1', 'totals_h2',
    // Player props
    'player_points',
    'player_rebounds',
    'player_assists',
    'player_threes',
    'player_blocks',
    'player_steals',
    'player_turnovers',
    'player_points_rebounds_assists',
    'player_points_rebounds',
    'player_points_assists',
    'player_rebounds_assists',
    'player_double_double',
    'player_first_basket',
  ],

  // American Football markets (NFL, NCAAF)
  FOOTBALL: [
    'h2h',
    'spreads',
    'totals',
    'alternate_spreads',
    'alternate_totals',
    'team_totals',
    'h2h_q1', 'h2h_q2', 'h2h_q3', 'h2h_q4',
    'h2h_h1', 'h2h_h2',
    'spreads_h1', 'spreads_h2',
    'totals_h1', 'totals_h2',
    // Player props
    'player_pass_tds',
    'player_pass_yds',
    'player_pass_completions',
    'player_pass_attempts',
    'player_pass_interceptions',
    'player_rush_yds',
    'player_rush_attempts',
    'player_rush_longest',
    'player_receptions',
    'player_reception_yds',
    'player_anytime_td',
    'player_first_td',
    'player_last_td',
  ],

  // Ice Hockey markets (NHL)
  HOCKEY: [
    'h2h',
    'h2h_3_way',        // Regulation time only
    'spreads',          // Puck Line
    'totals',
    'alternate_spreads',
    'alternate_totals',
    'team_totals',
    'h2h_p1', 'h2h_p2', 'h2h_p3',  // Period winners
    'totals_p1', 'totals_p2', 'totals_p3',
    // Player props
    'player_points',
    'player_goals',
    'player_assists',
    'player_shots_on_goal',
    'player_power_play_points',
  ],

  // Baseball markets (MLB)
  BASEBALL: [
    'h2h',
    'spreads',          // Run Line
    'totals',
    'alternate_spreads',
    'alternate_totals',
    'team_totals',
    'h2h_1st_1_innings',
    'h2h_1st_3_innings',
    'h2h_1st_5_innings',
    'h2h_1st_7_innings',
    'totals_1st_5_innings',
    // Player props
    'batter_home_runs',
    'batter_hits',
    'batter_total_bases',
    'batter_rbis',
    'batter_runs_scored',
    'batter_singles',
    'batter_doubles',
    'batter_triples',
    'batter_walks',
    'batter_strikeouts',
    'batter_stolen_bases',
    'pitcher_strikeouts',
    'pitcher_hits_allowed',
    'pitcher_walks',
    'pitcher_earned_runs',
    'pitcher_outs',
  ],

  // Tennis markets
  TENNIS: [
    'h2h',
    'spreads',          // Game Handicap
    'totals',           // Total Games
    'alternate_spreads',
    'alternate_totals',
    'h2h_set_1',
    'h2h_set_2',
  ],

  // MMA/UFC markets
  MMA: [
    'h2h',
    'totals',           // Total Rounds
    'method_of_victory',
    'go_the_distance',
  ],
};

// Get markets for a specific sport
export function getMarketsForSport(sportKey: string): string[] {
  if (sportKey.includes('soccer')) return MARKETS.SOCCER;
  if (sportKey.includes('basketball')) return MARKETS.BASKETBALL;
  if (sportKey.includes('americanfootball')) return MARKETS.FOOTBALL;
  if (sportKey.includes('icehockey')) return MARKETS.HOCKEY;
  if (sportKey.includes('baseball')) return MARKETS.BASEBALL;
  if (sportKey.includes('tennis')) return MARKETS.TENNIS;
  if (sportKey.includes('mma') || sportKey.includes('boxing')) return MARKETS.MMA;
  return MARKETS.CORE;
}

// ==========================================
// SPORT KEY MAPPINGS
// ==========================================

export const SPORT_KEYS = {
  // American Sports
  'NBA': 'basketball_nba',
  'NFL': 'americanfootball_nfl',
  'MLB': 'baseball_mlb',
  'NHL': 'icehockey_nhl',
  'NCAAF': 'americanfootball_ncaaf',
  'NCAAB': 'basketball_ncaab',
  'MLS': 'soccer_usa_mls',
  
  // Soccer
  'EPL': 'soccer_epl',
  'La Liga': 'soccer_spain_la_liga',
  'Serie A': 'soccer_italy_serie_a',
  'Bundesliga': 'soccer_germany_bundesliga',
  'Ligue 1': 'soccer_france_ligue_one',
  'Champions League': 'soccer_uefa_champs_league',
  
  // Tennis
  'ATP': 'tennis_atp',
  'WTA': 'tennis_wta',
  
  // Combat Sports
  'UFC': 'mma_mixed_martial_arts',
  'Boxing': 'boxing_boxing',
  
  // Golf
  'PGA': 'golf_pga_tour',
};

export function getSportKey(sportName: string): string | undefined {
  // First try exact match
  if (SPORT_KEYS[sportName as keyof typeof SPORT_KEYS]) {
    return SPORT_KEYS[sportName as keyof typeof SPORT_KEYS];
  }

  // Then try partial matching for common variations
  const normalizedName = sportName.toLowerCase();

  // American sports
  if (normalizedName.includes('nba') || normalizedName.includes('basketball')) {
    return 'basketball_nba';
  }
  if (normalizedName.includes('nfl') || (normalizedName.includes('football') && normalizedName.includes('american'))) {
    return 'americanfootball_nfl';
  }
  if (normalizedName.includes('mlb') || normalizedName.includes('baseball')) {
    return 'baseball_mlb';
  }
  if (normalizedName.includes('nhl') || normalizedName.includes('hockey')) {
    return 'icehockey_nhl';
  }

  // Soccer leagues
  if (normalizedName.includes('premier league') || normalizedName.includes('epl')) {
    return 'soccer_epl';
  }
  if (normalizedName.includes('la liga') || normalizedName.includes('spain')) {
    return 'soccer_spain_la_liga';
  }
  if (normalizedName.includes('serie a') || normalizedName.includes('italy')) {
    return 'soccer_italy_serie_a';
  }
  if (normalizedName.includes('bundesliga') || normalizedName.includes('germany')) {
    return 'soccer_germany_bundesliga';
  }
  if (normalizedName.includes('ligue 1') || normalizedName.includes('france')) {
    return 'soccer_france_ligue_one';
  }
  if (normalizedName.includes('champions league') || normalizedName.includes('uefa')) {
    return 'soccer_uefa_champs_league';
  }
  if (normalizedName.includes('mls')) {
    return 'soccer_usa_mls';
  }

  // Combat sports
  if (normalizedName.includes('ufc') || normalizedName.includes('mma')) {
    return 'mma_mixed_martial_arts';
  }
  if (normalizedName.includes('boxing')) {
    return 'boxing_boxing';
  }

  // Tennis
  if (normalizedName.includes('atp')) {
    return 'tennis_atp';
  }
  if (normalizedName.includes('wta')) {
    return 'tennis_wta';
  }

  return undefined;
}
