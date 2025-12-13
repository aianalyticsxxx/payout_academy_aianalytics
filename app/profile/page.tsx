// ==========================================
// USER PROFILE PAGE - FULL FEATURED
// ==========================================

'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import { TwoFactorModal } from '@/components/TwoFactorModal';
import { ActiveSessionsModal } from '@/components/ActiveSessionsModal';
import { useLanguage, LanguageSwitcher } from '@/lib/i18n';

interface ProfileData {
  user: {
    id: string;
    email: string;
    username: string | null;
    avatar: string;
    tier: string;
    role?: string;
    createdAt: string;
    phoneNumber: string | null;
    dateOfBirth: string | null;
    country: string | null;
    timezone: string | null;
    kycStatus: string;
    kycSubmittedAt: string | null;
    kycVerifiedAt: string | null;
    lastLoginAt: string | null;
    lastLoginIp: string | null;
    lastLoginLocation: string | null;
  };
  stats: {
    wins: number;
    losses: number;
    pushes: number;
    totalBets: number;
    totalStaked: number;
    totalProfit: number;
    roi: number;
    winRate: number;
    currentStreak: number;
    bestStreak: number;
  };
  rank: number | null;
  totalRankedUsers: number;
  recentBets: any[];
  activeChallenges: any[];
  completedChallenges: number;
  totalRewardsEarned: number;
  rewardsCount: number;
  recentParlays: any[];
  parlayStats: {
    total: number;
    wins: number;
  };
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
  }>;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { t } = useLanguage();

  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeTab, setActiveTab] = useState<'account' | 'settings'>('account');

  // Settings state
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    betResults: true,
    challengeUpdates: true,
    promotions: false,
  });

  // Security modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Initialize form with current values
  useEffect(() => {
    if (session?.user) {
      setUsername((session.user as any)?.username || '');
    }
  }, [session]);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          setProfileData(data);
          // Initialize editable fields from fetched data
          if (data.user) {
            setPhoneNumber(data.user.phoneNumber || '');
            setDateOfBirth(data.user.dateOfBirth ? data.user.dateOfBirth.split('T')[0] : '');
            setCountry(data.user.country || '');
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    };

    if (session) {
      fetchProfile();
    }
  }, [session]);

  // Fetch 2FA status
  useEffect(() => {
    const fetch2FAStatus = async () => {
      try {
        const res = await fetch('/api/user/2fa/setup');
        if (res.ok) {
          const data = await res.json();
          setTwoFactorEnabled(data.enabled);
        }
      } catch (err) {
        console.error('Failed to fetch 2FA status:', err);
      }
    };

    if (session) {
      fetch2FAStatus();
    }
  }, [session]);

  const handleSave = async () => {
    if (username.length < 2) {
      setError('Full name must be at least 2 characters');
      return;
    }
    if (username.length > 50) {
      setError('Full name must be 50 characters or less');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          phoneNumber: phoneNumber || undefined,
          dateOfBirth: dateOfBirth || undefined,
          country: country || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      await update({ username });
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading' || loadingProfile) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  if (!session) return null;

  const user = profileData?.user;

  // Calculate account age
  const accountAge = user?.createdAt ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="min-h-screen bg-dark text-white">
      {/* Header */}
      <header className="p-4 md:p-6 bg-surface border-b border-zinc-800/50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <Link href="/" className="text-2xl md:text-3xl font-bold text-teal-400 tracking-tight hover:text-teal-300 transition-colors">
              ZALOGCHE
            </Link>
            <p className="text-zinc-500 text-sm tracking-widest">{t.profile.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/dashboard"
              className="bg-surface-light hover:bg-zinc-800 text-teal-400 px-4 py-2 rounded-xl text-sm font-medium border border-zinc-700 transition-all"
            >
              {t.profile.backToDashboard}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: 'account', label: t.profile.tabs.account, icon: '👤' },
            { id: 'settings', label: t.profile.tabs.settings, icon: '⚙️' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white'
                  : 'bg-surface border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Account Information */}
            <div className="bg-surface border border-zinc-800/50 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">{t.profile.accountInfo.title}</h2>

              <div className="space-y-4">
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">{t.profile.accountInfo.emailAddress}</div>
                  <div className="text-zinc-300">{user?.email}</div>
                  <div className="text-xs text-green-400 mt-1">✓ {t.profile.accountInfo.verified}</div>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-2">{t.profile.accountInfo.fullName}</div>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t.profile.accountInfo.enterFullName}
                    maxLength={50}
                  />
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-2">{t.profile.accountInfo.phoneNumber}</div>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    type="tel"
                  />
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-2">{t.profile.accountInfo.dateOfBirth}</div>
                  <Input
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    type="date"
                    className="[color-scheme:dark]"
                  />
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-2">{t.profile.accountInfo.country}</div>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">{t.profile.accountInfo.selectCountry}</option>
                    <option value="US">{t.profile.countries.US}</option>
                    <option value="GB">{t.profile.countries.GB}</option>
                    <option value="CA">{t.profile.countries.CA}</option>
                    <option value="AU">{t.profile.countries.AU}</option>
                    <option value="DE">{t.profile.countries.DE}</option>
                    <option value="FR">{t.profile.countries.FR}</option>
                    <option value="ES">{t.profile.countries.ES}</option>
                    <option value="IT">{t.profile.countries.IT}</option>
                    <option value="NL">{t.profile.countries.NL}</option>
                    <option value="BE">{t.profile.countries.BE}</option>
                    <option value="AT">{t.profile.countries.AT}</option>
                    <option value="CH">{t.profile.countries.CH}</option>
                    <option value="SE">{t.profile.countries.SE}</option>
                    <option value="NO">{t.profile.countries.NO}</option>
                    <option value="DK">{t.profile.countries.DK}</option>
                    <option value="FI">{t.profile.countries.FI}</option>
                    <option value="IE">{t.profile.countries.IE}</option>
                    <option value="PT">{t.profile.countries.PT}</option>
                    <option value="PL">{t.profile.countries.PL}</option>
                    <option value="BG">{t.profile.countries.BG}</option>
                    <option value="OTHER">{t.profile.countries.OTHER}</option>
                  </select>
                </div>

                {error && (
                  <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3">
                    <p className="text-green-400 text-sm">{success}</p>
                  </div>
                )}

                <Button onClick={handleSave} disabled={loading} className="w-full">
                  {loading ? t.profile.accountInfo.saving : t.profile.accountInfo.saveChanges}
                </Button>

              </div>
            </div>

            {/* Verification & Security */}
            <div className="bg-surface border border-zinc-800/50 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">{t.profile.verification.title}</h2>

              <div className="space-y-4">
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">{t.profile.verification.kycStatus}</div>
                  <div className="flex items-center gap-2">
                    {user?.kycStatus === 'verified' ? (
                      <>
                        <span className="text-green-400">{t.profile.verification.verified}</span>
                        <span className="px-2 py-0.5 bg-green-600/30 text-green-400 text-xs rounded-full">✓ {t.profile.verification.complete}</span>
                      </>
                    ) : user?.kycStatus === 'pending' ? (
                      <>
                        <span className="text-yellow-400">{t.profile.verification.pendingReview}</span>
                        <span className="px-2 py-0.5 bg-yellow-600/30 text-yellow-400 text-xs rounded-full">{t.profile.verification.inProgress}</span>
                      </>
                    ) : user?.kycStatus === 'rejected' ? (
                      <>
                        <span className="text-red-400">{t.profile.verification.rejected}</span>
                        <span className="px-2 py-0.5 bg-red-600/30 text-red-400 text-xs rounded-full">{t.profile.verification.resubmitRequired}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-zinc-400">{t.profile.verification.notVerified}</span>
                        <span className="px-2 py-0.5 bg-zinc-600/30 text-zinc-400 text-xs rounded-full">{t.profile.verification.optional}</span>
                      </>
                    )}
                  </div>
                  {user?.kycVerifiedAt && (
                    <div className="text-xs text-zinc-500 mt-1">
                      {t.profile.verification.verifiedOn} {new Date(user.kycVerifiedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">{t.profile.verification.lastLogin}</div>
                  <div className="text-zinc-300">
                    {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }) : t.profile.verification.na}
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">{t.profile.verification.lastLoginIp}</div>
                  <div className="font-mono text-sm text-zinc-300">
                    {user?.lastLoginIp || t.profile.verification.na}
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">{t.profile.verification.lastLoginLocation}</div>
                  <div className="text-zinc-300">
                    {user?.lastLoginLocation || t.profile.verification.na}
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">{t.profile.verification.accountCreated}</div>
                  <div className="text-zinc-300">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }) : t.profile.verification.na}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">{accountAge} {t.profile.verification.daysAgo}</div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Notification Settings */}
            <div className="bg-surface border border-zinc-800/50 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">{t.profile.notifications.title}</h2>

              <div className="space-y-4">
                {[
                  { key: 'email', label: t.profile.notifications.email, description: t.profile.notifications.emailDesc },
                  { key: 'push', label: t.profile.notifications.push, description: t.profile.notifications.pushDesc },
                  { key: 'betResults', label: t.profile.notifications.betResults, description: t.profile.notifications.betResultsDesc },
                  { key: 'challengeUpdates', label: t.profile.notifications.challengeUpdates, description: t.profile.notifications.challengeUpdatesDesc },
                  { key: 'promotions', label: t.profile.notifications.promotions, description: t.profile.notifications.promotionsDesc },
                ].map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl">
                    <div>
                      <div className="font-medium text-zinc-300">{setting.label}</div>
                      <div className="text-xs text-zinc-500">{setting.description}</div>
                    </div>
                    <button
                      onClick={() => setNotifications(prev => ({ ...prev, [setting.key]: !prev[setting.key as keyof typeof prev] }))}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        notifications[setting.key as keyof typeof notifications] ? 'bg-teal-600' : 'bg-zinc-700'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        notifications[setting.key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Security */}
            <div className="bg-surface border border-zinc-800/50 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">{t.profile.security.title}</h2>

              <div className="space-y-4">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full p-4 bg-zinc-800/50 rounded-xl text-left hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-zinc-300">{t.profile.security.changePassword}</div>
                      <div className="text-xs text-zinc-500">{t.profile.security.changePasswordDesc}</div>
                    </div>
                    <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => setShow2FAModal(true)}
                  className="w-full p-4 bg-zinc-800/50 rounded-xl text-left hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-zinc-300">{t.profile.security.twoFactor}</div>
                      <div className="text-xs text-zinc-500">
                        {twoFactorEnabled ? t.profile.security.twoFactorDescEnabled : t.profile.security.twoFactorDescDisabled}
                      </div>
                    </div>
                    {twoFactorEnabled ? (
                      <span className="px-2 py-0.5 bg-green-600/30 text-green-400 text-xs rounded-full">{t.profile.security.enabled}</span>
                    ) : (
                      <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setShowSessionsModal(true)}
                  className="w-full p-4 bg-zinc-800/50 rounded-xl text-left hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-zinc-300">{t.profile.security.activeSessions}</div>
                      <div className="text-xs text-zinc-500">{t.profile.security.activeSessionsDesc}</div>
                    </div>
                    <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-surface border border-red-900/50 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 text-red-400">{t.profile.dangerZone.title}</h2>

              <div className="space-y-4">
                <button
                  onClick={handleSignOut}
                  className="w-full p-4 bg-zinc-800/50 rounded-xl text-left hover:bg-zinc-800 transition-colors border border-zinc-700"
                >
                  <div className="font-medium text-orange-400">{t.profile.dangerZone.signOut}</div>
                  <div className="text-xs text-zinc-500">{t.profile.dangerZone.signOutDesc}</div>
                </button>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full p-4 bg-red-900/20 rounded-xl text-left hover:bg-red-900/30 transition-colors border border-red-900/50"
                >
                  <div className="font-medium text-red-400">{t.profile.dangerZone.deleteAccount}</div>
                  <div className="text-xs text-zinc-500">{t.profile.dangerZone.deleteAccountDesc}</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />

      {/* Two-Factor Authentication Modal */}
      <TwoFactorModal
        isOpen={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        isEnabled={twoFactorEnabled}
        onSuccess={() => setTwoFactorEnabled(!twoFactorEnabled)}
      />

      {/* Active Sessions Modal */}
      <ActiveSessionsModal
        isOpen={showSessionsModal}
        onClose={() => setShowSessionsModal(false)}
      />
    </div>
  );
}
