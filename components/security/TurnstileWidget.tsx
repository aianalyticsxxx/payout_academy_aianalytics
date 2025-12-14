'use client';

// ==========================================
// CLOUDFLARE TURNSTILE CAPTCHA WIDGET
// ==========================================
// Privacy-focused CAPTCHA alternative
// Docs: https://developers.cloudflare.com/turnstile/

import { useEffect, useRef, useState, useCallback } from 'react';

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
  const [isClient, setIsClient] = useState(false);
  const callbacksRef = useRef({ onSuccess, onError, onExpire });

  // Update callbacks ref when they change
  callbacksRef.current = { onSuccess, onError, onExpire };

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Ensure we're on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    // Skip if no site key configured
    if (!siteKey) {
      console.warn('[Turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY not configured');
      return;
    }

    let mounted = true;

    const renderWidget = () => {
      if (!mounted || !containerRef.current || !window.turnstile) return;

      // Remove existing widget if any
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Ignore removal errors
        }
        widgetIdRef.current = null;
      }

      // Clear container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => callbacksRef.current.onSuccess(token),
        'error-callback': () => callbacksRef.current.onError?.(),
        'expired-callback': () => callbacksRef.current.onExpire?.(),
        theme,
        size,
      });
    };

    // Load Turnstile script if not already loaded
    const existingScript = document.querySelector('script[src*="turnstile"]');

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
      script.async = true;
      script.defer = true;

      window.onTurnstileLoad = () => {
        renderWidget();
      };

      document.head.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    } else {
      // Script exists but not loaded yet, wait for it
      window.onTurnstileLoad = () => {
        renderWidget();
      };
    }

    return () => {
      mounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Ignore removal errors
        }
      }
    };
  }, [isClient, siteKey, theme, size]);

  // Show placeholder during SSR or if no site key
  if (!isClient) {
    return <div className={`h-[65px] ${className}`} />;
  }

  if (!siteKey) {
    return (
      <div className={`p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-500 ${className}`}>
        CAPTCHA not configured
      </div>
    );
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
