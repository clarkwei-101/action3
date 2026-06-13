'use client';

import * as React from 'react';
import { useState, useEffect, Component, ReactNode } from 'react';
import { withNextJSPerPageLayout } from '~/common/layout/withLayout';
import { Action3Layout } from '~/apps/action3/shared/Action3Layout';
import { useAction3Goals, useAction3GoalCreate, useAction3GoalComplete, useAction3GoalDelete, useAction3TasksByGoal, useAction3TaskComplete, useAction3AIWorkflowGenerate, useAction3AIWorkflowCreate, useAction3ResearchMutation, useAction3MilestoneResearchMutation } from '~/common/action3/api-hooks';
import { MilestoneQuizModal } from '~/common/action3/components/MilestoneQuizModal';
import { YoutubeSummaryModal } from '~/common/action3/components/YoutubeSummaryModal';
import { useTranslation } from '~/common/action3/i18n';
import type { Goal, DailyTask } from '@prisma/client';

// ============================================================
// Error Boundary
// ============================================================
interface ErrorBoundaryProps { children: ReactNode; fallback?: ReactNode }
interface ErrorBoundaryState { hasError: boolean; error?: Error }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return <>{this.props.fallback}</>;
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '16px', marginBottom: '12px' }}>加载出错</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{ marginTop: '16px', padding: '8px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// Types
// ============================================================

interface GoalWithMilestones extends Goal {
  milestones: Array<{ id: string; title: string; description: string | null; progress: number; orderIndex: number }>;
  _count?: { tasks: number };
}

interface TaskWithMilestone extends DailyTask {
  milestone?: { id: string; title: string; description: string | null; progress: number; orderIndex: number } | null;
}

interface GeneratedResult {
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
}

type ModalStep = 'form' | 'loading' | 'result';

// ============================================================
// Style Badge Component
// ============================================================

const styleConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  guided: { label: '引导式', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.12)' },
  indoctrination: { label: '灌输式', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.12)' },
  encouragement: { label: '鼓励式', color: '#34d399', bgColor: 'rgba(52, 211, 153, 0.12)' },
  strict: { label: '严格式', color: '#f87171', bgColor: 'rgba(248, 113, 113, 0.12)' },
  first_principles: { label: '第一性原理', color: '#fb923c', bgColor: 'rgba(251, 146, 60, 0.12)' },
};

const EN_styleConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  guided: { label: 'Guided', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.12)' },
  indoctrination: { label: 'Indoctrination', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.12)' },
  encouragement: { label: 'Encouragement', color: '#34d399', bgColor: 'rgba(52, 211, 153, 0.12)' },
  strict: { label: 'Strict', color: '#f87171', bgColor: 'rgba(248, 113, 113, 0.12)' },
  first_principles: { label: 'First Principles', color: '#fb923c', bgColor: 'rgba(251, 146, 60, 0.12)' },
};

function StyleBadge({ style, locale }: { style: string; locale?: string }) {
  const configMap = locale === 'en' ? EN_styleConfig : styleConfig;
  const config = configMap[style] || { label: style, color: '#a0a0a0', bgColor: 'rgba(160, 160, 160, 0.15)' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 600,
      color: config.color,
      backgroundColor: config.bgColor,
    }}>
      {config.label}
    </span>
  );
}

// ============================================================
// Circular Progress Ring Component
// ============================================================

