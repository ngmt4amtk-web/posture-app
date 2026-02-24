import { create } from 'zustand';
import { db, getOrCreateDefaultProfile, type Profile } from '../db';

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  init: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  updateHeight: (height: number | undefined) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loading: true,
  init: async () => {
    const profile = await getOrCreateDefaultProfile();
    set({ profile, loading: false });
  },
  updateName: async (name) => {
    const { profile } = get();
    if (!profile) return;
    await db.profiles.update(profile.id, { name });
    set({ profile: { ...profile, name } });
  },
  updateHeight: async (height) => {
    const { profile } = get();
    if (!profile) return;
    await db.profiles.update(profile.id, { height });
    set({ profile: { ...profile, height } });
  },
}));
