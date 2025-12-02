'use client';

// ==========================================
// LOGIN PAGE
// ==========================================

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(error || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setErrorMessage('Invalid email or password');
      } else if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (error) {
      setErrorMessage('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl });
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-yellow-400">🎓</h1>
        <h2 className="text-2xl font-bold mt-2">Payout Academy</h2>
        <p className="text-zinc-400 mt-1">Sign in to your account</p>
      </div>

      {/* Login Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        {errorMessage && (
          <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-zinc-900 text-zinc-400">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-yellow-400 hover:text-yellow-300 font-medium">
            Sign up
          </Link>
        </p>
      </div>

      {/* Disclaimer */}
      <p className="mt-6 text-center text-xs text-zinc-500">
        By signing in, you agree that this platform is for entertainment purposes only.
      </p>
    </div>
  );
}

function LoginFormFallback() {
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-yellow-400">🎓</h1>
        <h2 className="text-2xl font-bold mt-2">Payout Academy</h2>
        <p className="text-zinc-400 mt-1">Loading...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
