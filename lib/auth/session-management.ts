// ==========================================
// SESSION MANAGEMENT UTILITIES
// ==========================================
// Functions for managing user sessions and token rotation

import { prisma } from '@/lib/db/prisma';

// ==========================================
// INVALIDATE ALL SESSIONS
// ==========================================

/**
 * SECURITY: Invalidate all sessions for a user by incrementing their token version.
 * Use cases:
 * - Password change
 * - Logout from all devices
 * - Account security incident
 * - Admin forcing re-authentication
 *
 * @param userId - The user ID to invalidate sessions for
 * @returns The new token version
 */
export async function invalidateAllSessions(userId: string): Promise<number> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      tokenVersion: {
        increment: 1,
      },
    },
    select: { tokenVersion: true },
  });

  console.log(`[Security] All sessions invalidated for user ${userId}. New token version: ${user.tokenVersion}`);

  return user.tokenVersion || 0;
}

/**
 * SECURITY: Invalidate sessions and update password atomically.
 * This ensures that changing password also logs out all devices.
 *
 * @param userId - The user ID
 * @param newHashedPassword - The new bcrypt-hashed password
 */
export async function changePasswordAndInvalidateSessions(
  userId: string,
  newHashedPassword: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      hashedPassword: newHashedPassword,
      tokenVersion: {
        increment: 1,
      },
    },
  });

  console.log(`[Security] Password changed and all sessions invalidated for user ${userId}`);
}

/**
 * Get the current token version for a user
 * @param userId - The user ID
 */
export async function getTokenVersion(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true },
  });

  return user?.tokenVersion || 0;
}

/**
 * SECURITY: Ban user and invalidate all sessions
 * @param userId - The user ID to ban
 * @param reason - Optional reason for the ban (logged)
 */
export async function banUserAndInvalidateSessions(
  userId: string,
  reason?: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      isBanned: true,
      tokenVersion: {
        increment: 1,
      },
    },
  });

  console.log(`[Security] User ${userId} banned and sessions invalidated. Reason: ${reason || 'Not specified'}`);
}

/**
 * SECURITY: Unban user (they will need to log in again)
 * @param userId - The user ID to unban
 */
export async function unbanUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      isBanned: false,
    },
  });

  console.log(`[Security] User ${userId} unbanned`);
}

// ==========================================
// EXPORTS
// ==========================================

export default {
  invalidateAllSessions,
  changePasswordAndInvalidateSessions,
  getTokenVersion,
  banUserAndInvalidateSessions,
  unbanUser,
};
