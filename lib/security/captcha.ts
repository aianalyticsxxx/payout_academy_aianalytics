// ==========================================
// CAPTCHA VERIFICATION (Cloudflare Turnstile)
// ==========================================
// Lightweight, privacy-focused alternative to reCAPTCHA
// Docs: https://developers.cloudflare.com/turnstile/

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface CaptchaVerifyResult {
  success: boolean;
  errorCodes?: string[];
  challengeTs?: string;
  hostname?: string;
}

/**
 * Verify a Turnstile CAPTCHA token
 * @param token - The token from the client-side widget
 * @param remoteIp - Optional IP address for additional validation
 * @returns Verification result
 */
export async function verifyCaptcha(
  token: string,
  remoteIp?: string
): Promise<CaptchaVerifyResult> {
  // Skip verification in development if not configured
  if (!TURNSTILE_SECRET_KEY) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[CAPTCHA] Skipping verification - TURNSTILE_SECRET_KEY not set');
      return { success: true };
    }
    // In production, require CAPTCHA
    console.error('[CAPTCHA] TURNSTILE_SECRET_KEY not configured');
    return { success: false, errorCodes: ['missing-secret-key'] };
  }

  // Skip for test tokens in development
  if (process.env.NODE_ENV === 'development' && token === 'test-token') {
    return { success: true };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', TURNSTILE_SECRET_KEY);
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
      console.error('[CAPTCHA] Verification request failed:', response.status);
      return { success: false, errorCodes: ['request-failed'] };
    }

    const data = await response.json();

    return {
      success: data.success === true,
      errorCodes: data['error-codes'],
      challengeTs: data.challenge_ts,
      hostname: data.hostname,
    };
  } catch (error) {
    console.error('[CAPTCHA] Verification error:', error);
    return { success: false, errorCodes: ['verification-error'] };
  }
}

/**
 * Middleware helper to require CAPTCHA verification
 */
export async function requireCaptcha(
  token: string | null | undefined,
  remoteIp?: string
): Promise<{ valid: boolean; error?: string }> {
  if (!token) {
    return { valid: false, error: 'CAPTCHA verification required' };
  }

  const result = await verifyCaptcha(token, remoteIp);

  if (!result.success) {
    const errorMessage = result.errorCodes?.includes('timeout-or-duplicate')
      ? 'CAPTCHA expired, please try again'
      : 'CAPTCHA verification failed';
    return { valid: false, error: errorMessage };
  }

  return { valid: true };
}

// ==========================================
// ERROR CODE MEANINGS
// ==========================================
// missing-input-secret: Secret key not provided
// invalid-input-secret: Secret key is invalid
// missing-input-response: Token not provided
// invalid-input-response: Token is invalid or expired
// bad-request: Request was malformed
// timeout-or-duplicate: Token has expired or already used
// internal-error: Cloudflare internal error

// ==========================================
// CLIENT-SIDE SETUP (for reference)
// ==========================================
/*
Add to .env.local:
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
TURNSTILE_SECRET_KEY=your-secret-key

Add to _app.tsx or layout.tsx:
<Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />

Add widget to form:
<div
  className="cf-turnstile"
  data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
  data-callback="onCaptchaSuccess"
/>

Or use React component:
import { Turnstile } from '@marsidev/react-turnstile';
<Turnstile
  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
  onSuccess={(token) => setCaptchaToken(token)}
/>
*/
