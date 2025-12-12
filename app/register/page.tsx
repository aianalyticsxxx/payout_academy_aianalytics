'use client';

// ==========================================
// REGISTER PAGE - Immersive 3D Floating Orbs Design
// ==========================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  { size: '500px', color: '#14B8A6', top: '-5%', left: '-10%', delay: 0, duration: 25, blur: 80 },
  { size: '400px', color: '#06B6D4', top: '55%', left: '70%', delay: 5, duration: 30, blur: 70 },
  { size: '250px', color: '#8B5CF6', top: '5%', left: '75%', delay: 10, duration: 20, blur: 50 },
  { size: '450px', color: '#14B8A6', top: '60%', left: '-15%', delay: 3, duration: 35, blur: 75 },
  { size: '200px', color: '#06B6D4', top: '30%', left: '5%', delay: 8, duration: 22, blur: 40 },
  { size: '300px', color: '#14B8A6', top: '75%', left: '40%', delay: 12, duration: 28, blur: 60 },
  { size: '180px', color: '#8B5CF6', top: '40%', left: '85%', delay: 6, duration: 32, blur: 45 },
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
  const sparkles = Array.from({ length: 30 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 5}s`,
    animationDuration: `${2 + Math.random() * 3}s`,
  }));

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, #0F172A 0%, #0A0A0A 50%, #050505 100%)',
        }}
      />

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

      {orbs.map((orb, index) => (
        <Orb key={index} {...orb} />
      ))}

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
// REGISTER PAGE COMPONENT
// ==========================================
export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
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
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo with glow effect */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold tracking-tight animate-shimmer bg-gradient-to-r from-teal-400 via-cyan-300 to-teal-400 bg-[length:200%_100%] bg-clip-text text-transparent">
            ZALOGCHE
          </h1>
          <p className="text-zinc-400 mt-2 text-sm tracking-wide">Create your account</p>
        </div>

        {/* Glass morphism card */}
        <div className="relative group">
          {/* Animated border glow */}
          <div className="absolute -inset-[1px] bg-gradient-to-r from-teal-500/50 via-cyan-500/50 to-violet-500/50 rounded-3xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity duration-500 animate-border-glow" />

          {/* Card content */}
          <div className="relative backdrop-blur-xl bg-zinc-900/70 border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50">
            {error && (
              <div className="bg-red-900/30 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* First Name & Last Name Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-300 backdrop-blur-sm"
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-300 backdrop-blur-sm"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-300 backdrop-blur-sm"
                  placeholder="you@example.com"
                  required
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-300 backdrop-blur-sm"
                  placeholder="+1 (555) 000-0000"
                  required
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-300 backdrop-blur-sm"
                  placeholder="your_username"
                  minLength={3}
                  maxLength={20}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-300 backdrop-blur-sm"
                  placeholder="••••••••"
                  minLength={8}
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full font-semibold py-3.5 rounded-xl transition-all duration-300 disabled:opacity-50 text-zinc-900 relative overflow-hidden group/btn"
                style={{
                  background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 50%, #0D9488 100%)',
                }}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                <span className="relative">{loading ? 'Creating account...' : 'Create Account'}</span>
              </button>
            </form>

            {/* Sign in link */}
            <p className="mt-8 text-center text-sm text-zinc-500">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-teal-400 hover:text-teal-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-8 text-center text-xs text-zinc-600">
          By creating an account, you confirm you are 18+ and agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
}
