/**
 * Action3 Anki Service - AI-powered Anki flashcard generation
 * Generates QA pairs from milestone tasks and exports as Anki-compatible TSV.
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
}

async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  if (!DEEPSEEK_API_KEY)
    throw new Error('DeepSeek API key not configured. Set DEEPSEEK_API_KEY in .env');

  const response = await fetch(DEEPSEEK_API_HOST + OPENAI_API_PATHS.chatCompletions, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'deepseek-chat', messages, temperature: 0.7, max_tokens: 4096 }),
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

export interface AnkiCard {
  front: string;
  back: string;
  tags: string[];
}

export interface AnkiExportResult {
  deckName: string;
  cards: AnkiCard[];
  tsvContent: string;
  cardCount: number;
}

// ============================================================
// Card Generation
// ============================================================

interface FlashcardJson {
  front: string;
  back: string;
  tags: string[];
}

function parseCardsJson(raw: string): FlashcardJson[] {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No JSON array found in response');
  return JSON.parse(jsonMatch[0]);
}

function escapeTsvField(value: string): string {
  return value.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/"/g, "'");
}

export async function generateAnkiCards(
  milestoneTitle: string,
  goalTitle: string,
  tasks: Array<{ title: string; description?: string | null }>,
  keyConcepts?: string[],
): Promise<AnkiExportResult> {
  const taskList = tasks.map((t, i) => `${i + 1}. ${t.title}${t.description ? `\n   描述: ${t.description}` : ''}`).join('\n');
  const conceptList = keyConcepts?.length ? keyConcepts.join('\n') : '无';

  const prompt = `你是一位专业的学习教练，擅长将学习内容转化为高效的间隔重复记忆卡。

请为以下学习里程碑生成Anki闪卡：

里程碑: ${milestoneTitle}
目标: ${goalTitle}

任务列表:
${taskList}

关键概念:
${conceptList}

生成规则：
1. 卡牌类型包含三种：Definition（定义类）、Recall（回忆类）、Application（应用类）
2. 配比：3张Definition + 4张Recall + 3张Application = 10张/里程碑
3. Front（正面）要清晰、简洁，适合快速回忆
4. Back（背面）要准确、完整
5. Tags格式："{目标slug};{里程碑索引};{卡牌类型}"，用英文小写

请返回JSON格式的闪卡数组（只返回JSON，不要有任何其他文字）：
[
  {
    "front": "正面问题",
    "back": "背面答案",
    "tags": ["goal-slug", "milestone-1", "definition"]
  }
]`;

  let cards: FlashcardJson[];
  try {
    const response = await chatCompletion([
      {
        role: 'system',
        content: '你是一位专业的学习教练。你必须只返回JSON格式的闪卡数组，不要有任何其他文字前缀或后缀。',
      },
      { role: 'user', content: prompt },
    ]);
    cards = parseCardsJson(response);
  } catch (err) {
    console.error('[Anki Service] Card generation failed, using fallback:', err);
    cards = generateFallbackCards(tasks);
  }

  const deckName = `${escapeTsvField(goalTitle)}_${escapeTsvField(milestoneTitle)}`;
  const ankiCards: AnkiCard[] = cards.map(c => ({
    front: escapeTsvField(c.front || ''),
    back: escapeTsvField(c.back || ''),
    tags: c.tags || [],
  }));

  const tsvLines = ankiCards.map(c => {
    const tagsStr = c.tags.join(';');
    return `${c.front}\t${c.back}\t${tagsStr}`;
  });

  return {
    deckName,
    cards: ankiCards,
    tsvContent: `Front\tBack\tTags\n${tsvLines.join('\n')}`,
    cardCount: ankiCards.length,
  };
}

function generateFallbackCards(
  tasks: Array<{ title: string; description?: string | null }>,
): FlashcardJson[] {
  return tasks.slice(0, 10).map((t, i) => ({
    front: `任务"${t.title}"的核心目标是什么？`,
    back: t.description || `完成"${t.title}"这个任务需要掌握相关的核心技能和知识点。`,
    tags: ['action3', 'milestone', 'recall'],
  }));
}
