import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TaskSplitInput {
  title: string;
  description?: string;
  targetDays: number;
  milestones: { title: string; description: string }[];
  style: string;
}

export interface SplitTask {
  title: string;
  description: string;
  milestoneIndex: number;
  milestoneId: string;
  scheduledDate: Date;
  xpReward: number;
}

export function splitTasksIntoDays(
  input: TaskSplitInput,
  milestoneIds: string[],
): SplitTask[] {
  const tasks: SplitTask[] = [];
  const daysPerMilestone = Math.ceil(input.targetDays / input.milestones.length);

  const taskTemplates = [
    '复习相关概念',
    '完成实践练习',
    '总结学习要点',
    '进行实战应用',
    '检验学习成果',
  ];

  for (let mIdx = 0; mIdx < input.milestones.length; mIdx++) {
    const milestoneTasks = 3 + Math.floor(Math.random() * 2);
    const milestoneDays = daysPerMilestone;

    for (let t = 0; t < milestoneTasks; t++) {
      const dayOffset = Math.floor((t / milestoneTasks) * milestoneDays);
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + dayOffset + 1);

      const templateIdx = t % taskTemplates.length;
      const xpRewards = [8, 10, 12, 15, 20];

      tasks.push({
        title: `${input.milestones[mIdx].title} - ${taskTemplates[templateIdx]}`,
        description: input.milestones[mIdx].description,
        milestoneIndex: mIdx,
        milestoneId: milestoneIds[mIdx] ?? '',
        scheduledDate,
        xpReward: xpRewards[templateIdx],
      });
    }
  }

  return tasks;
}

export async function saveGoalWithTasks(
  title: string,
  description: string | null | undefined,
  targetDays: number,
  style: string,
  milestones: { title: string; description: string }[],
  tasks: SplitTask[],
) {
  const estimatedCompletion = new Date();
  estimatedCompletion.setDate(estimatedCompletion.getDate() + targetDays);

  const goal = await prisma.goal.create({
    data: {
      title,
      description: description ?? null,
      targetDays,
      style,
      status: 'active',
      totalProgress: 0,
      estimatedCompletion,
      milestones: {
        create: milestones.map((m, idx) => ({
          title: m.title,
          description: m.description,
          orderIndex: idx,
        })),
      },
    },
    include: { milestones: true },
  });

  const tasksWithGoalId = tasks.map((task) => ({
    ...task,
    goalId: goal.id,
    milestoneId: goal.milestones[task.milestoneIndex]?.id ?? null,
    scheduledDate: task.scheduledDate,
  }));

  await prisma.dailyTask.createMany({
    data: tasksWithGoalId.map((t) => ({
      goalId: t.goalId,
      milestoneId: t.milestoneId || null,
      title: t.title,
      description: t.description,
      scheduledDate: t.scheduledDate,
      status: 'pending',
      xpReward: t.xpReward,
    })),
  });

  return goal;
}
