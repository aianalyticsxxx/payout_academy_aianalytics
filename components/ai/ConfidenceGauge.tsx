'use client';

// ==========================================
// CONFIDENCE GAUGE COMPONENT
// ==========================================
// Animated circular gauge showing AI consensus strength

import { useEffect, useState } from 'react';

interface ConfidenceGaugeProps {
  betVotes: number;
  passVotes: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  verdict: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export function ConfidenceGauge({
  betVotes,
  passVotes,
  confidence,
  verdict,
  size = 'md',
  animated = true,
}: ConfidenceGaugeProps) {
  const [displayPercent, setDisplayPercent] = useState(0);

  const total = betVotes + passVotes;
  const betPercent = total > 0 ? (betVotes / total) * 100 : 50;
  const isBetting = ['STRONG BET', 'SLIGHT EDGE'].includes(verdict);
  const displayValue = isBetting ? betPercent : (100 - betPercent);

  // Animate the gauge on mount
  useEffect(() => {
    if (!animated) {
      setDisplayPercent(displayValue);
      return;
    }

    const duration = 1000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPercent(displayValue * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [displayValue, animated]);

  // Size configurations
  const sizeConfig = {
    sm: { outer: 80, stroke: 6, fontSize: 'text-lg', labelSize: 'text-[8px]' },
    md: { outer: 120, stroke: 8, fontSize: 'text-2xl', labelSize: 'text-[10px]' },
    lg: { outer: 160, stroke: 10, fontSize: 'text-3xl', labelSize: 'text-xs' },
  };

  const config = sizeConfig[size];
  const radius = (config.outer - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayPercent / 100) * circumference;

  // Color based on confidence and verdict
  const getColor = () => {
    if (confidence === 'HIGH' && isBetting) return { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.3)' };
    if (confidence === 'HIGH' && !isBetting) return { stroke: '#f43f5e', glow: 'rgba(244, 63, 94, 0.3)' };
    if (confidence === 'MEDIUM') return { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' };
    return { stroke: '#6b7280', glow: 'rgba(107, 114, 128, 0.2)' };
  };

  const colors = getColor();

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-50 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
          transform: 'scale(1.2)',
        }}
      />

      <svg
        width={config.outer}
        height={config.outer}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.outer / 2}
          cy={config.outer / 2}
          r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth={config.stroke}
        />

        {/* Progress circle */}
        <circle
          cx={config.outer / 2}
          cy={config.outer / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300"
          style={{
            filter: `drop-shadow(0 0 6px ${colors.stroke}40)`,
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${config.fontSize} font-bold font-mono`} style={{ color: colors.stroke }}>
          {Math.round(displayPercent)}%
        </span>
        <span className={`${config.labelSize} font-semibold text-zinc-500 uppercase tracking-wider mt-0.5`}>
          {confidence}
        </span>
      </div>
    </div>
  );
}
