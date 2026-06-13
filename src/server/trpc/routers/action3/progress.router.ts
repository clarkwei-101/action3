import { z } from 'zod';
import { createCloudRouter, publicCloudProcedure } from '~/server/trpc/trpc.server.cloud';

export const progressRouter = createCloudRouter({
  get: publicCloudProcedure.query(async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    return prisma.userProgress.findFirst({ where: { id: 'default' } });
  }),

  updateStreak: publicCloudProcedure.mutation(async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const progress = await prisma.userProgress.findFirst({ where: { id: 'default' } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!progress) {
      return prisma.userProgress.create({
        data: { id: 'default', currentStreak: 1, longestStreak: 1, lastActiveDate: today },
      });
    }

    const lastActive = progress.lastActiveDate;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let newStreak = progress.currentStreak;

    if (lastActive) {
      const lastDate = new Date(lastActive);
      lastDate.setHours(0, 0, 0, 0);

      if (lastDate.getTime() === today.getTime()) {
        return progress;
      } else if (lastDate.getTime() === yesterday.getTime()) {
        newStreak = progress.currentStreak + 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    return prisma.userProgress.update({
      where: { id: 'default' },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(progress.longestStreak, newStreak),
        lastActiveDate: today,
      },
    });
  }),
});
