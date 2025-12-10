// ==========================================
// BADGE COMPONENT
// ==========================================

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variantStyles = {
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    danger: 'bg-red-500/20 text-red-400 border-red-500/30',
    info: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    default: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// Status-specific badge components
export function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    active: { variant: 'success', label: 'Active' },
    completed: { variant: 'info', label: 'Completed' },
    expired: { variant: 'danger', label: 'Expired' },
    cancelled: { variant: 'default', label: 'Cancelled' },
    pending: { variant: 'warning', label: 'Pending' },
    paid: { variant: 'success', label: 'Paid' },
    won: { variant: 'success', label: 'Won' },
    lost: { variant: 'danger', label: 'Lost' },
    push: { variant: 'default', label: 'Push' },
  };

  const config = statusMap[status.toLowerCase()] || { variant: 'default', label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
