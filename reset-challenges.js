const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = 'cmizwerub0000dma22whwwqxf'; // kiro@abv.bg
  
  console.log('Deleting all challenge rewards...');
  await prisma.challengeReward.deleteMany({});
  
  console.log('Deleting all challenge bets...');
  await prisma.challengeBet.deleteMany({});
  
  console.log('Deleting all challenges...');
  await prisma.challenge.deleteMany({});
  
  console.log('Deleting all bets...');
  await prisma.bet.deleteMany({});
  
  console.log('Deleting all parlays...');
  await prisma.parlay.deleteMany({});
  
  console.log('Resetting leaderboard...');
  await prisma.globalLeaderboard.deleteMany({});
  
  // Create Pro 5W challenge (tier 5000)
  const pro5w = await prisma.challenge.create({
    data: {
      userId,
      tier: 5000,
      difficulty: 'pro',
      minOdds: 2.0,
      cost: 250,
      resetFee: 125,
      status: 'active',
      currentStreak: 0,
      currentLevel: 1,
      expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
    }
  });
  console.log('Created Pro 5W challenge:', pro5w.id);
  
  // Create Beginner 12W challenge (tier 12000 - closest to 12W)
  // Looking at typical tiers: 1000, 5000, 10000, 25000, 50000, 100000
  // 12W might mean $12,000 tier or a custom one
  const beginner12w = await prisma.challenge.create({
    data: {
      userId,
      tier: 10000, // Using 10000 as closest standard tier
      difficulty: 'beginner',
      minOdds: 1.5,
      cost: 500,
      resetFee: 250,
      status: 'active',
      currentStreak: 0,
      currentLevel: 1,
      expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
    }
  });
  console.log('Created Beginner 12W challenge:', beginner12w.id);
  
  console.log('\nDone! Created 2 challenges.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
