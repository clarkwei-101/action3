/**
 * Action PRO AI Service - Real LLM calls via DeepSeek API
 * Provides intelligent goal analysis, path generation, and task splitting.
 */

import { env } from '~/server/env.server';
import { OPENAI_API_PATHS } from '~/modules/llms/server/openai/openai.access';

const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_HOST = 'https://api.deepseek.com';

// ============================================================
// DeepSeek Chat Completion
// ============================================================

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

async function chatCompletion(messages: ChatMessage[], model = 'deepseek-chat'): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API key not configured. Set DEEPSEEK_API_KEY in .env');
  }

  const response = await fetch(DEEPSEEK_API_HOST + OPENAI_API_PATHS.chatCompletions, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${error}`);
  }

  const data: ChatCompletionResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}

// ============================================================
// Style System Prompts
// ============================================================

const STYLE_SYSTEM_PROMPTS: Record<string, string> = {
  guided: `你是一位耐心的导师，采用苏格拉底式提问法帮助用户理解目标。逐步引导，强调原理和基础，每一步都给出清晰的解释。语言温和，鼓励探索。`,
  indoctrination: `你是一位知识渊博的专家，采用高密度灌输式教学。快速输出大量信息，强调重复和记忆。内容系统化、结构化，适合快速填充知识。`,
  encouragement: `你是一位热情洋溢的教练，积极反馈，强调进步和成就。使用鼓励性语言，庆祝每一个小成功，保持用户的热情和动力。`,
  strict: `你是一位严格的导师，高标准要求，直接指出不足。不妥协于平庸，用严苛的标准推动用户超越自我。反馈直接、客观、不留情面。`,
  first_principles: `你是一位深度思考者，采用第一性原理思维。从最基本的假设出发，逐层构建认知大厦。强调理解事物本质，拒绝表面知识。`,
};

export type GoalStyle = 'guided' | 'indoctrination' | 'encouragement' | 'strict' | 'first_principles';

// ============================================================
// AI Goal Analysis
// ============================================================

interface AIAnalysisResult {
  skills: string[];
  complexity: 'low' | 'medium' | 'high';
  estimatedHoursPerDay: number;
  reasoning: string;
  webSearchTopics: string[];
}

export async function analyzeGoal(title: string, description: string | null | undefined, targetDays: number): Promise<AIAnalysisResult> {
  const style = STYLE_SYSTEM_PROMPTS.guided;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${style}\n\n你是一个专业的目标分析助手。分析用户的目标，评估其复杂度、技能需求，并给出合理的每日学习时长建议。`,
    },
    {
      role: 'user',
      content: `请分析以下目标：\n目标：${title}\n描述：${description || '无'}\n计划完成时间：${targetDays}天\n\n请以JSON格式返回分析结果，包含以下字段：\n- skills: 所需的技能列表（英文单词数组）\n- complexity: 复杂度 (low/medium/high)\n- estimatedHoursPerDay: 建议的每日学习小时数\n- reasoning: 分析理由（中文）\n- webSearchTopics: 建议搜索了解的话题（中文字符串数组，最多5个）\n\n只返回JSON，不要其他内容。`,
    },
  ];

  try {
    const response = await chatCompletion(messages);

    // Try to parse JSON from response
    let parsed: Partial<AIAnalysisResult> = {};
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        // Fall through to heuristic
      }
    }

    return {
      skills: parsed.skills || ['通用技能'],
      complexity: parsed.complexity || 'medium',
      estimatedHoursPerDay: parsed.estimatedHoursPerDay || 2,
      reasoning: parsed.reasoning || `目标"${title}"被评估为中等难度，预计${targetDays}天完成。`,
      webSearchTopics: parsed.webSearchTopics || [],
    };
  } catch (err) {
    // Fallback to heuristic if API fails
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
    return {
      skills: extractSkills(title, description ?? ''),
      complexity,
      estimatedHoursPerDay: hourMap[complexity],
      reasoning: `目标"${title}"被评估为${complexity === 'low' ? '简单' : complexity === 'medium' ? '中等难度' : '高难度'}学习项目，预计每天需要${hourMap[complexity]}小时，预计${targetDays}天完成。`,
      webSearchTopics: [],
    };
  }
}

// ============================================================
// AI Milestone Path Generation
// ============================================================

interface MilestoneResult {
  title: string;
  description: string;
}

