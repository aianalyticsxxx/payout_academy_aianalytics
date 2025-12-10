// ==========================================
// CARD COMPONENT
// ==========================================

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'gradient';
}

export function Card({ children, className = '', variant = 'default' }: CardProps) {
  if (variant === 'gradient') {
    return (
      <div className={`relative p-[1px] rounded-2xl bg-gradient-to-b from-teal-500/50 to-teal-600/20 ${className}`}>
        <div className="bg-surface rounded-2xl p-6">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface border border-zinc-800/50 rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`text-xl font-bold text-white ${className}`}>
      {children}
    </h3>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
