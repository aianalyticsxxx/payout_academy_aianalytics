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

const AVATAR_OPTIONS = [
  '🎲', '🎯', '🏀', '🏈', '⚽', '🏒', '⚾', '🎾', '🥊', '💰',
  '🔥', '⚡', '🌟', '👑', '🦁', '🐺', '🦅', '🐉', '💎', '🏆',
];

const TIER_INFO: Record<string, { color: string; icon: string; bg: string; next: string | null; requirement: string }> = {
  Bronze: { color: 'text-orange-400', icon: '🥉', bg: 'from-orange-900/30 to-orange-800/20', next: 'Silver', requirement: '20+ bets, 52%+ win rate' },
  Silver: { color: 'text-zinc-300', icon: '🥈', bg: 'from-zinc-700/30 to-zinc-600/20', next: 'Gold', requirement: '50+ bets, 55%+ win rate' },
  Gold: { color: 'text-yellow-400', icon: '🥇', bg: 'from-yellow-900/30 to-yellow-800/20', next: 'Platinum', requirement: '100+ bets, 57%+ win rate' },
  Platinum: { color: 'text-cyan-400', icon: '💠', bg: 'from-cyan-900/30 to-cyan-800/20', next: 'Diamond', requirement: '200+ bets, 60%+ win rate' },
  Diamond: { color: 'text-purple-400', icon: '💎', bg: 'from-purple-900/30 to-purple-800/20', next: null, requirement: 'Maximum tier achieved!' },
};

const CHALLENGE_TIERS: Record<number, { label: string; color: string }> = {
  1000: { label: '$1K', color: 'text-zinc-400' },
  5000: { label: '$5K', color: 'text-green-400' },
  10000: { label: '$10K', color: 'text-blue-400' },
  25000: { label: '$25K', color: 'text-purple-400' },
  50000: { label: '$50K', color: 'text-orange-400' },
  100000: { label: '$100K', color: 'text-yellow-400' },
};

