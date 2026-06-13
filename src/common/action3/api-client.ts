/**
 * Direct API client for Action PRO
 * Uses /api/action3 for ALL operations (bypasses tRPC transformer issues)
 */

const API_BASE = '/api/action3';

export async function apiCall<T>(action: string, data?: Record<string, unknown>): Promise<T> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `API error: ${res.status}`);
  return json as T;
}

// ============================================================
// Goal API
// ============================================================
export const action3GoalApi = {
  list: () => apiCall<unknown[]>('goal.list'),
  getById: (id: string) => apiCall<unknown>('goal.getById', { id }),
  create: (data: {
    title: string;
    description?: string;
    targetDays: number;
    style: string;
    milestones?: Array<{ title: string; description?: string }>;
  }) => apiCall('goal.create', data),
  update: (id: string, data: { status?: string; totalProgress?: number }) =>
    apiCall('goal.update', { id, ...data }),
  delete: (id: string) => apiCall('goal.delete', { id }),
  complete: (id: string) => apiCall('goal.complete', { id }),
};

// ============================================================
// Task API
// ============================================================
export const action3TaskApi = {
  listByGoal: (goalId: string) => apiCall<unknown[]>('task.listByGoal', { goalId }),
  listToday: () => apiCall<unknown[]>('task.listToday'),
  listByDate: (date: string) => apiCall<unknown[]>('task.listByDate', { date }),
  complete: (id: string) => apiCall('task.complete', { id }),
  skip: (id: string) => apiCall('task.skip', { id }),
  reschedule: (id: string, scheduledDate: string) =>
    apiCall('task.reschedule', { id, scheduledDate }),
};

// ============================================================
// AI Workflow API
// ============================================================
export const action3AIWorkflowApi = {
  generate: (data: {
    title: string;
    description?: string;
    targetDays: number;
    style: string;
  }) => apiCall<{
    analysis: {
      skills: string[];
      complexity: string;
      estimatedHoursPerDay: number;
      reasoning: string;
    };
    milestones: Array<{ title: string; description: string }>;
    tasks: Array<{
      title: string;
      description?: string;
      milestoneIndex: number;
      xpReward: number;
    }>;
  }>('aiWorkflow.generate', data),
  create: (data: {
    title: string;
    description?: string;
    targetDays: number;
    style: string;
  }) => apiCall('aiWorkflow.create', data),
};

// ============================================================
// Achievement API
// ============================================================
export const action3AchievementApi = {
  list: () => apiCall<unknown[]>('achievement.list'),
  unlock: (id: string) => apiCall('achievement.unlock', { id }),
};

// ============================================================
// Calendar API
// ============================================================
export const action3CalendarApi = {
  list: (startDate?: string, endDate?: string) =>
    apiCall<unknown[]>('calendar.list', startDate && endDate ? { startDate, endDate } : undefined),
  add: (data: {
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    type: string;
  }) => apiCall('calendar.add', data),
  delete: (id: string) => apiCall('calendar.delete', { id }),
  importIcal: (url: string) => apiCall('calendar.importIcal', { url }),
  analyzeFreeTime: (data: { startDate: string; endDate: string }) =>
    apiCall<{ freeTimeBlocks: unknown[]; suggestions: string[] }>('calendar.analyzeFreeTime', data),
};

// ============================================================
// Reminder API
// ============================================================
export const action3ReminderApi = {
  get: () => apiCall<unknown>('reminder.get'),
  update: (data: { type?: string; time?: string; enabled?: boolean; message?: string }) =>
    apiCall('reminder.update', data),
};

// ============================================================
// Progress API
// ============================================================
export const action3ProgressApi = {
  get: () => apiCall<unknown>('progress.get'),
  updateStreak: () => apiCall('progress.updateStreak'),
};

