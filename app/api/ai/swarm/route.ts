// ==========================================
// AI SWARM API ROUTE
// ==========================================
// POST /api/ai/swarm - Run full swarm analysis
// Returns cached predictions if available for the same event

import { NextRequest, NextResponse } from 'next/server';
import { runSwarmAnalysis, streamSwarmAnalysis } from '@/lib/ai/swarm';
import { saveAIPrediction, getPredictionByEventId } from '@/lib/db/ai-leaderboard';
import { ratelimit } from '@/lib/redis';
import { z } from 'zod';
import { zodErrorResponse } from '@/lib/auth/helpers';

// Request validation schema
const RequestSchema = z.object({
  event: z.object({
    id: z.string(),
    sportKey: z.string().optional(),
    sportTitle: z.string(),
    commenceTime: z.string(),
    homeTeam: z.string(),
    awayTeam: z.string(),
    league: z.string().optional(),
    bookmakers: z.array(z.any()).optional(),
  }),
  options: z.object({
    useCache: z.boolean().optional(),
    agents: z.array(z.string()).optional(),
    parallel: z.boolean().optional(),
    includeContext: z.boolean().optional(),
    savePrediction: z.boolean().optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request
    const body = await req.json();
    const { event, options } = RequestSchema.parse(body);

    // Check if we already have a prediction for this event
    // This ensures all users see the same AI analysis
    const existingPrediction = await getPredictionByEventId(event.id);

    if (existingPrediction) {
      console.log(`[Swarm API] Returning cached prediction for ${event.id}`);
      return NextResponse.json(existingPrediction);
    }

    // Rate limiting (only for new analyses, not cached ones)
    if (ratelimit) {
      const identifier = req.headers.get('x-user-id') || req.ip || 'anonymous';
      const { success, limit, reset, remaining } = await ratelimit.limit(identifier);

      if (!success) {
        return NextResponse.json(
          { error: 'Rate limit exceeded', retryAfter: reset },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
            },
          }
        );
      }
    }

    console.log(`[Swarm API] Running new analysis for ${event.id}`);

    // Run swarm analysis
    const result = await runSwarmAnalysis(event, {
      useCache: options?.useCache ?? true,
      agents: options?.agents,
      parallel: options?.parallel ?? true,
      includeContext: options?.includeContext ?? true,
    });

    // Save prediction to database so all users see the same result
    try {
      await saveAIPrediction({
        eventId: event.id,
        eventName: `${event.awayTeam} @ ${event.homeTeam}`,
        sport: event.sportTitle,
        league: event.league,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        commenceTime: new Date(event.commenceTime),
        consensus: result.consensus,
        aiVotes: result.analyses,
        betSelection: result.betSelection,
        betOdds: result.betOdds,
      });
      console.log(`[Swarm API] Saved prediction for ${event.id}`);
    } catch (saveError) {
      console.error('Failed to save prediction:', saveError);
      // Don't fail the request, just log
    }

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Swarm API error:', error);
    
    if (error instanceof z.ZodError) {
      return zodErrorResponse(error, 'Invalid request');
    }
    
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}

// ==========================================
// STREAMING ENDPOINT (Server-Sent Events)
// ==========================================

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const eventData = searchParams.get('event');
  
  if (!eventData) {
    return NextResponse.json({ error: 'Missing event parameter' }, { status: 400 });
  }

  try {
    const event = JSON.parse(eventData);
    
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        for await (const update of streamSwarmAnalysis(event)) {
          const data = `data: ${JSON.stringify(update)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
        
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('Streaming error:', error);
    return NextResponse.json({ error: 'Stream failed' }, { status: 500 });
  }
}
