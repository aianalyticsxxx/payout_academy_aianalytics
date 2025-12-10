// ==========================================
// CHALLENGE CONSTANTS
// ==========================================

// Beginner difficulty rewards
export const BEGINNER_CHALLENGE_TIERS = [
  { size: 1000, cost: 20, label: '€1K', resetFee: 10, rewards: [3, 100, 500, 1000] },
  { size: 5000, cost: 99, label: '€5K', resetFee: 49, rewards: [20, 500, 2000, 5000] },
  { size: 10000, cost: 199, label: '€10K', resetFee: 99, rewards: [60, 1000, 4500, 10000] },
  { size: 25000, cost: 399, label: '€25K', resetFee: 199, rewards: [100, 2000, 10000, 25000] },
  { size: 50000, cost: 699, label: '€50K', resetFee: 349, rewards: [150, 3500, 20000, 50000] },
  { size: 100000, cost: 999, label: '€100K', resetFee: 499, rewards: [250, 5000, 30000, 100000] },
] as const;

// Pro difficulty rewards (higher level 2 and level 3 rewards)
export const PRO_CHALLENGE_TIERS = [
  { size: 1000, cost: 20, label: '€1K', resetFee: 10, rewards: [3, 120, 550, 1000] },
  { size: 5000, cost: 99, label: '€5K', resetFee: 49, rewards: [20, 600, 2200, 5000] },
  { size: 10000, cost: 199, label: '€10K', resetFee: 99, rewards: [60, 1200, 4950, 10000] },
  { size: 25000, cost: 399, label: '€25K', resetFee: 199, rewards: [100, 2400, 11000, 25000] },
  { size: 50000, cost: 699, label: '€50K', resetFee: 349, rewards: [150, 4200, 22000, 50000] },
  { size: 100000, cost: 999, label: '€100K', resetFee: 499, rewards: [250, 6000, 33000, 100000] },
] as const;

export const CHALLENGE_TIERS = BEGINNER_CHALLENGE_TIERS; // Default to beginner for backward compatibility

export type ChallengeTier = typeof BEGINNER_CHALLENGE_TIERS[number] | typeof PRO_CHALLENGE_TIERS[number];

// BEGINNER DIFFICULTY - Original requirements with min odds 1.5
export const BEGINNER_LEVEL_REQUIREMENTS = [
  { level: 1, streakRequired: 3, name: 'Bronze', color: 'from-amber-700 to-amber-600' },
  { level: 2, streakRequired: 6, name: 'Silver', color: 'from-zinc-400 to-zinc-300' },
  { level: 3, streakRequired: 10, name: 'Gold', color: 'from-yellow-500 to-yellow-400' },
  { level: 4, streakRequired: 15, name: 'Diamond', color: 'from-cyan-400 to-blue-400' },
] as const;

// PRO DIFFICULTY - Harder requirements with min odds 2.0
export const PRO_LEVEL_REQUIREMENTS = [
  { level: 1, streakRequired: 2, name: 'Bronze', color: 'from-amber-700 to-amber-600' },
  { level: 2, streakRequired: 4, name: 'Silver', color: 'from-zinc-400 to-zinc-300' },
  { level: 3, streakRequired: 6, name: 'Gold', color: 'from-yellow-500 to-yellow-400' },
  { level: 4, streakRequired: 9, name: 'Diamond', color: 'from-cyan-400 to-blue-400' },
] as const;

export const LEVEL_REQUIREMENTS = BEGINNER_LEVEL_REQUIREMENTS; // Keep for backward compatibility

export type LevelRequirement = typeof BEGINNER_LEVEL_REQUIREMENTS[number] | typeof PRO_LEVEL_REQUIREMENTS[number];

export const DIFFICULTY_CONFIG = {
  beginner: {
    name: 'Beginner',
    minOdds: 1.5,
    levels: BEGINNER_LEVEL_REQUIREMENTS,
    description: 'Perfect for getting started',
    icon: '🎯',
  },
  pro: {
    name: 'Pro',
    minOdds: 2.0,
    levels: PRO_LEVEL_REQUIREMENTS,
    description: 'High risk, high intensity',
    icon: '⚡',
  },
} as const;

export type DifficultyType = keyof typeof DIFFICULTY_CONFIG;

export const CHALLENGE_DURATION_DAYS = 30;
export const MAX_ACTIVE_CHALLENGES = 5;

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export function getTiersByDifficulty(difficulty: DifficultyType = 'beginner') {
  return difficulty === 'pro' ? PRO_CHALLENGE_TIERS : BEGINNER_CHALLENGE_TIERS;
}

export function getTierBySize(size: number, difficulty: DifficultyType = 'beginner'): ChallengeTier | undefined {
  const tiers = getTiersByDifficulty(difficulty);
  return tiers.find(t => t.size === size);
}

export function getRewardForLevel(tierSize: number, level: number, difficulty: DifficultyType = 'beginner'): number {
  const tier = getTierBySize(tierSize, difficulty);
  if (!tier || level < 1 || level > 4) return 0;
  return tier.rewards[level - 1];
}

export function getLevelRequirements(difficulty: DifficultyType = 'beginner') {
  return DIFFICULTY_CONFIG[difficulty].levels;
}

export function getLevelRequirement(level: number, difficulty: DifficultyType = 'beginner'): LevelRequirement | undefined {
  const requirements = getLevelRequirements(difficulty);
  return requirements.find(l => l.level === level);
}

export function getStreakRequiredForLevel(level: number, difficulty: DifficultyType = 'beginner'): number {
  const req = getLevelRequirement(level, difficulty);
  return req?.streakRequired || 5;
}

export function getLevelForStreak(streak: number, difficulty: DifficultyType = 'beginner'): number {
  // Returns the level that would be completed at this streak
  const requirements = getLevelRequirements(difficulty);
  for (let i = requirements.length - 1; i >= 0; i--) {
    if (streak >= requirements[i].streakRequired) {
      return requirements[i].level;
    }
  }
  return 0; // No level completed yet
}

export function getNextLevelTarget(currentStreak: number, difficulty: DifficultyType = 'beginner'): { level: number; target: number } | null {
  const requirements = getLevelRequirements(difficulty);
  for (const req of requirements) {
    if (currentStreak < req.streakRequired) {
      return { level: req.level, target: req.streakRequired };
    }
  }
  return null; // All levels completed
}

export function getTotalRewardsForTier(tierSize: number, difficulty: DifficultyType = 'beginner'): number {
  const tier = getTierBySize(tierSize, difficulty);
  if (!tier) return 0;
  return tier.rewards.reduce((sum, r) => sum + r, 0);
}
