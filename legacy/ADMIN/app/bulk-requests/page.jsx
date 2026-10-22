'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { currentAdminId } from '../../lib/adminAuth';

const pick = (o, ...keys) => { for (const k of keys) { if (o && o[k] != null && o[k] !== '') return o[k]; } return ''; };
const fmtDt = (v) => String(v || '').replace('T', ' ').slice(0, 16);

export default function BulkRequestsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // 일괄변경요청 전용 테이블(rt_bulk_request) 조회 — 고객센터와 분리
      const d = await api.get('/api/bulk-requests');
      setRows(d?.items || d?.Items || (Array.isArray(d) ? d : []));
    } catch (e) { console.error(e); setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const openDetail = (r) => { setDetail(r); setAnswer(pick(r, 'answer', 'Answer') || ''); };
  const isDone = (r) => (pick(r, 'status', 'Status') === '처리완료');

  const complete = async () => {
    if (!detail) return;
    if (!answer.trim() && !window.confirm('코멘트 없이 처리완료로 변경할까요?')) return;
    setSaving(true);
    try {
      const reqId = pick(detail, 'reqId', 'ReqId');
      await api.put(`/api/bulk-requests/${reqId}/complete`, { Answer: answer, AnswerId: currentAdminId() || 'admin' });
      setDetail(null);
      await load();
    } catch (e) { console.error(e); alert('처리완료 저장에 실패했습니다.'); }
    finally { setSaving(false); }
  };

  const th = { fontSize: '14px', fontWeight: 800, color: '#111827', padding: '9px 10px', borderBottom: '2px solid #cbd5e1', background: '#f1f5f9', textAlign: 'left', whiteSpace: 'nowrap' };
  const td = { fontSize: '14px', fontWeight: 600, color: '#111827', padding: '8px 10px', borderBottom: '1px solid #eef1f5', verticalAlign: 'top' };
  const lbl = { fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '3px' };
  const box = { fontSize: '14px', fontWeight: 600, color: '#111827', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px 10px', background: '#fbfcfe' };

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginTop: 0 }}>일괄변경요청 <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>(물건관리 → 일괄변경 요청)</span></h1>
      <div style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
        <button className="btn primary" style={{ fontSize: '14px', fontWeight: 600 }} onClick={load}>새로고침</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: '150px' }}>접수일시</th>
              <th style={{ ...th, width: '110px' }}>변경항목</th>
              <th style={th}>제목</th>
              <th style={{ ...th, width: '150px' }}>사무소/요청자</th>
              <th style={{ ...th, width: '100px' }}>상태</th>
              <th style={{ ...th, width: '80px' }}>처리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: '30px' }}>불러오는 중…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: '30px' }}>접수된 일괄변경요청이 없습니다.</td></tr>
                : rows.map((r, i) => (
                  <tr key={i}>
                    <td style={td}>{fmtDt(pick(r, 'regDt', 'RegDt'))}</td>
                    <td style={{ ...td, fontWeight: 800, color: '#4f46e5' }}>{pick(r, 'category', 'Category')}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pick(r, 'title', 'Title')}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pick(r, 'officeName', 'OfficeName') || '-'} / {pick(r, 'agentName', 'AgentName') || pick(r, 'userId', 'UserId')}</td>
                    <td style={td}>
                      {isDone(r)
                        ? <span style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a', background: '#dcfce7', borderRadius: '999px', padding: '2px 10px' }}>처리완료</span>
                        : <span style={{ fontSize: '13px', fontWeight: 800, color: '#b45309', background: '#fef3c7', borderRadius: '999px', padding: '2px 10px' }}>접수</span>}
                    </td>
                    <td style={td}><button onClick={() => openDetail(r)} style={{ fontSize: '14px', fontWeight: 700, color: '#4f46e5', background: 'white', border: '1px solid #c7d2fe', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }}>{isDone(r) ? '보기' : '처리'}</button></td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setDetail(null)}>
          <div style={{ width: '600px', maxWidth: '94%', maxHeight: '88vh', background: 'white', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>{pick(detail, 'category', 'Category')} 변경요청</span>
              <button onClick={() => setDetail(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 800 }}>✕</button>
            </div>
            <div style={{ padding: '16px', overflow: 'auto' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', marginBottom: '10px' }}>{pick(detail, 'title', 'Title')}</div>

              <div style={{ marginBottom: '10px' }}>
                <div style={lbl}>요청 내용</div>
                <div style={{ ...box, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.7, minHeight: '60px' }}>{pick(detail, 'content', 'Content')}</div>
              </div>

              {/* 사무소 정보 */}
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', background: '#f8fafc', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>사무소 정보</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  <div>사무소명: {pick(detail, 'officeName', 'OfficeName') || '-'}</div>
                  <div>전화: {pick(detail, 'officeTel', 'OfficeTel') || '-'}</div>
                  <div style={{ gridColumn: '1 / span 2' }}>주소: {pick(detail, 'officeAddr', 'OfficeAddr') || '-'}</div>
                  <div>성함/직급: {pick(detail, 'agentName', 'AgentName') || '-'} / {pick(detail, 'agentGrade', 'AgentGrade') || '-'}</div>
                  <div>휴대폰: {pick(detail, 'agentPhone', 'AgentPhone') || '-'}</div>
                </div>
              </div>

              <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '12px' }}>
                접수 {fmtDt(pick(detail, 'regDt', 'RegDt'))} · 요청자 {pick(detail, 'agentName', 'AgentName') || pick(detail, 'userId', 'UserId')}
              </div>

              {/* 처리완료 코멘트 */}
              <div style={lbl}>처리 코멘트</div>
              {isDone(detail) ? (
                <>
                  <div style={{ ...box, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.7, minHeight: '50px' }}>{pick(detail, 'answer', 'Answer') || '(코멘트 없음)'}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a', marginTop: '6px' }}>처리완료 {fmtDt(pick(detail, 'answerDt', 'AnswerDt'))} · {pick(detail, 'answerId', 'AnswerId') || 'admin'}</div>
                </>
              ) : (
                <>
                  <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4}
                    placeholder="처리 결과/코멘트를 입력하세요…"
                    style={{ width: '100%', boxSizing: 'border-box', fontSize: '14px', fontWeight: 600, color: '#111827', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', resize: 'vertical', outline: 'none' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                    <button onClick={() => setDetail(null)} style={{ fontSize: '14px', fontWeight: 600, color: '#334155', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer' }}>취소</button>
                    <button onClick={complete} disabled={saving} style={{ fontSize: '14px', fontWeight: 800, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '6px', padding: '8px 18px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? '처리 중…' : '처리완료'}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
