/**
 * Action PRO Skill Recommendation Service
 * Provides AI-powered personalized learning recommendations based on user goals,
 * current skill mastery, and learning history.
 */

import { env } from '~/server/env.server';
import { OPENAI_API_PATHS } from '~/modules/llms/server/openai/openai.access';
import { PrismaClient } from '@prisma/client';

const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_HOST = 'https://api.deepseek.com';

let _prisma: PrismaClient | undefined;
function getPrisma(): PrismaClient {
  if (!_prisma) _prisma = new PrismaClient();
  return _prisma;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: { role: string; content: string };
  }>;
}

async function chatCompletion(messages: ChatMessage[], model = 'deepseek-chat'): Promise<string> {
  if (!DEEPSEEK_API_KEY)
    throw new Error('DeepSeek API key not configured');

  const response = await fetch(DEEPSEEK_API_HOST + OPENAI_API_PATHS.chatCompletions, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 4096 }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${error}`);
  }

  const data: ChatCompletionResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}

// ============================================================
// Recommendation Result Types
// ============================================================

export interface SkillRecommendation {
  skillNodeId: string;
  skillId: string;
  title: string;
  description: string;
  difficulty: number;
  xpReward: number;
  reason: string;
  difficultyMatch: number; // 0-100 how well it matches user's level
  estimatedHours: number;
  resources: RecommendedResource[];
}

export interface RecommendedResource {
  title: string;
  url: string;
  type: 'article' | 'video' | 'exercise' | 'course';
}

export interface LearningPathRecommendation {
  pathId: string | null;
  title: string;
  description: string;
  totalXp: number;
  estimatedHours: number;
  skills: SkillRecommendation[];
  reason: string;
}

export interface UserSkillProfile {
  totalXp: number;
  level: number;
  completedGoals: number;
  activeGoals: number;
  masteredSkills: number;
  learningStreak: number;
  recentSkills: string[];
}

// ============================================================
// User Skill Profile Analysis
// ============================================================

export async function getUserSkillProfile(): Promise<UserSkillProfile> {
  const [userProgress, completedGoals, activeGoals, masteries] = await Promise.all([
    getPrisma().userProgress.findFirst(),
    getPrisma().goal.count({ where: { status: 'completed' } }),
    getPrisma().goal.count({ where: { status: 'active' } }),
    getPrisma().skillMastery.findMany({ where: { masteryScore: { gte: 80 } } }),
  ]);

  const recentTasks = await getPrisma().dailyTask.findMany({
    where: { status: 'completed' },
    orderBy: { completedAt: 'desc' },
    take: 10,
    select: { title: true },
  });

  return {
    totalXp: userProgress?.totalXP ?? 0,
    level: userProgress?.level ?? 1,
    completedGoals,
    activeGoals,
    masteredSkills: masteries.length,
    learningStreak: userProgress?.currentStreak ?? 0,
    recentSkills: recentTasks.map(t => t.title),
  };
}

// ============================================================
// AI-Powered Skill Recommendations
// ============================================================

export async function getSkillRecommendations(
  goalId?: string,
  limit = 5,
): Promise<SkillRecommendation[]> {
  const profile = await getUserSkillProfile();

  let targetSkills: string[] = [];
  let targetDescription = '';

  if (goalId) {
    const goal = await getPrisma().goal.findUnique({
      where: { id: goalId },
      include: { milestones: { orderBy: { orderIndex: 'asc' } } },
    });
    if (goal) {
      targetDescription = `${goal.title} ${goal.description ?? ''}`;
      const milestoneTitles = goal.milestones.map(m => m.title).join(', ');
      targetDescription += ` | Milestones: ${milestoneTitles}`;
    }
  }

  const existingNodes = await getPrisma().skillNode.findMany({ take: 50 });
  const existingMasteries = await getPrisma().skillMastery.findMany();

  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的个性化学习推荐引擎。基于用户的技能档案和目标，推荐最合适的下一步学习技能。

你需要从已有的技能节点中选择，或建议新的技能。返回JSON数组格式。
- skillId: 唯一技能标识符（英文，用连字符分隔，如 "react-hooks"）
- title: 技能中文名称
- description: 技能简短描述
- difficulty: 难度等级 1-3（1=入门, 2=进阶, 3=高级）
- xpReward: 完成后XP奖励（20-100）
- reason: 推荐理由（中文，20字以内）
- difficultyMatch: 与用户当前水平的匹配度 0-100
- estimatedHours: 预估学习时长（小时）
- resources: 推荐资源（最多3个，包含 title, url, type）

只返回JSON数组，不要其他内容。`,
      },
      {
        role: 'user',
        content: `用户档案：
- 等级: ${profile.level}级
- 总XP: ${profile.totalXp}
- 已完成目标: ${profile.completedGoals}
- 当前目标: ${profile.activeGoals}
- 已掌握技能: ${profile.masteredSkills}
- 学习连续: ${profile.learningStreak}天
- 最近学习: ${profile.recentSkills.slice(0, 5).join(', ') || '暂无'}

${goalId ? `当前目标描述: ${targetDescription}` : '暂无特定目标，通用推荐'}

已有技能节点（可选择）：${existingNodes.map(n => `${n.skillId}(${n.title})`).join(', ') || '暂无'}

已掌握技能: ${existingMasteries.filter(m => m.masteryScore >= 50).map(m => m.skillNodeId).join(', ') || '暂无'}

请推荐${limit}个最合适的技能，JSON数组格式。`,
      },
    ];

    const response = await chatCompletion(messages);
    return parseRecommendations(response, existingNodes, limit);
  } catch {
    return getFallbackRecommendations(profile, existingNodes, existingMasteries, limit);
  }
}

