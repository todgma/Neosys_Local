import { useEffect, useState, useCallback } from 'react';

// 상담모드 전역 토글 — Electron 분리 탭(별도 창)에서도 공유되어야 하므로 localStorage 기반.
// 같은 창 내 즉시 반영은 커스텀 이벤트, 다른 창 반영은 storage 이벤트로 처리.
const KEY = 'consult_mode';
const EVENT = 'consult-mode-change';

export const readConsultMode = () => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
};

export const setConsultMode = (on) => {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* noop */ }
  // 같은 창에는 storage 이벤트가 안 오므로 커스텀 이벤트로 직접 통지
  try { window.dispatchEvent(new CustomEvent(EVENT, { detail: !!on })); } catch { /* noop */ }
};

export function useConsultMode() {
  const [on, setOn] = useState(readConsultMode);

  useEffect(() => {
    const onCustom = (e) => setOn(!!e.detail);
    const onStorage = (e) => { if (e.key === KEY) setOn(e.newValue === '1'); };
    window.addEventListener(EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    // 마운트 시 최신값 동기화(다른 창에서 이미 바뀐 경우 대비)
    setOn(readConsultMode());
    return () => {
      window.removeEventListener(EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const toggle = useCallback(() => setConsultMode(!readConsultMode()), []);
  const set = useCallback((v) => setConsultMode(v), []);
  return [on, toggle, set];
}
