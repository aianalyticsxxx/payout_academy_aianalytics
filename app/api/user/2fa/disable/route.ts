// ==========================================
// 2FA DISABLE API ROUTE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { authenticator } from 'otplib';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const DisableSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  code: z.string().length(6, 'Code must be 6 digits'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { password, code } = DisableSchema.parse(body);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        hashedPassword: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      );
    }

    // Verify password
    if (user.hashedPassword) {
      const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 400 }
        );
      }
    }

    // Verify 2FA code or backup code
    let isValidCode = false;

    // Check TOTP code first
    if (user.twoFactorSecret) {
      isValidCode = authenticator.verify({
        token: code,
        secret: user.twoFactorSecret,
      });
    }

    // Check backup codes if TOTP failed
    if (!isValidCode && user.twoFactorBackupCodes) {
      const backupCodes = JSON.parse(user.twoFactorBackupCodes) as string[];
      const codeIndex = backupCodes.findIndex(
        (bc) => bc.toUpperCase() === code.toUpperCase()
      );

      if (codeIndex !== -1) {
        isValidCode = true;
        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        await prisma.user.update({
          where: { id: userId },
          data: { twoFactorBackupCodes: JSON.stringify(backupCodes) },
        });
      }
    }

    if (!isValidCode) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: '2FA has been disabled',
    });
  } catch (error) {
    console.error('2FA disable error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}
