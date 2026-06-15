import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

import { PrismaClient } from '@prisma/client';
import { analyzeGoal, generatePath, splitTasks } from '~/server/services/action3-ai.service';
import {
  getSkillRecommendations,
  getLearningPathRecommendations,
  getUserSkillProfile,
  updateSkillMastery,
  seedDefaultSkillNodes,
  type SkillRecommendation,
  type LearningPathRecommendation,
} from '~/server/services/action3-recommendation.service';
import {
  createClassroomSession,
  generateClassroomResponse,
  getSceneConfigs,
  getLocaleContent,
} from '~/server/services/action3-classroom.service';

interface ClassroomSessionData {
  id: string;
  topic: string;
  sceneType: string;
  agents: unknown[];
  messages: unknown[];
  createdAt: number;
}

// In-memory session store (for demo; replace with Redis/DB in production)
const classroomSessions = new Map<string, ClassroomSessionData>();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action as string;

    // ============================================================
    // Goal Actions
    // ============================================================
    if (action === 'goal.list') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const goals = await prisma.goal.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          milestones: { orderBy: { orderIndex: 'asc' } },
          _count: { select: { tasks: true } },
        },
      });
      await prisma.$disconnect();
      return NextResponse.json(goals);
    }

    if (action === 'goal.getById') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const goal = await prisma.goal.findUnique({
        where: { id: body.id as string },
        include: {
          milestones: { orderBy: { orderIndex: 'asc' } },
          tasks: { orderBy: { scheduledDate: 'asc' } },
        },
      });
      await prisma.$disconnect();
      return NextResponse.json(goal);
    }

    if (action === 'goal.create') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { title, description, targetDays, style, milestones } = body as Record<string, unknown>;
      if (!title || typeof title !== 'string' || !title.trim()) {
        return NextResponse.json({ error: 'title is required and must be a non-empty string' }, { status: 400 });
      }
      const td = (targetDays as number) || 30;
      const est = new Date();
      est.setDate(est.getDate() + td);
      const msInput = (milestones as Array<{ title: string; description?: string }>) || [];
      const msCreate = msInput.map((m: { title: string; description?: string }, idx: number) => ({
        title: m.title,
        description: (m.description as string) || null,
        orderIndex: idx,
      }));
      const goal = await prisma.goal.create({
        data: {
          title: title as string,
          description: (description as string) || null,
          targetDays: td,
          style: style as string,
          status: 'active',
          totalProgress: 0,
          estimatedCompletion: est,
          milestones: { create: msCreate },
        },
        include: { milestones: true },
      });
      await prisma.$disconnect();
      return NextResponse.json(goal);
    }

    if (action === 'goal.delete') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { id } = body as { id: string };
      await prisma.dailyTask.deleteMany({ where: { goalId: id } });
      await prisma.milestone.deleteMany({ where: { goalId: id } });
      const deleted = await prisma.goal.delete({ where: { id } });
      await prisma.$disconnect();
      return NextResponse.json(deleted);
    }

    if (action === 'goal.update') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { id, status, totalProgress } = body as { id: string; status?: string; totalProgress?: number };
      const data: { status?: string; totalProgress?: number } = {};
      if (status) data.status = status;
      if (totalProgress !== undefined) data.totalProgress = totalProgress;
      const updated = await prisma.goal.update({ where: { id }, data });
      await prisma.$disconnect();
      return NextResponse.json(updated);
    }

    if (action === 'goal.complete') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { id } = body as { id: string };
      const goal = await prisma.goal.update({
        where: { id },
        data: { status: 'completed', totalProgress: 100 },
      });
      await prisma.$disconnect();
      return NextResponse.json(goal);
    }

    // ============================================================
    // Task Actions
    // ============================================================
    if (action === 'task.listByGoal') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const tasks = await prisma.dailyTask.findMany({
        where: { goalId: body.goalId as string },
        include: { milestone: true },
        orderBy: { scheduledDate: 'asc' },
      });
      await prisma.$disconnect();
      return NextResponse.json(tasks);
    }

    if (action === 'task.listToday') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tasks = await prisma.dailyTask.findMany({
        where: {
          scheduledDate: { gte: today, lt: tomorrow },
        },
        orderBy: { scheduledDate: 'asc' },
      });
      await prisma.$disconnect();
      return NextResponse.json(tasks);
    }

    if (action === 'task.listByDate') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const date = new Date(body.date as string);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const tasks = await prisma.dailyTask.findMany({
        where: {
          scheduledDate: { gte: date, lt: nextDay },
        },
        include: { milestone: true, goal: true },
        orderBy: { scheduledDate: 'asc' },
      });
      await prisma.$disconnect();
      return NextResponse.json(tasks);
    }

    if (action === 'task.complete') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { id } = body as { id: string };
      const task = await prisma.dailyTask.update({
        where: { id },
        data: { status: 'completed', completedAt: new Date() },
        include: { goal: true },
      });
      // Update milestone progress
      const msTasks = await prisma.dailyTask.findMany({
        where: { milestoneId: task.milestoneId || '' },
      });
      const msCompleted = msTasks.filter((t) => t.status === 'completed').length;
      const msProgress = msTasks.length > 0 ? Math.round((msCompleted / msTasks.length) * 100) : 0;
      if (task.milestoneId) {
        await prisma.milestone.update({
          where: { id: task.milestoneId },
          data: { progress: msProgress },
        });
      }
      // Update goal progress
      const allTasks = await prisma.dailyTask.findMany({
        where: { goalId: task.goalId || '' },
      });
      const allCompleted = allTasks.filter((t) => t.status === 'completed').length;
      const goalProgress = allTasks.length > 0 ? Math.round((allCompleted / allTasks.length) * 100) : 0;
      await prisma.goal.update({
        where: { id: task.goalId || '' },
        data: { totalProgress: goalProgress },
      });
      await prisma.$disconnect();
      return NextResponse.json(task);
    }

    if (action === 'task.skip') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { id } = body as { id: string };
      const task = await prisma.dailyTask.update({
        where: { id },
        data: { status: 'skipped' },
      });
      await prisma.$disconnect();
      return NextResponse.json(task);
    }

    if (action === 'task.reschedule') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { id, scheduledDate } = body as { id: string; scheduledDate: string };
      const task = await prisma.dailyTask.update({
        where: { id },
        data: { scheduledDate: new Date(scheduledDate), status: 'pending' },
      });
      await prisma.$disconnect();
      return NextResponse.json(task);
    }

    // ============================================================
    // Assessment Actions
    // ============================================================
    if (action === 'assessment.run') {
      const { runAssessment } = await import('~/server/services/action3-assessment.service');
      const { goalId, goalTitle, assessmentType, goalProgress, completedTasks, projectDescription } = body as {
        goalId: string;
        goalTitle: string;
        assessmentType: string;
        goalProgress?: number;
        completedTasks?: string[];
        projectDescription?: string;
      };
      if (!goalId || !goalTitle) return NextResponse.json({ error: 'goalId and goalTitle are required' }, { status: 400 });
      const result = await runAssessment({
        goalId,
        goalTitle,
        assessmentType: assessmentType as 'quiz' | 'project_review' | 'certification' | 'peer_review' | 'self_assessment',
        goalProgress,
        completedTasks,
        projectDescription,
      });
      return NextResponse.json(result);
    }

    if (action === 'assessment.submitQuiz') {
      const { submitQuizAnswers } = await import('~/server/services/action3-assessment.service');
      const { assessmentId, questions, answers } = body as {
        assessmentId: string;
        questions: unknown[];
        answers: Record<string, string>;
      };
      if (!assessmentId || !questions || !answers) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      const result = await submitQuizAnswers(assessmentId, questions as Parameters<typeof submitQuizAnswers>[1], answers);
      return NextResponse.json(result);
    }

    // ============================================================
    // Research Actions
    // ============================================================
    if (action === 'research.analyze') {
      const { researchGoal } = await import('~/server/services/action3-research.service');
      const { goalTitle, goalDescription } = body as { goalTitle: string; goalDescription?: string };
      if (!goalTitle) return NextResponse.json({ error: 'goalTitle is required' }, { status: 400 });
      const report = await researchGoal({ goalTitle, goalDescription });
      return NextResponse.json(report);
    }

    if (action === 'research.analyzeMilestone') {
      const { researchGoal } = await import('~/server/services/action3-research.service');
      const { goalTitle, milestoneTitle, milestoneDescription } = body as {
        goalTitle: string; milestoneTitle: string; milestoneDescription?: string;
      };
      if (!goalTitle || !milestoneTitle) {
        return NextResponse.json({ error: 'goalTitle and milestoneTitle are required' }, { status: 400 });
      }
      // Focus research on the specific milestone topic
      const report = await researchGoal({
        goalTitle: `${goalTitle} - ${milestoneTitle}`,
        goalDescription: milestoneDescription || `专注于里程碑"${milestoneTitle}"的学习内容`,
      });
      return NextResponse.json(report);
    }

    // ============================================================
    // AI Workflow Actions
    // ============================================================
    if (action === 'aiWorkflow.generate') {
      const { title, description, targetDays, style } = body as Record<string, unknown>;
      const td = (targetDays as number) || 30;
      const st = (style as string) || 'guided';

      // Step 1: AI analyzes the goal
      const analysis = await analyzeGoal(
        title as string,
        description as string | null | undefined,
        td,
      );

      // Step 2: AI generates milestone path
      const milestones = await generatePath(
        title as string,
        description as string | null | undefined,
        td,
        st as 'guided' | 'indoctrination' | 'encouragement' | 'strict' | 'first_principles',
        analysis,
      );

      // Step 3: AI splits into tasks
      const tasks = await splitTasks(
        milestones,
        td,
        title as string,
        st as 'guided' | 'indoctrination' | 'encouragement' | 'strict' | 'first_principles',
      );

      return NextResponse.json({ analysis, milestones, tasks });
    }

    if (action === 'aiWorkflow.create') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { title, description, targetDays, style } = body as Record<string, unknown>;
      if (!title || typeof title !== 'string' || !title.trim()) {
        return NextResponse.json({ error: 'title is required and must be a non-empty string' }, { status: 400 });
      }
      const td = (targetDays as number) || 30;
      const st = (style as string) || 'guided';

      // AI analyzes and generates path
      const analysis = await analyzeGoal(
        title as string,
        description as string | null | undefined,
        td,
      );
      const milestones = await generatePath(
        title as string,
        description as string | null | undefined,
        td,
        st as 'guided' | 'indoctrination' | 'encouragement' | 'strict' | 'first_principles',
        analysis,
      );
      const aiTasks = await splitTasks(
        milestones,
        td,
        title as string,
        st as 'guided' | 'indoctrination' | 'encouragement' | 'strict' | 'first_principles',
      );

      const est = new Date();
      est.setDate(est.getDate() + td);

      const msCreate = milestones.map((m, i) => ({
        title: m.title,
        description: m.description,
        orderIndex: i,
      }));

      const goal = await prisma.goal.create({
        data: {
          title: title as string,
          description: (description as string) || null,
          targetDays: td,
          style: st,
          status: 'active',
          totalProgress: 0,
          estimatedCompletion: est,
          milestones: { create: msCreate },
        },
        include: { milestones: true },
      });

      const dpm = Math.ceil(td / milestones.length);
      const tasks = [];
      for (let mi = 0; mi < milestones.length; mi++) {
        // Find tasks for this milestone
        const msTasks = aiTasks.filter(t => t.milestoneIndex === mi);
        for (let t = 0; t < msTasks.length; t++) {
          const d = new Date();
          d.setDate(d.getDate() + mi * dpm + t);
          tasks.push({
            goalId: goal.id,
            milestoneId: goal.milestones[mi].id,
            title: msTasks[t].title,
            description: msTasks[t].description || null,
            scheduledDate: d,
            status: 'pending',
            xpReward: msTasks[t].xpReward,
          });
        }
      }

      await prisma.dailyTask.createMany({ data: tasks });
      await prisma.$disconnect();
      return NextResponse.json(goal);
    }

    // ============================================================
    // Achievement Actions
    // ============================================================
    if (action === 'achievement.list') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const achievements = await prisma.achievement.findMany({
        orderBy: { unlockedAt: 'desc' },
      });
      await prisma.$disconnect();
      return NextResponse.json(achievements);
    }

    if (action === 'achievement.unlock') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { id } = body as { id: string };
      const achievement = await prisma.achievement.update({
        where: { id },
        data: { unlockedAt: new Date() },
      });
      await prisma.$disconnect();
      return NextResponse.json(achievement);
    }

    // ============================================================
    // Calendar Actions
    // ============================================================
    if (action === 'calendar.list') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { startDate, endDate } = body as { startDate?: string; endDate?: string };
      const where: Record<string, unknown> = {};
      if (startDate && endDate) {
        where.startTime = { gte: new Date(startDate), lte: new Date(endDate) };
      }
      const events = await prisma.calendarEvent.findMany({
        where,
        orderBy: { startTime: 'asc' },
      });
      await prisma.$disconnect();
      return NextResponse.json(events);
    }

    if (action === 'calendar.add') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { title, startDate, endDate, type } = body as {
        title: string;
        startDate: string;
        endDate: string;
        type: string;
      };
      const event = await prisma.calendarEvent.create({
        data: {
          title,
          startTime: new Date(startDate),
          endTime: new Date(endDate),
          type: type || 'busy',
          source: 'manual',
        },
      });
      await prisma.$disconnect();
      return NextResponse.json(event);
    }

    if (action === 'calendar.delete') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { id } = body as { id: string };
      const deleted = await prisma.calendarEvent.delete({ where: { id } });
      await prisma.$disconnect();
      return NextResponse.json(deleted);
    }

    if (action === 'calendar.importIcal') {
      const { icalContent } = body as { icalContent: string };
      if (!icalContent) return NextResponse.json({ error: 'icalContent is required' }, { status: 400 });
      const { parseICalContent, convertToAction3Events } = await import('~/server/services/action3-ical-import.service');
      const result = parseICalContent(icalContent);
      const action3Events = result.success ? convertToAction3Events(result.events) : [];
      return NextResponse.json({ ...result, action3Events });
    }

    if (action === 'calendar.analyzeFreeTime') {
      const { startDate, endDate } = body as { startDate: string; endDate: string };
      const blocks = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      const current = new Date(start);
      while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          blocks.push({
            date: current.toISOString().split('T')[0],
            start: '09:00',
            end: '18:00',
            type: 'weekend',
          });
        } else {
          blocks.push({
            date: current.toISOString().split('T')[0],
            start: '19:00',
            end: '22:00',
            type: 'evening',
          });
        }
        current.setDate(current.getDate() + 1);
      }
      return NextResponse.json({
        freeTimeBlocks: blocks,
        suggestions: [
          '建议在周末上午9点到下午6点进行深度学习',
          '工作日晚上7点到10点是复习的好时机',
          '每天早起1小时可用于阅读和思考',
        ],
      });
    }

    // ============================================================
    // Reminder Actions
    // ============================================================
    if (action === 'reminder.get') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const reminder = await prisma.reminder.findFirst();
      await prisma.$disconnect();
      return NextResponse.json(reminder || { type: 'morning', time: '08:00', enabled: true });
    }

    if (action === 'reminder.update') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { type, time, enabled } = body as { type?: string; time?: string; enabled?: boolean };
      let reminder = await prisma.reminder.findFirst();
      if (reminder) {
        reminder = await prisma.reminder.update({
          where: { id: reminder.id },
          data: {
            type: type || reminder.type,
            time: time || reminder.time,
            enabled: enabled !== undefined ? enabled : reminder.enabled,
          },
        });
      } else {
        reminder = await prisma.reminder.create({
          data: {
            type: type || 'morning',
            time: time || '08:00',
            enabled: enabled !== undefined ? enabled : true,
          },
        });
      }
      await prisma.$disconnect();
      return NextResponse.json(reminder);
    }

    // ============================================================
    // Progress Actions
    // ============================================================
    if (action === 'progress.get') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const progress = await prisma.userProgress.findFirst();
      await prisma.$disconnect();
      return NextResponse.json(progress || {
        id: 'default',
        totalXP: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        totalGoalsCompleted: 0,
        totalTasksCompleted: 0,
      });
    }

    if (action === 'progress.updateStreak') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      let progress = await prisma.userProgress.findFirst();
      if (!progress) {
        progress = await prisma.userProgress.create({
          data: {
            id: 'default',
            totalXP: 0,
            level: 1,
            currentStreak: 1,
            longestStreak: 1,
            totalGoalsCompleted: 0,
            totalTasksCompleted: 0,
          },
        });
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastActive = progress.lastActiveDate ? new Date(progress.lastActiveDate) : null;
        let newStreak = progress.currentStreak;
        if (lastActive) {
          lastActive.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            newStreak = progress.currentStreak + 1;
          } else if (diffDays > 1) {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }
        const newLongest = Math.max(progress.longestStreak, newStreak);
        progress = await prisma.userProgress.update({
          where: { id: progress.id },
          data: {
            currentStreak: newStreak,
            longestStreak: newLongest,
            lastActiveDate: today,
          },
        });
      }
      await prisma.$disconnect();
      return NextResponse.json(progress);
    }

    // ============================================================
    // Skill Recommendation Actions
    // ============================================================
    if (action === 'recommend.skills') {
      await seedDefaultSkillNodes();
      const { goalId, limit } = body as { goalId?: string; limit?: number };
      const recommendations = await getSkillRecommendations(goalId, limit);
      return NextResponse.json({ recommendations });
    }

    if (action === 'recommend.paths') {
      await seedDefaultSkillNodes();
      const { goalId, limit } = body as { goalId?: string; limit?: number };
      const paths = await getLearningPathRecommendations(goalId, limit);
      return NextResponse.json({ paths });
    }

    if (action === 'recommend.profile') {
      const profile = await getUserSkillProfile();
      return NextResponse.json(profile);
    }

    if (action === 'recommend.updateMastery') {
      const { skillNodeId, delta } = body as { skillNodeId: string; delta: number };
      await updateSkillMastery(skillNodeId, delta);
      return NextResponse.json({ success: true });
    }

    if (action === 'recommend.seed') {
      await seedDefaultSkillNodes();
      return NextResponse.json({ success: true });
    }

    // ============================================================
    // Skill Tree Actions
    // ============================================================
    if (action === 'skillTree.nodes') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { category } = body as { category?: string };
      const where = category ? { category } : {};
      const nodes = await prisma.skillNode.findMany({ where, orderBy: { tier: 'asc' } });
      await prisma.$disconnect();
      return NextResponse.json(nodes);
    }

    if (action === 'skillTree.edges') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const edges = await prisma.skillEdge.findMany();
      await prisma.$disconnect();
      return NextResponse.json(edges);
    }

    if (action === 'skillTree.masteries') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const masteries = await prisma.skillMastery.findMany();
      await prisma.$disconnect();
      return NextResponse.json(masteries);
    }

    if (action === 'skillTree.updatePosition') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { id, positionX, positionY } = body as { id: string; positionX: number; positionY: number };
      const node = await prisma.skillNode.update({ where: { id }, data: { positionX, positionY } });
      await prisma.$disconnect();
      return NextResponse.json(node);
    }

    if (action === 'skillTree.updateMastery') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { skillNodeId, masteryScore } = body as { skillNodeId: string; masteryScore: number };
      const existing = await prisma.skillMastery.findUnique({ where: { skillNodeId } });
      if (existing) {
        await prisma.skillMastery.update({ where: { skillNodeId }, data: { masteryScore, lastPracticed: new Date(), practiceCount: { increment: 1 } } });
      } else {
        await prisma.skillMastery.create({ data: { skillNodeId, masteryScore, practiceCount: 1, lastPracticed: new Date() } });
      }
      await prisma.$disconnect();
      return NextResponse.json({ success: true });
    }

    // ============================================================
    // Classroom Actions
    // ============================================================
    if (action === 'classroom.scenes') {
      const locale = body.locale as string | undefined;
      const scenes = getSceneConfigs(locale);
      return NextResponse.json(scenes);
    }

    if (action === 'classroom.create') {
      const { topic, sceneType, teachingStyle, participantCount, locale } = body as {
        topic?: string;
        sceneType?: string;
        teachingStyle?: string;
        participantCount?: number;
        locale?: string;
      };
      const session = await createClassroomSession({
        topic: topic || '学习讨论',
        sceneType: (sceneType as 'lecture' | 'qa' | 'roundtable') || 'lecture',
        teachingStyle,
        participantCount,
        locale,
      });
      classroomSessions.set(session.id, session);
      return NextResponse.json(session);
    }

    if (action === 'classroom.message') {
      const { sessionId, userMessage, locale } = body as { sessionId: string; userMessage?: string; locale?: string };
      const session = classroomSessions.get(sessionId) as ClassroomSessionData | undefined;
      if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      const responses = await generateClassroomResponse(
        session as Parameters<typeof generateClassroomResponse>[0],
        userMessage,
        locale,
      );
      session.messages.push(...responses.map(m => ({ ...m, isUser: false })));
      if (userMessage) {
        const content = getLocaleContent(locale);
        session.messages.push({
          id: `user-${Date.now()}`,
          agentId: 'user',
          agentName: content.userLabel,
          agentRole: 'user',
          content: userMessage,
          timestamp: Date.now(),
          isUser: true,
        });
      }
      return NextResponse.json({ messages: responses });
    }

    if (action === 'classroom.history') {
      const { sessionId } = body as { sessionId: string };
      const session = classroomSessions.get(sessionId) as ClassroomSessionData | undefined;
      if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      return NextResponse.json(session.messages);
    }

    // ============================================================
    // Voice Assistant Actions
    // ============================================================
    if (action === 'voiceAssistant.greeting') {
      const { userName, style, pendingTasks, completedTasks, dailyProgress, clientHour, locale } = body as {
        userName?: string;
        style?: string;
        pendingTasks?: Array<{ title: string; goalTitle?: string }>;
        completedTasks?: Array<{ title: string; goalTitle?: string }>;
        dailyProgress?: number;
        clientHour?: number;
        locale?: 'zh' | 'en' | 'ja' | 'ko';
      };
      const { generateMorningGreeting } = await import('~/server/services/action3-voice-assistant.service');
      const greeting = await generateMorningGreeting({
        userName: userName || '朋友',
        style: style || 'guided',
        pendingTasks: pendingTasks || [],
        completedTasks: completedTasks || [],
        dailyProgress: dailyProgress || 0,
        clientHour: typeof clientHour === 'number' ? clientHour : undefined,
        locale: locale || 'zh',
      });
      return NextResponse.json({ text: greeting, shouldSpeak: true });
    }

    if (action === 'voiceAssistant.chat') {
      const { userMessage, context, history } = body as {
        userMessage: string;
        context?: {
          userName?: string;
          style?: string;
          pendingTasks?: Array<{ title: string; goalTitle?: string }>;
          completedTasks?: Array<{ title: string; goalTitle?: string }>;
          dailyProgress?: number;
        };
        history?: Array<{ id: string; role: string; content: string; timestamp: number }>;
      };
      if (!userMessage) return NextResponse.json({ error: 'userMessage is required' }, { status: 400 });
      const { generateConversationResponse } = await import('~/server/services/action3-voice-assistant.service');
      const response = await generateConversationResponse(
        userMessage,
        {
          userName: context?.userName || '朋友',
          style: context?.style || 'guided',
          pendingTasks: context?.pendingTasks || [],
          completedTasks: context?.completedTasks || [],
          dailyProgress: context?.dailyProgress || 0,
        },
        (history || []).map(m => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content, timestamp: m.timestamp })),
      );
      return NextResponse.json(response);
    }

    // ============================================================
    // Milestone Quiz Actions
    // ============================================================
    if (action === 'quiz.generate') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { goalId, milestoneIndex, keyConcepts } = body as {
        goalId: string;
        milestoneIndex: number;
        keyConcepts?: string[];
      };

      const goal = await prisma.goal.findUnique({
        where: { id: goalId },
        include: { milestones: { orderBy: { orderIndex: 'asc' } }, tasks: true },
      });
      await prisma.$disconnect();

      if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

      const milestone = goal.milestones[milestoneIndex];
      if (!milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });

      const msTasks = goal.tasks.filter(t => t.milestoneId === milestone.id)
        .map(t => ({ title: t.title, description: t.description }));

      const { generateMilestoneQuiz } = await import('~/server/services/action3-quiz.service');
      const assessmentId = `quiz-${goalId}-${milestoneIndex}-${Date.now()}`;
      const questions = await generateMilestoneQuiz(
        milestone.title,
        milestone.description || '',
        msTasks,
        keyConcepts,
        5,
      );

      return NextResponse.json({ assessmentId, questions });
    }

    if (action === 'quiz.submit') {
      const { goalId, milestoneIndex, assessmentId, questions, answers } = body as {
        goalId: string;
        milestoneIndex: number;
        assessmentId: string;
        questions: Array<{
          id: string;
          type: 'multiple_choice' | 'true_false' | 'short_answer';
          question: string;
          options?: string[];
          correctAnswer: string;
          explanation: string;
          difficulty: 'easy' | 'medium' | 'hard';
          topic: string;
        }>;
        answers: Record<string, string>;
      };

      const { submitMilestoneQuiz } = await import('~/server/services/action3-quiz.service');
      const result = await submitMilestoneQuiz(assessmentId, questions, answers);

      if (result.passed) {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        const goal = await prisma.goal.findUnique({
          where: { id: goalId },
          include: { milestones: { orderBy: { orderIndex: 'asc' }, include: { tasks: true } }, tasks: true },
        });

        if (goal) {
          const milestone = goal.milestones[milestoneIndex];
          if (milestone) {
            await prisma.milestone.update({
              where: { id: milestone.id },
              data: { progress: 100 },
            });

            if (milestoneIndex < goal.milestones.length - 1) {
              await prisma.milestone.update({
                where: { id: goal.milestones[milestoneIndex + 1].id },
                data: { progress: goal.milestones[milestoneIndex + 1].progress > 0 ? goal.milestones[milestoneIndex + 1].progress : 0 },
              });
            }
          }

          const allCompleted = goal.tasks.filter(t => t.status === 'completed').length;
          const totalTasks = goal.tasks.length;
          if (totalTasks > 0 && allCompleted === totalTasks) {
            await prisma.goal.update({
              where: { id: goalId },
              data: { status: 'completed', totalProgress: 100 },
            });
          }
        }
        await prisma.$disconnect();
      }

      return NextResponse.json(result);
    }

    // ============================================================
    // Anki Export Actions
    // ============================================================
    if (action === 'anki.export') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { goalId, milestoneIndex, keyConcepts } = body as {
        goalId: string;
        milestoneIndex: number;
        keyConcepts?: string[];
      };

      const goal = await prisma.goal.findUnique({
        where: { id: goalId },
        include: { milestones: { orderBy: { orderIndex: 'asc' } }, tasks: true },
      });
      await prisma.$disconnect();

      if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

      const milestone = goal.milestones[milestoneIndex];
      if (!milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });

      const msTasks = goal.tasks.filter(t => t.milestoneId === milestone.id)
        .map(t => ({ title: t.title, description: t.description }));

      const { generateAnkiCards } = await import('~/server/services/action3-anki.service');
      const result = await generateAnkiCards(milestone.title, goal.title, msTasks, keyConcepts);

      return NextResponse.json(result);
    }

    // ============================================================
