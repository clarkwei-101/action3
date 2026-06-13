import { z } from 'zod';
import { createCloudRouter, publicCloudProcedure } from '~/server/trpc/trpc.server.cloud';
import { analyzeGoal, generatePath, splitTasks } from '~/server/services/ai-workflow.service';
import { saveGoalWithTasks } from '~/server/services/task-split.service';

export const aiWorkflowRouter = createCloudRouter({
  analyze: publicCloudProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      targetDays: z.number().int().min(7).max(365),
    }))
    .mutation(async ({ input }) => {
      const result = await analyzeGoal(input.title, input.description ?? null, input.targetDays);
      return result;
    }),

  generate: publicCloudProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      targetDays: z.number().int().min(7).max(365),
      style: z.enum(['guided', 'indoctrination', 'encouragement', 'strict', 'first_principles']),
    }))
    .mutation(async ({ input }) => {
      const analysis = await analyzeGoal(input.title, input.description ?? null, input.targetDays);
      const milestones = await generatePath(input.title, input.description ?? null, input.targetDays, input.style, analysis);
      const tasks = await splitTasks(milestones, input.targetDays, input.title, input.style);
      return { analysis, milestones, tasks };
    }),

  create: publicCloudProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      targetDays: z.number().int().min(7).max(365),
      style: z.enum(['guided', 'indoctrination', 'encouragement', 'strict', 'first_principles']),
    }))
    .mutation(async ({ input }) => {
      const analysis = await analyzeGoal(input.title, input.description ?? null, input.targetDays);
      const milestones = await generatePath(input.title, input.description ?? null, input.targetDays, input.style, analysis);
      const tasks = await splitTasks(milestones, input.targetDays, input.title, input.style);

      const milestoneIds = milestones.map((_, i) => `temp-${i}`);
      const taskInput = {
        title: input.title,
        description: input.description,
        targetDays: input.targetDays,
        milestones,
        style: input.style,
      };
      const splitTasksResult = { ...taskInput, milestones };

      const goal = await saveGoalWithTasks(
        input.title,
        input.description ?? null,
        input.targetDays,
        input.style,
        milestones,
        tasks.map((t, i) => ({
          ...t,
          description: t.description ?? '',
          milestoneId: milestoneIds[i] ?? '',
          scheduledDate: new Date(Date.now() + (t.milestoneIndex * 7 + i) * 24 * 60 * 60 * 1000),
        })),
      );

      return goal;
    }),
});
