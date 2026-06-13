'use client';

import * as React from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeChange,
  BackgroundVariant,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { SkillNode } from './SkillNode';
import { SkillEdge } from './SkillEdge';
import type { SkillTreeNode, SkillTreeEdge, SkillTreeMastery } from './SkillTree.types';

export { type SkillTreeNode, type SkillTreeEdge, type SkillTreeMastery } from './SkillTree.types';

const nodeTypes = { skillNode: SkillNode };
const edgeTypes = { skillEdge: SkillEdge };

export interface SkillTreeCanvasProps {
  nodes: SkillTreeNode[];
  edges: SkillTreeEdge[];
  masteries: SkillTreeMastery[];
  onNodeClick?: (nodeId: string) => void;
  onNodeDragStop?: (nodeId: string, x: number, y: number) => void;
}

export function SkillTreeCanvas({
  nodes,
  edges,
  masteries,
  onNodeClick,
  onNodeDragStop,
}: SkillTreeCanvasProps) {
  const masteryMap = React.useMemo(
    () => new Map(masteries.map(m => [m.skillNodeId, m])),
    [masteries],
  );

  const flowNodes: Node[] = React.useMemo(() => {
    return nodes.map(node => {
      const mastery = masteryMap.get(node.id);
      const masteryScore = mastery?.masteryScore ?? 0;
      const isLocked = !node.isRoot && masteryScore < 50;

      return {
        id: node.id,
        type: 'skillNode',
        position: { x: node.positionX, y: node.positionY },
        data: {
          skillId: node.skillId,
          title: node.title,
          description: node.description,
          difficulty: node.difficulty,
          tier: node.tier,
          category: node.category,
          xpReward: node.xpReward,
          icon: node.icon,
          isRoot: node.isRoot,
          masteryScore,
          isLocked,
          nodeId: node.id,
        },
        draggable: true,
      };
    });
  }, [nodes, masteryMap]);

  const flowEdges: Edge[] = React.useMemo(() => {
    return edges.map(edge => ({
      id: edge.id,
      source: edge.prerequisiteId,
      target: edge.dependentId,
      type: 'skillEdge',
      data: { strength: edge.strength },
    }));
  }, [edges]);

  const [flowNodesState, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [flowEdgesState, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Sync nodes from props
  React.useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  React.useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  const handleNodesChange = React.useCallback(
    (changes: NodeChange<Node>[]) => {
      onNodesChange(changes);
      const positionChange = changes.find(
        c => c.type === 'position' && c.dragging === false && c.position !== undefined,
      );
      if (positionChange && positionChange.type === 'position' && positionChange.position) {
        onNodeDragStop?.(
          positionChange.id,
          positionChange.position.x,
          positionChange.position.y,
        );
      }
    },
    [onNodesChange, onNodeDragStop],
  );

  const handleNodeClick = React.useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick],
  );

  return (
    <div style={{ width: '100%', height: '100%', background: 'transparent' }}>
      <ReactFlow
        nodes={flowNodesState}
        edges={flowEdgesState}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes as any}
        edgeTypes={edgeTypes as any}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(255,255,255,0.04)"
        />
        <Controls
          style={{
            background: 'rgba(26,26,46,0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
          }}
        />
        <MiniMap
          style={{
            background: 'rgba(26,26,46,0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
          }}
          maskColor="rgba(0,0,0,0.5)"
        />
      </ReactFlow>
    </div>
  );
}
