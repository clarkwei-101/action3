/**
 * Action3 Voice Assistant Service
 * Provides AI-powered conversational voice assistant using DeepSeek API.
 * The assistant greets users, summarizes daily tasks, and provides encouragement.
 */

import { env } from '~/server/env.server';
import { OPENAI_API_PATHS } from '~/modules/llms/server/openai/openai.access';

const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_HOST = 'https://api.deepseek.com';

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
    throw new Error('DeepSeek API key not configured');
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
      temperature: 0.8,
      max_tokens: 1024,
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
// Types
// ============================================================

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ConversationContext {
  userName: string;
  style: string;
  pendingTasks: Array<{ title: string; goalTitle?: string }>;
  completedTasks: Array<{ title: string; goalTitle?: string }>;
  dailyProgress: number;
  /** Client-supplied local hour (0-23) so the greeting matches the user's wall clock. */
  clientHour?: number;
  /** Client-supplied locale for proper language-specific greetings. */
  locale?: 'zh' | 'en' | 'ja' | 'ko';
}

export interface AssistantResponse {
  text: string;
  shouldSpeak: boolean;
}

// ============================================================
// Style System Prompts
// ============================================================

const STYLE_PROMPTS: Record<string, { persona: string; voiceModifier: number; greeting: string }> = {
  guided: {
    persona: '你是一位温暖耐心的学习导师，语调平和，善于鼓励，用温和的方式引导用户完成学习任务。',
    voiceModifier: 1.0,
    greeting: '早上好',
  },
  indoctrination: {
    persona: '你是一位知识渊博的教授，语调专业严谨，信息密度高，喜欢深入讲解概念和原理。',
    voiceModifier: 0.9,
    greeting: '早安',
  },
  encouragement: {
    persona: '你是一位充满活力的激励教练，语调热情高昂，善于发现用户的优点并给予充分肯定。',
    voiceModifier: 1.1,
    greeting: '太棒了！早上好呀！',
  },
  strict: {
    persona: '你是一位严厉但公正的训练师，语调直接有力，对偷懒零容忍，但内心关心用户成长。',
    voiceModifier: 0.85,
    greeting: '早上好。准备好开始今天的任务了吗。',
  },
  first_principles: {
    persona: '你是一位苏格拉底式的导师，语调深沉，善于用追问的方式帮助用户从根本上思考问题。',
    voiceModifier: 0.95,
    greeting: '早上好。今天你想从哪个根本问题开始思考？',
  },
};

// ============================================================
// Morning Greeting Generator
// ============================================================

