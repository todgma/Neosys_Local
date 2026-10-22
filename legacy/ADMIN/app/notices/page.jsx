'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';

const pick = (o, ...keys) => { for (const k of keys) { if (o && o[k] != null) return o[k]; } return ''; };
const truthy = (v) => v === 'Y' || v === true || v === 'true' || v === 1;
const dOnly = (v) => (v ? String(v).slice(0, 10) : '');
const COLORS = [['빨강', '#dc2626'], ['파랑', '#2563eb'], ['초록', '#16a34a'], ['주황', '#ea580c'], ['검정', '#111827']];
const EMPTY = { title: '', content: '', isTop: false, isPublic: true, isPopup: false, popupW: 460, popupH: 620, startDate: '', endDate: '' };

export default function NoticesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(null);
  const edRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.get('/api/admin/notices?pageNumber=1&rowsPerPage=200');
      setRows(d?.notices || d?.Notices || d?.items || []);
    } catch (e) { console.error(e); setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // 폼 열릴 때 편집기 내용 주입
  useEffect(() => { if (form && edRef.current) edRef.current.innerHTML = form.content || ''; }, [form?.__k]);

  const exec = (cmd, val) => { edRef.current?.focus(); document.execCommand(cmd, false, val); };
  const onImgUrl = () => { const u = window.prompt('이미지 URL'); if (u) exec('insertImage', u); };
  const onImgFile = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => exec('insertImage', r.result); r.readAsDataURL(f); e.target.value = ''; };

  const openNew = () => setForm({ ...EMPTY, __k: Date.now() });
  const openEdit = (r) => setForm({
    __k: Date.now(),
    noticeId: pick(r, 'NoticeId', 'noticeId'),
    title: pick(r, 'Title', 'title'),
    content: pick(r, 'Content', 'content'),
    isTop: truthy(pick(r, 'IsTop', 'isTop')),
    isPublic: truthy(pick(r, 'IsPublic', 'isPublic')) || pick(r, 'IsPublic', 'isPublic') === '',
    isPopup: truthy(pick(r, 'IsPopup', 'isPopup')),
    popupW: pick(r, 'PopupW', 'popupW') || 460,
    popupH: pick(r, 'PopupH', 'popupH') || 620,
    startDate: dOnly(pick(r, 'StartDate', 'startDate')),
    endDate: dOnly(pick(r, 'EndDate', 'endDate')),
  });

  const save = async () => {
    if (!form.title?.trim()) { alert('제목을 입력하세요.'); return; }
    const content = edRef.current ? edRef.current.innerHTML : (form.content || '');
    const body = {
      Title: form.title, Content: content, Category: 'GENERAL',
      IsTop: form.isTop ? 'Y' : 'N', IsPublic: form.isPublic ? 'Y' : 'N', IsPopup: form.isPopup ? 'Y' : 'N',
      PopupW: form.isPopup ? (Number(form.popupW) || 460) : null,
      PopupH: form.isPopup ? (Number(form.popupH) || 620) : null,
      StartDate: form.startDate || null, EndDate: form.endDate || null,
    };
    try {
      if (form.noticeId) await api.put(`/api/admin/notices/${form.noticeId}`, body);
      else await api.post('/api/admin/notices', body);
      setForm(null); load();
    } catch (e) { console.error(e); alert('저장 실패'); }
  };
  const remove = async (id) => { if (!confirm('삭제할까요?')) return; try { await api.del(`/api/admin/notices/${id}`); load(); } catch (e) { alert('삭제 실패'); } };

  const chk = (k, label) => (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600 }}>
      <input type="checkbox" checked={!!form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} /> {label}
    </label>
  );
  const tool = { padding: '4px 8px', fontSize: '13px', fontWeight: 700, border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', cursor: 'pointer' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginTop: 0 }}>공지사항</h1>
        <button className="btn primary" onClick={openNew}>＋ 새 공지</button>
      </div>

      {form && (
        <div className="card" style={{ margin: '12px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="제목" style={{ fontSize: '15px', fontWeight: 700 }} />

          {/* 팝업/게시 설정 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', padding: '8px 10px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
            {chk('isPublic', '공개')}
            {chk('isTop', '상단고정')}
            {chk('isPopup', '팝업표시')}
            {form.isPopup && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600 }}>
                팝업크기
                <input type="number" value={form.popupW} onChange={(e) => setForm({ ...form, popupW: e.target.value })} style={{ width: '70px' }} /> ×
                <input type="number" value={form.popupH} onChange={(e) => setForm({ ...form, popupH: e.target.value })} style={{ width: '70px' }} /> px
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600 }}>
              게시기간
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /> ~
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </span>
          </div>

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
            <label style={{ ...tool }}>이미지 파일<input type="file" accept="image/*" onChange={onImgFile} style={{ display: 'none' }} /></label>
          </div>
          <div ref={edRef} contentEditable suppressContentEditableWarning
            style={{ minHeight: '260px', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '10px 12px', fontSize: '14px', lineHeight: 1.7, outline: 'none', overflowY: 'auto', background: 'white' }} />

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setForm(null)}>취소</button>
            <button className="btn primary" onClick={save}>저장</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th style={{ width: '70px' }}>번호</th><th>제목</th><th style={{ width: '60px' }}>팝업</th><th style={{ width: '180px' }}>게시기간</th><th style={{ width: '110px' }}>작성일</th><th style={{ width: '120px' }}>관리</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>불러오는 중…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>공지사항이 없습니다.</td></tr>
                : rows.map((r, i) => {
                  const id = pick(r, 'NoticeId', 'noticeId');
                  const s = dOnly(pick(r, 'StartDate', 'startDate')); const e = dOnly(pick(r, 'EndDate', 'endDate'));
                  return (
                    <tr key={i}>
                      <td>{id}</td>
                      <td style={{ textAlign: 'left' }}>{pick(r, 'Title', 'title')}</td>
                      <td>{truthy(pick(r, 'IsPopup', 'isPopup')) ? '✔' : ''}</td>
                      <td>{(s || e) ? `${s || '~'} ~ ${e || '~'}` : '-'}</td>
                      <td>{dOnly(pick(r, 'RegDt', 'regDt'))}</td>
                      <td>
                        <button className="btn" style={{ padding: '3px 8px' }} onClick={() => openEdit(r)}>수정</button>{' '}
                        <button className="btn danger" style={{ padding: '3px 8px' }} onClick={() => remove(id)}>삭제</button>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '13px', color: '#64748b' }}>* 팝업표시 + 게시기간(시작~종료) 설정 시, 메인 프로그램 로그인 후 팝업으로 노출됩니다(오늘/다시 보지않음, 종료일 자동정리 포함).</p>
    </div>
  );
}
