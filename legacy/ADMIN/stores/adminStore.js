import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 관리자 로그인 전역 상태 (zustand + localStorage 영속)
//  admin: { adminId, name, role }  · role: 'SUPER' | 'NORMAL'
export const useAdminStore = create(
  persist(
    (set, get) => ({
      admin: null,
      setAdmin: (admin) => set({ admin }),
      logout: () => set({ admin: null }),
      // 편의 게터
      getAdminId: () => get().admin?.adminId || null,
      getIsSuper: () => get().admin?.role === 'SUPER',
    }),
    { name: 'neosis-admin' },
  ),
);
