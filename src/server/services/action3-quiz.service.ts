/**
 * Action3 Quiz Service - AI-powered milestone quiz generation and evaluation
 * Generates quizzes based on milestone tasks, evaluates answers with DeepSeek.
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
  if (!DEEPSEEK_API_KEY)
    throw new Error('DeepSeek API key not configured. Set DEEPSEEK_API_KEY in .env');

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
// Types
// ============================================================

export interface MilestoneQuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

export interface MilestoneQuizResult {
  assessmentId: string;
  questions: MilestoneQuizQuestion[];
  score: number;
  passed: boolean;
  results: Array<{
    questionId: string;
    userAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }>;
  feedback: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    nextSteps: string[];
  };
}

// ============================================================
// Quiz Generation
// ============================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseQuizJson(raw: string): MilestoneQuizQuestion[] {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No JSON array found');
  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.map((q: Partial<MilestoneQuizQuestion>, i: number) => ({
    id: q.id || `q${i + 1}`,
    type: q.type || 'multiple_choice',
    question: q.question || '',
    options: q.options || [],
    correctAnswer: q.correctAnswer || '',
    explanation: q.explanation || '',
    difficulty: q.difficulty || 'medium',
    topic: q.topic || 'general',
  }));
}

export async function generateMilestoneQuiz(
  milestoneTitle: string,
  milestoneDescription: string,
  tasks: Array<{ title: string; description?: string | null }>,
  keyConcepts?: string[],
  questionCount = 5,
): Promise<MilestoneQuizQuestion[]> {
  const taskList = tasks.map((t, i) => `- ${t.title}${t.description ? `: ${t.description}` : ''}`).join('\n');
  const conceptList = keyConcepts?.length ? keyConcepts.join(', ') : '无';

  const prompt = `你是一位专业的技术教育评估专家。请为以下学习里程碑生成${questionCount}道测试题。

里程碑: ${milestoneTitle}
描述: ${milestoneDescription || '无'}
任务列表:
${taskList}
关键概念: ${conceptList}

要求：
1. 题目要测试真实理解，而非记忆
2. 多选题必须只有一个正确答案，4个选项
3. 判断题只判断对错
4. 每道题必须附带详细解析
5. 题型比例：60%选择题，25%判断题，15%简答题
6. 题目难度要适中，贴合任务内容

请返回JSON格式的题目数组（只返回JSON，不要有任何其他文字）：
[
  {
    "id": "q1",
    "type": "multiple_choice|true_false|short_answer",
    "question": "题目内容",
    "options": ["A选项", "B选项", "C选项", "D选项"],
    "correctAnswer": "正确答案",
    "explanation": "详细解析",
    "difficulty": "medium",
    "topic": "所属主题"
  }
]`;

  try {
    const response = await chatCompletion([
      {
        role: 'system',
        content: '你是一位专业的技术教育评估专家。你必须只返回JSON格式的题目数组，不要有任何其他文字前缀或后缀。',
      },
      { role: 'user', content: prompt },
    ]);
    return parseQuizJson(response);
  } catch (err) {
    console.error('[Quiz Service] Generation failed, using fallback:', err);
    return generateFallbackQuiz(milestoneTitle, tasks, questionCount);
  }
}

function generateFallbackQuiz(
  milestoneTitle: string,
  tasks: Array<{ title: string; description?: string | null }>,
  count: number,
): MilestoneQuizQuestion[] {
  const questions: MilestoneQuizQuestion[] = [];
  const topics = tasks.slice(0, 3).map(t => t.title);

  for (let i = 0; i < count; i++) {
    const topic = topics[i % topics.length];
    questions.push({
      id: `q${i + 1}`,
      type: 'multiple_choice',
      question: `关于"${topic}"，以下哪项描述最准确？`,
      options: [
        `"${topic}"是本里程碑的核心内容`,
        `"${topic}"只是一个可选内容`,
        `"${topic}"与本里程碑无关`,
        `"${topic}"已被淘汰`,
      ],
      correctAnswer: `"${topic}"是本里程碑的核心内容`,
      explanation: `${milestoneTitle}的核心在于理解关键概念，通过实践练习来巩固所学。`,
      difficulty: 'medium',
      topic,
    });
  }
  return questions;
}

// ============================================================
// Answer Evaluation
// ============================================================

async function evaluateAnswer(
  question: MilestoneQuizQuestion,
  userAnswer: string,
): Promise<{ isCorrect: boolean; score: number; feedback: string }> {
  if (question.type === 'multiple_choice' || question.type === 'true_false') {
    const isCorrect = userAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
    return {
      isCorrect,
      score: isCorrect ? 100 : 0,
      feedback: isCorrect ? '回答正确！' : `正确答案是: ${question.correctAnswer}`,
    };
  }

  const prompt = `请评估用户对以下问题的回答是否正确。

题目: ${question.question}
正确答案: ${question.correctAnswer}
用户回答: ${userAnswer}

请返回JSON格式（只返回JSON，不要有任何其他文字）：
{
  "isCorrect": true或false,
  "score": 0到100之间的分数,
  "feedback": "简短的反馈说明"
}`;

  try {
    const result = await chatCompletion([
      {
        role: 'system',
        content: '你是一位专业的技术评估专家。你必须只返回JSON格式的结果，不要有任何其他文字。',
      },
      { role: 'user', content: prompt },
    ]);
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { isCorrect: false, score: 50, feedback: '评估服务暂时不可用，请稍后再试。' };
  }
}

// ============================================================
// Quiz Submission & Scoring
// ============================================================

export async function submitMilestoneQuiz(
  assessmentId: string,
  questions: MilestoneQuizQuestion[],
  answers: Record<string, string>,
): Promise<MilestoneQuizResult> {
  const results: MilestoneQuizResult['results'] = [];
  let correctCount = 0;
  const topicMap: Record<string, { correct: number; total: number }> = {};

  for (const question of questions) {
    const userAnswer = answers[question.id] || '';
    const evaluation = await evaluateAnswer(question, userAnswer);

    results.push({
      questionId: question.id,
      userAnswer,
      isCorrect: evaluation.isCorrect,
      explanation: evaluation.score > 0 ? evaluation.feedback : question.explanation,
    });

    if (evaluation.isCorrect) correctCount++;

    if (!topicMap[question.topic]) topicMap[question.topic] = { correct: 0, total: 0 };
    topicMap[question.topic].total++;
    if (evaluation.isCorrect) topicMap[question.topic].correct++;
  }

  const totalQuestions = questions.length;
  const score = Math.round((correctCount / totalQuestions) * 100);
  const passed = score >= 70;

  const strengths = Object.entries(topicMap)
    .filter(([, v]) => v.correct / v.total >= 0.7)
    .map(([k]) => `${k}掌握良好`);

  const weaknesses = Object.entries(topicMap)
    .filter(([, v]) => v.correct / v.total < 0.7)
    .map(([k]) => `${k}需要加强`);

  return {
    assessmentId,
    questions,
    score,
    passed,
    results,
    feedback: {
      summary: `你完成了${totalQuestions}道测试，得分${score}分${passed ? '，已达到通过标准！' : '，建议继续学习后重试。'}`,
      strengths,
      weaknesses,
      recommendations: weaknesses.map(w => `建议重点复习: ${w}`),
      nextSteps: passed
        ? ['可以进入下一个学习阶段', '尝试更具挑战性的项目']
        : ['回顾相关知识点', '完成更多练习题', '一周后重新测试'],
    },
  };
}
