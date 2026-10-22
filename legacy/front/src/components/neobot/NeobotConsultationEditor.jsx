import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { interviewService } from '../../services/interviewService';

// 글자색 옵션(물건등록폼 상담내용 카드와 동일)
const COLOR_OPTS = [
  { value: 'red', label: '빨강' },
  { value: 'blue', label: '파랑' },
  { value: 'green', label: '초록' },
  { value: 'orange', label: '주황' },
  { value: 'purple', label: '보라' },
];
const SPECIAL_CHARS = ['★', '●', '■', '▶', '✓', '※', '→'];
// HTML 태그 제거 후 실제 텍스트만 (빈 내용 검사용)
const stripHtml = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
// 날짜 표기: 물건등록폼 상담내용과 동일한 "YY.MM.DD.HH:mm" 형식
const formatDotDate = (raw) => {
  if (!raw) return '';
  const s = String(raw);
  const m = s.match(/(\d{4})\D*(\d{1,2})\D*(\d{1,2})\D*(\d{1,2})\D*(\d{2})/);
  if (m) { const [, Y, Mo, D, H, Mi] = m; return `${Y.slice(2)}.${Mo.padStart(2, '0')}.${D.padStart(2, '0')}.${H.padStart(2, '0')}:${Mi}`; }
  const m2 = s.match(/(\d{4})\D*(\d{1,2})\D*(\d{1,2})/);
  if (m2) { const [, Y, Mo, D] = m2; return `${Y.slice(2)}.${Mo.padStart(2, '0')}.${D.padStart(2, '0')}`; }
  return s;
};

/**
 * 네오봇 전용 상담이력 편집기 — 물건등록폼 상담이력처럼 행 단위(날짜시간 / 전화번호입력 / 내용) + 즉시 저장.
 *  props:
 *   kind: 'PT' | 'CUST', refId: ptNo | custNo, custName
 *   consultations: 이전 이력 [{ itvNo, datetime, userId, content, contactName, contactPhone }]
 *   contacts: 전화번호입력 후보 [{ name, phone }] (물건=소유자/임차인, 고객=구입자)
 *   user, defaultDatetime(ISO, 착신시각), highlight(테두리 반짝), onSaved()
 */
