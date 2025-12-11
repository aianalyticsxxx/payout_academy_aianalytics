// ==========================================
// USER BAN/UNBAN API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/helpers';
import { prisma } from '@/lib/db/prisma';
import { logAdminAction } from '@/lib/crm/adminLog';

// POST - Ban or unban a user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session } = await requireSuperAdmin();
    const { id: userId } = await params;
    const body = await req.json();
    const { action, reason } = body;

    if (!['ban', 'unban'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, isBanned: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent banning admins
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Cannot ban admin users' },
        { status: 403 }
      );
    }

    const adminId = (session.user as any).id;

    if (action === 'ban') {
      if (user.isBanned) {
        return NextResponse.json({ error: 'User is already banned' }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: true,
          bannedAt: new Date(),
          bannedBy: adminId,
          banReason: reason || 'No reason provided',
        },
      });

      await logAdminAction({
        adminId,
        action: 'BAN_USER',
        targetType: 'USER',
        targetId: userId,
        metadata: { reason, userEmail: user.email },
      });

      return NextResponse.json({
        success: true,
        message: `User ${user.username || user.email} has been banned`,
      });
    }

    if (action === 'unban') {
      if (!user.isBanned) {
        return NextResponse.json({ error: 'User is not banned' }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: false,
          bannedAt: null,
          bannedBy: null,
          banReason: null,
        },
      });

      await logAdminAction({
        adminId,
        action: 'UNBAN_USER',
        targetType: 'USER',
        targetId: userId,
        metadata: { userEmail: user.email },
      });

      return NextResponse.json({
        success: true,
        message: `User ${user.username || user.email} has been unbanned`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Super admin')) {
        return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.error('Ban/unban error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
