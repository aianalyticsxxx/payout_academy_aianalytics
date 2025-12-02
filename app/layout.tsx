// ==========================================
// ROOT LAYOUT
// ==========================================

import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Payout Academy Analytics',
  description: 'Premium AI-powered sports betting analysis with 7-model swarm intelligence',
  keywords: ['sports betting', 'AI', 'analytics', 'predictions', 'professional betting'],
  authors: [{ name: 'Payout Academy Analytics' }],
  openGraph: {
    title: 'Payout Academy Analytics',
    description: 'Premium AI-powered sports betting analysis',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className={dmSans.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