function parseRecommendations(
  response: string,
  existingNodes: { skillId: string; id: string; title: string; difficulty: number; xpReward: number }[],
  limit: number,
): SkillRecommendation[] {
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed.slice(0, limit).map((item: Record<string, unknown>, idx: number) => {
      const matched = existingNodes.find(n =>
        n.skillId === item.skillId || n.title === item.title,
      );

      return {
        skillNodeId: matched?.id ?? `new-${idx}-${Date.now()}`,
        skillId: String(item.skillId || item.title),
        title: String(item.title || '新技能'),
        description: String(item.description || ''),
        difficulty: Number(item.difficulty) || 1,
        xpReward: Number(item.xpReward) || 50,
        reason: String(item.reason || '推荐学习'),
        difficultyMatch: Number(item.difficultyMatch) || 70,
        estimatedHours: Number(item.estimatedHours) || 2,
        resources: (Array.isArray(item.resources) ? item.resources : []).slice(0, 3).map((r: Record<string, unknown>) => ({
          title: String(r.title || ''),
          url: String(r.url || ''),
          type: (['article', 'video', 'exercise', 'course'].includes(String(r.type)) ? r.type : 'article') as RecommendedResource['type'],
        })),
      };
    });
  } catch {
    return [];
  }
}

function getFallbackRecommendations(
  profile: UserSkillProfile,
  existingNodes: { skillId: string; id: string; title: string; description: string | null; difficulty: number; xpReward: number }[],
  masteries: { skillNodeId: string; masteryScore: number }[],
  limit: number,
): SkillRecommendation[] {
  const masteredIds = new Set(masteries.filter(m => m.masteryScore >= 80).map(m => m.skillNodeId));
  const inProgressIds = new Set(masteries.filter(m => m.masteryScore > 0 && m.masteryScore < 80).map(m => m.skillNodeId));

  const candidates = existingNodes.filter(n => !masteredIds.has(n.id) && !inProgressIds.has(n.id));
  const sorted = candidates.sort((a, b) => {
    const aDiff = Math.abs(a.difficulty - (profile.level <= 2 ? 1 : profile.level <= 5 ? 2 : 3));
    const bDiff = Math.abs(b.difficulty - (profile.level <= 2 ? 1 : profile.level <= 5 ? 2 : 3));
    return aDiff - bDiff;
  });

  const selected = sorted.slice(0, limit);
  if (selected.length >= limit) return selected.map(n => ({
    skillNodeId: n.id,
    skillId: n.skillId,
    title: n.title,
    description: n.description ?? '',
    difficulty: n.difficulty,
    xpReward: n.xpReward,
    reason: `适合${profile.level}级学习者`,
    difficultyMatch: Math.max(0, 100 - Math.abs(n.difficulty - (profile.level <= 2 ? 1 : profile.level <= 5 ? 2 : 3)) * 30),
    estimatedHours: n.difficulty * 2,
    resources: [],
  }));

  const fallbacks: SkillRecommendation[] = [
    { skillNodeId: `fallback-1`, skillId: 'javascript-fundamentals', title: 'JavaScript 基础', description: '掌握变量、函数、异步编程等核心概念', difficulty: 1, xpReward: 50, reason: '编程入门必备', difficultyMatch: 85, estimatedHours: 4, resources: [] },
    { skillNodeId: `fallback-2`, skillId: 'react-basics', title: 'React 基础', description: '组件、状态、Props 入门', difficulty: 2, xpReward: 80, reason: '主流前端框架', difficultyMatch: 75, estimatedHours: 6, resources: [] },
    { skillNodeId: `fallback-3`, skillId: 'typescript-essentials', title: 'TypeScript 入门', description: '类型系统与类型安全', difficulty: 2, xpReward: 70, reason: '提升代码质量', difficultyMatch: 80, estimatedHours: 5, resources: [] },
    { skillNodeId: `fallback-4`, skillId: 'nodejs-backend', title: 'Node.js 后端开发', description: 'Express + 数据库实战', difficulty: 3, xpReward: 100, reason: '全栈技能拓展', difficultyMatch: 60, estimatedHours: 8, resources: [] },
    { skillNodeId: `fallback-5`, skillId: 'ai-fundamentals', title: 'AI 基础概念', description: '机器学习核心原理与应用', difficulty: 2, xpReward: 90, reason: '紧跟技术趋势', difficultyMatch: 70, estimatedHours: 6, resources: [] },
  ];

  const existingIds = new Set(existingNodes.map(n => n.skillId));
  const fresh = fallbacks.filter(f => !existingIds.has(f.skillId));

  return [...selected.map(n => ({
    skillNodeId: n.id,
    skillId: n.skillId,
    title: n.title,
    description: n.description ?? '',
    difficulty: n.difficulty,
    xpReward: n.xpReward,
    reason: `适合${profile.level}级学习者`,
    difficultyMatch: Math.max(0, 100 - Math.abs(n.difficulty - (profile.level <= 2 ? 1 : profile.level <= 5 ? 2 : 3)) * 30),
    estimatedHours: n.difficulty * 2,
    resources: [],
  })), ...fresh].slice(0, limit);
}

