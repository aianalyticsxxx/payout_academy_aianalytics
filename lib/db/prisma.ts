// ==========================================
// PRISMA DATABASE CLIENT
// ==========================================

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// PERFORMANCE: Configure Prisma with connection pooling settings
// connection_limit is handled by Supabase pgbouncer, but we set pool timeout
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  // Datasource configuration is handled via DATABASE_URL
  // For Supabase with pgbouncer, add ?pgbouncer=true&connection_limit=10 to URL
});

// PERFORMANCE: Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
