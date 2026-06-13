// Shared types for Action PRO skill tree components

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

export interface SkillTreeNode {
  id: string;
  skillId: string;
  title: string;
  description: string | null;
  difficulty: number;
  tier: number;
  category: string;
  xpReward: number;
  icon: string;
  positionX: number;
  positionY: number;
  isRoot: boolean;
}

export interface SkillTreeEdge {
  id: string;
  prerequisiteId: string;
  dependentId: string;
  strength: number;
}

export interface SkillTreeMastery {
  skillNodeId: string;
  masteryScore: number;
  practiceCount: number;
  lastPracticed: string | null;
}
