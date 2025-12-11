// ==========================================
// STRIPE WEBHOOK HANDLER
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { createChallenge } from '@/lib/challenges/challenge-service';
import { DifficultyType } from '@/lib/challenges/constants';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      // Check if this is a challenge purchase
      if (session.metadata?.type === 'challenge_purchase') {
        const userId = session.metadata.userId;
        const tier = parseInt(session.metadata.tier, 10);
        const difficulty = session.metadata.difficulty as DifficultyType;

        if (!userId || isNaN(tier)) {
          console.error('Invalid challenge metadata:', session.metadata);
          return NextResponse.json({ error: 'Invalid metadata' }, { status: 400 });
        }

        try {
          // Create the challenge now that payment is confirmed
          const challenge = await createChallenge(userId, tier, difficulty);
          console.log('Challenge created after payment:', challenge.id);
        } catch (error) {
          console.error('Failed to create challenge after payment:', error);
          // Note: Payment was successful but challenge creation failed
          // You may want to implement a retry mechanism or manual review process
          return NextResponse.json(
            { error: 'Challenge creation failed' },
            { status: 500 }
          );
        }
      }
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Checkout session expired:', session.id);
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('Payment failed:', paymentIntent.id);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

// Disable body parsing for webhooks (raw body needed for signature verification)
export const config = {
  api: {
    bodyParser: false,
  },
};
