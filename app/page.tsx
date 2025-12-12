// ==========================================
// ZALOGCHE LANDING PAGE
// ==========================================

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  BEGINNER_CHALLENGE_TIERS,
  PRO_CHALLENGE_TIERS,
  BEGINNER_LEVEL_REQUIREMENTS,
  PRO_LEVEL_REQUIREMENTS,
  DIFFICULTY_CONFIG,
} from '@/lib/challenges/constants';

// ==========================================
// ANIMATED COUNTER COMPONENT
// ==========================================
function AnimatedCounter({
  target,
  prefix = '',
  suffix = '',
  duration = 2000
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * target));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, target, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

// ==========================================
// FLOATING SPORTS ICONS
// ==========================================
function FloatingIcons() {
  const icons = [
    { emoji: '⚽', size: 'text-6xl', top: '10%', left: '5%', delay: '0s', duration: '20s' },
    { emoji: '🏀', size: 'text-5xl', top: '20%', right: '8%', delay: '2s', duration: '25s' },
    { emoji: '🎯', size: 'text-4xl', top: '60%', left: '3%', delay: '4s', duration: '22s' },
    { emoji: '🏈', size: 'text-5xl', top: '70%', right: '5%', delay: '1s', duration: '18s' },
    { emoji: '⚾', size: 'text-4xl', top: '40%', left: '8%', delay: '3s', duration: '24s' },
    { emoji: '🎾', size: 'text-3xl', top: '30%', right: '12%', delay: '5s', duration: '21s' },
    { emoji: '🏒', size: 'text-4xl', top: '80%', left: '10%', delay: '2.5s', duration: '23s' },
    { emoji: '🥊', size: 'text-3xl', top: '50%', right: '3%', delay: '1.5s', duration: '19s' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {icons.map((icon, i) => (
        <div
          key={i}
          className={`absolute ${icon.size} opacity-10 animate-float`}
          style={{
            top: icon.top,
            left: icon.left,
            right: icon.right,
            animationDelay: icon.delay,
            animationDuration: icon.duration,
          }}
        >
          {icon.emoji}
        </div>
      ))}
    </div>
  );
}

// ==========================================
// MAIN LANDING PAGE
// ==========================================
export default function LandingPage() {
  const [difficulty, setDifficulty] = useState<'beginner' | 'pro'>('beginner');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<typeof BEGINNER_CHALLENGE_TIERS[number] | typeof PRO_CHALLENGE_TIERS[number] | null>(null);
  const [purchaseStep, setPurchaseStep] = useState<'select' | 'checkout'>('select');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'beginner' | 'pro'>('beginner');
  const [isScrolled, setIsScrolled] = useState(false);

  // Track scroll for floating header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const tiers = difficulty === 'beginner' ? BEGINNER_CHALLENGE_TIERS : PRO_CHALLENGE_TIERS;
  const levels = difficulty === 'beginner' ? BEGINNER_LEVEL_REQUIREMENTS : PRO_LEVEL_REQUIREMENTS;
  const config = DIFFICULTY_CONFIG[difficulty];

  const modalTiers = selectedDifficulty === 'beginner' ? BEGINNER_CHALLENGE_TIERS : PRO_CHALLENGE_TIERS;
  const modalLevels = selectedDifficulty === 'beginner' ? BEGINNER_LEVEL_REQUIREMENTS : PRO_LEVEL_REQUIREMENTS;

  const getTotalPayout = (rewards: readonly number[]) =>
    rewards.reduce((sum, r) => sum + r, 0);

  const openPurchaseModal = (tier?: typeof BEGINNER_CHALLENGE_TIERS[number]) => {
    if (tier) {
      setSelectedTier(tier);
      setPurchaseStep('checkout');
    } else {
      setSelectedTier(null);
      setPurchaseStep('select');
    }
    setShowPurchaseModal(true);
  };

  const handlePurchase = async () => {
    setIsProcessing(true);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Redirect to main app or show success
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* ==========================================
          FLOATING HEADER
          ========================================== */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <a href="#" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:shadow-teal-500/40 transition-shadow">
                <span className="text-xl font-black text-white">Z</span>
              </div>
              <span className="text-xl font-bold text-white hidden sm:block">Zalogche</span>
            </a>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                How it Works
              </a>
              <a href="#reviews" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                Reviews
              </a>
              <a href="#challenges" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                Challenges
              </a>
              <a href="#benefits" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                Benefits
              </a>
            </nav>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3">
              <a
                href="/login"
                className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
              >
                Log In
              </a>
              <a
                href="#challenges"
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 transition-all duration-300 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ==========================================
          HERO SECTION
          ========================================== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0D1818] to-[#0A0A0A]" />

        {/* Grid Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(20, 184, 166, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(20, 184, 166, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Radial Glow */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(20, 184, 166, 0.15) 0%, transparent 60%)',
          }}
        />

        {/* Floating Sports Icons */}
        <FloatingIcons />

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/30 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-sm text-teal-400 font-medium">Join 2,500+ Active Players</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight animate-slide-up">
            Turn Win Streaks
            <br />
            <span className="bg-gradient-to-r from-teal-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Into Real Rewards
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-zinc-400 mb-4 max-w-2xl mx-auto animate-slide-up animation-delay-200">
            Build consecutive wins. Complete 4 levels. Earn up to
          </p>

          {/* Animated Payout Counter */}
          <div className="text-4xl md:text-6xl font-black text-amber-400 mb-8 animate-slide-up animation-delay-300">
            €<AnimatedCounter target={135250} duration={2500} />
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up animation-delay-400">
            <a
              href="#challenges"
              className="group relative px-8 py-4 rounded-xl font-bold text-lg overflow-hidden transition-all duration-300 hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-teal-500 group-hover:from-teal-500 group-hover:to-teal-400 transition-all duration-300" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 40px rgba(20, 184, 166, 0.5)' }} />
              <span className="relative flex items-center gap-2">
                Start Your Challenge
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </a>

            <a
              href="#how-it-works"
              className="px-8 py-4 rounded-xl font-bold text-lg border border-zinc-700 hover:border-teal-500/50 hover:bg-teal-500/5 transition-all duration-300"
            >
              See How It Works
            </a>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <svg className="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </section>

      {/* ==========================================
          SOCIAL PROOF STRIP
          ========================================== */}
      <section className="relative py-6 border-y border-zinc-800/50 bg-[#0D0D0D]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {[
              { value: '2M+', label: 'Paid Out', prefix: '€' },
              { value: '10K+', label: 'Challenges Completed' },
              { value: '7', label: 'AI Models' },
              { value: '45', label: 'Day Access' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white">
                  {stat.prefix}{stat.value}
                </div>
                <div className="text-sm text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          HOW IT WORKS
          ========================================== */}
      <section id="how-it-works" className="py-20 md:py-32">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              How It <span className="text-teal-400">Works</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Three simple steps to start earning rewards from your sports knowledge
            </p>
          </div>

          {/* Video Section */}
          <div className="mb-16">
            <div className="relative max-w-4xl mx-auto">
              {/* Video Container */}
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-800/50 bg-zinc-900/50 group">
                {/* Placeholder/Thumbnail - Replace with actual video */}
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] via-[#151515] to-[#111111]">
                  {/* Play Button */}
                  <button className="relative z-10 w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-r from-teal-600 to-teal-500 flex items-center justify-center shadow-xl shadow-teal-500/30 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>

                  {/* Decorative Elements */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(20,184,166,0.1),transparent_70%)]" />

                  {/* Corner Decorations */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 text-zinc-500 text-sm">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span>Watch Demo</span>
                  </div>
                  <div className="absolute bottom-4 right-4 text-zinc-500 text-sm">
                    2:30
                  </div>
                </div>

                {/* Actual Video Element (hidden until you add a video URL) */}
                {/*
                <video
                  className="w-full h-full object-cover"
                  poster="/video-thumbnail.jpg"
                  controls
                >
                  <source src="/how-it-works.mp4" type="video/mp4" />
                </video>
                */}

                {/* Or YouTube Embed */}
                {/*
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
                  title="How It Works"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                */}
              </div>

              {/* Video Caption */}
              <p className="text-center text-zinc-500 text-sm mt-4">
                See how easy it is to start earning rewards with Zalogche
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="relative grid md:grid-cols-3 gap-8">
            {/* Connection Line (desktop only) */}
            <div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-teal-500/0 via-teal-500/50 to-teal-500/0" />

            {[
              {
                step: '01',
                icon: '🎮',
                title: 'Choose Your Challenge',
                description: 'Pick your account size (€1K - €100K) and difficulty mode (Beginner or Pro)',
              },
              {
                step: '02',
                icon: '🔥',
                title: 'Build Your Streak',
                description: 'Win consecutive bets at minimum odds. Each streak milestone unlocks a reward level',
              },
              {
                step: '03',
                icon: '💰',
                title: 'Collect Rewards',
                description: 'Get paid instantly at each level. Keep your rewards even if your streak breaks later',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="relative group"
              >
                {/* Step Number Circle */}
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="absolute inset-1 rounded-full bg-[#0A0A0A] flex items-center justify-center">
                    <span className="text-2xl">{item.icon}</span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-xs font-bold">
                    {item.step}
                  </div>
                </div>

                {/* Card */}
                <div className="bg-[#111111] border border-zinc-800/50 rounded-2xl p-6 text-center group-hover:border-teal-500/30 transition-all duration-300">
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-zinc-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          TESTIMONIALS / REVIEWS
          ========================================== */}
      <section id="reviews" className="py-20 md:py-32 bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              What Players Are <span className="text-teal-400">Saying</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Join thousands of players already winning with Zalogche
            </p>
          </div>

          {/* Testimonials Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Marcus R.',
                avatar: '🇩🇪',
                tier: '€10K Pro',
                reward: '€8,500',
                quote: 'Hit Level 4 on my second try. The streak system keeps me disciplined - no more random bets. Already withdrew €8.5K!',
                rating: 5,
              },
              {
                name: 'Sophie L.',
                avatar: '🇫🇷',
                tier: '€5K Beginner',
                reward: '€3,200',
                quote: 'Started with Beginner mode to learn the ropes. The lower odds requirement (1.5x) made it much easier to build streaks.',
                rating: 5,
              },
              {
                name: 'James T.',
                avatar: '🇬🇧',
                tier: '€25K Pro',
                reward: '€21,000',
                quote: 'Been betting for years but never had a system. Zalogche changed that. The level rewards keep you motivated.',
                rating: 5,
              },
              {
                name: 'Elena K.',
                avatar: '🇪🇸',
                tier: '€1K Beginner',
                reward: '€950',
                quote: 'Perfect for starting out. Low entry cost, and even if I lose my streak, I keep the rewards I already earned!',
                rating: 5,
              },
              {
                name: 'David M.',
                avatar: '🇳🇱',
                tier: '€50K Pro',
                reward: '€45,000',
                quote: 'The 45-day window is generous. No pressure to rush. Completed all 4 levels with 2 weeks to spare.',
                rating: 5,
              },
              {
                name: 'Anna P.',
                avatar: '🇵🇱',
                tier: '€5K Pro',
                reward: '€4,800',
                quote: 'Love that I can reset my streak if I mess up. The €10 reset fee is nothing compared to the potential rewards.',
                rating: 5,
              },
            ].map((testimonial, i) => (
              <div
                key={i}
                className="bg-gradient-to-b from-zinc-900/80 to-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 hover:border-teal-500/30 transition-all duration-300 group"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <span key={j} className="text-amber-400">★</span>
                  ))}
                </div>

                {/* Quote */}
                <p className="text-zinc-300 mb-6 leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center text-lg">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{testimonial.name}</div>
                      <div className="text-xs text-zinc-500">{testimonial.tier}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-bold">{testimonial.reward}</div>
                    <div className="text-[10px] text-zinc-500">EARNED</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: '2,500+', label: 'Active Players' },
              { value: '€850K+', label: 'Total Rewards Paid' },
              { value: '92%', label: 'Payout Rate' },
              { value: '4.8/5', label: 'Player Rating' },
            ].map((stat, i) => (
              <div key={i} className="text-center p-4">
                <div className="text-2xl md:text-3xl font-black text-white mb-1">{stat.value}</div>
                <div className="text-sm text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          CHALLENGE TIERS SHOWCASE
          ========================================== */}
      <section id="challenges" className="py-20 md:py-32 bg-gradient-to-b from-[#0A0A0A] via-[#0D1212] to-[#0A0A0A]">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              Choose Your <span className="text-teal-400">Challenge</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-8">
              6 account sizes, 2 difficulty modes. Pick what suits your style.
            </p>

            {/* Difficulty Toggle */}
            <div className="inline-flex items-center gap-2 p-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <button
                onClick={() => setDifficulty('beginner')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                  difficulty === 'beginner'
                    ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-500/25'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                🎯 Beginner
              </button>
              <button
                onClick={() => setDifficulty('pro')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                  difficulty === 'pro'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-500/25'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                ⚡ Pro
              </button>
            </div>

            {/* Difficulty Info */}
            <div className="mt-4 text-sm text-zinc-500">
              {config.description} • Min {config.minOdds}x odds • {levels.map(l => l.streakRequired).join(' → ')} wins
            </div>
          </div>

          {/* Tiers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tiers.map((tier, idx) => {
              const isPopular = tier.size === 10000;
              const isBestValue = tier.size === 25000;
              const total = getTotalPayout(tier.rewards);

              return (
                <div
                  key={tier.size}
                  className={`bg-gradient-to-br from-[#1a1a1a] via-[#151515] to-[#111111] border rounded-2xl p-6 relative overflow-hidden group transition-all hover:border-teal-600/50 ${
                    isPopular || isBestValue ? 'border-amber-500/50' : 'border-zinc-800/50'
                  }`}
                >
                  {/* Popular Badge */}
                  {(isPopular || isBestValue) && (
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-b-lg text-xs font-bold text-black uppercase tracking-wide">
                      {isPopular ? 'MOST POPULAR' : 'BEST VALUE'}
                    </div>
                  )}

                  {/* Card Header */}
                  <div className="text-center mb-4 mt-4">
                    <div className="text-4xl font-black text-white mb-1">€{tier.size.toLocaleString()}</div>
                    <div className="text-sm font-bold text-teal-400 tracking-widest uppercase">CHALLENGE</div>
                  </div>

                  {/* Level Rewards Grid */}
                  <div className="bg-zinc-900/50 rounded-xl p-4 mb-4">
                    <div className="text-xs text-zinc-400 text-center mb-3 uppercase tracking-wider">
                      Rewards Per Level ({difficulty === 'pro' ? 'Pro' : 'Beginner'})
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {levels.map((lvl, i) => (
                        <div key={lvl.level} className="bg-zinc-800/50 rounded-lg p-2 text-center">
                          <div className={`text-[10px] font-bold bg-gradient-to-r ${lvl.color} bg-clip-text text-transparent`}>
                            LVL {lvl.level} • {lvl.streakRequired}W
                          </div>
                          <div className="text-white font-bold text-sm">€{tier.rewards[i].toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total Potential */}
                  <div className="flex items-center justify-between px-3 py-2 bg-teal-500/10 rounded-lg border border-teal-500/30 mb-4">
                    <span className="text-zinc-400 text-sm">Max Payout (All 4)</span>
                    <span className="text-teal-400 font-bold">€{total.toLocaleString()}</span>
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-xs text-zinc-500 mb-4">
                    <span>⏱️ 45 days</span>
                    <span>🔄 Reset: €{tier.resetFee}</span>
                  </div>

                  {/* Buy Button */}
                  <button
                    onClick={() => {
                      setSelectedDifficulty(difficulty);
                      setSelectedTier(tier);
                      setPurchaseStep('checkout');
                      setShowPurchaseModal(true);
                    }}
                    className={`block w-full py-4 rounded-xl font-bold text-lg text-center transition-all text-white shadow-lg ${
                      difficulty === 'pro'
                        ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-500/25 group-hover:shadow-amber-500/40'
                        : 'bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 shadow-teal-500/25 group-hover:shadow-teal-500/40'
                    }`}
                  >
                    💳 START - €{tier.cost}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==========================================
          AI SWARM INTELLIGENCE
          ========================================== */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(20, 184, 166, 0.08) 0%, transparent 60%)',
        }} />

        <div className="relative max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              7 AI Models. <span className="text-teal-400">One Winning Edge.</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Our swarm intelligence analyzes every match from 7 different perspectives to give you the best insights
            </p>
          </div>

          {/* AI Constellation */}
          <div className="relative h-[400px] md:h-[500px]">
            {/* Center Hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-40 md:h-40">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 animate-pulse" />
              <div className="absolute inset-2 rounded-full bg-[#0A0A0A] flex items-center justify-center flex-col">
                <span className="text-3xl mb-1">🧠</span>
                <span className="text-xs font-bold text-teal-400">SWARM</span>
                <span className="text-xs text-zinc-500">CONSENSUS</span>
              </div>
            </div>

            {/* AI Agents */}
            {[
              { name: 'Claude', color: 'orange', angle: 0 },
              { name: 'ChatGPT', color: 'green', angle: 51 },
              { name: 'Gemini', color: 'blue', angle: 103 },
              { name: 'Grok', color: 'purple', angle: 154 },
              { name: 'Llama', color: 'indigo', angle: 206 },
              { name: 'Copilot', color: 'cyan', angle: 257 },
              { name: 'Perplexity', color: 'teal', angle: 309 },
            ].map((agent, i) => {
              const radius = 150; // Distance from center
              const angle = (agent.angle * Math.PI) / 180;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <div
                  key={agent.name}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                  }}
                >
                  {/* Connection Line */}
                  <div
                    className="absolute w-px bg-gradient-to-r from-zinc-800 to-transparent h-20 md:h-32 origin-bottom"
                    style={{
                      transform: `rotate(${agent.angle + 90}deg) translateY(-100%)`,
                      opacity: 0.3,
                    }}
                  />

                  {/* Agent Orb */}
                  <div className="group relative">
                    <div
                      className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer
                        bg-${agent.color}-900/30 border border-${agent.color}-500/30 hover:border-${agent.color}-400/60 hover:scale-110`}
                      style={{
                        animation: `pulse-slow ${3 + i * 0.5}s ease-in-out infinite`,
                        animationDelay: `${i * 0.3}s`,
                      }}
                    >
                      <span className={`text-xs md:text-sm font-bold text-${agent.color}-400`}>
                        {agent.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>

                    {/* Tooltip */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      <span className={`text-xs font-medium text-${agent.color}-400`}>{agent.name}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI List (mobile friendly) */}
          <div className="flex flex-wrap justify-center gap-3 mt-8 md:hidden">
            {['Claude', 'ChatGPT', 'Gemini', 'Grok', 'Llama', 'Copilot', 'Perplexity'].map((name) => (
              <span key={name} className="px-3 py-1.5 rounded-full bg-zinc-800/50 text-sm text-zinc-400">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          KEY BENEFITS GRID
          ========================================== */}
      <section id="benefits" className="py-20 md:py-32 bg-[#0D0D0D]">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              Why <span className="text-teal-400">Zalogche</span>?
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              We&apos;re not just another betting platform. Here&apos;s what makes us different.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '🎯',
                title: 'Keep What You Earn',
                description: 'Completed level rewards are yours forever, even if your streak breaks later',
              },
              {
                icon: '⚡',
                title: '5 Challenges At Once',
                description: 'Run multiple challenges simultaneously - one bet counts for all active challenges',
              },
              {
                icon: '🤖',
                title: 'AI-Powered Analysis',
                description: '7 AI models analyze every match to help you make informed decisions',
              },
              {
                icon: '💰',
                title: 'Instant Payouts',
                description: 'Withdraw your rewards anytime via Bank Transfer, PayPal, or Crypto',
              },
              {
                icon: '🔄',
                title: 'Reset & Continue',
                description: 'Challenge expired? Reset at 50% of the original cost and keep building',
              },
              {
                icon: '📊',
                title: 'Transparent Rewards',
                description: 'Know exactly what you\'ll earn at each level before you start',
              },
            ].map((benefit, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl bg-[#111111] border border-zinc-800/50 hover:border-teal-500/30 transition-all duration-300"
              >
                <div className="text-4xl mb-4">{benefit.icon}</div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-teal-400 transition-colors">
                  {benefit.title}
                </h3>
                <p className="text-zinc-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          COMPARISON TABLE
          ========================================== */}
      <section id="compare" className="py-20 md:py-32">
        <div className="max-w-4xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              Zalogche vs <span className="text-zinc-500">Regular Betting</span>
            </h2>
          </div>

          {/* Comparison Table */}
          <div className="overflow-hidden rounded-2xl border border-zinc-800/50">
            {/* Header */}
            <div className="grid grid-cols-3 bg-[#111111]">
              <div className="p-4 text-zinc-400 font-medium">Feature</div>
              <div className="p-4 text-center font-bold text-teal-400 bg-teal-500/10 border-x border-teal-500/20">
                Zalogche
              </div>
              <div className="p-4 text-center font-medium text-zinc-500">Regular Betting</div>
            </div>

            {/* Rows */}
            {[
              { feature: 'Keep rewards after losing', zalogche: true, regular: false },
              { feature: 'Fixed milestone payouts', zalogche: true, regular: false },
              { feature: 'AI analysis included', zalogche: true, regular: false },
              { feature: 'Multiple concurrent challenges', zalogche: true, regular: false },
              { feature: 'Transparent earning structure', zalogche: true, regular: false },
              { feature: '45-day challenge window', zalogche: true, regular: 'N/A' },
            ].map((row, i) => (
              <div key={i} className={`grid grid-cols-3 ${i % 2 === 0 ? 'bg-[#0D0D0D]' : 'bg-[#111111]'}`}>
                <div className="p-4 text-zinc-300">{row.feature}</div>
                <div className="p-4 text-center bg-teal-500/5 border-x border-teal-500/10">
                  {row.zalogche === true ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400">✓</span>
                  ) : (
                    <span className="text-zinc-500">{row.zalogche}</span>
                  )}
                </div>
                <div className="p-4 text-center">
                  {row.regular === true ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400">✓</span>
                  ) : row.regular === false ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20 text-red-400">✗</span>
                  ) : (
                    <span className="text-zinc-500">{row.regular}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          FINAL CTA
          ========================================== */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/20 via-[#0A0A0A] to-amber-900/20" />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 30% 50%, rgba(20, 184, 166, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, rgba(245, 158, 11, 0.15) 0%, transparent 50%)',
        }} />

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-6">
            Ready to Start <span className="text-teal-400">Winning</span>?
          </h2>
          <p className="text-xl text-zinc-400 mb-4">
            Choose your challenge, build your streak, and earn real rewards.
          </p>
          <p className="text-lg text-zinc-500 mb-8">
            Starting from just <span className="text-amber-400 font-bold">$20</span>
          </p>

          <button
            onClick={() => openPurchaseModal()}
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 transition-all duration-300 hover:scale-105 shadow-xl shadow-teal-500/25"
          >
            Start Your Challenge Now
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-6 mt-12 text-zinc-500 text-sm">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secure Payments
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Multiple Payout Options
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Trusted Platform
            </span>
          </div>
        </div>
      </section>

      {/* ==========================================
          PURCHASE MODAL
          ========================================== */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowPurchaseModal(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#111111] border border-zinc-800 rounded-t-3xl sm:rounded-3xl animate-slide-up">
            {/* Header */}
            <div className="sticky top-0 bg-[#111111] border-b border-zinc-800 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                {purchaseStep === 'checkout' && (
                  <button
                    onClick={() => {
                      setPurchaseStep('select');
                      setSelectedTier(null);
                    }}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <h2 className="text-xl font-bold">
                  {purchaseStep === 'select' ? 'Choose Your Challenge' : 'Quick Checkout'}
                </h2>
              </div>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {purchaseStep === 'select' ? (
                <>
                  {/* Difficulty Toggle in Modal */}
                  <div className="flex justify-center mb-6">
                    <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
                      <button
                        onClick={() => setSelectedDifficulty('beginner')}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                          selectedDifficulty === 'beginner'
                            ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        🎯 Beginner
                      </button>
                      <button
                        onClick={() => setSelectedDifficulty('pro')}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                          selectedDifficulty === 'pro'
                            ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        ⚡ Pro
                      </button>
                    </div>
                  </div>

                  {/* Challenge Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {modalTiers.map((tier) => {
                      const total = getTotalPayout(tier.rewards);
                      const isPopular = tier.size === 10000;

                      return (
                        <button
                          key={tier.size}
                          onClick={() => {
                            setSelectedTier(tier);
                            setPurchaseStep('checkout');
                          }}
                          className={`relative p-4 rounded-xl border transition-all text-left hover:scale-[1.02] ${
                            isPopular
                              ? 'border-amber-500/50 bg-amber-500/5'
                              : 'border-zinc-800 hover:border-teal-500/50 bg-zinc-900/50'
                          }`}
                        >
                          {isPopular && (
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-500 rounded text-[10px] font-bold text-black">
                              POPULAR
                            </div>
                          )}
                          <div className="text-2xl font-black mb-1">€{tier.size.toLocaleString()}</div>
                          <div className="text-xs text-zinc-500 mb-2">Challenge</div>
                          <div className="text-sm text-emerald-400 font-semibold mb-1">
                            Max: €{total.toLocaleString()}
                          </div>
                          <div className={`text-lg font-bold ${selectedDifficulty === 'pro' ? 'text-amber-400' : 'text-teal-400'}`}>
                            €{tier.cost}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  {/* Checkout Form */}
                  {selectedTier && (
                    <div className="space-y-6">
                      {/* Selected Challenge Summary */}
                      <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="text-2xl font-black">€{selectedTier.size.toLocaleString()}</div>
                            <div className="text-sm text-zinc-500">
                              {selectedDifficulty === 'pro' ? '⚡ Pro' : '🎯 Beginner'} Challenge
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-zinc-500">Total</div>
                            <div className={`text-2xl font-bold ${selectedDifficulty === 'pro' ? 'text-amber-400' : 'text-teal-400'}`}>
                              €{selectedTier.cost}
                            </div>
                          </div>
                        </div>

                        {/* Level Preview */}
                        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-zinc-800">
                          {modalLevels.map((lvl, i) => (
                            <div key={lvl.level} className="text-center">
                              <div className={`text-[10px] font-bold bg-gradient-to-r ${lvl.color} bg-clip-text text-transparent`}>
                                L{lvl.level}
                              </div>
                              <div className="text-xs text-white font-semibold">€{selectedTier.rewards[i]}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quick Buy Form */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="your@email.com"
                            className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-teal-500 focus:outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-1">Full Name</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="John Doe"
                            className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-teal-500 focus:outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-1">Card Number</label>
                          <input
                            type="text"
                            value={formData.cardNumber}
                            onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim() })}
                            placeholder="4242 4242 4242 4242"
                            maxLength={19}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-teal-500 focus:outline-none transition-colors font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Expiry</label>
                            <input
                              type="text"
                              value={formData.expiry}
                              onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '');
                                if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2, 4);
                                setFormData({ ...formData, expiry: val });
                              }}
                              placeholder="MM/YY"
                              maxLength={5}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-teal-500 focus:outline-none transition-colors font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">CVC</label>
                            <input
                              type="text"
                              value={formData.cvc}
                              onChange={(e) => setFormData({ ...formData, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                              placeholder="123"
                              maxLength={4}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-teal-500 focus:outline-none transition-colors font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Purchase Button */}
                      <button
                        onClick={handlePurchase}
                        disabled={isProcessing || !formData.email || !formData.name || !formData.cardNumber || !formData.expiry || !formData.cvc}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          selectedDifficulty === 'pro'
                            ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-lg shadow-amber-500/25'
                            : 'bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white shadow-lg shadow-teal-500/25'
                        }`}
                      >
                        {isProcessing ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Processing...
                          </span>
                        ) : (
                          <span>💳 Pay €{selectedTier.cost} & Start Challenge</span>
                        )}
                      </button>

                      {/* Security Note */}
                      <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Secure payment powered by Stripe
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          FOOTER
          ========================================== */}
      <footer className="py-8 border-t border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-xl font-bold">
              <span className="text-teal-400">Zalogche</span>
            </div>
            <div className="text-sm text-zinc-500">
              © 2024 Zalogche. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-sm text-zinc-500">
              <a href="#" className="hover:text-teal-400 transition-colors">Terms</a>
              <a href="#" className="hover:text-teal-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-teal-400 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ==========================================
          CUSTOM STYLES
          ========================================== */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }

        .animate-float {
          animation: float 20s ease-in-out infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }

        .animate-slide-up {
          animation: slide-up 0.8s ease-out forwards;
        }

        .animation-delay-200 {
          animation-delay: 200ms;
        }

        .animation-delay-300 {
          animation-delay: 300ms;
        }

        .animation-delay-400 {
          animation-delay: 400ms;
        }
      `}</style>
    </div>
  );
}
