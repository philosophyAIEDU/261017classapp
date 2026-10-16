// 로그인한 사람과 학급 정보를 앱 전체가 함께 쓰는 곳입니다. (Zustand)

import { create } from 'zustand';
import { repo } from '../repositories';
import type { ClassRoom, CurrentUser, Role } from '../types';

interface SessionState {
  ready: boolean; // 처음 불러오기가 끝났는지
  user: CurrentUser | null;
  classRoom: ClassRoom | null;
  /** 데이터가 바뀌면 숫자를 올려서 화면들이 다시 불러오게 합니다. */
  dataVersion: number;
  init: () => Promise<void>;
  setUser: (user: CurrentUser | null) => Promise<void>;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
  demoSwitch: (role: Role) => Promise<void>;
  bumpData: () => void;
}

async function loadClass(user: CurrentUser | null): Promise<ClassRoom | null> {
  return user?.classId ? repo.getClass(user.classId) : null;
}

export const useSession = create<SessionState>((set, get) => ({
  ready: false,
  user: null,
  classRoom: null,
  dataVersion: 0,

  init: async () => {
    try {
      const user = await repo.getCurrentUser();
      set({ user, classRoom: await loadClass(user), ready: true });
    } catch {
      set({ user: null, classRoom: null, ready: true });
    }
  },

  setUser: async (user) => {
    set({ user, classRoom: await loadClass(user), dataVersion: get().dataVersion + 1 });
  },

  refreshUser: async () => {
    await get().setUser(await repo.getCurrentUser());
  },

  signOut: async () => {
    await repo.signOut();
    set({ user: null, classRoom: null });
  },

  demoSwitch: async (role) => {
    if (!repo.demoSignIn) return;
    await get().setUser(await repo.demoSignIn(role));
  },

  bumpData: () => set({ dataVersion: get().dataVersion + 1 }),
}));
