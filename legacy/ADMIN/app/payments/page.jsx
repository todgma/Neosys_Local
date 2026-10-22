'use client';
// 결제내역(전사) — 토스 카드결제 승인/실패 이력
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const pick = (o, ...keys) => { for (const k of keys) { if (o && o[k] != null && o[k] !== '') return o[k]; } return ''; };
const won = (n) => (Number(n) || 0).toLocaleString();
const statusLabel = (s) => ({ DONE: '결제완료', CANCELED: '취소', PARTIAL_CANCELED: '부분취소', ABORTED: '승인실패', FAILED: '실패', EXPIRED: '만료' }[s] || s || '-');
const dt = (v) => String(v || '').replace('T', ' ').slice(0, 16);

export default function PaymentsPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const d = await api.get(`/api/payments?q=${encodeURIComponent(q)}`); setRows(d?.items || d?.Items || []); }
    catch (e) { console.error(e); setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const total = rows.filter((r) => (pick(r, 'Status', 'status')) === 'DONE').reduce((s, r) => s + (Number(pick(r, 'Amount', 'amount')) || 0), 0);

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginTop: 0 }}>
        결제내역 <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>(토스 카드결제 전사 내역)</span>
      </h1>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '12px 0' }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="사무소명 · 상품명 · 아이디 · 주문번호 검색" style={{ width: '320px' }} />
        <button className="btn primary" style={{ fontSize: '14px', fontWeight: 700 }} onClick={load}>검색</button>
        <span style={{ marginLeft: 'auto', fontSize: '14px', fontWeight: 700, color: '#334155' }}>
          결제완료 합계 <b style={{ fontSize: '16px', fontWeight: 800, color: '#4f46e5' }}>{won(total)}원</b>
        </span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>결제일시</th><th>사무소</th><th>상품</th><th>사용자</th><th>결제수단</th>
              <th style={{ textAlign: 'right' }}>금액</th><th>상태</th><th>주문번호</th><th>영수증</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>불러오는 중…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>결제내역이 없습니다.</td></tr>
            ) : rows.map((r, i) => {
              const st = pick(r, 'Status', 'status');
              const receipt = pick(r, 'ReceiptUrl', 'receiptUrl');
              return (
                <tr key={i}>
                  <td>{dt(pick(r, 'ApprovedAt', 'approvedAt') || pick(r, 'RegDt', 'regDt'))}</td>
                  <td>{pick(r, 'OffNm', 'offNm') || '-'}</td>
                  <td style={{ fontWeight: 700 }}>{pick(r, 'OrderName', 'orderName') || pick(r, 'ProdName', 'prodName') || '-'}</td>
                  <td>{pick(r, 'UserId', 'userId') || '-'}</td>
                  <td>{pick(r, 'Method', 'method') || '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{won(pick(r, 'Amount', 'amount'))}원</td>
                  <td style={{ fontWeight: 700, color: st === 'DONE' ? '#0f766e' : '#dc2626' }}>{statusLabel(st)}</td>
                  <td style={{ fontSize: '13px', color: '#475569' }}>{pick(r, 'OrderId', 'orderId')}</td>
                  <td>{receipt ? <a href={receipt} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', fontWeight: 700 }}>보기</a> : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
