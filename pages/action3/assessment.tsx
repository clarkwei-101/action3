'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { withNextJSPerPageLayout } from '~/common/layout/withLayout';
import { Action3Layout } from '~/apps/action3/shared/Action3Layout';
import { useAction3Goals } from '~/common/action3/api-hooks';
import type { GoalWithProgress } from '~/common/action3/api-hooks';
import { useRouter } from 'next/router';

interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'code';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

interface QuizResult {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

interface AssessmentResult {
  assessmentId: string;
  assessmentType: string;
  status: string;
  score: number;
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

type AssessmentType = 'quiz' | 'project_review' | 'certification' | 'peer_review' | 'self_assessment';

const ASSESSMENT_TYPE_CONFIG: Record<AssessmentType, { label: string; icon: string; desc: string; color: string }> = {
  quiz: { label: '知识测试', icon: '✍', desc: 'AI生成测试题，检验核心知识', color: 'var(--accent-primary)' },
  project_review: { label: '项目评审', icon: '🚀', desc: '提交你的项目作品，获得AI反馈', color: 'var(--accent-secondary)' },
  certification: { label: '权威认证', icon: '🏆', desc: '通过外部权威平台的认证测试', color: 'var(--color-warning)' },
  peer_review: { label: '同伴互评', icon: '👥', desc: '由社区同伴进行评审', color: 'var(--color-success)' },
  self_assessment: { label: '自我评估', icon: '🔍', desc: '基于进度和任务完成情况的综合评估', color: 'var(--style-first-principles)' },
};

// ============================================================
// Main Component
// ============================================================
function AssessmentPage() {
  const router = useRouter();
  const { data: goals = [] } = useAction3Goals();

  const [selectedGoal, setSelectedGoal] = useState<GoalWithProgress | null>(null);
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('quiz');
  const [projectDescription, setProjectDescription] = useState('');
  const [phase, setPhase] = useState<'select' | 'quiz' | 'review' | 'result'>('select');
  const [quizData, setQuizData] = useState<AssessmentResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');

  // ============================================================
  // Start Assessment
  // ============================================================
  const handleStartAssessment = async () => {
    if (!selectedGoal) return;
    setError(null);
    setIsGenerating(true);
    setProgress(10);
    setProgressMsg('准备评估...');

    try {
      const response = await fetch('/api/action3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assessment.run',
          goalId: selectedGoal.id,
          goalTitle: selectedGoal.title,
          assessmentType,
          goalProgress: selectedGoal.progress || 0,
          completedTasks: [],
          projectDescription: assessmentType === 'project_review' ? projectDescription : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '评估启动失败');
      }

      const data: AssessmentResult = await response.json();
      setQuizData(data);
      setPhase('quiz');
    } catch (err) {
      setError(err instanceof Error ? err.message : '评估启动失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // ============================================================
  // Submit Quiz
  // ============================================================
  const handleSubmitQuiz = async () => {
    if (!quizData?.quiz) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/action3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assessment.submitQuiz',
          assessmentId: quizData.assessmentId,
          questions: quizData.quiz.questions,
          answers,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '提交失败');
      }

      const data: AssessmentResult = await response.json();
      setResult(data);
      setPhase('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // Score Display Helper
  // ============================================================
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--color-success)';
    if (score >= 60) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return '优秀';
    if (score >= 80) return '良好';
    if (score >= 70) return '及格';
    if (score >= 60) return '需努力';
    return '不达标';
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backBtn} onClick={() => router.push('/action3/goals')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <h1 style={styles.title}>目标评估</h1>
        </div>
        <p style={styles.subtitle}>检验你的学习成果，获得专业反馈</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={styles.errorBanner}>
          <span>{error}</span>
          <button style={styles.errorClose} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Phase: Select */}
      {phase === 'select' && (
        <div style={styles.content}>
          {/* Goal Selection */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <span style={styles.sectionNum}>1</span>
              选择评估目标
            </h2>
            {goals.length === 0 ? (
              <div style={styles.emptyCard}>
                <p style={styles.emptyText}>暂无目标，请先创建目标</p>
                <button style={styles.createBtn} onClick={() => router.push('/action3/goals')}>
                  去创建目标
                </button>
              </div>
            ) : (
              <div style={styles.goalGrid}>
                {goals.map((goal) => (
                  <button
                    key={goal.id}
                    style={{
                      ...styles.goalCard,
                      ...(selectedGoal?.id === goal.id ? styles.goalCardSelected : {}),
                    }}
                    onClick={() => setSelectedGoal(goal)}
                  >
                    <div style={styles.goalCardTop}>
                      <span style={{
                        ...styles.goalTitle,
                        color: selectedGoal?.id === goal.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                      }}>{goal.title}</span>
                      {selectedGoal?.id === goal.id && (
                        <span style={styles.checkIcon}>✓</span>
                      )}
                    </div>
                    <div style={styles.goalCardMeta}>
                      <span style={styles.goalProgress}>{goal.progress || 0}% 完成</span>
                      {goal.style && (
                        <span style={{ ...styles.styleTag, background: `var(--style-${goal.style})26` }}>
                          {goal.style}
                        </span>
                      )}
                    </div>
                    <div style={styles.progressBar}>
                      <div style={{ ...styles.progressFill, width: `${goal.progress || 0}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assessment Type Selection */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <span style={styles.sectionNum}>2</span>
              选择评估方式
            </h2>
            <div style={styles.typeGrid}>
              {(Object.keys(ASSESSMENT_TYPE_CONFIG) as AssessmentType[]).map((type) => {
                const config = ASSESSMENT_TYPE_CONFIG[type];
                return (
                  <button
                    key={type}
                    style={{
                      ...styles.typeCard,
                      borderColor: assessmentType === type ? config.color : 'rgba(255,255,255,0.07)',
                      background: assessmentType === type ? `${config.color}15` : 'rgba(255,255,255,0.03)',
                    }}
                    onClick={() => setAssessmentType(type)}
                  >
                    <span style={styles.typeIcon}>{config.icon}</span>
                    <span style={styles.typeLabel}>{config.label}</span>
                    <span style={styles.typeDesc}>{config.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Project Description (if project_review) */}
          {assessmentType === 'project_review' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>
                <span style={styles.sectionNum}>3</span>
                项目描述
              </h2>
              <textarea
                style={styles.textarea}
                placeholder="请描述你的项目：使用的技术栈、主要功能、遇到的最大挑战等..."
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={5}
              />
            </div>
          )}

          {/* Start Button */}
          <div style={styles.actionBar}>
            <button
              style={{
                ...styles.startBtn,
                opacity: !selectedGoal || isGenerating ? 0.5 : 1,
                cursor: !selectedGoal || isGenerating ? 'not-allowed' : 'pointer',
              }}
              disabled={!selectedGoal || isGenerating}
              onClick={handleStartAssessment}
            >
              {isGenerating ? (
                <>
                  <span style={styles.spinner} />
                  准备中...
                </>
              ) : (
                <>
                  开始评估 →
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Phase: Quiz */}
      {phase === 'quiz' && quizData?.quiz && (
        <div style={styles.content}>
          <div style={styles.quizHeader}>
            <div>
              <h2 style={styles.quizTitle}>知识测试</h2>
              <p style={styles.quizMeta}>
                {selectedGoal?.title} · {quizData.quiz.totalQuestions}道题
              </p>
            </div>
            <div style={styles.quizProgress}>
              已回答: {Object.keys(answers).length}/{quizData.quiz.totalQuestions}
            </div>
          </div>

          <div style={styles.questionsList}>
            {quizData.quiz.questions.map((q, idx) => (
              <div key={q.id} style={styles.questionCard}>
                <div style={styles.questionHeader}>
                  <span style={styles.questionNum}>Q{idx + 1}</span>
                  <span style={{
                    ...styles.diffBadge,
                    background: q.difficulty === 'easy' ? 'var(--color-success-bg)' :
                      q.difficulty === 'medium' ? 'var(--color-warning-bg)' :
                        'var(--color-error-bg)',
                    color: q.difficulty === 'easy' ? 'var(--color-success)' :
                      q.difficulty === 'medium' ? 'var(--color-warning)' :
                        'var(--color-error)',
                  }}>
                    {q.difficulty === 'easy' ? '简单' : q.difficulty === 'medium' ? '中等' : '困难'}
                  </span>
                  <span style={styles.topicBadge}>{q.topic}</span>
                </div>
                <p style={styles.questionText}>{q.question}</p>
                {q.options && q.options.length > 0 && (
                  <div style={styles.optionsList}>
                    {q.options.map((opt, oIdx) => {
                      const letter = String.fromCharCode(65 + oIdx);
                      const isSelected = answers[q.id] === letter;
                      return (
                        <button
                          key={oIdx}
                          style={{
                            ...styles.optionBtn,
                            background: isSelected ? 'rgba(16,185,129,0.15)' : 'transparent',
                            borderColor: isSelected ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.07)',
                          }}
                          onClick={() => setAnswers({ ...answers, [q.id]: letter })}
                        >
                          <span style={{
                            ...styles.optionLetter,
                            background: isSelected ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.03)',
                            color: isSelected ? 'var(--accent-primary-light)' : 'var(--text-secondary)',
                          }}>{letter}</span>
                          <span style={styles.optionText}>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {q.type === 'true_false' && (
                  <div style={styles.optionsList}>
                    {['正确', '错误'].map((label, oIdx) => {
                      const val = oIdx === 0 ? 'T' : 'F';
                      const isSelected = answers[q.id] === val;
                      return (
                        <button
                          key={label}
                          style={{
                            ...styles.optionBtn,
                            background: isSelected ? 'rgba(16,185,129,0.15)' : 'transparent',
                            borderColor: isSelected ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.07)',
                          }}
                          onClick={() => setAnswers({ ...answers, [q.id]: val })}
                        >
                          <span style={{
                            ...styles.optionLetter,
                            background: isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
                            color: isSelected ? '#fff' : 'var(--text-secondary)',
                          }}>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={styles.actionBar}>
            <button style={styles.backBtn2} onClick={() => { setPhase('select'); setQuizData(null); setAnswers({}); }}>
              返回选择
            </button>
            <button
              style={{
                ...styles.submitBtn,
                opacity: Object.keys(answers).length < quizData.quiz.totalQuestions || isSubmitting ? 0.5 : 1,
              }}
              disabled={Object.keys(answers).length < quizData.quiz.totalQuestions || isSubmitting}
              onClick={handleSubmitQuiz}
            >
              {isSubmitting ? (
                <>
                  <span style={styles.spinner} />
                  提交中...
                </>
              ) : (
                '提交答案'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Phase: Result */}
      {phase === 'result' && result && (
        <div style={styles.content}>
          {/* Score Card */}
          <div style={styles.scoreCard}>
            <div style={styles.scoreCircle}>
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="70" stroke="var(--bg-elevated)" strokeWidth="12" fill="none" />
                <circle
                  cx="80" cy="80" r="70"
                  stroke={getScoreColor(result.score)}
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - result.score / 100)}`}
                  transform="rotate(-90 80 80)"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div style={styles.scoreText}>
                <span style={styles.scoreNum}>{result.score}</span>
                <span style={styles.scoreMax}>/ 100</span>
              </div>
            </div>
            <div style={styles.scoreInfo}>
              <span style={{
                ...styles.scoreLabel,
                color: result.passed ? 'var(--color-success)' : 'var(--color-error)',
              }}>
                {result.passed ? '🎉 达标' : '需继续努力'}
              </span>
              <p style={styles.scoreSummary}>{result.feedback.summary}</p>
              {result.completedAt && (
                <p style={styles.completedAt}>
                  完成时间: {new Date(result.completedAt).toLocaleString('zh-CN')}
                </p>
              )}
            </div>
          </div>

          {/* Topic Breakdown */}
          {result.quiz?.topicBreakdown && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>知识点掌握情况</h2>
              <div style={styles.topicList}>
                {Object.entries(result.quiz.topicBreakdown).map(([topic, data]) => {
                  const pct = Math.round((data.correct / data.total) * 100);
                  return (
                    <div key={topic} style={styles.topicItem}>
                      <div style={styles.topicHeader}>
                        <span style={styles.topicName}>{topic}</span>
                        <span style={{ color: getScoreColor(pct) }}>{pct}%</span>
                      </div>
                      <div style={styles.topicBar}>
                        <div style={{
                          ...styles.topicFill,
                          width: `${pct}%`,
                          background: getScoreColor(pct),
                        }} />
                      </div>
                      <span style={styles.topicStats}>{data.correct}/{data.total} 正确</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Feedback Sections */}
          {result.feedback.strengths.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>
                <span style={{ color: 'var(--color-success)', marginRight: 6 }}>✦</span>
                优势
              </h2>
              <div style={styles.feedbackList}>
                {result.feedback.strengths.map((s, i) => (
                  <div key={i} style={{ ...styles.feedbackItem, borderLeftColor: 'var(--color-success)' }}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.feedback.weaknesses.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>
                <span style={{ color: 'var(--color-error)', marginRight: 6 }}>✦</span>
                不足
              </h2>
              <div style={styles.feedbackList}>
                {result.feedback.weaknesses.map((w, i) => (
                  <div key={i} style={{ ...styles.feedbackItem, borderLeftColor: 'var(--color-error)' }}>
                    {w}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.feedback.recommendations.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>
                <span style={{ color: 'var(--color-warning)', marginRight: 6 }}>💡</span>
                改进建议
              </h2>
              <div style={styles.feedbackList}>
                {result.feedback.recommendations.map((r, i) => (
                  <div key={i} style={{ ...styles.feedbackItem, borderLeftColor: 'var(--color-warning)' }}>
                    {r}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.feedback.nextSteps.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>
                <span style={{ color: 'var(--accent-primary)', marginRight: 6 }}>→</span>
                下一步
              </h2>
              <div style={styles.nextStepsList}>
                {result.feedback.nextSteps.map((ns, i) => (
                  <div key={i} style={styles.nextStepItem}>
                    <span style={styles.nextStepNum}>{i + 1}</span>
                    <span>{ns}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quiz Review */}
          {result.quiz?.results && result.quiz.results.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>题目回顾</h2>
              {result.quiz.results.map((r, i) => {
                const q = result.quiz!.questions.find(q => q.id === r.questionId);
                return (
                  <div key={r.questionId} style={{
                    ...styles.reviewCard,
                    borderLeftColor: r.isCorrect ? 'var(--color-success)' : 'var(--color-error)',
                  }}>
                    <div style={styles.reviewHeader}>
                      <span style={{
                        ...styles.reviewStatus,
                        color: r.isCorrect ? 'var(--color-success)' : 'var(--color-error)',
                      }}>
                        {r.isCorrect ? '✓ 正确' : '✗ 错误'}
                      </span>
                      <span style={styles.reviewQ}>Q{i + 1}</span>
                    </div>
                    {q && <p style={styles.reviewQText}>{q.question}</p>}
                    <p style={styles.reviewUser}>
                      你的答案: <strong>{r.userAnswer || '未作答'}</strong>
                    </p>
                    {!r.isCorrect && q && (
                      <p style={styles.reviewCorrect}>正确答案: <strong>{q.correctAnswer}</strong></p>
                    )}
                    <p style={styles.reviewExplanation}>{r.explanation}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div style={styles.actionBar}>
            <button style={styles.backBtn2} onClick={() => { setPhase('select'); setResult(null); setQuizData(null); setAnswers({}); }}>
              重新评估
            </button>
            <button style={styles.continueBtn} onClick={() => router.push('/action3/goals')}>
              返回目标页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Styles
// ============================================================
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontFamily: 'Inter, system-ui, sans-serif',
    padding: '0 0 60px',
  },
  header: {
    padding: '32px 40px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(0,0,0,0.15)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 4,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    color: 'var(--text-secondary)',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 13,
    transition: 'all 0.2s',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: 14,
    margin: '4px 0 0',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--color-error-bg)',
    border: '1px solid var(--color-error)',
    borderRadius: 8,
    color: 'var(--color-error)',
    padding: '12px 16px',
    margin: '20px 40px',
    fontSize: 14,
  },
  errorClose: {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-error)',
    fontSize: 18,
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
  content: {
    padding: '32px 40px',
    maxWidth: 900,
    margin: '0 auto',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 16,
  },
  sectionNum: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: 'var(--gradient-accent)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    marginRight: 10,
  },
  emptyCard: {
    background: 'rgba(255,255,255,0.025)',
    border: '1px dashed var(--border-light)',
    borderRadius: 12,
    padding: '40px',
    textAlign: 'center' as const,
  },
  emptyText: {
    color: 'var(--text-secondary)',
    marginBottom: 16,
  },
  createBtn: {
    background: 'var(--gradient-accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 20px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  goalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 12,
  },
  goalCard: {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 16,
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  goalCardSelected: {
    borderColor: 'var(--accent-primary)',
    background: 'rgba(37,99,235,0.08)',
  },
  goalCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: 600,
    transition: 'color 0.2s',
  },
  checkIcon: {
    color: 'var(--accent-primary)',
    fontSize: 16,
  },
  goalCardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  goalProgress: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  styleTag: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 4,
    color: 'var(--text-secondary)',
  },
  progressBar: {
    height: 4,
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'var(--gradient-accent)',
    borderRadius: 2,
    transition: 'width 0.3s',
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 12,
  },
  typeCard: {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid',
    borderRadius: 12,
    padding: 16,
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  typeDesc: {
    fontSize: 12,
    color: 'var(--text-muted)',
    lineHeight: 1.4,
  },
  textarea: {
    width: '100%',
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    padding: 12,
    fontSize: 14,
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    outline: 'none',
    boxSizing: 'border-box',
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  startBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--gradient-accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '12px 28px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 15px var(--accent-primary-glow)',
  },
  spinner: {
    width: 16,
    height: 16,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
  },
  quizHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  quizMeta: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    margin: '4px 0 0',
  },
  quizProgress: {
    fontSize: 13,
    color: 'var(--text-muted)',
    background: 'rgba(255,255,255,0.03)',
    padding: '4px 12px',
    borderRadius: 20,
  },
  questionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  questionCard: {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 20,
  },
  questionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  questionNum: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--accent-primary)',
    background: 'rgba(37,99,235,0.12)',
    padding: '2px 8px',
    borderRadius: 4,
  },
  diffBadge: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
  },
  topicBadge: {
    fontSize: 11,
    color: 'var(--text-muted)',
    background: 'rgba(255,255,255,0.03)',
    padding: '2px 8px',
    borderRadius: 4,
    marginLeft: 'auto',
  },
  questionText: {
    fontSize: 15,
    color: 'var(--text-primary)',
    fontWeight: 500,
    margin: '0 0 16px',
    lineHeight: 1.5,
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  optionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'transparent',
    border: '1px solid',
    borderRadius: 8,
    padding: '10px 14px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'all 0.15s',
  },
  optionLetter: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    transition: 'all 0.15s',
  },
  optionText: {
    fontSize: 14,
    color: 'var(--text-primary)',
  },
  backBtn2: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    color: 'var(--text-secondary)',
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--gradient-accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 28px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 15px var(--accent-primary-glow)',
  },
  scoreCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 40,
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 32,
    marginBottom: 32,
  },
  scoreCircle: {
    position: 'relative' as const,
    width: 160,
    height: 160,
    flexShrink: 0,
  },
  scoreText: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center' as const,
  },
  scoreNum: {
    display: 'block',
    fontSize: 36,
    fontWeight: 800,
    color: 'var(--text-primary)',
    lineHeight: 1,
  },
  scoreMax: {
    display: 'block',
    fontSize: 14,
    color: 'var(--text-muted)',
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    display: 'inline-block',
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 8,
  },
  scoreSummary: {
    color: 'var(--text-secondary)',
    fontSize: 14,
    lineHeight: 1.6,
    margin: '8px 0 0',
  },
  completedAt: {
    color: 'var(--text-muted)',
    fontSize: 12,
    marginTop: 8,
  },
  topicList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  topicItem: {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 14,
  },
  topicHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topicName: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  topicBar: {
    height: 6,
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  topicFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 1s ease',
  },
  topicStats: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  feedbackList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  feedbackItem: {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: 14,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  nextStepsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  nextStepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 14,
    color: 'var(--text-secondary)',
  },
  nextStepNum: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
  reviewCard: {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewStatus: {
    fontSize: 13,
    fontWeight: 600,
  },
  reviewQ: {
    fontSize: 12,
    color: 'var(--text-muted)',
    background: 'rgba(255,255,255,0.03)',
    padding: '2px 8px',
    borderRadius: 4,
  },
  reviewQText: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-primary)',
    margin: '0 0 8px',
    lineHeight: 1.5,
  },
  reviewUser: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    margin: '0 0 4px',
  },
  reviewCorrect: {
    fontSize: 13,
    color: 'var(--color-success)',
    margin: '0 0 8px',
  },
  reviewExplanation: {
    fontSize: 12,
    color: 'var(--text-muted)',
    margin: 0,
    lineHeight: 1.5,
    fontStyle: 'italic' as const,
  },
  continueBtn: {
    background: 'var(--gradient-accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 28px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 15px var(--accent-primary-glow)',
  },
};

// ============================================================
export default withNextJSPerPageLayout({ type: 'noop' }, () => <AssessmentPage />);
