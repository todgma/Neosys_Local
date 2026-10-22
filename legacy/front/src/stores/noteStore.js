import { create } from 'zustand';
import hubService from '../services/hubService';

// 이미 열린 쪽지창에도 매번 새 초기상태를 적용시키기 위한 증가 nonce
let noteOpenSeq = 0;

/**
 * 쪽지 전역 상태 (미읽음 배지 + 쪽지관리 모달 열기)
 * - 실시간 연결/미니팝업은 NoteHost가 담당
 * - 화면 어디서든 useNoteStore로 배지 조회 / 모달 열기
 */
export const useNoteStore = create((set, get) => ({
  unreadCount: 0,

  // 모달 상태
  modalOpen: false,
  modalReceivers: [],   // 작성하기 기본 수신자 [{id,name}]
  modalTab: null,       // 'compose' | 'all' | 'received' | 'sent' | null(기본)
  modalSubject: '',     // 작성하기 기본 제목(등록일/물건유형/주소 자동기입)

  setUnreadCount: (n) => set({ unreadCount: n || 0 }),

  refreshUnread: async (userId) => {
    if (!userId) return;
    try {
      const res = await hubService.getUnreadNoteCount(userId);
      set({ unreadCount: res.count || 0 });
    } catch { /* noop */ }
  },

  // 쪽지관리 열기: Electron 별도 팝업창(단일 인스턴스). 비-Electron이면 인앱 모달로 폴백.
  openNotes: (opts = {}) => {
    const receivers = opts.receivers || [];
    const subject = opts.subject || '';
    const tab = opts.tab || (receivers.length ? 'compose' : null);
    if (typeof window !== 'undefined' && window.electronAPI?.openTabInWindow) {
      window.electronAPI.openTabInWindow({
        tabId: 'note-manager', route: '/note-manager', title: '쪽지관리',
        initState: { receivers, tab, subject, nonce: ++noteOpenSeq },
      });
      return;
    }
    set({ modalOpen: true, modalReceivers: receivers, modalTab: tab, modalSubject: subject });
  },

  // 답장: 특정 발신자에게 작성하기
  replyTo: (sender) => {
    const receivers = sender && sender.id ? [{ id: String(sender.id), name: sender.name || String(sender.id) }] : [];
    if (typeof window !== 'undefined' && window.electronAPI?.openTabInWindow) {
      window.electronAPI.openTabInWindow({
        tabId: 'note-manager', route: '/note-manager', title: '쪽지관리',
        initState: { receivers, tab: 'compose', nonce: ++noteOpenSeq },
      });
      return;
    }
    set({ modalOpen: true, modalReceivers: receivers, modalTab: 'compose', modalSubject: '' });
  },

  closeNotes: () => set({ modalOpen: false, modalReceivers: [], modalTab: null, modalSubject: '' }),
}));
