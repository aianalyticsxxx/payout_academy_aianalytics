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
} from '@/lib/sports/odds-api';

export const dynamic = 'force-dynamic';

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

    // Transform and enrich events
    const enrichedEvents = upcomingEvents.map(event => {
      const sportEvent = convertToSportEvent(event);
      const bestOdds = findBestOdds(event);

      let arbitrage = undefined;
      if (includeArbitrage) {
        arbitrage = detectArbitrage(event);
      }

      return {
        ...sportEvent,
        bestOdds,
        arbitrage,
      };
    });

    return NextResponse.json({
      sport,
      count: enrichedEvents.length,
      events: enrichedEvents,
    });

  } catch (error) {
    console.error('Sports API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', details: String(error) },
      { status: 500 }
    );
  }
}
