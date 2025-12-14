// ==========================================
// 2FA SETUP API ROUTE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import { encrypt, hashBackupCode } from '@/lib/security/encryption';

// Generate a new 2FA secret and QR code
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is already enabled' },
        { status: 400 }
      );
    }

    // Generate new secret
    const secret = authenticator.generateSecret();

    // Create otpauth URL for QR code
    const appName = 'PayoutAcademy';
    const otpauthUrl = authenticator.keyuri(
      user.email || 'user',
      appName,
      secret
    );

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // SECURITY: Generate backup codes with higher entropy (6 bytes = 48 bits per code)
    // Format: XXXX-XXXX-XXXX for user-friendly display
    const backupCodes = Array.from({ length: 8 }, () => {
      const bytes = randomBytes(6).toString('hex').toUpperCase();
      return `${bytes.slice(0, 4)}-${bytes.slice(4, 8)}-${bytes.slice(8, 12)}`;
    });

    // SECURITY: Encrypt the 2FA secret before storing
    const encryptedSecret = encrypt(secret);

    // SECURITY: Hash backup codes (one-way) for storage
    const hashedBackupCodes = backupCodes.map((code) => hashBackupCode(code));

    // Store encrypted secret and hashed backup codes (not enabled yet)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: encryptedSecret,
        twoFactorBackupCodes: JSON.stringify(hashedBackupCodes),
      },
    });

    // SECURITY: Only return QR code (contains secret embedded) and backup codes
    // Never expose raw secret in API response - QR code is sufficient for authenticator apps
    // Backup codes are shown ONCE during setup - user must save them
    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      backupCodes,
      // IMPORTANT: Instruct user to save backup codes now - they won't be shown again
      message: 'Scan the QR code with your authenticator app. Save your backup codes securely - they will not be shown again.',
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup 2FA' },
      { status: 500 }
    );
  }
}

// Get 2FA status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    return NextResponse.json({
      enabled: user?.twoFactorEnabled || false,
    });
  } catch (error) {
    console.error('2FA status error:', error);
    return NextResponse.json(
      { error: 'Failed to get 2FA status' },
      { status: 500 }
    );
  }
}
