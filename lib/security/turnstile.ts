// ==========================================
// CLOUDFLARE TURNSTILE CAPTCHA VERIFICATION
// ==========================================
// Protects auth endpoints from bots and automated attacks

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

// ==========================================
// VERIFY TURNSTILE TOKEN
// ==========================================

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // Skip verification in development if no key configured
  if (!secretKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Turnstile] No secret key configured - skipping verification (dev only)');
      return { success: true };
    }
    console.error('[Turnstile] TURNSTILE_SECRET_KEY not configured');
    return { success: false, error: 'CAPTCHA verification unavailable' };
  }

  // Validate token exists
  if (!token || typeof token !== 'string' || token.length < 10) {
    return { success: false, error: 'Invalid CAPTCHA token' };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      console.error('[Turnstile] API error:', response.status);
      return { success: false, error: 'CAPTCHA verification failed' };
    }

    const result: TurnstileVerifyResponse = await response.json();

    if (!result.success) {
      const errorCodes = result['error-codes'] || [];
      console.warn('[Turnstile] Verification failed:', errorCodes);

      // Map error codes to user-friendly messages
      if (errorCodes.includes('timeout-or-duplicate')) {
        return { success: false, error: 'CAPTCHA expired. Please try again.' };
      }
      if (errorCodes.includes('invalid-input-response')) {
        return { success: false, error: 'Invalid CAPTCHA. Please try again.' };
      }

      return { success: false, error: 'CAPTCHA verification failed' };
    }

    return { success: true };
  } catch (error) {
    console.error('[Turnstile] Verification error:', error);
    return { success: false, error: 'CAPTCHA verification failed' };
  }
}

// ==========================================
// GET CLIENT IP FOR VERIFICATION
// ==========================================

export function getClientIpForTurnstile(headers: Headers): string | undefined {
  // Cloudflare provides the real IP
  return (
    headers.get('cf-connecting-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    undefined
  );
}

// ==========================================
// EXPORTS
// ==========================================

export default {
  verifyTurnstileToken,
  getClientIpForTurnstile,
};
