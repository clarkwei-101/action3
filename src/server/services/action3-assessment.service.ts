/**
 * Action3 Assessment Service - AI-powered goal completion evaluation
 *
 * Phase 2: Evaluates whether users have genuinely achieved their learning goals
 * through multiple assessment modalities: AI-generated quizzes, project reviews,
 * and external validation sources (LeetCode, Coursera, etc.).
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
// Types
// ============================================================

export type AssessmentType = 'quiz' | 'project_review' | 'certification' | 'peer_review' | 'self_assessment';

export type AssessmentStatus = 'not_started' | 'in_progress' | 'completed' | 'passed' | 'failed';

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'code';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

export interface QuizResult {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

export interface AssessmentResult {
  assessmentId: string;
  assessmentType: AssessmentType;
  status: AssessmentStatus;
  score: number; // 0-100
  passed: boolean;
  quiz?: {
    questions: QuizQuestion[];
    results: QuizResult[];
    totalQuestions: number;
    correctCount: number;
    wrongCount: number;
    topicBreakdown: Record<string, { correct: number; total: number }>;
  };
  feedback: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    nextSteps: string[];
  };
  completedAt?: string;
  timeSpentMinutes?: number;
}

export interface AssessmentSummary {
  goalId: string;
  assessments: AssessmentResult[];
  overallScore: number;
  hasPassed: boolean;
  mostRecentAssessment?: AssessmentResult;
}

// ============================================================
// Quiz Generation
// ============================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function generateQuiz(
  goalTitle: string,
  topic?: string,
  difficulty?: 'easy' | 'medium' | 'hard',
  questionCount = 5,
): Promise<QuizQuestion[]> {
  const difficultyText = difficulty || 'medium';
  const topicText = topic || goalTitle;

  const prompt = `你是一位专业的技术教育评估专家。请为以下学习目标生成${questionCount}道测试题。

目标: ${goalTitle}
主题: ${topicText}
难度: ${difficultyText}
题数: ${questionCount}道

要求：
1. 覆盖该主题的核心知识点
2. 难度要适中（${difficultyText}）
3. 每道题必须包含正确答案和详细解析
4. 题型包括选择题、判断题、简答题
5. 题目要实用，能真实检验学习效果

请返回JSON格式的数组（只返回JSON，不要有任何其他文字）：
[
  {
    "id": "q1",
    "type": "multiple_choice|true_false|short_answer|code",
    "question": "题目内容",
    "options": ["A选项", "B选项", "C选项", "D选项"],
    "correctAnswer": "正确答案",
    "explanation": "详细解析",
    "difficulty": "${difficultyText}",
    "topic": "所属主题"
  }
]`;

  try {
    const result = await chatCompletion([
      {
        role: 'system',
        content: '你是一位专业的技术教育评估专家。你必须只返回JSON格式的题目数组，不要有任何其他文字前缀或后缀。',
      },
      { role: 'user', content: prompt },
    ]);

    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return parsed.map((q: Partial<QuizQuestion>, i: number) => ({
      id: q.id || `q${i + 1}`,
      type: q.type || 'multiple_choice',
      question: q.question || '',
      options: q.options || [],
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || '',
      difficulty: q.difficulty || difficultyText,
      topic: q.topic || topicText,
    }));
  } catch (err) {
    console.error('Quiz generation failed:', err);
    return generateFallbackQuiz(goalTitle, topicText, difficultyText, questionCount);
  }
}

function generateFallbackQuiz(goalTitle: string, topic: string, difficulty: string, count: number): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const keywords = goalTitle.split(/\s+/).filter(Boolean);

  for (let i = 0; i < count; i++) {
    questions.push({
      id: `q${i + 1}`,
      type: 'multiple_choice',
      question: `关于${topic}，以下哪项描述最准确？`,
      options: [
        `${keywords[0] || topic}是重要的核心技能`,
        `${keywords[0] || topic}仅适用于特定场景`,
        `${keywords[0] || topic}已被淘汰`,
        `${keywords[0] || topic}需要非常复杂的配置`,
      ],
      correctAnswer: `${keywords[0] || topic}是重要的核心技能`,
      explanation: `${goalTitle}的学习需要系统性的方法，理解核心概念比追求技巧更重要。`,
      difficulty: difficulty as 'easy' | 'medium' | 'hard',
      topic,
    });
  }
  return questions;
}

// ============================================================
// Answer Evaluation
// ============================================================

export async function evaluateAnswer(
  question: QuizQuestion,
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

  // For short_answer/code, use AI evaluation
  const prompt = `请评估用户对以下问题的回答是否正确。

题目: ${question.question}
正确答案: ${question.correctAnswer}
用户回答: ${userAnswer}
题型: ${question.type}

请返回JSON格式（只返回JSON）：
{
  "isCorrect": true或false,
  "score": 0-100之间的分数,
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
    return {
      isCorrect: false,
      score: 50,
      feedback: '评估服务暂时不可用，请稍后再试。',
    };
  }
}

// ============================================================
// Full Assessment Flow
// ============================================================

export interface AssessmentInput {
  goalId: string;
  goalTitle: string;
  assessmentType: AssessmentType;
  goalProgress?: number; // 0-100, from user's reported progress
  completedTasks?: string[]; // descriptions of completed tasks
  projectDescription?: string; // for project_review type
  onPhase?: (phase: { status: string; progress: number; message: string }) => void;
}

export async function runAssessment(input: AssessmentInput): Promise<AssessmentResult> {
  const { goalId, goalTitle, assessmentType, goalProgress = 0, completedTasks = [], projectDescription, onPhase } = input;
  const assessmentId = generateId();

  if (onPhase) onPhase({ status: 'generating', progress: 20, message: '准备评估材料...' });

  switch (assessmentType) {
    case 'quiz':
      return runQuizAssessment(assessmentId, goalTitle, goalProgress, completedTasks, onPhase);
    case 'project_review':
      return runProjectReview(assessmentId, goalTitle, projectDescription || '', completedTasks, onPhase);
    case 'self_assessment':
      return runSelfAssessment(assessmentId, goalTitle, goalProgress, completedTasks, onPhase);
    default:
      return runSelfAssessment(assessmentId, goalTitle, goalProgress, completedTasks, onPhase);
  }
}

async function runQuizAssessment(
  assessmentId: string,
  goalTitle: string,
  goalProgress: number,
  completedTasks: string[],
  onPhase?: (phase: { status: string; progress: number; message: string }) => void,
): Promise<AssessmentResult> {
  if (onPhase) onPhase({ status: 'generating', progress: 30, message: '生成测试题目...' });

  const questions = await generateQuiz(goalTitle, undefined, 'medium', 5);

  if (onPhase) onPhase({ status: 'generated', progress: 60, message: `已生成${questions.length}道题目` });

  // For now, return questions without auto-evaluation (user answers manually)
  const topicMap: Record<string, { correct: number; total: number }> = {};
  questions.forEach(q => {
    if (!topicMap[q.topic]) topicMap[q.topic] = { correct: 0, total: 0 };
    topicMap[q.topic].total++;
  });

  const result: AssessmentResult = {
    assessmentId,
    assessmentType: 'quiz',
    status: 'in_progress',
    score: 0,
    passed: false,
    quiz: {
      questions,
      results: [],
      totalQuestions: questions.length,
      correctCount: 0,
      wrongCount: 0,
      topicBreakdown: topicMap,
    },
    feedback: {
      summary: '',
      strengths: [],
      weaknesses: [],
      recommendations: [],
      nextSteps: [],
    },
  };

  if (onPhase) onPhase({ status: 'ready', progress: 80, message: '测试已准备就绪' });

  return result;
}

async function runProjectReview(
  assessmentId: string,
  goalTitle: string,
  projectDescription: string,
  completedTasks: string[],
  onPhase?: (phase: { status: string; progress: number; message: string }) => void,
): Promise<AssessmentResult> {
  if (onPhase) onPhase({ status: 'evaluating', progress: 30, message: '分析项目内容...' });

  const prompt = `请评估以下学习项目的完成情况。

目标: ${goalTitle}
项目描述: ${projectDescription || '无'}
已完成的任务: ${completedTasks.length > 0 ? completedTasks.join('、') : '无'}

请返回JSON格式的评估报告（只返回JSON）：
{
  "score": 0-100之间的分数,
  "passed": true或false,
  "feedback": {
    "summary": "总体评价摘要",
    "strengths": ["优点1", "优点2"],
    "weaknesses": ["不足1", "不足2"],
    "recommendations": ["改进建议1", "改进建议2"],
    "nextSteps": ["下一步1", "下一步2"]
  }
}`;

  try {
    const result = await chatCompletion([
      {
        role: 'system',
        content: '你是一位专业的技术项目评审专家。你必须只返回JSON格式的报告，不要有任何其他文字。',
      },
      { role: 'user', content: prompt },
    ]);

    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      assessmentId,
      assessmentType: 'project_review',
      status: 'completed',
      score: parsed.score || 50,
      passed: parsed.passed || false,
      feedback: parsed.feedback || {
        summary: parsed.summary || '',
        strengths: [],
        weaknesses: [],
        recommendations: [],
        nextSteps: [],
      },
      completedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Project review failed:', err);
    return {
      assessmentId,
      assessmentType: 'project_review',
      status: 'completed',
      score: 50,
      passed: false,
      feedback: {
        summary: '评估服务暂时不可用。请稍后再试。',
        strengths: [],
        weaknesses: [],
        recommendations: [],
        nextSteps: ['请确保所有任务都已标记为完成'],
      },
      completedAt: new Date().toISOString(),
    };
  }
}

async function runSelfAssessment(
  assessmentId: string,
  goalTitle: string,
  goalProgress: number,
  completedTasks: string[],
  onPhase?: (phase: { status: string; progress: number; message: string }) => void,
): Promise<AssessmentResult> {
  if (onPhase) onPhase({ status: 'evaluating', progress: 30, message: '分析学习进度...' });

  const prompt = `请评估以下学习目标的完成情况。

目标: ${goalTitle}
用户自报进度: ${goalProgress}%
已完成的任务: ${completedTasks.length > 0 ? completedTasks.join('、') : '无'}

请返回JSON格式的评估报告（只返回JSON）：
{
  "score": 0-100之间的综合评分,
  "passed": true或false,
  "feedback": {
    "summary": "总体评价摘要",
    "strengths": ["优点1", "优点2"],
    "weaknesses": ["不足1", "不足2"],
    "recommendations": ["改进建议1", "改进建议2"],
    "nextSteps": ["下一步1", "下一步2"]
  }
}`;

  try {
    const result = await chatCompletion([
      {
        role: 'system',
        content: '你是一位专业的发展评估专家。你必须只返回JSON格式的报告，不要有任何其他文字。',
      },
      { role: 'user', content: prompt },
    ]);

    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      assessmentId,
      assessmentType: 'self_assessment',
      status: 'completed',
      score: parsed.score || Math.round(goalProgress),
      passed: parsed.passed || (goalProgress >= 80),
      feedback: parsed.feedback || {
        summary: `你已经完成了${goalProgress}%的学习内容。`,
        strengths: [],
        weaknesses: [],
        recommendations: [],
        nextSteps: [],
      },
      completedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Self assessment failed:', err);
    return {
      assessmentId,
      assessmentType: 'self_assessment',
      status: 'completed',
      score: Math.round(goalProgress),
      passed: goalProgress >= 80,
      feedback: {
        summary: `当前进度: ${goalProgress}%。${goalProgress >= 80 ? '已达到通过标准。' : '继续加油！'}`,
        strengths: [],
        weaknesses: [],
        recommendations: [],
        nextSteps: [],
      },
      completedAt: new Date().toISOString(),
    };
  }
}

// ============================================================
// Submit Quiz Answers (for client-side evaluation)
// ============================================================

export async function submitQuizAnswers(
  assessmentId: string,
  questions: QuizQuestion[],
  answers: Record<string, string>,
): Promise<AssessmentResult> {
  const results: QuizResult[] = [];
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

  // Generate overall feedback
  const strengths = Object.entries(topicMap)
    .filter(([, v]) => v.correct / v.total >= 0.7)
    .map(([k]) => `${k}掌握良好`);

  const weaknesses = Object.entries(topicMap)
    .filter(([, v]) => v.correct / v.total < 0.7)
    .map(([k]) => `${k}需要加强`);

  return {
    assessmentId,
    assessmentType: 'quiz',
    status: passed ? 'passed' : 'failed',
    score,
    passed,
    quiz: {
      questions,
      results,
      totalQuestions,
      correctCount,
      wrongCount: totalQuestions - correctCount,
      topicBreakdown: topicMap,
    },
    feedback: {
      summary: `你完成了${totalQuestions}道测试，得分${score}分${passed ? '，已达到通过标准' : '，建议继续学习后重试'}。`,
      strengths,
      weaknesses,
      recommendations: weaknesses.map(w => `建议重点复习: ${w}`),
      nextSteps: passed
        ? ['可以进入下一个学习阶段', '尝试更具挑战性的项目']
        : ['回顾相关知识点', '完成更多练习题', '一周后重新测试'],
    },
    completedAt: new Date().toISOString(),
    timeSpentMinutes: 15,
  };
}
