/**
 * Action3 Research Service - AI-powered goal research with web search
 *
 * Phase 1: Analyzes user goals using DeepSeek + web search to gather
 * authoritative resources, categorize them, and generate a structured research report.
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

export interface ResourceLink {
  title: string;
  url: string;
  type: 'documentation' | 'video' | 'course' | 'article' | 'project' | 'community';
  description: string;
  authority: 'official' | 'trusted' | 'community' | 'general';
}

export interface ResearchPhase {
  status: 'pending' | 'scraping' | 'analyzing' | 'done' | 'error';
  progress: number; // 0-100
  message: string;
}

export interface ResearchReport {
  goalTitle: string;
  goalDescription: string;
  summary: string; // 2-3 sentence overview
  resources: ResourceLink[];
  keyConcepts: string[]; // Top 5-8 key concepts to master
  commonPitfalls: string[]; // 3-5 common mistakes beginners make
  industryContext: string; // Why this skill matters, market context
  recommendedPrerequisites: string[]; // What to learn first
  effortEstimate: {
    beginnerHours: number;
    intermediateHours: number;
    advancedHours: number;
  };
  phases: Array<{
    phase: number;
    name: string;
    duration: string;
    description: string;
    keyOutcomes: string[];
  }>;
  rawInsights?: string; // Original AI analysis text
}

// ============================================================
// Web Search (DuckDuckGo instant answer API - no API key required)
// ============================================================

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function searchWeb(query: string, maxResults = 8): Promise<SearchResult[]> {
  try {
    // Use DuckDuckGo HTML search for lightweight scraping
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodedQuery}&kl=wt-wt`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Action3Research/1.0)',
        },
      },
    );

    if (!response.ok) {
      return [];
    }

    const html = await response.text();

    // Simple regex extraction of search results
    const results: SearchResult[] = [];
    const resultRegex = /<a class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match;

    while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
      const url = match[1];
      const title = match[2].replace(/<[^>]*>/g, '').trim();
      const snippet = match[3].replace(/<[^>]*>/g, '').trim();
      if (url && title && !url.includes('duckduckgo')) {
        results.push({ title, url, snippet });
      }
    }

    return results.slice(0, maxResults);
  } catch {
    return [];
  }
}

// ============================================================
// Resource Classification
// ============================================================

function classifyResource(url: string, title: string): ResourceLink['type'] {
  const u = url.toLowerCase();
  const t = title.toLowerCase();

  if (u.includes('youtube.com') || u.includes('youtu.be') || u.includes('bilibili.com') || u.includes('video')) {
    return 'video';
  }
  if (u.includes('coursera') || u.includes('udemy') || u.includes('edx') || u.includes('udacity') || u.includes('pluralsight') || u.includes('linkedin.com/learning')) {
    return 'course';
  }
  if (u.includes('github.com') || u.includes('gitlab.com') || u.includes('replit') || u.includes('codepen') || u.includes('stackblitz')) {
    return 'project';
  }
  if (u.includes('stackoverflow.com') || u.includes('reddit.com') || u.includes('discord.com') || u.includes('dev.to') || u.includes('hashnode') || u.includes('v2ex')) {
    return 'community';
  }
  if (u.includes('docs.') || u.includes('documentation') || u.includes('reference') || u.includes('.io/docs') || u.includes('mdn') || u.includes('w3.org') || u.includes('python.org') || u.includes('devdocs')) {
    return 'documentation';
  }
  return 'article';
}

function classifyAuthority(url: string): ResourceLink['authority'] {
  const u = url.toLowerCase();
  if (
    u.includes('github.com/microsoft') || u.includes('github.com/google') ||
    u.includes('github.com/facebook') || u.includes('github.com/aws') ||
    u.includes('docs.python.org') || u.includes('docs.microsoft.com') ||
    u.includes('developer.mozilla.org') || u.includes('kubernetes.io') ||
    u.includes('typescriptlang.org')
  ) {
    return 'official';
  }
  if (
    u.includes('freecodecamp.org') || u.includes('theodinproject') ||
    u.includes('roadmap.sh') || u.includes('developer.mozilla.org') ||
    u.includes('css-tricks.com') || u.includes('javascript.info') ||
    u.includes('react.dev') || u.includes('vuejs.org') || u.includes('svelte.dev')
  ) {
    return 'trusted';
  }
  if (u.includes('reddit.com') || u.includes('stackoverflow.com') || u.includes('v2ex')) {
    return 'community';
  }
  return 'general';
}

// ============================================================
// Main Research Function
// ============================================================

export interface ResearchInput {
  goalTitle: string;
  goalDescription?: string;
  onPhase?: (phase: ResearchPhase) => void;
}

export async function researchGoal(input: ResearchInput): Promise<ResearchReport> {
  const { goalTitle, goalDescription, onPhase } = input;

  const report: Partial<ResearchReport> = {
    goalTitle,
    goalDescription: goalDescription || '',
    resources: [],
    keyConcepts: [],
    commonPitfalls: [],
    industryContext: '',
    recommendedPrerequisites: [],
    effortEstimate: { beginnerHours: 0, intermediateHours: 0, advancedHours: 0 },
    phases: [],
  };

  // Phase 1: Web Search
  if (onPhase) onPhase({ status: 'scraping', progress: 10, message: '搜索相关资源...' });
  const searchQueries = [
    goalTitle,
    `${goalTitle} 入门教程`,
    `${goalTitle} 学习路线`,
    `${goalTitle} 权威资料`,
  ];

  const allResults: SearchResult[] = [];
  for (const q of searchQueries) {
    const results = await searchWeb(q, 5);
    allResults.push(...results);
  }

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const uniqueResults = allResults.filter((r) => {
    if (seenUrls.has(r.url)) return false;
    seenUrls.add(r.url);
    return true;
  }).slice(0, 12);

  report.resources = uniqueResults.map((r) => ({
    title: r.title,
    url: r.url,
    description: r.snippet.replace(/<[^>]*>/g, '').slice(0, 150),
    type: classifyResource(r.url, r.title),
    authority: classifyAuthority(r.url),
  }));

  if (onPhase) onPhase({ status: 'analyzing', progress: 50, message: '分析资源内容...' });

  // Phase 2: DeepSeek AI Analysis
  const searchContext = uniqueResults
    .slice(0, 6)
    .map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   摘要: ${r.snippet.slice(0, 100)}`)
    .join('\n\n');

  const analysisPrompt = `你是一位专业的学习规划专家。请分析以下目标并生成详细的研究报告。

目标: ${goalTitle}
描述: ${goalDescription || '无'}
搜索到的相关资源:
${searchContext}

请生成JSON格式的研究报告（只返回JSON，不要有其他内容）：
{
  "summary": "2-3句话概括这个目标的核心价值和吸引力",
  "keyConcepts": ["核心概念1", "核心概念2", ...],
  "commonPitfalls": ["常见错误1", "常见错误2", ...],
  "industryContext": "行业背景和市场价值，50字左右",
  "recommendedPrerequisites": ["前置知识1", "前置知识2"],
  "effortEstimate": {
    "beginnerHours": 数字（入门级别所需学习小时数）,
    "intermediateHours": 数字（中级水平所需小时数）,
    "advancedHours": 数字（高级水平所需小时数）
  },
  "phases": [
    {
      "phase": 1,
      "name": "阶段名称",
      "duration": "预计时长",
      "description": "阶段描述",
      "keyOutcomes": ["关键成果1", "关键成果2"]
    }
  ],
  "rawInsights": "原始分析文字，100-200字"
}`;

  try {
    const analysisText = await chatCompletion([
      {
        role: 'system',
        content:
          '你是一位专业的技术学习规划师。你必须只返回JSON格式的报告，不要有任何其他文字前缀或后缀。',
      },
      { role: 'user', content: analysisPrompt },
    ]);

    const cleaned = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    Object.assign(report, parsed);

    // Ensure arrays
    if (!Array.isArray(report.keyConcepts)) report.keyConcepts = [];
    if (!Array.isArray(report.commonPitfalls)) report.commonPitfalls = [];
    if (!Array.isArray(report.recommendedPrerequisites)) report.recommendedPrerequisites = [];
    if (!Array.isArray(report.phases)) report.phases = [];
    if (!report.effortEstimate) {
      report.effortEstimate = { beginnerHours: 0, intermediateHours: 0, advancedHours: 0 };
    }
  } catch (err) {
    // Fallback: generate basic report without AI analysis
    console.error('Research AI analysis failed:', err);
    const keywords = goalTitle.split(/\s+/).filter(Boolean);
    report.summary = `学习 ${goalTitle} 是一个有价值的技能提升目标。通过系统学习和实践，你可以掌握相关核心知识并产出实际成果。`;
    report.keyConcepts = keywords.slice(0, 6);
    report.commonPitfalls = ['缺乏系统性学习计划', '只看不练', '跳过基础直接学高级内容', '不及时复习'];
    report.industryContext = `${goalTitle}是当前技术领域的重要技能，掌握后有广泛的职业发展空间。`;
    report.recommendedPrerequisites = ['计算机基础知识'];
    report.effortEstimate = { beginnerHours: 40, intermediateHours: 120, advancedHours: 300 };
    report.phases = [
      {
        phase: 1,
        name: '基础入门',
        duration: '1-2周',
        description: '掌握基本概念和核心工具',
        keyOutcomes: ['理解基础概念', '能完成简单练习'],
      },
    ];
  }

  if (onPhase) onPhase({ status: 'done', progress: 100, message: '研究完成' });

  return report as ResearchReport;
}
