'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { currentAdminId } from '../../lib/adminAuth';

const pick = (o, ...keys) => { for (const k of keys) { if (o && o[k] != null && o[k] !== '') return o[k]; } return ''; };

export default function ReferralPrefixPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ prefix: '', startDate: '', endDate: '', memo: '' });
  const [editId, setEditId] = useState(null);

  const [nextInfo, setNextInfo] = useState(null); // { next_number, prefix }
  const [jumpNum, setJumpNum] = useState('');

  const load = async () => {
    setLoading(true);
    try { const d = await api.get('/api/admin/referral-prefix'); setRows(d?.items || d?.Items || []); }
    catch (e) { console.error(e); setRows([]); }
    finally { setLoading(false); }
  };
  const loadNext = async () => {
    try { const d = await api.get('/api/admin/referral-prefix/next-number'); setNextInfo(d?.item || d?.Item || null); }
    catch (e) { console.error(e); setNextInfo(null); }
  };
  useEffect(() => { load(); loadNext(); /* eslint-disable-next-line */ }, []);

  const jump = async () => {
    const n = parseInt(String(jumpNum).replace(/[^0-9]/g, ''), 10);
    if (!n || n < 100001) { alert('점프할 번호는 100001 이상의 숫자여야 합니다.'); return; }
    if (!window.confirm(`다음 추천인 번호를 ${n}(으)로 점프할까요?\n(이후 가입자부터 이 번호로 발급됩니다)`)) return;
    try { const d = await api.post('/api/admin/referral-prefix/set-next', { NextNumber: n }); alert(`다음 추천인 번호가 ${d?.nextNumber ?? n}(으)로 설정되었습니다.`); setJumpNum(''); loadNext(); }
    catch { alert('번호 점프 실패'); }
  };

  const reset = () => { setForm({ prefix: '', startDate: '', endDate: '', memo: '' }); setEditId(null); };

  const save = async () => {
    if (!form.prefix.trim()) { alert('앞자리 코드를 입력하세요.'); return; }
    if (!form.startDate) { alert('시작일을 입력하세요.'); return; }
    const body = { Prefix: form.prefix.trim(), StartDate: form.startDate, EndDate: form.endDate || null, Memo: form.memo || null, UserId: currentAdminId() };
    try {
      if (editId) await api.put(`/api/admin/referral-prefix/${editId}`, body);
      else await api.post('/api/admin/referral-prefix', body);
      reset(); load();
    } catch { alert('저장 실패'); }
  };

  const startEdit = (r) => {
    setEditId(pick(r, 'id'));
    setForm({ prefix: pick(r, 'prefix'), startDate: pick(r, 'start_date'), endDate: pick(r, 'end_date'), memo: pick(r, 'memo') });
  };

  const remove = async (id) => {
    if (!window.confirm('이 기간 PREFIX를 삭제할까요?')) return;
    try { await api.del(`/api/admin/referral-prefix/${id}`); load(); } catch { alert('삭제 실패'); }
  };

  const apply = async (r) => {
    const id = pick(r, 'id');
    if (!window.confirm(`'${pick(r, 'prefix')}' PREFIX를 해당 기간 가입 대표중개사에게 소급 적용할까요?\n(추천인 코드가 재발급됩니다)`)) return;
    try { const d = await api.post(`/api/admin/referral-prefix/${id}/apply`, {}); alert(`${d?.applied ?? 0}건 소급 적용되었습니다.`); load(); }
    catch { alert('소급 적용 실패'); }
  };

  const reissueAll = async () => {
    if (!window.confirm('모든 대표중개사의 추천인 코드를 가입일 기준으로 전체 재발급할까요?\n(레거시 RF 코드도 기간 PREFIX 또는 기본 A로 정정됩니다)')) return;
    try { const d = await api.post('/api/admin/referral-prefix/reissue-all', {}); alert(`${d?.applied ?? 0}건 전체 재발급되었습니다.\n(각 사용자는 재로그인 시 반영)`); }
    catch { alert('전체 재발급 실패'); }
  };

  const th = { fontSize: '14px', fontWeight: 800, color: '#111827', padding: '9px 10px', borderBottom: '2px solid #cbd5e1', background: '#f1f5f9', textAlign: 'left', whiteSpace: 'nowrap' };
  const td = { fontSize: '14px', fontWeight: 600, color: '#111827', padding: '8px 10px', borderBottom: '1px solid #eef1f5' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginTop: 0 }}>추천인코드 관리 <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>(기간별 앞자리 코드)</span></h1>
        <button className="btn primary" onClick={reissueAll}>전체 재발급</button>
      </div>
      <p style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>추천인 코드 = <b>[가입일이 속한 기간의 앞자리 코드]</b> + 회원번호(6자리, DB 시퀀스 자동 증가). 기간 미설정 시 기본 <b>A</b>. 소급 적용으로 과거 가입자 코드도 재발급됩니다.</p>

      {/* 다음 발급 번호 미리보기 + 번호 점프 */}
      <div className="card" style={{ padding: '14px 16px', margin: '12px 0', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', background: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>다음 발급될 추천인 번호</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#4f46e5' }}>
            {nextInfo ? `${nextInfo.prefix || 'A'}${nextInfo.next_number ?? ''}` : '-'}
          </span>
          {nextInfo && <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>(번호 {nextInfo.next_number})</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
          <label style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>번호 점프</label>
          <input type="number" value={jumpNum} onChange={(e) => setJumpNum(e.target.value)} placeholder="예: 100100" style={{ width: '140px' }} />
          <button className="btn primary" onClick={jump}>점프</button>
        </div>
      </div>

      {/* 입력 폼 */}
      <div className="card" style={{ padding: '14px 16px', margin: '12px 0', display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label>앞자리 코드<input style={{ width: '120px', display: 'block' }} value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value })} placeholder="예: A, B, EV" /></label>
        <label>시작일<input type="date" style={{ display: 'block' }} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label>
        <label>종료일(선택)<input type="date" style={{ display: 'block' }} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label>
        <label style={{ flex: 1, minWidth: '160px' }}>메모<input style={{ width: '100%', display: 'block' }} value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} placeholder="메모(선택)" /></label>
        <button className="btn primary" onClick={save}>{editId ? '수정' : '추가'}</button>
        {editId && <button className="btn" onClick={reset}>취소</button>}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <td style={th}>앞자리 코드</td>
              <td style={th}>시작일</td>
              <td style={th}>종료일</td>
              <td style={th}>메모</td>
              <td style={{ ...th, width: '220px' }}>관리</td>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: '30px' }}>불러오는 중…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: '30px' }}>등록된 기간이 없습니다.</td></tr>
                : rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ ...td, fontWeight: 800, color: '#4f46e5' }}>{pick(r, 'prefix')}</td>
                    <td style={td}>{pick(r, 'start_date')}</td>
                    <td style={td}>{pick(r, 'end_date') || <span style={{ color: '#64748b' }}>무기한</span>}</td>
                    <td style={td}>{pick(r, 'memo') || '-'}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      <button className="btn" style={{ padding: '3px 10px' }} onClick={() => startEdit(r)}>수정</button>{' '}
                      <button className="btn primary" style={{ padding: '3px 10px' }} onClick={() => apply(r)}>소급적용</button>{' '}
                      <button className="btn danger" style={{ padding: '3px 10px' }} onClick={() => remove(pick(r, 'id'))}>삭제</button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
