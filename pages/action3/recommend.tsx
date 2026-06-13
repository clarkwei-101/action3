'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Action3Layout } from '~/apps/action3/shared/Action3Layout';
import { useAction3SkillRecommendations, useAction3PathRecommendations, useAction3UserProfile, useAction3UpdateMastery } from '~/common/action3/api-hooks';

const difficultyLabel: Record<number, { label: string; color: string }> = {
  1: { label: '入门', color: '#10b981' },
  2: { label: '进阶', color: '#f59e0b' },
  3: { label: '高级', color: '#ef4444' },
};

const difficultyBg: Record<number, string> = {
  1: 'rgba(16, 185, 129, 0.15)',
  2: 'rgba(245, 158, 11, 0.15)',
  3: 'rgba(239, 68, 68, 0.15)',
};

export default function RecommendPage() {
  return (
    <Action3Layout>
      <RecommendContent />
    </Action3Layout>
  );
}

function RecommendContent() {
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'skills' | 'paths'>('skills');
  const profile = useAction3UserProfile();
  const skillRecs = useAction3SkillRecommendations(selectedGoalId || undefined, 6);
  const pathRecs = useAction3PathRecommendations(selectedGoalId || undefined, 3);
  const updateMastery = useAction3UpdateMastery();

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          个性化学习推荐
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          基于你的学习档案和目标，AI 为你推荐最适合的下一步
        </p>
      </div>

      {/* Profile Summary */}
      {profile.data && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '32px',
        }}>
          {[
            { label: '当前等级', value: `Lv.${profile.data.level}`, icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
            { label: '总 XP', value: `${profile.data.totalXp}`, icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
            { label: '已掌握技能', value: `${profile.data.masteredSkills} 个`, icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
            { label: '学习连续', value: `${profile.data.learningStreak} 天`, icon: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z' },
            { label: '已完成目标', value: `${profile.data.completedGoals} 个`, icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806' },
            { label: '当前目标', value: `${profile.data.activeGoals} 个`, icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: 'rgba(255,255,255,0.025)',
              backdropFilter: 'blur(16px) saturate(160%)',
              WebkitBackdropFilter: 'blur(16px) saturate(160%)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={stat.icon} />
              </svg>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>{stat.label}</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#e2e8f0' }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { key: 'skills', label: '技能推荐', count: skillRecs.data?.recommendations.length || 0 },
          { key: 'paths', label: '学习路径', count: pathRecs.data?.paths.length || 0 },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'skills' | 'paths')}
            style={{
              padding: '8px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #10b981' : '2px solid transparent',
              color: activeTab === tab.key ? '#fff' : '#64748b',
              fontSize: '14px',
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Loading State */}
      {(skillRecs.isLoading || pathRecs.isLoading) && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid rgba(16,185,129,0.2)',
            borderTopColor: '#10b981', borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p>AI 正在分析你的学习档案...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Skills Tab */}
      {activeTab === 'skills' && skillRecs.data && (
        <div>
          {skillRecs.data.recommendations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', display: 'block', opacity: 0.5 }}>
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <p style={{ fontSize: '16px' }}>暂无推荐，先创建目标吧</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {skillRecs.data.recommendations.map((skill, idx) => (
                <div
                  key={skill.skillNodeId}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(20px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '16px',
                    padding: '20px',
                    transition: 'all 0.3s cubic-bezier(0.32,0.72,0,1)',
                    animation: `fadeInUp 0.4s ease ${idx * 0.1}s both`,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(16,185,129,0.25)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)';
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px',
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.15))',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(16,185,129,0.25)',
                      borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <span style={{
                      fontSize: '11px', padding: '3px 8px',
                      borderRadius: '999px',
                      background: difficultyBg[skill.difficulty] || difficultyBg[1],
                      color: difficultyLabel[skill.difficulty]?.color || '#10b981',
                      fontWeight: 600,
                    }}>
                      {difficultyLabel[skill.difficulty]?.label || '入门'}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                    {skill.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', lineHeight: 1.5 }}>
                    {skill.description}
                  </p>

                  {/* AI Reason */}
                  <div style={{
                    background: 'rgba(16,185,129,0.07)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    marginBottom: '12px',
                  }}>
                    <p style={{ fontSize: '12px', color: '#34d399', marginBottom: '4px', fontWeight: 500 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                        <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                      </svg>
                      AI 推荐理由
                    </p>
                    <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>{skill.reason}</p>
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b' }}>
                    <span>预计 {skill.estimatedHours}h</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>+{skill.xpReward} XP</span>
                    </div>
                  </div>

                  {/* Match Bar */}
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                      <span>难度匹配</span>
                      <span style={{ color: skill.difficultyMatch >= 70 ? '#10b981' : skill.difficultyMatch >= 50 ? '#f59e0b' : '#ef4444' }}>
                        {skill.difficultyMatch}%
                      </span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${skill.difficultyMatch}%`,
                        height: '100%',
                        background: skill.difficultyMatch >= 70
                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                          : skill.difficultyMatch >= 50
                            ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                            : 'linear-gradient(90deg, #ef4444, #f87171)',
                        borderRadius: '2px',
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Paths Tab */}
      {activeTab === 'paths' && pathRecs.data && (
        <div>
          {pathRecs.data.paths.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <p>暂无路径推荐</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pathRecs.data.paths.map((path, idx) => (
                <div
                  key={path.pathId || idx}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(20px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '16px',
                    padding: '24px',
                    animation: `fadeInUp 0.4s ease ${idx * 0.15}s both`,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
                    transition: 'all 0.3s cubic-bezier(0.32,0.72,0,1)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>
                        {path.title}
                      </h3>
                      <p style={{ fontSize: '13px', color: '#64748b' }}>{path.description}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>+{path.totalXp}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>XP</div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div style={{
                    background: 'rgba(16,185,129,0.06)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    color: '#34d399',
                  }}>
                    {path.reason}
                  </div>

                  {/* Skills in path */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    {path.skills.slice(0, 5).map((skill, si) => (
                      <span key={si} style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#94a3b8',
                      }}>
                        {skill.title}
                      </span>
                    ))}
                    {path.skills.length > 5 && (
                      <span style={{ fontSize: '12px', color: '#64748b', padding: '4px 8px' }}>
                        +{path.skills.length - 5} more
                      </span>
                    )}
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#64748b' }}>
                    <span>{path.skills.length} 个技能</span>
                    <span>约 {path.estimatedHours}h</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
