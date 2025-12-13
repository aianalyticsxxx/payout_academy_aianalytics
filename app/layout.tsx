// ==========================================
// ROOT LAYOUT
// ==========================================

import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { LanguageProvider } from '@/lib/i18n';

const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Zalogche',
  description: 'Premium AI-powered sports betting analysis with 7-model swarm intelligence',
  keywords: ['sports betting', 'AI', 'analytics', 'predictions', 'professional betting'],
  authors: [{ name: 'Zalogche' }],
  openGraph: {
    title: 'Zalogche',
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
        <LanguageProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
