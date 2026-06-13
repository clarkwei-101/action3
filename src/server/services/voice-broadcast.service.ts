import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type GoalStyle = 'guided' | 'indoctrination' | 'encouragement' | 'strict' | 'first_principles';

export interface BroadcastTextResult {
  greeting: string;
  summary: string;
  encouragement: string;
  fullText: string;
}

const STYLE_TEMPLATES: Record<GoalStyle, { greeting: () => string; encouragement: () => string }> = {
  guided: {
    greeting: () => '早上好！让我们一起继续今天的旅程吧。',
    encouragement: () => '每一步都在让你更接近目标，保持这份好奇心和耐心，你一定可以的！',
  },
  indoctrination: {
    greeting: () => '早上好。今天有大量知识等待你去吸收，准备好了吗？',
    encouragement: () => '快速回顾昨日内容，然后立即开始新的学习模块。效率是关键！',
  },
  encouragement: {
    greeting: () => '太棒了，新的一天开始了！你准备好创造奇迹了吗？',
    encouragement: () => '你太厉害了！继续保持这份热情，今天一定会比昨天更出色！',
  },
  strict: {
    greeting: () => '早上好。别浪费时间，今天的任务不等人。',
    encouragement: () => '完成你的任务。没有借口，没有拖延，只有结果。',
  },
  first_principles: {
    greeting: () => '早上好。思考今天的任务，问自己：最本质的收获是什么？',
    encouragement: () => '深入理解，而非表面记忆。今天要追问本质，质疑假设。',
  },
};

export function generateBroadcastText(
  tasks: { title: string; completed: boolean }[],
  style: GoalStyle,
  userName: string = '朋友',
): BroadcastTextResult {
  const template = STYLE_TEMPLATES[style] ?? STYLE_TEMPLATES.guided;
  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingTasks = tasks.filter((t) => !t.completed);

  const greeting = `你好，${userName}！${template.greeting()}`;

  const summary = pendingTasks.length > 0
    ? `今天你有${pendingTasks.length}个待完成任务：${pendingTasks.map((t) => t.title).join('、')}。`
    : '太棒了！今天的任务已全部完成，继续加油！';

  const encouragement = template.encouragement();

  const fullText = `${greeting} ${summary} ${encouragement}`;

  return { greeting, summary, encouragement, fullText };
}

export async function getTodayTasksSummary() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tasks = await prisma.dailyTask.findMany({
    where: {
      scheduledDate: { gte: today, lt: tomorrow },
    },
    include: { goal: { select: { style: true } } },
  });

  const progress = await prisma.userProgress.findFirst({
    where: { id: 'default' },
  });

  return {
    tasks: tasks.map((t) => ({ title: t.title, completed: t.status === 'completed' })),
    style: tasks[0]?.goal.style ?? 'guided',
    level: progress?.level ?? 1,
    totalXP: progress?.totalXP ?? 0,
    currentStreak: progress?.currentStreak ?? 0,
  };
}
