// ==========================================
// CRM PAGE HEADER WITH TRACKING
// ==========================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface CRMPageHeaderProps {
  title: string;
  description: string;
  icon?: string;
  breadcrumbs?: { label: string; href?: string }[];
  onRefresh?: () => Promise<void> | void;
  loading?: boolean;
  lastUpdated?: Date | null;
  autoRefresh?: boolean;
  autoRefreshInterval?: number; // in seconds
}

export function CRMPageHeader({
  title,
  description,
  icon,
  breadcrumbs = [],
  onRefresh,
  loading = false,
  lastUpdated,
  autoRefresh = false,
  autoRefreshInterval = 60,
}: CRMPageHeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh);
  const [countdown, setCountdown] = useState(autoRefreshInterval);
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>('');

  // Calculate time since last update
  useEffect(() => {
    if (!lastUpdated) return;

    const updateTimeSince = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);

      if (diff < 60) {
        setTimeSinceUpdate(`${diff}s ago`);
      } else if (diff < 3600) {
        setTimeSinceUpdate(`${Math.floor(diff / 60)}m ago`);
      } else {
        setTimeSinceUpdate(`${Math.floor(diff / 3600)}h ago`);
      }
    };

    updateTimeSince();
    const interval = setInterval(updateTimeSince, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Auto-refresh countdown
  useEffect(() => {
    if (!autoRefreshEnabled || !onRefresh) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleRefresh();
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, autoRefreshInterval, onRefresh]);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setCountdown(autoRefreshInterval);
    }
  }, [onRefresh, isRefreshing, autoRefreshInterval]);

  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
    setCountdown(autoRefreshInterval);
  };

  return (
    <div className="mb-8">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-3">
          <Link href="/crm/dashboard" className="hover:text-zinc-300 transition-colors">
            CRM
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <span className="text-zinc-600">/</span>
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-zinc-300 transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-zinc-400">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && <span className="text-3xl">{icon}</span>}
          <div>
            <h1 className="text-3xl font-bold text-white">{title}</h1>
            <p className="text-zinc-400 mt-1">{description}</p>
          </div>
        </div>

        {/* Tracking Controls */}
        {onRefresh && (
          <div className="flex items-center gap-3">
            {/* Last Updated */}
            {lastUpdated && (
              <div className="text-right">
                <div className="text-xs text-zinc-500">Last updated</div>
                <div className="text-sm text-zinc-400 font-medium">{timeSinceUpdate}</div>
              </div>
            )}

            {/* Auto-refresh Toggle */}
            <button
              onClick={toggleAutoRefresh}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                autoRefreshEnabled
                  ? 'bg-teal-900/30 text-teal-400 border border-teal-700'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
              }`}
              title={autoRefreshEnabled ? 'Disable auto-refresh' : 'Enable auto-refresh'}
            >
              {autoRefreshEnabled ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  Auto ({countdown}s)
                </span>
              ) : (
                'Auto-refresh'
              )}
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className={`p-2 rounded-lg transition-all ${
                isRefreshing || loading
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
              }`}
              title="Refresh data"
            >
              <svg
                className={`w-5 h-5 ${isRefreshing || loading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Loading Bar */}
      {(isRefreshing || loading) && (
        <div className="mt-4 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full animate-loading-bar" />
        </div>
      )}

      <style jsx>{`
        @keyframes loading-bar {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 30%;
            margin-left: 35%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }
        .animate-loading-bar {
          animation: loading-bar 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
