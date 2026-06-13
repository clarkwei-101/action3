import { z } from 'zod';
import { createCloudRouter, publicCloudProcedure } from '~/server/trpc/trpc.server.cloud';
import { evaluateGoalCompletion } from '~/server/services/authority-evaluation.service';

export const goalRouter = createCloudRouter({
  list: publicCloudProcedure.query(async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    return prisma.goal.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        milestones: { orderBy: { orderIndex: 'asc' } },
        _count: { select: { tasks: true } },
      },
    });
  }),

  getById: publicCloudProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      return prisma.goal.findUnique({
        where: { id: input.id },
        include: {
          milestones: { orderBy: { orderIndex: 'asc' }, include: { tasks: true } },
          tasks: { orderBy: { scheduledDate: 'asc' } },
        },
      });
    }),

  create: publicCloudProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      targetDays: z.number().int().min(7).max(365),
      style: z.enum(['guided', 'indoctrination', 'encouragement', 'strict', 'first_principles']),
      milestones: z.array(z.object({
        title: z.string(),
        description: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const estimatedCompletion = new Date();
      estimatedCompletion.setDate(estimatedCompletion.getDate() + input.targetDays);

      return prisma.goal.create({
        data: {
          title: input.title,
          description: input.description ?? null,
          targetDays: input.targetDays,
          style: input.style,
          status: 'active',
          estimatedCompletion,
          milestones: {
            create: input.milestones.map((m, idx) => ({
              title: m.title,
              description: m.description ?? null,
              orderIndex: idx,
            })),
          },
        },
        include: { milestones: true },
      });
    }),

  update: publicCloudProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['active', 'completed', 'paused']).optional(),
      totalProgress: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ input }) => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      return prisma.goal.update({
        where: { id: input.id },
        data: {
          ...(input.status && { status: input.status }),
          ...(input.totalProgress !== undefined && { totalProgress: input.totalProgress }),
        },
      });
    }),

  delete: publicCloudProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      return prisma.goal.delete({ where: { id: input.id } });
    }),

  complete: publicCloudProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      const goal = await prisma.goal.update({
        where: { id: input.id },
        data: { status: 'completed', totalProgress: 100 },
      });

      const evaluation = await evaluateGoalCompletion(input.id);

      return { goal, evaluation };
    }),
});
