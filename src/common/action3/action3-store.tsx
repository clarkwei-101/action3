'use client';
import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';

// ============================================================
// Event Types
// ============================================================
export type Action3Event =
  | { type: 'GOAL_COMPLETED'; goalId: string; xp: number; goalTitle: string }
  | { type: 'GOAL_CREATED'; goalId: string; goalTitle: string }
  | { type: 'MILESTONE_COMPLETED'; goalId: string; goalTitle: string; milestoneId: string; milestoneTitle: string; skillIds: string[] }
  | { type: 'TASK_COMPLETED'; goalId: string; milestoneId: string; taskId: string; taskTitle: string; xpEarned: number }
  | { type: 'SKILL_MASTERED'; skillId: string; skillName: string; masteryScore: number; previousScore: number }
  | { type: 'SKILL_PROGRESS'; skillId: string; skillName: string; masteryScore: number }
  | { type: 'ACHIEVEMENT_UNLOCKED'; achievementKey: string; achievementName: string; achievementDescription: string; icon: string; xpReward: number }
  | { type: 'STREAK_UPDATED'; days: number; previousDays: number }
  | { type: 'COURSE_COMPLETED'; courseId: string; courseTitle: string; skillIds: string[] }
  | { type: 'LEVEL_UP'; newLevel: number; totalXP: number }
  | { type: 'VOICE_ASKED'; question: string; answered: boolean };

// ============================================================
// State Shape
// ============================================================
interface UserProfile {
  name: string;
  level: number;
  totalXP: number;
  currentStreak: number;
}

interface Action3GlobalState {
  user: UserProfile;
  activeGoalId: string | null;
  activeSkillId: string | null;
  activeMilestoneId: string | null;
  events: Action3Event[];
  // Toast queue
  toasts: ToastItem[];
}

interface ToastItem {
  id: string;
  event: Action3Event;
  timestamp: number;
  dismissed: boolean;
}

// ============================================================
// Reducer
// ============================================================
type Action =
  | { type: 'DISPATCH_EVENT'; event: Action3Event }
  | { type: 'DISMISS_TOAST'; id: string }
  | { type: 'SET_ACTIVE_GOAL'; goalId: string | null }
  | { type: 'SET_ACTIVE_SKILL'; skillId: string | null }
  | { type: 'SET_ACTIVE_MILESTONE'; milestoneId: string | null }
  | { type: 'UPDATE_USER'; updates: Partial<UserProfile> };

const INITIAL_STATE: Action3GlobalState = {
  user: { name: '朋友', level: 1, totalXP: 0, currentStreak: 0 },
  activeGoalId: null,
  activeSkillId: null,
  activeMilestoneId: null,
  events: [],
  toasts: [],
};

function action3Reducer(state: Action3GlobalState, action: Action): Action3GlobalState {
  switch (action.type) {
    case 'DISPATCH_EVENT': {
      const toastId = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return {
        ...state,
        events: [...state.events.slice(-49), action.event], // keep last 50
        toasts: [
          ...state.toasts.slice(-4), // keep max 5 toasts
          { id: toastId, event: action.event, timestamp: Date.now(), dismissed: false },
        ],
      };
    }
    case 'DISMISS_TOAST':
      return { ...state, toasts: state.toasts.map(t => t.id === action.id ? { ...t, dismissed: true } : t) };
    case 'SET_ACTIVE_GOAL':
      return { ...state, activeGoalId: action.goalId };
    case 'SET_ACTIVE_SKILL':
      return { ...state, activeSkillId: action.skillId };
    case 'SET_ACTIVE_MILESTONE':
      return { ...state, activeMilestoneId: action.milestoneId };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.updates } };
    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================
interface Action3ContextValue {
  state: Action3GlobalState;
  dispatchEvent: (event: Action3Event) => void;
  dismissToast: (id: string) => void;
  setActiveGoal: (goalId: string | null) => void;
  setActiveSkill: (skillId: string | null) => void;
  setActiveMilestone: (milestoneId: string | null) => void;
  updateUser: (updates: Partial<UserProfile>) => void;
}

const Action3Context = createContext<Action3ContextValue | null>(null);
export const useAction3Context = () => useContext(Action3Context);

export function Action3StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(action3Reducer, INITIAL_STATE);

  const dispatchEvent = useCallback((event: Action3Event) => {
    dispatch({ type: 'DISPATCH_EVENT', event });
  }, []);

  const dismissToast = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_TOAST', id });
  }, []);

  const setActiveGoal = useCallback((goalId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_GOAL', goalId });
  }, []);

  const setActiveSkill = useCallback((skillId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_SKILL', skillId });
  }, []);

  const setActiveMilestone = useCallback((milestoneId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_MILESTONE', milestoneId });
  }, []);

  const updateUser = useCallback((updates: Partial<UserProfile>) => {
    dispatch({ type: 'UPDATE_USER', updates });
  }, []);

  return (
    <Action3Context.Provider value={{
      state, dispatchEvent, dismissToast,
      setActiveGoal, setActiveSkill, setActiveMilestone, updateUser,
    }}>
      {children}
    </Action3Context.Provider>
  );
}

export function useAction3Store() {
  const ctx = useAction3Context();
  return ctx ?? {
    state: INITIAL_STATE,
    dispatchEvent: () => {},
    dismissToast: () => {},
    setActiveGoal: () => {},
    setActiveSkill: () => {},
    setActiveMilestone: () => {},
    updateUser: () => {},
  };
}

// ============================================================
// Event Selectors (for consumers)
// ============================================================
export function selectToasts(state: Action3GlobalState) {
  return state.toasts.filter(t => !t.dismissed);
}

export function selectRecentEvents(state: Action3GlobalState, count = 10) {
  return state.events.slice(-count);
}
