'use client';
import * as React from 'react';
import { useState, useEffect } from 'react';
import { Action3Layout } from '~/apps/action3/shared/Action3Layout';
import { useAction3Store } from '~/common/action3/action3-store';
import type { Action3Event } from '~/common/action3/action3-store';

// ============================================================
// Event type → display config
// ============================================================
const EVENT_CONFIG: Record<string, {
  icon: string;
  color: string;
  title: string;
  getSub: (e: Action3Event) => string;
}> = {
  GOAL_COMPLETED: {
    icon: '🏆', color: '#10b981',
    title: '目标完成',
    getSub: e => `🎯 ${(e as Action3Event & { goalTitle: string }).goalTitle}`,
  },
  GOAL_CREATED: {
    icon: '📋', color: '#3b82f6',
    title: '新建目标',
    getSub: e => (e as Action3Event & { goalTitle: string }).goalTitle,
  },
  MILESTONE_COMPLETED: {
    icon: '⭐', color: '#8b5cf6',
    title: '里程碑达成',
    getSub: e => (e as Action3Event & { milestoneTitle: string }).milestoneTitle,
  },
  TASK_COMPLETED: {
    icon: '✅', color: '#10b981',
    title: '任务完成',
    getSub: e => `${(e as Action3Event & { taskTitle: string }).taskTitle} · +${(e as Action3Event & { xpEarned: number }).xpEarned} XP`,
  },
  SKILL_MASTERED: {
    icon: '⚡', color: '#f59e0b',
    title: '技能掌握',
    getSub: e => (e as Action3Event & { skillName: string }).skillName,
  },
  SKILL_PROGRESS: {
    icon: '📈', color: '#06b6d4',
    title: '技能进步',
    getSub: e => (e as Action3Event & { skillName: string }).skillName,
  },
  ACHIEVEMENT_UNLOCKED: {
    icon: '🏅', color: '#fbbf24',
    title: '成就解锁',
    getSub: e => (e as Action3Event & { achievementName: string }).achievementName,
  },
  STREAK_UPDATED: {
    icon: '🔥', color: '#f59e0b',
    title: '连续打卡',
    getSub: e => `${(e as Action3Event & { days: number }).days}天`,
  },
  LEVEL_UP: {
    icon: '⬆️', color: '#10b981',
    title: '等级提升',
    getSub: e => `LVL ${(e as Action3Event & { newLevel: number }).newLevel}`,
  },
  COURSE_COMPLETED: {
    icon: '📚', color: '#3b82f6',
    title: '课程完成',
    getSub: e => (e as Action3Event & { courseTitle: string }).courseTitle,
  },
  VOICE_ASKED: {
    icon: '🎙️', color: '#06b6d4',
    title: '语音提问',
    getSub: e => (e as Action3Event & { question: string }).question,
  },
};

function getEventConfig(type: string) {
  return EVENT_CONFIG[type] ?? { icon: '💫', color: '#fff', title: type, getSub: () => '' };
}

