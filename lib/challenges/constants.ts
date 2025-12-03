// ==========================================
// CHALLENGE CONSTANTS
// ==========================================

export const CHALLENGE_TIERS = [
  { size: 1000, cost: 24.99, label: '$1K', resetFee: 12.49, rewards: [3, 100, 500, 1000] },
  { size: 5000, cost: 99, label: '$5K', resetFee: 49, rewards: [20, 350, 2000, 5000] },
  { size: 10000, cost: 199, label: '$10K', resetFee: 99, rewards: [60, 700, 4500, 10000] },
  { size: 25000, cost: 399, label: '$25K', resetFee: 199, rewards: [100, 1400, 10000, 25000] },
  { size: 50000, cost: 699, label: '$50K', resetFee: 349, rewards: [150, 2800, 20000, 50000] },
  { size: 100000, cost: 999, label: '$100K', resetFee: 499, rewards: [250, 5000, 50000, 100000] },
] as const;

export type ChallengeTier = typeof CHALLENGE_TIERS[number];

export const LEVEL_REQUIREMENTS = [
  { level: 1, streakRequired: 5, name: 'Bronze', color: 'from-amber-700 to-amber-600' },
  { level: 2, streakRequired: 10, name: 'Silver', color: 'from-zinc-400 to-zinc-300' },
  { level: 3, streakRequired: 15, name: 'Gold', color: 'from-yellow-500 to-yellow-400' },
  { level: 4, streakRequired: 20, name: 'Diamond', color: 'from-cyan-400 to-blue-400' },
] as const;

export type LevelRequirement = typeof LEVEL_REQUIREMENTS[number];

export const CHALLENGE_DURATION_DAYS = 30;
export const MAX_ACTIVE_CHALLENGES = 5;

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export function getTierBySize(size: number): ChallengeTier | undefined {
  return CHALLENGE_TIERS.find(t => t.size === size);
}

export function getRewardForLevel(tierSize: number, level: number): number {
  const tier = getTierBySize(tierSize);
  if (!tier || level < 1 || level > 4) return 0;
  return tier.rewards[level - 1];
}

export function getLevelRequirement(level: number): LevelRequirement | undefined {
  return LEVEL_REQUIREMENTS.find(l => l.level === level);
}

export function getStreakRequiredForLevel(level: number): number {
  const req = getLevelRequirement(level);
  return req?.streakRequired || 5;
}

export function getLevelForStreak(streak: number): number {
  // Returns the level that would be completed at this streak
  for (let i = LEVEL_REQUIREMENTS.length - 1; i >= 0; i--) {
    if (streak >= LEVEL_REQUIREMENTS[i].streakRequired) {
      return LEVEL_REQUIREMENTS[i].level;
    }
  }
  return 0; // No level completed yet
}

export function getNextLevelTarget(currentStreak: number): { level: number; target: number } | null {
  for (const req of LEVEL_REQUIREMENTS) {
    if (currentStreak < req.streakRequired) {
      return { level: req.level, target: req.streakRequired };
    }
  }
  return null; // All levels completed
}

export function getTotalRewardsForTier(tierSize: number): number {
  const tier = getTierBySize(tierSize);
  if (!tier) return 0;
  return tier.rewards.reduce((sum, r) => sum + r, 0);
}
