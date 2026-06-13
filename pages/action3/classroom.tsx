'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Action3Layout } from '~/apps/action3/shared/Action3Layout';
import { useAction3ClassroomScenes, useAction3ClassroomCreate, useAction3ClassroomMessage } from '~/common/action3/api-hooks';
import { useTranslation } from '~/common/action3/i18n';
import { useUIPreferencesStore } from '~/common/stores/store-ui';

const AGENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  teacher: { bg: 'rgba(16,185,129,0.12)', border: '#10b981', text: '#34d399' },
  'student-curious': { bg: 'rgba(16,185,129,0.12)', border: '#10b981', text: '#34d399' },
  'student-deep': { bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', text: '#fbbf24' },
  'student-practical': { bg: 'rgba(236,72,153,0.12)', border: '#ec4899', text: '#f472b6' },
  user: { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)', text: '#e2e8f0' },
};

interface ClassroomAgent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
}

interface ClassroomMessage {
  id: string;
  agentId: string;
  agentName: string;
  agentRole: string;
  content: string;
  timestamp: number;
  isUser?: boolean;
}

export default function ClassroomPage() {
  return (
    <Action3Layout>
      <ClassroomContent />
    </Action3Layout>
  );
}

function ClassroomContent() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTopic, setSessionTopic] = useState('');
  const [sessionScene, setSessionScene] = useState('');
  const [agents, setAgents] = useState<ClassroomAgent[]>([]);
  const [messages, setMessages] = useState<ClassroomMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { t, locale } = useTranslation();
  const preferredLanguage = useUIPreferencesStore((s) => s.preferredLanguage ?? 'zh-CN');

  const scenesQuery = useAction3ClassroomScenes(locale);
  const createSession = useAction3ClassroomCreate();
  const sendMessage = useAction3ClassroomMessage();

  const scenes = scenesQuery.data
    ? Object.entries(scenesQuery.data as Record<string, { title: string; description: string; icon: string }>).map(([key, val]) => ({
        key,
        title: val.title,
        description: val.description,
        icon: val.icon,
      }))
    : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreate = async (topic: string, scene: string, style: string) => {
    try {
      const result = await createSession.mutateAsync({
        topic,
        sceneType: scene,
        teachingStyle: style,
        participantCount: 2,
        locale: preferredLanguage,
      }) as { id: string; topic: string; sceneType: string; agents: unknown[]; messages: unknown[]; createdAt: number };
      setSessionId(result.id);
      setSessionTopic(result.topic);
      setSessionScene(result.sceneType);
      setAgents(result.agents as ClassroomAgent[]);
      setMessages((result.messages as ClassroomMessage[]).map(m => ({ ...m, isUser: m.agentId === 'user' })));
      setShowSetup(false);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId || sendMessage.isPending) return;
    const userInput = input.trim();
    setInput('');
    setIsTyping(true);

    // Optimistically add user message
    const userAgentName = messages.length > 0 ? messages.find(m => m.agentId === 'user')?.agentName || t('classroom.you') : t('classroom.you');
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      agentId: 'user',
      agentName: userAgentName,
      agentRole: 'user',
      content: userInput,
      timestamp: Date.now(),
      isUser: true,
    }]);

    try {
      const result = await sendMessage.mutateAsync({ sessionId, userMessage: userInput, locale: preferredLanguage }) as { messages: unknown[] };
      const newMessages = result.messages as ClassroomMessage[];
      setMessages(prev => [...prev, ...newMessages.map(m => ({ ...m, isUser: false }))]);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Setup screen
  if (showSetup) {
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          {t('classroom.title')}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {locale === 'en' ? 'Learn with AI characters through multi-agent conversation to deepen understanding' :
           locale === 'ja' ? 'AIキャラクターとマルチエージェント会話で学習し、理解を深める' :
           locale === 'ko' ? 'AI 캐릭터와 다중 에이전트 대화를 통해 학습하고 이해를 깊게 하세요' :
           '与 AI 角色一起学习，通过多智能体对话深化理解'}
        </p>
      </div>

      <div className='glass-card' style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {locale === 'en' ? 'Learning Topic' :
             locale === 'ja' ? '学習トピック' :
             locale === 'ko' ? '학습 주제' :
             '学习话题'}
          </label>
          <textarea
            placeholder={locale === 'en' ? 'e.g., React Hooks, Python Async, Design Patterns...' :
                       locale === 'ja' ? '例：React Hooks、Python Async、Design Patterns...' :
                       locale === 'ko' ? '예: React Hooks, Python Async, Design Patterns...' :
                       '例如：React Hooks 深度理解、Python 异步编程、设计模式...'}
            rows={3}
            value={sessionTopic}
            onChange={e => setSessionTopic(e.target.value)}
            className='glass-input'
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            {locale === 'en' ? 'Classroom Mode' :
             locale === 'ja' ? '教室モード' :
             locale === 'ko' ? '교실 모드' :
             '课堂模式'}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(scenes.length > 0 ? scenes : [
              { key: 'lecture', title: t('classroom.lectureMode') || (locale === 'en' ? 'Lecture' : locale === 'ja' ? '講義' : locale === 'ko' ? '강의' : '课堂讲授'), description: locale === 'en' ? 'AI Teacher explains systematically' : locale === 'ja' ? 'AI先生が体系的に説明' : locale === 'ko' ? 'AI 선생님이 체계적으로 설명' : 'AI 教师系统讲解知识点', icon: '' },
              { key: 'qa', title: t('classroom.qaMode') || (locale === 'en' ? 'Q&A' : locale === 'ja' ? '質疑応答' : locale === 'ko' ? 'Q&A' : '问答模式'), description: locale === 'en' ? 'Students ask, AI answers' : locale === 'ja' ? '生徒が質問しAIが回答' : locale === 'ko' ? '학생이 질문하고 AI가 답변' : '学生提问 AI 回答', icon: '' },
              { key: 'roundtable', title: t('classroom.roundtableMode') || (locale === 'en' ? 'Roundtable' : locale === 'ja' ? '円卓議論' : locale === 'ko' ? '라운드테이블' : '圆桌讨论'), description: locale === 'en' ? 'Multiple AI characters discuss' : locale === 'ja' ? '複数のAIキャラクターが議論' : locale === 'ko' ? '여러 AI 캐릭터가 논의' : '多个 AI 角色共同讨论', icon: '' },
            ]).map(scene => (
              <button
                key={scene.key}
                onClick={() => setSessionScene(scene.key)}
                className={sessionScene === scene.key ? 'glass-card' : 'glass-card'}
                style={{
                  padding: '14px 16px',
                  border: sessionScene === scene.key ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                  background: sessionScene === scene.key ? 'var(--glass-bg-hover)' : 'var(--glass-bg)',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, color: sessionScene === scene.key ? 'var(--accent-primary-light)' : 'var(--text-primary)', marginBottom: '4px' }}>
                  {scene.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{scene.description}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => handleCreate(sessionTopic || (locale === 'en' ? 'Learning Discussion' : locale === 'ja' ? '学習討論' : locale === 'ko' ? '학습 토론' : '学习讨论'), sessionScene || 'lecture', 'guided')}
          disabled={createSession.isPending}
          className='glass-btn'
          style={{
            width: '100%',
            opacity: createSession.isPending ? 0.7 : 1,
          }}
        >
          {createSession.isPending ? (locale === 'en' ? 'Creating...' : locale === 'ja' ? '作成中...' : locale === 'ko' ? '생성 중...' : '创建中...') : (locale === 'en' ? 'Start Classroom' : locale === 'ja' ? '教室を開始' : locale === 'ko' ? '교실 시작' : '开始课堂')}
        </button>
      </div>
    </div>
  );
  }

  // Classroom view
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Agent sidebar */}
      <div style={{
        width: '240px',
        borderRight: '1px solid var(--glass-border)',
        background: 'rgba(8,12,24,0.98)',
        padding: '20px 16px',
        overflowY: 'auto',
      }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--glass-border)' }}>
          {locale === 'en' ? 'Participants' :
           locale === 'ja' ? '参加者' :
           locale === 'ko' ? '참가자' :
           '参与者'} ({agents.length + 1})
        </h2>

        {/* User */}
        <div className='glass-card' style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '16px',
          padding: '8px',
          background: 'var(--glass-bg)',
          border: `1px solid ${AGENT_COLORS.user.border}`,
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: AGENT_COLORS.user.text }}>
              {locale === 'en' ? 'You' :
               locale === 'ja' ? 'あなた' :
               locale === 'ko' ? '너' :
               '你'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {locale === 'en' ? 'Participant' :
               locale === 'ja' ? '参加者' :
               locale === 'ko' ? '참가자' :
               '参与者'}
            </div>
          </div>
        </div>

        {/* AI Agents */}
        {agents.map(agent => {
          const colors = AGENT_COLORS[agent.role] || AGENT_COLORS.teacher;
          return (
            <div key={agent.id} className='glass-card' style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '12px',
              padding: '8px',
              background: 'var(--glass-bg)',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: agent.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                  <path d={agent.avatar} />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>{agent.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {agent.role === 'teacher' ? t('classroom.teacher') :
                   agent.role === 'student-curious' ? (locale === 'en' ? 'Curious Student' : locale === 'ja' ? '好奇心生徒' : locale === 'ko' ? '호기심 학생' : t('classroom.student1')) :
                   agent.role === 'student-deep' ? (locale === 'en' ? 'Deep Thinker' : locale === 'ja' ? '論理派' : locale === 'ko' ? '깊은 사고가' : t('classroom.student2')) :
                   agent.role === 'student-practical' ? (locale === 'en' ? 'Practical Student' : locale === 'ja' ? '実践派' : locale === 'ko' ? '실천형' : t('classroom.student3')) : 
                   (locale === 'en' ? 'Student' : locale === 'ja' ? '生徒' : locale === 'ko' ? '학생' : '同学')}
                </div>
              </div>
            </div>
          );
        })}

        {/* Topic */}
        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid var(--glass-border)',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            {locale === 'en' ? 'Current Topic' :
             locale === 'ja' ? '現在の話題' :
             locale === 'ko' ? '현재 화제' :
             '当前话题'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.5 }}>
            {sessionTopic}
          </div>
        </div>

        {/* New session */}
        <button
          onClick={() => { setShowSetup(true); setSessionId(null); setMessages([]); setAgents([]); }}
          className='glass-btn-secondary'
          style={{
            width: '100%',
            marginTop: '16px',
          }}
        >
          {locale === 'en' ? 'New Classroom' :
           locale === 'ja' ? '新しい教室' :
           locale === 'ko' ? '새 교실' :
           '新建课堂'}
        </button>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--glass-border)',
          background: 'rgba(8,12,24,0.95)',
        }}>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {t('classroom.title')}
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {sessionTopic} · {scenes.find(s => s.key === sessionScene)?.title || ''}
          </p>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {messages.map(msg => {
            const colors = AGENT_COLORS[msg.agentRole] || AGENT_COLORS.user;
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: msg.isUser ? 'row-reverse' : 'row',
                  gap: '12px',
                  animation: 'fadeIn 0.3s ease',
                }}
              >
                {/* Avatar */}
                {!msg.isUser && (
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: colors.border,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                      <path d={(agents.find(a => a.id === msg.agentId) as { avatar?: string } | undefined)?.avatar || 'M12 12m-10 0a10 10 0 1020 0 10 10 0 10-20 0'} />
                    </svg>
                  </div>
                )}

                {/* Bubble */}
                <div style={{ maxWidth: '70%' }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: msg.isUser ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                  }}>
                    {!msg.isUser && (
                      <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text }}>
                        {msg.agentName}
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(msg.timestamp).toISOString().slice(11, 16)}
                    </span>
                  </div>
                  <div className='glass-card' style={{
                    padding: '12px 16px',
                    borderRadius: msg.isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div style={{ display: 'flex', gap: '12px', animation: 'fadeIn 0.3s ease' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: '#10b981',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S9.168 5.477 8 6.253m0 13C9.168 18.523 10.832 19 12.5 19s3.332-.477 4.5-1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13" />
                </svg>
              </div>
              <div className='glass-card' style={{
                padding: '12px 16px',
                borderRadius: '16px 16px 16px 4px',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border-accent)',
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: '#10b981',
                    animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite both`,
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--glass-border)',
          background: 'rgba(15,15,20,0.95)',
        }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-end',
          }}>
            <textarea
              ref={textareaRef}
              placeholder={locale === 'en' ? 'Type your question...' :
                         locale === 'ja' ? '質問を入力...' :
                         locale === 'ko' ? '질문을 입력하세요...' :
                         '输入你的问题...'}
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={handleKeyDown}
              className='glass-input'
              style={{
                flex: 1,
                resize: 'none',
                lineHeight: 1.5,
                maxHeight: '120px',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className={input.trim() ? 'glass-btn' : 'glass-btn'}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: input.trim() ? 'var(--glass-bg-hover)' : 'var(--glass-bg)',
                color: input.trim() ? 'var(--accent-primary-light)' : 'var(--text-muted)',
                border: input.trim() ? '1px solid var(--glass-border-accent)' : '1px solid var(--glass-border)',
                cursor: input.trim() && !isTyping ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
            {locale === 'en' ? 'Enter to send · Shift+Enter for new line' :
             locale === 'ja' ? 'Enterで送信 · Shift+Enterで改行' :
             locale === 'ko' ? 'Enter로 전송 · Shift+Enter으로 줄 바꿈' :
             'Enter 发送 · Shift+Enter 换行'}
          </p>
        </div>
      </div>

      <style>{`
        /* Liquid Glass CSS Variables */
        :root {
          --glass-bg: rgba(255, 255, 255, 0.025);
          --glass-bg-hover: rgba(255, 255, 255, 0.04);
          --glass-blur: blur(24px) saturate(160%);
          --glass-border: rgba(255, 255, 255, 0.07);
          --glass-border-hover: rgba(255, 255, 255, 0.12);
          --glass-border-accent: rgba(16, 185, 129, 0.35);
          --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
          --glass-shadow-hover: 0 16px 48px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3);
          --glass-highlight: inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 0 rgba(0, 0, 0, 0.1);
          --glass-shine: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%, rgba(255,255,255,0.01) 100%);
        }

        /* Glass Card Base */
        .glass-card {
          background: var(--glass-bg);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          box-shadow: var(--glass-shadow), var(--glass-highlight), var(--glass-shine);
          transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.32,0.72,0,1);
          position: relative;
          overflow: hidden;
        }
        .glass-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%);
          pointer-events: none;
        }
        .glass-card:hover {
          background: var(--glass-bg-hover);
          border-color: var(--glass-border-hover);
          box-shadow: var(--glass-shadow-hover), var(--glass-highlight), var(--glass-shine);
          transform: translateY(-2px);
        }
        .glass-card:active {
          background: var(--glass-bg);
          transform: translateY(0);
          box-shadow: var(--glass-shadow), var(--glass-highlight), var(--glass-shine);
        }

        /* Glass Button */
        .glass-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 22px;
          background: var(--glass-bg);
          backdrop-filter: blur(16px) saturate(160%);
          -webkit-backdrop-filter: blur(16px) saturate(160%);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          color: var(--accent-primary-light);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
          box-shadow: var(--glass-shadow), var(--glass-highlight);
          user-select: none;
        }
        .glass-btn:hover {
          background: var(--glass-bg-hover);
          border-color: var(--glass-border-accent);
          box-shadow: var(--glass-shadow-hover), var(--glass-highlight);
          transform: translateY(-2px);
        }
        .glass-btn:active {
          transform: translateY(0) scale(0.97);
          box-shadow: var(--glass-shadow), var(--glass-highlight);
        }
        .glass-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* Glass Button Secondary */
        .glass-btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 22px;
          background: var(--glass-bg);
          backdrop-filter: blur(16px) saturate(160%);
          -webkit-backdrop-filter: blur(16px) saturate(160%);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
          box-shadow: var(--glass-shadow);
          user-select: none;
        }
        .glass-btn-secondary:hover {
          background: var(--glass-bg-hover);
          border-color: var(--glass-border-hover);
          color: var(--text-primary);
          box-shadow: var(--glass-shadow-hover);
          transform: translateY(-2px);
        }
        .glass-btn-secondary:active {
          transform: translateY(0) scale(0.97);
        }

        /* Glass Input */
        .glass-input {
          width: 100%;
          background: var(--glass-bg);
          backdrop-filter: blur(12px) saturate(160%);
          -webkit-backdrop-filter: blur(12px) saturate(160%);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 12px;
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);
        }
        .glass-input::placeholder {
          color: var(--text-muted);
        }
        .glass-input:focus {
          border-color: var(--glass-border-accent);
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15), 0 0 0 3px rgba(16,185,129,0.08);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
