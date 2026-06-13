/**
 * Action PRO tRPC client hooks
 * Type-safe hooks for all Action PRO modules.
 * Uses the Cloud router (apiAsyncNode / apiQueryCloud) because
 * Action PRO requires Prisma + SQLite which is Node.js-only.
 *
 * Note: action3Router is a sub-router registered under the `action3` key
 * in appRouterCloud, so all paths are prefixed with `action3`.
 */
import { apiAsyncNode, apiQueryCloud } from '~/common/util/trpc.client';
import type { Action3Router } from '~/server/trpc/routers/action3';

// Re-export the type for convenience
export type { Action3Router };

// ============================================================
// Goal Hooks
// ============================================================
export const action3Goal = {
  useList: () =>
    apiQueryCloud.action3.goal.list.useQuery(undefined),
  useGetById: (id: string) =>
    apiQueryCloud.action3.goal.getById.useQuery({ id }),
  useCreate: () =>
    apiAsyncNode.action3.goal.create.mutate,
  useUpdate: () =>
    apiAsyncNode.action3.goal.update.mutate,
  useDelete: () =>
    apiAsyncNode.action3.goal.delete.mutate,
  useComplete: () =>
    apiAsyncNode.action3.goal.complete.mutate,
};

// ============================================================
// Task Hooks
// ============================================================
export const action3Task = {
  useListByGoal: (goalId: string) =>
    apiQueryCloud.action3.task.listByGoal.useQuery({ goalId }),
  useListToday: () =>
    apiQueryCloud.action3.task.listToday.useQuery(undefined),
  useListByDate: (date: string) =>
    apiQueryCloud.action3.task.listByDate.useQuery({ date }),
  useComplete: () =>
    apiAsyncNode.action3.task.complete.mutate,
  useSkip: () =>
    apiAsyncNode.action3.task.skip.mutate,
  useReschedule: () =>
    apiAsyncNode.action3.task.reschedule.mutate,
};

// ============================================================
// Achievement Hooks
// ============================================================
export const action3Achievement = {
  useList: () =>
    apiQueryCloud.action3.achievement.list.useQuery(undefined),
  useUnlock: () =>
    apiAsyncNode.action3.achievement.unlock.mutate,
};

// ============================================================
// Calendar Hooks
// ============================================================
export const action3Calendar = {
  useList: (startDate?: string, endDate?: string) =>
    apiQueryCloud.action3.calendar.list.useQuery(
      startDate !== undefined && endDate !== undefined
        ? { startDate, endDate }
        : undefined
    ),
  useAdd: () =>
    apiAsyncNode.action3.calendar.add.mutate,
  useDelete: () =>
    apiAsyncNode.action3.calendar.delete.mutate,
  useImportIcal: () =>
    apiAsyncNode.action3.calendar.importIcal.mutate,
  useAnalyzeFreeTime: () =>
    apiAsyncNode.action3.calendar.analyzeFreeTime.mutate,
};

// ============================================================
// Reminder Hooks
// ============================================================
export const action3Reminder = {
  useGet: () =>
    apiQueryCloud.action3.reminder.get.useQuery(undefined),
  useUpdate: () =>
    apiAsyncNode.action3.reminder.update.mutate,
};

// ============================================================
// AI Workflow Hooks
// ============================================================
export const action3AIWorkflow = {
  useAnalyze: () =>
    apiAsyncNode.action3.aiWorkflow.analyze.mutate,
  useGenerate: () =>
    apiAsyncNode.action3.aiWorkflow.generate.mutate,
  useCreate: () =>
    apiAsyncNode.action3.aiWorkflow.create.mutate,
};

// ============================================================
// Progress Hooks
// ============================================================
export const action3Progress = {
  useGet: () =>
    apiQueryCloud.action3.progress.get.useQuery(undefined),
  useUpdateStreak: () =>
    apiAsyncNode.action3.progress.updateStreak.mutate,
};

