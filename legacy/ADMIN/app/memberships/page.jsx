'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const EMPTY = { prodName: '', pcCnt: 0, mobCnt: 0, acctCnt: 0, periodMonths: 1, price: 0, descr: '', sortOrder: 0, useYn: 'Y' };

export default function MembershipsPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);

  const load = async () => {
    try { const d = await api.get('/api/admin/memberships?all=true'); setRows(d?.items || []); }
    catch (e) { console.error(e); setRows([]); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.prodName?.trim()) { alert('상품명을 입력하세요.'); return; }
    const body = {
      ProdName: form.prodName, PcCnt: Number(form.pcCnt) || 0, MobCnt: Number(form.mobCnt) || 0,
      AcctCnt: Number(form.acctCnt) || 0, PeriodMonths: Number(form.periodMonths) || 1,
      Price: Number(form.price) || 0, Descr: form.descr || '',
      SortOrder: Number(form.sortOrder) || 0, UseYn: form.useYn || 'Y',
    };
    try {
      if (form.prodId) await api.put(`/api/admin/memberships/${form.prodId}`, body);
      else await api.post('/api/admin/memberships', body);
      setForm(null); load();
    } catch (e) { console.error(e); alert('저장 실패'); }
  };
  const remove = async (id) => { if (!confirm('삭제(숨김)할까요?')) return; try { await api.del(`/api/admin/memberships/${id}`); load(); } catch (e) { alert('삭제 실패'); } };

  const F = (k, label, type = 'number') => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
      {label}
      <input type={type} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </label>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginTop: 0 }}>멤버십 상품관리</h1>
        <button className="btn primary" onClick={() => setForm({ ...EMPTY })}>＋ 새 상품</button>
      </div>
      <p style={{ fontSize: '13px', color: '#64748b' }}>* PC수·MOBILE수 = 각 기기 접속 가능 아이디 수 / 기기합계 = PC수 + MOBILE수(자동계산).</p>

      {form && (
        <div className="card" style={{ margin: '12px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {F('prodName', '상품명', 'text')}
            {F('pcCnt', 'PC수')}
            {F('mobCnt', 'MOBILE수')}
            {/* 기기합계 = PC수 + MOBILE수 (자동계산, 읽기전용) */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              기기합계
              <input type="number" value={(Number(form.pcCnt) || 0) + (Number(form.mobCnt) || 0)} readOnly
                style={{ background: '#f1f5f9', color: '#0f172a', fontWeight: 800 }} />
            </label>
            {F('periodMonths', '이용기간(개월)')}
            {F('price', '결제금액(원)')}
            {F('sortOrder', '정렬순서')}
            <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>사용여부
              <select value={form.useYn} onChange={(e) => setForm({ ...form, useYn: e.target.value })}><option value="Y">사용</option><option value="N">숨김</option></select>
            </label>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '10px' }}>설명
            <textarea value={form.descr} onChange={(e) => setForm({ ...form, descr: e.target.value })} rows={2} />
          </label>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button className="btn" onClick={() => setForm(null)}>취소</button>
            <button className="btn primary" onClick={save}>저장</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>ID</th><th>상품명</th><th>PC수</th><th>MOBILE수</th><th>기기합계</th><th>기간(개월)</th><th>결제금액</th><th>사용</th><th>관리</th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={9} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>상품이 없습니다.</td></tr>
              : rows.map((r) => (
                <tr key={r.prodId} style={{ opacity: r.useYn === 'N' ? 0.5 : 1 }}>
                  <td>{r.prodId}</td><td>{r.prodName}</td><td>{r.pcCnt}</td><td>{r.mobCnt}</td><td style={{ fontWeight: 800 }}>{(Number(r.pcCnt) || 0) + (Number(r.mobCnt) || 0)}</td><td>{r.periodMonths}</td><td>{Number(r.price).toLocaleString()}</td><td>{r.useYn}</td>
                  <td>
                    <button className="btn" style={{ padding: '3px 8px' }} onClick={() => setForm({ prodId: r.prodId, prodName: r.prodName, pcCnt: r.pcCnt, mobCnt: r.mobCnt, acctCnt: r.acctCnt, periodMonths: r.periodMonths, price: r.price, descr: r.descr || '', sortOrder: r.sortOrder, useYn: r.useYn })}>수정</button>{' '}
                    <button className="btn danger" style={{ padding: '3px 8px' }} onClick={() => remove(r.prodId)}>삭제</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
