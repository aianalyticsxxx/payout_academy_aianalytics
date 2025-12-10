// ==========================================
// INPUT COMPONENT
// ==========================================

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({
  label,
  error,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-dark border ${
          error ? 'border-red-500' : 'border-zinc-800'
        } rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
