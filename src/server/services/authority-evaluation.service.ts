import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface EvaluationResult {
  goalId: string;
  goalTitle: string;
  overallScore: number;
  taskCompletionRate: number;
  milestoneCompletionRate: number;
  timeEfficiency: number;
  qualityScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendation: string;
  achieved: boolean;
}

export async function evaluateGoalCompletion(goalId: string): Promise<EvaluationResult> {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: {
      milestones: { include: { tasks: true } },
      tasks: true,
    },
  });

  if (!goal) {
    throw new Error('Goal not found');
  }

  const totalTasks = goal.tasks.length;
  const completedTasks = goal.tasks.filter((t) => t.status === 'completed').length;
  const skippedTasks = goal.tasks.filter((t) => t.status === 'skipped').length;
  const totalMilestones = goal.milestones.length;
  const completedMilestones = goal.milestones.filter((m) => m.progress >= 100).length;

  const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const milestoneCompletionRate = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  const endDate = goal.estimatedCompletion ?? new Date();
  const daysTaken = Math.ceil((Date.now() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const plannedDays = goal.targetDays;
  const timeEfficiency = Math.min(100, (plannedDays / Math.max(1, daysTaken)) * 100);

  const qualityScore = (taskCompletionRate * 0.4 + milestoneCompletionRate * 0.4 + timeEfficiency * 0.2);

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (taskCompletionRate >= 80) strengths.push('任务完成率高');
  if (milestoneCompletionRate >= 80) strengths.push('里程碑达成率高');
  if (timeEfficiency >= 100) strengths.push('提前完成目标');

  if (taskCompletionRate < 50) improvements.push('建议提高任务执行效率');
  if (milestoneCompletionRate < 50) improvements.push('需要加强阶段目标的推进');
  if (skippedTasks > completedTasks) improvements.push('避免过度跳过任务');

  const overallScore = Math.round(qualityScore);

  const summary = overallScore >= 80
    ? `目标达成度优秀！你完成了${completedTasks}/${totalTasks}个任务，${completedMilestones}/${totalMilestones}个里程碑，综合评分${overallScore}分。`
    : overallScore >= 60
    ? `目标基本达成。完成${completedTasks}/${totalTasks}个任务，综合评分${overallScore}分。还有提升空间。`
    : `目标达成度待提升。完成${completedTasks}/${totalTasks}个任务，综合评分${overallScore}分。建议重新规划后继续努力。`;

  const recommendation = overallScore >= 80
    ? '恭喜你已达成目标！建议进入下一个更具挑战性的目标。'
    : overallScore >= 60
    ? '你已经取得了可观的进步。总结经验，准备下一个目标吧。'
    : '不要气馁！分析这次的经验教训，调整策略后重新出发。';

  const achieved = overallScore >= 60;

  return {
    goalId: goal.id,
    goalTitle: goal.title,
    overallScore,
    taskCompletionRate: Math.round(taskCompletionRate),
    milestoneCompletionRate: Math.round(milestoneCompletionRate),
    timeEfficiency: Math.round(timeEfficiency),
    qualityScore: Math.round(qualityScore),
    summary,
    strengths,
    improvements,
    recommendation,
    achieved,
  };
}
