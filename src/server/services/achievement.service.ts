import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TriggerConfig {
  taskCount?: number;
  streakDays?: number;
  milestoneCount?: number;
  goalCompletedCount?: number;
  completedEarly?: boolean;
  style?: string;
  level?: number;
}

export interface UnlockResult {
  unlocked: boolean;
  achievementKey: string;
  achievementName: string;
  xpGained: number;
}

export async function checkAchievementTriggers(
  triggerType: string,
  config: TriggerConfig,
  context: {
    completedTasks: number;
    currentStreak: number;
    milestonesCompleted: number;
    goalsCompleted: number;
    currentLevel: number;
    goalStyle?: string;
    completedEarly?: boolean;
  },
): Promise<UnlockResult | null> {
  const achievement = await prisma.achievement.findFirst({
    where: {
      triggerType,
      unlockedAt: null,
      levelRequired: { lte: context.currentLevel },
    },
    orderBy: { xpReward: 'desc' },
  });

  if (!achievement) return null;

  let shouldUnlock = false;

  switch (triggerType) {
    case 'event_count':
      if (config.taskCount && context.completedTasks >= config.taskCount) {
        shouldUnlock = true;
      }
      if (config.goalCompletedCount && context.goalsCompleted >= config.goalCompletedCount) {
        shouldUnlock = true;
      }
      break;
    case 'streak':
      if (config.streakDays && context.currentStreak >= config.streakDays) {
        shouldUnlock = true;
      }
      break;
    case 'milestone_reached':
      if (config.milestoneCount && context.milestonesCompleted >= config.milestoneCount) {
        shouldUnlock = true;
      }
      break;
    case 'combination': {
      const styleMatch = !config.style || config.style === context.goalStyle;
      const goalMatch = !config.goalCompletedCount || context.goalsCompleted >= config.goalCompletedCount;
      if (styleMatch && goalMatch) {
        shouldUnlock = true;
      }
      break;
    }
    case 'level_up':
      if (config.level && context.currentLevel >= config.level) {
        shouldUnlock = true;
      }
      break;
  }

  if (!shouldUnlock) return null;

  const unlocked = await prisma.achievement.update({
    where: { id: achievement.id },
    data: { unlockedAt: new Date() },
  });

  await prisma.userProgress.update({
    where: { id: 'default' },
    data: { totalXP: { increment: achievement.xpReward } },
  });

  return {
    unlocked: true,
    achievementKey: unlocked.key,
    achievementName: unlocked.name,
    xpGained: achievement.xpReward,
  };
}

export async function checkAllTriggers(context: {
  completedTasks: number;
  currentStreak: number;
  milestonesCompleted: number;
  goalsCompleted: number;
  currentLevel: number;
  goalStyle?: string;
  completedEarly?: boolean;
}): Promise<UnlockResult[]> {
  const results: UnlockResult[] = [];

  const triggerTypes = ['event_count', 'streak', 'milestone_reached', 'combination', 'level_up'];

  for (const triggerType of triggerTypes) {
    const config: TriggerConfig = {};
    const achievement = await prisma.achievement.findFirst({
      where: { triggerType, unlockedAt: null, levelRequired: { lte: context.currentLevel } },
    });

    if (!achievement) continue;

    const parsedConfig = JSON.parse(achievement.triggerConfig) as TriggerConfig;
    const result = await checkAchievementTriggers(triggerType, parsedConfig, context);
    if (result) results.push(result);
  }

  return results;
}

export function calculateLevelFromXP(totalXP: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXP / 100)));
}

export function getXPForNextLevel(currentLevel: number): number {
  return (currentLevel + 1) * (currentLevel + 1) * 100;
}
