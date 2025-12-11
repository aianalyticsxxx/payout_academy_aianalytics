// ==========================================
// SIMULATE 30 DAYS OF REVENUE DATA
// ==========================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tiers = [1000, 5000, 10000, 25000, 50000, 100000];
const difficulties = ['beginner', 'pro'];

// Cost multipliers for each tier (approximate cost as % of tier value)
const tierCosts: Record<number, number> = {
  1000: 50,      // $50 for 1K challenge
  5000: 150,     // $150 for 5K challenge
  10000: 250,    // $250 for 10K challenge
  25000: 500,    // $500 for 25K challenge
  50000: 800,    // $800 for 50K challenge
  100000: 1500,  // $1500 for 100K challenge
};

async function simulateRevenue() {
  console.log('Starting revenue simulation...\n');

  // Get a user to assign challenges to (or create test users)
  let users = await prisma.user.findMany({ take: 5 });

  if (users.length === 0) {
    console.log('No users found. Creating test users...');
    // Create some test users
    for (let i = 1; i <= 5; i++) {
      await prisma.user.create({
        data: {
          email: `testuser${i}@example.com`,
          username: `TestUser${i}`,
          role: 'user',
        },
      });
    }
    users = await prisma.user.findMany({ take: 5 });
  }

  console.log(`Found ${users.length} users\n`);

  // Generate purchases for last 30 days
  const purchases: Array<{
    date: Date;
    tier: number;
    difficulty: string;
    cost: number;
    userId: string;
  }> = [];

  for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);

    // Random number of purchases per day (0-5, weighted towards 1-3)
    const numPurchases = Math.floor(Math.random() * 4) + (Math.random() > 0.3 ? 1 : 0);

    for (let i = 0; i < numPurchases; i++) {
      // Weight towards lower tiers
      const tierIndex = Math.floor(Math.random() * Math.random() * tiers.length);
      const tier = tiers[tierIndex];

      // 70% beginner, 30% pro
      const difficulty = Math.random() > 0.3 ? 'beginner' : 'pro';

      // Get cost with some variation (+/- 10%)
      const baseCost = tierCosts[tier];
      const variation = baseCost * 0.1 * (Math.random() - 0.5) * 2;
      const cost = Math.round(baseCost + variation);

      const user = users[Math.floor(Math.random() * users.length)];

      purchases.push({
        date: new Date(date),
        tier,
        difficulty,
        cost,
        userId: user.id,
      });
    }
  }

  console.log(`Generated ${purchases.length} purchases\n`);

  // Create challenges in database
  let created = 0;
  for (const purchase of purchases) {
    try {
      // Calculate expiry (30 days from purchase)
      const expiresAt = new Date(purchase.date);
      expiresAt.setDate(expiresAt.getDate() + 30);

      await prisma.challenge.create({
        data: {
          userId: purchase.userId,
          tier: purchase.tier,
          difficulty: purchase.difficulty,
          cost: purchase.cost,
          minOdds: purchase.difficulty === 'beginner' ? 1.5 : 2.0,
          resetFee: Math.round(purchase.cost * 0.5), // 50% reset fee
          status: 'active',
          currentStreak: 0,
          purchasedAt: purchase.date,
          expiresAt: expiresAt,
          level1Completed: false,
          level2Completed: false,
          level3Completed: false,
          level4Completed: false,
        },
      });
      created++;
    } catch (error) {
      console.error('Error creating challenge:', error);
    }
  }

  console.log(`Created ${created} challenges\n`);

  // Summary by day
  console.log('Daily breakdown:');
  console.log('================');

  const byDay = new Map<string, { count: number; revenue: number }>();
  for (const p of purchases) {
    const dateKey = p.date.toISOString().split('T')[0];
    const existing = byDay.get(dateKey) || { count: 0, revenue: 0 };
    existing.count++;
    existing.revenue += p.cost;
    byDay.set(dateKey, existing);
  }

  const sortedDays = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));
  for (const [date, data] of sortedDays) {
    console.log(`${date}: ${data.count} sales, $${data.revenue.toLocaleString()}`);
  }

  // Summary by tier
  console.log('\nTier breakdown:');
  console.log('===============');

  const byTier = new Map<number, { count: number; revenue: number; beginner: number; pro: number }>();
  for (const p of purchases) {
    const existing = byTier.get(p.tier) || { count: 0, revenue: 0, beginner: 0, pro: 0 };
    existing.count++;
    existing.revenue += p.cost;
    if (p.difficulty === 'beginner') existing.beginner++;
    else existing.pro++;
    byTier.set(p.tier, existing);
  }

  for (const tier of tiers) {
    const data = byTier.get(tier);
    if (data) {
      console.log(`€${tier / 1000}K: ${data.count} sales ($${data.revenue.toLocaleString()}) - Beginner: ${data.beginner}, Pro: ${data.pro}`);
    }
  }

  // Total
  const totalRevenue = purchases.reduce((sum, p) => sum + p.cost, 0);
  console.log(`\nTotal: ${purchases.length} sales, $${totalRevenue.toLocaleString()}`);

  await prisma.$disconnect();
}

simulateRevenue().catch(console.error);