function CircularProgress({ progress, size = 80 }: { progress: number; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#progressGradient)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ============================================================
// Goal Card Component
// ============================================================

function GoalCard({ goal, onClick, locale }: { goal: GoalWithMilestones; onClick: () => void; locale?: string }) {
  const completedTasks = goal.milestones.reduce((sum, m) => sum + (m.progress > 0 ? 1 : 0), 0);

  return (
    <div
      onClick={onClick}
      className='lg-card'
      style={{ padding: '20px', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ position: 'relative' }}>
          <CircularProgress progress={goal.totalProgress} size={80} />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(0deg)',
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}>
            {Math.round(goal.totalProgress)}%
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {goal.title}
          </h3>
          <div style={{ marginBottom: '12px' }}>
            <StyleBadge style={goal.style} locale={locale} />
          </div>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
          }}>
            {Math.round(goal.totalProgress)}% {locale === 'en' ? 'complete' : locale === 'ja' ? '完了' : locale === 'ko' ? '완료' : '完成'} · {goal.targetDays} {locale === 'en' ? 'day goal' : locale === 'ja' ? '日目標' : locale === 'ko' ? '일 목표' : '天目标'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Task Item Component
// ============================================================

function TaskItem({
  task,
  onComplete,
}: {
  task: TaskWithMilestone;
  onComplete: (taskId: string) => void;
}) {
  const isCompleted = task.status === 'completed';
  const isPending = task.status === 'pending';

  return (
    <div
      className={`glass-list-item${isCompleted ? ' completed' : ''}`}
    >
      <button
        onClick={() => !isCompleted && onComplete(task.id)}
        disabled={isCompleted}
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          border: `2px solid ${isCompleted ? 'var(--color-success)' : isPending ? 'var(--accent-primary)' : '#666'}`,
          background: isCompleted ? 'var(--color-success)' : 'transparent',
          cursor: isCompleted ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s ease',
        }}
      >
        {isCompleted && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: '15px',
          color: isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)',
          textDecoration: isCompleted ? 'line-through' : 'none',
        }}>
          {task.title}
        </p>
        {task.milestone && (
          <p style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginTop: '2px',
          }}>
            {task.milestone.title}
          </p>
        )}
      </div>
      <div style={{
        padding: '4px 8px',
        borderRadius: '6px',
        background: 'rgba(16,185,129,0.10)',
        color: 'var(--accent-primary)',
        fontSize: '12px',
        fontWeight: 600,
      }}>
        +{task.xpReward} XP
      </div>
    </div>
  );
}

// ============================================================
// Milestone Progress Component
// ============================================================

function MilestoneItem({ milestone }: { milestone: { id: string; title: string; description: string | null; progress: number; orderIndex: number } }) {
  const isComplete = milestone.progress >= 100;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: isComplete ? 'var(--color-success)' : 'rgba(255,255,255,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {isComplete ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {milestone.orderIndex + 1}
          </span>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{
          fontSize: '14px',
          fontWeight: 600,
          color: isComplete ? 'var(--text-secondary)' : 'var(--text-primary)',
          textDecoration: isComplete ? 'line-through' : 'none',
        }}>
          {milestone.title}
        </p>
        {milestone.description && (
          <p style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginTop: '2px',
          }}>
            {milestone.description}
          </p>
        )}
      </div>
      <span style={{
        fontSize: '12px',
        color: isComplete ? '#22c55e' : 'var(--text-secondary)',
        fontWeight: 600,
      }}>
        {Math.round(milestone.progress)}%
      </span>
    </div>
  );
}

// ============================================================
// AI Workflow Modal Component
// ============================================================