// ============================================================
// Recommendation API
// ============================================================
export interface SkillRecommendation {
  skillNodeId: string;
  skillId: string;
  title: string;
  description: string;
  difficulty: number;
  xpReward: number;
  reason: string;
  difficultyMatch: number;
  estimatedHours: number;
  resources: Array<{ title: string; url: string; type: string }>;
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

export const action3RecommendApi = {
  getSkills: (goalId?: string, limit?: number) =>
    apiCall<{ recommendations: SkillRecommendation[] }>('recommend.skills', { goalId, limit }),
  getPaths: (goalId?: string, limit?: number) =>
    apiCall<{ paths: LearningPathRecommendation[] }>('recommend.paths', { goalId, limit }),
  getProfile: () =>
    apiCall<{ totalXp: number; level: number; completedGoals: number; activeGoals: number; masteredSkills: number; learningStreak: number; recentSkills: string[] }>('recommend.profile'),
  updateMastery: (skillNodeId: string, delta: number) =>
    apiCall('recommend.updateMastery', { skillNodeId, delta }),
  seed: () => apiCall('recommend.seed'),
};

// ============================================================
// Skill Tree API
// ============================================================
export interface SkillNodeData {
  id: string;
  skillId: string;
  title: string;
  description: string | null;
  difficulty: number;
  tier: number;
  category: string;
  xpReward: number;
  icon: string;
  positionX: number;
  positionY: number;
  isRoot: boolean;
}

export interface SkillEdgeData {
  id: string;
  prerequisiteId: string;
  dependentId: string;
  strength: number;
}

export interface SkillMasteryData {
  skillNodeId: string;
  masteryScore: number;
  practiceCount: number;
  lastPracticed: string | null;
}

export const action3SkillTreeApi = {
  getNodes: (category?: string) =>
    apiCall<SkillNodeData[]>('skillTree.nodes', category ? { category } : {}),
  getEdges: () => apiCall<SkillEdgeData[]>('skillTree.edges'),
  getMasteries: () => apiCall<SkillMasteryData[]>('skillTree.masteries'),
  updatePosition: (id: string, positionX: number, positionY: number) =>
    apiCall('skillTree.updatePosition', { id, positionX, positionY }),
  updateMastery: (skillNodeId: string, masteryScore: number) =>
    apiCall('skillTree.updateMastery', { skillNodeId, masteryScore }),
};

// ============================================================
// Research API
// ============================================================
export interface ResourceLink {
  title: string;
  url: string;
  type: 'documentation' | 'video' | 'course' | 'article' | 'project' | 'community';
  authority: 'official' | 'trusted' | 'community' | 'general';
  description: string;
}

export interface ResearchPhase {
  status: 'pending' | 'scraping' | 'analyzing' | 'done' | 'error';
  progress: number;
  message: string;
}

export interface ResearchReport {
  goalTitle: string;
  goalDescription: string;
  summary: string;
  resources: ResourceLink[];
  keyConcepts: string[];
  commonPitfalls: string[];
  industryContext: string;
  recommendedPrerequisites: string[];
  effortEstimate: { beginnerHours: number; intermediateHours: number; advancedHours: number };
  phases: Array<{
    phase: number;
    name: string;
    duration: string;
    description: string;
    keyOutcomes: string[];
  }>;
  rawInsights?: string;
}

export const action3ResearchApi = {
  analyze: (goalTitle: string, goalDescription?: string) =>
    apiCall<ResearchReport>('research.analyze', { goalTitle, goalDescription }),
  analyzeMilestone: (goalTitle: string, milestoneTitle: string, milestoneDescription?: string) =>
    apiCall<ResearchReport>('research.analyzeMilestone', { goalTitle, milestoneTitle, milestoneDescription }),
};

// ============================================================
// Assessment API
// ============================================================
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

export interface AssessmentResult {
  assessmentId: string;
  assessmentType: string;
  status: string;
  score: number;
  passed: boolean;
  quiz?: {
    questions: QuizQuestion[];
    results: Array<{ questionId: string; userAnswer: string; isCorrect: boolean; explanation: string }>;
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

export const action3AssessmentApi = {
  run: (params: {
    goalId: string;
    goalTitle: string;
    assessmentType: 'quiz' | 'project_review' | 'certification' | 'peer_review' | 'self_assessment';
    goalProgress?: number;
    completedTasks?: string[];
    projectDescription?: string;
  }) => apiCall<AssessmentResult>('assessment.run', params),

  submitQuiz: (assessmentId: string, questions: QuizQuestion[], answers: Record<string, string>) =>
    apiCall<AssessmentResult>('assessment.submitQuiz', { assessmentId, questions, answers }),
};

// ============================================================
// iCal Import API
// ============================================================
export interface ICalImportResponse {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  message: string;
  action3Events: Array<{
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    date: string;
    type: string;
    isAllDay: boolean;
    location?: string;
    recurring: boolean;
  }>;
}

export const action3CalendarApi_full = {
  importIcal: (icalContent: string) =>
    apiCall<ICalImportResponse>('calendar.importIcal', { icalContent }),
};

// ============================================================
// Milestone Quiz API
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

export interface MilestoneQuizSubmitResult {
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

export const action3QuizApi = {
  generate: (goalId: string, milestoneIndex: number, keyConcepts?: string[]) =>
    apiCall<{ assessmentId: string; questions: MilestoneQuizQuestion[] }>('quiz.generate', {
      goalId,
      milestoneIndex,
      keyConcepts,
    }),

  submit: (
    goalId: string,
    milestoneIndex: number,
    assessmentId: string,
    questions: MilestoneQuizQuestion[],
    answers: Record<string, string>,
  ) =>
    apiCall<MilestoneQuizSubmitResult>('quiz.submit', {
      goalId,
      milestoneIndex,
      assessmentId,
      questions,
      answers,
    }),
};

// ============================================================
// Anki Export API
// ============================================================
export interface AnkiExportResult {
  deckName: string;
  cards: Array<{ front: string; back: string; tags: string[] }>;
  tsvContent: string;
  cardCount: number;
}

export const action3AnkiApi = {
  export: (goalId: string, milestoneIndex: number, keyConcepts?: string[]) =>
    apiCall<AnkiExportResult>('anki.export', { goalId, milestoneIndex, keyConcepts }),
};

// ============================================================
// YouTube Content API
// ============================================================
export interface YoutubeAnalysisResult {
  videoId: string;
  title: string;
  transcript: string;
  summary: string;
  keyConcepts: string[];
  chunks: Array<{ start: number; end: number; text: string }>;
  available: boolean;
  error?: string;
}

export const action3ContentApi = {
  analyzeYoutube: (url: string, goalTitle: string) =>
    apiCall<YoutubeAnalysisResult>('youtube.analyze', { url, goalTitle }),
};

// ============================================================
// Voice Assistant API
// ============================================================
export interface VoiceAssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface VoiceAssistantContext {
  userName?: string;
  style?: string;
  pendingTasks?: Array<{ title: string; goalTitle?: string }>;
  completedTasks?: Array<{ title: string; goalTitle?: string }>;
  dailyProgress?: number;
  [key: string]: unknown; // Index signature for apiCall compatibility
}

export interface VoiceAssistantResponse {
  text: string;
  shouldSpeak: boolean;
}

export const action3VoiceAssistantApi = {
  greeting: (context: VoiceAssistantContext) =>
    apiCall<VoiceAssistantResponse>('voiceAssistant.greeting', context),

  chat: (userMessage: string, context?: VoiceAssistantContext, history?: VoiceAssistantMessage[]) =>
    apiCall<VoiceAssistantResponse>('voiceAssistant.chat', { userMessage, context, history }),
};
