/**
 * Action3 Content Extractor Service - YouTube transcript extraction & AI summarization
 * Extracts subtitles from YouTube videos and generates AI-powered summaries.
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
    body: JSON.stringify({ model: 'deepseek-chat', messages, temperature: 0.5, max_tokens: 4096 }),
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

export interface TranscriptChunk {
  start: number;
  end: number;
  text: string;
}

export interface YoutubeAnalysisResult {
  videoId: string;
  title: string;
  transcript: string;
  summary: string;
  keyConcepts: string[];
  chunks: TranscriptChunk[];
  available: boolean;
  error?: string;
}

// ============================================================
// YouTube Transcript Extraction
// ============================================================

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    const transcriptUrl = `https://youtubetranscript.com/?v=${videoId}`;
    const response = await fetch(transcriptUrl);
    if (!response.ok) return null;

    const xmlText = await response.text();
    const textMatches = xmlText.match(/<text[^>]*>([^<]*)<\/text>/g);
    if (!textMatches) return null;

    const transcript = textMatches
      .map((match) => {
        const content = match.replace(/<text[^>]*>/, '').replace(/<\/text>/, '');
        return decodeHtmlEntities(content);
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return transcript.length > 50 ? transcript : null;
  } catch {
    return null;
  }
}

async function fetchTranscriptViaInvidious(videoId: string): Promise<string | null> {
  try {
    const endpoints = [
      `https://yewtu.be/api/v1/captions/${videoId}`,
      `https://invidious.projectsegfau.lt/api/v1/captions/${videoId}`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
        if (response.ok) {
          const data = await response.json() as { transcripts?: Array<{ text: string }> };
          if (data.transcripts) {
            return data.transcripts.map((t) => t.text).join(' ').replace(/\s+/g, ' ').trim();
          }
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchTranscriptViaPiped(videoId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://pipedapi.kavin.rocks/captions/${videoId}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) return null;

    const data = await response.json() as { subtitles?: Record<string, Array<{ start: number; end: number; text: string }>> };
    if (!data.subtitles) return null;

    const zhSub = data.subtitles['zh-Hans'] || data.subtitles['zh'] || data.subtitles['en'];
    if (zhSub && Array.isArray(zhSub)) {
      return zhSub.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
    }

    const firstSub = Object.values(data.subtitles)[0];
    if (firstSub && Array.isArray(firstSub)) {
      return firstSub.map((s: { text: string }) => s.text).join(' ').replace(/\s+/g, ' ').trim();
    }
    return null;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n');
}

// ============================================================
// AI Summarization
// ============================================================

interface SummarizationResult {
  summary: string;
  keyConcepts: string[];
  chunks: TranscriptChunk[];
}

async function summarizeTranscript(
  transcript: string,
  goalTitle: string,
): Promise<SummarizationResult> {
  const prompt = `你是一位专业的学习教练。请分析以下YouTube视频字幕，生成学习摘要。

目标学习主题: ${goalTitle}
字幕内容:
${transcript.substring(0, 8000)}

请返回JSON格式（只返回JSON，不要有任何其他文字）：
{
  "summary": "100字以内的中文摘要",
  "keyConcepts": ["概念1", "概念2", "概念3", "概念4", "概念5"],
  "chunks": [
    { "start": 0, "end": 60, "text": "第一个分段的内容摘要（20字以内）" },
    { "start": 60, "end": 120, "text": "第二个分段的内容摘要（20字以内）" }
  ]
}`;

  try {
    const response = await chatCompletion([
      {
        role: 'system',
        content: '你是一位专业的学习教练。你必须只返回JSON格式的结果，不要有任何其他文字前缀或后缀。',
      },
      { role: 'user', content: prompt },
    ]);

    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || '暂无摘要',
        keyConcepts: parsed.keyConcepts || [],
        chunks: (parsed.chunks || []).map((c: { start: number; end: number; text: string }) => ({
          start: c.start || 0,
          end: c.end || 0,
          text: c.text || '',
        })),
      };
    }
  } catch (err) {
    console.error('[Content Extractor] Summarization failed:', err);
  }

  return {
    summary: transcript.substring(0, 200) + '...',
    keyConcepts: [],
    chunks: [],
  };
}

// ============================================================
// Main Entry Point
// ============================================================

export async function analyzeYoutubeVideo(
  url: string,
  goalTitle: string,
): Promise<YoutubeAnalysisResult> {
  const videoId = extractVideoId(url);

  if (!videoId) {
    return {
      videoId: '',
      title: '',
      transcript: '',
      summary: '',
      keyConcepts: [],
      chunks: [],
      available: false,
      error: '无法解析YouTube链接，请检查URL格式',
    };
  }

  let transcript = await fetchTranscript(videoId);

  if (!transcript) {
    transcript = await fetchTranscriptViaPiped(videoId);
  }

  if (!transcript) {
    transcript = await fetchTranscriptViaInvidious(videoId);
  }

  if (!transcript) {
    return {
      videoId,
      title: '',
      transcript: '',
      summary: '',
      keyConcepts: [],
      chunks: [],
      available: false,
      error: '字幕不可用。该视频可能没有字幕或字幕被禁用。建议前往YouTube观看原视频。',
    };
  }

  const summaryResult = await summarizeTranscript(transcript, goalTitle);

  return {
    videoId,
    title: '',
    transcript: transcript.substring(0, 15000),
    summary: summaryResult.summary,
    keyConcepts: summaryResult.keyConcepts,
    chunks: summaryResult.chunks,
    available: true,
  };
}
