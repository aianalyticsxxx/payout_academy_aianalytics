'use client';

// ==========================================
// REGISTER PAGE
// ==========================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
      } else {
        router.push('/login?registered=true');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-yellow-400">🎓</h1>
          <h2 className="text-2xl font-bold mt-2">Join Payout Academy</h2>
          <p className="text-zinc-400 mt-1">Create your free account</p>
        </div>

        {/* Register Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="coolbettor123"
                minLength={3}
                maxLength={20}
                required
              />
              <p className="text-xs text-zinc-500 mt-1">3-20 characters, shown on leaderboard</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-400">
            Already have an account?{' '}
            <Link href="/login" className="text-yellow-400 hover:text-yellow-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center text-xs text-zinc-400">
          <div>
            <div className="text-2xl mb-1">🤖</div>
            <div>7 AI Analysts</div>
          </div>
          <div>
            <div className="text-2xl mb-1">📊</div>
            <div>Track Your Bets</div>
          </div>
          <div>
            <div className="text-2xl mb-1">🏆</div>
            <div>Compete Globally</div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-6 text-center text-xs text-zinc-500">
          By creating an account, you confirm you are 18+ and agree this is for entertainment only.
        </p>
      </div>
    </div>
  );
}
