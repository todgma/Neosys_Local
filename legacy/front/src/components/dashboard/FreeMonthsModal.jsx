import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/apiEndpoints';

// 무료개월 내역 — 가입이벤트/소개이벤트 등으로 받은 무료개월수·무료일수
//  · page=true: 새 창(전체) / page=false: 인페이지 오버레이 모달
const calc = (h) => {
  const unit = h.Unit ?? h.unit;
  const qty = Number(h.Qty ?? h.qty) || 0;
  let days = Number(h.AddDays ?? h.addDays) || 0;
  if (!days) days = unit === 'MONTH' ? qty * 30 : unit === 'WEEK' ? qty * 7 : qty;
  const months = Math.round((days / 30) * 10) / 10;
  return { days, months };
};
const kindName = (h) => {
  const kind = h.Kind ?? h.kind;
  const label = kind === 'EVENT' ? '이벤트' : kind === 'REWARD' ? '소개이벤트' : kind === 'SUBSCRIBE' ? '가입이벤트' : (kind || '-');
  return h.Title ?? h.title ?? label;
};

export default function FreeMonthsModal({ page = false, offNo, onClose }) {
  const [rows, setRows] = useState(null); // null=로딩중

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!offNo) { setRows([]); return; }
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/memberships/office/${offNo}/history`);
        const body = res.data; const d = body?.data ?? body;
        if (alive) setRows(d?.items || []);
      } catch { if (alive) setRows([]); }
    })();
    return () => { alive = false; };
  }, [offNo]);

  const list = rows || [];
  const totalDays = list.reduce((s, h) => s + calc(h).days, 0);
  const totalMonths = Math.round((totalDays / 30) * 10) / 10;
  // 전체 합산 요약 — ~개월 ~일 표기
  const sumMonths = Math.floor(totalDays / 30);
  const sumRemDays = totalDays % 30;

  const th = (a = 'left') => ({ padding: '9px 8px', fontSize: '14px', fontWeight: 800, color: '#111827', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: a, whiteSpace: 'nowrap' });
  const td = (a = 'left', c = '#111827', w = 600) => ({ padding: '9px 8px', fontSize: '14px', fontWeight: w, color: c, borderBottom: '1px solid #eef2f7', textAlign: a, whiteSpace: a === 'center' ? 'nowrap' : undefined });

  const overlayStyle = page
    ? { position: 'relative', width: '100%', height: '100%', background: 'white', display: 'flex', flexDirection: 'column' }
    : { position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' };
  const cardStyle = page
    ? { width: '100%', height: '100%', background: 'white', display: 'flex', flexDirection: 'column' }
    : { width: '640px', maxWidth: '96vw', maxHeight: '86vh', background: 'white', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' };

  return (
    <div onClick={page ? undefined : onClose} style={overlayStyle}>
      <div onClick={page ? undefined : (e) => e.stopPropagation()} style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '13px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap' }}>무료개월 내역</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            {list.length > 0 && (
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                지금까지 받은 무료혜택은 <b style={{ fontSize: '15px', fontWeight: 800, color: '#059669' }}>{sumMonths}개월 {sumRemDays}일</b> 입니다
              </span>
            )}
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#334155', display: 'inline-flex', flexShrink: 0 }}><X className="w-6 h-6" /></button>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, padding: '10px 14px', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th('left')}>일자</th>
                <th style={th('left')}>내용</th>
                <th style={th('center')}>무료개월수</th>
                <th style={th('center')}>무료일수</th>
              </tr>
            </thead>
            <tbody>
              {rows === null ? (
                <tr><td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '14px', fontWeight: 600 }}>불러오는 중…</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '14px', fontWeight: 600 }}>무료개월 내역이 없습니다.</td></tr>
              ) : list.map((h, i) => {
                const { days, months } = calc(h);
                return (
                  <tr key={i}>
                    <td style={td('left', '#374151')}>{String(h.RegDt ?? h.regDt ?? '').slice(0, 10)}</td>
                    <td style={td('left', '#111827', 700)}>{kindName(h)}</td>
                    <td style={td('center', '#059669', 800)}>{months}개월</td>
                    <td style={td('center', '#334155', 700)}>{days}일</td>
                  </tr>
                );
              })}
            </tbody>
            {list.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ padding: '9px 8px', fontSize: '14px', fontWeight: 800, color: '#111827', borderTop: '2px solid #cbd5e1', textAlign: 'right' }}>합계</td>
                  <td style={{ padding: '9px 8px', fontSize: '14px', fontWeight: 800, color: '#059669', borderTop: '2px solid #cbd5e1', textAlign: 'center', whiteSpace: 'nowrap' }}>{totalMonths}개월</td>
                  <td style={{ padding: '9px 8px', fontSize: '14px', fontWeight: 800, color: '#334155', borderTop: '2px solid #cbd5e1', textAlign: 'center', whiteSpace: 'nowrap' }}>{totalDays}일</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
