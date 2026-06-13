'use client';

import * as React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface SkillNodeData {
  skillId: string;
  title: string;
  description: string | null;
  difficulty: number;
  tier: number;
  category: string;
  xpReward: number;
  icon: string;
  isRoot: boolean;
  masteryScore: number;
  isLocked: boolean;
  nodeId: string;
  onClick?: () => void;
}

const difficultyColors: Record<number, { bg: string; border: string; text: string }> = {
  1: { bg: 'rgba(16,185,129,0.15)', border: '#10b981', text: '#10b981' },
  2: { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#f59e0b' },
  3: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#ef4444' },
};

const categoryGradients: Record<string, string> = {
  frontend: 'linear-gradient(135deg, #2563eb, #3b82f6)',
  backend: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
  ai: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
  general: 'linear-gradient(135deg, #475569, #64748b)',
};

const iconPaths: Record<string, string> = {
  code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  atom: 'M12 12m-1 0a1 1 0 102 0 1 1 0 10-2 0M12 7a5 5 0 100 10 5 5 0 000-10zM19.5 8a7.5 7.5 0 11-15 0',
  lock: 'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7.5 11V7a5.5 5.5 0 1111 0v4',
  server: 'M4 4h16a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM4 14h16a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2z',
  database: 'M12 2C6.48 2 2 4.24 2 8v8c0 3.76 4.48 6 10 6s10-2.24 10-6V8c0-3.76-4.48-6-10-6zM12 16c-4.42 0-8-1.57-8-4v-1c0-2.43 3.58-4 8-4s8 1.57 8 4v1c0 2.43-3.58 4-8 4z',
  chart: 'M3 3v18h18M7 16l4-4 4 4 5-6',
  brain: 'M12 2a4 4 0 014 4c0 .74-.2 1.43-.54 2.01A4 4 0 0116 12a4 4 0 01-.54 2.01A4 4 0 0112 18a4 4 0 01-3.46-1.99A4 4 0 018 12a4 4 0 01.54-2.01A4 4 0 0112 2zM9 12a3 3 0 106 0 3 3 0 00-6 0zM9 6a3 3 0 106 0 3 3 0 00-6 0zM15 12a3 3 0 106 0 3 3 0 00-6 0z',
  rocket: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  circle: 'M12 12m-10 0a10 10 0 1020 0 10 10 0 10-20 0',
};

export function SkillNode(props: NodeProps) {
  const data = props.data as unknown as SkillNodeData;
  const nodeData = data;
  const colors = difficultyColors[nodeData.difficulty] || difficultyColors[1];
  const gradient = categoryGradients[nodeData.category] || categoryGradients.general;
  const iconPath = iconPaths[nodeData.icon] || iconPaths.circle;

  const masteryPercent = nodeData.masteryScore || 0;
  const isComplete = masteryPercent >= 80;

  return (
    <div
      onClick={nodeData.onClick}
      style={{
        background: nodeData.isLocked
          ? 'rgba(8,12,24,0.9)'
          : 'rgba(17,24,39,0.95)',
        border: props.selected
          ? '2px solid var(--accent-primary)'
          : nodeData.isLocked
            ? '1px solid var(--border-subtle)'
            : `1px solid ${colors.border}`,
        borderRadius: '16px',
        padding: '14px 16px',
        minWidth: '160px',
        cursor: nodeData.isLocked ? 'not-allowed' : 'pointer',
        opacity: nodeData.isLocked ? 0.5 : 1,
        transition: 'all 0.2s ease',
        boxShadow: props.selected
          ? '0 0 20px rgba(37,99,235,0.4)'
          : isComplete
            ? '0 0 16px rgba(16,185,129,0.3)'
            : '0 4px 12px rgba(0,0,0,0.3)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        if (!nodeData.isLocked) {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
        (e.currentTarget as HTMLElement).style.boxShadow = props.selected
          ? '0 0 20px rgba(37,99,235,0.4)'
          : isComplete
            ? '0 0 16px rgba(16,185,129,0.3)'
            : '0 4px 12px rgba(0,0,0,0.3)';
      }}
    >
      {isComplete && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at top, rgba(16,185,129,0.1), transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}

      <div style={{
        position: 'absolute',
        left: 0,
        top: '20%',
        bottom: '20%',
        width: '3px',
        borderRadius: '0 2px 2px 0',
        background: nodeData.isLocked ? 'var(--text-muted)' : colors.border,
      }} />

      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: nodeData.isLocked ? 'var(--text-muted)' : colors.border,
          width: '8px',
          height: '8px',
          border: 'none',
        }}
      />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '8px',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: nodeData.isLocked ? 'rgba(255,255,255,0.05)' : gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={nodeData.isLocked ? 'var(--text-muted)' : '#fff'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={iconPath} />
          </svg>
        </div>

        {!nodeData.isLocked && (
          <span style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '999px',
            background: colors.bg,
            color: colors.text,
            fontWeight: 600,
            marginLeft: 'auto',
          }}>
            {nodeData.difficulty === 1 ? '入门' : nodeData.difficulty === 2 ? '进阶' : '高级'}
          </span>
        )}

        {nodeData.isLocked && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ marginLeft: 'auto' }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        )}
      </div>

      <div style={{
        fontSize: '13px',
        fontWeight: 600,
        color: nodeData.isLocked ? 'var(--text-muted)' : 'var(--text-primary)',
        marginBottom: '4px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {nodeData.title}
      </div>

      {!nodeData.isLocked && (
        <div style={{
          fontSize: '11px',
          color: 'var(--accent-secondary)',
          marginBottom: nodeData.masteryScore > 0 ? '8px' : '0',
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--accent-secondary)" stroke="none">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span>+{nodeData.xpReward} XP</span>
        </div>
      )}

      {nodeData.masteryScore > 0 && !nodeData.isLocked && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#64748b',
            marginBottom: '3px',
          }}>
            <span>掌握度</span>
            <span style={{
              color: isComplete ? 'var(--color-success)' : 'var(--text-secondary)',
              fontWeight: 600,
            }}>
              {masteryPercent}%
            </span>
          </div>
          <div style={{
            height: '4px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${masteryPercent}%`,
              height: '100%',
              background: isComplete
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : 'var(--gradient-blue)',
              borderRadius: '2px',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: nodeData.isLocked ? 'var(--text-muted)' : colors.border,
          width: '8px',
          height: '8px',
          border: 'none',
        }}
      />
    </div>
  );
}
