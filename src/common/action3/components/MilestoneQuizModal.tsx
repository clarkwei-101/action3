'use client';

import * as React from 'react';
import { useState } from 'react';
import { useAction3QuizGenerate, useAction3QuizSubmit, useAction3AnkiExport } from '~/common/action3/api-hooks';
import type { MilestoneQuizQuestion, MilestoneQuizSubmitResult } from '~/common/action3/api-client';

interface MilestoneQuizModalProps {
  goalId: string;
  goalTitle: string;
  milestoneIndex: number;
  milestoneTitle: string;
  tasks: Array<{ title: string; description?: string | null }>;
  keyConcepts?: string[];
  isOpen: boolean;
  onClose: () => void;
  onPassed: () => void;
}

type QuizPhase = 'intro' | 'generating' | 'quiz' | 'submitting' | 'result';

export function MilestoneQuizModal({
  goalId, goalTitle, milestoneIndex, milestoneTitle, tasks, keyConcepts, isOpen, onClose, onPassed,
}: MilestoneQuizModalProps) {
  const [phase, setPhase] = useState<QuizPhase>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<MilestoneQuizSubmitResult | null>(null);
  const [ankiExport, setAnkiExport] = useState<{ tsvContent: string; deckName: string } | null>(null);
  const [ankiLoading, setAnkiLoading] = useState(false);

  const generate = useAction3QuizGenerate(goalId, milestoneIndex, keyConcepts);
  const submit = useAction3QuizSubmit();
  const ankiQuery = useAction3AnkiExport(goalId, milestoneIndex, keyConcepts);

  const questions: MilestoneQuizQuestion[] = (generate.data?.questions) || [];

  React.useEffect(() => {
    if (!isOpen) {
      setPhase('intro');
      setCurrentQ(0);
      setAnswers({});
      setResult(null);
      setAnkiExport(null);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (generate.data && phase === 'generating') {
      setPhase('quiz');
    }
  }, [generate.data, phase]);

  React.useEffect(() => {
    if (ankiQuery.data && !ankiExport) {
      const blob = new Blob([ankiQuery.data.tsvContent], { type: 'text/tab-separated-values' });
      const url = URL.createObjectURL(blob);
      setAnkiExport({ tsvContent: ankiQuery.data.tsvContent, deckName: ankiQuery.data.deckName });
      setAnkiLoading(false);
    }
  }, [ankiQuery.data, ankiExport]);

  const handleStart = async () => {
    setPhase('generating');
    generate.refetch();
  };

  const handleSelectAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!generate.data?.assessmentId || questions.length === 0) return;
    setPhase('submitting');
    try {
      const res = await submit.mutateAsync({
        goalId,
        milestoneIndex,
        assessmentId: generate.data.assessmentId,
        questions,
        answers,
      });
      setResult(res);
      setPhase('result');
      if (res.passed) {
        handleAnkiExport();
      }
    } catch (err) {
      console.error('Quiz submit failed:', err);
      setPhase('quiz');
    }
  };

  const handleAnkiExport = () => {
    setAnkiLoading(true);
    ankiQuery.refetch();
  };

  const handleDownloadAnki = () => {
    if (!ankiExport) return;
    const blob = new Blob([ankiExport.tsvContent], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ankiExport.deckName}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const currentQuestion = questions[currentQ];
  const allAnswered = questions.every(q => answers[q.id]);
  const passed = result?.passed;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }} onClick={e => e.target === e.currentTarget && phase !== 'submitting' && onClose()}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '24px', padding: '32px',
        maxWidth: '600px', width: '100%',
        maxHeight: '90vh', overflowY: 'auto',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {phase === 'result' && result ? (passed ? '测验通过!' : '测验未通过') : '里程碑测验'}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {milestoneTitle}
            </p>
          </div>
          {phase !== 'submitting' && (
            <button onClick={onClose} style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'var(--bg-elevated)', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Intro Phase */}
        {phase === 'intro' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
              学习成果验证
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
              完成 {tasks.length} 个任务后，测验将验证你对本里程碑核心概念的理解。
              <br />通过率需达到 <strong style={{ color: '#10b981' }}>70%</strong> 以上才能解锁下一阶段。
            </p>
            <div style={{
              background: 'var(--bg-elevated)', borderRadius: '12px', padding: '16px',
              marginBottom: '24px', textAlign: 'left',
            }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>测验包含:</p>
              {[
                `${Math.ceil(questions.length * 0.6)} 道选择题`,
                `${Math.ceil(questions.length * 0.25)} 道判断题`,
                `${questions.length - Math.ceil(questions.length * 0.6) - Math.ceil(questions.length * 0.25)} 道简答题`,
              ].map((item, i) => (
                <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span style={{ color: '#6366f1', marginRight: '6px' }}>•</span>{item}
                </p>
              ))}
            </div>
            <button
              onClick={handleStart}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                background: 'var(--gradient-accent)', border: 'none',
                color: '#fff', fontSize: '16px', fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              开始测验
            </button>
          </div>
        )}

        {/* Generating Phase */}
        {phase === 'generating' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%',
              border: '3px solid rgba(99,102,241,0.2)',
              borderTopColor: '#6366f1',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px',
            }} />
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>AI 正在生成测验题...</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>根据里程碑任务内容出题</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Quiz Phase */}
        {(phase === 'quiz' || phase === 'submitting') && questions.length > 0 && (
          <div>
            {/* Progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ flex: 1, height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${((currentQ + 1) / questions.length) * 100}%`,
                  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                  borderRadius: '3px', transition: 'width 0.3s ease',
                }} />
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', flexShrink: 0 }}>
                {currentQ + 1}/{questions.length}
              </span>
            </div>

            {/* Question */}
            {currentQuestion && (
              <div style={{
                background: 'var(--bg-elevated)', borderRadius: '16px', padding: '24px',
                marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{
                    fontSize: '11px', padding: '3px 8px', borderRadius: '999px',
                    background: currentQuestion.type === 'multiple_choice'
                      ? 'rgba(59,130,246,0.15)' : currentQuestion.type === 'true_false'
                        ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                    color: currentQuestion.type === 'multiple_choice'
                      ? '#3b82f6' : currentQuestion.type === 'true_false'
                        ? '#10b981' : '#f59e0b',
                    fontWeight: 600,
                  }}>
                    {currentQuestion.type === 'multiple_choice' ? '选择题' : currentQuestion.type === 'true_false' ? '判断题' : '简答题'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {currentQuestion.topic}
                  </span>
                </div>
                <p style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.6 }}>
                  {currentQuestion.question}
                </p>
              </div>
            )}

            {/* Options */}
            {currentQuestion?.type === 'multiple_choice' && currentQuestion.options && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {currentQuestion.options.map((opt, i) => {
                  const selected = answers[currentQuestion.id] === opt;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectAnswer(currentQuestion.id, opt)}
                      style={{
                        padding: '14px 16px', borderRadius: '12px', textAlign: 'left',
                        background: selected ? 'rgba(99,102,241,0.15)' : 'var(--bg-elevated)',
                        border: selected ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.06)',
                        color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span style={{ color: selected ? '#6366f1' : 'var(--text-muted)', marginRight: '8px', fontWeight: 600 }}>
                        {String.fromCharCode(65 + i)}.
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion?.type === 'true_false' && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                {['true', 'false'].map(val => {
                  const selected = answers[currentQuestion.id] === val;
                  return (
                    <button
                      key={val}
                      onClick={() => handleSelectAnswer(currentQuestion.id, val)}
                      style={{
                        flex: 1, padding: '14px', borderRadius: '12px', textAlign: 'center',
                        background: selected ? 'rgba(99,102,241,0.15)' : 'var(--bg-elevated)',
                        border: selected ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.06)',
                        color: selected ? '#6366f1' : 'var(--text-primary)',
                        fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {val === 'true' ? '正确' : '错误'}
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion?.type === 'short_answer' && (
              <div style={{ marginBottom: '20px' }}>
                <textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={e => handleSelectAnswer(currentQuestion.id, e.target.value)}
                  placeholder="请输入你的答案..."
                  rows={3}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px',
                    background: 'var(--bg-elevated)',
                    border: '2px solid rgba(255,255,255,0.06)',
                    color: 'var(--text-primary)', fontSize: '14px',
                    resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                  }}
                />
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {currentQ > 0 && (
                <button
                  onClick={() => setCurrentQ(q => q - 1)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px',
                    background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer',
                  }}
                >
                  上一题
                </button>
              )}
              {currentQ < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQ(q => q + 1)}
                  disabled={!answers[currentQuestion?.id]}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px',
                    background: answers[currentQuestion?.id] ? 'var(--gradient-accent)' : 'var(--bg-elevated)',
                    border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600,
                    cursor: answers[currentQuestion?.id] ? 'pointer' : 'not-allowed',
                    opacity: answers[currentQuestion?.id] ? 1 : 0.5,
                  }}
                >
                  下一题
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered || phase === 'submitting'}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '12px',
                    background: allAnswered ? 'var(--gradient-accent)' : 'var(--bg-elevated)',
                    border: 'none', color: '#fff', fontSize: '16px', fontWeight: 700,
                    cursor: allAnswered && phase !== 'submitting' ? 'pointer' : 'not-allowed',
                    opacity: phase === 'submitting' ? 0.7 : 1,
                  }}
                >
                  {phase === 'submitting' ? '提交中...' : '提交答案'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Result Phase */}
        {phase === 'result' && result && (
          <div>
            {/* Score Display */}
            <div style={{
              textAlign: 'center', padding: '20px 0 24px',
              background: passed ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              borderRadius: '16px', marginBottom: '24px',
              border: `1px solid ${passed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}>
              <div style={{
                fontSize: '56px', fontWeight: 800,
                color: passed ? '#10b981' : '#ef4444',
                marginBottom: '8px',
              }}>
                {result.score}%
              </div>
              <p style={{ fontSize: '16px', color: passed ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                {passed ? '测验通过!' : '还需努力'}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                答对 {result.results.filter(r => r.isCorrect).length}/{result.questions.length} 题
              </p>
            </div>

            {/* Feedback Summary */}
            <div style={{
              background: 'var(--bg-elevated)', borderRadius: '12px',
              padding: '16px', marginBottom: '16px',
            }}>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {result.feedback.summary}
              </p>
            </div>

            {/* Strengths & Weaknesses */}
            {(result.feedback.strengths.length > 0 || result.feedback.weaknesses.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {result.feedback.strengths.length > 0 && (
                  <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: '12px', padding: '12px' }}>
                    <p style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, marginBottom: '6px' }}>掌握良好</p>
                    {result.feedback.strengths.map((s, i) => (
                      <p key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                        <span style={{ color: '#10b981', marginRight: '4px' }}>✓</span>{s}
                      </p>
                    ))}
                  </div>
                )}
                {result.feedback.weaknesses.length > 0 && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: '12px', padding: '12px' }}>
                    <p style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600, marginBottom: '6px' }}>薄弱环节</p>
                    {result.feedback.weaknesses.map((w, i) => (
                      <p key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                        <span style={{ color: '#ef4444', marginRight: '4px' }}>!</span>{w}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Anki Export */}
            {passed && (
              <div style={{
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: '12px', padding: '16px', marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '14px', color: '#818cf8', fontWeight: 600, marginBottom: '2px' }}>
                      Anki 闪卡已生成
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      下载后导入 Anki 用于间隔重复记忆
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadAnki}
                    disabled={ankiLoading}
                    style={{
                      padding: '8px 16px', borderRadius: '8px',
                      background: 'rgba(99,102,241,0.2)', border: 'none',
                      color: '#818cf8', fontSize: '13px', fontWeight: 600,
                      cursor: ankiLoading ? 'not-allowed' : 'pointer',
                      opacity: ankiLoading ? 0.7 : 1,
                    }}
                  >
                    {ankiLoading ? '生成中...' : '下载 TSV'}
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {!passed && (
                <button
                  onClick={() => { setPhase('intro'); setAnswers({}); setCurrentQ(0); }}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer',
                  }}
                >
                  重新测验
                </button>
              )}
              <button
                onClick={() => {
                  if (passed) { onPassed(); onClose(); }
                  else { setPhase('quiz'); setCurrentQ(0); }
                }}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  background: passed ? 'var(--gradient-accent)' : 'var(--bg-elevated)',
                  border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {passed ? '完成' : '继续答题'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