// ============================================================
// Learning Path Recommendations
// ============================================================

export async function getLearningPathRecommendations(
  goalId?: string,
  limit = 3,
): Promise<LearningPathRecommendation[]> {
  const profile = await getUserSkillProfile();

  let goalTitle = '';
  if (goalId) {
    const goal = await getPrisma().goal.findUnique({ where: { id: goalId } });
    goalTitle = goal?.title ?? '';
  }

  const existingPaths = await getPrisma().learningPath.findMany({
    where: { isActive: true },
    include: { nodes: { orderBy: { orderIndex: 'asc' }, take: 10 } },
  });

  if (existingPaths.length === 0) {
    return getDefaultPathRecommendations(goalTitle, profile, limit);
  }

  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `你是一个学习路径规划专家。基于用户档案和目标，从已有学习路径中选择最合适的，或生成新的路径建议。

返回JSON数组格式：
- title: 路径名称
- description: 路径描述
- totalXp: 总XP奖励
- estimatedHours: 预估总时长（小时）
- reason: 选择/生成理由（中文）
- skills: 包含的技能列表（从已有路径或推荐技能中选取）

只返回JSON数组，不要其他内容。`,
      },
      {
        role: 'user',
        content: `用户等级: ${profile.level}级 | 已完成目标: ${profile.completedGoals} | 掌握技能: ${profile.masteredSkills}个
${goalTitle ? `目标: ${goalTitle}` : '无特定目标'}

已有学习路径：${existingPaths.map(p => `${p.title}(${p.nodes.length}个节点, ${p.xpTotal}XP)`).join(' | ')}

请推荐最合适的${limit}条学习路径。`,
      },
    ];

    const response = await chatCompletion(messages);
    return parsePathRecommendations(response, existingPaths, limit);
  } catch {
    return getDefaultPathRecommendations(goalTitle, profile, limit);
  }
}

