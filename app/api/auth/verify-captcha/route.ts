// ==========================================
// CAPTCHA PRE-VERIFICATION FOR LOGIN
// ==========================================
// Verifies Turnstile token before login attempt

import { NextRequest, NextResponse } from 'next/server';
import { verifyTurnstileToken, getClientIpForTurnstile } from '@/lib/security/turnstile';

export async function POST(req: NextRequest) {
  try {
    const { turnstileToken } = await req.json();

    const clientIp = getClientIpForTurnstile(req.headers);
    const result = await verifyTurnstileToken(turnstileToken || '', clientIp);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
