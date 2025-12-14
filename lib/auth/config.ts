// ==========================================
// NEXTAUTH CONFIGURATION
// ==========================================

import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import {
  isAccountLocked,
  recordFailedLogin,
  resetFailedLogins,
  formatLockoutMessage,
} from '@/lib/security/account-lockout';

// ==========================================
// TOKEN ROTATION CONFIGURATION
// ==========================================
// SECURITY: Refresh tokens periodically to limit exposure from stolen tokens
const TOKEN_REFRESH_INTERVAL_MS = 15 * 60 * 1000; // Refresh every 15 minutes
const ACCESS_TOKEN_MAX_AGE_MS = 60 * 60 * 1000; // Access token valid for 1 hour max

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  
  providers: [
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    
    // Email/Password
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const email = credentials.email.toLowerCase();

        // Check if account is locked
        const lockStatus = await isAccountLocked(email);
        if (lockStatus.locked) {
          throw new Error(formatLockoutMessage(lockStatus.remainingMs || 0));
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.hashedPassword) {
          // Record failed attempt (even for non-existent users to prevent enumeration timing)
          await recordFailedLogin(email);
          throw new Error('Invalid credentials');
        }

        // Check if user is banned
        if (user.isBanned) {
          throw new Error('Account suspended. Contact support.');
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isValid) {
          // Record failed login attempt
          const result = await recordFailedLogin(email);
          if (result.locked) {
            throw new Error(formatLockoutMessage(15 * 60 * 1000)); // 15 minutes
          }
          throw new Error(`Invalid credentials. ${result.remainingAttempts} attempts remaining.`);
        }

        // Reset failed login counter on successful login
        await resetFailedLogins(email);

        // Update last login info
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          username: user.username,
          avatar: user.avatar,
          tier: user.tier,
          role: user.role,
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    // SECURITY: Reduced from 30 days to 7 days for better security
    // Financial applications should have shorter session lifetimes
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'strict', // SECURITY: Strict SameSite prevents CSRF
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  pages: {
    signIn: '/login',
    newUser: '/register',
    error: '/login',
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const now = Date.now();

      // Initial sign in - set up token with rotation metadata
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.avatar = (user as any).avatar;
        token.tier = (user as any).tier;
        token.role = (user as any).role || 'USER';
        // SECURITY: Token rotation metadata
        token.issuedAt = now;
        token.refreshedAt = now;
        token.tokenVersion = (user as any).tokenVersion || 0;
      }

      // Update token when session is updated
      if (trigger === 'update' && session) {
        token.username = session.username;
        token.avatar = session.avatar;
        token.role = session.role;
      }

      // SECURITY: Check if token needs rotation (every 15 minutes)
      const refreshedAt = (token.refreshedAt as number) || now;
      const shouldRefresh = now - refreshedAt > TOKEN_REFRESH_INTERVAL_MS;

      // SECURITY: Check if token is too old (hard limit of 1 hour between DB checks)
      const issuedAt = (token.issuedAt as number) || now;
      const tokenTooOld = now - issuedAt > ACCESS_TOKEN_MAX_AGE_MS;

      // Fetch latest data from database if needed
      if (token.id && (shouldRefresh || tokenTooOld)) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              role: true,
              tokenVersion: true,
              isBanned: true,
            },
          });

          if (!dbUser) {
            // SECURITY: User deleted - invalidate token
            console.warn('[Auth] User not found, invalidating token:', token.id);
            return { ...token, error: 'UserNotFound' };
          }

          // SECURITY: Check if user is banned
          if (dbUser.isBanned) {
            console.warn('[Auth] Banned user attempted access:', token.id);
            return { ...token, error: 'UserBanned' };
          }

          // SECURITY: Token version mismatch = session invalidated (e.g., password change)
          const currentTokenVersion = (token.tokenVersion as number) || 0;
          if (dbUser.tokenVersion !== null && dbUser.tokenVersion !== currentTokenVersion) {
            console.warn('[Auth] Token version mismatch, invalidating session:', token.id);
            return { ...token, error: 'TokenVersionMismatch' };
          }

          // Update token with fresh data
          token.role = dbUser.role;
          token.refreshedAt = now;

          // Reset issuedAt on successful refresh to extend validity
          if (shouldRefresh) {
            token.issuedAt = now;
          }
        } catch (error) {
          // SECURITY: Never log token contents on error
          console.error('[Auth] JWT callback error for user:', token.id);
          // On DB error, allow token to continue but don't update refreshedAt
          // This ensures we retry on next request
        }
      }

      return token;
    },

    async session({ session, token }) {
      // SECURITY: Check for token errors that should invalidate the session
      if (token.error) {
        // Return session with error flag - client should handle logout
        return {
          ...session,
          error: token.error as string,
          user: undefined,
        };
      }

      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).avatar = token.avatar;
        (session.user as any).tier = token.tier;
        (session.user as any).role = token.role || 'USER';
      }
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      // Initialize user's leaderboard entry
      await prisma.globalLeaderboard.create({
        data: {
          userId: user.id,
        },
      });
    },
  },

  // SECURITY: Never enable debug in production - tokens would be logged
  debug: false,
};
