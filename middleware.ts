// ==========================================
// MIDDLEWARE - ROUTE PROTECTION
// ==========================================

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Protect /crm routes - require ADMIN or SUPER_ADMIN role
    // Note: Role check is done in API routes since JWT may have stale role
    // This just ensures user is authenticated
    if (path.startsWith('/crm')) {
      // User must be logged in (token exists from authorized callback)
      // API routes will verify admin role from database
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // This ensures the middleware only runs for authenticated users
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/crm/:path*', // Protect all CRM routes
    '/dashboard', // Protect dashboard page
    '/dashboard/:path*', // Protect dashboard sub-routes
  ],
};
