'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';

const pick = (o, ...keys) => { for (const k of keys) { if (o && o[k] != null && o[k] !== '') return o[k]; } return ''; };
const COLORS = [['빨강', '#dc2626'], ['파랑', '#2563eb'], ['초록', '#16a34a'], ['주황', '#ea580c'], ['검정', '#111827']];
// content는 편집기(HTML). 이미지는 편집기에 붙여넣기/삽입으로 본문에 포함(별도 URL 필드 없음)
const EMPTY = { title: '', content: '', linkUrl: '', isPublic: 'Y', isPopup: 'N', showOnDashboard: 'Y', isParticipatory: 'N', popupW: 480, popupH: 600, startDate: '', endDate: '', sortOrder: 0 };
const STATUS_LABEL = { SUBMITTED: '제출(확인대기)', CONFIRMED: '확인완료', REJECTED: '반려' };

export default function EventsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [entriesPanel, setEntriesPanel] = useState(null); // 참여자 패널 { event, rows, loading }
  const edRef = useRef(null);
  // 폼 열릴 때 편집기 본문 주입
  useEffect(() => { if (form && edRef.current) edRef.current.innerHTML = form.content || ''; }, [form?.__k]);
  const exec = (cmd, val) => { edRef.current?.focus(); document.execCommand(cmd, false, val); };
  const onImgUrl = () => { const u = window.prompt('이미지 URL'); if (u) exec('insertImage', u); };
  const onImgFile = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => exec('insertImage', r.result); r.readAsDataURL(f); e.target.value = ''; };
  const tool = { padding: '4px 8px', fontSize: '13px', fontWeight: 700, border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', cursor: 'pointer' };

  const load = async () => {
    setLoading(true);
    try { const d = await api.get('/api/admin/events?rowsPerPage=200'); setRows(d?.events || d?.Events || (Array.isArray(d) ? d : [])); }
    catch (e) { console.error(e); setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const edit = (r) => setForm({
    __k: Date.now(),
    eventId: pick(r, 'EventId', 'eventId'),
    title: pick(r, 'Title', 'title'), content: pick(r, 'Content', 'content'),
    linkUrl: pick(r, 'LinkUrl', 'linkUrl'),
    isPublic: pick(r, 'IsPublic', 'isPublic') || 'Y', isPopup: pick(r, 'IsPopup', 'isPopup') || 'N',
    showOnDashboard: pick(r, 'ShowOnDashboard', 'showOnDashboard') || 'Y',
    isParticipatory: pick(r, 'IsParticipatory', 'isParticipatory') || 'N',
    popupW: pick(r, 'PopupW', 'popupW') || 480, popupH: pick(r, 'PopupH', 'popupH') || 600,
    startDate: String(pick(r, 'StartDate', 'startDate')).slice(0, 10), endDate: String(pick(r, 'EndDate', 'endDate')).slice(0, 10),
    sortOrder: pick(r, 'SortOrder', 'sortOrder') || 0,
  });

  const save = async () => {
    if (!form.title?.trim()) { alert('제목을 입력하세요.'); return; }
    setSaving(true);
    try {
      const content = edRef.current ? edRef.current.innerHTML : (form.content || '');
      const body = { ...form, content, popupW: Number(form.popupW) || null, popupH: Number(form.popupH) || null, sortOrder: Number(form.sortOrder) || 0,
        startDate: form.startDate || null, endDate: form.endDate || null, userId: 'admin' };
      if (form.eventId) await api.put(`/api/admin/events/${form.eventId}`, body);
      else await api.post('/api/admin/events', body);
      setForm(null); await load();
    } catch (e) { alert('저장 실패: ' + (e?.message || '')); }
    finally { setSaving(false); }
  };
  const remove = async (id) => { if (!window.confirm('이 이벤트를 삭제할까요?')) return; try { await api.del(`/api/admin/events/${id}`); await load(); } catch { alert('삭제 실패'); } };

  // 참여자 패널 — 특정 이벤트의 참여 제출 목록 + 확인/반려
  const openEntries = async (r) => {
    const eventId = pick(r, 'EventId', 'eventId');
    setEntriesPanel({ event: r, rows: [], loading: true });
    try {
      const d = await api.get(`/api/admin/events/${eventId}/entries`);
      setEntriesPanel({ event: r, rows: d?.items || d?.Items || [], loading: false });
    } catch (e) { console.error(e); setEntriesPanel({ event: r, rows: [], loading: false }); }
  };
  const reloadEntries = async () => { if (entriesPanel?.event) await openEntries(entriesPanel.event); };
  const confirmEntry = async (entryId, status) => {
    let memo = '';
    if (status === 'REJECTED') { memo = window.prompt('반려 사유(선택)', '') || ''; }
    try { await api.put(`/api/admin/event-entries/${entryId}/confirm`, { status, adminMemo: memo, userId: 'admin' }); await reloadEntries(); }
    catch (e) { alert('처리 실패'); }
  };
  // 참여 첨부파일 열기(이벤트참여 SYFDV08, ref_key=entryId)
  const openEntryFiles = async (entryId) => {
    try {
      const d = await api.get(`/api/files?fileDiv=SYFDV08&refKey=${encodeURIComponent(entryId)}`);
      const items = d?.items || d?.Items || [];
      if (items.length === 0) { alert('첨부파일이 없습니다.'); return; }
      for (const f of items) {
        let url = pick(f, 'url', 'Url');
        if (!url) { const u = await api.get(`/api/files/url?objectKey=${encodeURIComponent(pick(f, 'objectKey', 'ObjectKey'))}`); url = pick(u, 'url', 'Url') || (typeof u === 'string' ? u : ''); }
        if (url) window.open(url, '_blank', 'noopener');
      }
    } catch (e) { alert('첨부 열기 실패'); }
  };

  const th = { fontSize: '14px', fontWeight: 800, color: '#111827', padding: '9px 10px', borderBottom: '2px solid #cbd5e1', background: '#f1f5f9', textAlign: 'left', whiteSpace: 'nowrap' };
  const td = { fontSize: '14px', fontWeight: 600, color: '#111827', padding: '8px 10px', borderBottom: '1px solid #eef1f5' };
  const fld = { width: '100%', padding: '6px 10px', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' };
  const Lb = ({ children }) => <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>{children}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginTop: 0 }}>이벤트관리 <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>(대시보드 롤링·팝업 노출)</span></h1>
        <button className="btn primary" onClick={() => setForm({ ...EMPTY, __k: Date.now() })}>＋ 새 이벤트</button>
      </div>

      {form && (
        <div className="card" style={{ margin: '12px 0', padding: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px' }}>
            <div style={{ gridColumn: '1 / -1' }}><Lb>제목 *</Lb><input style={fld} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Lb>내용 (이미지는 복사·붙여넣기 또는 아래 버튼으로 본문에 삽입)</Lb>
              {/* 편집기 툴바 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '5px', padding: '6px', background: '#fafafa' }}>
                <button type="button" onClick={() => exec('bold')} style={{ ...tool, fontWeight: 800 }}>B</button>
                <button type="button" onClick={() => exec('underline')} style={{ ...tool, textDecoration: 'underline' }}>U</button>
                <button type="button" onClick={() => exec('italic')} style={{ ...tool, fontStyle: 'italic' }}>I</button>
                <span style={{ width: '1px', height: '18px', background: '#e5e7eb', margin: '0 2px' }} />
                {COLORS.map(([n, c]) => <button key={c} type="button" title={n} onClick={() => exec('foreColor', c)} style={{ ...tool, color: c, width: '28px' }}>가</button>)}
                <span style={{ width: '1px', height: '18px', background: '#e5e7eb', margin: '0 2px' }} />
                <button type="button" onClick={() => exec('fontSize', '5')} style={tool}>크게</button>
                <button type="button" onClick={() => exec('fontSize', '3')} style={tool}>보통</button>
                <button type="button" onClick={() => exec('fontSize', '1')} style={tool}>작게</button>
                <span style={{ width: '1px', height: '18px', background: '#e5e7eb', margin: '0 2px' }} />
                <button type="button" onClick={onImgUrl} style={tool}>이미지 URL</button>
                <label style={tool}>이미지 파일<input type="file" accept="image/*" onChange={onImgFile} style={{ display: 'none' }} /></label>
              </div>
              <div ref={edRef} contentEditable suppressContentEditableWarning
                style={{ minHeight: '220px', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '10px 12px', fontSize: '14px', lineHeight: 1.7, outline: 'none', overflowY: 'auto', background: 'white', marginTop: '6px' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}><Lb>링크 URL (선택 · 클릭 시 이동)</Lb><input style={fld} value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} /></div>
            <div><Lb>공개</Lb><select style={fld} value={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.value })}><option value="Y">공개</option><option value="N">비공개</option></select></div>
            <div><Lb>팝업</Lb><select style={fld} value={form.isPopup} onChange={(e) => setForm({ ...form, isPopup: e.target.value })}><option value="N">팝업 안함</option><option value="Y">팝업 노출</option></select></div>
            <div><Lb>대시보드 표기</Lb><select style={fld} value={form.showOnDashboard} onChange={(e) => setForm({ ...form, showOnDashboard: e.target.value })}><option value="Y">표기함</option><option value="N">숨김</option></select></div>
            <div><Lb>참여형</Lb><select style={fld} value={form.isParticipatory} onChange={(e) => setForm({ ...form, isParticipatory: e.target.value })}><option value="N">일반(참여없음)</option><option value="Y">참여형(파일제출)</option></select></div>
            <div><Lb>시작일</Lb><input type="date" style={fld} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div><Lb>종료일</Lb><input type="date" style={fld} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            <div><Lb>팝업 너비</Lb><input style={fld} value={form.popupW} onChange={(e) => setForm({ ...form, popupW: e.target.value })} /></div>
            <div><Lb>팝업 높이</Lb><input style={fld} value={form.popupH} onChange={(e) => setForm({ ...form, popupH: e.target.value })} /></div>
            <div><Lb>정렬</Lb><input style={fld} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button className="btn" onClick={() => setForm(null)}>취소</button>
            <button className="btn primary" onClick={save} disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'auto', marginTop: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={{ ...th, width: '60px' }}>번호</th><th style={th}>제목</th><th style={{ ...th, width: '80px' }}>공개</th><th style={{ ...th, width: '80px' }}>팝업</th><th style={{ ...th, width: '80px' }}>참여형</th><th style={{ ...th, width: '150px' }}>기간</th><th style={{ ...th, width: '190px' }}>관리</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: '30px' }}>불러오는 중…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: '30px' }}>등록된 이벤트가 없습니다.</td></tr>
                : rows.map((r) => {
                  const id = pick(r, 'EventId', 'eventId');
                  const isPart = (pick(r, 'IsParticipatory', 'isParticipatory') || 'N') === 'Y';
                  const sd = String(pick(r, 'StartDate', 'startDate')).slice(0, 10); const ed = String(pick(r, 'EndDate', 'endDate')).slice(0, 10);
                  return (
                    <tr key={id}>
                      <td style={td}>{id}</td>
                      <td style={td}>{pick(r, 'Title', 'title')}</td>
                      <td style={td}>{(pick(r, 'IsPublic', 'isPublic') || 'Y') === 'Y' ? '공개' : '비공개'}</td>
                      <td style={td}>{(pick(r, 'IsPopup', 'isPopup') || 'N') === 'Y' ? '팝업' : '-'}</td>
                      <td style={td}>{isPart ? <span style={{ fontWeight: 800, color: '#7c3aed' }}>참여형</span> : '-'}</td>
                      <td style={td}>{sd || ed ? `${sd || ''}~${ed || ''}` : '상시'}</td>
                      <td style={td}>
                        {isPart && <button onClick={() => openEntries(r)} style={{ fontSize: '13px', fontWeight: 700, color: '#7c3aed', background: 'white', border: '1px solid #ddd6fe', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer', marginRight: '4px' }}>참여자</button>}
                        <button onClick={() => edit(r)} style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5', background: 'white', border: '1px solid #c7d2fe', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer', marginRight: '4px' }}>수정</button>
                        <button onClick={() => remove(id)} style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', background: 'white', border: '1px solid #fca5a5', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer' }}>삭제</button>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* 참여자(참여형) 슬라이드 패널 */}
      {entriesPanel && (
        <>
          <div onClick={() => setEntriesPanel(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 900 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '960px', maxWidth: '98vw', background: 'white', boxShadow: '-8px 0 24px rgba(0,0,0,0.18)', zIndex: 901, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>참여자 <span style={{ fontSize: '14px', color: '#7c3aed' }}>{pick(entriesPanel.event, 'Title', 'title')}</span></span>
              <button className="btn" style={{ padding: '2px 10px' }} onClick={() => setEntriesPanel(null)}>닫기</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              {entriesPanel.loading ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px', fontSize: '14px', fontWeight: 600 }}>불러오는 중…</div>
              ) : entriesPanel.rows.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px', fontSize: '14px', fontWeight: 600 }}>참여자가 없습니다.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['참여일시', '참여자', '아이디', '사무소명', '전화번호', '참여횟수', '내용', '첨부', '상태', '처리'].map((h) => (
                        <th key={h} style={{ fontSize: '14px', fontWeight: 800, padding: '8px', borderBottom: '2px solid #cbd5e1', textAlign: 'left', background: '#f1f5f9', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entriesPanel.rows.map((e) => {
                      const entryId = pick(e, 'EntryId', 'entryId');
                      const st = pick(e, 'Status', 'status') || 'SUBMITTED';
                      const fileCnt = Number(pick(e, 'FileCnt', 'fileCnt')) || 0;
                      const memo = pick(e, 'AdminMemo', 'adminMemo');
                      return (
                        <tr key={entryId}>
                          <td style={{ fontSize: '13px', fontWeight: 600, padding: '8px', borderBottom: '1px solid #eef1f5', whiteSpace: 'nowrap' }}>{String(pick(e, 'RegDt', 'regDt')).replace('T', ' ').slice(0, 16)}</td>
                          <td style={{ fontSize: '14px', fontWeight: 700, padding: '8px', borderBottom: '1px solid #eef1f5', whiteSpace: 'nowrap' }}>{pick(e, 'UserNm', 'userNm') || pick(e, 'UserId', 'userId') || '-'}</td>
                          <td style={{ fontSize: '13px', fontWeight: 600, padding: '8px', borderBottom: '1px solid #eef1f5', whiteSpace: 'nowrap' }}>{pick(e, 'UserId', 'userId') || '-'}</td>
                          <td style={{ fontSize: '13px', fontWeight: 600, padding: '8px', borderBottom: '1px solid #eef1f5', whiteSpace: 'nowrap' }}>{pick(e, 'OffNm', 'offNm') || '-'}</td>
                          <td style={{ fontSize: '13px', fontWeight: 600, padding: '8px', borderBottom: '1px solid #eef1f5', whiteSpace: 'nowrap' }}>{pick(e, 'Phone', 'phone') || '-'}</td>
                          <td style={{ fontSize: '14px', fontWeight: 800, padding: '8px', borderBottom: '1px solid #eef1f5', whiteSpace: 'nowrap', textAlign: 'center', color: '#7c3aed' }}>{pick(e, 'SeqNo', 'seqNo') || 1}회</td>
                          <td style={{ fontSize: '13px', fontWeight: 600, padding: '8px', borderBottom: '1px solid #eef1f5', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pick(e, 'Content', 'content')}>{pick(e, 'Content', 'content') || '-'}</td>
                          <td style={{ fontSize: '13px', padding: '8px', borderBottom: '1px solid #eef1f5', whiteSpace: 'nowrap' }}>
                            {fileCnt > 0 ? <button onClick={() => openEntryFiles(entryId)} style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5', background: 'white', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '2px 8px', cursor: 'pointer' }}>보기({fileCnt})</button> : '-'}
                          </td>
                          <td style={{ fontSize: '13px', fontWeight: 700, padding: '8px', borderBottom: '1px solid #eef1f5', whiteSpace: 'nowrap', color: st === 'CONFIRMED' ? '#0f766e' : st === 'REJECTED' ? '#dc2626' : '#b45309' }} title={memo || ''}>
                            {STATUS_LABEL[st] || st}
                          </td>
                          <td style={{ fontSize: '13px', padding: '8px', borderBottom: '1px solid #eef1f5', whiteSpace: 'nowrap' }}>
                            <button onClick={() => confirmEntry(entryId, 'CONFIRMED')} style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e', background: 'white', border: '1px solid #99f6e4', borderRadius: '5px', padding: '2px 8px', cursor: 'pointer', marginRight: '4px' }}>확인</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
