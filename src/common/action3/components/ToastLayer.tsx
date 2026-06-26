'use client';
import * as React from 'react';
import { useState } from 'react';
import { useAction3Context } from '~/common/action3/action3-store';

function ToastCard({ toast, onDismiss }: {
  toast: { id: string; event: { type: string; [key: string]: unknown } };
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);

  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 4000);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [onDismiss]);

  const { event } = toast;

  const getContent = () => {
    const t = event.type;
    if (t === 'ACHIEVEMENT_UNLOCKED') return { icon: '🏆', title: '成就解锁', sub: String(event.achievementName ?? ''), color: '#fbbf24' };
    if (t === 'GOAL_COMPLETED') return { icon: '🎯', title: '目标完成', sub: String(event.goalTitle ?? ''), color: '#10b981' };
    if (t === 'MILESTONE_COMPLETED') return { icon: '⭐', title: '里程碑达成', sub: String(event.milestoneTitle ?? ''), color: '#3b82f6' };
    if (t === 'TASK_COMPLETED') return { icon: '✅', title: '任务完成', sub: `+${event.xpEarned ?? 0} XP`, color: '#10b981' };
    if (t === 'SKILL_MASTERED') return { icon: '⚡', title: '技能掌握', sub: String(event.skillName ?? ''), color: '#8b5cf6' };
    if (t === 'SKILL_PROGRESS') return { icon: '📈', title: '技能进步', sub: String(event.skillName ?? ''), color: '#06b6d4' };
    if (t === 'STREAK_UPDATED') return { icon: '🔥', title: '连续打卡', sub: `${event.days ?? 0}天`, color: '#f59e0b' };
    if (t === 'LEVEL_UP') return { icon: '⬆️', title: '等级提升', sub: `LVL ${event.newLevel ?? 0}`, color: '#10b981' };
    if (t === 'COURSE_COMPLETED') return { icon: '📚', title: '课程完成', sub: String(event.courseTitle ?? ''), color: '#3b82f6' };
    return { icon: '💫', title: t, sub: '', color: '#fff' };
  };

  const c = getContent();

  return (
    <div style={{
      padding: '14px 20px',
      background: 'rgba(13,13,26,0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      display: 'flex', alignItems: 'center', gap: 14,
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      opacity: visible ? 1 : 0,
      transition: 'all 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
      maxWidth: 360,
      minWidth: 280,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: `linear-gradient(135deg, ${c.color}33, ${c.color}11)`,
        border: `1px solid ${c.color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>
        {c.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{c.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.sub}</div>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
        style={{
          width: 24, height: 24, borderRadius: 6,
          border: 'none', background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 16, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

export function Action3ToastLayer() {
  const ctx = useAction3Context();
  if (!ctx) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 10, zIndex: 9999,
      pointerEvents: 'none',
    }}>
      {ctx.state.toasts.filter(t => !t.dismissed).map(toast => (
        <div key={toast.id} style={{ pointerEvents: 'all' }}>
          <ToastCard toast={toast} onDismiss={() => ctx.dismissToast(toast.id)} />
        </div>
      ))}
    </div>
  );
}
