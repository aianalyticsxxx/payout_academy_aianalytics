// ==========================================
// CRM SIDEBAR NAVIGATION
// ==========================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: '/crm/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/crm/users', label: 'Users', icon: '👥' },
  { href: '/crm/challenges', label: 'Challenges', icon: '🎯' },
  { href: '/crm/bets', label: 'Betting', icon: '🎲' },
  { href: '/crm/referrals', label: 'Referrals', icon: '🔗' },
  { href: '/crm/revenue', label: 'Revenue', icon: '💰' },
  { href: '/crm/operations', label: 'Operations', icon: '⚙️' },
  { href: '/crm/admin', label: 'Administration', icon: '🛡️' },
];

export function CRMSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-surface border-r border-zinc-800/50 min-h-screen">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800/50">
        <Link href="/crm/dashboard" className="block">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">
            ZALOGCHE CRM
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Admin Dashboard</p>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-teal-900/20 text-teal-400 border-l-4 border-teal-400'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
