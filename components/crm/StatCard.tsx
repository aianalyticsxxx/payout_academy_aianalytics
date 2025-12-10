// ==========================================
// STAT CARD COMPONENT
// ==========================================

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  change,
  icon,
  trend,
  description,
  loading = false,
}: StatCardProps) {
  const trendColor =
    trend === 'up'
      ? 'text-green-500'
      : trend === 'down'
      ? 'text-red-500'
      : 'text-gray-400';

  const trendIcon =
    trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  if (loading) {
    return (
      <div className="bg-surface border border-zinc-800/50 rounded-lg p-6 hover:border-teal-500/30 transition-all animate-pulse">
        <div className="h-4 bg-zinc-800 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-zinc-800 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-zinc-800 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-zinc-800/50 rounded-lg p-6 hover:border-teal-500/30 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-white mb-2">{value}</h3>

          <div className="flex items-center gap-2">
            {change !== undefined && (
              <p className={`text-sm font-medium ${trendColor} flex items-center gap-1`}>
                <span>{trendIcon}</span>
                <span>
                  {change > 0 ? '+' : ''}
                  {change.toFixed(1)}%
                </span>
              </p>
            )}
            {description && (
              <p className="text-xs text-gray-500">{description}</p>
            )}
          </div>
        </div>

        {icon && (
          <div className="text-4xl opacity-20">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