// YouTube Content Extraction Actions
// ============================================================
    if (action === 'youtube.analyze') {
      const { url, goalTitle } = body as { url: string; goalTitle: string };
      if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 });

      const { analyzeYoutubeVideo } = await import('~/server/services/action3-content-extractor.service');
      const result = await analyzeYoutubeVideo(url, goalTitle || '');
      return NextResponse.json(result);
    }

    // ============================================================
    // Course Search Actions
    // ============================================================
    if (action === 'course.search') {
      const { searchCourses, getCourseCategories } = await import('~/server/services/action3-course.service');
      const { query, category } = body as { query?: string; category?: string };
      const results = await searchCourses(query, category);
      return NextResponse.json(results);
    }

    if (action === 'course.categories') {
      const { getCourseCategories } = await import('~/server/services/action3-course.service');
      const categories = getCourseCategories();
      return NextResponse.json({ categories });
    }

    // ============================================================
    // Goal/Milestone Resource Actions
    // ============================================================
    if (action === 'resource.listByGoal') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { goalId } = body as { goalId: string };
      const resources = await prisma.goalResource.findMany({
        where: { goalId },
        orderBy: { createdAt: 'asc' },
      });
      await prisma.$disconnect();
      return NextResponse.json(resources);
    }

    if (action === 'resource.listByMilestone') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { milestoneId } = body as { milestoneId: string };
      const resources = await prisma.milestoneResource.findMany({
        where: { milestoneId },
        orderBy: { createdAt: 'asc' },
      });
      await prisma.$disconnect();
      return NextResponse.json(resources);
    }

    if (action === 'resource.create') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { goalId, milestoneId, title, url, type } = body as {
        goalId?: string;
        milestoneId?: string;
        title: string;
        url: string;
        type: string;
      };

      if (milestoneId) {
        const resource = await prisma.milestoneResource.create({
          data: {
            milestoneId,
            title,
            url,
            type: type || 'article',
          },
        });
        await prisma.$disconnect();
        return NextResponse.json(resource);
      } else if (goalId) {
        const resource = await prisma.goalResource.create({
          data: {
            goalId,
            title,
            url,
            type: type || 'article',
          },
        });
        await prisma.$disconnect();
        return NextResponse.json(resource);
      }

      await prisma.$disconnect();
      return NextResponse.json({ error: 'goalId or milestoneId required' }, { status: 400 });
    }

    if (action === 'resource.delete') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { id, type } = body as { id: string; type: 'goal' | 'milestone' };

      if (type === 'milestone') {
        await prisma.milestoneResource.delete({ where: { id } });
      } else {
        await prisma.goalResource.delete({ where: { id } });
      }
      await prisma.$disconnect();
      return NextResponse.json({ success: true });
    }

    if (action === 'resource.addFromResearch') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const { goalId, milestoneId, resources } = body as {
        goalId?: string;
        milestoneId?: string;
        resources: Array<{ title: string; url: string; type: string }>;
      };

      const created: unknown[] = [];
      for (const r of resources) {
        if (milestoneId) {
          const resource = await prisma.milestoneResource.create({
            data: {
              milestoneId,
              title: r.title,
              url: r.url,
              type: r.type,
            },
          });
          created.push(resource);
        } else if (goalId) {
          const resource = await prisma.goalResource.create({
            data: {
              goalId,
              title: r.title,
              url: r.url,
              type: r.type,
            },
          });
          created.push(resource);
        }
      }
      await prisma.$disconnect();
      return NextResponse.json({ created });
    }

    return NextResponse.json({ error: 'Unknown action: ' + action }, { status: 400 });
  } catch (err) {
    console.error('[Action3 API Error]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
