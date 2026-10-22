import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  isOpen: false,
  unreadCount: 3, // 읽지 않은 알림 개수

  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),
  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
  setUnreadCount: (count) => set({ unreadCount: count }),
}));
