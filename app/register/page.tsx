'use client';

// ==========================================
// REGISTER PAGE - PlayerProfit-inspired Teal Theme
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
    <div className="min-h-screen bg-dark flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo - Text Wordmark */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-teal-400 tracking-tight">ZALOGCHE</h1>
          <p className="text-zinc-400 mt-4">Create your free account</p>
        </div>

        {/* Register Card with gradient border */}
        <div className="relative p-[1px] rounded-2xl bg-gradient-to-b from-teal-500/50 to-teal-600/20">
          <div className="bg-surface rounded-2xl p-8">
            {error && (
              <div className="bg-red-900/30 border border-red-800/50 text-red-400 px-4 py-3 rounded-xl mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-dark border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full bg-dark border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  placeholder="your_username"
                  minLength={3}
                  maxLength={20}
                  required
                />
                <p className="text-xs text-zinc-600 mt-2">3-20 characters, shown on leaderboard</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-dark border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  minLength={8}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full bg-dark border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full font-semibold py-3 rounded-xl transition-all duration-300 disabled:opacity-50 text-dark"
                style={{ background: 'linear-gradient(180deg, #2DD4BF 0%, #14B8A6 100%)' }}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-zinc-500">
              Already have an account?{' '}
              <Link href="/login" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Benefits - Premium Style */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="bg-surface border border-zinc-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2 text-teal-400 font-bold">7</div>
            <div className="text-xs text-zinc-500">AI Analysts</div>
          </div>
          <div className="bg-surface border border-zinc-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2 text-teal-400 font-bold">Live</div>
            <div className="text-xs text-zinc-500">Tracking</div>
          </div>
          <div className="bg-surface border border-zinc-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2 text-gold font-bold">Pro</div>
            <div className="text-xs text-zinc-500">Analytics</div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-8 text-center text-xs text-zinc-600">
          By creating an account, you confirm you are 18+ and agree this is for entertainment only.
        </p>
      </div>
    </div>
  );
}
