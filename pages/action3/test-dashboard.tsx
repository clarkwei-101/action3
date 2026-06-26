'use client';
import * as React from 'react';
import { useState } from 'react';
import { Action3Layout } from '~/apps/action3/shared/Action3Layout';
import { Action3StoreProvider, useAction3Store, Action3Event } from '~/common/action3/action3-store';

// ============================================================
// Shared UI Components
// ============================================================

/** SVG progress ring with animated stroke-dashoffset */
export function ProgressRing({ progress, size = 120, stroke = 8, color = 'var(--accent-primary)' }: {
  progress: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(100, Math.max(0, progress)) / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      {/* Track */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      {/* Progress */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
      />
    </svg>
  );
}

/** Animated flame icon for streak counter */
export function FlameIcon({ size = 24, intensity = 1 }: { size?: number; intensity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ overflow: 'visible' }}>
      <g>
        <path
          d="M12 2C12 2 7 8 7 13a5 5 0 0010 0c0-3-2-6-2-6s-.5 2-1 3c0 0 0-2-2-2s-1 2 0 3c0 0-1-1-1-3 0-1 .5-2.5.5-2.5S13 7 13 5c0 0-1-2-1-3z"
          fill="url(#flameGrad)"
        >
          <animateTransform
            attributeName="transform"
            type="translate"
            values={`0 0; 0 ${-intensity * 2}; 0 0`}
            dur={`${1.5 - intensity * 0.3}s`}
            repeatCount="indefinite"
          />
        </path>
        <defs>
          <radialGradient id="flameGrad" cx="50%" cy="70%" r="60%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </radialGradient>
        </defs>
      </g>
    </svg>
  );
}

/** XP Level Badge with animated glow */
export function LevelBadge({ level, xp, nextLevelXP }: { level: number; xp: number; nextLevelXP: number }) {
  const progress = nextLevelXP > 0 ? (xp % nextLevelXP) / nextLevelXP * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'linear-gradient(135deg, #10b981, #059669)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, fontWeight: 800, color: '#fff',
        boxShadow: '0 0 20px rgba(16,185,129,0.4)',
        fontFamily: 'var(--font-mono, monospace)',
      }}>
        {level}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>LVL {level}</span>
        <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width: `${progress}%`, height: '100%',
            background: 'linear-gradient(90deg, #10b981, #34d399)',
            borderRadius: 2,
            transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
          }} />
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{xp % nextLevelXP} / {nextLevelXP} XP</span>
      </div>
    </div>
  );
}

