// ==========================================
// STRIPE CHECKOUT API ROUTE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe';
import { canCreateChallenge } from '@/lib/challenges/challenge-service';
import { getTierBySize, DifficultyType, DIFFICULTY_CONFIG } from '@/lib/challenges/constants';
import { getUserReferralDiscount } from '@/lib/referral/process-referral';
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
    const email = user.email;
    const name = user.name || user.username;

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

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(userId, email, name);

    const difficultyConfig = DIFFICULTY_CONFIG[difficulty as DifficultyType];

    // Check for referral discount
    const referralDiscount = await getUserReferralDiscount(userId);
    const originalPrice = tierData.cost;
    const discountAmount = referralDiscount > 0 ? originalPrice * referralDiscount : 0;
    const finalPrice = originalPrice - discountAmount;

    // Build line items
    const lineItems: any[] = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${difficultyConfig.icon} ${tierData.label} ${difficultyConfig.name} Challenge`,
            description: `Streak challenge with ${tierData.rewards.reduce((a, b) => a + b, 0).toLocaleString()} max payout. Min odds: ${difficultyConfig.minOdds}x`,
            metadata: {
              tier: tier.toString(),
              difficulty,
            },
          },
          unit_amount: Math.round(finalPrice * 100), // Convert to cents
        },
        quantity: 1,
      },
    ];

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      metadata: {
        userId,
        tier: tier.toString(),
        difficulty,
        type: 'challenge_purchase',
        referralDiscount: referralDiscount.toString(),
        originalPrice: originalPrice.toString(),
      },
      success_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/?challenge_success=true&tier=${tier}&difficulty=${difficulty}`,
      cancel_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/?challenge_cancelled=true`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
