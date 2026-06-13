'use client';

import * as React from 'react';
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';

export function SkillEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, data,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const strength = (data as { strength?: number })?.strength ?? 1;
  const isHard = strength >= 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: isHard ? 'rgba(239,68,68,0.5)' : 'rgba(37,99,235,0.4)',
          strokeWidth: isHard ? 2.5 : 1.5,
          strokeDasharray: isHard ? '0' : '5 5',
        }}
      />
      {/* Glow effect */}
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          stroke: isHard ? 'rgba(239,68,68,0.15)' : 'rgba(37,99,235,0.1)',
          strokeWidth: isHard ? 8 : 6,
          filter: 'blur(4px)',
        }}
      />
    </>
  );
}