/** Toast notification card */
export function ToastCard({ toast, onDismiss }: {
  toast: { id: string; event: Action3Event; timestamp: number };
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);
  React.useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 4000);
    return () => { cancelAnimationFrame(t); clearTimeout(timer); };
  }, [onDismiss]);

  const { event } = toast;
  const getContent = () => {
    switch (event.type) {
      case 'ACHIEVEMENT_UNLOCKED':
        return { icon: event.icon, title: '成就解锁', sub: event.achievementName, color: '#fbbf24' };
      case 'GOAL_COMPLETED':
        return { icon: '🏆', title: '目标完成', sub: event.goalTitle, color: '#10b981' };
      case 'MILESTONE_COMPLETED':
        return { icon: '🎯', title: '里程碑达成', sub: event.milestoneTitle, color: '#3b82f6' };
      case 'TASK_COMPLETED':
        return { icon: '✅', title: '任务完成', sub: `+${event.xpEarned} XP`, color: '#10b981' };
      case 'SKILL_MASTERED':
        return { icon: '⚡', title: '技能掌握', sub: event.skillName, color: '#8b5cf6' };
      case 'STREAK_UPDATED':
        return { icon: '🔥', title: '连续打卡', sub: `${event.days}天`, color: '#f59e0b' };
      case 'LEVEL_UP':
        return { icon: '⬆️', title: '等级提升', sub: `LVL ${event.newLevel}`, color: '#10b981' };
      case 'COURSE_COMPLETED':
        return { icon: '📚', title: '课程完成', sub: event.courseTitle, color: '#3b82f6' };
      default:
        return { icon: '💫', title: event.type, sub: '', color: '#fff' };
    }
  };

  const c = getContent();
  return (
    <div style={{
      padding: '14px 20px',
      background: 'rgba(13,13,26,0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      display: 'flex', alignItems: 'center', gap: 14,
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      opacity: visible ? 1 : 0,
      transition: 'all 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
      boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)`,
      maxWidth: 360,
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
    </div>
  );
}

/** Bento grid card with hover lift */
export function BentoCard({ children, style, className, onClick }: {
  children: React.ReactNode; style?: React.CSSProperties; className?: string; onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--glass-bg, rgba(13,13,26,0.6))',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
        borderRadius: 20,
        padding: 24,
        cursor: onClick ? 'pointer' : 'default',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(16,185,129,0.15)'
          : '0 8px 24px rgba(0,0,0,0.2)',
        transition: 'all 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        ...style,
      }}
      className={className}
    >
      {children}
    </div>
  );
}

/** Stat counter with number animation */
export function StatCounter({ value, label, prefix = '', suffix = '' }: {
  value: number; label: string; prefix?: string; suffix?: string;
}) {
  const [displayed, setDisplayed] = useState(0);
  const ref = React.useRef<HTMLDivElement>(null);
  const animated = React.useRef(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || animated.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true;
        const start = Date.now();
        const duration = 1200;
        const tick = () => {
          const t = Math.min(1, (Date.now() - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplayed(Math.round(eased * value));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '-0.02em' }}>
        <span style={{ color: 'var(--accent-primary)', fontSize: 20, marginRight: 2 }}>{prefix}</span>
        {displayed}
        <span style={{ color: 'var(--text-muted)', fontSize: 14, marginLeft: 4 }}>{suffix}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
    </div>
  );
}

/** Skill radar chart (pure SVG, no library) */
export function SkillRadar({ skills, size = 200 }: {
  skills: Array<{ label: string; value: number; max: number }>;
  size?: number;
}) {
  const cx = size / 2, cy = size / 2;
  const r = size * 0.38;
  const n = skills.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  const points = skills.map((s, i) => ({
    x: cx + r * Math.cos(startAngle + i * angleStep) * (s.value / s.max),
    y: cy + r * Math.sin(startAngle + i * angleStep) * (s.value / s.max),
  }));

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      {gridLevels.map((level, li) => {
        const rr = r * level;
        const ringPoints = skills.map((_, i) =>
          `${cx + rr * Math.cos(startAngle + i * angleStep)},${cy + rr * Math.sin(startAngle + i * angleStep)}`
        ).join(' ');
        return <polygon key={li} points={ringPoints} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1} />;
      })}
      {/* Axis lines */}
      {skills.map((_, i) => (
        <line key={i} x1={cx} y1={cy}
          x2={cx + r * Math.cos(startAngle + i * angleStep)}
          y2={cy + r * Math.sin(startAngle + i * angleStep)}
          stroke="rgba(255,255,255,0.05)" strokeWidth={1}
        />
      ))}
      {/* Data polygon */}
      <polygon
        points={points.map(p => `${p.x},${p.y}`).join(' ')}
        fill="rgba(16,185,129,0.15)"
        stroke="var(--accent-primary)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Data dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="var(--accent-primary)" />
      ))}
      {/* Labels */}
      {skills.map((s, i) => {
        const labelR = r + 22;
        const lx = cx + labelR * Math.cos(startAngle + i * angleStep);
        const ly = cy + labelR * Math.sin(startAngle + i * angleStep);
        return (
          <text key={i} x={lx} y={ly}
            textAnchor="middle" dominantBaseline="middle"
            fill="var(--text-secondary)" fontSize={10}
            style={{ userSelect: 'none' }}
          >{s.label}</text>
        );
      })}
    </svg>
  );
}

// ============================================================
// Test Dashboard Page
// ============================================================
function TestDashboardContent() {
  const { state, dispatchEvent, dismissToast, updateUser } = useAction3Store();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { key: 'overview', label: '总览' },
    { key: 'components', label: '组件' },
    { key: 'events', label: '事件' },
    { key: 'animation', label: '动画' },
  ];

  const triggerEvent = (event: Action3Event) => dispatchEvent(event);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: activeTab === t.key ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.04)',
            color: activeTab === t.key ? '#fff' : 'var(--text-secondary)',
            fontSize: 13, fontWeight: 600,
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: activeTab === t.key ? 'scale(1.02)' : 'scale(1)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* === OVERVIEW TAB === */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {/* Level + Streak */}
          <BentoCard>
            <LevelBadge level={state.user.level} xp={state.user.totalXP} nextLevelXP={1000} />
          </BentoCard>
          <BentoCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <FlameIcon size={40} intensity={Math.min(1, state.user.currentStreak / 7)} />
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono, monospace)' }}>
                  {state.user.currentStreak}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>连续打卡</div>
              </div>
            </div>
          </BentoCard>
          <BentoCard>
            <StatCounter value={state.user.totalXP} label="总经验值" prefix="+" suffix="XP" />
          </BentoCard>
          <BentoCard>
            <StatCounter value={state.events.length} label="历史事件" suffix="条" />
          </BentoCard>
          {/* Progress ring demo */}
          <BentoCard>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <ProgressRing progress={67} size={100} stroke={7} />
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>67%</span>
                </div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>今日进度</span>
            </div>
          </BentoCard>
          {/* Radar */}
          <BentoCard>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <SkillRadar size={180} skills={[
                { label: '前端', value: 72, max: 100 },
                { label: '后端', value: 45, max: 100 },
                { label: 'AI', value: 83, max: 100 },
                { label: 'DevOps', value: 30, max: 100 },
                { label: '数据库', value: 58, max: 100 },
                { label: '安全', value: 20, max: 100 },
              ]} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>技能雷达</span>
            </div>
          </BentoCard>
        </div>
      )}

      {/* === COMPONENTS TAB === */}
      {activeTab === 'components' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <BentoCard>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Progress Ring 变体</div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <ProgressRing progress={25} size={80} stroke={6} color="#ef4444" />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>25% Red</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <ProgressRing progress={50} size={80} stroke={6} color="#f59e0b" />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>50% Amber</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <ProgressRing progress={75} size={80} stroke={6} color="#10b981" />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>75% Green</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <ProgressRing progress={100} size={80} stroke={6} color="#8b5cf6" />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>100% Purple</span>
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Flame Icon</div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <FlameIcon size={20} intensity={0.3} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>weak</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <FlameIcon size={32} intensity={0.7} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>medium</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <FlameIcon size={48} intensity={1.0} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>strong</span>
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Bento Card Hover</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              悬浮这张卡片查看 hover 效果。卡片会向上浮起 4px，阴影加深，边框变亮。
            </div>
          </BentoCard>

          <BentoCard>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Level Badge</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <LevelBadge level={1} xp={350} nextLevelXP={1000} />
              <LevelBadge level={5} xp={5234} nextLevelXP={2000} />
              <LevelBadge level={10} xp={12000} nextLevelXP={3000} />
            </div>
          </BentoCard>

          <BentoCard>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Stat Counter</div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <StatCounter value={42} label="Goals" />
              <StatCounter value={156} label="Tasks" />
              <StatCounter value={7} label="Streak" suffix="days" />
            </div>
          </BentoCard>
        </div>
      )}

      {/* === EVENTS TAB === */}
      {activeTab === 'events' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>触发事件</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: '目标完成', event: { type: 'GOAL_COMPLETED' as const, goalId: '1', xp: 500, goalTitle: '掌握 React' } },
                { label: '里程碑达成', event: { type: 'MILESTONE_COMPLETED' as const, goalId: '1', goalTitle: 'React 基础', milestoneId: 'm1', milestoneTitle: '完成 Hooks', skillIds: ['s1'] } },
                { label: '任务完成', event: { type: 'TASK_COMPLETED' as const, goalId: '1', milestoneId: 'm1', taskId: 't1', taskTitle: '学习 useEffect', xpEarned: 50 } },
                { label: '技能掌握', event: { type: 'SKILL_MASTERED' as const, skillId: 's1', skillName: 'TypeScript', masteryScore: 100, previousScore: 80 } },
                { label: '成就解锁', event: { type: 'ACHIEVEMENT_UNLOCKED' as const, achievementKey: 'first_goal', achievementName: '达标者', achievementDescription: '完成一个目标', icon: '🏆', xpReward: 200 } },
                { label: '连续打卡', event: { type: 'STREAK_UPDATED' as const, days: 7, previousDays: 6 } },
                { label: '等级提升', event: { type: 'LEVEL_UP' as const, newLevel: 5, totalXP: 5234 } },
                { label: '课程完成', event: { type: 'COURSE_COMPLETED' as const, courseId: 'c1', courseTitle: 'TypeScript 进阶', skillIds: ['s1'] } },
              ].map(({ label, event }) => (
                <button key={label} onClick={() => triggerEvent(event)} style={{
                  padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)',
                  fontSize: 12, cursor: 'pointer', textAlign: 'center',
                  transition: 'all 0.2s ease',
                }}
                  onMouseEnter={e => {
                    (e.target as HTMLElement).style.background = 'rgba(16,185,129,0.1)';
                    (e.target as HTMLElement).style.borderColor = 'rgba(16,185,129,0.3)';
                    (e.target as HTMLElement).style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={e => {
                    (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                    (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                    (e.target as HTMLElement).style.color = 'var(--text-secondary)';
                  }}
                >{label}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              事件历史 ({state.events.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
              {state.events.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  点击左侧按钮触发事件
                </div>
              )}
              {state.events.map((ev, i) => (
                <div key={i} style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  fontSize: 12,
                }}>
                  <span style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono, monospace)', fontSize: 10 }}>{ev.type}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                    {'sub' in ev ? (ev as any).sub : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === ANIMATION TAB === */}
      {activeTab === 'animation' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <BentoCard>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>入场动画</div>
            {['fadeUp', 'scaleIn', 'slideLeft', 'blurIn'].map((anim, i) => (
              <div key={anim} style={{
                padding: '10px 14px', marginBottom: 8, borderRadius: 8,
                background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)',
                color: 'var(--accent-primary)', fontSize: 12,
                animation: `${anim} 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 120}ms both`,
              }}>
                {anim} #{i + 1}
              </div>
            ))}
          </BentoCard>

          <BentoCard>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>按钮按压</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Primary', bg: 'linear-gradient(135deg, #10b981, #059669)' },
                { label: 'Secondary', bg: 'rgba(255,255,255,0.06)' },
                { label: 'Danger', bg: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
              ].map(btn => (
                <button key={btn.label} style={{
                  padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: btn.bg, color: '#fff', fontSize: 13, fontWeight: 600,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
                  onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
                  onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                >{btn.label}</button>
              ))}
            </div>
          </BentoCard>

          <BentoCard>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pulse & Glow</div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%', background: '#10b981',
                boxShadow: '0 0 12px #10b981',
                animation: 'pulse 2s ease-in-out infinite',
              }} />
              <div style={{
                width: 12, height: 12, borderRadius: '50%', background: '#f59e0b',
                boxShadow: '0 0 12px #f59e0b',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
              <div style={{
                width: 12, height: 12, borderRadius: '50%', background: '#ef4444',
                boxShadow: '0 0 12px #ef4444',
                animation: 'pulse 2.5s ease-in-out infinite',
              }} />
            </div>
          </BentoCard>

          <BentoCard>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Loading Shimmer</div>
            <div style={{ borderRadius: 8, overflow: 'hidden', height: 48, position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s ease-in-out infinite',
              }} />
            </div>
          </BentoCard>
        </div>
      )}

      {/* Toast area */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        display: 'flex', flexDirection: 'column', gap: 10, zIndex: 9999,
        pointerEvents: 'none',
      }}>
        {state.toasts.filter(t => !t.dismissed).map(toast => (
          <div key={toast.id} style={{ pointerEvents: 'all' }}>
            <ToastCard toast={toast} onDismiss={() => dismissToast(toast.id)} />
          </div>
        ))}
      </div>

      {/* Inject animation keyframes */}
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.9); } to { opacity:1; transform:scale(1); } }
        @keyframes slideLeft { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes blurIn { from { opacity:0; filter:blur(8px); } to { opacity:1; filter:blur(0); } }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.3); } }
        @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
      `}</style>
    </div>
  );
}

export default function TestDashboardPage() {
  return (
    <Action3Layout>
      <TestDashboardContent />
    </Action3Layout>
  );
}
