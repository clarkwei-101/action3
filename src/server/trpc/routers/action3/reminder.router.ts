import { z } from 'zod';
import { createCloudRouter, publicCloudProcedure } from '~/server/trpc/trpc.server.cloud';

export const reminderRouter = createCloudRouter({
  get: publicCloudProcedure.query(async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    return prisma.reminder.findMany();
  }),

  update: publicCloudProcedure
    .input(z.object({
      id: z.string().optional(),
      type: z.enum(['morning', 'evening']),
      time: z.string(),
      enabled: z.boolean(),
      message: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const id = input.id ?? `${input.type}-default`;

      return prisma.reminder.upsert({
        where: { id },
        update: {
          time: input.time,
          enabled: input.enabled,
          message: input.message ?? null,
        },
        create: {
          id,
          type: input.type,
          time: input.time,
          enabled: input.enabled,
          message: input.message ?? null,
        },
      });
    }),
});
