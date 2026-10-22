import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageSquare, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/apiEndpoints';
import systemService from '../../services/systemService';
import { useConsultMode } from '../../hooks/useConsultMode';

// 상단 정보바(네이티브 메뉴바 대체) — 좌측: 공지/이벤트 롤링, 가운데: 고객센터·영업시간
//  · 네이티브 메뉴바 높이에 맞춤(24px). 전역(모든 창)에서 렌더.
const BAR_HEIGHT = 24;               // 네이티브 메뉴바와 동일 높이(필요시 조정)
const SUPPORT_PHONE = '02-381-2455';
const BUSINESS_HOURS = '평일·토요일 10:00~17:30'; // 영업시간(필요시 수정)

export default function TopInfoBar() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [consultOn, toggleConsult] = useConsultMode();
  const [items, setItems] = useState([]); // { label: '공지'|'이벤트', title }
  const [idx, setIdx] = useState(0);

  // 현재 화면 경로 판별 — 분리창(DetachedTabPage: #/tab?route=/xxx)이면 route 쿼리 기준
  const routeParam = new URLSearchParams(search || '').get('route') || '';
  const eff = routeParam || pathname || '';
  // 대시보드·네오봇 + 4개 메뉴(물건관리·고객관리·계약관리·공동중개)에서는 상단바 숨김(각 메뉴 우상단 MenuTopActions로 대체)
  const hideBar = eff === '/dashboard' || eff.endsWith('/dashboard') || eff.includes('neobot')
    || /(properties|customers|contracts|transaction-network)/.test(eff);
  // 상담모드 토글은 물건관리(properties)·고객관리(customers)에서만 노출
  const showConsult = /(properties|customers)/.test(eff);

  // 공지 + 이벤트 로드(모든 창). 실패는 조용히 무시
  useEffect(() => {
    let alive = true;
    (async () => {
      const list = [];
      try {
        const r = await systemService.getNotices(null, 1, 5);
        const notices = r?.data?.notices || [];
        notices
          .filter((n) => (n.showOnDashboard ?? n.ShowOnDashboard ?? 'Y') !== 'N')
          .forEach((n) => list.push({ label: '공지', tab: '공지사항', title: n.title, id: n.noticeId ?? n.NoticeId }));
      } catch { /* noop */ }
      try {
        const ev = await axios.get(`${API_BASE_URL}/api/admin/events`, { params: { isPublic: 'Y', showDashboard: 'Y', rowsPerPage: 20 } });
        const evList = ev?.data?.data?.events || ev?.data?.data?.Events || [];
        evList.forEach((e) => list.push({ label: '이벤트', tab: '이벤트', title: e.title ?? e.Title, id: e.eventId ?? e.EventId }));
      } catch { /* noop */ }
      if (alive) setItems(list);
    })();
    return () => { alive = false; };
  }, []);

  // 롤링(4초 간격)
  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % items.length), 4000);
    return () => clearInterval(t);
  }, [items.length]);

  // 롤링 항목 클릭 → 커뮤니티 창에서 해당 게시글 바로 열기(공지/이벤트)
  const openPost = (item) => {
    if (!item) return;
    if (window.electronAPI?.modal?.open) {
      window.electronAPI.modal.open({
        type: 'community',
        data: { title: '커뮤니티', initialTab: item.tab, initialPostId: item.id ?? null },
        width: 900, height: 700, minWidth: 720, minHeight: 560, resizable: true,
      }).catch((e) => console.error('커뮤니티 창 열기 실패:', e));
    }
  };

  // 카톡문의: 카카오톡 채널 채팅을 외부 브라우저로 열기
  const openKakaoChat = () => {
    const url = 'http://pf.kakao.com/_wxjxcrX/chat';
    if (typeof window !== 'undefined' && window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
    else window.open(url, '_blank', 'noopener');
  };

  // 홈으로: 이미 열려있는 메인 창(대시보드)을 맨 앞으로. Electron이면 메인 창 포커스+대시보드 이동, 웹이면 라우팅
  const goHome = () => {
    if (window.electronAPI?.focusMainWindow) { window.electronAPI.focusMainWindow(); return; }
    navigate('/dashboard');
  };

  const cur = items[idx];

  if (hideBar) return null;

  return (
    <div style={{
      height: `${BAR_HEIGHT}px`, minHeight: `${BAR_HEIGHT}px`, flexShrink: 0,
      display: 'flex', alignItems: 'center', background: '#f3f4f6',
      borderBottom: '1px solid #e5e7eb', overflow: 'hidden', userSelect: 'none',
    }}>
      {/* 좌측: 공지/이벤트 롤링 — 일단 숨김(레이아웃 균형용 빈 영역 유지) */}
      <div style={{ flex: 1, minWidth: 0 }} />

      {/* 우측: 고객센터·영업시간 + 카톡문의 / 홈으로 / 상담모드 (모두 우측 정렬) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', padding: '0 10px' }}>
        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>고객센터 {SUPPORT_PHONE}</span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>{BUSINESS_HOURS}</span>
        <button type="button" onClick={openKakaoChat} title="카카오톡 채팅 상담" style={barBtn(false)}>
          <MessageCircle style={{ width: '14px', height: '14px' }} /> 카톡문의
        </button>
        <button type="button" onClick={goHome} style={barBtn(false)} title="홈으로">
          <Home style={{ width: '14px', height: '14px' }} /> 홈으로
        </button>
        {showConsult && (
          <button type="button" onClick={toggleConsult} style={barBtn(consultOn)} title="상담모드 토글">
            <MessageSquare style={{ width: '14px', height: '14px' }} /> 상담모드 {consultOn ? 'ON' : 'OFF'}
          </button>
        )}
      </div>

      <style>{'@keyframes tib-roll{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}'}</style>
    </div>
  );
}

// 상단바 버튼 스타일(높이 24px에 맞춤). active=상담모드 ON 강조
const barBtn = (active) => ({
  display: 'inline-flex', alignItems: 'center', gap: '4px', height: '18px', padding: '0 8px',
  fontSize: '14px', fontWeight: 600, lineHeight: '18px', whiteSpace: 'nowrap', cursor: 'pointer',
  border: `1px solid ${active ? '#4f46e5' : '#cbd5e1'}`, borderRadius: '4px',
  background: active ? '#4f46e5' : '#ffffff', color: active ? '#ffffff' : '#334155',
});