const stamp = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const NeobotConsultationEditor = ({
  kind, refId, custName = '', consultations = [], contacts = [], user,
  defaultDatetime = null, defaultPhone = '', defaultName = '', highlight = false, onSaved,
}) => {
  const blank = () => ({ datetime: stamp(defaultDatetime), content: '', contactName: defaultName || '', contactPhone: defaultPhone || '' });
  const [draft, setDraft] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const contentRef = useRef(null);          // 내용 입력(contentEditable) DOM
  const rangeRef = useRef(null);            // 마지막 선택 범위(특수문자/글자색 삽입용)

  // 현재 선택 범위 저장
  const saveRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && contentRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      rangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };
  // 저장된 범위 복원(없으면 끝으로)
  const restoreRange = () => {
    const el = contentRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    let r = rangeRef.current;
    if (!r || !el.contains(r.commonAncestorContainer)) {
      r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    }
    sel.removeAllRanges(); sel.addRange(r);
  };
  const syncContent = () => setDraft((d) => ({ ...d, content: contentRef.current?.innerHTML || '' }));

  // [날짜입력] 현재 시각으로 날짜 갱신
  const setDateNow = () => setDraft((d) => ({ ...d, datetime: stamp() }));
  // [특수문자] 커서 위치에 삽입
  const insertSpecialChar = (ch) => {
    if (!ch) return;
    restoreRange();
    document.execCommand('insertText', false, ch);
    saveRange(); syncContent();
  };
  // [글자색] 선택 영역에 색 적용
  const applyColor = (color) => {
    if (!color) return;
    restoreRange();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, color);
    saveRange(); syncContent();
  };
  // 저장 후/기본연락처 반영 시 내용 DOM 동기화
  const clearContentDom = () => { if (contentRef.current) contentRef.current.innerHTML = ''; };

  // 착신 등으로 기본 연락처/시각이 나중에 들어오면(마운트 후) 비어있는 입력칸에 반영
  useEffect(() => {
    if (!defaultPhone && !defaultName && !defaultDatetime) return;
    setDraft((d) => ({
      ...d,
      contactPhone: d.contactPhone || defaultPhone || '',
      contactName: d.contactName || defaultName || '',
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultPhone, defaultName, defaultDatetime]);

  const contactList = (contacts || []).filter((c) => c && (c.name || c.phone));

  const save = async () => {
    const contentHtml = (draft.content || '').trim();
    if (!stripHtml(contentHtml)) { toast.error('상담 내용을 입력하세요.'); return; }
    const content = contentHtml;
    // 전화번호 미입력 시 저장 불가 (연락처가 없으면 상담이력 저장 안 함)
    if (!(draft.contactPhone || '').trim()) { toast.error('전화번호를 입력해야 저장할 수 있습니다.'); return; }
    setSaving(true);
    try {
      const itvDate = /^\d{4}-\d{2}-\d{2}/.test(draft.datetime) ? draft.datetime.slice(0, 10) : stamp().slice(0, 10);
      await interviewService.createInterview({
        itvType: 'ITVTYP01',
        itvDate,
        custName: custName || '',
        // refId가 있으면 그 대상에 연결, 없으면(네오봇 단독) 전화번호 기준 단독 저장 → 백엔드에서 매칭 고객/물건에 동시 저장
        ...(refId ? (kind === 'CUST' ? { custNo: refId } : { ptNo: refId }) : {}),
        itvContent: content,
        contactName: draft.contactName || '',
        contactPhone: draft.contactPhone || '',
        rtNo: user?.rtNo ?? null,
        offNo: user?.offNo ?? null,
        userId: user?.userId,
      });
      toast.success('상담이 저장되었습니다.');
      setDraft(blank());
      clearContentDom();
      rangeRef.current = null;
      onSaved?.();
    } catch (e) {
      console.error('상담 저장 실패:', e);
      toast.error('상담 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 헤더 우측 버튼/드롭다운 공통 스타일 — 보라 톤, 폰트 12px, 높이 28px 통일
  const H_CTRL = 28; // 날짜입력/전화번호입력/특수문자/글자색/저장 공통 높이
  const hBtn = { fontSize: 12, fontWeight: 700, height: H_CTRL, boxSizing: 'border-box', padding: '0 10px', border: '1px solid #ddd6fe', borderRadius: 5, background: '#f3f0ff', color: '#6d28d9', cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
  const hSel = { fontSize: 12, fontWeight: 700, height: H_CTRL, boxSizing: 'border-box', padding: '0 6px', border: '1px solid #ddd6fe', borderRadius: 5, background: '#f3f0ff', color: '#6d28d9', cursor: 'pointer', outline: 'none' };

  // 연락처(전화번호) 표시 — 물건등록폼 contactSlot과 동일(초록 밑줄=있음 / 주황=전화번호입력)
  const contactSlot = () => {
    const has = !!(draft.contactName || draft.contactPhone);
    const text = has ? `${draft.contactName || ''} ${draft.contactPhone || ''}`.trim() : '전화번호입력';
    return (
      <span onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setPickOpen((v) => !v); }} title="연락처 선택"
        style={{ cursor: 'pointer', fontWeight: 700, color: has ? '#0f766e' : '#f59e0b', textDecoration: 'underline', textUnderlineOffset: '2px', whiteSpace: 'nowrap' }}>
        {text}
      </span>
    );
  };

  return (
    <div style={{
      border: highlight ? '2px solid #ef4444' : '1px solid #d1d5db',
      borderRadius: 8, overflow: 'hidden', background: '#fff',
      display: 'flex', flexDirection: 'column', minHeight: 330,
      animation: highlight ? 'neobotConsultBlink 1s ease-in-out infinite' : 'none',
    }}>
      {/* 헤더 — 한 줄: 상담내용 N건 + 우측 날짜입력·전화번호입력·특수문자·글자색·저장 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: '#f1f5f9', borderBottom: '1px solid #d1d5db' }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>상담내용</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>{consultations.length}건</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="button" onClick={setDateNow} style={hBtn}>날짜입력</button>
          <button type="button" onClick={() => setPickOpen((v) => !v)} style={{ ...hBtn, background: (draft.contactName || draft.contactPhone) ? '#ddd6fe' : '#f3f0ff' }}>전화번호입력</button>
          <select value="" onChange={(e) => { insertSpecialChar(e.target.value); e.target.value = ''; }} style={hSel}>
            <option value="">특수문자</option>
            {SPECIAL_CHARS.map((ch) => (<option key={ch} value={ch}>{ch}</option>))}
          </select>
          <select value="" onChange={(e) => { applyColor(e.target.value); e.target.value = ''; }} style={hSel}>
            <option value="">글자색</option>
            {COLOR_OPTS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
          </select>
          <button onClick={save} disabled={saving}
            style={{ fontSize: 14, fontWeight: 800, height: H_CTRL, boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: saving ? '#93c5fd' : '#2563eb', border: 'none', borderRadius: 5, cursor: saving ? 'default' : 'pointer', padding: '0 18px', whiteSpace: 'nowrap' }}>
            저장
          </button>
        </div>
      </div>

      {/* 신규 입력행 — 물건등록폼 상담내용과 동일: [날짜] [담당자] 연락처 : 내용 */}
      <div style={{ padding: '3px 4px', borderBottom: '1px solid #e5e7eb', background: '#fffdf5', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}>
          <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>[{formatDotDate(draft.datetime)}]</span>
          <span style={{ color: '#3b82f6', fontWeight: 600, whiteSpace: 'nowrap' }}>[{user?.userId || user?.userName || '담당자'}]</span>
          {contactSlot()}
          <span style={{ whiteSpace: 'nowrap' }}>:&nbsp;</span>
          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            data-ph="내용 입력..."
            className="neobot-consult-input"
            onInput={syncContent}
            onKeyUp={saveRange}
            onMouseUp={saveRange}
            onBlur={saveRange}
            style={{ flex: 1, minWidth: 0, outline: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: '19px' }}
          />
        </div>

        {pickOpen && (
          <div style={{ position: 'absolute', top: 28, left: 10, zIndex: 50, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 220, maxHeight: 240, overflowY: 'auto' }}>
            {contactList.length > 0 && contactList.map((c, i) => (
              <div key={i} onClick={() => { setDraft((d) => ({ ...d, contactName: c.name || '', contactPhone: c.phone || '' })); setPickOpen(false); }}
                style={{ padding: '7px 10px', fontSize: 14, fontWeight: 700, color: '#1f2937', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}>
                {c.name || '-'} <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{c.phone || ''}</span>
              </div>
            ))}
            {/* 직접 입력(성함/전화번호) */}
            <div style={{ display: 'flex', gap: 4, padding: '8px 10px', borderTop: contactList.length ? '1px solid #e5e7eb' : 'none' }}>
              <input value={draft.contactName} onChange={(e) => setDraft((d) => ({ ...d, contactName: e.target.value }))} placeholder="성함"
                style={{ width: 70, fontSize: 13, fontWeight: 600, padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: 4 }} />
              <input value={draft.contactPhone} onChange={(e) => setDraft((d) => ({ ...d, contactPhone: e.target.value }))} placeholder="전화번호"
                style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: 4 }} />
              <button type="button" onClick={() => setPickOpen(false)} style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: '#2563eb', border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}>확인</button>
            </div>
          </div>
        )}
      </div>

      {/* 이전 이력 — 물건등록폼 상담내용과 동일한 한 줄 형식 */}
      {consultations.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 10px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#475569' }}>이전 상담이력이 없습니다</div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, maxHeight: 240, overflowY: 'auto', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6, padding: '4px 10px' }}>
          {consultations.map((c, i) => (
            <div key={c.itvNo ?? i} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, padding: '1px 0' }}>
              <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>[{formatDotDate(c.datetime)}]</span>
              <span style={{ color: '#3b82f6', fontWeight: 600, whiteSpace: 'nowrap' }}>[{c.userId || '-'}]</span>
              {(c.contactName || c.contactPhone) && (
                <span style={{ color: '#0f766e', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '2px', whiteSpace: 'nowrap' }}>
                  {`${c.contactName || ''} ${c.contactPhone || ''}`.trim()}
                </span>
              )}
              <span style={{ whiteSpace: 'nowrap' }}>:&nbsp;</span>
              <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: c.content || '-' }} />
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes neobotConsultBlink { 0%,100%{ box-shadow:0 0 0 0 rgba(239,68,68,0); } 50%{ box-shadow:0 0 0 3px rgba(239,68,68,0.35); } }
        .neobot-consult-input:empty:before { content: attr(data-ph); color: #94a3b8; font-weight: 600; }
      `}</style>
    </div>
  );
};

export default NeobotConsultationEditor;