function parsePathRecommendations(
  response: string,
  existingPaths: { id: string; title: string; description: string | null; xpTotal: number; nodes: { orderIndex: number; estimatedHours: number }[] }[],
  limit: number,
): LearningPathRecommendation[] {
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return getDefaultPathRecommendations('', { level: 1, totalXp: 0, completedGoals: 0, activeGoals: 0, masteredSkills: 0, learningStreak: 0, recentSkills: [] }, limit);

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return getDefaultPathRecommendations('', { level: 1, totalXp: 0, completedGoals: 0, activeGoals: 0, masteredSkills: 0, learningStreak: 0, recentSkills: [] }, limit);

    return parsed.slice(0, limit).map((item: Record<string, unknown>, idx: number) => {
      const matched = existingPaths.find(p => p.title === item.title);
      const hours = matched ? matched.nodes.reduce((sum, n) => sum + n.estimatedHours, 0) : Number(item.estimatedHours) || 10;

      return {
        pathId: matched?.id ?? `generated-${idx}`,
        title: String(item.title || '学习路径'),
        description: String(item.description || ''),
        totalXp: matched?.xpTotal ?? Number(item.totalXp) ?? 100,
        estimatedHours: hours,
        skills: (Array.isArray(item.skills) ? item.skills : []).slice(0, 5).map((s: Record<string, unknown>) => ({
          skillNodeId: String(s.skillNodeId || ''),
          skillId: String(s.skillId || ''),
          title: String(s.title || ''),
          description: String(s.description || ''),
          difficulty: Number(s.difficulty) || 1,
          xpReward: Number(s.xpReward) || 50,
          reason: String(s.reason || ''),
          difficultyMatch: Number(s.difficultyMatch) || 70,
          estimatedHours: Number(s.estimatedHours) || 2,
          resources: [],
        })),
        reason: String(item.reason || '推荐学习路径'),
      };
    });
  } catch {
    return getDefaultPathRecommendations('', { level: 1, totalXp: 0, completedGoals: 0, activeGoals: 0, masteredSkills: 0, learningStreak: 0, recentSkills: [] }, limit);
  }
}

