'use client';

// ==========================================
// CLOUDFLARE TURNSTILE CAPTCHA WIDGET
// ==========================================
// Privacy-focused CAPTCHA alternative
// Docs: https://developers.cloudflare.com/turnstile/

import { useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileOptions) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileOptions {
  sitekey: string;
  callback?: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  tabindex?: number;
}

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  className?: string;
}

export function TurnstileWidget({
  onSuccess,
  onError,
  onExpire,
  theme = 'auto',
  size = 'normal',
  className = '',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const scriptLoadedRef = useRef(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || !siteKey) return;

    // Remove existing widget if any
    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current);
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onSuccess,
      'error-callback': onError,
      'expired-callback': onExpire,
      theme,
      size,
    });
  }, [siteKey, onSuccess, onError, onExpire, theme, size]);

  useEffect(() => {
    // Skip if no site key configured
    if (!siteKey) {
      console.warn('[Turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY not configured');
      // In development, auto-pass with test token
      if (process.env.NODE_ENV === 'development') {
        onSuccess('test-token');
      }
      return;
    }

    // Load Turnstile script if not already loaded
    if (!scriptLoadedRef.current && !document.querySelector('script[src*="turnstile"]')) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
      script.async = true;
      script.defer = true;

      window.onTurnstileLoad = () => {
        scriptLoadedRef.current = true;
        renderWidget();
      };

      document.head.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [siteKey, renderWidget, onSuccess]);

  // If no site key, show nothing (or placeholder in dev)
  if (!siteKey) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className={`p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-500 ${className}`}>
          CAPTCHA disabled (dev mode)
        </div>
      );
    }
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={className}
    />
  );
}

// ==========================================
// HOOK FOR CAPTCHA STATE
// ==========================================

import { useState } from 'react';

export function useTurnstile() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [expired, setExpired] = useState(false);

  const handleSuccess = useCallback((newToken: string) => {
    setToken(newToken);
    setError(false);
    setExpired(false);
  }, []);

  const handleError = useCallback(() => {
    setToken(null);
    setError(true);
  }, []);

  const handleExpire = useCallback(() => {
    setToken(null);
    setExpired(true);
  }, []);

  const reset = useCallback(() => {
    setToken(null);
    setError(false);
    setExpired(false);
  }, []);

  return {
    token,
    error,
    expired,
    isValid: !!token && !error && !expired,
    handleSuccess,
    handleError,
    handleExpire,
    reset,
  };
}

export default TurnstileWidget;
