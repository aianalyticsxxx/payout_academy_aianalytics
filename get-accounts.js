const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get beginner challenges with user info
  const beginners = await prisma.challenge.findMany({
    where: { difficulty: 'beginner', status: 'active' },
    include: { user: { select: { email: true, username: true } } },
    take: 3
  });

  console.log('\n=== BEGINNER ACCOUNTS ===');
  beginners.forEach(function(c, i) {
    console.log((i+1) + '. Email: ' + c.user.email);
    console.log('   Username: ' + (c.user.username || 'N/A'));
    console.log('   Tier: €' + c.tier.toLocaleString());
    console.log('   Streak: ' + c.currentStreak);
    console.log('');
  });

  // Get pro challenges with user info
  const pros = await prisma.challenge.findMany({
    where: { difficulty: 'pro', status: 'active' },
    include: { user: { select: { email: true, username: true } } },
    take: 3
  });

  console.log('=== PRO ACCOUNTS ===');
  pros.forEach(function(c, i) {
    console.log((i+1) + '. Email: ' + c.user.email);
    console.log('   Username: ' + (c.user.username || 'N/A'));
    console.log('   Tier: €' + c.tier.toLocaleString());
    console.log('   Streak: ' + c.currentStreak);
    console.log('');
  });

  await prisma.$disconnect();
}

main();
