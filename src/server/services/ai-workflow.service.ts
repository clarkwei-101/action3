import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type GoalStyle = 'guided' | 'indoctrination' | 'encouragement' | 'strict' | 'first_principles';

interface AIAnalysisResult {
  skills: string[];
  complexity: 'low' | 'medium' | 'high';
  estimatedHoursPerDay: number;
  reasoning: string;
}

interface MilestoneResult {
  title: string;
  description: string;
}

interface TaskSplitResult {
  title: string;
  description?: string;
  milestoneIndex: number;
  xpReward: number;
}

const STYLE_PROMPTS: Record<GoalStyle, { system: string; taskPrefix: string }> = {
  guided: {
    system: `你是一位耐心的导师，采用苏格拉底式提问法帮助用户理解目标。逐步引导，强调原理和基础，每一步都给出清晰的解释。语言温和，鼓励探索。`,
    taskPrefix: '学习',
  },
  indoctrination: {
    system: `你是一位知识渊博的专家，采用高密度灌输式教学。快速输出大量信息，强调重复和记忆。内容系统化、结构化，适合快速填充知识。`,
    taskPrefix: '掌握',
  },
  encouragement: {
    system: `你是一位热情洋溢的教练，积极反馈，强调进步和成就。使用鼓励性语言，庆祝每一个小成功，保持用户的热情和动力。`,
    taskPrefix: '突破',
  },
  strict: {
    system: `你是一位严格的导师，高标准要求，直接指出不足。不妥协于平庸，用严苛的标准推动用户超越自我。反馈直接、客观、不留情面。`,
    taskPrefix: '执行',
  },
  first_principles: {
    system: `你是一位深度思考者，采用第一性原理思维。从最基本的假设出发，逐层构建认知大厦。强调理解事物本质，拒绝表面知识。`,
    taskPrefix: '探究',
  },
};

export async function analyzeGoal(title: string, description: string | null | undefined, targetDays: number): Promise<AIAnalysisResult> {
  // Use the AI model to analyze the goal
  // Fallback to heuristic analysis if no AI is configured
  const keywordComplexity: Record<string, 'low' | 'medium' | 'high'> = {
    入门: 'low', 基础: 'low', 初级: 'low',
    学习: 'medium', 掌握: 'medium', 提升: 'medium',
    精通: 'high', 专家: 'high', 深度: 'high',
  };

  let complexity: 'low' | 'medium' | 'high' = 'medium';
  for (const [keyword, level] of Object.entries(keywordComplexity)) {
    if (title.includes(keyword) || (description ?? '').includes(keyword)) {
      complexity = level;
      break;
    }
  }

  const hourMap = { low: 1, medium: 2, high: 3 };
  const hoursPerDay = hourMap[complexity];

  const skills = extractSkills(title, description ?? '');

  return {
    skills,
    complexity,
    estimatedHoursPerDay: hoursPerDay,
    reasoning: `目标"${title}"被评估为${complexity === 'low' ? '简单' : complexity === 'medium' ? '中等难度' : '高难度'}学习项目，预计每天需要${hoursPerDay}小时，预计${targetDays}天完成。`,
  };
}

export async function generatePath(
  title: string,
  description: string | null | undefined,
  targetDays: number,
  style: GoalStyle,
  analysis: AIAnalysisResult,
): Promise<MilestoneResult[]> {
  const milestoneCount = Math.max(2, Math.min(6, Math.ceil(targetDays / 7)));
  const milestones: MilestoneResult[] = [];

  const styleConfig = STYLE_PROMPTS[style];

  for (let i = 0; i < milestoneCount; i++) {
    const phaseNames = style === 'first_principles'
      ? ['基础原理', '核心概念', '关键机制', '综合应用', '深度拓展', '精通']
      : style === 'guided'
      ? ['入门探索', '逐步深入', '系统学习', '强化巩固', '融会贯通', '全面掌握']
      : ['基础阶段', '进阶阶段', '提升阶段', '强化阶段', '突破阶段', '精通阶段'];

    milestones.push({
      title: phaseNames[i] || `阶段${i + 1}`,
      description: `${styleConfig.taskPrefix}${title}的${phaseNames[i]}，预计需要${Math.round(targetDays / milestoneCount)}天。`,
    });
  }

  return milestones;
}

export async function splitTasks(
  milestones: MilestoneResult[],
  targetDays: number,
  title: string,
  style: GoalStyle,
): Promise<TaskSplitResult[]> {
  const tasks: TaskSplitResult[] = [];
  const daysPerMilestone = Math.ceil(targetDays / milestones.length);

  for (let mIdx = 0; mIdx < milestones.length; mIdx++) {
    const tasksPerMilestone = Math.ceil(daysPerMilestone / 2);
    for (let t = 0; t < tasksPerMilestone; t++) {
      const dayOffset = mIdx * daysPerMilestone + Math.floor((t / tasksPerMilestone) * daysPerMilestone);
      if (dayOffset >= targetDays) continue;

      const taskTemplates = [
        `复习${milestones[mIdx].title}内容`,
        `完成${milestones[mIdx].title}练习`,
        `总结${milestones[mIdx].title}要点`,
        `实践${milestones[mIdx].title}相关技能`,
        `检验${milestones[mIdx].title}学习成果`,
      ];

      const xpRewards = [8, 10, 12, 15, 20];

      tasks.push({
        title: taskTemplates[t % taskTemplates.length],
        description: `${milestones[mIdx].description} - 第${dayOffset + 1}天任务`,
        milestoneIndex: mIdx,
        xpReward: xpRewards[t % xpRewards.length],
      });
    }
  }

  return tasks;
}

function extractSkills(title: string, description: string): string[] {
  const combined = `${title} ${description}`.toLowerCase();
  const skills: string[] = [];

  const skillKeywords = [
    'python', 'javascript', 'typescript', 'java', 'c++', 'rust', 'go',
    'react', 'vue', 'angular', 'node.js', 'next.js',
    'machine learning', 'deep learning', 'ai', 'nlp',
    'sql', 'database', 'postgresql', 'mongodb',
    'docker', 'kubernetes', 'aws', 'azure', 'gcp',
    'git', 'agile', 'scrum',
    'communication', 'leadership', 'management',
    'design', 'ux', 'ui', 'figma',
  ];

  for (const skill of skillKeywords) {
    if (combined.includes(skill)) {
      skills.push(skill);
    }
  }

  if (skills.length === 0) {
    skills.push('通用技能');
  }

  return skills.slice(0, 5);
}

export function getStylePrompt(style: GoalStyle): string {
  return STYLE_PROMPTS[style]?.system ?? STYLE_PROMPTS.guided.system;
}

export function calculateXPForLevel(level: number): number {
  return level * level * 100;
}

export function calculateLevelFromXP(totalXP: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXP / 100)));
}
