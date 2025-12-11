const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find a beginner challenge
  const challenge = await prisma.challenge.findFirst({
    where: {
      difficulty: 'beginner',
      status: 'active',
    },
    orderBy: { purchasedAt: 'desc' },
  });

  if (!challenge) {
    console.log('No beginner challenge found');
    return;
  }

  console.log('Found challenge:', challenge.id, 'tier:', challenge.tier);

  // Reset the challenge to 10 wins with levels 1-3 completed
  await prisma.challenge.update({
    where: { id: challenge.id },
    data: {
      currentStreak: 10,
      currentLevel: 4,
      level1Completed: true,
      level2Completed: true,
      level3Completed: true,
      level4Completed: false,
      totalRewardsEarned: 0, // Reset to 0 so claim can add it
    },
  });

  // Delete existing rewards for this challenge
  await prisma.challengeReward.deleteMany({
    where: { challengeId: challenge.id },
  });

  // Get tier rewards - for €10K beginner: [60, 1000, 4500, 10000]
  const rewards = challenge.tier === 10000
    ? [60, 1000, 4500]
    : challenge.tier === 5000
    ? [30, 500, 2250]
    : [20, 100, 500]; // 1000 tier

  // Create pending rewards for levels 1, 2, 3
  for (let i = 0; i < rewards.length; i++) {
    await prisma.challengeReward.create({
      data: {
        challengeId: challenge.id,
        level: i + 1,
        amount: rewards[i],
        status: 'pending',
      },
    });
  }

  const total = rewards.reduce((a, b) => a + b, 0);
  console.log(`Created ${rewards.length} pending rewards totaling €${total}`);
  console.log('Challenge updated with 10 wins and levels 1-3 completed');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