interface ProfileData {
  user: {
    id: string;
    email: string;
    username: string | null;
    avatar: string;
    tier: string;
    role?: string;
    createdAt: string;
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
  const [avatar, setAvatar] = useState('🎲');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'account' | 'bets' | 'challenges' | 'achievements' | 'settings'>('overview');

  // Settings state
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    betResults: true,
    challengeUpdates: true,
    promotions: false,
  });
  const [displaySettings, setDisplaySettings] = useState({
    showEmail: false,
    showStats: true,
    showOnLeaderboard: true,
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
      setAvatar((session.user as any)?.avatar || '🎲');
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
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (username.length > 20) {
      setError('Username must be 20 characters or less');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, avatar }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      await update({ username, avatar });
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

  const tier = (session.user as any)?.tier || 'Bronze';
  const tierInfo = TIER_INFO[tier] || TIER_INFO.Bronze;
  const stats = profileData?.stats;
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
        {/* Profile Header Card */}
        <div className={`bg-gradient-to-r ${tierInfo.bg} border border-teal-700/30 rounded-2xl p-6`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-6xl">{avatar}</div>
              <div>
                <div className="text-2xl font-bold">{username || 'Set Username'}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className={tierInfo.color}>
                    {tierInfo.icon} {tier}
                  </span>
                  {profileData?.rank && (
                    <span className="text-zinc-400 text-sm">
                      Rank #{profileData.rank} of {profileData.totalRankedUsers}
                    </span>
                  )}
                </div>
                <div className="text-sm text-zinc-500 mt-1">{session.user?.email}</div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-teal-400">{stats?.totalBets || 0}</div>
                <div className="text-xs text-zinc-500">Bets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{stats?.winRate?.toFixed(1) || 0}%</div>
                <div className="text-xs text-zinc-500">Win Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">
                  🔥 {stats?.bestStreak || 0}
                </div>
                <div className="text-xs text-zinc-500">Best Streak</div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'account', label: 'Account', icon: '👤' },
            { id: 'bets', label: 'Bets', icon: '🎯' },
            { id: 'challenges', label: 'Challenges', icon: '🏆' },
            { id: 'achievements', label: 'Achievements', icon: '⭐' },
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

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Edit Profile */}
            <div className="bg-surface border border-zinc-800/50 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-300 mb-3">Choose Avatar</label>
                <div className="grid grid-cols-10 gap-2">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      className={`text-2xl p-2 rounded-lg transition-all ${
                        avatar === emoji
                          ? 'bg-teal-600 ring-2 ring-teal-400 scale-110'
                          : 'bg-zinc-800 hover:bg-zinc-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-300 mb-2">Username</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  maxLength={20}
                />
                <p className="text-xs text-zinc-500 mt-1">{username.length}/20 characters (min 3)</p>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3 mb-4">
                  <p className="text-green-400 text-sm">{success}</p>
                </div>
              )}

              <Button onClick={handleSave} disabled={loading} className="w-full">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

            {/* Performance Stats */}
            <div className="bg-surface border border-zinc-800/50 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Performance Stats</h2>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-800/50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-green-400">{stats?.wins || 0}</div>
                    <div className="text-xs text-zinc-500">Wins</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-red-400">{stats?.losses || 0}</div>
                    <div className="text-xs text-zinc-500">Losses</div>
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Current Streak</span>
                    <span className={`font-bold ${(stats?.currentStreak || 0) > 0 ? 'text-green-400' : (stats?.currentStreak || 0) < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                      {(stats?.currentStreak || 0) > 0 ? '🔥' : (stats?.currentStreak || 0) < 0 ? '❄️' : ''} {stats?.currentStreak || 0}
                    </span>
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Total Staked</span>
                    <span className="font-bold text-zinc-300">${stats?.totalStaked?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Current Streak</span>
                    <span className={`font-bold ${(stats?.currentStreak || 0) > 0 ? 'text-green-400' : (stats?.currentStreak || 0) < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                      {(stats?.currentStreak || 0) > 0 ? `🔥 ${stats?.currentStreak}W` : (stats?.currentStreak || 0) < 0 ? `❄️ ${Math.abs(stats?.currentStreak || 0)}L` : '-'}
                    </span>
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Best Streak</span>
                    <span className="font-bold text-yellow-400">{stats?.bestStreak || 0}W</span>
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Parlays</span>
                    <span className="font-bold text-zinc-300">
                      {profileData?.parlayStats?.wins || 0}W / {profileData?.parlayStats?.total || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Account Information */}
            <div className="bg-surface border border-zinc-800/50 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Account Information</h2>

              <div className="space-y-4">
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">User ID</div>
                  <div className="font-mono text-sm text-zinc-300 break-all">{user?.id}</div>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">Email Address</div>
                  <div className="text-zinc-300">{user?.email}</div>
                  <div className="text-xs text-green-400 mt-1">✓ Verified</div>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">Username</div>
                  <div className="text-zinc-300">{user?.username || 'Not set'}</div>
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

                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">Account Type</div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300">
                      {user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? 'Administrator' : 'Standard User'}
                    </span>
                    {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                      <span className="px-2 py-0.5 bg-teal-600/30 text-teal-400 text-xs rounded-full">Admin</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tier Progress */}
            <div className="bg-surface border border-zinc-800/50 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Tier Progress</h2>

              {/* Current Tier */}
              <div className={`bg-gradient-to-r ${tierInfo.bg} border border-zinc-700/50 rounded-xl p-4 mb-4`}>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{tierInfo.icon}</span>
                  <div>
                    <div className={`text-xl font-bold ${tierInfo.color}`}>{tier} Tier</div>
                    <div className="text-sm text-zinc-400">Current Level</div>
                  </div>
                </div>
              </div>

              {/* Tier Ladder */}
              <div className="space-y-2 mb-4">
                {Object.entries(TIER_INFO).map(([tierName, info], index) => {
                  const isCurrentTier = tierName === tier;
                  const tierOrder = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
                  const currentIndex = tierOrder.indexOf(tier);
                  const thisTierIndex = tierOrder.indexOf(tierName);
                  const isAchieved = thisTierIndex <= currentIndex;

                  return (
                    <div
                      key={tierName}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        isCurrentTier ? 'bg-teal-900/30 border border-teal-700/50' :
                        isAchieved ? 'bg-zinc-800/30' : 'bg-zinc-900/30 opacity-50'
                      }`}
                    >
                      <span className="text-2xl">{info.icon}</span>
                      <div className="flex-1">
                        <div className={`font-medium ${isAchieved ? info.color : 'text-zinc-500'}`}>{tierName}</div>
                      </div>
                      {isAchieved && <span className="text-green-400">✓</span>}
                    </div>
                  );
                })}
              </div>

              {/* Next Tier Requirement */}
              {tierInfo.next && (
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-sm text-zinc-400 mb-1">Next Tier: {tierInfo.next}</div>
                  <div className="text-xs text-zinc-500">Requirement: {TIER_INFO[tierInfo.next]?.requirement || tierInfo.requirement}</div>
                </div>
              )}
              {!tierInfo.next && (
                <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-700/50 rounded-xl p-4">
                  <div className="text-sm text-purple-300">🎉 Maximum tier achieved!</div>
                  <div className="text-xs text-zinc-500">You've reached the highest tier.</div>
                </div>
              )}
            </div>

            {/* Activity Summary */}
            <div className="bg-surface border border-zinc-800/50 rounded-2xl p-6 md:col-span-2">
              <h2 className="text-lg font-semibold mb-4">Activity Summary</h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-teal-400">{stats?.totalBets || 0}</div>
                  <div className="text-sm text-zinc-500">Total Bets</div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-purple-400">{profileData?.parlayStats?.total || 0}</div>
                  <div className="text-sm text-zinc-500">Total Parlays</div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-400">
                    {(profileData?.activeChallenges?.length || 0) + (profileData?.completedChallenges || 0)}
                  </div>
                  <div className="text-sm text-zinc-500">Total Challenges</div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-emerald-400">{profileData?.achievements?.length || 0}</div>
                  <div className="text-sm text-zinc-500">Achievements</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bets Tab */}
        {activeTab === 'bets' && (
          <div className="bg-surface border border-zinc-800/50 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800/50">
              <h2 className="text-lg font-semibold">Recent Bets</h2>
            </div>

            {profileData?.recentBets && profileData.recentBets.length > 0 ? (
              <div className="divide-y divide-zinc-800/50">
                {profileData.recentBets.map((bet: any) => (
                  <div key={bet.id} className="p-4 hover:bg-zinc-800/30 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{bet.matchup}</div>
                        <div className="text-sm text-zinc-400">{bet.sport} - {bet.league}</div>
                        <div className="text-sm text-teal-400 mt-1">
                          {bet.betType}: {bet.selection} @ {bet.odds}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-lg font-bold uppercase text-sm inline-block ${
                          bet.result === 'won' ? 'bg-green-900/30 text-green-400' :
                          bet.result === 'lost' ? 'bg-red-900/30 text-red-400' :
                          bet.result === 'push' ? 'bg-yellow-900/30 text-yellow-400' :
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {bet.result === 'won' ? 'Won' :
                           bet.result === 'lost' ? 'Lost' :
                           bet.result === 'push' ? 'Push' : 'Pending'}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {new Date(bet.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-500">
                No bets yet. Start betting to see your history!
              </div>
            )}
          </div>
        )}

        {/* Challenges Tab */}
        {activeTab === 'challenges' && (
          <div className="space-y-6">
            {/* Challenge Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-surface border border-zinc-800/50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-teal-400">{profileData?.activeChallenges?.length || 0}</div>
                <div className="text-xs text-zinc-500">Active</div>
              </div>
              <div className="bg-surface border border-zinc-800/50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">{profileData?.completedChallenges || 0}</div>
                <div className="text-xs text-zinc-500">Completed</div>
              </div>
              <div className="bg-surface border border-zinc-800/50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">{profileData?.rewardsCount || 0}</div>
                <div className="text-xs text-zinc-500">Rewards Earned</div>
              </div>
              <div className="bg-surface border border-zinc-800/50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-400">${profileData?.totalRewardsEarned?.toFixed(0) || 0}</div>
                <div className="text-xs text-zinc-500">Total Earned</div>
              </div>
            </div>

            {/* Active Challenges */}
            <div className="bg-surface border border-zinc-800/50 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800/50">
                <h2 className="text-lg font-semibold">Active Challenges</h2>
              </div>

              {profileData?.activeChallenges && profileData.activeChallenges.length > 0 ? (
                <div className="divide-y divide-zinc-800/50">
                  {profileData.activeChallenges.map((challenge: any) => {
                    const tierConfig = CHALLENGE_TIERS[challenge.tier] || { label: `$${challenge.tier}`, color: 'text-zinc-400' };
                    const daysLeft = challenge.expiresAt ? Math.ceil((new Date(challenge.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

                    return (
                      <div key={challenge.id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className={`text-lg font-bold ${tierConfig.color}`}>{tierConfig.label}</span>
                            <span className="text-zinc-500 ml-2">Challenge</span>
                          </div>
                          <div className={`text-sm ${daysLeft <= 3 ? 'text-red-400' : 'text-zinc-400'}`}>
                            {daysLeft} days left
                          </div>
                        </div>

                        <div className="flex gap-2 mb-2">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`flex-1 h-2 rounded-full ${
                                challenge[`level${level}Completed`]
                                  ? 'bg-teal-500'
                                  : challenge.currentLevel === level
                                  ? 'bg-teal-900'
                                  : 'bg-zinc-800'
                              }`}
                            />
                          ))}
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Level {challenge.currentLevel}/4</span>
                          <span className="text-zinc-400">Streak: {challenge.currentStreak}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500">
                  No active challenges. Purchase a challenge to get started!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="bg-surface border border-zinc-800/50 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">
              Achievements ({profileData?.achievements?.length || 0})
            </h2>

            {profileData?.achievements && profileData.achievements.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {profileData.achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="bg-gradient-to-br from-teal-900/30 to-teal-800/20 border border-teal-700/30 rounded-xl p-4 text-center hover:scale-105 transition-transform"
                  >
                    <div className="text-4xl mb-2">{achievement.icon}</div>
                    <div className="font-medium text-white">{achievement.name}</div>
                    <div className="text-xs text-zinc-400 mt-1">{achievement.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎯</div>
                <div className="text-zinc-400 mb-2">No achievements yet</div>
                <div className="text-sm text-zinc-500">
                  Start betting and completing challenges to earn achievements!
                </div>
              </div>
            )}

            {/* Locked Achievements */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-zinc-500 mb-4">Locked Achievements</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: '💯', name: 'Century Club', description: '100 bets placed' },
                  { icon: '🎰', name: 'High Roller', description: '500 bets placed' },
                  { icon: '💥', name: 'On Fire', description: '10 win streak' },
                  { icon: '💰', name: 'Money Maker', description: '15 win streak' },
                  { icon: '👑', name: 'Champion', description: 'Complete 5 challenges' },
                  { icon: '🃏', name: 'Parlay Master', description: 'Win 5 parlays' },
                  { icon: '💎', name: 'Diamond Tier', description: 'Reach Diamond tier' },
                  { icon: '⭐', name: 'Elite Bettor', description: '60%+ win rate' },
                ]
                  .filter((a) => !profileData?.achievements?.find((ua) => ua.name === a.name))
                  .slice(0, 4)
                  .map((achievement, i) => (
                    <div
                      key={i}
                      className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-4 text-center opacity-50"
                    >
                      <div className="text-3xl mb-2 grayscale">{achievement.icon}</div>
                      <div className="font-medium text-zinc-500">{achievement.name}</div>
                      <div className="text-xs text-zinc-600 mt-1">{achievement.description}</div>
                    </div>
                  ))}
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

            {/* Privacy Settings */}
            <div className="bg-surface border border-zinc-800/50 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Privacy Settings</h2>

              <div className="space-y-4">
                {[
                  { key: 'showEmail', label: 'Show Email', description: 'Display email on public profile' },
                  { key: 'showStats', label: 'Show Stats', description: 'Make your stats visible to others' },
                  { key: 'showOnLeaderboard', label: 'Appear on Leaderboard', description: 'Show your rank publicly' },
                ].map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl">
                    <div>
                      <div className="font-medium text-zinc-300">{setting.label}</div>
                      <div className="text-xs text-zinc-500">{setting.description}</div>
                    </div>
                    <button
                      onClick={() => setDisplaySettings(prev => ({ ...prev, [setting.key]: !prev[setting.key as keyof typeof prev] }))}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        displaySettings[setting.key as keyof typeof displaySettings] ? 'bg-teal-600' : 'bg-zinc-700'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        displaySettings[setting.key as keyof typeof displaySettings] ? 'translate-x-6' : 'translate-x-0.5'
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
