import React, { useEffect, useState, useRef, useCallback } from 'react';

/**
 * 전화 수신 전역 호스트 (MainLayout / DetachedTabPage에 1회 마운트)
 *  - Electron main이 KT 브리지 착신 이벤트를 'phone:incomingCall'로 push
 *  - 쪽지 수신 팝업과 동일한 우하단 토스트로 발신번호 표시
 *  - 쪽지 팝업(bottom:16px) 위쪽(bottom:140px)에 쌓아 겹치지 않게 함
 */
const formatPhone = (raw) => {
  const d = String(raw || '').replace(/[^0-9]/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return d.startsWith('02') ? `02-${d.slice(2, 6)}-${d.slice(6)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 9 && d.startsWith('02')) return `02-${d.slice(2, 5)}-${d.slice(5)}`;
  return raw || '(번호 미상)';
};

const PhoneCallHost = () => {
  const [popups, setPopups] = useState([]); // [{key, caller, callerInfo, result}]
  const seqRef = useRef(0);

  const dismiss = useCallback((key) => setPopups((prev) => prev.filter((p) => p.key !== key)), []);

  useEffect(() => {
    if (!window.electronAPI?.phone?.onIncomingCall) return;
    const off = window.electronAPI.phone.onIncomingCall((data) => {
      // 참고 서비스는 호처리중(result "201")에 팝업. result 없으면 그냥 표시.
      if (data?.result && data.result !== '201') return;
      const key = ++seqRef.current;
      setPopups((prev) => [...prev, {
        key,
        caller: data?.caller || '',
        callerInfo: data?.callerInfo || '',
        result: data?.result || '',
      }].slice(-4));
      // 20초 후 자동 사라짐 (통화 링 시간 고려)
      setTimeout(() => dismiss(key), 20000);
    });
    return () => { try { off && off(); } catch (_) { /* skip */ } };
  }, [dismiss]);

  if (!popups.length) return null;

  return (
    <>
      <div style={{ position: 'fixed', right: '16px', bottom: '140px', zIndex: 2001, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
        {popups.map((p) => (
          <div key={p.key}
            style={{ pointerEvents: 'auto', width: '320px', background: 'white', border: '2px solid #2196F3', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', overflow: 'hidden', animation: 'callSlideIn 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#e3f2fd', borderBottom: '1px solid #bbdefb' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1565c0' }}>📞 전화 수신</span>
              <button onClick={() => dismiss(p.key)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280', fontSize: '15px', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '12px' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#1976d2', letterSpacing: '0.5px' }}>{formatPhone(p.caller)}</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                {p.callerInfo ? p.callerInfo : '최근 상담이력이 없습니다.'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', padding: '0 12px 12px', justifyContent: 'flex-end' }}>
              <button onClick={() => dismiss(p.key)}
                style={{ padding: '6px 16px', fontSize: '13px', fontWeight: 600, color: 'white', background: '#2196F3', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>확인</button>
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes callSlideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </>
  );
};

export default PhoneCallHost;
