import { createCloudRouter, publicCloudProcedure } from '~/server/trpc/trpc.server.cloud';
import { goalRouter } from './goal.router';
import { taskRouter } from './task.router';
import { achievementRouter } from './achievement.router';
import { calendarRouter } from './calendar.router';
import { reminderRouter } from './reminder.router';
import { aiWorkflowRouter } from './ai-workflow.router';
import { progressRouter } from './progress.router';

/**
 * Action3 root router - combines all custom AGI system modules
 * Uses cloud tRPC config with no-op transformer (required for POST mutations)
 */
export const action3Router = createCloudRouter({
  // Goal achievement system
  goal: goalRouter,
  task: taskRouter,
  achievement: achievementRouter,
  calendar: calendarRouter,
  reminder: reminderRouter,
  aiWorkflow: aiWorkflowRouter,
  progress: progressRouter,

});

export type Action3Router = typeof action3Router;
