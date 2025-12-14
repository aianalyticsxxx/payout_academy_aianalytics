// ==========================================
// AUTH HELPERS - CRM ADMIN ACCESS CONTROL
// ==========================================

import { getServerSession } from 'next-auth';
import { authOptions } from './config';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

/**
 * Require authenticated user session
 * @throws Error if not authenticated
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session;
}

/**
 * Require admin or super admin role
 * Checks role from DATABASE (not JWT) to handle role updates without re-login
 * @throws Error if not admin
 */
export async function requireAdmin() {
  const session = await requireAuth();
  const userId = (session.user as any).id;

  // Fetch current role from database (not stale JWT)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const role = (user?.role || 'USER') as UserRole;

  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    throw new Error('Admin access required');
  }

  return { session, role };
}

/**
 * Require super admin role
 * Checks role from DATABASE (not JWT) to handle role updates without re-login
 * @throws Error if not super admin
 */
export async function requireSuperAdmin() {
  const session = await requireAuth();
  const userId = (session.user as any).id;

  // Fetch current role from database (not stale JWT)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const role = (user?.role || 'USER') as UserRole;

  if (role !== 'SUPER_ADMIN') {
    throw new Error('Super admin access required');
  }

  return { session, role };
}

/**
 * Check if user has admin role (without throwing)
 * Fetches from DATABASE for accurate role check
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return false;

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const role = (user?.role || 'USER') as UserRole;
    return role === 'ADMIN' || role === 'SUPER_ADMIN';
  } catch {
    return false;
  }
}

/**
 * Check if user has super admin role (without throwing)
 * Fetches from DATABASE for accurate role check
 */
export async function isSuperAdmin(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return false;

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const role = (user?.role || 'USER') as UserRole;
    return role === 'SUPER_ADMIN';
  } catch {
    return false;
  }
}

// ==========================================
// RESPONSE HELPERS
// ==========================================

export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function badRequestResponse(message = 'Bad Request') {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFoundResponse(message = 'Not Found') {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverErrorResponse(message = 'Internal Server Error') {
  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * SECURITY: Handle Zod validation errors safely
 * In production, only return generic message to prevent schema exposure
 * In development, return full validation details for debugging
 */
export function zodErrorResponse(error: { errors: Array<{ message: string; path: (string | number)[] }> }, genericMessage = 'Invalid request data') {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // SECURITY: Only return the first error message, no field paths
    const firstError = error.errors[0]?.message || genericMessage;
    return NextResponse.json(
      { error: firstError },
      { status: 400 }
    );
  }

  // Development: full details for debugging
  return NextResponse.json(
    { error: genericMessage, details: error.errors },
    { status: 400 }
  );
}

// ==========================================
// 2FA VERIFICATION FOR SENSITIVE OPERATIONS
// ==========================================

import { authenticator } from 'otplib';
import { decrypt, verifyBackupCode } from '@/lib/security/encryption';

/**
 * SECURITY: Require 2FA verification for sensitive admin actions
 * This provides step-up authentication for critical operations
 * @param userId - The admin user's ID
 * @param totpCode - The TOTP code or backup code provided
 * @throws Error if 2FA verification fails
 */
export async function require2FAForSensitiveAction(
  userId: string,
  totpCode: string
): Promise<{ verified: boolean; method: '2fa' | 'backup' }> {
  // Get user's 2FA configuration
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorBackupCodes: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // SECURITY: 2FA is MANDATORY for admins performing sensitive actions in production
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error(`[SECURITY] Admin ${userId} attempted sensitive action without 2FA - DENIED`);
      throw new Error('2FA must be enabled to perform this action. Please enable 2FA in your account settings.');
    }
    // In development, allow with warning for testing convenience
    console.warn(`[SECURITY] Admin ${userId} performing sensitive action without 2FA (dev mode only)`);
    return { verified: true, method: '2fa' };
  }

  // Try TOTP verification first
  try {
    const decryptedSecret = decrypt(user.twoFactorSecret);
    const isValidTotp = authenticator.verify({
      token: totpCode.replace(/[-\s]/g, ''), // Remove dashes/spaces
      secret: decryptedSecret,
    });

    if (isValidTotp) {
      return { verified: true, method: '2fa' };
    }
  } catch (error) {
    console.error('[2FA] TOTP verification error:', error);
  }

  // Try backup code verification
  if (user.twoFactorBackupCodes) {
    try {
      const backupCodes = JSON.parse(user.twoFactorBackupCodes) as string[];

      for (let i = 0; i < backupCodes.length; i++) {
        // verifyBackupCode handles normalization internally
        if (verifyBackupCode(totpCode, backupCodes[i])) {
          // SECURITY: Remove used backup code
          backupCodes.splice(i, 1);
          await prisma.user.update({
            where: { id: userId },
            data: { twoFactorBackupCodes: JSON.stringify(backupCodes) },
          });
          console.log(`[SECURITY] Backup code used by admin ${userId}`);
          return { verified: true, method: 'backup' };
        }
      }
    } catch (error) {
      console.error('[2FA] Backup code verification error:', error);
    }
  }

  throw new Error('Invalid 2FA code');
}

/**
 * Check if admin has 2FA enabled
 */
export async function adminHas2FAEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  });
  return user?.twoFactorEnabled ?? false;
}
