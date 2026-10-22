import React, { useCallback, useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useNoteStore } from '../../stores/noteStore';
import NoteModal from '../../components/hub/NoteModal';

/**
 * 쪽지관리 별도 팝업 페이지 (Electron 단일 창, tabId='note-manager')
 *  - 대시보드/공동중개망 등에서 openNotes → 이 창으로 열림 (중복 방지: main에서 singleton)
 *  - 작성 중 창 닫기 시 경고는 main 프로세스의 close 가드가 처리
 *    (여기서는 작성 상태를 main에 통지)
 */
const NoteManagerPage = ({ initState }) => {
  const { user, office } = useAuthStore();
  const refreshUnread = useNoteStore((s) => s.refreshUnread);
  const personName = user?.rtNm || user?.userNm || user?.name || user?.userId || '';
  // 표기: 이름(중개사무소명) — office는 NoteHost가 채움
  const userName = office?.offNm ? `${personName}(${office.offNm})` : personName;

  // initState가 바뀔 때마다(신규 오픈/이미 열린 창 재전달) 재적용시키는 시퀀스
  // — 창별 nonce 충돌과 무관하게 항상 새 수신자/탭을 반영
  const [applySeq, setApplySeq] = useState(0);
  useEffect(() => { setApplySeq((s) => s + 1); }, [initState]);

  const handleComposing = useCallback((composing) => {
    try { window.electronAPI?.setNoteComposing?.(!!composing); } catch { /* noop */ }
  }, []);

  const handleClose = () => {
    // 창 닫기 (작성 중 경고는 main 프로세스가 가로채 처리)
    try { window.close(); } catch { /* noop */ }
  };

  if (!user?.userId) {
    return <div style={{ padding: '24px', fontSize: '13px', color: '#6b7280' }}>로그인이 필요합니다.</div>;
  }

  return (
    <NoteModal
      page
      isOpen
      userId={user.userId}
      userName={userName}
      initialReceivers={initState?.receivers || []}
      initialTab={initState?.tab || null}
      initialTitle={initState?.subject || ''}
      openNonce={applySeq}
      onClose={handleClose}
      onChanged={() => refreshUnread(user.userId)}
      onComposingChange={handleComposing}
    />
  );
};

export default NoteManagerPage;
