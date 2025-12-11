// ==========================================
// CONFIRMO WEBHOOK HANDLER
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyConfirmoWebhook, ConfirmoWebhookPayload } from '@/lib/confirmo';
import { createChallenge } from '@/lib/challenges/challenge-service';
import { prisma } from '@/lib/db/prisma';
import { DifficultyType } from '@/lib/challenges/constants';

export async function POST(req: NextRequest) {
  try {
    const payload: ConfirmoWebhookPayload = await req.json();

    console.log('Confirmo webhook received:', payload.id, payload.status);

    // Verify the webhook by fetching invoice details
    const invoice = await verifyConfirmoWebhook(payload);

    if (!invoice) {
      console.error('Failed to verify Confirmo webhook');
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    // Find the pending payment by external ID (Confirmo invoice ID)
    const pendingPayment = await prisma.pendingPayment.findFirst({
      where: { externalId: payload.id },
    });

    if (!pendingPayment) {
      console.error('Pending payment not found for invoice:', payload.id);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Handle different statuses
    switch (invoice.status) {
      case 'paid': {
        // Check if already processed
        if (pendingPayment.status === 'paid') {
          console.log('Payment already processed:', pendingPayment.id);
          return NextResponse.json({ received: true, message: 'Already processed' });
        }

        try {
          // Create the challenge
          const challenge = await createChallenge(
            pendingPayment.userId,
            pendingPayment.tier,
            pendingPayment.difficulty as DifficultyType
          );

          // Update pending payment status
          await prisma.pendingPayment.update({
            where: { id: pendingPayment.id },
            data: {
              status: 'paid',
              paidAt: new Date(),
            },
          });

          console.log('Challenge created via Confirmo:', challenge.id);
        } catch (error) {
          console.error('Failed to create challenge after Confirmo payment:', error);
          // Mark as failed but don't throw - we received the payment
          await prisma.pendingPayment.update({
            where: { id: pendingPayment.id },
            data: { status: 'failed' },
          });
          return NextResponse.json(
            { error: 'Challenge creation failed' },
            { status: 500 }
          );
        }
        break;
      }

      case 'expired': {
        await prisma.pendingPayment.update({
          where: { id: pendingPayment.id },
          data: { status: 'expired' },
        });
        console.log('Payment expired:', pendingPayment.id);
        break;
      }

      case 'error': {
        await prisma.pendingPayment.update({
          where: { id: pendingPayment.id },
          data: { status: 'failed' },
        });
        console.log('Payment failed:', pendingPayment.id);
        break;
      }

      case 'confirming':
      case 'active':
      case 'prepared': {
        // These are intermediate states, no action needed
        console.log(`Payment status update: ${invoice.status} for ${pendingPayment.id}`);
        break;
      }

      default:
        console.log(`Unhandled invoice status: ${invoice.status}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Confirmo webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
