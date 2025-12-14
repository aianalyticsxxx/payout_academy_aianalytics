// ==========================================
// REGISTRATION API ROUTE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { verifyTurnstileToken, getClientIpForTurnstile } from '@/lib/security/turnstile';

// Strong password validation
const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

const RegisterSchema = z.object({
  email: z.string().email('Invalid email'),
  password: passwordSchema,
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z.string().min(1, 'Phone number is required'),
  turnstileToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, username, firstName, lastName, phone, turnstileToken } = RegisterSchema.parse(body);

    // SECURITY: Verify Turnstile CAPTCHA token
    const clientIp = getClientIpForTurnstile(req.headers);
    const turnstileResult = await verifyTurnstileToken(turnstileToken || '', clientIp);

    if (!turnstileResult.success) {
      return NextResponse.json(
        { error: turnstileResult.error || 'CAPTCHA verification failed' },
        { status: 400 }
      );
    }

    // SECURITY: Check both email and username, but return generic message
    // to prevent account enumeration attacks
    const [existingEmail, existingUsername] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { username } }),
    ]);

    if (existingEmail || existingUsername) {
      // SECURITY: Generic error message prevents attackers from knowing which field exists
      return NextResponse.json(
        { error: 'Registration failed. Please try different credentials.' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        hashedPassword,
        name: `${firstName} ${lastName}`,
        phoneNumber: phone || null,
        avatar: '🎲',
        tier: 'Bronze',
      },
    });

    // Create leaderboard entry
    await prisma.globalLeaderboard.create({
      data: {
        userId: user.id,
      },
    });

    return NextResponse.json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
