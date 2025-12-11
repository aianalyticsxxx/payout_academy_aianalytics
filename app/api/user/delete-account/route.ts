// ==========================================
// DELETE ACCOUNT API ROUTE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const DeleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  confirmation: z.literal('DELETE MY ACCOUNT'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const data = DeleteAccountSchema.parse(body);

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { hashedPassword: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent admin deletion through this endpoint
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Admin accounts cannot be deleted through this endpoint' },
        { status: 403 }
      );
    }

    // Verify password if user has one
    if (user.hashedPassword) {
      const isValid = await bcrypt.compare(data.password, user.hashedPassword);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Incorrect password' },
          { status: 400 }
        );
      }
    }

    // Delete all user data in transaction
    await prisma.$transaction(async (tx) => {
      // Delete challenge rewards
      await tx.challengeReward.deleteMany({
        where: { challenge: { userId } },
      });

      // Delete challenges
      await tx.challenge.deleteMany({
        where: { userId },
      });

      // Delete parlay legs
      await tx.parlayLeg.deleteMany({
        where: { parlay: { userId } },
      });

      // Delete parlays
      await tx.parlay.deleteMany({
        where: { userId },
      });

      // Delete bets
      await tx.bet.deleteMany({
        where: { userId },
      });

      // Delete leaderboard entry
      await tx.globalLeaderboard.deleteMany({
        where: { userId },
      });

      // Delete admin logs if any
      await tx.adminLog.deleteMany({
        where: { adminId: userId },
      });

      // Finally delete user
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
