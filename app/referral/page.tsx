// ==========================================
// REFERRAL PAGE
// ==========================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLanguage, LanguageSwitcher } from '@/lib/i18n';

interface ReferralData {
  referralCode: string;
  referralLink: string;
  stats: {
    totalReferrals: number;
    pendingReferrals: number;
    qualifiedReferrals: number;
    totalEarned: number;
    pendingRewards: number;
  };
  referrals: Array<{
    id: string;
    status: string;
    rewardAmount: number;
    createdAt: string;
    qualifiedAt: string | null;
    referred: {
      username: string;
      avatar: string;
      joinedAt: string;
    };
  }>;
}

export default function ReferralPage() {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/referral');
      return;
    }
    if (status === 'authenticated') {
      fetchReferralData();
    }
  }, [status, router]);

  const fetchReferralData = async () => {
    try {
      setError(null);
      const response = await fetch('/api/referral');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        setError(t.referral.failedToLoad);
      }
    } catch (err) {
      console.error('Failed to fetch referral data:', err);
      setError(t.referral.failedToLoad);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">{t.referral.loading}</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">{t.referral.redirecting}</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center gap-4">
        <div className="text-red-400">{error || t.referral.failedToLoad}</div>
        <button
          onClick={() => {
            setLoading(true);
            fetchReferralData();
          }}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
        >
          {t.referral.tryAgain}
        </button>
        <Link href="/" className="text-zinc-400 hover:text-white text-sm">
          {t.referral.backToDashboard}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <div className="bg-surface border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            <Link href="/" className="text-zinc-400 hover:text-white text-sm">
              {t.referral.backToDashboard}
            </Link>
            <LanguageSwitcher />
          </div>
          <h1 className="text-3xl font-bold text-white">{t.referral.title}</h1>
          <p className="text-zinc-400 mt-1">
            {t.referral.subtitle}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Referral Link Card */}
        <div className="bg-gradient-to-br from-teal-900/30 to-teal-800/10 border border-teal-500/30 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">{t.referral.yourLink}</h2>

          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={data.referralLink}
              readOnly
              className="flex-1 bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white font-mono text-sm"
            />
            <button
              onClick={() => copyToClipboard(data.referralLink)}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              }`}
            >
              {copied ? t.referral.copied : t.referral.copy}
            </button>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-400">{t.referral.yourCode}</span>
            <span className="bg-zinc-800 px-3 py-1 rounded-lg font-mono text-teal-400 font-bold">
              {data.referralCode}
            </span>
            <button
              onClick={() => copyToClipboard(data.referralCode)}
              className="text-zinc-400 hover:text-white"
            >
              {t.referral.copyCode}
            </button>
          </div>
        </div>

        {/* Two-Sided Benefits */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-500/30 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">💰</span>
              <h3 className="font-bold text-white">{t.referral.youGet}</h3>
            </div>
            <p className="text-sm text-zinc-400">
              {t.referral.youGetDesc}
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-500/30 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🎁</span>
              <h3 className="font-bold text-white">{t.referral.theyGet}</h3>
            </div>
            <p className="text-sm text-zinc-400">
              {t.referral.theyGetDesc}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface border border-zinc-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-white">{data.stats.totalReferrals}</div>
            <div className="text-sm text-zinc-400">{t.referral.stats.totalReferrals}</div>
          </div>
          <div className="bg-surface border border-zinc-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-teal-400">{data.stats.qualifiedReferrals}</div>
            <div className="text-sm text-zinc-400">{t.referral.stats.qualified}</div>
          </div>
          <div className="bg-surface border border-zinc-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-green-400">{formatCurrency(data.stats.totalEarned)}</div>
            <div className="text-sm text-zinc-400">{t.referral.stats.totalEarned}</div>
          </div>
          <div className="bg-surface border border-zinc-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-yellow-400">{formatCurrency(data.stats.pendingRewards)}</div>
            <div className="text-sm text-zinc-400">{t.referral.stats.pendingRewards}</div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-surface border border-zinc-800 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">{t.referral.howItWorks}</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-teal-400">1</span>
              </div>
              <h3 className="font-semibold text-white mb-1">{t.referral.steps.step1Title}</h3>
              <p className="text-sm text-zinc-400">
                {t.referral.steps.step1Desc}
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-teal-400">2</span>
              </div>
              <h3 className="font-semibold text-white mb-1">{t.referral.steps.step2Title}</h3>
              <p className="text-sm text-zinc-400">
                {t.referral.steps.step2Desc}
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-purple-400">3</span>
              </div>
              <h3 className="font-semibold text-white mb-1">{t.referral.steps.step3Title}</h3>
              <p className="text-sm text-zinc-400">
                {t.referral.steps.step3Desc}
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-green-400">4</span>
              </div>
              <h3 className="font-semibold text-white mb-1">{t.referral.steps.step4Title}</h3>
              <p className="text-sm text-zinc-400">
                {t.referral.steps.step4Desc}
              </p>
            </div>
          </div>
        </div>

        {/* Referrals List */}
        <div className="bg-surface border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">{t.referral.yourReferrals}</h2>

          {data.referrals.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">👥</div>
              <p className="text-zinc-400">{t.referral.noReferrals}</p>
              <p className="text-sm text-zinc-500 mt-1">
                {t.referral.noReferralsDesc}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{referral.referred.avatar}</span>
                    <div>
                      <div className="font-medium text-white">
                        {referral.referred.username}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {t.referral.joined} {new Date(referral.referred.joinedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      referral.status === 'qualified' || referral.status === 'paid'
                        ? 'text-green-400'
                        : 'text-yellow-400'
                    }`}>
                      {referral.status === 'pending' && t.referral.pending}
                      {referral.status === 'qualified' && `+${formatCurrency(referral.rewardAmount)}`}
                      {referral.status === 'paid' && `+${formatCurrency(referral.rewardAmount)} (${t.referral.paid})`}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {referral.status === 'pending'
                        ? t.referral.waitingForPurchase
                        : referral.qualifiedAt && `${t.referral.qualifiedOn} ${new Date(referral.qualifiedAt).toLocaleDateString()}`
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Share Buttons */}
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <a
            href={`https://twitter.com/intent/tweet?text=Join%20me%20on%20Zalogche%20and%20take%20on%20sports%20betting%20challenges!%20${encodeURIComponent(data.referralLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white rounded-lg font-medium transition-colors"
          >
            {t.referral.shareOn.twitter}
          </a>
          <a
            href={`https://wa.me/?text=Join%20me%20on%20Zalogche%20and%20take%20on%20sports%20betting%20challenges!%20${encodeURIComponent(data.referralLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg font-medium transition-colors"
          >
            {t.referral.shareOn.whatsapp}
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(data.referralLink)}&text=Join%20me%20on%20Zalogche!`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg font-medium transition-colors"
          >
            {t.referral.shareOn.telegram}
          </a>
        </div>
      </div>
    </div>
  );
}