export async function generateMorningGreeting(context: ConversationContext): Promise<string> {
  const style = STYLE_PROMPTS[context.style] || STYLE_PROMPTS.guided;
      // Prefer the client-supplied local hour to avoid server timezone drift
      // (Vercel regions run in UTC, but the user expects greetings in their own time).
      const hour = typeof context.clientHour === 'number'
        ? context.clientHour
        : new Date().getHours();
      const userLocale =
        context.locale === 'en' ? 'en' : context.locale === 'ja' ? 'ja' : context.locale === 'ko' ? 'ko' : 'zh';

      const timeGreeting =
        hour >= 5 && hour < 12 ? { zh: '早上好', en: 'Good morning', ja: 'おはようございます', ko: '좋은 아침이에요' }[userLocale]
        : hour >= 12 && hour < 18 ? { zh: '下午好', en: 'Good afternoon', ja: 'こんにちは', ko: '좋은 오후입니다' }[userLocale]
        : hour >= 18 && hour < 23 ? { zh: '晚上好', en: 'Good evening', ja: 'こんばんは', ko: '좋은 저녁입니다' }[userLocale]
        : { zh: '夜深了', en: 'It is late', ja: '夜更かしです', ko: '늦은 시간입니다' }[userLocale];
      const styleGreeting = style.greeting;

  const pendingCount = context.pendingTasks.length;
  const completedCount = context.completedTasks.length;

  // Build a human-readable timestamp matching the client's local hour.
  // Use the client hour as the source of truth to keep the AI in sync.
  const localHour = typeof context.clientHour === 'number' ? context.clientHour : new Date().getHours();
  const timeLabel = (() => {
    if (localHour >= 5 && localHour < 12) return '上午';
    if (localHour >= 12 && localHour < 18) return '下午';
    if (localHour >= 18 && localHour < 23) return '晚上';
    return '深夜';
  })();

  const systemPrompt = `你是Action3学习助手${context.userName}的专属语音播报员。
${style.persona}

当前时段: ${timeLabel}（${localHour}点整，按用户本地时区）
今日进度: ${context.dailyProgress}%

请生成一段简短有力的早晨问候（不超过150字），内容包含：
1. 友好称呼
2. 当前时间
3. 今日任务概览（待完成${pendingCount}项，已完成${completedCount}项）
4. 根据学习风格${context.style}给予适当的激励

回复只包含问候文字，不要有其他格式标记。`;

  try {
    const result = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${timeGreeting}，${context.userName}。请开始早晨问候。` },
    ]);
    return result.trim();
  } catch {
    // Fallback greeting
    return `${timeGreeting}，${context.userName}！今天是崭新的一天。你有${pendingCount}项任务待完成，${completedCount}项已完成。加油，你一定可以做到的！`;
  }
}

// ============================================================
// Daily Task Summary
// ============================================================

export async function generateTaskSummary(context: ConversationContext): Promise<string> {
  const style = STYLE_PROMPTS[context.style] || STYLE_PROMPTS.guided;

  const pendingList = context.pendingTasks.map((t, i) => `${i + 1}. ${t.title}`).join('、') || '无';
  const completedList = context.completedTasks.map((t, i) => `${i + 1}. ${t.title}`).join('、') || '无';

  const systemPrompt = `你是Action3学习助手的语音播报员。
${style.persona}

今日任务状态：
- 待完成 (${context.pendingTasks.length}项): ${pendingList}
- 已完成 (${context.completedTasks.length}项): ${completedList}
- 整体进度: ${context.dailyProgress}%

请生成一段任务总结播报（不超过200字），用语音友好的方式呈现。不要使用特殊格式标记。`;

  try {
    return await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '请播报今日任务总结。' },
    ]);
  } catch {
    return `今日待完成任务共${context.pendingTasks.length}项：${pendingList}。已完成${context.completedTasks.length}项：${completedList}。`;
  }
}

// ============================================================
// Conversational Response
// ============================================================

export async function generateConversationResponse(
  userMessage: string,
  context: ConversationContext,
  history: ConversationMessage[],
): Promise<AssistantResponse> {
  const style = STYLE_PROMPTS[context.style] || STYLE_PROMPTS.guided;

  const pendingList = context.pendingTasks.map((t) => `- ${t.title}`).join('\n') || '无';
  const completedList = context.completedTasks.map((t) => `- ${t.title}`).join('\n') || '无';

  const historyText = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`)
    .join('\n');

  const systemPrompt = `你是Action3学习助手${context.userName}的专属语音助手。
${style.persona}

当前上下文：
- 用户名: ${context.userName}
- 学习风格: ${context.style}
- 今日进度: ${context.dailyProgress}%
- 待完成任务 (${context.pendingTasks.length}项):
${pendingList}
- 已完成任务 (${context.completedTasks.length}项):
${completedList}

对话历史：
${historyText || '（暂无历史记录）'}

重要规则：
1. 回复要简短（不超过100字），适合语音播报
2. 语气要符合当前学习风格
3. 如果用户问任务相关的问题，提供具体帮助
4. 如果用户想开始学习，给出具体建议
5. 如果用户遇到困难，给予支持和鼓励
6. 不要使用列表格式或特殊符号，用自然语言表达`;

  try {
    const result = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);
    return { text: result.trim(), shouldSpeak: true };
  } catch (err) {
    console.error('Voice assistant error:', err);
    return {
      text: '抱歉，我现在无法回答。请稍后再试。',
      shouldSpeak: true,
    };
  }
}

// ============================================================
// Style Configuration (for client-side use)
// ============================================================

export function getStyleConfig(style: string) {
  return STYLE_PROMPTS[style] || STYLE_PROMPTS.guided;
}
