// ==========================================
// CRM CUSTOM REFERRAL LINK MANAGEMENT API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const UpdateLinkSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  referrerReward: z.number().min(0).max(1).optional(),
  referredDiscount: z.number().min(0).max(1).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().nullable().optional(),
});

// GET - Get single link details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const link = await prisma.customReferralLink.findUnique({
      where: { id },
      include: {
        referrals: {
          include: {
            referred: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'https://zalogche.com';

    return NextResponse.json({
      link: {
        ...link,
        fullUrl: `${baseUrl}/register?ref=${link.slug}`,
      },
    });
  } catch (error) {
    console.error('Failed to fetch link:', error);
    return NextResponse.json({ error: 'Failed to fetch link' }, { status: 500 });
  }
}

// PATCH - Update link
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const result = UpdateLinkSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.errors },
        { status: 400 }
      );
    }

    const data = result.data;
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.referrerReward !== undefined) updateData.referrerReward = data.referrerReward;
    if (data.referredDiscount !== undefined) updateData.referredDiscount = data.referredDiscount;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    }

    const link = await prisma.customReferralLink.update({
      where: { id },
      data: updateData,
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'https://zalogche.com';

    return NextResponse.json({
      link: {
        ...link,
        fullUrl: `${baseUrl}/register?ref=${link.slug}`,
      },
    });
  } catch (error) {
    console.error('Failed to update link:', error);
    return NextResponse.json({ error: 'Failed to update link' }, { status: 500 });
  }
}

// DELETE - Delete link
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only super admins can delete links' }, { status: 403 });
    }

    const { id } = await params;

    await prisma.customReferralLink.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete link:', error);
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 });
  }
}
