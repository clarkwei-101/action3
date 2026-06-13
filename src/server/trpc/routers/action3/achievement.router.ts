import { z } from 'zod';
import { createCloudRouter, publicCloudProcedure } from '~/server/trpc/trpc.server.cloud';

export const achievementRouter = createCloudRouter({
  list: publicCloudProcedure.query(async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const [achievements, progress] = await Promise.all([
      prisma.achievement.findMany({ orderBy: { category: 'asc' } }),
      prisma.userProgress.findFirst({ where: { id: 'default' } }),
    ]);

    const unlockedKeys = achievements.filter((a) => a.unlockedAt).map((a) => a.key);

    return {
      achievements,
      progress: {
        totalXP: progress?.totalXP ?? 0,
        level: progress?.level ?? 1,
        currentStreak: progress?.currentStreak ?? 0,
        longestStreak: progress?.longestStreak ?? 0,
      },
      unlockedCount: unlockedKeys.length,
      totalCount: achievements.length,
    };
  }),

  unlock: publicCloudProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const achievement = await prisma.achievement.findUnique({ where: { key: input.key } });
      if (!achievement) return null;

      return prisma.achievement.update({
        where: { key: input.key },
        data: { unlockedAt: new Date() },
      });
    }),
});
