'use client';
import { useEffect, useState } from 'react';
import Nav from './Nav';
import { api } from '../lib/api';
import { useAdminStore } from '../stores/adminStore';

// 관리자 웹 로그인 게이트 + 레이아웃 셸 (전역 스토어 사용)
export default function Shell({ children }) {
  const admin = useAdminStore((s) => s.admin);
  const setAdmin = useAdminStore((s) => s.setAdmin);
  const logout = useAdminStore((s) => s.logout);

  const [ready, setReady] = useState(false);
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false); // 좌측 메뉴 접기

  // 하이드레이션 완료 후에만 렌더(persist 복원)
  useEffect(() => {
    setReady(true);
    try { setNavCollapsed(localStorage.getItem('adminNavCollapsed') === '1'); } catch { /* noop */ }
  }, []);
  const toggleNav = () => setNavCollapsed((v) => { const n = !v; try { localStorage.setItem('adminNavCollapsed', n ? '1' : '0'); } catch { /* noop */ } return n; });

  const login = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const d = await api.post('/api/admin/accounts/login', { AdminId: id.trim(), Pw: pw });
      if (d?.adminId) { setAdmin(d); setPw(''); }
      else setErr(d?.error?.message || d?.message || '로그인에 실패했습니다.');
    } catch (e2) { setErr(e2?.message || '로그인에 실패했습니다.'); }
    finally { setBusy(false); }
  };

  if (!ready) return null;

  if (!admin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <form onSubmit={login} style={{ width: '340px', background: 'white', borderRadius: '12px', padding: '28px 26px', boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>네오시스 관리자</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '18px' }}>관리자 계정으로 로그인하세요.</div>
          <input value={id} onChange={(e) => setId(e.target.value)} placeholder="아이디" autoFocus
            style={{ width: '100%', boxSizing: 'border-box', fontSize: '14px', fontWeight: 600, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '8px', outline: 'none' }} />
          <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" placeholder="비밀번호"
            style={{ width: '100%', boxSizing: 'border-box', fontSize: '14px', fontWeight: 600, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '12px', outline: 'none' }} />
          {err && <div style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', marginBottom: '10px' }}>{err}</div>}
          <button type="submit" disabled={busy}
            style={{ width: '100%', fontSize: '14px', fontWeight: 800, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '8px', padding: '11px', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? '로그인 중…' : '로그인'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Nav admin={admin} onLogout={logout} collapsed={navCollapsed} onToggle={toggleNav} />
      <main style={{ flex: 1, padding: '24px', minWidth: 0 }}>{children}</main>
    </div>
  );
}
