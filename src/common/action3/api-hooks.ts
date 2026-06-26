/**
 * API-based hooks for Action PRO
 * These wrap the direct API client with React Query for proper state management.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { action3GoalApi, action3TaskApi, action3AIWorkflowApi, action3AchievementApi, action3CalendarApi, action3ReminderApi, action3ProgressApi, action3RecommendApi, action3SkillTreeApi, action3ResearchApi, action3AssessmentApi, action3VoiceAssistantApi, action3QuizApi, action3AnkiApi, action3ContentApi, apiCall } from './api-client';
import type { SkillRecommendation, LearningPathRecommendation, SkillNodeData, SkillEdgeData, SkillMasteryData, QuizQuestion, VoiceAssistantContext, VoiceAssistantMessage, MilestoneQuizQuestion, MilestoneQuizSubmitResult, AnkiExportResult, YoutubeAnalysisResult } from './api-client';
export type { ResearchReport, ResourceLink, ResearchPhase } from './api-client';
export type { QuizQuestion, AssessmentResult } from './api-client';
export type { GoalWithProgress };
export type { MilestoneQuizQuestion, MilestoneQuizSubmitResult, AnkiExportResult, YoutubeAnalysisResult } from './api-client';

// ============================================================
// Goal Hooks
// ============================================================
interface GoalWithProgress {
  id: string;
  title: string;
  description: string | null;
  targetDays: number;
  style: string;
  status: string;
  progress: number;
  totalProgress: number;
  estimatedCompletion: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function useAction3Goals() {
  return useQuery({
    queryKey: ['action3', 'goals'],
    queryFn: async () => {
      const goals = await action3GoalApi.list() as Array<GoalWithProgress & { totalProgress?: number; milestones?: unknown[] }>;
      return goals.map(g => ({ ...g, progress: g.totalProgress ?? g.progress ?? 0 }));
    },
  });
}

export function useAction3GoalById(id: string) {
  return useQuery({
    queryKey: ['action3', 'goal', id],
    queryFn: () => action3GoalApi.getById(id),
    enabled: !!id,
  });
}

export function useAction3GoalCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: action3GoalApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action3', 'goals'] }),
  });
}

export function useAction3GoalUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string; totalProgress?: number } }) =>
      action3GoalApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action3', 'goals'] }),
  });
}

export function useAction3GoalDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: action3GoalApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action3', 'goals'] }),
  });
}

export function useAction3GoalComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: action3GoalApi.complete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action3', 'goals'] }),
  });
}

// ============================================================
// Task Hooks
// ============================================================
export function useAction3TasksByGoal(goalId: string) {
  return useQuery({
    queryKey: ['action3', 'tasks', 'goal', goalId],
    queryFn: () => action3TaskApi.listByGoal(goalId) as Promise<unknown[]>,
    enabled: !!goalId,
  });
}

export function useAction3TasksToday() {
  return useQuery({
    queryKey: ['action3', 'tasks', 'today'],
    queryFn: () => action3TaskApi.listToday() as Promise<unknown[]>,
  });
}

export function useAction3TasksByDate(date: string) {
  return useQuery({
    queryKey: ['action3', 'tasks', 'date', date],
    queryFn: () => action3TaskApi.listByDate(date) as Promise<unknown[]>,
    enabled: !!date,
  });
}

export function useAction3TaskComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: action3TaskApi.complete,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['action3', 'tasks'] });
      qc.invalidateQueries({ queryKey: ['action3', 'goals'] });
    },
  });
}

export function useAction3TaskSkip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: action3TaskApi.skip,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['action3', 'tasks'] });
      qc.invalidateQueries({ queryKey: ['action3', 'goals'] });
    },
  });
}

export function useAction3TaskReschedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) => action3TaskApi.reschedule(id, date),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action3', 'tasks'] }),
  });
}

// ============================================================
// AI Workflow Hooks
// ============================================================
export function useAction3AIWorkflowGenerate() {
  return useMutation({ mutationFn: action3AIWorkflowApi.generate });
}

export function useAction3AIWorkflowCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: action3AIWorkflowApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action3', 'goals'] }),
  });
}

// ============================================================
// Achievement Hooks
// ============================================================
export function useAction3Achievements() {
  return useQuery({
    queryKey: ['action3', 'achievements'],
    queryFn: () => action3AchievementApi.list() as Promise<unknown[]>,
  });
}

export function useAction3AchievementUnlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: action3AchievementApi.unlock,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action3', 'achievements'] }),
  });
}

// ============================================================
// Calendar Hooks
// ============================================================
export function useAction3Calendar(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['action3', 'calendar', startDate, endDate],
    queryFn: () => action3CalendarApi.list(startDate, endDate) as Promise<unknown[]>,
  });
}

export function useAction3CalendarAdd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: action3CalendarApi.add,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action3', 'calendar'] }),
  });
}

export function useAction3CalendarDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: action3CalendarApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action3', 'calendar'] }),
  });
}

export function useAction3CalendarAnalyzeFreeTime() {
  return useMutation({ mutationFn: action3CalendarApi.analyzeFreeTime });
}

// ============================================================
// Reminder Hooks
// ============================================================
export function useAction3Reminder() {
  return useQuery({
    queryKey: ['action3', 'reminder'],
    queryFn: () => action3ReminderApi.get() as Promise<unknown>,
  });
}

export function useAction3ReminderUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: action3ReminderApi.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action3', 'reminder'] }),
  });
}

// ============================================================
// Progress Hooks
// ============================================================
export function useAction3Progress() {
  return useQuery({
    queryKey: ['action3', 'progress'],
    queryFn: () => action3ProgressApi.get() as Promise<unknown>,
  });
}

export function useAction3ProgressUpdateStreak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: action3ProgressApi.updateStreak,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action3', 'progress'] }),
  });
}

export function useAction3XPAdd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) =>
      apiCall('xp.add', { amount }) as Promise<{ totalXP: number; level: number; leveledUp: boolean }>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action3', 'progress'] }),
  });
}

// ============================================================
// Recommendation Hooks
// ============================================================
export function useAction3SkillRecommendations(goalId?: string, limit = 5) {
  return useQuery({
    queryKey: ['action3', 'recommendations', 'skills', goalId, limit],
    queryFn: () => action3RecommendApi.getSkills(goalId, limit) as Promise<{ recommendations: SkillRecommendation[] }>,
  });
}

export function useAction3PathRecommendations(goalId?: string, limit = 3) {
  return useQuery({
    queryKey: ['action3', 'recommendations', 'paths', goalId, limit],
    queryFn: () => action3RecommendApi.getPaths(goalId, limit) as Promise<{ paths: LearningPathRecommendation[] }>,
  });
}

export function useAction3UserProfile() {
  return useQuery({
    queryKey: ['action3', 'recommendations', 'profile'],
    queryFn: () => action3RecommendApi.getProfile(),
  });
}

export function useAction3UpdateMastery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ skillNodeId, delta }: { skillNodeId: string; delta: number }) =>
      action3RecommendApi.updateMastery(skillNodeId, delta),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['action3', 'recommendations'] });
      qc.invalidateQueries({ queryKey: ['action3', 'skillTree'] });
    },
  });
}

// ============================================================
// Skill Tree Hooks
// ============================================================
export function useAction3SkillTreeNodes(category?: string) {
  return useQuery({
    queryKey: ['action3', 'skillTree', 'nodes', category],
    queryFn: () => action3SkillTreeApi.getNodes(category) as Promise<SkillNodeData[]>,
  });
}

export function useAction3SkillTreeEdges() {
  return useQuery({
    queryKey: ['action3', 'skillTree', 'edges'],
    queryFn: () => action3SkillTreeApi.getEdges() as Promise<SkillEdgeData[]>,
  });
}

export function useAction3SkillTreeMasteries() {
  return useQuery({
    queryKey: ['action3', 'skillTree', 'masteries'],
    queryFn: () => action3SkillTreeApi.getMasteries() as Promise<SkillMasteryData[]>,
  });
}

export function useAction3UpdateSkillMastery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ skillNodeId, masteryScore }: { skillNodeId: string; masteryScore: number }) =>
      action3SkillTreeApi.updateMastery(skillNodeId, masteryScore),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action3', 'skillTree'] }),
  });
}

export function useAction3UpdateSkillPosition() {
  return useMutation({
    mutationFn: ({ id, positionX, positionY }: { id: string; positionX: number; positionY: number }) =>
      action3SkillTreeApi.updatePosition(id, positionX, positionY),
  });
}

// ============================================================
// Classroom Hooks
// ============================================================
export function useAction3ClassroomScenes(locale?: string) {
  return useQuery({
    queryKey: ['action3', 'classroom', 'scenes', locale],
    queryFn: () => apiCall<Record<string, { title: string; description: string; icon: string }>>('classroom.scenes', { locale }),
  });
}

export function useAction3ClassroomCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { topic?: string; sceneType?: string; teachingStyle?: string; participantCount?: number; locale?: string }) =>
      apiCall<{ id: string; topic: string; sceneType: string; agents: unknown[]; messages: unknown[]; createdAt: number }>('classroom.create', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action3', 'classroom'] }),
  });
}

export function useAction3ClassroomMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, userMessage, locale }: { sessionId: string; userMessage?: string; locale?: string }) =>
      apiCall<{ messages: unknown[] }>('classroom.message', { sessionId, userMessage, locale }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action3', 'classroom'] }),
  });
}

// ============================================================
// Research Hooks
// ============================================================
export function useAction3Research(goalTitle: string, goalDescription?: string) {
  return useQuery({
    queryKey: ['action3', 'research', goalTitle],
    queryFn: () => action3ResearchApi.analyze(goalTitle, goalDescription),
    enabled: !!goalTitle,
    staleTime: 1000 * 60 * 30, // 30 min cache
  });
}

export function useAction3ResearchMutation() {
  return useMutation({
    mutationFn: ({ goalTitle, goalDescription }: { goalTitle: string; goalDescription?: string }) =>
      action3ResearchApi.analyze(goalTitle, goalDescription),
  });
}

export function useAction3MilestoneResearchMutation() {
  return useMutation({
    mutationFn: ({ goalTitle, milestoneTitle, milestoneDescription }: {
      goalTitle: string; milestoneTitle: string; milestoneDescription?: string;
    }) =>
      action3ResearchApi.analyzeMilestone(goalTitle, milestoneTitle, milestoneDescription),
  });
}

// ============================================================
// Assessment Hooks
// ============================================================
export function useAction3Assessment(params: {
  goalId: string;
  goalTitle: string;
  assessmentType: 'quiz' | 'project_review' | 'certification' | 'peer_review' | 'self_assessment';
  goalProgress?: number;
  completedTasks?: string[];
  projectDescription?: string;
}) {
  return useMutation({
    mutationFn: () => action3AssessmentApi.run(params),
  });
}

export function useAction3AssessmentSubmitQuiz() {
  return useMutation({
    mutationFn: ({ assessmentId, questions, answers }: { assessmentId: string; questions: QuizQuestion[]; answers: Record<string, string> }) =>
      action3AssessmentApi.submitQuiz(assessmentId, questions, answers),
  });
}

// ============================================================
// Milestone Quiz Hooks
// ============================================================
export function useAction3QuizGenerate(goalId: string, milestoneIndex: number, keyConcepts?: string[]) {
  return useQuery({
    queryKey: ['action3', 'quiz', 'generate', goalId, milestoneIndex],
    queryFn: () => action3QuizApi.generate(goalId, milestoneIndex, keyConcepts) as Promise<{ assessmentId: string; questions: MilestoneQuizQuestion[] }>,
    enabled: !!goalId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAction3QuizSubmit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      goalId, milestoneIndex, assessmentId, questions, answers,
    }: {
      goalId: string;
      milestoneIndex: number;
      assessmentId: string;
      questions: MilestoneQuizQuestion[];
      answers: Record<string, string>;
    }) => action3QuizApi.submit(goalId, milestoneIndex, assessmentId, questions, answers) as Promise<MilestoneQuizSubmitResult>,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['action3', 'quiz', 'generate', variables.goalId, variables.milestoneIndex] });
      qc.invalidateQueries({ queryKey: ['action3', 'goals'] });
    },
  });
}

// ============================================================
// Anki Export Hooks
// ============================================================
export function useAction3AnkiExport(goalId: string, milestoneIndex: number, keyConcepts?: string[]) {
  return useQuery({
    queryKey: ['action3', 'anki', 'export', goalId, milestoneIndex],
    queryFn: () => action3AnkiApi.export(goalId, milestoneIndex, keyConcepts) as Promise<AnkiExportResult>,
    enabled: false,
    staleTime: 1000 * 60 * 30,
  });
}

// ============================================================
// YouTube Content Hooks
// ============================================================
export function useAction3YoutubeAnalyze(url: string, goalTitle: string) {
  return useMutation({
    mutationFn: () => action3ContentApi.analyzeYoutube(url, goalTitle) as Promise<YoutubeAnalysisResult>,
  });
}

// ============================================================
// Voice Assistant Hooks
// ============================================================
export function useAction3VoiceGreeting(context: VoiceAssistantContext) {
  return useMutation({
    mutationFn: () => action3VoiceAssistantApi.greeting(context),
  });
}

export function useAction3VoiceChat() {
  return useMutation({
    mutationFn: ({ userMessage, context, history }: { userMessage: string; context?: VoiceAssistantContext; history?: VoiceAssistantMessage[] }) =>
      action3VoiceAssistantApi.chat(userMessage, context, history),
  });
}

// ============================================================
// Resource Hooks
// ============================================================
interface GoalResourceData {
  id: string;
  goalId: string;
  title: string;
  url: string;
  type: string;
  note?: string;
  watched: boolean;
  createdAt: Date;
}

interface MilestoneResourceData {
  id: string;
  milestoneId: string;
  title: string;
  url: string;
  type: string;
  note?: string;
  watched: boolean;
  createdAt: Date;
}

export function useAction3ResourcesByGoal(goalId: string) {
  return useQuery({
    queryKey: ['action3', 'resources', 'goal', goalId],
    queryFn: () => apiCall<GoalResourceData[]>('resource.listByGoal', { goalId }) as Promise<GoalResourceData[]>,
    enabled: !!goalId,
  });
}

export function useAction3ResourcesByMilestone(milestoneId: string) {
  return useQuery({
    queryKey: ['action3', 'resources', 'milestone', milestoneId],
    queryFn: () => apiCall<MilestoneResourceData[]>('resource.listByMilestone', { milestoneId }) as Promise<MilestoneResourceData[]>,
    enabled: !!milestoneId,
  });
}

export function useAction3ResourceCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { goalId?: string; milestoneId?: string; title: string; url: string; type: string }) =>
      apiCall<GoalResourceData | MilestoneResourceData>('resource.create', data),
    onSuccess: (_data, variables) => {
      if (variables.goalId) qc.invalidateQueries({ queryKey: ['action3', 'resources', 'goal', variables.goalId] });
      if (variables.milestoneId) qc.invalidateQueries({ queryKey: ['action3', 'resources', 'milestone', variables.milestoneId] });
    },
  });
}

export function useAction3ResourceDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; type: 'goal' | 'milestone'; goalId?: string; milestoneId?: string }) =>
      apiCall('resource.delete', data),
    onSuccess: (_data, variables) => {
      if (variables.goalId) qc.invalidateQueries({ queryKey: ['action3', 'resources', 'goal', variables.goalId] });
      if (variables.milestoneId) qc.invalidateQueries({ queryKey: ['action3', 'resources', 'milestone', variables.milestoneId] });
    },
  });
}

export function useAction3ResourceAddFromResearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { goalId?: string; milestoneId?: string; resources: Array<{ title: string; url: string; type: string }> }) =>
      apiCall('resource.addFromResearch', data),
    onSuccess: (_data, variables) => {
      if (variables.goalId) qc.invalidateQueries({ queryKey: ['action3', 'resources', 'goal', variables.goalId] });
      if (variables.milestoneId) qc.invalidateQueries({ queryKey: ['action3', 'resources', 'milestone', variables.milestoneId] });
    },
  });
}
