import { z } from 'zod';
import { createCloudRouter, publicCloudProcedure } from '~/server/trpc/trpc.server.cloud';
import { checkAllTriggers, calculateLevelFromXP } from '~/server/services/achievement.service';

export const taskRouter = createCloudRouter({
  listByGoal: publicCloudProcedure
    .input(z.object({ goalId: z.string() }))
    .query(async ({ input }) => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      return prisma.dailyTask.findMany({
        where: { goalId: input.goalId },
        orderBy: { scheduledDate: 'asc' },
        include: { milestone: true },
      });
    }),

  listToday: publicCloudProcedure.query(async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return prisma.dailyTask.findMany({
      where: { scheduledDate: { gte: today, lt: tomorrow } },
      orderBy: { scheduledDate: 'asc' },
      include: { goal: { select: { id: true, title: true, style: true } }, milestone: true },
    });
  }),

  listByDate: publicCloudProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const targetDate = new Date(input.date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);

      return prisma.dailyTask.findMany({
        where: { scheduledDate: { gte: targetDate, lt: nextDate } },
        include: { goal: { select: { id: true, title: true, style: true } } },
      });
    }),

  complete: publicCloudProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      const task = await prisma.dailyTask.update({
        where: { id: input.id },
        data: { status: 'completed', completedAt: new Date() },
        include: { goal: true },
      });

      const xpReward = task.xpReward;

      const progress = await prisma.userProgress.findFirst({ where: { id: 'default' } });
      const newXP = (progress?.totalXP ?? 0) + xpReward;
      const newLevel = calculateLevelFromXP(newXP);

      await prisma.userProgress.upsert({
        where: { id: 'default' },
        update: { totalXP: newXP, level: newLevel },
        create: { id: 'default', totalXP: newXP, level: newLevel },
      });

      const allTasks = await prisma.dailyTask.findMany({ where: { goalId: task.goalId } });
      const completedCount = allTasks.filter((t) => t.status === 'completed').length;
      const progressPercent = allTasks.length > 0 ? (completedCount / allTasks.length) * 100 : 0;

      await prisma.goal.update({
        where: { id: task.goalId },
        data: { totalProgress: progressPercent },
      });

      const completedTasks = await prisma.dailyTask.count({ where: { status: 'completed' } });
      const milestonesCompleted = await prisma.milestone.count({ where: { progress: { gte: 100 } } });
      const goalsCompleted = await prisma.goal.count({ where: { status: 'completed' } });

      const unlocks = await checkAllTriggers({
        completedTasks,
        currentStreak: progress?.currentStreak ?? 0,
        milestonesCompleted,
        goalsCompleted,
        currentLevel: newLevel,
        goalStyle: task.goal.style,
      });

      return { task, xpGained: xpReward, newLevel, newTotalXP: newXP, unlocks };
    }),

  skip: publicCloudProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      return prisma.dailyTask.update({
        where: { id: input.id },
        data: { status: 'skipped' },
      });
    }),

  reschedule: publicCloudProcedure
    .input(z.object({
      id: z.string(),
      newDate: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      return prisma.dailyTask.update({
        where: { id: input.id },
        data: { scheduledDate: new Date(input.newDate) },
      });
    }),
});
