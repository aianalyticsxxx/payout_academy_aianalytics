// ==========================================
// USER SESSIONS API ROUTE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { headers } from 'next/headers';
import { randomUUID, randomBytes } from 'crypto';

// Parse user agent to get browser/OS info
function parseUserAgent(ua: string | null) {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'desktop' };

  let browser = 'Unknown';
  let os = 'Unknown';
  let device: 'desktop' | 'mobile' | 'tablet' = 'desktop';

  // Detect browser
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Opera')) browser = 'Opera';

  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // Detect device
  if (ua.includes('Mobile')) device = 'mobile';
  else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'tablet';

  return { browser, os, device };
}

// GET - List all sessions
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get all sessions for user
    const sessions = await prisma.userSession.findMany({
      where: { userId },
      orderBy: { lastActivity: 'desc' },
    });

    // Get current session token from cookies
    const headersList = await headers();
    const currentSessionToken = headersList.get('x-session-token');

    // Mark current session
    const sessionsWithCurrent = sessions.map((s) => ({
      ...s,
      isCurrent: s.sessionToken === currentSessionToken,
    }));

    return NextResponse.json({
      sessions: sessionsWithCurrent,
      count: sessions.length,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to get sessions' },
      { status: 500 }
    );
  }
}

// POST - Create/track a new session
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const headersList = await headers();
    const userAgent = headersList.get('user-agent');
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ||
               headersList.get('x-real-ip') ||
               'Unknown';

    const { browser, os, device } = parseUserAgent(userAgent);

    // Generate cryptographically secure session token
    const sessionToken = `sess_${randomUUID()}_${randomBytes(8).toString('hex')}`;

    // Create session record
    const userSession = await prisma.userSession.create({
      data: {
        userId,
        sessionToken,
        userAgent,
        browser,
        os,
        device,
        ipAddress: ip,
        isCurrent: true,
      },
    });

    return NextResponse.json({
      session: userSession,
      sessionToken,
    });
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

// DELETE - Revoke a session
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const revokeAll = searchParams.get('all') === 'true';

    if (revokeAll) {
      // Revoke all sessions except current
      const headersList = await headers();
      const currentSessionToken = headersList.get('x-session-token');

      await prisma.userSession.deleteMany({
        where: {
          userId,
          ...(currentSessionToken && { sessionToken: { not: currentSessionToken } }),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'All other sessions revoked',
      });
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    const userSession = await prisma.userSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!userSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Delete the session
    await prisma.userSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({
      success: true,
      message: 'Session revoked',
    });
  } catch (error) {
    console.error('Revoke session error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke session' },
      { status: 500 }
    );
  }
}