// ============================================================
// Timeline Node
// ============================================================
function TimelineNode({ event, index, total }: {
  event: Action3Event;
  index: number;
  total: number;
}) {
  const cfg = getEventConfig(event.type);
  const isLeft = index % 2 === 0;

  // Format timestamp - show relative time
  const timeAgo = React.useMemo(() => {
    const now = Date.now();
    const ts = (event as Action3Event & { timestamp?: number }).timestamp ?? now;
    const diff = now - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
  }, [event]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: isLeft ? 'flex-start' : 'flex-end',
      position: 'relative',
      paddingBottom: 40,
    }}>
      {/* Connector dot + line */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: 20,
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 2,
      }}>
        {/* Line */}
        <div style={{
          width: 2,
          height: index < total - 1 ? 40 : 0,
          background: 'linear-gradient(to bottom, rgba(16,185,129,0.4), transparent)',
        }} />
        {/* Dot */}
        <div style={{
          width: 16, height: 16, borderRadius: '50%',
          background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}88)`,
          boxShadow: `0 0 16px ${cfg.color}66`,
          border: '2px solid rgba(255,255,255,0.1)',
        }} />
      </div>

      {/* Card */}
      <div style={{
        width: '44%',
        background: 'var(--glass-bg, rgba(13,13,26,0.6))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: '16px 20px',
        marginLeft: isLeft ? 0 : 'auto',
        marginRight: isLeft ? 'auto' : 0,
        transform: isLeft ? 'translateX(-20px)' : 'translateX(20px)',
        opacity: 0,
        animation: 'timelineFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        animationDelay: `${index * 80}ms`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 20 }}>{cfg.icon}</span>
          <span style={{
            fontSize: 13, fontWeight: 700, color: cfg.color,
            fontFamily: 'var(--font-sans, -apple-system, sans-serif)',
          }}>
            {cfg.title}
          </span>
          <span style={{
            marginLeft: 'auto',
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono, monospace)',
          }}>
            {timeAgo}
          </span>
        </div>
        <p style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-sans, -apple-system, sans-serif)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {cfg.getSub(event)}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Stats Summary Bar
// ============================================================
function StatsSummary({ events }: { events: Action3Event[] }) {
  const counts = React.useMemo(() => {
    const c: Record<string, number> = {};
    events.forEach(e => { c[e.type] = (c[e.type] || 0) + 1; });
    return c;
  }, [events]);

  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ ...getEventConfig(type), type, count }));

  if (top.length === 0) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: 12,
      marginBottom: 40,
    }}>
      {top.map(item => (
        <div key={item.type} style={{
          padding: '14px 16px',
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${item.color}22`,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>{item.icon}</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: item.color, fontFamily: 'var(--font-mono, monospace)' }}>{item.count}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.title}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Page Content
// ============================================================
function JourneyPageContent() {
  const { state } = useAction3Store();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Reverse events so newest is first
  const events = React.useMemo(
    () => [...state.events].reverse(),
    [state.events],
  );

  const totalEvents = events.length;

  return (
    <div style={{
      padding: '40px 32px',
      maxWidth: 900,
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <h1 style={{
          fontSize: 36, fontWeight: 800, color: 'var(--text-primary)',
          marginBottom: 8,
          fontFamily: 'var(--font-sans, -apple-system, sans-serif)',
        }}>
          学习旅程
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
          {totalEvents === 0 ? '开始学习，记录你的每一步成长' : `共 ${totalEvents} 条成长记录`}
        </p>
      </div>

      {/* Stats Summary */}
      {mounted && totalEvents > 0 && (
        <div style={{ animation: 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          <StatsSummary events={events} />
        </div>
      )}

      {/* Empty state */}
      {totalEvents === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          animation: 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            当你完成任务、达成里程碑、<br />
            解锁成就或提升等级时，<br />
            都会被记录在这里
          </p>
          <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center' }}>
            {[
              { label: '完成目标', icon: '🎯', href: '/action3/home' },
              { label: '技能树', icon: '🌳', href: '/action3/skilltree' },
              { label: '成就', icon: '🏅', href: '/action3/achievements' },
            ].map(item => (
              <a key={item.href} href={item.href} style={{
                padding: '10px 20px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--text-secondary)',
                fontSize: 13,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s ease',
              }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {totalEvents > 0 && (
        <div style={{
          position: 'relative',
          paddingLeft: 0,
        }}>
          {/* Center line */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: 2,
            background: 'linear-gradient(to bottom, rgba(16,185,129,0.5), rgba(139,92,246,0.5), transparent)',
            transform: 'translateX(-50%)',
          }} />

          {events.map((event, i) => (
            <TimelineNode key={i} event={event} index={i} total={totalEvents} />
          ))}
        </div>
      )}

      {/* Inject keyframes */}
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes timelineFadeIn {
          from { opacity:0; transform: translateX(40px); }
          to { opacity:1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export default function JourneyPage() {
  return (
    <Action3Layout>
      <JourneyPageContent />
    </Action3Layout>
  );
}