export async function generatePath(
  title: string,
  description: string | null | undefined,
  targetDays: number,
  style: GoalStyle,
  analysis: AIAnalysisResult,
): Promise<MilestoneResult[]> {
  const milestoneCount = Math.max(2, Math.min(6, Math.ceil(targetDays / 7)));
  const stylePrompt = STYLE_SYSTEM_PROMPTS[style] || STYLE_SYSTEM_PROMPTS.guided;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${stylePrompt}\n\n你是一个专业的学习路径规划师。根据目标和风格，将目标拆分为${milestoneCount}个里程碑阶段。每个阶段应有递进性，从基础到深入。`,
    },
    {
      role: 'user',
      content: `请为以下目标设计${milestoneCount}个里程碑阶段：\n目标：${title}\n描述：${description || '无'}\n计划天数：${targetDays}天\n学习风格：${style}\n分析结果：${analysis.reasoning}\n\n请以JSON数组格式返回，每个里程碑包含：\n- title: 里程碑名称（如"基础入门"、"核心技能掌握"等）\n- description: 里程碑描述，说明该阶段要达成什么\n\n只返回JSON数组，不要其他内容。`,
    },
  ];

  try {
    const response = await chatCompletion(messages);

    // Try to parse JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed: MilestoneResult[] = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, milestoneCount);
        }
      } catch {
        // Fall through
      }
    }
  } catch (err) {
    // Fall through to heuristic
  }

  // Fallback to heuristic milestones
  const phaseNames = getPhaseNames(style, milestoneCount);
  return phaseNames.map((name, i) => ({
    title: name,
    description: `第${i + 1}阶段：${name}，预计需要${Math.round(targetDays / milestoneCount)}天。`,
  }));
}

// ============================================================
// AI Task Splitting
// ============================================================

interface TaskSplitResult {
  title: string;
  description?: string;
  milestoneIndex: number;
  xpReward: number;
}

export async function splitTasks(
  milestones: MilestoneResult[],
  targetDays: number,
  title: string,
  style: GoalStyle,
): Promise<TaskSplitResult[]> {
  const stylePrompt = STYLE_SYSTEM_PROMPTS[style] || STYLE_SYSTEM_PROMPTS.guided;
  const milestoneNames = milestones.map(m => m.title).join(' -> ');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${stylePrompt}\n\n你是一个专业的任务拆解专家。将每个里程碑阶段拆解为具体的每日任务，任务应具体、可操作、有挑战性。`,
    },
    {
      role: 'user',
      content: `请将以下目标的里程碑拆解为每日任务：\n目标：${title}\n里程碑：${milestoneNames}\n计划天数：${targetDays}天\n学习风格：${style}\n\n请为每个里程碑阶段生成3-5个具体任务，以JSON数组格式返回：\n- title: 任务名称（具体、可执行）\n- description: 任务描述（可选）\n- milestoneIndex: 对应的里程碑索引（0开始）\n- xpReward: 任务XP奖励（根据难度8-20）\n\n只返回JSON数组，不要其他内容。`,
    },
  ];

  try {
    const response = await chatCompletion(messages);

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed: TaskSplitResult[] = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Fall through
      }
    }
  } catch (err) {
    // Fall through
  }

  // Fallback to heuristic task splitting
  return heuristicSplitTasks(milestones, targetDays, title);
}

// ============================================================
// Helpers
// ============================================================

function getPhaseNames(style: GoalStyle, count: number): string[] {
  if (style === 'first_principles') {
    return ['基础原理', '核心概念', '关键机制', '综合应用', '深度拓展', '精通'];
  }
  if (style === 'guided') {
    return ['入门探索', '逐步深入', '系统学习', '强化巩固', '融会贯通', '全面掌握'];
  }
  return ['基础阶段', '进阶阶段', '提升阶段', '强化阶段', '突破阶段', '精通阶段'];
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

  return skills.length > 0 ? skills.slice(0, 5) : ['通用技能'];
}

function heuristicSplitTasks(
  milestones: MilestoneResult[],
  targetDays: number,
  title: string,
): TaskSplitResult[] {
  const tasks: TaskSplitResult[] = [];
  const daysPerMilestone = Math.ceil(targetDays / milestones.length);
  const xpRewards = [8, 10, 12, 15, 20];

  const taskTemplates = [
    '复习相关概念和基础理论',
    '完成实践练习和应用',
    '总结学习要点和笔记',
    '进行项目实战练习',
    '检验学习成果和查漏补缺',
  ];

  for (let mIdx = 0; mIdx < milestones.length; mIdx++) {
    for (let t = 0; t < Math.min(3, Math.ceil(daysPerMilestone / 3)); t++) {
      const dayOffset = mIdx * daysPerMilestone + Math.floor((t / 3) * daysPerMilestone);
      if (dayOffset >= targetDays) continue;

      tasks.push({
        title: `${milestones[mIdx].title} - ${taskTemplates[t % taskTemplates.length]}`,
        description: `${milestones[mIdx].title}的第${t + 1}个任务`,
        milestoneIndex: mIdx,
        xpReward: xpRewards[t % xpRewards.length],
      });
    }
  }

  return tasks;
}

// ============================================================
// Utility
// ============================================================

export function getStylePrompt(style: GoalStyle): string {
  return STYLE_SYSTEM_PROMPTS[style] || STYLE_SYSTEM_PROMPTS.guided;
}

export function calculateXPForLevel(level: number): number {
  return level * level * 100;
}

export function calculateLevelFromXP(totalXP: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXP / 100)));
}
