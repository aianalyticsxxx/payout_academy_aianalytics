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
  const {
    regions = 'eu,uk',  // European regions for European sportsbooks
    markets = 'h2h,totals',  // 1X2 (h2h) and Over/Under (totals)
    oddsFormat = 'decimal',  // European decimal odds format
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
    url.searchParams.set('regions', 'eu,uk');  // European regions
    url.searchParams.set('markets', 'h2h,totals');
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
  return SPORT_KEYS[sportName as keyof typeof SPORT_KEYS];
}
