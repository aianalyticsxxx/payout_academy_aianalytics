// ==========================================
// ACCOUNT LOCKOUT MECHANISM
// ==========================================
// Prevents brute force attacks on login

import { prisma } from '@/lib/db/prisma';

// ==========================================
// CONFIG
// ==========================================

export const LOCKOUT_CONFIG = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  RESET_ATTEMPTS_AFTER_MS: 60 * 60 * 1000, // 1 hour
} as const;

// ==========================================
// CHECK IF ACCOUNT IS LOCKED
// ==========================================

export async function isAccountLocked(email: string): Promise<{
  locked: boolean;
  remainingMs?: number;
  failedAttempts?: number;
}> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      failedLoginAttempts: true,
      lastFailedLogin: true,
      lockedUntil: true,
    },
  });

  if (!user) {
    // Don't reveal whether email exists
    return { locked: false };
  }

  // Check if currently locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMs = user.lockedUntil.getTime() - Date.now();
    return {
      locked: true,
      remainingMs,
      failedAttempts: user.failedLoginAttempts,
    };
  }

  return {
    locked: false,
    failedAttempts: user.failedLoginAttempts,
  };
}

// ==========================================
// RECORD FAILED LOGIN
// ==========================================

export async function recordFailedLogin(email: string): Promise<{
  locked: boolean;
  failedAttempts: number;
  remainingAttempts: number;
  lockedUntil?: Date;
}> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      failedLoginAttempts: true,
      lastFailedLogin: true,
    },
  });

  if (!user) {
    // Don't reveal whether email exists
    return {
      locked: false,
      failedAttempts: 0,
      remainingAttempts: LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS,
    };
  }

  // Reset counter if last attempt was long ago
  let currentAttempts = user.failedLoginAttempts;
  if (
    user.lastFailedLogin &&
    Date.now() - user.lastFailedLogin.getTime() > LOCKOUT_CONFIG.RESET_ATTEMPTS_AFTER_MS
  ) {
    currentAttempts = 0;
  }

  const newAttempts = currentAttempts + 1;
  const shouldLock = newAttempts >= LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS;
  const lockedUntil = shouldLock
    ? new Date(Date.now() + LOCKOUT_CONFIG.LOCKOUT_DURATION_MS)
    : null;

  // Update user record
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: newAttempts,
      lastFailedLogin: new Date(),
      ...(lockedUntil && { lockedUntil }),
    },
  });

  // Log security event
  console.warn(`[Security] Failed login attempt for ${email}. Attempts: ${newAttempts}/${LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS}`);

  if (shouldLock) {
    console.warn(`[Security] Account locked for ${email} until ${lockedUntil}`);
  }

  return {
    locked: shouldLock,
    failedAttempts: newAttempts,
    remainingAttempts: Math.max(0, LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS - newAttempts),
    lockedUntil: lockedUntil || undefined,
  };
}

// ==========================================
// RESET FAILED LOGINS ON SUCCESS
// ==========================================

export async function resetFailedLogins(email: string): Promise<void> {
  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: {
      failedLoginAttempts: 0,
      lastFailedLogin: null,
      lockedUntil: null,
    },
  });
}

// ==========================================
// FORMAT LOCKOUT MESSAGE
// ==========================================

export function formatLockoutMessage(remainingMs: number): string {
  const minutes = Math.ceil(remainingMs / 60000);
  if (minutes === 1) {
    return 'Account temporarily locked. Try again in 1 minute.';
  }
  return `Account temporarily locked. Try again in ${minutes} minutes.`;
}

// ==========================================
// EXPORTS
// ==========================================

export default {
  isAccountLocked,
  recordFailedLogin,
  resetFailedLogins,
  formatLockoutMessage,
  LOCKOUT_CONFIG,
};
