// ==========================================
// HOW IT WORKS PAGE
// ==========================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BEGINNER_CHALLENGE_TIERS,
  PRO_CHALLENGE_TIERS,
  BEGINNER_LEVEL_REQUIREMENTS,
  PRO_LEVEL_REQUIREMENTS,
  DIFFICULTY_CONFIG,
} from '@/lib/challenges/constants';

export default function HowItWorksPage() {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'beginner' | 'pro'>('beginner');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const tiers = selectedDifficulty === 'pro' ? PRO_CHALLENGE_TIERS : BEGINNER_CHALLENGE_TIERS;
  const levels = selectedDifficulty === 'pro' ? PRO_LEVEL_REQUIREMENTS : BEGINNER_LEVEL_REQUIREMENTS;
  const config = DIFFICULTY_CONFIG[selectedDifficulty];

  const faqs = [
    {
      q: "How do the 4 levels work?",
      a: `Requirements depend on difficulty: Beginner (3, 6, 10, 15 wins with min odds 1.5) or Pro (2, 4, 6, 9 wins with min odds 2.0). You earn rewards at each level!`
    },
    {
      q: "What happens if I lose during a level?",
      a: "If you lose while attempting a level, your streak resets to zero but you keep any rewards already earned from completed levels. You can continue attempting the current level."
    },
    {
      q: "Do I need to complete all 4 levels?",
      a: "No! You can cash out your earned rewards at any time. However, completing all 4 levels unlocks the maximum payout for your account size."
    },
    {
      q: "How long do I have to complete all levels?",
      a: "You have 45 days from your purchase date to complete as many levels as you can. Any rewards earned during this time are yours to keep."
    },
    {
      q: "Can I reset my challenge?",
      a: "Yes! If your 45 days expire, you can reset at 50% of the original cost. This gives you a fresh 45 days to continue earning rewards."
    },
    {
      q: "What are the minimum odds requirements?",
      a: `Beginner mode requires minimum odds of 1.5x per bet. Pro mode requires minimum odds of 2.0x per bet. All bets must meet this requirement to count toward your streak.`
    },
    {
      q: "Can I have multiple challenges at once?",
      a: "Yes! You can have up to 5 active challenges at the same time. This allows you to work on different tiers or difficulties simultaneously."
    },
    {
      q: "When do I receive my rewards?",
      a: "Rewards are added to your available balance when you claim them after completing a level. You can then request a payout via bank transfer, PayPal, or crypto."
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-[#111]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <span className="font-bold text-xl text-teal-400">PayoutAcademy</span>
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-all text-sm font-medium"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center py-8">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            How <span className="text-teal-400">Challenges</span> Work
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Build win streaks, unlock levels, and earn rewards. The more you win, the more you earn!
          </p>
        </div>

        {/* Difficulty Toggle */}
        <div className="flex justify-center">
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-1.5 flex gap-2">
            <button
              onClick={() => setSelectedDifficulty('beginner')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                selectedDifficulty === 'beginner'
                  ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>🎯</span> Beginner Mode
            </button>
            <button
              onClick={() => setSelectedDifficulty('pro')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                selectedDifficulty === 'pro'
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>⚡</span> Pro Mode
            </button>
          </div>
        </div>

        {/* Mode Info */}
        <div className={`rounded-2xl p-6 border ${
          selectedDifficulty === 'pro'
            ? 'bg-gradient-to-br from-amber-900/20 to-amber-950/30 border-amber-500/30'
            : 'bg-gradient-to-br from-teal-900/20 to-teal-950/30 border-teal-500/30'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl ${
              selectedDifficulty === 'pro' ? 'bg-amber-500/20' : 'bg-teal-500/20'
            }`}>
              {config.icon}
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${selectedDifficulty === 'pro' ? 'text-amber-400' : 'text-teal-400'}`}>
                {config.name} Mode
              </h2>
              <p className="text-zinc-400">{config.description}</p>
              <p className={`text-sm font-medium mt-1 ${selectedDifficulty === 'pro' ? 'text-amber-300' : 'text-teal-300'}`}>
                Minimum Odds: {config.minOdds}x per bet
              </p>
            </div>
          </div>
        </div>

        {/* How The Levels Work */}
        <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            The 4 Level System
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {levels.map((lvl, idx) => (
              <div key={lvl.level} className="relative">
                {idx < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 w-4 h-0.5 bg-gradient-to-r from-zinc-600 to-zinc-700 z-10"></div>
                )}
                <div className="text-center p-5 bg-zinc-900/50 rounded-xl border border-zinc-800/50 h-full">
                  <div className={`w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-r ${lvl.color} flex items-center justify-center shadow-lg`}>
                    <span className="text-white font-black text-xl">{lvl.level}</span>
                  </div>
                  <div className="text-white font-bold text-lg mb-1">{lvl.name}</div>
                  <div className={`font-semibold ${selectedDifficulty === 'pro' ? 'text-amber-400' : 'text-teal-400'}`}>
                    {lvl.streakRequired} Win Streak
                  </div>
                  <div className="text-zinc-500 text-sm mt-2">
                    {lvl.level === 1 && 'Start here!'}
                    {lvl.level === 2 && 'Keep the momentum!'}
                    {lvl.level === 3 && 'Almost there!'}
                    {lvl.level === 4 && 'Ultimate reward!'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <div className="text-emerald-400 font-semibold">Pro Tip</div>
                <div className="text-zinc-400 text-sm">
                  Each level reward is paid out when you complete it! A loss only resets your current streak, not your earned rewards.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reward Tiers Table */}
        <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Reward Tiers ({selectedDifficulty === 'pro' ? 'Pro' : 'Beginner'})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium">Tier</th>
                  <th className="text-center py-3 px-4 text-zinc-400 font-medium">Cost</th>
                  <th className="text-center py-3 px-4 text-amber-600 font-medium">Level 1</th>
                  <th className="text-center py-3 px-4 text-zinc-300 font-medium">Level 2</th>
                  <th className="text-center py-3 px-4 text-yellow-500 font-medium">Level 3</th>
                  <th className="text-center py-3 px-4 text-cyan-400 font-medium">Level 4</th>
                  <th className="text-center py-3 px-4 text-emerald-400 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier) => {
                  const total = tier.rewards.reduce((a, b) => a + b, 0);
                  return (
                    <tr key={tier.size} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                      <td className="py-4 px-4">
                        <span className={`font-bold text-lg ${selectedDifficulty === 'pro' ? 'text-amber-400' : 'text-teal-400'}`}>
                          {tier.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-white font-semibold">
                        ${tier.cost}
                      </td>
                      <td className="py-4 px-4 text-center text-zinc-300">
                        €{tier.rewards[0].toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-center text-zinc-300">
                        €{tier.rewards[1].toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-center text-zinc-300">
                        €{tier.rewards[2].toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-center text-zinc-300">
                        €{tier.rewards[3].toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-emerald-400 font-bold">€{total.toLocaleString()}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Step by Step Process */}
        <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">How to Get Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: 1,
                icon: '🛒',
                title: 'Purchase a Challenge',
                description: 'Choose your tier size ($20-$999) and difficulty (Beginner or Pro). You have 45 days to complete it.'
              },
              {
                step: 2,
                icon: '🎯',
                title: 'Build Your Streak',
                description: 'Place bets meeting the minimum odds requirement. Win consecutive bets to build your streak and unlock levels.'
              },
              {
                step: 3,
                icon: '💰',
                title: 'Claim Your Rewards',
                description: 'Each level you complete earns you rewards. Claim them and withdraw via bank, PayPal, or crypto.'
              }
            ].map((item) => (
              <div key={item.step} className="text-center p-6 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-500/20 flex items-center justify-center">
                  <span className="text-3xl">{item.icon}</span>
                </div>
                <div className="text-teal-400 text-sm font-bold mb-2">STEP {item.step}</div>
                <h3 className="text-white font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-zinc-400 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Challenge Rules */}
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>📋</span> Challenge Rules
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ul className="space-y-3 text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">✓</span>
                <span>Complete levels by achieving consecutive win streaks</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">✓</span>
                <span>Each level reward is paid out when completed - rewards are cumulative!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">✓</span>
                <span>A loss resets your streak to zero, but you keep earned rewards</span>
              </li>
            </ul>
            <ul className="space-y-3 text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">✓</span>
                <span>You have 45 days to complete as many levels as possible</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">✓</span>
                <span>Payouts processed within 3-5 business days</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">✓</span>
                <span>Reset option available at 50% cost when your 45 days expire</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Beginner vs Pro Comparison */}
        <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Beginner vs Pro Mode</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Beginner */}
            <div className="bg-teal-900/20 border border-teal-500/30 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🎯</span>
                <h3 className="text-xl font-bold text-teal-400">Beginner Mode</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-zinc-300">
                  <span className="text-teal-400">•</span>
                  Minimum odds: <span className="text-teal-400 font-bold">1.5x</span>
                </li>
                <li className="flex items-center gap-2 text-zinc-300">
                  <span className="text-teal-400">•</span>
                  Level requirements: <span className="text-teal-400 font-bold">3, 6, 10, 15 wins</span>
                </li>
                <li className="flex items-center gap-2 text-zinc-300">
                  <span className="text-teal-400">•</span>
                  Perfect for getting started
                </li>
                <li className="flex items-center gap-2 text-zinc-300">
                  <span className="text-teal-400">•</span>
                  Lower risk, steady progression
                </li>
              </ul>
            </div>

            {/* Pro */}
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">⚡</span>
                <h3 className="text-xl font-bold text-amber-400">Pro Mode</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-zinc-300">
                  <span className="text-amber-400">•</span>
                  Minimum odds: <span className="text-amber-400 font-bold">2.0x</span>
                </li>
                <li className="flex items-center gap-2 text-zinc-300">
                  <span className="text-amber-400">•</span>
                  Level requirements: <span className="text-amber-400 font-bold">2, 4, 6, 9 wins</span>
                </li>
                <li className="flex items-center gap-2 text-zinc-300">
                  <span className="text-amber-400">•</span>
                  Higher Level 2 & 3 rewards
                </li>
                <li className="flex items-center gap-2 text-zinc-300">
                  <span className="text-amber-400">•</span>
                  Faster completion, higher intensity
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-zinc-800/50 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-900/50 transition-all"
                >
                  <span className="text-white font-medium">{faq.q}</span>
                  <span className={`text-teal-400 transition-transform ${expandedFaq === idx ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {expandedFaq === idx && (
                  <div className="px-5 pb-4 text-zinc-400 text-sm border-t border-zinc-800/50 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-teal-900/30 to-teal-950/50 border border-teal-500/30 rounded-2xl p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Winning?</h2>
          <p className="text-zinc-400 mb-6 max-w-xl mx-auto">
            Choose your challenge tier, build your streak, and start earning rewards today!
          </p>
          <Link
            href="/?tab=challenges"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-400 text-white font-bold rounded-xl hover:from-teal-400 hover:to-teal-300 transition-all shadow-lg shadow-teal-500/30"
          >
            <span>🚀</span> View Challenges
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 mt-12 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-zinc-500 text-sm">
          <p>© 2024 PayoutAcademy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
