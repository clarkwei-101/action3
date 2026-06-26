'use client';

import * as React from 'react';
import { useState } from 'react';
import { Action3Layout } from '~/apps/action3/shared/Action3Layout';
import { SkillTreeCanvas } from '~/apps/action3/components/SkillTreeCanvas';
import {
  useAction3SkillTreeNodes,
  useAction3SkillTreeEdges,
  useAction3SkillTreeMasteries,
  useAction3UpdateSkillMastery,
  useAction3UpdateSkillPosition,
} from '~/common/action3/api-hooks';
import { useAction3Store } from '~/common/action3/action3-store';

const categories = [
  { key: '', label: '全部' },
  { key: 'frontend', label: '前端' },
  { key: 'backend', label: '后端' },
  { key: 'ai', label: 'AI' },
];

const difficultyInfo: Record<number, { label: string; color: string }> = {
  1: { label: '入门', color: '#10b981' },
  2: { label: '进阶', color: '#f59e0b' },
  3: { label: '高级', color: '#ef4444' },
};

export default function SkillTreePage() {
  return (
    <Action3Layout>
      <SkillTreeContent />
    </Action3Layout>
  );
}

function SkillTreeContent() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [masterySliderValue, setMasterySliderValue] = useState(0);
  const { dispatchEvent } = useAction3Store();

  const nodes = useAction3SkillTreeNodes(selectedCategory || undefined);
  const edges = useAction3SkillTreeEdges();
  const masteries = useAction3SkillTreeMasteries();
  const updateMastery = useAction3UpdateSkillMastery();
  const updatePosition = useAction3UpdateSkillPosition();

  const selectedNode = React.useMemo(
    () => nodes.data?.find(n => n.id === selectedNodeId) ?? null,
    [nodes.data, selectedNodeId],
  );

  const selectedMastery = React.useMemo(
    () => masteries.data?.find(m => m.skillNodeId === selectedNodeId) ?? null,
    [masteries.data, selectedNodeId],
  );

  React.useEffect(() => {
    if (selectedMastery) {
      setMasterySliderValue(selectedMastery.masteryScore);
    } else {
      setMasterySliderValue(0);
    }
  }, [selectedMastery]);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId === selectedNodeId ? null : nodeId);
  };

  const handleMasteryUpdate = () => {
    if (selectedNodeId) {
      const prev = masteries.data?.find(m => m.skillNodeId === selectedNodeId)?.masteryScore ?? 0;
      const node = nodes.data?.find(n => n.id === selectedNodeId);
      updateMastery.mutate(
        { skillNodeId: selectedNodeId, masteryScore: masterySliderValue },
        {
          onSuccess: () => {
            masteries.refetch();
            dispatchEvent?.({
              type: masterySliderValue === 100 ? 'SKILL_MASTERED' : 'SKILL_PROGRESS',
              skillId: selectedNodeId,
              skillName: node?.title ?? 'Unknown',
              masteryScore: masterySliderValue,
              previousScore: prev,
            });
          },
        },
      );
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Main Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Top Bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          padding: '16px 20px',
          background: 'rgba(5,5,11,0.85)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            技能树
          </h1>

          {/* Category Filter */}
          <div style={{ display: 'flex', gap: '6px', marginLeft: '16px' }}>
            {categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '999px',
                  border: '1px solid',
                  borderColor: selectedCategory === cat.key ? 'rgba(16,185,129,0.35)' : 'var(--border-subtle)',
                  background: selectedCategory === cat.key ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                  color: selectedCategory === cat.key ? 'var(--accent-primary-light)' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: selectedCategory === cat.key ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '3px', background: 'rgba(16,185,129,0.5)', borderRadius: '2px', display: 'inline-block' }} />
              软前置
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '3px', background: 'rgba(239,68,68,0.5)', borderRadius: '2px', display: 'inline-block' }} />
              硬前置
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
              已掌握
            </span>
          </div>
        </div>

        {/* Loading */}
        {nodes.isLoading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 5, background: 'rgba(8,12,24,0.7)',
          }}>
            <div style={{
              width: '36px', height: '36px', border: '3px solid rgba(16,185,129,0.2)',
              borderTopColor: '#10b981', borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
          </div>
        )}

        {/* Canvas */}
        <div style={{ width: '100%', height: '100%', background: 'var(--bg-primary)' }}>
          <SkillTreeCanvas
            nodes={nodes.data ?? []}
            edges={edges.data ?? []}
            masteries={masteries.data ?? []}
            onNodeClick={handleNodeClick}
            onNodeDragStop={(nodeId, x, y) => {
              updatePosition.mutate({ id: nodeId, positionX: x, positionY: y });
            }}
          />
        </div>
      </div>

      {/* Side Panel */}
      {selectedNode && (
        <div style={{
          width: '300px',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(5,5,11,0.95)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          padding: '24px 20px',
          overflowY: 'auto',
          animation: 'slideIn 0.2s ease',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
        }}>
          <style>{`@keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                {selectedNode.title}
              </h2>
              <span style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '999px',
                background: selectedNode.category === 'frontend' ? 'rgba(16,185,129,0.12)' :
                  selectedNode.category === 'backend' ? 'rgba(245,158,11,0.12)' :
                    selectedNode.category === 'ai' ? 'rgba(251,146,60,0.12)' :
                      'rgba(100,116,139,0.12)',
                color: selectedNode.category === 'frontend' ? '#34d399' :
                  selectedNode.category === 'backend' ? '#fbbf24' :
                    selectedNode.category === 'ai' ? '#fb923c' :
                      '#94a3b8',
              }}>
                {selectedNode.category === 'frontend' ? '前端' :
                  selectedNode.category === 'backend' ? '后端' :
                    selectedNode.category === 'ai' ? 'AI' : '通用'}
              </span>
            </div>
            <button
              onClick={() => setSelectedNodeId(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Description */}
          {selectedNode.description && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
              {selectedNode.description}
            </p>
          )}

          {/* Meta Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.025)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px',
              padding: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>难度</div>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: difficultyInfo[selectedNode.difficulty]?.color || '#10b981',
              }}>
                {difficultyInfo[selectedNode.difficulty]?.label || '入门'}
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '12px',
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>XP 奖励</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-secondary)' }}>
                +{selectedNode.xpReward}
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '12px',
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>层阶</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Tier {selectedNode.tier}
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '12px',
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>技能 ID</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                {selectedNode.skillId}
              </div>
            </div>
          </div>

          {/* Mastery Slider */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                掌握度
              </span>
              <span style={{
                fontSize: '16px',
                fontWeight: 700,
                color: masterySliderValue >= 80 ? '#10b981' : masterySliderValue >= 50 ? 'var(--color-warning)' : 'var(--accent-primary)',
              }}>
                {masterySliderValue}%
              </span>
            </div>

            {/* Progress bar */}
            <div style={{
              height: '6px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '3px',
              overflow: 'hidden',
              marginBottom: '12px',
            }}>
              <div style={{
                width: `${masterySliderValue}%`,
                height: '100%',
                background: masterySliderValue >= 80
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : masterySliderValue >= 50
                    ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                    : 'linear-gradient(90deg, #10b981, #059669)',
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }} />
            </div>

            {/* Slider */}
            <input
              type="range"
              min={0}
              max={100}
              value={masterySliderValue}
              onChange={e => setMasterySliderValue(Number(e.target.value))}
              style={{
                width: '100%',
                marginBottom: '12px',
                accentColor: 'var(--accent-primary)',
              }}
            />

            {/* Quick buttons */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              {[0, 25, 50, 75, 100].map(val => (
                <button
                  key={val}
                  onClick={() => setMasterySliderValue(val)}
                  style={{
                    flex: 1,
                    padding: '4px',
                    borderRadius: '6px',
                    border: masterySliderValue === val ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    background: masterySliderValue === val ? 'rgba(16,185,129,0.12)' : 'transparent',
                    color: masterySliderValue === val ? 'var(--accent-primary-light)' : 'var(--text-muted)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {val}%
                </button>
              ))}
            </div>

            <button
              onClick={handleMasteryUpdate}
              disabled={updateMastery.isPending}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: updateMastery.isPending ? 'wait' : 'pointer',
                opacity: updateMastery.isPending ? 0.7 : 1,
                transition: 'all 0.2s',
              }}
            >
              {updateMastery.isPending ? '保存中...' : '保存进度'}
            </button>
          </div>

          {/* Unlock condition */}
          {selectedMastery && selectedMastery.masteryScore < 80 && (
            <div style={{
              background: 'var(--color-warning-bg)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '12px',
              color: 'var(--color-warning)',
              lineHeight: 1.6,
            }}>
              <strong>解锁条件:</strong> 掌握度达到 80% 后解锁后续技能节点
            </div>
          )}

          {/* Completed badge */}
          {selectedMastery && selectedMastery.masteryScore >= 80 && (
            <div style={{
              background: 'var(--color-success-bg)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '10px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: 'var(--color-success)',
              fontWeight: 600,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
              </svg>
              技能已掌握！
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
