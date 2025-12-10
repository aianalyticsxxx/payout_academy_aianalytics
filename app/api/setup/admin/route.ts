// ==========================================
// TEMPORARY SETUP ENDPOINT
// ==========================================
// Run this once to set up initial super admin, then DELETE this file
// Usage: POST http://localhost:3000/api/setup/admin
// Set INITIAL_SUPER_ADMIN_EMAIL in .env.local first

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: NextRequest) {
  try {
    // Get email from environment variable
    const email = process.env.INITIAL_SUPER_ADMIN_EMAIL;

    if (!email) {
      return NextResponse.json(
        { error: 'INITIAL_SUPER_ADMIN_EMAIL not configured in .env.local' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: `User with email ${email} not found. Please register first.` },
        { status: 404 }
      );
    }

    // Update user to SUPER_ADMIN
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        role: 'SUPER_ADMIN',
        roleUpdatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        roleUpdatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Super admin created successfully',
      user: updatedUser,
      warning: 'DELETE THIS FILE (/app/api/setup/admin/route.ts) NOW FOR SECURITY',
    });
  } catch (error) {
    console.error('Setup admin error:', error);
    return NextResponse.json(
      { error: 'Failed to set up super admin' },
      { status: 500 }
    );
  }
}

// GET endpoint to check current status
export async function GET(req: NextRequest) {
  try {
    const email = process.env.INITIAL_SUPER_ADMIN_EMAIL;

    if (!email) {
      return NextResponse.json({
        configured: false,
        message: 'Set INITIAL_SUPER_ADMIN_EMAIL in .env.local',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });

    return NextResponse.json({
      configured: true,
      email,
      userExists: !!user,
      currentRole: user?.role || null,
      isSuperAdmin: user?.role === 'SUPER_ADMIN',
    });
  } catch (error) {
    console.error('Check admin error:', error);
    return NextResponse.json(
      { error: 'Failed to check admin status' },
      { status: 500 }
    );
  }
}
