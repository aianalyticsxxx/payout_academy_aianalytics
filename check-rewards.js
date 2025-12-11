const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check challenge rewards
  const rewards = await prisma.challengeReward.findMany({
    where: {
      challenge: {
        difficulty: 'beginner',
        status: 'active',
      },
    },
    include: {
      challenge: {
        select: { tier: true, totalRewardsEarned: true },
      },
    },
  });

  console.log('Rewards found:', rewards.length);
  rewards.forEach((r) => {
    console.log(
      `  Level ${r.level}: €${r.amount} - Status: ${r.status} - Tier: €${r.challenge.tier} - Challenge totalRewardsEarned: ${r.challenge.totalRewardsEarned}`
    );
  });

  // Check total earned in challenges
  const challenges = await prisma.challenge.findMany({
    where: {
      difficulty: 'beginner',
      status: 'active',
    },
    select: {
      id: true,
      tier: true,
      totalRewardsEarned: true,
      currentStreak: true,
      level1Completed: true,
      level2Completed: true,
      level3Completed: true,
    },
  });

  console.log('\nChallenges:');
  challenges.forEach((c) => {
    console.log(
      `  ${c.id.slice(-8)}: €${c.tier} - Streak: ${c.currentStreak} - totalRewardsEarned: €${c.totalRewardsEarned} - L1:${c.level1Completed} L2:${c.level2Completed} L3:${c.level3Completed}`
    );
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
