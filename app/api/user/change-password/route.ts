// ==========================================
// CHANGE PASSWORD API ROUTE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// SECURITY: Password requirements must match registration (12+ chars, special char required)
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const data = ChangePasswordSchema.parse(body);

    // Get user with current password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { hashedPassword: true },
    });

    if (!user || !user.hashedPassword) {
      return NextResponse.json(
        { error: 'Cannot change password for this account type' },
        { status: 400 }
      );
    }

    // Verify current password
    const isValid = await bcrypt.compare(data.currentPassword, user.hashedPassword);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(data.newPassword, user.hashedPassword);
    if (isSamePassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: {
        hashedPassword,
        // SECURITY: Force re-authentication by updating timestamp
        // This will invalidate existing JWT tokens on next validation
        updatedAt: new Date(),
      },
    });

    // SECURITY: Invalidate all existing sessions for this user
    await prisma.session.deleteMany({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. Please log in again.',
      requireReauth: true,
    });
  } catch (error) {
    console.error('Change password error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
