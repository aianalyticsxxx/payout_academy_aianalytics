// ==========================================
// MIDDLEWARE - SECURITY & ROUTE PROTECTION
// ==========================================

import { withAuth } from 'next-auth/middleware';
import { NextResponse, NextRequest } from 'next/server';
import type { NextRequestWithAuth } from 'next-auth/middleware';

// ==========================================
// SECURITY HEADERS
// ==========================================

const securityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  // Content Security Policy - protects against XSS, clickjacking, code injection
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com https://api.groq.com https://api.perplexity.ai https://api.the-odds-api.com",
    "frame-src 'self' https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; '),
};

// ==========================================
// HTTPS ENFORCEMENT
// ==========================================

function enforceHttps(req: NextRequest): NextResponse | null {
  // Skip in development
  if (process.env.NODE_ENV === 'development') return null;

  // Check if already HTTPS
  const proto = req.headers.get('x-forwarded-proto');
  const host = req.headers.get('host');

  if (proto === 'http' && host) {
    // Redirect to HTTPS
    const httpsUrl = `https://${host}${req.nextUrl.pathname}${req.nextUrl.search}`;
    return NextResponse.redirect(httpsUrl, 301);
  }

  return null;
}

// ==========================================
// RATE LIMIT CHECK (for critical paths)
// ==========================================

async function checkApiRateLimit(
  req: NextRequest,
  pathname: string
): Promise<NextResponse | null> {
  // Only apply to API routes
  if (!pathname.startsWith('/api/')) return null;

  // Skip rate limiting for webhooks (they have their own verification)
  if (
    pathname.includes('/webhook') ||
    pathname.includes('/cron')
  ) return null;

  // Import rate limit dynamically to avoid edge runtime issues
  try {
    const { checkRateLimit, getIdentifier, getTierForRoute } = await import(
      './lib/security/rate-limit'
    );

    const tier = getTierForRoute(pathname);
    const identifier = getIdentifier(req);
    const result = await checkRateLimit(identifier, tier);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: Math.ceil((result.reset - Date.now()) / 1000) },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.reset.toString(),
          },
        }
      );
    }
  } catch (error) {
    // If rate limiting fails, allow the request (fail open for availability)
    console.error('[Middleware] Rate limit check failed:', error);
  }

  return null;
}

// ==========================================
// CSRF PROTECTION
// ==========================================

function checkCsrf(req: NextRequest, pathname: string): NextResponse | null {
  // Only check state-changing methods on API routes
  const method = req.method;
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return null;
  if (!pathname.startsWith('/api/')) return null;

  // Skip CSRF for auth routes (NextAuth handles its own CSRF)
  if (pathname.startsWith('/api/auth/')) return null;

  // Skip for webhook endpoints (they use signature verification)
  if (pathname.includes('/webhook')) return null;

  // Skip for cron endpoints (they use Bearer token)
  if (pathname.includes('/cron')) return null;

  // Check Origin header matches
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');

  if (!origin) {
    // No origin = same-origin request (allowed) or server-to-server
    return null;
  }

  // Verify origin matches host
  try {
    const originUrl = new URL(origin);
    const expectedHosts = [
      host,
      'localhost:3000',
      'localhost:3001',
      process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).host : null,
    ].filter(Boolean);

    if (!expectedHosts.includes(originUrl.host)) {
      console.warn(`[CSRF] Origin mismatch: ${origin} vs ${host}`);
      return NextResponse.json(
        { error: 'CSRF validation failed' },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid origin header' },
      { status: 403 }
    );
  }

  return null;
}

// ==========================================
// MAIN MIDDLEWARE
// ==========================================

export default withAuth(
  async function middleware(req: NextRequestWithAuth) {
    const pathname = req.nextUrl.pathname;

    // 1. Enforce HTTPS in production
    const httpsRedirect = enforceHttps(req);
    if (httpsRedirect) return httpsRedirect;

    // 2. CSRF protection for state-changing API requests
    const csrfResponse = checkCsrf(req, pathname);
    if (csrfResponse) return csrfResponse;

    // 3. Check rate limits for API routes
    const rateLimitResponse = await checkApiRateLimit(req, pathname);
    if (rateLimitResponse) return rateLimitResponse;

    // 4. Get response and add security headers
    const response = NextResponse.next();

    // Add security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // 5. Route-specific checks
    const token = req.nextauth.token;

    // Protect /crm routes - require ADMIN or SUPER_ADMIN role
    if (pathname.startsWith('/crm')) {
      // Basic auth check (detailed role check in API routes)
      if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
      }

      // Check role from token (primary check in API routes from DB)
      const role = token.role as string;
      if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return response;
  },
  {
    callbacks: {
      // Allow public routes, require auth for protected routes
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Public routes - always allow
        if (
          pathname === '/' ||
          pathname.startsWith('/login') ||
          pathname.startsWith('/register') ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/sports') ||
          pathname.startsWith('/api/ai/predictions') ||
          pathname.startsWith('/_next') ||
          pathname.startsWith('/favicon') ||
          pathname.includes('.') // Static files
        ) {
          return true;
        }

        // Protected routes - require token
        return !!token;
      },
    },
  }
);

// ==========================================
// MATCHER CONFIG
// ==========================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
