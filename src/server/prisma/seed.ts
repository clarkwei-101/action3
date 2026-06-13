import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACHIEVEMENTS = [
  {
    key: 'first_task',
    name: '初出茅庐',
    description: '完成第1个任务',
    icon: 'star',
    category: 'starter',
    triggerType: 'event_count',
    triggerConfig: JSON.stringify({ taskCount: 1 }),
    xpReward: 50,
    levelRequired: 1,
  },
  {
    key: 'week_warrior',
    name: '一周战士',
    description: '连续7天打卡',
    icon: 'fire',
    category: 'streak',
    triggerType: 'streak',
    triggerConfig: JSON.stringify({ streakDays: 7 }),
    xpReward: 100,
    levelRequired: 1,
  },
  {
    key: 'first_milestone',
    name: '首个里程碑',
    description: '完成第一个里程碑',
    icon: 'flag',
    category: 'milestone',
    triggerType: 'milestone_reached',
    triggerConfig: JSON.stringify({ milestoneCount: 1 }),
    xpReward: 100,
    levelRequired: 1,
  },
  {
    key: 'first_goal',
    name: '达标者',
    description: '达成第一个目标',
    icon: 'trophy',
    category: 'milestone',
    triggerType: 'event_count',
    triggerConfig: JSON.stringify({ goalCompletedCount: 1 }),
    xpReward: 200,
    levelRequired: 1,
  },
  {
    key: 'first_principles_master',
    name: '第一性原理',
    description: '使用第一性原理模式完成目标',
    icon: 'brain',
    category: 'style',
    triggerType: 'combination',
    triggerConfig: JSON.stringify({ style: 'first_principles', goalCompletedCount: 1 }),
    xpReward: 150,
    levelRequired: 1,
  },
  {
    key: 'overachiever',
    name: '超额完成',
    description: '提前完成目标',
    icon: 'rocket',
    category: 'milestone',
    triggerType: 'combination',
    triggerConfig: JSON.stringify({ completedEarly: true }),
    xpReward: 150,
    levelRequired: 2,
  },
  {
    key: 'monthly_master',
    name: '月度达人',
    description: '连续30天打卡',
    icon: 'calendar',
    category: 'streak',
    triggerType: 'streak',
    triggerConfig: JSON.stringify({ streakDays: 30 }),
    xpReward: 300,
    levelRequired: 3,
  },
  {
    key: 'century_scholar',
    name: '学业有成',
    description: '完成100个任务',
    icon: 'book',
    category: 'master',
    triggerType: 'event_count',
    triggerConfig: JSON.stringify({ taskCount: 100 }),
    xpReward: 500,
    levelRequired: 5,
  },
  {
    key: 'ten_goals',
    name: '十项全能',
    description: '达成10个目标',
    icon: 'crown',
    category: 'master',
    triggerType: 'event_count',
    triggerConfig: JSON.stringify({ goalCompletedCount: 10 }),
    xpReward: 800,
    levelRequired: 10,
  },
  {
    key: 'level_10',
    name: '资深学者',
    description: '达到10级',
    icon: 'medal',
    category: 'master',
    triggerType: 'level_up',
    triggerConfig: JSON.stringify({ level: 10 }),
    xpReward: 300,
    levelRequired: 5,
  },
];

async function main() {
  console.log('Seeding achievements...');

  for (const achievement of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key: achievement.key },
      update: {},
      create: achievement,
    });
    console.log(`  - ${achievement.name} (${achievement.key})`);
  }

  // Initialize user progress
  await prisma.userProgress.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      totalXP: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
    },
  });

  // Initialize reminders
  await prisma.reminder.upsert({
    where: { id: 'morning-default' },
    update: {},
    create: {
      id: 'morning-default',
      type: 'morning',
      time: '08:00',
      enabled: true,
      message: null,
    },
  });
  await prisma.reminder.upsert({
    where: { id: 'evening-default' },
    update: {},
    create: {
      id: 'evening-default',
      type: 'evening',
      time: '21:00',
      enabled: true,
      message: null,
    },
  });

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