function AIWorkflowModal({
  isOpen,
  onClose,
  onGoalCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onGoalCreated: () => void;
}) {
  const [step, setStep] = useState<ModalStep>('form');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDays, setTargetDays] = useState(30);
  const [selectedStyle, setSelectedStyle] = useState<string>('guided');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [generatedResult, setGeneratedResult] = useState<GeneratedResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const createGoal = useAction3GoalCreate();
  const generateWorkflow = useAction3AIWorkflowGenerate();
  const createWithTasks = useAction3AIWorkflowCreate();

  useEffect(() => {
    if (!isOpen) {
      setStep('form');
      setTitle('');
      setDescription('');
      setTargetDays(30);
      setSelectedStyle('guided');
      setLoadingProgress(0);
      setGeneratedResult(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 'loading') {
      const intervals = [500, 1200, 2000, 2800];
      const progressValues = [25, 50, 75, 100];
      let currentIndex = 0;

      const timer = setInterval(() => {
        if (currentIndex < intervals.length) {
          setLoadingProgress(progressValues[currentIndex]);
          currentIndex++;
          if (currentIndex >= intervals.length) {
            clearInterval(timer);
            setTimeout(() => {
              setStep('result');
            }, 500);
          }
        }
      }, 700);

      return () => clearInterval(timer);
    }
  }, [step]);

  const handleStartAnalysis = async () => {
    if (!title.trim()) return;

    setStep('loading');
    setLoadingProgress(0);
    setIsGenerating(true);

    try {
      const result = await generateWorkflow.mutateAsync({
        title,
        description: description || undefined,
        targetDays,
        style: selectedStyle as 'guided' | 'indoctrination' | 'encouragement' | 'strict' | 'first_principles',
      });
      setGeneratedResult(result);
    } catch (error) {
      console.error('Failed to generate goal:', error);
      setStep('form');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGoal = async () => {
    if (!generatedResult) return;

    setIsCreating(true);
    try {
      await createWithTasks.mutateAsync({
        title,
        description: description || undefined,
        targetDays,
        style: selectedStyle as 'guided' | 'indoctrination' | 'encouragement' | 'strict' | 'first_principles',
      });
      onGoalCreated();
      onClose();
    } catch (error) {
      console.error('Failed to save goal:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(12px) saturate(120%)',
        WebkitBackdropFilter: 'blur(12px) saturate(120%)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(32px) saturate(160%)',
        WebkitBackdropFilter: 'blur(32px) saturate(160%)',
        borderRadius: '24px',
        padding: '32px',
        maxWidth: '560px',
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
          borderRadius: '24px 24px 0 0',
        }} />
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {step === 'form' && '创建目标'}
            {step === 'loading' && 'AI 分析中'}
            {step === 'result' && '选择学习风格'}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.04)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Step 1: Form */}
        {step === 'form' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}>
                目标标题 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：学会 Python 编程"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}>
                目标描述 <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(可选)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="描述你想要达成的目标..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}>
                预计完成天数
              </label>
              <input
                type="number"
                value={targetDays}
                onChange={(e) => setTargetDays(Math.max(7, Math.min(365, parseInt(e.target.value) || 30)))}
                min={7}
                max={365}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>

            <button
              onClick={handleStartAnalysis}
              disabled={!title.trim() || isGenerating}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid rgba(16,185,129,0.3)',
                background: title.trim() ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.15))' : 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 700,
                cursor: title.trim() ? 'pointer' : 'not-allowed',
                opacity: isGenerating ? 0.7 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              {isGenerating ? '分析中...' : '开始 AI 分析'}
            </button>
          </div>
        )}

        {/* Step 2: Loading */}
        {step === 'loading' && (
          <div style={{ padding: '40px 0' }}>
            {[
              { label: '分析目标', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
              { label: '生成路径', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
              { label: '拆分任务', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
              { label: '完成', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            ].map((item, index) => {
              const progressValues = [25, 50, 75, 100];
              const isActive = loadingProgress >= progressValues[index];
              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 0',
                    borderBottom: index < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    opacity: isActive ? 1 : 0.4,
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: isActive ? 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.15))' : 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: isActive ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {isActive ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--text-muted)"
                        strokeWidth="2"
                        style={{ animation: 'spin 1s linear infinite' }}
                      >
                        <path d={item.icon} />
                      </svg>
                    )}
                  </div>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}>
                    {item.label}
                  </span>
                </div>
              );
            })}
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* Step 3: Results & Style Selection */}
        {step === 'result' && (
          <div>
            {generatedResult && (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  生成的里程碑
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '14px' }}>
                  {generatedResult.milestones.map((m, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{m.title}</li>
                  ))}
                </ul>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px' }}>
                  共 {generatedResult.tasks.length} 个任务将在 {targetDays} 天内分配
                </p>
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
                选择学习风格
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
              }}>
                {[
                  { key: 'guided', label: '引导式', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', desc: '温和指导' },
                  { key: 'indoctrination', label: '灌输式', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', desc: '系统学习' },
                  { key: 'encouragement', label: '鼓励式', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', desc: '正向激励' },
                  { key: 'strict', label: '严格式', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', desc: '高强度' },
                  { key: 'first_principles', label: '第一性原理', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', desc: '从根本思考' },
                ].map((style) => (
                  <div
                    key={style.key}
                    onClick={() => setSelectedStyle(style.key)}
                    onMouseEnter={(e) => {
                      if (selectedStyle !== style.key) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedStyle !== style.key) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'transparent';
                      }
                    }}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: selectedStyle === style.key ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: selectedStyle === style.key ? '2px solid rgba(16,185,129,0.4)' : '2px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: selectedStyle === style.key ? 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.15))' : 'rgba(255,255,255,0.03)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      margin: '0 auto 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={selectedStyle === style.key ? 'white' : 'var(--text-secondary)'} strokeWidth="2">
                        <path d={style.icon} />
                      </svg>
                    </div>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: selectedStyle === style.key ? 'var(--accent-primary)' : 'var(--text-primary)',
                      marginBottom: '4px',
                    }}>
                      {style.label}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {style.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveGoal}
              disabled={isCreating}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid rgba(16,185,129,0.3)',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.15))',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 700,
                cursor: isCreating ? 'not-allowed' : 'pointer',
                opacity: isCreating ? 0.7 : 1,
              }}
            >
              {isCreating ? '保存中...' : '保存目标'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Goal Detail View Component
// ============================================================

function GoalDetailView({
  goal,
  onBack,
  onComplete,
  onDelete,
  locale,
}: {
  goal: GoalWithMilestones;
  onBack: () => void;
  onComplete: () => void;
  onDelete: () => void;
  locale?: string;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCompletingGoal, setIsCompletingGoal] = useState(false);
  const [isDeletingGoal, setIsDeletingGoal] = useState(false);
  const [quizMilestone, setQuizMilestone] = useState<number | null>(null);
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [showResearch, setShowResearch] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchData, setResearchData] = useState<{
    resources: Array<{ title: string; url: string; type: string; description?: string }>;
    summary: string;
    keyConcepts: string[];
  } | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [milestoneResources, setMilestoneResources] = useState<Record<string, {
    resources: Array<{ title: string; url: string; type: string; description?: string }>;
    summary: string;
    keyConcepts: string[];
  } | null>>( {});
  const milestoneResearchMutation = useAction3MilestoneResearchMutation();
  const { data: rawTasks, refetch, isLoading: isLoadingTasks, error: tasksError } = useAction3TasksByGoal(goal.id);
  const tasks = React.useMemo(() => (rawTasks || []) as TaskWithMilestone[], [rawTasks]);
  const completeTask = useAction3TaskComplete();
  const completeGoal = useAction3GoalComplete();
  const deleteGoal = useAction3GoalDelete();
  const researchMutation = useAction3ResearchMutation();

  const groupedTasks = React.useMemo(() => {
    if (!tasks || tasks.length === 0) return { today: [], thisWeek: [], upcoming: [] };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return {
      today: tasks.filter((t) => {
        const taskDate = new Date(t.scheduledDate);
        return taskDate >= today && taskDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
      }),
      thisWeek: tasks.filter((t) => {
        const taskDate = new Date(t.scheduledDate);
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        return taskDate >= tomorrow && taskDate < weekEnd;
      }),
      upcoming: tasks.filter((t) => {
        const taskDate = new Date(t.scheduledDate);
        return taskDate >= weekEnd;
      }),
    };
  }, [tasks]);

  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
  const totalTasksCount = tasks.length;

  if (isLoadingTasks) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--bg-elevated)', borderTopColor: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (tasksError) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>加载任务失败</p>
        <button onClick={() => refetch()} style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>重试</button>
      </div>
    );
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask.mutateAsync(taskId);
      refetch();
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const handleCompleteGoal = async () => {
    try {
      setIsCompletingGoal(true);
      await completeGoal.mutateAsync(goal.id);
      onComplete();
    } catch (error) {
      console.error('Failed to complete goal:', error);
    } finally {
      setIsCompletingGoal(false);
    }
  };

  const handleDeleteGoal = async () => {
    try {
      setIsDeletingGoal(true);
      await deleteGoal.mutateAsync(goal.id);
      onDelete();
    } catch (error) {
      console.error('Failed to delete goal:', error);
    } finally {
      setIsDeletingGoal(false);
    }
  };

  const handleExpandMilestone = async (milestoneId: string, milestoneTitle: string, milestoneDescription: string | null) => {
    if (expandedMilestone === milestoneId) {
      setExpandedMilestone(null);
      return;
    }
    setExpandedMilestone(milestoneId);
    if (!milestoneResources[milestoneId]) {
      try {
        const res = await milestoneResearchMutation.mutateAsync({
          goalTitle: goal.title,
          milestoneTitle,
          milestoneDescription: milestoneDescription || undefined,
        });
        setMilestoneResources(prev => ({
          ...prev,
          [milestoneId]: { resources: res.resources || [], summary: res.summary || '', keyConcepts: res.keyConcepts || [] },
        }));
      } catch (err) {
        console.error('Milestone research failed:', err);
        setMilestoneResources(prev => ({
          ...prev,
          [milestoneId]: { resources: [], summary: '加载失败，请重试', keyConcepts: [] },
        }));
      }
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <button
          onClick={onBack}
          className='glass-btn-icon'
          title={locale === 'en' ? 'Back' : locale === 'ja' ? '戻る' : locale === 'ko' ? '뒤로' : '返回'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {goal.title}
          </h2>
        </div>
        <button
          onClick={async () => {
            if (showResearch && researchData) {
              setShowResearch(false);
              return;
            }
            setShowResearch(true);
            if (!researchData) {
              setResearchLoading(true);
              try {
                const res = await researchMutation.mutateAsync({ goalTitle: goal.title, goalDescription: goal.description || undefined });
                setResearchData({ resources: res.resources || [], summary: res.summary || '', keyConcepts: res.keyConcepts || [] });
              } catch (err) {
                console.error('Research failed:', err);
              } finally {
                setResearchLoading(false);
              }
            }
          }}
          style={{
            padding: '8px 16px', borderRadius: '10px',
            background: showResearch ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
            border: showResearch ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)',
            color: showResearch ? 'var(--accent-primary-light)' : 'var(--text-secondary)',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          {researchLoading ? (
            <div style={{ width: '14px', height: '14px', border: '2px solid rgba(16,185,129,0.3)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
          AI研究
        </button>
        <StyleBadge style={goal.style} />
      </div>

      {/* AI Research Results */}
      {showResearch && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.025)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          border: '1px solid rgba(16,185,129,0.15)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.2) 50%, transparent 100%)',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-primary-light)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              AI 学习研究
            </h3>
            <button onClick={() => setShowResearch(false)} style={{
              background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px',
            }}>x</button>
          </div>
          {researchLoading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ width: '32px', height: '32px', border: '2px solid rgba(16,185,129,0.3)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>正在搜索资源...</p>
            </div>
          ) : researchData ? (
            <>
              {researchData.summary && (
                <div style={{ background: 'rgba(16,185,129,0.07)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{researchData.summary}</p>
                </div>
              )}
              {researchData.resources.length > 0 && (
                <div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    推荐资源 ({researchData.resources.length} 个)
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {researchData.resources.slice(0, 6).map((r, i) => {
                      const isVideo = r.type === 'video';
                      return (
                        <a
                          key={i}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 14px', borderRadius: '10px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            textDecoration: 'none',
                          }}
                        >
                          {isVideo ? (
                            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="#ef4444">
                                <path d="M23 7l-7 5 7 5V7zM14 5H3c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z" />
                              </svg>
                            </div>
                          ) : (
                            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                                <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /><polyline points="13 2 13 9 20 9" />
                              </svg>
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.type}</p>
                          </div>
                          {isVideo && (
                            <button
                              onClick={e => { e.preventDefault(); e.stopPropagation(); setSelectedVideoUrl(r.url); }}
                              style={{
                                padding: '4px 10px', borderRadius: '6px',
                                background: 'rgba(16,185,129,0.12)', border: 'none',
                                color: 'var(--accent-primary-light)', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                                flexShrink: 0,
                              }}
                            >
                              AI摘要
                            </button>
                          )}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>暂无研究数据</p>
          )}
        </div>
      )}

      {/* YouTube Summary Modal */}
      {selectedVideoUrl && (
        <YoutubeSummaryModal
          url={selectedVideoUrl}
          goalTitle={goal.title}
          isOpen={true}
          onClose={() => setSelectedVideoUrl(null)}
        />
      )}

      {/* Progress Section */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.025)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>总进度</span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-primary)' }}>
            {Math.round(goal.totalProgress)}%
          </span>
        </div>
        <div style={{
          height: '8px',
          borderRadius: '4px',
          background: 'rgba(255,255,255,0.03)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${goal.totalProgress}%`,
            background: 'var(--gradient-accent)',
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }} />
        </div>
        <p style={{
          fontSize: '13px',
          color: 'var(--text-muted)',
          marginTop: '8px',
        }}>
          {completedTasksCount}/{totalTasksCount} 任务完成{goal.estimatedCompletion ? ` · 预计 ${new Date(goal.estimatedCompletion).toLocaleDateString('zh-CN')} 完成` : ''}
        </p>
      </div>

      {/* Milestones Section */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.025)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
        }} />
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
          里程碑
        </h3>
        {goal.milestones.map((milestone, idx) => {
          const msTasks = tasks.filter(t => t.milestoneId === milestone.id);
          const msCompleted = msTasks.filter(t => t.status === 'completed').length;
          const msTotal = msTasks.length;
          const msAllDone = msTotal > 0 && msCompleted === msTotal;
          const isComplete = milestone.progress >= 100;
          const isExpanded = expandedMilestone === milestone.id;
          const msResources = milestoneResources[milestone.id];
          const isLoadingResources = !msResources && isExpanded && milestoneResearchMutation.isPending;

          return (
            <div key={milestone.id} style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 0',
                borderBottom: isExpanded ? 'none' : '1px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: isComplete ? 'var(--color-success)' : 'rgba(255,255,255,0.03)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {isComplete ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      {milestone.orderIndex + 1}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, cursor: 'pointer' }}
                  onClick={() => handleExpandMilestone(milestone.id, milestone.title, milestone.description)}>
                  <p style={{
                    fontSize: '14px', fontWeight: 600,
                    color: isComplete ? 'var(--text-secondary)' : 'var(--text-primary)',
                    textDecoration: isComplete ? 'line-through' : 'none',
                  }}>
                    {milestone.title}
                  </p>
                  {milestone.description && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {milestone.description}
                    </p>
                  )}
                </div>
                {/* Expand/collapse indicator */}
                <button
                  onClick={() => handleExpandMilestone(milestone.id, milestone.title, milestone.description)}
                  style={{
                    width: '28px', height: '28px', borderRadius: '6px',
                    background: isExpanded ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke={isExpanded ? '#818cf8' : 'var(--text-secondary)'}
                    strokeWidth="2"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {msAllDone && !isComplete ? (
                <button
                  onClick={() => setQuizMilestone(idx)}
                  style={{
                    padding: '6px 14px', borderRadius: '8px',
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.15))',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    color: '#fff', fontSize: '12px', fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.15)',
                  }}
                >
                    开始Quiz
                  </button>
                ) : isComplete ? (
                  <button
                    onClick={() => setQuizMilestone(idx)}
                    style={{
                      padding: '6px 14px', borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--color-success)', fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    重新测验
                  </button>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {msCompleted}/{msTotal} 任务
                  </span>
                )}
              </div>

              {/* Expanded milestone detail panel */}
              {isExpanded && (
                <div style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  backdropFilter: 'blur(16px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(140%)',
                  borderRadius: '0 0 12px 12px',
                  border: '1px solid rgba(16,185,129,0.12)',
                  borderTop: 'none',
                  marginTop: '-1px',
                  padding: '16px',
                  animation: 'fadeInUp 0.2s ease',
                }}>
                  {/* Loading state */}
                  {isLoadingResources ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0' }}>
                      <div style={{
                        width: '18px', height: '18px',
                        border: '2px solid rgba(99,102,241,0.3)',
                        borderTopColor: '#6366f1',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        正在搜索学习资源...
                      </span>
                    </div>
                  ) : msResources ? (
                    <>
                      {/* AI Summary */}
                      {msResources.summary && (
                        <div style={{
                          background: 'rgba(99,102,241,0.07)',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          marginBottom: '16px',
                          borderLeft: '3px solid #6366f1',
                        }}>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            {msResources.summary}
                          </p>
                        </div>
                      )}

                      {/* Key Concepts */}
                      {msResources.keyConcepts.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            核心知识点
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {msResources.keyConcepts.map((concept, ci) => (
                              <span key={ci} style={{
                                padding: '4px 10px', borderRadius: '6px',
                                background: 'rgba(16,185,129,0.08)',
                                border: '1px solid rgba(16,185,129,0.2)',
                                color: 'var(--accent-primary)',
                                fontSize: '12px',
                              }}>
                                {concept}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resource Links */}
                      {msResources.resources.length > 0 && (
                        <div>
                          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            学习资源
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {msResources.resources.slice(0, 6).map((resource, ri) => {
                              const typeIcon: Record<string, string> = {
                                video: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
                                article: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                                course: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
                                documentation: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                                exercise: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
                                project: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
                                community: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
                              };
                              const typeLabel: Record<string, string> = {
                                video: '视频', article: '文章', course: '课程',
                                documentation: '文档', exercise: '练习', project: '项目', community: '社区',
                              };
                              return (
                                <a key={ri} href={resource.url} target="_blank" rel="noopener noreferrer"
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '10px 12px', borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.025)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    textDecoration: 'none',
                                    transition: 'all 0.2s',
                                  }}
                                  onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)';
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.05)';
                                  }}
                                  onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)';
                                  }}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                    stroke="rgba(99,102,241,0.7)" strokeWidth="2" style={{ flexShrink: 0 }}>
                                    <path d={typeIcon[resource.type] || typeIcon.article} />
                                  </svg>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{
                                      fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)',
                                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                      {resource.title}
                                    </p>
                                    {resource.description && (
                                      <p style={{
                                        fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                      }}>
                                        {resource.description}
                                      </p>
                                    )}
                                  </div>
                                  <span style={{
                                    padding: '3px 8px', borderRadius: '5px',
                                    background: 'rgba(99,102,241,0.12)',
                                    color: '#818cf8', fontSize: '11px', fontWeight: 500, flexShrink: 0,
                                  }}>
                                    {typeLabel[resource.type] || resource.type}
                                  </span>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {msResources.resources.length === 0 && !msResources.summary && msResources.keyConcepts.length === 0 && (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                          暂无学习资源
                        </p>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
        {goal.milestones.length === 0 && (
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
            暂无里程碑
          </p>
        )}
      </div>

      {/* Quiz Modal */}
      {quizMilestone !== null && goal.milestones[quizMilestone] && (
        <MilestoneQuizModal
          goalId={goal.id}
          goalTitle={goal.title}
          milestoneIndex={quizMilestone}
          milestoneTitle={goal.milestones[quizMilestone].title}
          tasks={tasks.filter(t => t.milestoneId === goal.milestones[quizMilestone].id).map(t => ({ title: t.title, description: t.description }))}
          isOpen={true}
          onClose={() => setQuizMilestone(null)}
          onPassed={() => { refetch(); }}
        />
      )}

      {/* Tasks Section */}
      <div style={{ marginBottom: '24px' }}>
        {/* Today */}
        {groupedTasks.today.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
              今日任务
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {groupedTasks.today.map((task) => (
                <TaskItem key={task.id} task={task} onComplete={handleCompleteTask} />
              ))}
            </div>
          </div>
        )}

        {/* This Week */}
        {groupedTasks.thisWeek.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
              本周任务
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {groupedTasks.thisWeek.map((task) => (
                <TaskItem key={task.id} task={task} onComplete={handleCompleteTask} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming */}
        {groupedTasks.upcoming.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
              即将到来
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {groupedTasks.upcoming.map((task) => (
                <TaskItem key={task.id} task={task} onComplete={handleCompleteTask} />
              ))}
            </div>
          </div>
        )}

        {tasks?.length === 0 && (
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            padding: '40px',
            background: 'rgba(255,255,255,0.025)',
            borderRadius: '16px',
          }}>
            暂无任务
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleCompleteGoal}
          disabled={isCompletingGoal}
          className='glass-btn'
          style={{ flex: 1 }}
        >
          {isCompletingGoal ? '处理中...' : '完成目标'}
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          style={{
            padding: '10px 22px',
            background: 'rgba(239, 68, 68, 0.10)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(239, 68, 68, 0.30)',
            borderRadius: '12px',
            color: '#f87171',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          删除
        </button>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(12px) saturate(120%)',
          WebkitBackdropFilter: 'blur(12px) saturate(120%)',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(32px) saturate(160%)',
            WebkitBackdropFilter: 'blur(32px) saturate(160%)',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              确定要删除这个目标吗？
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              此操作不可撤销，所有相关的里程碑和任务都将被删除。
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={handleDeleteGoal}
                disabled={isDeletingGoal}
                style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isDeletingGoal ? 'not-allowed' : 'pointer',
                    opacity: isDeletingGoal ? 0.7 : 1,
                  }}
              >
                {isDeletingGoal ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Empty State Component
// ============================================================

function EmptyState({ onCreateClick, locale }: { onCreateClick: () => void; locale?: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 20px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(245,158,11,0.06))',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
        {locale === 'en' ? 'No Goals Yet' : locale === 'ja' ? '目標がありません' : locale === 'ko' ? '아직 목표가 없습니다' : '还没有目标'}
      </h2>
      <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '400px' }}>
        {locale === 'en' ? 'Create your first goal and let AI help you plan and break down tasks' :
         locale === 'ja' ? '最初の目標を作成し、AIがタスクの計画と分解を支援します' :
         locale === 'ko' ? '첫 번째 목표를 만들고 AI가 작업 계획 및 분해를 도와주세요' :
         '创建你的第一个目标，让 AI 帮你规划和分解任务'}
      </p>
      <button
        onClick={onCreateClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '14px 28px',
          borderRadius: '12px',
          border: '1px solid rgba(16,185,129,0.3)',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#fff',
          fontSize: '16px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {locale === 'en' ? 'Create Goal' : locale === 'ja' ? '目標を作成' : locale === 'ko' ? '목표 생성' : '创建目标'}
      </button>
    </div>
  );
}

// ============================================================
// Main Goals Page Component
// ============================================================

function GoalsPageContent() {
  const { t, locale } = useTranslation();
  const [selectedGoal, setSelectedGoal] = useState<GoalWithMilestones | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: rawGoals, isLoading, refetch, error: goalsError } = useAction3Goals();
  const goals = (rawGoals || []) as GoalWithMilestones[];

  const handleGoalCreated = () => {
    refetch();
  };

  return (
    <Action3Layout>
      <div style={{
        padding: '32px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {/* Page Header */}
        {selectedGoal ? (
          <ErrorBoundary fallback={
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>目标详情加载失败</p>
              <button onClick={() => setSelectedGoal(null)} style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>返回</button>
            </div>
          }>
            <GoalDetailView
              goal={selectedGoal}
              onBack={() => setSelectedGoal(null)}
              onComplete={() => {
                setSelectedGoal(null);
                refetch();
              }}
              onDelete={() => {
                setSelectedGoal(null);
                refetch();
              }}
              locale={locale}
            />
          </ErrorBoundary>
        ) : (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '32px',
            }}>
              <h1 style={{
                fontSize: '32px',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}>
                {t('goals.title')}
              </h1>
              <button
                onClick={() => setIsModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(16,185,129,0.3)',
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {t('goals.create')}
              </button>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '80px 20px',
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: '3px solid var(--bg-elevated)',
                  borderTopColor: 'var(--accent-primary)',
                  animation: 'spin 1s linear infinite',
                }} />
                <style>{`
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && goals.length === 0 && (
              <EmptyState onCreateClick={() => setIsModalOpen(true)} locale={locale} />
            )}

            {/* Goals Grid */}
            {!isLoading && goals.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '20px',
              }}>
                {goals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onClick={() => setSelectedGoal(goal as GoalWithMilestones)}
                    locale={locale}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* AI Workflow Modal */}
      <AIWorkflowModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGoalCreated={handleGoalCreated}
      />
    </Action3Layout>
  );
}

export default withNextJSPerPageLayout({ type: 'noop' }, () => <GoalsPageContent />);
