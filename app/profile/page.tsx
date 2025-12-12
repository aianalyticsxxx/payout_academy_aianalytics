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
            <p className="text-zinc-500 text-sm tracking-widest">Profile</p>
          </div>
          <Link
            href="/"
            className="bg-surface-light hover:bg-zinc-800 text-teal-400 px-4 py-2 rounded-xl text-sm font-medium border border-zinc-700 transition-all"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: 'account', label: 'Account', icon: '👤' },
            { id: 'settings', label: 'Settings', icon: '⚙️' },
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
              <h2 className="text-lg font-semibold mb-4">Account Information</h2>

              <div className="space-y-4">
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">Email Address</div>
                  <div className="text-zinc-300">{user?.email}</div>
                  <div className="text-xs text-green-400 mt-1">✓ Verified</div>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-2">Full Name</div>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your full name"
                    maxLength={50}
                  />
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-2">Phone Number</div>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    type="tel"
                  />
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-2">Date of Birth</div>
                  <Input
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    type="date"
                    className="[color-scheme:dark]"
                  />
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-2">Country</div>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">Select country</option>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="ES">Spain</option>
                    <option value="IT">Italy</option>
                    <option value="NL">Netherlands</option>
                    <option value="BE">Belgium</option>
                    <option value="AT">Austria</option>
                    <option value="CH">Switzerland</option>
                    <option value="SE">Sweden</option>
                    <option value="NO">Norway</option>
                    <option value="DK">Denmark</option>
                    <option value="FI">Finland</option>
                    <option value="IE">Ireland</option>
                    <option value="PT">Portugal</option>
                    <option value="PL">Poland</option>
                    <option value="BG">Bulgaria</option>
                    <option value="OTHER">Other</option>
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
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>

              </div>
            </div>

            {/* Verification & Security */}
            <div className="bg-surface border border-zinc-800/50 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Verification & Security</h2>

              <div className="space-y-4">
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">KYC Verification Status</div>
                  <div className="flex items-center gap-2">
                    {user?.kycStatus === 'verified' ? (
                      <>
                        <span className="text-green-400">Verified</span>
                        <span className="px-2 py-0.5 bg-green-600/30 text-green-400 text-xs rounded-full">✓ Complete</span>
                      </>
                    ) : user?.kycStatus === 'pending' ? (
                      <>
                        <span className="text-yellow-400">Pending Review</span>
                        <span className="px-2 py-0.5 bg-yellow-600/30 text-yellow-400 text-xs rounded-full">In Progress</span>
                      </>
                    ) : user?.kycStatus === 'rejected' ? (
                      <>
                        <span className="text-red-400">Rejected</span>
                        <span className="px-2 py-0.5 bg-red-600/30 text-red-400 text-xs rounded-full">Resubmit Required</span>
                      </>
                    ) : (
                      <>
                        <span className="text-zinc-400">Not Verified</span>
                        <span className="px-2 py-0.5 bg-zinc-600/30 text-zinc-400 text-xs rounded-full">Optional</span>
                      </>
                    )}
                  </div>
                  {user?.kycVerifiedAt && (
                    <div className="text-xs text-zinc-500 mt-1">
                      Verified on {new Date(user.kycVerifiedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">Last Login</div>
                  <div className="text-zinc-300">
                    {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }) : 'N/A'}
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">Last Login IP</div>
                  <div className="font-mono text-sm text-zinc-300">
                    {user?.lastLoginIp || 'N/A'}
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">Last Login Location</div>
                  <div className="text-zinc-300">
                    {user?.lastLoginLocation || 'N/A'}
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">Account Created</div>
                  <div className="text-zinc-300">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }) : 'N/A'}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">{accountAge} days ago</div>
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
              <h2 className="text-lg font-semibold mb-4">Notification Settings</h2>

              <div className="space-y-4">
                {[
                  { key: 'email', label: 'Email Notifications', description: 'Receive important updates via email' },
                  { key: 'push', label: 'Push Notifications', description: 'Browser push notifications' },
                  { key: 'betResults', label: 'Bet Results', description: 'Get notified when bets are settled' },
                  { key: 'challengeUpdates', label: 'Challenge Updates', description: 'Progress and expiration alerts' },
                  { key: 'promotions', label: 'Promotions', description: 'Special offers and announcements' },
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
              <h2 className="text-lg font-semibold mb-4">Security</h2>

              <div className="space-y-4">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full p-4 bg-zinc-800/50 rounded-xl text-left hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-zinc-300">Change Password</div>
                      <div className="text-xs text-zinc-500">Update your account password</div>
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
                      <div className="font-medium text-zinc-300">Two-Factor Authentication</div>
                      <div className="text-xs text-zinc-500">
                        {twoFactorEnabled ? 'Enabled - Manage your 2FA settings' : 'Add an extra layer of security'}
                      </div>
                    </div>
                    {twoFactorEnabled ? (
                      <span className="px-2 py-0.5 bg-green-600/30 text-green-400 text-xs rounded-full">Enabled</span>
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
                      <div className="font-medium text-zinc-300">Active Sessions</div>
                      <div className="text-xs text-zinc-500">Manage your logged-in devices</div>
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
              <h2 className="text-lg font-semibold mb-4 text-red-400">Danger Zone</h2>

              <div className="space-y-4">
                <button
                  onClick={handleSignOut}
                  className="w-full p-4 bg-zinc-800/50 rounded-xl text-left hover:bg-zinc-800 transition-colors border border-zinc-700"
                >
                  <div className="font-medium text-orange-400">Sign Out</div>
                  <div className="text-xs text-zinc-500">Log out of your account</div>
                </button>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full p-4 bg-red-900/20 rounded-xl text-left hover:bg-red-900/30 transition-colors border border-red-900/50"
                >
                  <div className="font-medium text-red-400">Delete Account</div>
                  <div className="text-xs text-zinc-500">Permanently delete your account and all data</div>
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
