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
