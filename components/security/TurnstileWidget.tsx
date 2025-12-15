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
    turnstileLoadCallbacks?: Array<() => void>;
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
  const [isReady, setIsReady] = useState(false);
  const callbacksRef = useRef({ onSuccess, onError, onExpire });

  // Update callbacks ref when they change
  callbacksRef.current = { onSuccess, onError, onExpire };

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Ensure we're on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load the Turnstile script
  useEffect(() => {
    if (!isClient || !siteKey) return;

    // If turnstile is already loaded, mark as ready
    if (window.turnstile) {
      setIsReady(true);
      return;
    }

    // Initialize callbacks array if needed
    if (!window.turnstileLoadCallbacks) {
      window.turnstileLoadCallbacks = [];
    }

    // Add our callback
    const onLoad = () => setIsReady(true);
    window.turnstileLoadCallbacks.push(onLoad);

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');

    if (!existingScript) {
      // Set up the global callback
      window.onTurnstileLoad = () => {
        window.turnstileLoadCallbacks?.forEach(cb => cb());
      };

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
      script.async = true;
      document.head.appendChild(script);
    }

    return () => {
      // Remove our callback on cleanup
      if (window.turnstileLoadCallbacks) {
        const index = window.turnstileLoadCallbacks.indexOf(onLoad);
        if (index > -1) {
          window.turnstileLoadCallbacks.splice(index, 1);
        }
      }
    };
  }, [isClient, siteKey]);

  // Render the widget when ready
  useEffect(() => {
    if (!isReady || !containerRef.current || !window.turnstile || !siteKey) return;

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
    containerRef.current.innerHTML = '';

    // Render new widget
    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => callbacksRef.current.onSuccess(token),
        'error-callback': () => callbacksRef.current.onError?.(),
        'expired-callback': () => callbacksRef.current.onExpire?.(),
        theme,
        size,
      });
    } catch (e) {
      console.error('[Turnstile] Failed to render widget:', e);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Ignore removal errors
        }
        widgetIdRef.current = null;
      }
    };
  }, [isReady, siteKey, theme, size]);

  // Show placeholder during SSR
  if (!isClient) {
    return <div className={`h-[65px] ${className}`} />;
  }

  // Show warning if no site key
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
      className={`min-h-[65px] flex items-center justify-center ${className}`}
    >
      {!isReady && (
        <div className="text-zinc-500 text-sm">Loading CAPTCHA...</div>
      )}
    </div>
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
