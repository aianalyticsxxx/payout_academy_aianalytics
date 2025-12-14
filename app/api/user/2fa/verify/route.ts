// ==========================================
// 2FA VERIFY API ROUTE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { authenticator } from 'otplib';
import { z } from 'zod';
import { decrypt } from '@/lib/security/encryption';

const VerifySchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

// SECURITY: 2FA attempt tracking
const TWO_FA_MAX_ATTEMPTS = 5;
const TWO_FA_LOCKOUT_MINUTES = 15;

// Verify code and enable 2FA
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { code } = VerifySchema.parse(body);

    // Get user with secret and lockout info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorSecret: true,
        twoFactorEnabled: true,
        twoFactorAttempts: true,
        twoFactorLockedUntil: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // SECURITY: Check if 2FA is locked out
    if (user.twoFactorLockedUntil && user.twoFactorLockedUntil > new Date()) {
      const remainingMs = user.twoFactorLockedUntil.getTime() - Date.now();
      const remainingMins = Math.ceil(remainingMs / 60000);
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${remainingMins} minutes.` },
        { status: 429 }
      );
    }

    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { error: 'Please setup 2FA first' },
        { status: 400 }
      );
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is already enabled' },
        { status: 400 }
      );
    }

    // SECURITY: Decrypt the stored secret before verification
    const decryptedSecret = decrypt(user.twoFactorSecret);

    // Verify the code
    const isValid = authenticator.verify({
      token: code,
      secret: decryptedSecret,
    });

    if (!isValid) {
      // SECURITY: Track failed attempts
      const newAttempts = (user.twoFactorAttempts || 0) + 1;
      const isLocked = newAttempts >= TWO_FA_MAX_ATTEMPTS;

      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorAttempts: newAttempts,
          ...(isLocked && {
            twoFactorLockedUntil: new Date(Date.now() + TWO_FA_LOCKOUT_MINUTES * 60 * 1000),
          }),
        },
      });

      if (isLocked) {
        return NextResponse.json(
          { error: `Too many failed attempts. Locked for ${TWO_FA_LOCKOUT_MINUTES} minutes.` },
          { status: 429 }
        );
      }

      const remaining = TWO_FA_MAX_ATTEMPTS - newAttempts;
      return NextResponse.json(
        { error: `Invalid verification code. ${remaining} attempts remaining.` },
        { status: 400 }
      );
    }

    // Enable 2FA and reset attempts on success
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorAttempts: 0,
        twoFactorLockedUntil: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: '2FA has been enabled successfully',
    });
  } catch (error) {
    console.error('2FA verify error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to verify 2FA' },
      { status: 500 }
    );
  }
}
