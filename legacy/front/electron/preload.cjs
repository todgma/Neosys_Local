const { contextBridge, ipcRenderer } = require('electron');

// Electron API를 안전하게 렌더러 프로세스에 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 윈도우 관리
  createWindow: (route, title, options) =>
    ipcRenderer.invoke('create-window', route, title, options),
  closeWindow: (windowId) =>
    ipcRenderer.invoke('close-window', windowId),

  // 외부(시스템 기본) 브라우저로 URL 열기
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // 결제: 앱 내 전용 창에서 웹 결제(토스) 진행 → 완료/실패/닫힘 결과 반환
  payment: {
    open: (opts) => ipcRenderer.invoke('payment:open', opts),
  },

  // HTML을 OS 인쇄 대화상자로 인쇄(Electron window.print 미리보기 미지원 우회)
  printHtml: (html, options) => ipcRenderer.invoke('print:html', { html, ...(options || {}) }),

  // 탭 분리 기능
  openTabInWindow: (payload) => ipcRenderer.invoke('window:openTab', payload),
  focusDetachedTab: (payload) => ipcRenderer.invoke('window:focusTab', payload),
  // 홈으로: 열려있는 메인 창(대시보드)을 맨 앞으로
  focusMainWindow: () => ipcRenderer.invoke('window:focusMain'),
  // 로그아웃: 메인 대시보드 창을 제외한 모든 창 닫기
  closeAllExceptMain: () => ipcRenderer.invoke('window:closeAllExceptMain'),

  // 쪽지 작성 중 상태 통지(창 닫기 경고용)
  setNoteComposing: (composing) => ipcRenderer.invoke('note:setComposing', composing),
  onTabInit: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('tab:init', handler);
    return () => ipcRenderer.removeListener('tab:init', handler);
  },
  onTabReattach: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('tab:reattach', handler);
    return () => ipcRenderer.removeListener('tab:reattach', handler);
  },

  // 대화상자
  showMessageBox: (options) =>
    ipcRenderer.invoke('show-message-box', options),
  showSaveDialog: (options) =>
    ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) =>
    ipcRenderer.invoke('show-open-dialog', options),

  // 플랫폼 정보
  platform: process.platform,

  // 버전 정보
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  // 자동 업데이트 (수동 확인)
  update: {
    checkForUpdates: () => ipcRenderer.invoke('update:checkForUpdates'),
  },

  // PC폰관리 (KT 통화)
  phone: {
    getAccount: () => ipcRenderer.invoke('phone:getAccount'),
    saveAccount: (config) => ipcRenderer.invoke('phone:saveAccount', config),
    login: (config) => ipcRenderer.invoke('phone:login', config),
    sendSms: (to, message) => ipcRenderer.invoke('phone:sendSms', { to, message }),
    getAddressGroups: () => ipcRenderer.invoke('phone:getAddressGroups'),
    getAddressData: (pdbid) => ipcRenderer.invoke('phone:getAddressData', { pdbid }),
    status: () => ipcRenderer.invoke('phone:status'),
    // 착신 테스트(시뮬레이션) — 실제 KT 브리지와 동일한 착신 흐름 유발
    simulateIncomingCall: (phoneNumber) => ipcRenderer.invoke('phone:simulateIncomingCall', phoneNumber),
    // 전화 수신 이벤트 (main → renderer push)
    onIncomingCall: (cb) => {
      const handler = (_e, data) => cb(data);
      ipcRenderer.on('phone:incomingCall', handler);
      return () => ipcRenderer.removeListener('phone:incomingCall', handler);
    },
  },

  // 모달 창 관리
  modal: {
    open: (payload) => ipcRenderer.invoke('modal:open', payload),
    close: (modalId) => ipcRenderer.invoke('modal:close', { modalId }),
    updateData: (modalId, data) => ipcRenderer.invoke('modal:updateData', { modalId, data }),
    focus: (modalId) => ipcRenderer.invoke('modal:focus', { modalId }),
    sendToMain: (payload) => ipcRenderer.invoke('modal:sendToMain', payload),
    onInit: (cb) => {
      const handler = (_e, data) => cb(data);
      ipcRenderer.on('modal:init', handler);
      return () => ipcRenderer.removeListener('modal:init', handler);
    },
    onClosed: (modalId, cb) => {
      const handler = (_e, data) => {
        // modalId가 일치하는 경우에만 콜백 호출
        if (data.modalId === modalId) {
          cb(data);
        }
      };
      ipcRenderer.on('modal:closed', handler);
      return () => ipcRenderer.removeListener('modal:closed', handler);
    },
    onDataUpdated: (cb) => {
      const handler = (_e, data) => cb(data);
      ipcRenderer.on('modal:dataUpdated', handler);
      return () => ipcRenderer.removeListener('modal:dataUpdated', handler);
    },
    // 메인 창에서 모달 이벤트 수신
    on: (eventName, cb) => {
      const handler = (_e, data) => cb(data);
      ipcRenderer.on(`modal:${eventName}`, handler);
      return () => ipcRenderer.removeListener(`modal:${eventName}`, handler);
    },
  },
});

// React 개발 도구 지원
if (process.env.NODE_ENV === 'development') {
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || {};
}