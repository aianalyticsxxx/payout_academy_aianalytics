// ==========================================
// CRM CUSTOM REFERRAL LINKS API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const CreateLinkSchema = z.object({
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  referrerReward: z.number().min(0).max(1).default(0.15),
  referredDiscount: z.number().min(0).max(1).default(0.15),
  expiresAt: z.string().optional(),
});

// GET - List all custom referral links
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const links = await prisma.customReferralLink.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { referrals: true },
        },
      },
    });

    // Generate full URLs
    const baseUrl = process.env.NEXTAUTH_URL || 'https://zalogche.com';
    const linksWithUrls = links.map(link => ({
      ...link,
      fullUrl: `${baseUrl}/register?ref=${link.slug}`,
      referralCount: link._count.referrals,
    }));

    return NextResponse.json({ links: linksWithUrls });
  } catch (error) {
    console.error('Failed to fetch custom links:', error);
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
  }
}

// POST - Create new custom referral link
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const result = CreateLinkSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.errors },
        { status: 400 }
      );
    }

    const { slug, name, description, referrerReward, referredDiscount, expiresAt } = result.data;

    // Check if slug already exists
    const existing = await prisma.customReferralLink.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A link with this slug already exists' },
        { status: 409 }
      );
    }

    // Also check if slug conflicts with a user referral code
    const userWithCode = await prisma.user.findUnique({
      where: { referralCode: slug.toUpperCase() },
    });

    if (userWithCode) {
      return NextResponse.json(
        { error: 'This slug conflicts with an existing user referral code' },
        { status: 409 }
      );
    }

    const link = await prisma.customReferralLink.create({
      data: {
        slug: slug.toLowerCase(),
        name,
        description,
        referrerReward,
        referredDiscount,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: user.id,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'https://zalogche.com';

    return NextResponse.json({
      link: {
        ...link,
        fullUrl: `${baseUrl}/register?ref=${link.slug}`,
      },
    });
  } catch (error) {
    console.error('Failed to create custom link:', error);
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
  }
}
