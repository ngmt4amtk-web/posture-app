import { create } from 'zustand';
import type { PostureMetrics, SessionType } from '../db';

export type AnalysisPhase = 'idle' | 'loading' | 'ready' | 'readiness' | 'countdown' | 'measuring' | 'done' | 'side-readiness' | 'side-countdown' | 'side-measuring' | 'side-done';

export interface RawFrame {
  time: number;
  metrics: Record<string, number>;
}

interface AnalysisState {
  phase: AnalysisPhase;
  sessionType: SessionType;
  facingMode: 'user' | 'environment';
  countdown: number;
  elapsed: number;
  duration: number;
  frames: RawFrame[];
  sideFrames: RawFrame[];
  frontMetrics: PostureMetrics | null;
  sideMetrics: PostureMetrics | null;
  overallScore: number;
  currentLandmarks: unknown[] | null;
  setPhase: (phase: AnalysisPhase) => void;
  setSessionType: (type: SessionType) => void;
  setFacingMode: (mode: 'user' | 'environment') => void;
  setCountdown: (n: number) => void;
  setElapsed: (n: number) => void;
  addFrame: (frame: RawFrame) => void;
  addSideFrame: (frame: RawFrame) => void;
  setFrontMetrics: (m: PostureMetrics) => void;
  setSideMetrics: (m: PostureMetrics) => void;
  setOverallScore: (s: number) => void;
  setCurrentLandmarks: (lm: unknown[] | null) => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  phase: 'idle',
  sessionType: 'quick',
  facingMode: 'user',
  countdown: 3,
  elapsed: 0,
  duration: 15,
  frames: [],
  sideFrames: [],
  frontMetrics: null,
  sideMetrics: null,
  overallScore: 0,
  currentLandmarks: null,
  setPhase: (phase) => set({ phase }),
  setSessionType: (type) => set({ sessionType: type }),
  setFacingMode: (mode) => set({ facingMode: mode }),
  setCountdown: (n) => set({ countdown: n }),
  setElapsed: (n) => set({ elapsed: n }),
  addFrame: (frame) => set((s) => ({ frames: [...s.frames, frame] })),
  addSideFrame: (frame) => set((s) => ({ sideFrames: [...s.sideFrames, frame] })),
  setFrontMetrics: (m) => set({ frontMetrics: m }),
  setSideMetrics: (m) => set({ sideMetrics: m }),
  setOverallScore: (s) => set({ overallScore: s }),
  setCurrentLandmarks: (lm) => set({ currentLandmarks: lm }),
  reset: () => set({
    phase: 'idle',
    countdown: 3,
    elapsed: 0,
    frames: [],
    sideFrames: [],
    frontMetrics: null,
    sideMetrics: null,
    overallScore: 0,
    currentLandmarks: null,
  }),
}));
