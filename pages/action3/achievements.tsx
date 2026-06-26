'use client';
import * as React from 'react';
import { useState, useMemo } from 'react';
import { withNextJSPerPageLayout } from '~/common/layout/withLayout';
import { Action3Layout } from '~/apps/action3/shared/Action3Layout';
import { useAction3Achievements, useAction3Progress } from '~/common/action3/api-hooks';
import { useAction3Store } from '~/common/action3/action3-store';
import { useTranslation } from '~/common/action3/i18n';

// ============================================================
// Types
// ============================================================
interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  category: 'starter' | 'streak' | 'milestone' | 'style' | 'master';
  unlockedAt: string | null;
}

// ============================================================
// Static Achievement Definitions (20+) with SVG icon identifiers
// ============================================================
const ACHIEVEMENT_DEFINITIONS: Record<string, { name: string; description: string; icon: string; xp: number; category: Achievement['category'] }> = {
  // --- 入门 ---
  first_task: { name: '初出茅庐', description: '完成你的第一个任务', icon: 'rocket', xp: 50, category: 'starter' },
  first_goal: { name: '达标者', description: '完成一个目标', icon: 'target', xp: 200, category: 'starter' },
  learning_voyage: { name: '学习起航', description: '创建第一个学习目标', icon: 'ship', xp: 50, category: 'starter' },
  planner: { name: '计划制定者', description: '为目标创建至少3个里程碑', icon: 'clipboard', xp: 100, category: 'starter' },
  early_bird: { name: '早起鸟', description: '在早上8点前完成任务', icon: 'sun', xp: 75, category: 'starter' },
  night_owl: { name: '夜猫子', description: '在晚上11点后完成任务', icon: 'moon', xp: 75, category: 'starter' },
  // --- 连续 ---
  week_warrior: { name: '一周战士', description: '连续7天完成任务', icon: 'flame', xp: 100, category: 'streak' },
  fortnight_fighter: { name: '半月坚持', description: '连续14天完成任务', icon: 'shield', xp: 200, category: 'streak' },
  monthly_master: { name: '月度达人', description: '连续30天完成任务', icon: 'trophy', xp: 300, category: 'streak' },
  hundred_day_hero: { name: '百日英雄', description: '连续100天完成任务', icon: 'crown', xp: 1000, category: 'streak' },
  // --- 里程碑 ---
  first_milestone: { name: '首个里程碑', description: '达成第一个目标', icon: 'flag', xp: 100, category: 'milestone' },
  ten_goals: { name: '十项全能', description: '完成10个目标', icon: 'star', xp: 800, category: 'milestone' },
  fifty_tasks: { name: '五十里程碑', description: '完成50个任务', icon: 'layers', xp: 400, category: 'milestone' },
  hundred_tasks: { name: '学业有成', description: '完成100个任务', icon: 'graduation', xp: 500, category: 'milestone' },
  early_finish: { name: '提前完成', description: '在截止日期前3天以上完成任务', icon: 'clock', xp: 150, category: 'milestone' },
  overachiever: { name: '超额完成', description: '完成超过100%的目标', icon: 'zap', xp: 150, category: 'milestone' },
  // --- 风格 ---
  guided_learner: { name: '循循善诱', description: '使用引导式风格完成5个目标', icon: 'compass', xp: 150, category: 'style' },
  indoctrination_learner: { name: '学富五车', description: '使用灌输式风格完成5个目标', icon: 'book', xp: 150, category: 'style' },
  encouragement_learner: { name: '励精图治', description: '使用鼓励式风格完成5个目标', icon: 'heart', xp: 150, category: 'style' },
  strict_learner: { name: '严师高徒', description: '使用严厉式风格完成5个目标', icon: 'scale', xp: 150, category: 'style' },
  first_principles_master: { name: '追本溯源', description: '使用第一性原理分析完成任务', icon: 'layers', xp: 150, category: 'style' },
  // --- 大师 ---
  skill_10: { name: '小试牛刀', description: '掌握10个技能', icon: 'award', xp: 300, category: 'master' },
  skill_20: { name: '技能满点', description: '掌握20个技能', icon: 'gem', xp: 500, category: 'master' },
  skill_tree_complete: { name: '技能树大师', description: '完成全部技能树节点', icon: 'tree', xp: 1000, category: 'master' },
  level_10: { name: '资深学者', description: '达到10级', icon: 'trending', xp: 300, category: 'master' },
  level_25: { name: '学术泰斗', description: '达到25级', icon: 'hexagon', xp: 800, category: 'master' },
};

