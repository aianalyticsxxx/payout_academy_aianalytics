'use client';

// ==========================================
// LOGIN PAGE - Immersive 3D Floating Orbs Design
// ==========================================

import { useState, useEffect, Suspense, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/lib/i18n';
import { TurnstileWidget } from '@/components/security/TurnstileWidget';

// ==========================================
// ANIMATED ORB COMPONENT
// ==========================================
interface OrbProps {
  size: string;
  color: string;
  top: string;
  left: string;
  delay: number;
  duration: number;
  blur: number;
}

function Orb({ size, color, top, left, delay, duration, blur }: OrbProps) {
  return (
    <div
      className="absolute rounded-full pointer-events-none animate-float"
      style={{
        width: size,
        height: size,
        top,
        left,
        background: `radial-gradient(circle at 30% 30%, ${color}, ${color}88 40%, transparent 70%)`,
        filter: `blur(${blur}px)`,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        boxShadow: `0 0 80px 30px ${color}30, inset 0 0 40px ${color}20`,
      }}
    />
  );
}

// ==========================================
// ORB CONFIGURATIONS
// ==========================================
const orbs: OrbProps[] = [
  // Large teal orb - top left
  { size: '500px', color: '#14B8A6', top: '-5%', left: '-10%', delay: 0, duration: 25, blur: 80 },
  // Medium cyan orb - bottom right
  { size: '400px', color: '#06B6D4', top: '55%', left: '70%', delay: 5, duration: 30, blur: 70 },
  // Small violet accent - top right
  { size: '250px', color: '#8B5CF6', top: '5%', left: '75%', delay: 10, duration: 20, blur: 50 },
  // Large teal orb - bottom left
  { size: '450px', color: '#14B8A6', top: '60%', left: '-15%', delay: 3, duration: 35, blur: 75 },
  // Small cyan - center left
  { size: '200px', color: '#06B6D4', top: '30%', left: '5%', delay: 8, duration: 22, blur: 40 },
  // Medium teal - bottom center
  { size: '300px', color: '#14B8A6', top: '75%', left: '40%', delay: 12, duration: 28, blur: 60 },
  // Small violet accent - mid right
  { size: '180px', color: '#8B5CF6', top: '40%', left: '85%', delay: 6, duration: 32, blur: 45 },
  // Medium cyan - top center
  { size: '280px', color: '#06B6D4', top: '-10%', left: '35%', delay: 15, duration: 26, blur: 55 },
];

// ==========================================
// SPARKLE PARTICLE COMPONENT
// ==========================================
function Sparkle({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute w-1 h-1 bg-white rounded-full pointer-events-none animate-sparkle"
      style={style}
    />
  );
}

// ==========================================
// ANIMATED BACKGROUND COMPONENT
// ==========================================
function AnimatedBackground() {
  // Generate sparkle particles with deterministic values to avoid hydration mismatch
  const sparkles = Array.from({ length: 30 }, (_, i) => ({
    left: `${((i * 37 + 13) % 100)}%`,
    top: `${((i * 53 + 7) % 100)}%`,
    animationDelay: `${(i % 5)}s`,
    animationDuration: `${2 + (i % 3)}s`,
  }));

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Deep gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, #0F172A 0%, #0A0A0A 50%, #050505 100%)',
        }}
      />

      {/* Subtle grid pattern for depth */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(20, 184, 166, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(20, 184, 166, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'center top',
        }}
      />

      {/* Floating orbs */}
      {orbs.map((orb, index) => (
        <Orb key={index} {...orb} />
      ))}

      {/* Sparkle particles */}
      {sparkles.map((sparkle, index) => (
        <Sparkle
          key={index}
          style={{
            left: sparkle.left,
            top: sparkle.top,
            animationDelay: sparkle.animationDelay,
            animationDuration: sparkle.animationDuration,
          }}
        />
      ))}

      {/* Vignette overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </div>
  );
}

// ==========================================
// LOGIN FORM COMPONENT
// ==========================================
// SECURITY: Validate callback URL to prevent open redirect attacks
function getSafeCallbackUrl(callbackUrl: string | null): string {
  const defaultUrl = '/dashboard';
  if (!callbackUrl) return defaultUrl;

  // Only allow relative paths (starting with /)
  // Reject absolute URLs, protocol-relative URLs, and encoded characters
  if (
    !callbackUrl.startsWith('/') ||
    callbackUrl.startsWith('//') ||
    callbackUrl.includes(':') ||
    callbackUrl.includes('%')
  ) {
    return defaultUrl;
  }

  return callbackUrl;
}

function LoginForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get('callbackUrl'));
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(error || '');
  const turnstileTokenRef = useRef<string | null>(null);

  // SECURITY: Only remember email, NEVER store passwords in localStorage
  // Storing passwords in localStorage is a critical security vulnerability
  useEffect(() => {
    const savedEmail = localStorage.getItem('zalogche_remembered_email');
    // Clean up any previously stored passwords (security fix)
    localStorage.removeItem('zalogche_remembered_password');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    // SECURITY: Verify CAPTCHA before login
    if (!turnstileTokenRef.current && process.env.NODE_ENV === 'production') {
      setErrorMessage('Please complete the CAPTCHA verification');
      setLoading(false);
      return;
    }

    try {
      // Pre-verify CAPTCHA on server
      if (turnstileTokenRef.current) {
        const captchaRes = await fetch('/api/auth/verify-captcha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ turnstileToken: turnstileTokenRef.current }),
        });

        if (!captchaRes.ok) {
          const data = await captchaRes.json();
          setErrorMessage(data.error || 'CAPTCHA verification failed');
          setLoading(false);
          return;
        }
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setErrorMessage(t.auth.login.error);
      } else if (result?.ok) {
        // SECURITY: Only save email, never password
        if (rememberMe) {
          localStorage.setItem('zalogche_remembered_email', email);
        } else {
          localStorage.removeItem('zalogche_remembered_email');
        }
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (error) {
      setErrorMessage(t.common.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 w-full max-w-md mx-4">
      {/* Language Switcher */}
      <div className="absolute -top-12 right-0">
        <LanguageSwitcher />
      </div>

      {/* Logo with glow effect */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold tracking-tight animate-shimmer bg-gradient-to-r from-teal-400 via-cyan-300 to-teal-400 bg-[length:200%_100%] bg-clip-text text-transparent">
          {t.auth.login.title}
        </h1>
        <p className="text-zinc-400 mt-2 text-sm tracking-wide">{t.auth.login.subtitle}</p>
      </div>

      {/* Glass morphism card */}
      <div className="relative group">
        {/* Animated border glow */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-teal-500/50 via-cyan-500/50 to-violet-500/50 rounded-3xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity duration-500 animate-border-glow" />

        {/* Card content */}
        <div className="relative backdrop-blur-xl bg-zinc-900/70 border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50">
          {errorMessage && (
            <div className="bg-red-900/30 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                {t.auth.login.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-300 backdrop-blur-sm"
                placeholder={t.auth.login.emailPlaceholder}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                {t.auth.login.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-300 backdrop-blur-sm"
                placeholder={t.auth.login.passwordPlaceholder}
                required
              />
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800/50 text-teal-500 focus:ring-teal-500/50 focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-zinc-400 cursor-pointer select-none">
                {t.auth.login.rememberMe}
              </label>
            </div>

            {/* CAPTCHA */}
            <div className="flex justify-center">
              <TurnstileWidget
                onSuccess={(token) => {
                  turnstileTokenRef.current = token;
                }}
                onExpire={() => {
                  turnstileTokenRef.current = null;
                }}
                onError={() => {
                  turnstileTokenRef.current = null;
                  setErrorMessage('CAPTCHA failed. Please refresh and try again.');
                }}
                theme="dark"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-semibold py-3.5 rounded-xl transition-all duration-300 disabled:opacity-50 text-zinc-900 relative overflow-hidden group/btn"
              style={{
                background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 50%, #0D9488 100%)',
              }}
            >
              {/* Button shine effect */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
              <span className="relative">{loading ? t.auth.login.submitting : t.auth.login.submit}</span>
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-zinc-500">
            {t.auth.login.noAccount}{' '}
            <Link href="/register" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
              {t.auth.login.signUp}
            </Link>
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mt-8 text-center text-xs text-zinc-600">
        {t.auth.login.disclaimer}
      </p>
    </div>
  );
}

// ==========================================
// LOADING FALLBACK
// ==========================================
function LoginFormFallback() {
  return (
    <div className="relative z-10 w-full max-w-md mx-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-teal-400 tracking-tight">ZALOGCHE</h1>
        <p className="text-zinc-400 mt-4">...</p>
      </div>
      <div className="backdrop-blur-xl bg-zinc-900/70 border border-white/10 rounded-3xl p-8 animate-pulse">
        <div className="h-12 bg-zinc-800/50 rounded-xl mb-4" />
        <div className="h-12 bg-zinc-800/50 rounded-xl mb-4" />
        <div className="h-12 bg-teal-500/30 rounded-xl" />
      </div>
    </div>
  );
}

// ==========================================
// MAIN LOGIN PAGE
// ==========================================
export default function LoginPage() {
  return (
    <>
      {/* Custom CSS animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0) scale(1);
          }
          25% {
            transform: translateY(-40px) translateX(20px) scale(1.05);
          }
          50% {
            transform: translateY(-20px) translateX(-15px) scale(0.95);
          }
          75% {
            transform: translateY(-50px) translateX(25px) scale(1.02);
          }
        }

        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        @keyframes border-glow {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.8;
          }
        }

        .animate-float {
          animation: float ease-in-out infinite;
        }

        .animate-sparkle {
          animation: sparkle ease-in-out infinite;
        }

        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }

        .animate-border-glow {
          animation: border-glow 3s ease-in-out infinite;
        }
      `}</style>

      <div className="min-h-screen flex items-center justify-center relative">
        <AnimatedBackground />
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </>
  );
}