function getDefaultPathRecommendations(
  goalTitle: string,
  profile: UserSkillProfile,
  limit: number,
): LearningPathRecommendation[] {
  const defaults = [
    {
      pathId: 'default-frontend',
      title: '前端开发路线',
      description: '从 HTML/CSS 基础到 React 全栈，掌握现代前端工程化',
      totalXp: 500,
      estimatedHours: 40,
      skills: [
        { skillNodeId: 'node-1', skillId: 'html-css-basics', title: 'HTML/CSS 基础', description: '', difficulty: 1, xpReward: 40, reason: '前端入门', difficultyMatch: 90, estimatedHours: 3, resources: [] },
        { skillNodeId: 'node-2', skillId: 'javascript-fundamentals', title: 'JavaScript 基础', description: '', difficulty: 1, xpReward: 50, reason: '核心语言', difficultyMatch: 85, estimatedHours: 5, resources: [] },
        { skillNodeId: 'node-3', skillId: 'react-basics', title: 'React 基础', description: '', difficulty: 2, xpReward: 80, reason: '主流框架', difficultyMatch: 75, estimatedHours: 8, resources: [] },
        { skillNodeId: 'node-4', skillId: 'typescript-essentials', title: 'TypeScript 入门', description: '', difficulty: 2, xpReward: 70, reason: '类型安全', difficultyMatch: 80, estimatedHours: 6, resources: [] },
        { skillNodeId: 'node-5', skillId: 'nextjs-basics', title: 'Next.js 基础', description: '', difficulty: 3, xpReward: 100, reason: '全栈能力', difficultyMatch: 60, estimatedHours: 10, resources: [] },
      ],
      reason: '经典前端学习路径',
    },
    {
      pathId: 'default-ai',
      title: 'AI/ML 学习路线',
      description: '从 Python 基础到机器学习实战，入门人工智能领域',
      totalXp: 600,
      estimatedHours: 50,
      skills: [
        { skillNodeId: 'ai-1', skillId: 'python-basics', title: 'Python 基础', description: '', difficulty: 1, xpReward: 40, reason: 'AI 首选语言', difficultyMatch: 90, estimatedHours: 4, resources: [] },
        { skillNodeId: 'ai-2', skillId: 'python-data', title: 'Python 数据处理', description: '', difficulty: 2, xpReward: 60, reason: '数据科学基础', difficultyMatch: 80, estimatedHours: 6, resources: [] },
        { skillNodeId: 'ai-3', skillId: 'ml-fundamentals', title: '机器学习基础', description: '', difficulty: 2, xpReward: 100, reason: 'AI 核心', difficultyMatch: 70, estimatedHours: 12, resources: [] },
        { skillNodeId: 'ai-4', skillId: 'dl-fundamentals', title: '深度学习基础', description: '', difficulty: 3, xpReward: 120, reason: '神经网络', difficultyMatch: 60, estimatedHours: 14, resources: [] },
        { skillNodeId: 'ai-5', skillId: 'llm-usage', title: '大模型使用', description: '', difficulty: 2, xpReward: 80, reason: '应用落地', difficultyMatch: 75, estimatedHours: 8, resources: [] },
      ],
      reason: 'AI 时代必备技能',
    },
    {
      pathId: 'default-backend',
      title: '后端开发路线',
      description: '从 Node.js 到微服务，构建可扩展的后端系统',
      totalXp: 550,
      estimatedHours: 45,
      skills: [
        { skillNodeId: 'be-1', skillId: 'javascript-fundamentals', title: 'JavaScript 基础', description: '', difficulty: 1, xpReward: 50, reason: '后端语言基础', difficultyMatch: 85, estimatedHours: 5, resources: [] },
        { skillNodeId: 'be-2', skillId: 'nodejs-basics', title: 'Node.js 基础', description: '', difficulty: 2, xpReward: 70, reason: '后端入门', difficultyMatch: 80, estimatedHours: 8, resources: [] },
        { skillNodeId: 'be-3', skillId: 'express-backend', title: 'Express 框架', description: '', difficulty: 2, xpReward: 80, reason: 'API 开发', difficultyMatch: 75, estimatedHours: 6, resources: [] },
        { skillNodeId: 'be-4', skillId: 'database-design', title: '数据库设计', description: '', difficulty: 2, xpReward: 90, reason: '数据持久化', difficultyMatch: 70, estimatedHours: 10, resources: [] },
        { skillNodeId: 'be-5', skillId: 'api-design', title: 'RESTful API 设计', description: '', difficulty: 3, xpReward: 100, reason: '接口设计能力', difficultyMatch: 65, estimatedHours: 8, resources: [] },
      ],
      reason: '全栈能力进阶',
    },
  ];

  if (goalTitle) {
    if (goalTitle.toLowerCase().includes('前端') || goalTitle.toLowerCase().includes('react') || goalTitle.toLowerCase().includes('web')) {
      return defaults.slice(0, limit);
    }
    if (goalTitle.toLowerCase().includes('ai') || goalTitle.toLowerCase().includes('机器学习') || goalTitle.toLowerCase().includes('python')) {
      return [defaults[1], defaults[0], defaults[2]].slice(0, limit);
    }
    if (goalTitle.toLowerCase().includes('后端') || goalTitle.toLowerCase().includes('node') || goalTitle.toLowerCase().includes('api')) {
      return [defaults[2], defaults[0], defaults[1]].slice(0, limit);
    }
  }

  return defaults.slice(0, limit);
}

