import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useNoteStore } from '../../stores/noteStore';
import { officeService } from '../../services/officeService';
import { startNoteHub, stopNoteHub } from '../../services/noteHub';
import NoteModal from './NoteModal';

/**
 * 쪽지 전역 호스트 (MainLayout에 1회 마운트)
 *  - SignalR 실시간 연결 (어느 화면이든 수신)
 *  - 새 쪽지 도착 시 우하단 미니팝업 (답장/열기)
 *  - 전역 쪽지관리 모달 렌더 (noteStore로 제어)
 */
const NoteHost = () => {
  const { user, office, updateOffice } = useAuthStore();
  const { modalOpen, modalReceivers, modalTab, modalSubject, openNotes, replyTo, closeNotes, refreshUnread, setUnreadCount } = useNoteStore();
  const [popups, setPopups] = useState([]); // [{key, senderId, senderName, title}]
  const seqRef = useRef(0);

  const userId = user?.userId;
  const personName = user?.rtNm || user?.userNm || user?.name || user?.userId || '';
  // 표기: 이름(중개사무소명)
  const userName = office?.offNm ? `${personName}(${office.offNm})` : personName;

  // 사무소 정보가 없으면(분리창 등) 조회해서 authStore에 채움
  useEffect(() => {
    if (!office?.offNm && userId) {
      officeService.getOfficeByUser(userId).then((r) => {
        if (r?.success && r.data) updateOffice(r.data);
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [office?.offNm, userId]);

  const dismissPopup = useCallback((key) => {
    setPopups((prev) => prev.filter((p) => p.key !== key));
  }, []);

  // 실시간 연결
  useEffect(() => {
    if (!userId) return;
    refreshUnread(userId);
    startNoteHub(userId, (payload) => {
      refreshUnread(userId);
      const key = ++seqRef.current;
      const popup = {
        key,
        senderId: payload?.senderId,
        senderName: payload?.senderName || payload?.senderId || '',
        title: payload?.title || '(제목 없음)',
      };
      setPopups((prev) => [...prev, popup].slice(-4)); // 최대 4개 유지
      // 10초 후 자동 사라짐
      setTimeout(() => dismissPopup(key), 10000);
    });
    return () => { stopNoteHub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!userId) return null;

  return (
    <>
      {/* 우하단 미니팝업 */}
      <div style={{ position: 'fixed', right: '16px', bottom: '16px', zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
        {popups.map((p) => (
          <div key={p.key}
            style={{ pointerEvents: 'auto', width: '300px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.16)', overflow: 'hidden', animation: 'noteSlideIn 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#eef2ff', borderBottom: '1px solid #e0e7ff' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#4338ca' }}>✉️ 새 쪽지</span>
              <button onClick={() => dismissPopup(p.key)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280', fontSize: '15px', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '10px 12px', cursor: 'pointer' }}
              onClick={() => { openNotes({ tab: 'received' }); dismissPopup(p.key); }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '3px' }}>보낸사람: {p.senderName}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
            </div>
            <div style={{ display: 'flex', gap: '6px', padding: '0 12px 10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { replyTo({ id: p.senderId, name: p.senderName }); dismissPopup(p.key); }}
                style={{ padding: '5px 14px', fontSize: '13px', fontWeight: 600, color: 'white', background: '#6366f1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>답장</button>
              <button onClick={() => { openNotes({ tab: 'received' }); dismissPopup(p.key); }}
                style={{ padding: '5px 12px', fontSize: '13px', fontWeight: 600, color: '#374151', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}>열기</button>
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes noteSlideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

      {/* 전역 쪽지관리 모달 */}
      <NoteModal
        isOpen={modalOpen}
        userId={userId}
        userName={userName}
        initialReceivers={modalReceivers}
        initialTab={modalTab}
        initialTitle={modalSubject}
        onClose={closeNotes}
        onChanged={() => refreshUnread(userId)}
      />
    </>
  );
};

export default NoteHost;
