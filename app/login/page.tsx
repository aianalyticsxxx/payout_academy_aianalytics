'use client';

// ==========================================
// LOGIN PAGE - Immersive 3D Floating Orbs Design
// ==========================================

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

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
  // Generate sparkle particles
  const sparkles = Array.from({ length: 30 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 5}s`,
    animationDuration: `${2 + Math.random() * 3}s`,
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
    <div className="relative z-10 w-full max-w-md mx-4">
      {/* Logo with glow effect */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight animate-shimmer bg-gradient-to-r from-teal-400 via-cyan-300 to-teal-400 bg-[length:200%_100%] bg-clip-text text-transparent">
          ZALOGCHE
        </h1>
        <p className="text-zinc-400 mt-4 text-sm tracking-wide">Enter the arena</p>
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
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-300 backdrop-blur-sm"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-300 backdrop-blur-sm"
                placeholder="••••••••"
                required
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
              <span className="relative">{loading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-700/50"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-zinc-900/70 text-zinc-500 backdrop-blur-sm">Or continue with</span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              className="w-full mt-5 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 text-white font-medium py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 backdrop-blur-sm group/google"
            >
              <svg className="w-5 h-5 transition-transform group-hover/google:scale-110" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mt-8 text-center text-xs text-zinc-600">
        By signing in, you agree that this platform is for entertainment purposes only.
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
        <p className="text-zinc-400 mt-4">Loading...</p>
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
