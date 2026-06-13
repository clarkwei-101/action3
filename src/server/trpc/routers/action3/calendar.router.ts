import { z } from 'zod';
import { createCloudRouter, publicCloudProcedure } from '~/server/trpc/trpc.server.cloud';
import { analyzeFreeTime, parseIcalContent } from '~/server/services/calendar-ai.service';

export const calendarRouter = createCloudRouter({
  list: publicCloudProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }).optional())
    .query(async ({ input }) => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const start = input?.startDate ? new Date(input.startDate) : new Date();
      const end = input?.endDate ? new Date(input.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      return prisma.calendarEvent.findMany({
        where: { startTime: { gte: start }, endTime: { lte: end } },
        orderBy: { startTime: 'asc' },
      });
    }),

  add: publicCloudProcedure
    .input(z.object({
      title: z.string().min(1),
      startTime: z.string(),
      endTime: z.string(),
      type: z.enum(['busy', 'free']).default('busy'),
    }))
    .mutation(async ({ input }) => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      return prisma.calendarEvent.create({
        data: {
          title: input.title,
          startTime: new Date(input.startTime),
          endTime: new Date(input.endTime),
          type: input.type,
          source: 'manual',
        },
      });
    }),

  delete: publicCloudProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      return prisma.calendarEvent.delete({ where: { id: input.id } });
    }),

  importIcal: publicCloudProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ input }) => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const events = await parseIcalContent(input.content);

      const created = [];
      for (const event of events) {
        const createdEvent = await prisma.calendarEvent.create({
          data: {
            title: event.title,
            startTime: event.start,
            endTime: event.end,
            type: 'busy',
            source: 'ical',
          },
        });
        created.push(createdEvent);
      }

      return { imported: created.length, events: created };
    }),

  analyzeFreeTime: publicCloudProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ input }) => {
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      return analyzeFreeTime(start, end);
    }),
});
