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
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata,
        ipAddress: params.ipAddress,
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

// Action type constants - ONLY IMPORTANT ACTIONS
export const AdminActions = {
  // User actions (important changes only)
  UPDATE_USER_ROLE: 'UPDATE_USER_ROLE',
  BAN_USER: 'BAN_USER',
  UNBAN_USER: 'UNBAN_USER',
  DELETE_USER: 'DELETE_USER',

  // Reward actions
  PAY_REWARD: 'PAY_REWARD',
  REJECT_REWARD: 'REJECT_REWARD',

  // Bet actions
  SETTLE_BET: 'SETTLE_BET',
  VOID_BET: 'VOID_BET',

  // Challenge actions
  AWARD_FREE_CHALLENGE: 'AWARD_FREE_CHALLENGE',
  RESET_CHALLENGE_FREE: 'RESET_CHALLENGE_FREE',
  EXTEND_CHALLENGE: 'EXTEND_CHALLENGE',
  CANCEL_CHALLENGE: 'CANCEL_CHALLENGE',

  // Referral actions
  CREATE_REFERRAL_LINK: 'CREATE_REFERRAL_LINK',
  DELETE_REFERRAL_LINK: 'DELETE_REFERRAL_LINK',
  UPDATE_REFERRAL_LINK: 'UPDATE_REFERRAL_LINK',

  // Data actions
  EXPORT_DATA: 'EXPORT_DATA',
} as const;
