import { useEffect, useRef, useState } from 'react';

/**
 * 공통 주소검색 모달 (Daum 우편번호 서비스)
 *  props:
 *   - open: 표시 여부(기본 true)
 *   - onClose(): 닫기
 *   - onComplete(data): 선택 완료. data = {
 *       roadAddress, jibunAddress, zonecode, bcode, buildingName,
 *       autoJibunAddress, buildingCode, bname2
 *     }
 *  사용:
 *   {showAddr && <DaumAddressModal onClose={() => setShowAddr(false)} onComplete={(d) => setAddr(d.roadAddress || d.jibunAddress)} />}
 */
export default function DaumAddressModal({ open = true, onClose, onComplete }) {
  const layerRef = useRef(null);
  const [scriptReady, setScriptReady] = useState(!!(typeof window !== 'undefined' && window.daum?.Postcode));

  // Daum 우편번호 스크립트 로드(이미 로드되어 있으면 재사용)
  useEffect(() => {
    if (window.daum?.Postcode) { setScriptReady(true); return; }
    const SRC = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    let script = document.querySelector(`script[src="${SRC}"]`);
    if (script) {
      if (window.daum?.Postcode) setScriptReady(true);
      else script.addEventListener('load', () => setScriptReady(true));
      return;
    }
    script = document.createElement('script');
    script.src = SRC;
    script.async = true;
    script.onload = () => setScriptReady(true);
    document.body.appendChild(script);
    // 공용 스크립트라 언마운트 시 제거하지 않음(다른 화면 재사용)
  }, []);

  // 스크립트 준비되면 검색 위젯 임베드
  useEffect(() => {
    if (!open || !scriptReady || !layerRef.current || !window.daum?.Postcode) return;
    layerRef.current.innerHTML = '';
    new window.daum.Postcode({
      oncomplete: (data) => {
        onComplete?.({
          roadAddress: data.roadAddress,
          jibunAddress: data.jibunAddress,
          zonecode: data.zonecode,
          bcode: data.bcode,
          buildingName: data.buildingName || '',
          autoJibunAddress: data.autoJibunAddress,
          buildingCode: data.buildingCode,
          bname2: data.bname2,
        });
        onClose?.();
      },
      width: '100%',
      height: '100%',
    }).embed(layerRef.current);
    layerRef.current.style.display = 'block';
  }, [open, scriptReady]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.45)', padding: '20px' }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: '480px', maxWidth: '96vw', background: 'white', borderRadius: '10px', boxShadow: '0 12px 40px rgba(0,0,0,0.3)', overflow: 'hidden', position: 'relative' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>주소 검색</span>
          <button type="button" onClick={onClose} title="닫기"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#334155', fontSize: '20px', fontWeight: 800, lineHeight: 1 }}>×</button>
        </div>
        {/* 검색 위젯 삽입 위치 — 임베드 대상은 명시적 높이 필요(0이면 안 보임) */}
        {!scriptReady && <div style={{ padding: '30px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#334155' }}>주소 검색을 불러오는 중…</div>}
        <div ref={layerRef} style={{ width: '100%', height: '500px' }} />
      </div>
    </div>
  );
}