// ============================================================
// SVG Icon Components
// ============================================================
const AchievementIcon: React.FC<{ name: string; unlocked: boolean }> = ({ name, unlocked }) => {
  const color = unlocked ? '#fff' : 'var(--text-muted)';

  const renderIcon = () => {
    switch (name) {
      case 'rocket':
        return <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />;
      case 'target':
        return <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>;
      case 'ship':
        return <><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" /><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76" /><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" /><path d="M12 10v4" /></>;
      case 'clipboard':
        return <><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></>;
      case 'sun':
        return <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></>;
      case 'moon':
        return <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />;
      case 'flame':
        return <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />;
      case 'shield':
        return <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
      case 'trophy':
        return <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></>;
      case 'crown':
        return <><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" /></>;
      case 'flag':
        return <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></>;
      case 'star':
        return <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />;
      case 'layers':
        return <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>;
      case 'graduation':
        return <><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></>;
      case 'clock':
        return <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>;
      case 'zap':
        return <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />;
      case 'compass':
        return <><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></>;
      case 'book':
        return <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>;
      case 'heart':
        return <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />;
      case 'scale':
        return <><path d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z" /><path d="M2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" /></>;
      case 'award':
        return <><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></>;
      case 'gem':
        return <polygon points="6 3 18 3 22 9 12 22 2 9 6 3" />;
      case 'tree':
        return <><path d="M17 14l3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7h-.2l3 3.3a1 1 0 0 1-.7 1.7H17z" /></>;
      case 'trending':
        return <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>;
      case 'hexagon':
        return <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />;
      default:
        return <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />;
    }
  };

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {renderIcon()}
    </svg>
  );
};

// ============================================================
// Category Configuration
// ============================================================
const ZH_CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'starter', label: '入门' },
  { key: 'streak', label: '连续' },
  { key: 'milestone', label: '里程碑' },
  { key: 'style', label: '风格' },
  { key: 'master', label: '大师' },
] as const;

const EN_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'starter', label: 'Starter' },
  { key: 'streak', label: 'Streak' },
  { key: 'milestone', label: 'Milestone' },
  { key: 'style', label: 'Style' },
  { key: 'master', label: 'Master' },
] as const;

const JA_CATEGORIES = [
  { key: 'all', label: 'すべて' },
  { key: 'starter', label: '入門' },
  { key: 'streak', label: '連続' },
  { key: 'milestone', label: 'マイルストーン' },
  { key: 'style', label: 'スタイル' },
  { key: 'master', label: 'マスター' },
] as const;

const KO_CATEGORIES = [
  { key: 'all', label: '전체' },
  { key: 'starter', label: '입문' },
  { key: 'streak', label: '연속' },
  { key: 'milestone', label: '마일스톤' },
  { key: 'style', label: '스타일' },
  { key: 'master', label: '마스터' },
] as const;

function getCategories(locale?: string) {
  if (locale === 'en') return EN_CATEGORIES;
  if (locale === 'ja') return JA_CATEGORIES;
  if (locale === 'ko') return KO_CATEGORIES;
  return ZH_CATEGORIES;
}

type CategoryKey = typeof ZH_CATEGORIES[number]['key'];

