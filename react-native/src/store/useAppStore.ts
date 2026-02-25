import { create } from "zustand";

export interface UserProfile {
  id?: string;
  firebase_uid?: string;
  email?: string;
  name?: string;
  age?: number;
  gender?: string;
  height?: number;
  current_weight?: number;
  target_weight?: number;
  activity_level?: string;
  dietary_preference?: string;
  workout_time?: number;
  subscription_status?: string;
  created_at?: string;
}

export interface XpData {
  total_xp: number;
  level: number;
  streak_count: number;
}

interface AppStore {
  user: UserProfile | null;
  xp: XpData | null;
  setUser: (user: UserProfile | null) => void;
  setXp: (xp: XpData | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  user: null,
  xp: null,
  setUser: (user) => set({ user }),
  setXp: (xp) => set({ xp }),
}));
