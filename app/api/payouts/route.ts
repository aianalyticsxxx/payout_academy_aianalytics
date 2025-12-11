// ==========================================
// PAYOUT REQUESTS API ROUTE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const BankDetailsSchema = z.object({
  iban: z.string().min(15).max(34),
  accountName: z.string().min(2).max(100),
  bankName: z.string().optional(),
});

const PayPalDetailsSchema = z.object({
  paypalEmail: z.string().email(),
});

const CryptoDetailsSchema = z.object({
  walletAddress: z.string().min(26).max(100),
  network: z.enum(['bitcoin', 'ethereum', 'usdt-trc20', 'usdt-erc20']),
});

const CreatePayoutRequestSchema = z.object({
  amount: z.number().positive().min(10), // Minimum €10 withdrawal
  paymentMethod: z.enum(['bank', 'paypal', 'crypto']),
  paymentDetails: z.union([BankDetailsSchema, PayPalDetailsSchema, CryptoDetailsSchema]),
});

// ==========================================
// HELPERS
// ==========================================

async function getAvailableBalance(userId: string): Promise<number> {
  // Get total rewards earned from all challenges
  const challenges = await prisma.challenge.findMany({
    where: { userId },
    select: { totalRewardsEarned: true },
  });

  const totalEarned = challenges.reduce((sum, c) => sum + c.totalRewardsEarned, 0);

  // Get total already withdrawn or pending
  const payouts = await prisma.payoutRequest.findMany({
    where: {
      userId,
      status: { in: ['pending', 'processing', 'completed'] },
    },
    select: { amount: true },
  });

  const totalWithdrawn = payouts.reduce((sum, p) => sum + p.amount, 0);

  return Math.max(0, totalEarned - totalWithdrawn);
}

// ==========================================
// GET - List user's payout requests
// ==========================================

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    console.log('[Payouts API] userId:', userId, 'email:', (session.user as any).email);
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const payouts = await prisma.payoutRequest.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.payoutRequest.count({
      where: {
        userId,
        ...(status && { status }),
      },
    });

    // Get available balance
    const availableBalance = await getAvailableBalance(userId);
    console.log('[Payouts API] availableBalance:', availableBalance);

    return NextResponse.json({
      payouts,
      total,
      availableBalance,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get payouts error:', error);
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
  }
}

// ==========================================
// POST - Create payout request
// ==========================================

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const data = CreatePayoutRequestSchema.parse(body);

    // Validate payment details match payment method
    if (data.paymentMethod === 'bank') {
      BankDetailsSchema.parse(data.paymentDetails);
    } else if (data.paymentMethod === 'paypal') {
      PayPalDetailsSchema.parse(data.paymentDetails);
    } else if (data.paymentMethod === 'crypto') {
      CryptoDetailsSchema.parse(data.paymentDetails);
    }

    // Check available balance
    const availableBalance = await getAvailableBalance(userId);

    if (data.amount > availableBalance) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          message: `Available balance is €${availableBalance.toFixed(2)}. You requested €${data.amount.toFixed(2)}.`,
          availableBalance,
        },
        { status: 400 }
      );
    }

    // Check for existing pending request
    const existingPending = await prisma.payoutRequest.findFirst({
      where: {
        userId,
        status: 'pending',
      },
    });

    if (existingPending) {
      return NextResponse.json(
        {
          error: 'Pending request exists',
          message: 'You already have a pending payout request. Please wait for it to be processed.',
        },
        { status: 400 }
      );
    }

    // Create payout request
    const payout = await prisma.payoutRequest.create({
      data: {
        userId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentDetails: data.paymentDetails,
        status: 'pending',
      },
    });

    return NextResponse.json(
      {
        payout,
        message: 'Payout request submitted successfully. Processing typically takes 1-3 business days.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create payout error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to create payout request' }, { status: 500 });
  }
}
