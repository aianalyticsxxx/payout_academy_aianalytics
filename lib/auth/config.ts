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
    maxAge: 30 * 24 * 60 * 60, // 30 days
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
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.avatar = (user as any).avatar;
        token.tier = (user as any).tier;
        token.role = (user as any).role || 'USER';
      }

      // Update token when session is updated
      if (trigger === 'update' && session) {
        token.username = session.username;
        token.avatar = session.avatar;
        token.role = session.role;
      }

      // Always fetch latest role from database to ensure admin access works
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
          }
        } catch (error) {
          // SECURITY: Never log token contents on error
          console.error('[Auth] JWT callback error for user:', token.id);
        }
      }

      return token;
    },

    async session({ session, token }) {
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
