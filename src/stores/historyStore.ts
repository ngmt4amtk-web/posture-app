import { create } from 'zustand';
import { db, type Session } from '../db';

interface HistoryState {
  sessions: Session[];
  selectedSession: Session | null;
  loading: boolean;
  load: (profileId: string) => Promise<void>;
  addSession: (session: Session) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  selectSession: (session: Session | null) => void;
  clearAll: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  sessions: [],
  selectedSession: null,
  loading: true,
  load: async (profileId) => {
    const sessions = await db.sessions
      .where('profileId')
      .equals(profileId)
      .reverse()
      .sortBy('timestamp');
    set({ sessions, loading: false });
  },
  addSession: async (session) => {
    await db.sessions.add(session);
    set((s) => ({ sessions: [session, ...s.sessions] }));
  },
  deleteSession: async (id) => {
    await db.sessions.delete(id);
    set((s) => ({
      sessions: s.sessions.filter((x) => x.id !== id),
      selectedSession: s.selectedSession?.id === id ? null : s.selectedSession,
    }));
  },
  selectSession: (session) => set({ selectedSession: session }),
  clearAll: async () => {
    await db.sessions.clear();
    await db.profiles.clear();
    set({ sessions: [], selectedSession: null });
  },
}));
