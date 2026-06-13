/**
 * Action PRO Interactive Classroom Service
 * Multi-agent AI conversation for collaborative learning.
 * Uses a multi-agent approach with Teacher + Student agents.
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
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
}

interface AgentMessage {
  id: string;
  agentId: string;
  agentName: string;
  agentRole: string;
  content: string;
  timestamp: number;
  isUser?: boolean;
}

interface ClassroomSession {
  id: string;
  topic: string;
  sceneType: SceneType;
  agents: Agent[];
  messages: AgentMessage[];
  createdAt: number;
}

type SceneType = 'lecture' | 'qa' | 'roundtable';

interface Agent {
  id: string;
  name: string;
  role: string;
  personality: string;
  avatar: string;
  color: string;
}

// ============================================================
// Agent Name & Personality Translations
// ============================================================

interface AgentNameSet {
  teacher: string;
  studentA: string;
  studentB: string;
  studentC: string;
}

interface LocaleContent {
  names: AgentNameSet;
  sceneConfigs: Record<SceneType, { title: string; description: string }>;
  welcomeMessage: (topic: string, sceneTitle: string) => string;
  teacherPersonality: (styleDesc: string, topic: string) => string;
  studentAPersonality: (topic: string) => string;
  studentBPersonality: (topic: string) => string;
  studentCPersonality: (topic: string) => string;
  userLabel: string;
  studentQuestionPrompt: string;
  studentFollowUpPrompt: (teacherContent: string) => string;
  studentPerspectivePrompt: (priorContext: string, studentName: string) => string;
}

const LOCALE_CONTENT: Record<string, LocaleContent> = {
  zh: {
    names: {
      teacher: 'AI 导师',
      studentA: '好奇小明',
      studentB: '思考小华',
      studentC: '实践小林',
    },
    sceneConfigs: {
      lecture: { title: '课堂讲授', description: 'AI 教师系统讲解知识点' },
      qa: { title: '问答模式', description: '学生提问 AI 回答' },
      roundtable: { title: '圆桌讨论', description: '多个 AI 角色共同讨论' },
    },
    welcomeMessage: (topic: string, sceneTitle: string) =>
      `同学们好！欢迎来到互动课堂。今天我们来一起学习：**${topic}**。\n\n我是你们的 AI 导师，我们会通过${sceneTitle}的方式来进行学习。准备好了吗？让我们开始吧！`,
    teacherPersonality: (styleDesc: string, topic: string) =>
      `你是"AI 导师"，一位知识渊博、教学经验丰富的教师。你采用${styleDesc}的教学方式。\n\n当前话题：${topic}\n教学原则：\n- 用清晰易懂的语言解释概念\n- 结合生活实例帮助理解\n- 适时提问确认学生理解程度\n- 鼓励学生思考和提问\n- 当学生答对时给予肯定`,
    studentAPersonality: (topic: string) =>
      `你是"好奇小明"，一位充满好奇心、喜欢提问的学生。你总是想要深入理解"为什么"。\n\n当前话题：${topic}\n\n性格特点：\n- 经常问"为什么"\n- 喜欢追问细节\n- 会从初学者角度提问\n- 勇于承认不懂的地方\n- 对有趣的知识充满热情`,
    studentBPersonality: (topic: string) =>
      `你是"思考小华"，一位善于深度思考、喜欢总结归纳的学生。\n\n当前话题：${topic}\n\n性格特点：\n- 喜欢总结要点\n- 善于联系已有知识\n- 会提出批判性观点\n- 关注知识的本质和联系\n- 偶尔会提出独到见解`,
    studentCPersonality: (topic: string) =>
      `你是"实践小林"，一位注重实际应用、喜欢动手实践的学生。\n\n当前话题：${topic}\n\n性格特点：\n- 关心知识点如何应用\n- 喜欢问"怎么做"\n- 会联系实际项目场景\n- 关注工具和框架的使用\n- 分享自己的实践经验`,
    userLabel: '你',
    studentQuestionPrompt: '基于上面的讲解，请以这个角色的性格提出一个相关的问题（保持简短，1-2句话）。',
    studentFollowUpPrompt: (teacherContent: string) =>
      `基于老师的讲解"${teacherContent.slice(0, 100)}..."，请以这个角色的性格说一句简短的跟进发言（可以是追问、补充或感想）。`,
    studentPerspectivePrompt: (priorContext: string, studentName: string) =>
      `基于之前的讨论：\n${priorContext}\n\n请以"${studentName}"的身份对这个话题发表一个简短的观点、问题或补充（保持角色特点，1-3句话）。`,
  },
  en: {
    names: {
      teacher: 'AI Tutor',
      studentA: 'Curious Alex',
      studentB: 'Deep Thinker Dan',
      studentC: 'Practical Pat',
    },
    sceneConfigs: {
      lecture: { title: 'Lecture Mode', description: 'AI Teacher explains concepts systematically' },
      qa: { title: 'Q&A Mode', description: 'Students ask questions, AI answers' },
      roundtable: { title: 'Roundtable Discussion', description: 'Multiple AI characters discuss together' },
    },
    welcomeMessage: (topic: string, sceneTitle: string) =>
      `Hello everyone! Welcome to the Interactive Classroom. Today we'll learn together about: **${topic}**.\n\nI'm your AI Tutor. We'll be learning through the ${sceneTitle} approach. Are you ready? Let's begin!`,
    teacherPersonality: (styleDesc: string, topic: string) =>
      `You are "AI Tutor", a knowledgeable and experienced teacher. You use a ${styleDesc} teaching style.\n\nCurrent topic: ${topic}\nTeaching principles:\n- Explain concepts in clear, easy-to-understand language\n- Use real-life examples to aid understanding\n- Ask questions to confirm student comprehension\n- Encourage students to think and ask questions\n- Give positive feedback when students answer correctly`,
    studentAPersonality: (topic: string) =>
      `You are "Curious Alex", a curious student who loves asking questions. You always want to deeply understand the "why".\n\nCurrent topic: ${topic}\n\nPersonality traits:\n- Frequently ask "why"\n- Love to probe for details\n- Ask questions from a beginner's perspective\n- Not afraid to admit what you don't understand\n- Full of enthusiasm for interesting knowledge`,
    studentBPersonality: (topic: string) =>
      `You are "Deep Thinker Dan", a student who excels at deep thinking and loves summarizing.\n\nCurrent topic: ${topic}\n\nPersonality traits:\n- Like to summarize key points\n- Good at connecting with existing knowledge\n- Will raise critical viewpoints\n- Focus on the essence and connections of knowledge\n- Occasionally offer unique insights`,
    studentCPersonality: (topic: string) =>
      `You are "Practical Pat", a student who focuses on practical applications and loves hands-on practice.\n\nCurrent topic: ${topic}\n\nPersonality traits:\n- Care about how knowledge is applied\n- Like to ask "how to"\n- Connect with real project scenarios\n- Focus on tools and framework usage\n- Share your own practical experiences`,
    userLabel: 'You',
    studentQuestionPrompt: 'Based on the explanation above, please ask a relevant question in character (keep it brief, 1-2 sentences).',
    studentFollowUpPrompt: (teacherContent: string) =>
      `Based on the teacher\'s explanation "${teacherContent.slice(0, 100)}...", please say a brief follow-up in character (could be a follow-up question, addition, or reflection).`,
    studentPerspectivePrompt: (priorContext: string, studentName: string) =>
      `Based on the prior discussion:\n${priorContext}\n\nPlease share a brief perspective, question, or addition to this topic as "${studentName}" (keep in character, 1-3 sentences).`,
  },
  ja: {
    names: {
      teacher: 'AI 先生',
      studentA: '好奇心太郎',
      studentB: '論理派花子',
      studentC: '実践派一郎',
    },
    sceneConfigs: {
      lecture: { title: '講義モード', description: 'AI先生が体系的に説明します' },
      qa: { title: '質疑応答モード', description: '生徒が質問し、AIが回答' },
      roundtable: { title: 'ラウンドテーブル・ディスカッション', description: '複数のAIキャラクターが一緒に議論' },
    },
    welcomeMessage: (topic: string, sceneTitle: string) =>
      `皆さん、こんにちは！インタラクティブ教室へようこそ。今日は一緒に：**${topic}**について学びます。\n\n私はAI先生です。${sceneTitle}の方法で学んでいきます。準備はいいですか？始めましょう！`,
    teacherPersonality: (styleDesc: string, topic: string) =>
      `あなたは「AI先生」、知識が豊富で教学経験豊富な先生です。${styleDesc}的教学法を使用しています。\n\n現在の話題：${topic}\n教学原則：\n- 明確で理解しやすい言葉で概念を説明する\n- 生活の例を使って理解を助ける\n- 適宜質問して生徒の理解度を確認する\n- 生徒が考え質問することを奨励する\n- 正解時には褒めて認める`,
    studentAPersonality: (topic: string) =>
      `あなたは「好奇心太郎」、好奇心が旺盛で質問が好きな生徒です。「なぜ」を深く理解 دائماً	want	to。\n\n現在の話題：${topic}\n\n性格の特徴：\n- 常に「なぜ」と質問する\n- 細部の追求が好き\n- 初心者の視点から質問する\n- 分からないことを認める勇気がある\n- 興味深い知識に情熱を燃やす`,
    studentBPersonality: (topic: string) =>
      `あなたは「論理派花子」、深い思考が好きで要約上手な生徒です。\n\n現在の話題：${topic}\n\n性格の特徴：\n- 要点を要約するのが好き\n- 既存の知識と結びつけるのが上手\n- 批判的な观点，提出\n- 知識の本質と联系，关注\n- 時折独特な见解，提出`,
    studentCPersonality: (topic: string) =>
      `あなたは「実践派一郎」、実践応用を重視し、実践を 좋아する生徒です。\n\n現在の話題：${topic}\n\n性格の特徴：\n- 知識の応用を気にする\n- 「どうするか」と聞くのが好き\n- 実際的なプロジェクトシナリオと結びつける\n- ツールとフレームワークの使用，关注\n- 自分の実践経験，分享`,
    userLabel: 'あなた',
    studentQuestionPrompt: '上の説明に基づいて、このキャラクター性格で関連する質問を起こしてください（短く1-2文で）。',
    studentFollowUpPrompt: (teacherContent: string) =>
      `先生の説明"${teacherContent.slice(0, 100)}..."に基づいて、このキャラクター性格で簡短い意見を起こしてください（追问、補足、感想均可）。`,
    studentPerspectivePrompt: (priorContext: string, studentName: string) =>
      `これまでの議論に基づいて：\n${priorContext}\n\n「${studentName}」としてこの話題について簡短い观点、質問または補足を発言してください（キャラクター特徴を維持、1-3文）。`,
  },
  ko: {
    names: {
      teacher: 'AI 선생님',
      studentA: '호기심 민수',
      studentB: '깊은 생각 지환',
      studentC: '실천형 수진',
    },
    sceneConfigs: {
      lecture: { title: '강의 모드', description: 'AI 선생님이 체계적으로 설명합니다' },
      qa: { title: '질문 응답 모드', description: '학생이 질문하고 AI가 답변' },
      roundtable: { title: '라운드 테이블 토론', description: '여러 AI 캐릭터가 함께 논의' },
    },
    welcomeMessage: (topic: string, sceneTitle: string) =>
      `안녕하세요! 인터랙티브 교실에 오신 것을 환영합니다. 오늘 함께：**${topic}**에 대해 배워봅시다.\n\n저는 AI 선생님입니다. ${sceneTitle} 방식으로 진행하겠습니다. 준비되셨나요? 시작합시다!`,
    teacherPersonality: (styleDesc: string, topic: string) =>
      `당신은 "AI 선생님", 지식이 풍부하고 교육 경험이 많은 선생님입니다. ${styleDesc} 교육 방식을 사용합니다.\n\n현재 화제: ${topic}\n교육 원칙:\n- 명확하고 이해하기 쉬운 언어로 개념을 설명\n- 실생활 예를 들어 이해 도움\n- 적절히 질문하여 학생 이해도 확인\n- 학생들이 생각하고 질문하도록 격려\n- 정답 시 긍정적 피드백 제공`,
    studentAPersonality: (topic: string) =>
      `당신은 "호기심 민수", 호기심이 많고 질문하기를 좋아하는 학생입니다. 항상 "왜"를 깊이 이해하고 싶어합니다.\n\n현재 화제: ${topic}\n\n성격 특징:\n- 자주 "왜"라고 질문\n- 세부 사항을追问 좋아함\n- 초보자 시각에서 질문\n- 모르는 것을 인정할 용기\n- 흥미로운 지식에 열정`,
    studentBPersonality: (topic: string) =>
      `당신은 "깊은 생각 지환", 깊이 생각하고 요약하는 것을 좋아하는 학생입니다.\n\n현재 화제: ${topic}\n\n성격 특징:\n-要点을 요약 좋아함\n- 기존知識と結び기기 잘함\n- 비평적观点을 提出\n- 지식의 본질과 联系을 주시\n- 때때로 독특한见解을 提出`,
    studentCPersonality: (topic: string) =>
      `당신은 "실천형 수진", 실제 응용을 중요시하고 실천을 좋아하는 학생입니다.\n\n현재 화제: ${topic}\n\n성격 특징:\n- 지식의 응용을 气にする\n- "怎么做" 질문 좋아함\n- 실제 프로젝트 시나리오와結びつける\n- 도구와 프레임워크사용을 주시\n- 자신의实践经验를 공유`,
    userLabel: '너',
    studentQuestionPrompt: '위의 설명을 기반으로 이 캐릭터의 성격으로 관련된 질문을 해주세요.',
    studentFollowUpPrompt: (teacherContent: string) =>
      `선생님의 설명 "${teacherContent.slice(0, 100)}..."에 기반하여 이 캐릭터 성격으로 짧은 후속 발언을 해주세요.`,
    studentPerspectivePrompt: (priorContext: string, studentName: string) =>
      `이전 논의를 기반으로:\n${priorContext}\n\n"${studentName}"로서 이 화제에 대해 짧은 논평, 질문 또는 보충을发言해주세요.`
  },
};

export function getLocaleContent(locale?: string): LocaleContent {
  const lang = locale?.split('-')[0] || 'zh';
  return LOCALE_CONTENT[lang] || LOCALE_CONTENT.zh;
}

// ============================================================
// Scene Configurations
// ============================================================

const SCENE_CONFIGS: Record<SceneType, { title: string; description: string; icon: string }> = {
  lecture: { title: '课堂讲授', description: 'AI 教师系统讲解知识点', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S9.168 5.477 8 6.253m0 13C9.168 18.523 10.832 19 12.5 19s3.332-.477 4.5-1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13' },
  qa: { title: '问答模式', description: '学生提问 AI 回答', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.677-.59.106-.753.295-.753.59 0 .214.063.426.184.586M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  roundtable: { title: '圆桌讨论', description: '多个 AI 角色共同讨论', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
};

const AGENT_COLORS = [
  { bg: 'rgba(99,102,241,0.15)', border: '#6366f1', text: '#a5b4fc', name: 'indigo' },
  { bg: 'rgba(16,185,129,0.15)', border: '#10b981', text: '#34d399', name: 'emerald' },
  { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#fbbf24', name: 'amber' },
  { bg: 'rgba(236,72,153,0.15)', border: '#ec4899', text: '#f472b6', name: 'pink' },
];

// ============================================================
// Agent Definitions
// ============================================================

function buildTeacherAgent(topic: string, style: string, locale?: string): Agent {
  const content = getLocaleContent(locale);
  const styleDesc: Record<string, string> = {
    guided: locale === 'en' ? 'patient guidance, Socratic questioning, progressive deepening' :
            locale === 'ja' ? '辛抱強い導き、苏格拉底式質問、段階的深化' :
            locale === 'ko' ? '인내심 있는 안내, 소크라테스식 질문, 점진적 심화' :
            '耐心引导、苏格拉底式提问、逐步深入',
    indoctrination: locale === 'en' ? 'high-density knowledge output, systematic explanation, emphasis on key points' :
                    locale === 'ja' ? '高密度の知識出力、体系的解説、重点強調' :
                    locale === 'ko' ? '고밀도 지식 출력, 체계적 설명, 핵심 강조' :
                    '高密度灌输、系统化讲解、强调重点',
    encouragement: locale === 'en' ? 'enthusiastic encouragement, positive feedback, affirming progress' :
                   locale === 'ja' ? '热情的励まし、积极的フィードバック、進捗を肯定' :
                   locale === 'ko' ? '열정적인 격려, 긍정적 피드백, 진도 인정' :
                   '热情鼓励、积极反馈、肯定进步',
    strict: locale === 'en' ? 'strict requirements, direct problem identification, high standards' :
            locale === 'ja' ? '严格要求、直接的な問題指摘、高基準' :
            locale === 'ko' ? '엄격한 요구, 직접적 문제 지적, 높은 기준' :
            '严格要求、直接指出问题、高标准',
    first_principles: locale === 'en' ? 'first principles thinking, starting from basics, deep analysis' :
                      locale === 'ja' ? '第一原理思考、ベースから出発、深い分析' :
                      locale === 'ko' ? '제1원리 사고, 기초에서 출발, 심층 분석' :
                      '第一性原理、从基础出发、深度思考',
  };

  return {
    id: 'teacher-1',
    name: content.names.teacher,
    role: 'teacher',
    personality: content.teacherPersonality(styleDesc[style] || styleDesc.guided, topic),
    avatar: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S9.168 5.477 8 6.253m0 13C9.168 18.523 10.832 19 12.5 19s3.332-.477 4.5-1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13',
    color: '#6366f1',
  };
}

function buildStudentAgentA(topic: string, locale?: string): Agent {
  const content = getLocaleContent(locale);
  return {
    id: 'student-a',
    name: content.names.studentA,
    role: 'student-curious',
    personality: content.studentAPersonality(topic),
    avatar: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.677-.59.106-.753.295-.753.59 0 .214.063.426.184.586M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    color: '#10b981',
  };
}

function buildStudentAgentB(topic: string, locale?: string): Agent {
  const content = getLocaleContent(locale);
  return {
    id: 'student-b',
    name: content.names.studentB,
    role: 'student-deep',
    personality: content.studentBPersonality(topic),
    avatar: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
    color: '#f59e0b',
  };
}

function buildStudentAgentC(topic: string, locale?: string): Agent {
  const content = getLocaleContent(locale);
  return {
    id: 'student-c',
    name: content.names.studentC,
    role: 'student-practical',
    personality: content.studentCPersonality(topic),
    avatar: 'M13 10V3L4 14h7v7l9-11h-7z',
    color: '#ec4899',
  };
}

// ============================================================
// Chat Completion (shared helper)
// ============================================================

async function chatCompletion(
  messages: ChatMessage[],
  model = 'deepseek-chat',
  temperature = 0.8,
): Promise<string> {
  if (!DEEPSEEK_API_KEY)
    throw new Error('DeepSeek API key not configured');

  const response = await fetch(DEEPSEEK_API_HOST + OPENAI_API_PATHS.chatCompletions, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: 2048 }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${error}`);
  }

  const data: ChatCompletionResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}

// ============================================================
// Classroom Session Management
// ============================================================

export interface ClassroomConfig {
  topic: string;
  sceneType: SceneType;
  teachingStyle?: string;
  participantCount?: number; // 1-3 students
  locale?: string;
}

export async function createClassroomSession(config: ClassroomConfig): Promise<ClassroomSession> {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const style = config.teachingStyle || 'guided';
  const studentCount = Math.min(3, Math.max(1, config.participantCount || 2));
  const locale = config.locale;
  const content = getLocaleContent(locale);

  const agents: Agent[] = [buildTeacherAgent(config.topic, style, locale)];

  if (studentCount >= 1) agents.push(buildStudentAgentA(config.topic, locale));
  if (studentCount >= 2) agents.push(buildStudentAgentB(config.topic, locale));
  if (studentCount >= 3) agents.push(buildStudentAgentC(config.topic, locale));

  const sceneConfig = content.sceneConfigs[config.sceneType] || content.sceneConfigs.lecture;

  const welcomeMessage: AgentMessage = {
    id: `msg-welcome-${Date.now()}`,
    agentId: 'teacher-1',
    agentName: content.names.teacher,
    agentRole: 'teacher',
    content: content.welcomeMessage(config.topic, sceneConfig.title),
    timestamp: Date.now(),
  };

  return {
    id: sessionId,
    topic: config.topic,
    sceneType: config.sceneType,
    agents,
    messages: [welcomeMessage],
    createdAt: Date.now(),
  };
}

// ============================================================
// Multi-Agent Message Generation
// ============================================================

export async function generateClassroomResponse(
  session: ClassroomSession,
  userMessage?: string,
  locale?: string,
): Promise<AgentMessage[]> {
  const responses: AgentMessage[] = [];
  const teacher = session.agents.find(a => a.role === 'teacher')!;
  const students = session.agents.filter(a => a.role !== 'teacher');
  const content = getLocaleContent(locale);
  const userLabel = content.userLabel;

  if (session.sceneType === 'qa') {
    // QA: Teacher answers user question, maybe a student chimes in
    const teacherMsg = await generateTeacherResponse(session, userMessage ?? '', locale);
    responses.push(teacherMsg);

    // Random student follow-up
    if (Math.random() > 0.5 && students.length > 0) {
      const followUp = await generateStudentFollowUp(session, students[0], teacherMsg.content, locale);
      if (followUp) responses.push(followUp);
    }
  } else if (session.sceneType === 'lecture') {
    // Lecture: Teacher explains, students ask questions
    const teacherMsg = await generateTeacherLecture(session, userMessage, locale);
    responses.push(teacherMsg);

    if (students.length > 0) {
      const qStudent = students[Math.floor(Math.random() * students.length)];
      const question = await generateStudentQuestion(session, qStudent, locale);
      responses.push(question);
    }
  } else {
    // Roundtable: All agents discuss
    // Teacher responds to user or sets context
    if (userMessage) {
      const teacherMsg = await generateTeacherResponse(session, userMessage, locale);
      responses.push(teacherMsg);
    }

    // Each student gives a perspective
    for (const student of students) {
      if (Math.random() > 0.3) {
        const perspective = await generateStudentPerspective(session, student, responses, locale);
        if (perspective) responses.push(perspective);
      }
    }
  }

  // Update user message label to be locale-aware
  if (userMessage) {
    session.messages.push({
      id: `user-${Date.now()}`,
      agentId: 'user',
      agentName: userLabel,
      agentRole: 'user',
      content: userMessage,
      timestamp: Date.now(),
      isUser: true,
    });
  }

  return responses;
}

async function generateTeacherResponse(
  session: ClassroomSession,
  userMessage: string,
  locale?: string,
): Promise<AgentMessage> {
  const teacher = session.agents.find(a => a.role === 'teacher')!;
  const content = getLocaleContent(locale);
  const history: ChatMessage[] = session.messages.slice(-6).map(m => ({
    role: (m.isUser ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.isUser
      ? `[${content.userLabel}] ${m.content}`
      : `[${m.agentName}] ${m.content}`,
  }));

  const messages: ChatMessage[] = [
    { role: 'system', content: teacher.personality },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const responseContent = await chatCompletion(messages, 'deepseek-chat', 0.7);

  return {
    id: `msg-${Date.now()}-teacher`,
    agentId: teacher.id,
    agentName: teacher.name,
    agentRole: teacher.role,
    content: responseContent,
    timestamp: Date.now(),
  };
}

async function generateTeacherLecture(
  session: ClassroomSession,
  context: string | undefined,
  locale?: string,
): Promise<AgentMessage> {
  const teacher = session.agents.find(a => a.role === 'teacher')!;
  const content = getLocaleContent(locale);
  const history = session.messages.slice(-4).map(m => ({
    role: (m.isUser ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.isUser
      ? `[${content.userLabel}] ${m.content}`
      : `[${m.agentName}] ${m.content}`,
  }));

  const topicIntro = context
    ? `请针对这个问题进行详细讲解：${context}`
    : `请继续讲解"${session.topic}"的下一个知识点，保持教学节奏，适时使用比喻和例子。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: teacher.personality },
    ...history,
    { role: 'user', content: topicIntro },
  ];

  const responseContent = await chatCompletion(messages, 'deepseek-chat', 0.7);

  return {
    id: `msg-${Date.now()}-teacher`,
    agentId: teacher.id,
    agentName: teacher.name,
    agentRole: teacher.role,
    content: responseContent,
    timestamp: Date.now(),
  };
}

async function generateStudentQuestion(
  session: ClassroomSession,
  student: Agent,
  locale?: string,
): Promise<AgentMessage> {
  const content = getLocaleContent(locale);
  const history = session.messages.slice(-4).map(m => ({
    role: (m.isUser ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.isUser
      ? `[${content.userLabel}] ${m.content}`
      : `[${m.agentName}] ${m.content}`,
  }));

  const messages: ChatMessage[] = [
    { role: 'system', content: student.personality },
    ...history,
    { role: 'user', content: content.studentQuestionPrompt },
  ];

  const responseContent = await chatCompletion(messages, 'deepseek-chat', 0.9);

  return {
    id: `msg-${Date.now()}-${student.id}`,
    agentId: student.id,
    agentName: student.name,
    agentRole: student.role,
    content: responseContent,
    timestamp: Date.now(),
  };
}

async function generateStudentFollowUp(
  session: ClassroomSession,
  student: Agent,
  teacherContent: string,
  locale?: string,
): Promise<AgentMessage | null> {
  const content = getLocaleContent(locale);
  const history = session.messages.slice(-2).map(m => ({
    role: (m.isUser ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.isUser
      ? `[${content.userLabel}] ${m.content}`
      : `[${m.agentName}] ${m.content}`,
  }));

  const messages: ChatMessage[] = [
    { role: 'system', content: student.personality },
    ...history,
    { role: 'user', content: content.studentFollowUpPrompt(teacherContent) },
  ];

  try {
    const responseContent = await chatCompletion(messages, 'deepseek-chat', 0.85);
    return {
      id: `msg-${Date.now()}-${student.id}`,
      agentId: student.id,
      agentName: student.name,
      agentRole: student.role,
      content: responseContent,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

async function generateStudentPerspective(
  session: ClassroomSession,
  student: Agent,
  priorResponses: AgentMessage[],
  locale?: string,
): Promise<AgentMessage | null> {
  const content = getLocaleContent(locale);
  const priorContext = priorResponses
    .map(m => `[${m.agentName}] ${m.content.slice(0, 80)}...`)
    .join('\n');

  const messages: ChatMessage[] = [
    { role: 'system', content: student.personality },
    { role: 'user', content: content.studentPerspectivePrompt(priorContext, student.name) },
  ];

  try {
    const responseContent = await chatCompletion(messages, 'deepseek-chat', 0.85);
    return {
      id: `msg-${Date.now()}-${student.id}`,
      agentId: student.id,
      agentName: student.name,
      agentRole: student.role,
      content: responseContent,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

// ============================================================
// Utility
// ============================================================

export function getSceneConfigs(locale?: string) {
  const content = getLocaleContent(locale);
  return {
    lecture: {
      title: content.sceneConfigs.lecture.title,
      description: content.sceneConfigs.lecture.description,
      icon: SCENE_CONFIGS.lecture.icon,
    },
    qa: {
      title: content.sceneConfigs.qa.title,
      description: content.sceneConfigs.qa.description,
      icon: SCENE_CONFIGS.qa.icon,
    },
    roundtable: {
      title: content.sceneConfigs.roundtable.title,
      description: content.sceneConfigs.roundtable.description,
      icon: SCENE_CONFIGS.roundtable.icon,
    },
  };
}

export function getAgentColors() {
  return AGENT_COLORS;
}
