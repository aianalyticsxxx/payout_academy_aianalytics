// ==========================================
// ADMIN ACTION LOGGING
// ==========================================

import { prisma } from '@/lib/db/prisma';

export interface AdminLogParams {
  adminId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

/**
 * Log an admin action for audit trail
 */
export async function logAdminAction(params: AdminLogParams) {
  try {
    await prisma.adminLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetType: params.targetType || null,
        targetId: params.targetId || null,
        metadata: params.metadata || null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    // Don't fail the main operation if logging fails
    console.error('Failed to log admin action:', error);
  }
}

/**
 * Get admin action logs with pagination
 */
export async function getAdminLogs(options: {
  page?: number;
  limit?: number;
  action?: string;
  adminId?: string;
  targetType?: string;
}) {
  const { page = 1, limit = 50, action, adminId, targetType } = options;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (action) where.action = action;
  if (adminId) where.adminId = adminId;
  if (targetType) where.targetType = targetType;

  const [logs, total] = await Promise.all([
    prisma.adminLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      include: {
        admin: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    }),
    prisma.adminLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Action type constants
export const AdminActions = {
  // User actions
  VIEW_USER: 'VIEW_USER',
  UPDATE_USER_ROLE: 'UPDATE_USER_ROLE',

  // Dashboard actions
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',

  // Reward actions
  VIEW_PENDING_REWARDS: 'VIEW_PENDING_REWARDS',
  PAY_REWARD: 'PAY_REWARD',

  // Bet actions
  VIEW_BETS: 'VIEW_BETS',
  SETTLE_BET: 'SETTLE_BET',

  // Challenge actions
  VIEW_CHALLENGES: 'VIEW_CHALLENGES',

  // Analytics actions
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  EXPORT_DATA: 'EXPORT_DATA',
} as const;
