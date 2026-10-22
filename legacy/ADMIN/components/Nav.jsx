'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// 관리자 메뉴
const MENUS = [
  { href: '/members', label: '사용자관리' },          // 대표/소속 직원 계정 전부
  { href: '/offices', label: '중개사무소관리' },       // 대표 사무소 단위
  { href: '/memberships', label: '상품관리' },         // 멤버십 상품(결제/기간/PC·MOBILE·소속 생성 수)
  { href: '/payments', label: '결제내역' },            // 토스 카드결제 내역(전사)
  { href: '/vendors', label: '협력업체관리' },          // 전역 협력업체(모든 사용자 노출·최상단)
  {
    label: '시스템관리',
    children: [
      { href: '/danji', label: '단지정보관리' },
      { href: '/codes', label: '공통코드관리' },
      { href: '/contract-templates', label: '계약서서식관리' },
      { href: '/referral-prefix', label: '추천인코드관리' },
      { href: '/admins', label: '관리자관리', superOnly: true }, // 슈퍼관리자 전용
    ],
  },
  { href: '/events', label: '이벤트관리' },
  {
    label: '커뮤니티관리',
    children: [
      { href: '/notices', label: '공지사항' },
      { href: '/community/job-offer', label: '구인게시판' },
      { href: '/community/job-seek', label: '구직게시판' },
      { href: '/community/office', label: '사무소 양도' },
    ],
  },
  { href: '/support', label: '고객센터' },
  { href: '/bulk-requests', label: '일괄변경요청' },
];

export default function Nav({ admin = null, onLogout, collapsed = false, onToggle = () => {} }) {
  const path = usePathname();
  const isSuper = admin?.role === 'SUPER';

  // 접힌 상태: 얇은 바 + 펼치기 버튼만
  if (collapsed) {
    return (
      <aside style={{ width: '46px', flexShrink: 0, background: '#1e293b', color: '#e2e8f0', padding: '14px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button onClick={onToggle} title="메뉴 펼치기" aria-label="메뉴 펼치기"
          style={{ width: '34px', height: '34px', border: 'none', borderRadius: '6px', background: '#334155', color: '#fff', fontSize: '16px', fontWeight: 800, cursor: 'pointer' }}>»</button>
      </aside>
    );
  }
  const itemStyle = (on, indent) => ({
    display: 'block', padding: indent ? '8px 12px 8px 24px' : '10px 12px', borderRadius: '6px',
    fontSize: '14px', fontWeight: on ? 800 : 600, background: on ? '#4f46e5' : 'transparent',
    color: on ? '#fff' : '#cbd5e1', whiteSpace: 'nowrap',
  });
  const visible = (c) => !c.superOnly || isSuper;
  const seen = new Set();
  return (
    <aside style={{ width: '220px', flexShrink: 0, background: '#1e293b', color: '#e2e8f0', padding: '18px 12px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 6px 16px' }}>
        <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff', paddingLeft: '4px' }}>네오시스 관리자</span>
        <button onClick={onToggle} title="메뉴 접기" aria-label="메뉴 접기"
          style={{ width: '28px', height: '28px', border: 'none', borderRadius: '6px', background: '#334155', color: '#fff', fontSize: '15px', fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>«</button>
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflow: 'auto' }}>
        {MENUS.map((m, i) => {
          if (m.children) {
            const kids = m.children.filter(visible);
            if (kids.length === 0) return null;
            return (
              <div key={m.label} style={{ marginTop: '6px' }}>
                <div style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>{m.label}</div>
                {kids.map((c) => {
                  const on = path === c.href || path.startsWith(c.href);
                  return <Link key={c.href} href={c.href} style={itemStyle(on, true)}>{c.label}</Link>;
                })}
              </div>
            );
          }
          if (seen.has(m.href)) return null; // 중복 href 방지
          seen.add(m.href);
          const on = path === m.href || path.startsWith(m.href);
          return <Link key={m.href} href={m.href} style={itemStyle(on, false)}>{m.label}</Link>;
        })}
      </nav>

      {/* 로그인 계정 + 로그아웃 */}
      {admin && (
        <div style={{ borderTop: '1px solid #334155', paddingTop: '12px', marginTop: '8px' }}>
          <div style={{ padding: '0 10px 8px', fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>
            {admin.name || admin.adminId}
            <span style={{ marginLeft: '6px', fontSize: '13px', fontWeight: 800, color: isSuper ? '#fbbf24' : '#93c5fd' }}>
              {isSuper ? '슈퍼관리자' : '일반관리자'}
            </span>
          </div>
          <button onClick={onLogout}
            style={{ width: '100%', fontSize: '14px', fontWeight: 700, color: '#fca5a5', background: 'transparent', border: '1px solid #475569', borderRadius: '6px', padding: '8px', cursor: 'pointer' }}>
            로그아웃
          </button>
        </div>
      )}
    </aside>
  );
}
