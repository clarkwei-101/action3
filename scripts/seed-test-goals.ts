/**
 * Seed script to create 5 random goals for testing Action PRO
 * Run with: npx ts-node --esm scripts/seed-test-goals.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const goals = [
  {
    title: '3个月内掌握Python数据分析',
    description: '包括pandas、numpy、matplotlib等库的实战应用',
    targetDays: 90,
    style: 'guided',
    milestones: [
      { title: '入门探索', description: '掌握Python基础语法和数据结构' },
      { title: '逐步深入', description: '学习pandas数据处理和分析' },
      { title: '系统学习', description: '掌握numpy数值计算' },
      { title: '强化巩固', description: '学习matplotlib数据可视化' },
    ],
  },
  {
    title: '6个月内英语达到雅思7分水平',
    description: '涵盖听说读写四项全面提升',
    targetDays: 180,
    style: 'encouragement',
    milestones: [
      { title: '基础阶段', description: '词汇积累和语法巩固' },
      { title: '进阶阶段', description: '听力口语专项训练' },
      { title: '提升阶段', description: '阅读写作技巧提升' },
    ],
  },
  {
    title: '100天内完成马拉松训练',
    description: '从零基础到完成全程马拉松',
    targetDays: 100,
    style: 'strict',
    milestones: [
      { title: '基础阶段', description: '建立跑步习惯和体能基础' },
      { title: '进阶阶段', description: '增加跑量和提升配速' },
      { title: '强化阶段', description: '马拉松专项训练' },
      { title: '突破阶段', description: '赛前调整和心理准备' },
    ],
  },
  {
    title: '1年内掌握机器学习核心技术',
    description: '从理论到实践，涵盖监督学习、无监督学习和深度学习',
    targetDays: 365,
    style: 'first_principles',
    milestones: [
      { title: '基础原理', description: '数学基础和机器学习理论' },
      { title: '核心概念', description: '掌握主要算法原理' },
      { title: '关键机制', description: '深入理解模型训练和优化' },
      { title: '综合应用', description: '项目实战和问题解决' },
    ],
  },
  {
    title: '30天养成早起习惯',
    description: '每天早起1小时用于自我提升',
    targetDays: 30,
    style: 'indoctrination',
    milestones: [
      { title: '适应期', description: '逐步调整作息时间' },
      { title: '巩固期', description: '建立早起仪式感' },
      { title: '习惯期', description: '早起成为自然习惯' },
    ],
  },
];

async function main() {
  console.log('Seeding test goals...\n');

  // Clear existing goals and tasks
  await prisma.dailyTask.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.goal.deleteMany({});
  console.log('Cleared existing data\n');

  for (const goalData of goals) {
    const { milestones, ...goalFields } = goalData;
    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + goalFields.targetDays);

    const goal = await prisma.goal.create({
      data: {
        ...goalFields,
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

    console.log(`Created goal: ${goal.title} (${goal.id})`);
    console.log(`  Milestones: ${milestones.map(m => m.title).join(', ')}`);

    // Create daily tasks for each milestone
    const daysPerMilestone = Math.ceil(goalFields.targetDays / milestones.length);
    const taskTemplates = [
      '复习相关概念',
      '完成实践练习',
      '总结学习要点',
      '进行实战应用',
      '检验学习成果',
    ];
    const xpRewards = [8, 10, 12, 15, 20];

    for (let mIdx = 0; mIdx < milestones.length; mIdx++) {
      const milestone = goal.milestones[mIdx];
      const tasksPerMilestone = 3 + Math.floor(Math.random() * 2);

      for (let t = 0; t < tasksPerMilestone; t++) {
        const dayOffset = mIdx * daysPerMilestone + Math.floor((t / tasksPerMilestone) * daysPerMilestone);
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + dayOffset);

        await prisma.dailyTask.create({
          data: {
            goalId: goal.id,
            milestoneId: milestone.id,
            title: `${milestones[mIdx].title} - ${taskTemplates[t % taskTemplates.length]}`,
            description: milestones[mIdx].description,
            scheduledDate,
            status: 'pending',
            xpReward: xpRewards[t % xpRewards.length],
          },
        });
      }

      console.log(`  Created ${tasksPerMilestone} tasks for milestone: ${milestones[mIdx].title}`);
    }

    console.log('');
  }

  // Verify
  const totalGoals = await prisma.goal.count();
  const totalMilestones = await prisma.milestone.count();
  const totalTasks = await prisma.dailyTask.count();
  console.log(`\nSeeding complete!`);
  console.log(`Total goals: ${totalGoals}`);
  console.log(`Total milestones: ${totalMilestones}`);
  console.log(`Total tasks: ${totalTasks}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