// ============================================================
// Styles
// ============================================================
const styles = {
  container: {
    padding: '32px 40px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'Inter, system-ui, sans-serif',
  } as React.CSSProperties,
  header: {
    marginBottom: '32px',
  } as React.CSSProperties,
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '8px',
  } as React.CSSProperties,
  titleUnderline: {
    height: '4px',
    width: '120px',
    background: 'var(--gradient-accent)',
    borderRadius: '2px',
  } as React.CSSProperties,
  userLevelCard: {
    background: 'rgba(255, 255, 255, 0.025)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    borderRadius: '20px',
    padding: '28px 32px',
    marginBottom: '32px',
    display: 'flex',
    gap: '40px',
    alignItems: 'center',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
    position: 'relative' as const,
    overflow: 'hidden',
  } as React.CSSProperties,
  levelSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    flex: '0 0 auto',
  } as React.CSSProperties,
  levelBadge: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'var(--gradient-accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: 800,
    color: '#fff',
    boxShadow: '0 0 30px rgba(16,185,129,0.5)',
    position: 'relative' as const,
  } as React.CSSProperties,
  levelLabel: {
    position: 'absolute' as const,
    bottom: '-20px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '10px',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  } as React.CSSProperties,
  xpSection: {
    flex: '1',
    minWidth: '200px',
  } as React.CSSProperties,
  xpLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    display: 'flex',
    justifyContent: 'space-between',
  } as React.CSSProperties,
  xpBarOuter: {
    height: '10px',
    background: 'var(--bg-elevated)',
    borderRadius: '5px',
    overflow: 'hidden',
  } as React.CSSProperties,
  xpBarInner: {
    height: '100%',
    background: 'var(--gradient-accent)',
    borderRadius: '5px',
    transition: 'width 0.3s ease',
  } as React.CSSProperties,
  statsSection: {
    display: 'flex',
    gap: '32px',
    marginLeft: 'auto',
  } as React.CSSProperties,
  statItem: {
    textAlign: 'center' as const,
  } as React.CSSProperties,
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  statLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  } as React.CSSProperties,
  filterTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  filterTab: (active: boolean) => ({
    padding: '10px 20px',
    borderRadius: '12px',
    border: 'none',
    background: active ? 'var(--gradient-accent)' : 'var(--bg-card)',
    color: active ? '#fff' : 'var(--text-secondary)',
    fontWeight: active ? 600 : 500,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }),
  achievementGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '16px',
  } as React.CSSProperties,
  // Liquid Glass card for unlocked achievements (vibrant, clear)
  achievementCardUnlocked: {
    background: 'rgba(255, 255, 255, 0.035)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(16,185,129,0.25)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    overflow: 'hidden',
    cursor: 'pointer',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
  } as React.CSSProperties,
  // Liquid Glass card for locked achievements (blurred, muted)
  achievementCardLocked: {
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(24px) saturate(140%)',
    WebkitBackdropFilter: 'blur(24px) saturate(140%)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'all 0.3s ease',
    position: 'relative' as const,
    overflow: 'hidden',
  } as React.CSSProperties,
  achievementCardGlow: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: 'var(--gradient-accent)',
  } as React.CSSProperties,
  achievementCardHover: {
    transform: 'translateY(-4px)',
    boxShadow: '0 16px 40px rgba(16,185,129,0.15)',
    border: '1px solid rgba(16,185,129,0.4)',
  } as React.CSSProperties,
  achievementHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    marginBottom: '14px',
  } as React.CSSProperties,
  achievementIconWrap: (unlocked: boolean) => ({
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    background: unlocked
      ? 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.15) 100%)'
      : 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: unlocked ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: unlocked ? '#10b981' : 'var(--text-muted)',
    boxShadow: unlocked ? '0 4px 16px rgba(16,185,129,0.2)' : 'none',
    flexShrink: 0,
  } as React.CSSProperties),
  lockOverlay: {
    position: 'absolute' as const,
    top: '10px',
    right: '10px',
    width: '22px',
    height: '22px',
    background: 'rgba(71,85,105,0.4)',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,
  achievementInfo: {
    flex: 1,
    minWidth: 0,
  } as React.CSSProperties,
  achievementName: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '4px',
  } as React.CSSProperties,
  achievementDesc: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  } as React.CSSProperties,
  achievementFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '14px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  } as React.CSSProperties,
  categoryBadge: (category: string) => {
    const colorMap: Record<string, string> = {
      starter: '#10B981',
      streak: '#F59E0B',
      milestone: '#34d399',
      style: '#EC4899',
      master: '#ff6b35',
    };
    const color = colorMap[category] || '#94a3b8';
    return {
      padding: '3px 8px',
      borderRadius: '6px',
      fontSize: '10px',
      fontWeight: 600,
      color: color,
      background: `${color}1a`,
    } as React.CSSProperties;
  },
  xpBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    background: 'rgba(16,185,129,0.15)',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--accent-primary)',
  } as React.CSSProperties,
  unlockDate: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginTop: '6px',
  } as React.CSSProperties,
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: 'var(--text-secondary)',
    fontSize: '16px',
  } as React.CSSProperties,
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  } as React.CSSProperties,
  // Detail Modal
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(16px) saturate(140%)',
    WebkitBackdropFilter: 'blur(16px) saturate(140%)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'fadeIn 0.2s ease',
  } as React.CSSProperties,
  modalCard: {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(32px) saturate(160%)',
    WebkitBackdropFilter: 'blur(32px) saturate(160%)',
    borderRadius: '24px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    margin: '16px',
    animation: 'scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    border: '1px solid rgba(16,185,129,0.2)',
    position: 'relative' as const,
    overflow: 'hidden',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
  } as React.CSSProperties,
  modalGlow: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    background: 'var(--gradient-accent)',
  } as React.CSSProperties,
  modalCloseBtn: {
    position: 'absolute' as const,
    top: '16px',
    right: '16px',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(71,85,105,0.3)',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  modalIconWrap: {
    width: '88px',
    height: '88px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.15) 100%)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(16,185,129,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    boxShadow: '0 8px 32px rgba(16,185,129,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
  } as React.CSSProperties,
  modalEyebrow: {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
    color: 'var(--accent-primary)',
    textAlign: 'center' as const,
    marginBottom: '8px',
  } as React.CSSProperties,
  modalName: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    textAlign: 'center' as const,
    marginBottom: '10px',
  } as React.CSSProperties,
  modalDesc: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    textAlign: 'center' as const,
    lineHeight: 1.6,
    marginBottom: '28px',
  } as React.CSSProperties,
  modalMeta: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '28px',
  } as React.CSSProperties,
  modalMetaItem: {
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '12px',
    padding: '14px',
    textAlign: 'center' as const,
    border: '1px solid rgba(255,255,255,0.06)',
  } as React.CSSProperties,
  modalMetaLabel: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    marginBottom: '4px',
  } as React.CSSProperties,
  modalMetaValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  modalXp: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '12px 24px',
    background: 'rgba(16,185,129,0.15)',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--accent-primary)',
    marginBottom: '20px',
  } as React.CSSProperties,
  modalAction: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px',
    background: 'var(--gradient-accent)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  } as React.CSSProperties,
};