// ============================================================
// Mastery Tracking
// ============================================================

export async function updateSkillMastery(
  skillNodeId: string,
  delta: number,
): Promise<void> {
  const mastery = await getPrisma().skillMastery.findUnique({ where: { skillNodeId } });

  if (mastery) {
    const newScore = Math.min(100, Math.max(0, mastery.masteryScore + delta));
    const wasNotMastered = mastery.masteryScore < 80 && newScore >= 80;
    await getPrisma().skillMastery.update({
      where: { skillNodeId },
      data: {
        masteryScore: newScore,
        practiceCount: { increment: 1 },
        lastPracticed: new Date(),
        firstMastered: wasNotMastered ? new Date() : mastery.firstMastered,
      },
    });
  } else {
    const newScore = Math.min(100, Math.max(0, delta));
    await getPrisma().skillMastery.create({
      data: {
        skillNodeId,
        masteryScore: newScore,
        practiceCount: 1,
        lastPracticed: new Date(),
        firstMastered: newScore >= 80 ? new Date() : null,
      },
    });
  }
}

// ============================================================
// Skill Tree Seeding
// ============================================================

export async function seedDefaultSkillNodes(): Promise<void> {
  const count = await getPrisma().skillNode.count();
  if (count > 0) return;

  const defaultNodes = [
    { skillId: 'html-css-basics', title: 'HTML/CSS 基础', description: '网页结构与样式基础', difficulty: 1, tier: 0, xpReward: 40, icon: 'code', isRoot: true, positionX: 400, positionY: 50, category: 'frontend' },
    { skillId: 'javascript-fundamentals', title: 'JavaScript 基础', description: '变量、函数、异步编程', difficulty: 1, tier: 1, xpReward: 50, icon: 'code', isRoot: false, positionX: 250, positionY: 180, category: 'frontend' },
    { skillId: 'react-basics', title: 'React 基础', description: '组件、状态、Props', difficulty: 2, tier: 2, xpReward: 80, icon: 'atom', isRoot: false, positionX: 100, positionY: 310, category: 'frontend' },
    { skillId: 'react-hooks', title: 'React Hooks', description: 'useState, useEffect, 自定义 Hooks', difficulty: 2, tier: 3, xpReward: 90, icon: 'atom', isRoot: false, positionX: 50, positionY: 440, category: 'frontend' },
    { skillId: 'typescript-essentials', title: 'TypeScript 入门', description: '类型系统与类型安全', difficulty: 2, tier: 2, xpReward: 70, icon: 'lock', isRoot: false, positionX: 300, positionY: 310, category: 'frontend' },
    { skillId: 'nextjs-basics', title: 'Next.js 基础', description: 'SSR、路由、API 路由', difficulty: 3, tier: 3, xpReward: 100, icon: 'rocket', isRoot: false, positionX: 250, positionY: 440, category: 'frontend' },
    { skillId: 'nodejs-basics', title: 'Node.js 基础', description: '服务器端 JavaScript', difficulty: 2, tier: 0, xpReward: 60, icon: 'server', isRoot: true, positionX: 700, positionY: 50, category: 'backend' },
    { skillId: 'express-backend', title: 'Express 框架', description: 'RESTful API 开发', difficulty: 2, tier: 1, xpReward: 80, icon: 'server', isRoot: false, positionX: 700, positionY: 180, category: 'backend' },
    { skillId: 'database-design', title: '数据库设计', description: 'SQL 与 NoSQL 实战', difficulty: 2, tier: 2, xpReward: 90, icon: 'database', isRoot: false, positionX: 700, positionY: 310, category: 'backend' },
    { skillId: 'python-basics', title: 'Python 基础', description: 'Python 编程入门', difficulty: 1, tier: 0, xpReward: 40, icon: 'code', isRoot: true, positionX: 1000, positionY: 50, category: 'ai' },
    { skillId: 'python-data', title: 'Python 数据处理', description: 'NumPy, Pandas 入门', difficulty: 2, tier: 1, xpReward: 60, icon: 'chart', isRoot: false, positionX: 1000, positionY: 180, category: 'ai' },
    { skillId: 'ml-fundamentals', title: '机器学习基础', description: 'scikit-learn 入门', difficulty: 2, tier: 2, xpReward: 100, icon: 'brain', isRoot: false, positionX: 1000, positionY: 310, category: 'ai' },
    { skillId: 'dl-fundamentals', title: '深度学习基础', description: '神经网络核心原理', difficulty: 3, tier: 3, xpReward: 120, icon: 'brain', isRoot: false, positionX: 1000, positionY: 440, category: 'ai' },
    { skillId: 'llm-usage', title: '大模型使用', description: 'Prompt 工程与 API 调用', difficulty: 2, tier: 2, xpReward: 80, icon: 'zap', isRoot: false, positionX: 850, positionY: 310, category: 'ai' },
    { skillId: 'ai-fundamentals', title: 'AI 基础概念', description: 'AI/ML/DL 核心概念', difficulty: 1, tier: 0, xpReward: 50, icon: 'brain', isRoot: true, positionX: 850, positionY: 50, category: 'ai' },
  ];

  for (const node of defaultNodes) {
    await getPrisma().skillNode.create({ data: node });
  }

  const nodes = await getPrisma().skillNode.findMany();
  const nodeMap = new Map(nodes.map(n => [n.skillId, n.id]));

  const edges = [
    { from: 'javascript-fundamentals', to: 'react-basics', strength: 2 },
    { from: 'react-basics', to: 'react-hooks', strength: 2 },
    { from: 'javascript-fundamentals', to: 'typescript-essentials', strength: 1 },
    { from: 'typescript-essentials', to: 'nextjs-basics', strength: 1 },
    { from: 'react-basics', to: 'nextjs-basics', strength: 1 },
    { from: 'nodejs-basics', to: 'express-backend', strength: 2 },
    { from: 'express-backend', to: 'database-design', strength: 2 },
    { from: 'python-basics', to: 'python-data', strength: 2 },
    { from: 'python-data', to: 'ml-fundamentals', strength: 2 },
    { from: 'ml-fundamentals', to: 'dl-fundamentals', strength: 2 },
    { from: 'ai-fundamentals', to: 'llm-usage', strength: 1 },
    { from: 'python-basics', to: 'ai-fundamentals', strength: 1 },
    { from: 'python-data', to: 'ai-fundamentals', strength: 1 },
  ];

  for (const edge of edges) {
    const fromId = nodeMap.get(edge.from);
    const toId = nodeMap.get(edge.to);
    if (fromId && toId) {
      await getPrisma().skillEdge.create({
        data: { prerequisiteId: fromId, dependentId: toId, strength: edge.strength },
      });
    }
  }
}
