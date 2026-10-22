import { Home, MessageCircle, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConsultMode } from '../../hooks/useConsultMode';

/**
 * 메뉴 우상단 공용 액션 — 고객센터 전화 · 카톡문의 · 홈으로 (영업시간 제외)
 *  · 전역 상단바(TopInfoBar) 내용을 각 메뉴 우상단 빈영역에 배치하기 위한 재사용 컴포넌트
 *  · consult=true 시 상담모드 토글 버튼 추가(물건/고객관리 등에서 사용)
 *  · showPhone=false 시 고객센터 전화번호 숨김
 */
const SUPPORT_PHONE = '02-381-2455';

export default function MenuTopActions({ consult = false, showPhone = true }) {
  const navigate = useNavigate();
  const [consultOn, toggleConsult] = useConsultMode();

  const openKakaoChat = () => {
    const url = 'http://pf.kakao.com/_wxjxcrX/chat';
    if (typeof window !== 'undefined' && window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
    else window.open(url, '_blank', 'noopener');
  };
  const goHome = () => {
    if (window.electronAPI?.focusMainWindow) { window.electronAPI.focusMainWindow(); return; }
    navigate('/dashboard');
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
      {showPhone && <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>고객센터 {SUPPORT_PHONE}</span>}
      <button type="button" onClick={openKakaoChat} title="카카오톡 채팅 상담" style={actBtn}>
        <MessageCircle style={{ width: '14px', height: '14px' }} /> 카톡문의
      </button>
      <button type="button" onClick={goHome} title="홈으로" style={actBtn}>
        <Home style={{ width: '14px', height: '14px' }} /> 홈으로
      </button>
      {consult && (
        <button type="button" onClick={toggleConsult} title="상담모드 토글"
          style={{ ...actBtn, ...(consultOn ? { background: '#4f46e5', borderColor: '#4f46e5', color: '#ffffff' } : {}) }}>
          <MessageSquare style={{ width: '14px', height: '14px' }} /> 상담모드 {consultOn ? 'ON' : 'OFF'}
        </button>
      )}
    </div>
  );
}

const actBtn = {
  display: 'inline-flex', alignItems: 'center', gap: '4px', height: '30px', padding: '0 10px',
  fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer',
  border: '1px solid #cbd5e1', borderRadius: '4px', background: '#ffffff', color: '#334155',
};
