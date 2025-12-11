// ==========================================
// CONFIRMO CRYPTO CHECKOUT API ROUTE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createConfirmoInvoice } from '@/lib/confirmo';
import { canCreateChallenge } from '@/lib/challenges/challenge-service';
import { getTierBySize, DifficultyType, DIFFICULTY_CONFIG } from '@/lib/challenges/constants';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const CheckoutSchema = z.object({
  tier: z.number(),
  difficulty: z.enum(['beginner', 'pro']).default('beginner'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const userId = user.id;

    // Parse and validate request
    const body = await req.json();
    const result = CheckoutSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.errors },
        { status: 400 }
      );
    }

    const { tier, difficulty } = result.data;

    // Validate tier exists
    const tierData = getTierBySize(tier, difficulty as DifficultyType);
    if (!tierData) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Check if user can create more challenges
    const createStatus = await canCreateChallenge(userId);
    if (!createStatus.canCreate) {
      return NextResponse.json(
        { error: `Maximum ${createStatus.maxAllowed} active challenges reached` },
        { status: 409 }
      );
    }

    const difficultyConfig = DIFFICULTY_CONFIG[difficulty as DifficultyType];
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Create a pending payment record to track the invoice
    const pendingPayment = await prisma.pendingPayment.create({
      data: {
        userId,
        tier,
        difficulty,
        amount: tierData.cost,
        currency: 'USD',
        provider: 'confirmo',
        status: 'pending',
      },
    });

    // Create Confirmo invoice
    const invoice = await createConfirmoInvoice({
      invoice: {
        currencyFrom: 'USD',
        amount: tierData.cost,
      },
      settlement: {
        currency: null, // Accept any crypto, settle to default
      },
      product: {
        name: `${difficultyConfig.icon} ${tierData.label} ${difficultyConfig.name} Challenge`,
        description: `Streak challenge with ${tierData.rewards.reduce((a, b) => a + b, 0).toLocaleString()} max payout. Min odds: ${difficultyConfig.minOdds}x`,
      },
      reference: pendingPayment.id,
      returnUrl: `${baseUrl}/?challenge_success=true&tier=${tier}&difficulty=${difficulty}&provider=crypto`,
      notifyUrl: `${baseUrl}/api/confirmo/webhook`,
    });

    // Update pending payment with invoice ID
    await prisma.pendingPayment.update({
      where: { id: pendingPayment.id },
      data: { externalId: invoice.id },
    });

    return NextResponse.json({
      invoiceId: invoice.id,
      url: invoice.url,
      pendingPaymentId: pendingPayment.id,
    });
  } catch (error) {
    console.error('Confirmo checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create crypto checkout' },
      { status: 500 }
    );
  }
}
