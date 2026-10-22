import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/apiEndpoints';
import { UserPlus, X } from 'lucide-react';

// 내 추천인 목록 — 내가 추천한 사람(상호/대표님/가입일/결제일)
//  · page=true: 새 창(전체) / page=false: 인페이지 오버레이 모달
//  · rtNo 주면 열 때 API로 최신 조회(로그인 응답과 분리). 없으면 referredUsers prop 사용(폴백)
const fmtDate = (s) => {
  if (!s) return '-';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
};
const payOf = (u) => u.paymentDate || u.payDt || u.firstPaymentDate || u.paymentDt;

export default function ReferralListModal({ page = false, referredUsers = [], rtNo = null, onClose }) {
  const [fetched, setFetched] = useState(null); // null=미조회(=prop 사용), 배열=API 결과
  useEffect(() => {
    if (rtNo == null) return;
    let alive = true;
    (async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/realestaters/referrals`, { params: { rtNo } });
        const d = res?.data?.data ?? res?.data ?? {};
        if (alive) setFetched(Array.isArray(d.referredUsers) ? d.referredUsers : []);
      } catch { if (alive) setFetched([]); }
    })();
    return () => { alive = false; };
  }, [rtNo]);
  const list = fetched != null ? fetched : (Array.isArray(referredUsers) ? referredUsers : []);

  const overlayStyle = page
    ? { position: 'relative', width: '100%', height: '100%', background: 'white', display: 'flex', flexDirection: 'column' }
    : { position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' };
  const cardStyle = page
    ? { width: '100%', height: '100%', background: 'white', display: 'flex', flexDirection: 'column' }
    : { width: '620px', maxWidth: '96vw', maxHeight: '86vh', background: 'white', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' };

  const th = { padding: '9px 10px', fontSize: '15px', fontWeight: 800, color: '#111827', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left', whiteSpace: 'nowrap' };
  const td = (c = '#111827', w = 600) => ({ padding: '10px', fontSize: '14px', fontWeight: w, color: c, borderBottom: '1px solid #eef2f7', whiteSpace: 'nowrap' });

  return (
    <div onClick={page ? undefined : onClose} style={overlayStyle}>
      <div onClick={page ? undefined : (e) => e.stopPropagation()} style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus className="w-5 h-5" style={{ color: '#16a34a' }} />
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>내 추천인 목록</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#4f46e5' }}>{list.length}명</span>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#334155', display: 'inline-flex' }}><X className="w-6 h-6" /></button>
        </div>
        <div style={{ flex: 1, minHeight: 0, padding: '12px 16px', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>상호</th>
                <th style={th}>대표님</th>
                <th style={th}>가입일</th>
                <th style={th}>결제일</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '32px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
                    아직 추천한 사용자가 없습니다. 내 추천인 코드를 공유해 보세요.
                  </td>
                </tr>
              ) : list.map((u, i) => {
                const payDt = payOf(u);
                return (
                  <tr key={u.rbId ?? i}>
                    <td style={td('#111827', 700)}>{u.offNm || '-'}</td>
                    <td style={td('#374151', 600)}>{u.rtNm || '-'}</td>
                    <td style={td('#64748b', 600)}>{fmtDate(u.regDt)}</td>
                    <td style={td('#64748b', 600)}>{payDt ? fmtDate(payDt) : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