// ============================================================
// Achievement Card Component
// ============================================================
function AchievementCard({ achievement, onClick, locale }: { achievement: Achievement; onClick?: () => void; locale?: string }) {
  const def = ACHIEVEMENT_DEFINITIONS[achievement.key] || {
    name: achievement.name || (locale === 'en' ? 'Unknown Achievement' : locale === 'ja' ? '未知の実績' : locale === 'ko' ? '알 수 없는 업적' : '未知成就'),
    description: achievement.description || '',
    icon: 'star',
    xp: achievement.xpReward || 0,
    category: achievement.category || 'starter',
  };
  const isUnlocked = !!achievement.unlockedAt;
  const categories = getCategories(locale);
  const categoryLabel = categories.find(c => c.key === def.category)?.label || def.category;
  const [hovered, setHovered] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        ...(isUnlocked ? styles.achievementCardUnlocked : styles.achievementCardLocked),
        ...(isUnlocked && hovered ? styles.achievementCardHover : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {isUnlocked && <div style={styles.achievementCardGlow} />}

      {!isUnlocked && (
        <div style={styles.lockOverlay}>
          <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='#4b5563' strokeWidth='2'>
            <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
            <path d='M7 11V7a5 5 0 0110 0v4' />
          </svg>
        </div>
      )}

      <div style={styles.achievementHeader}>
        <div style={styles.achievementIconWrap(isUnlocked)}>
          <AchievementIcon name={def.icon} unlocked={isUnlocked} />
        </div>
        <div style={styles.achievementInfo}>
          <div style={styles.achievementName}>{def.name}</div>
          <div style={styles.achievementDesc}>{def.description}</div>
        </div>
      </div>

      <div style={styles.achievementFooter}>
        <span style={styles.categoryBadge(def.category)}>{categoryLabel}</span>
        <div style={styles.xpBadge}>
          <span>+{def.xp}</span>
          <span>XP</span>
        </div>
      </div>

      {isUnlocked && achievement.unlockedAt && (
        <div style={styles.unlockDate}>
          {locale === 'en' ? 'Unlocked at' : locale === 'ja' ? '解除日' : locale === 'ko' ? '해제 일시' : '解锁于'} {formatDate(achievement.unlockedAt)}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Achievement Detail Modal
// ============================================================
function AchievementDetailModal({ achievement, onClose, locale }: { achievement: Achievement; onClose: () => void; locale?: string }) {
  const def = ACHIEVEMENT_DEFINITIONS[achievement.key] || {
    name: achievement.name || (locale === 'en' ? 'Unknown Achievement' : locale === 'ja' ? '未知の実績' : locale === 'ko' ? '알 수 없는 업적' : '未知成就'),
    description: achievement.description || '',
    icon: 'star',
    xp: achievement.xpReward || 0,
    category: achievement.category || 'starter',
  };
  const isUnlocked = !!achievement.unlockedAt;
  const categories = getCategories(locale);
  const categoryLabel = categories.find(c => c.key === def.category)?.label || def.category;

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
        <div style={styles.modalGlow} />
        <button style={styles.modalCloseBtn} onClick={onClose}>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'>
            <line x1='18' y1='6' x2='6' y2='18' />
            <line x1='6' y1='6' x2='18' y2='18' />
          </svg>
        </button>

        <div style={{
          ...styles.modalIconWrap,
          background: isUnlocked ? 'var(--gradient-accent)' : 'rgba(71,85,105,0.3)',
        }}>
          <AchievementIcon name={def.icon} unlocked={isUnlocked} />
        </div>
        <div style={styles.modalEyebrow}>成就 {isUnlocked ? '已解锁' : '待解锁'}</div>
        <div style={styles.modalName}>{def.name}</div>
        <div style={styles.modalDesc}>{def.description}</div>

        <div style={styles.modalMeta}>
          <div style={styles.modalMetaItem}>
            <div style={styles.modalMetaLabel}>分类</div>
            <div style={styles.modalMetaValue}>{categoryLabel}</div>
          </div>
          {isUnlocked && achievement.unlockedAt ? (
            <div style={styles.modalMetaItem}>
              <div style={styles.modalMetaLabel}>解锁时间</div>
              <div style={{ ...styles.modalMetaValue, fontSize: '13px' }}>{formatDateTime(achievement.unlockedAt)}</div>
            </div>
          ) : (
            <div style={styles.modalMetaItem}>
              <div style={styles.modalMetaLabel}>状态</div>
              <div style={{ ...styles.modalMetaValue, color: 'var(--text-muted)' }}>未解锁</div>
            </div>
          )}
        </div>

        <div style={styles.modalXp}>
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
            <polygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' />
          </svg>
          奖励 {def.xp} XP
        </div>

        <button style={styles.modalAction} onClick={onClose}>
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
            <polyline points='20 6 9 17 4 12' />
          </svg>
          知道了
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Main Page Component
// ============================================================
function AchievementsPageContent() {
  const { t, locale } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const { data: achievements } = useAction3Achievements();
  const { data: progressData } = useAction3Progress();
  const { state, updateUser } = useAction3Store();

  // Sync event-bus user state with DB progress data
  React.useEffect(() => {
    const prog = (progressData as Record<string, unknown>) ?? {};
    if (prog.totalXP !== undefined || prog.level !== undefined || prog.currentStreak !== undefined) {
      updateUser({
        totalXP: (prog.totalXP as number) ?? 0,
        level: (prog.level as number) ?? 1,
        currentStreak: (prog.currentStreak as number) ?? 0,
      });
    }
  }, [progressData, updateUser]);

  // data shape: achievements list
  const userStats = useMemo(() => {
    const achList: any[] = (achievements as any) ?? [];
    const prog: any = (progressData as any) ?? {};
    
    // Count unlocked achievements from DB
    const unlockedCount = achList.filter((a: any) => a.unlockedAt).length;
    
    // Get total from static definitions
    const totalCount = Object.keys(ACHIEVEMENT_DEFINITIONS).length;
    
    const totalXp = prog.totalXP ?? 0;
    const level = prog.level ?? 1;

    return {
      level,
      totalXp,
      currentLevelXp: 0,
      xpForNext: level * level * 100,
      xpProgress: 0,
      unlockedCount,
      totalCount,
      currentStreak: prog.currentStreak ?? 0,
      longestStreak: prog.longestStreak ?? 0,
    };
  }, [achievements, progressData]);

  // Filter achievements - combine static definitions with DB data
  const filteredAchievements = useMemo(() => {
    const achList: any[] = (achievements as any) ?? [];
    
    // Create a map of unlocked achievements from DB
    const dbUnlocks: Record<string, string> = {};
    for (const a of achList) {
      if (a.key && a.unlockedAt) {
        dbUnlocks[a.key] = a.unlockedAt;
      }
    }
    
    // Combine static definitions with DB unlock status
    const allAchievements: Achievement[] = Object.entries(ACHIEVEMENT_DEFINITIONS).map(([key, def]) => ({
      id: `static-${key}`,
      key,
      name: def.name,
      description: def.description,
      icon: def.icon,
      xpReward: def.xp,
      category: def.category,
      unlockedAt: dbUnlocks[key] || null,
    }));
    
    // Filter by category if not 'all'
    if (activeCategory === 'all') return allAchievements;
    return allAchievements.filter(a => a.category === activeCategory);
  }, [achievements, activeCategory]);

  if (achievements === undefined) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>加载中...</div>
      </div>
    );
  }

  return (
    <Action3Layout>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>{t('achievements.title')}</h1>
          <div style={styles.titleUnderline} />
        </div>

        {/* User Level Card */}
        <div style={styles.userLevelCard}>
          <div style={styles.levelSection}>
            <div style={styles.levelBadge}>
              {userStats.level}
              <span style={styles.levelLabel}>{locale === 'en' ? 'Level' : locale === 'ja' ? 'レベル' : locale === 'ko' ? '레벨' : '等级'}</span>
            </div>
            <div style={styles.xpSection}>
              <div style={styles.xpLabel}>
                <span>{locale === 'en' ? 'Experience' : locale === 'ja' ? '経験値' : locale === 'ko' ? '경험치' : '经验值'}</span>
                <span>{userStats.currentLevelXp} / {userStats.xpForNext} XP</span>
              </div>
              <div style={styles.xpBarOuter}>
                <div style={{ ...styles.xpBarInner, width: `${userStats.xpProgress}%` }} />
              </div>
            </div>
          </div>

          <div style={styles.statsSection}>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{userStats.totalXp}</div>
              <div style={styles.statLabel}>{locale === 'en' ? 'Total XP' : locale === 'ja' ? '総経験値' : locale === 'ko' ? '총 XP' : '总经验'}</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{userStats.currentStreak}</div>
              <div style={styles.statLabel}>{locale === 'en' ? 'Current Streak' : locale === 'ja' ? '現在の連続' : locale === 'ko' ? '현재 연속' : '当前连续'}</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{userStats.longestStreak}</div>
              <div style={styles.statLabel}>{locale === 'en' ? 'Best Streak' : locale === 'ja' ? '最長連続' : locale === 'ko' ? '최장 연속' : '最长连续'}</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{userStats.unlockedCount}/{userStats.totalCount}</div>
              <div style={styles.statLabel}>{locale === 'en' ? 'Unlocked' : locale === 'ja' ? '解除済み' : locale === 'ko' ? '해제됨' : '已解锁'}</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={styles.filterTabs}>
          {getCategories(locale).map(cat => (
            <button
              key={cat.key}
              style={styles.filterTab(activeCategory === cat.key)}
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Achievement Grid */}
        {filteredAchievements.length > 0 ? (
          <div style={styles.achievementGrid}>
            {filteredAchievements.map(achievement => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                onClick={() => setSelectedAchievement(achievement)}
                locale={locale}
              />
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>X</div>
            <div>{locale === 'en' ? 'No achievements in this category' : locale === 'ja' ? 'このカテゴリには実績がありません' : locale === 'ko' ? '이 범주에는 업적이 없습니다' : '该分类暂无成就'}</div>
          </div>
        )}

        {/* Detail Modal */}
        {selectedAchievement && (
          <AchievementDetailModal
            achievement={selectedAchievement}
            onClose={() => setSelectedAchievement(null)}
            locale={locale}
          />
        )}
      </div>
    </Action3Layout>
  );
}

// ============================================================
// Export with Layout
// ============================================================
export default withNextJSPerPageLayout({ type: 'noop' }, () => <AchievementsPageContent />);
