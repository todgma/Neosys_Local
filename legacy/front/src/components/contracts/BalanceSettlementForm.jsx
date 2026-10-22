import React, { useMemo, useState } from 'react';
import { buildBalanceSettlementHtml, calcBalanceTotal, openFormWindow } from '../../constants/receiptForms';

/**
 * 잔금 정산서 — 매매/임대차/전세 탭. 적요 기본세팅 편집 + 행추가/삭제 → 미리보기·인쇄(A4)
 *  - 계약서작성 "영수증 등 > 잔금정산서"에서 호출. 다른 서류와 동일하게 편집/미리보기/인쇄.
 *  - 잔금 정산액 = Σ(가감 '-' 이면 -금액, 그 외 +금액) 자동계산.
 */
const R = (item, sign = '', note = '') => ({ item, sign, amount: '', note });

// 탭별 제목/당사자/기본 적요
const TAB_DEFS = [
  {
    key: '매매계약', title: '매매계약 잔금 정산서', p1: '매도인', p2: '매수인',
    rows: [
      R('대금 총액'), R('계약금', '-', '가계약금 포함'), R('중도금 총액', '-'), R('대출금 총액', '-'),
      R('임대보증금 상계액', '-'), R('대출금 상환액', '+'), R('선수관리비', '+'), R('대출이자 미납액', '-'),
      R(''), R(''),
    ],
  },
  {
    key: '임대차계약', title: '임대차계약 잔금 정산서', p1: '임대인', p2: '임차인',
    rows: [
      R('대금 총액'), R('계약금', '-', '가계약금 포함'), R('중도금 총액', '-'), R('대출금 총액', '-'),
      R('임대보증금 승계', '-'), R('대출금 상환액', '+'), R('선수관리비', '+'), R('대출이자 미납액', '-'),
      R(''), R(''),
    ],
  },
  {
    key: '전세계약', title: '전세 계약 대금(잔금) 정산서', p1: '임대인', p2: '임차인',
    rows: [
      R('대금 총액'), R('계약금', '-', '가계약금 포함'), R('중도금 총액', '-'), R('대출금 총액', '-'),
      R('임대보증금 승계', '-'), R('대출금 상환액', '+'), R('선수관리비', '+'), R('대출이자 미납액', '-'),
      R(''), R(''),
    ],
  },
];
const TABS = TAB_DEFS.map((t) => t.key);
const defOf = (key) => TAB_DEFS.find((t) => t.key === key);

const won = (v) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isNaN(n) ? 0 : n; };
const fmt = (v) => { const n = won(v); return n ? n.toLocaleString('ko-KR') : ''; };
const clone = (o) => JSON.parse(JSON.stringify(o));

export default function BalanceSettlementForm({ title = '잔금 정산서', onClose, defaults = {}, page = false, initial = null, onSave = null }) {
  const [tab, setTab] = useState((initial && initial.tab) || '매매계약');
  const [shared, setShared] = useState(
    initial && initial.shared
      ? initial.shared
      : {
          address: defaults.address || '',
          officeName: defaults.officeName || '',
          officePhone: defaults.officePhone || '',
          issueY: '', issueM: '', issueD: '',
        }
  );
  const [tabs, setTabs] = useState(() => {
    const empty = TAB_DEFS.reduce((acc, t) => {
      acc[t.key] = { rows: clone(t.rows), etcText: '', p1Name: '', p2Name: '' };
      return acc;
    }, {});
    return initial && initial.tabs ? { ...empty, ...initial.tabs } : empty;
  });

  const cur = tabs[tab];
  const def = defOf(tab);
  const total = useMemo(() => calcBalanceTotal(cur.rows), [cur.rows]);

  const setShr = (k) => (e) => setShared((p) => ({ ...p, [k]: e.target.value }));
  const patchTab = (patch) => setTabs((p) => ({ ...p, [tab]: { ...p[tab], ...patch } }));
  const setRow = (i, k, v) => patchTab({ rows: cur.rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)) });
  const addRow = () => patchTab({ rows: [...cur.rows, R('', '-')] });
  const delRow = (i) => patchTab({ rows: cur.rows.filter((_, j) => j !== i) });
  const resetTab = () => { if (window.confirm(`[${tab}] 적요를 기본값으로 되돌릴까요?`)) patchTab({ rows: clone(def.rows) }); };

  const issueText = `${shared.issueY || '_____'}년 ${shared.issueM || '__'}월 ${shared.issueD || '__'}일`;

  const openPreview = () => {
    const html = buildBalanceSettlementHtml({
      title: def.title, address: shared.address, rows: cur.rows, etcText: cur.etcText,
      p1Label: def.p1, p1Name: cur.p1Name, p2Label: def.p2, p2Name: cur.p2Name,
      officeName: shared.officeName, officePhone: shared.officePhone, issueText,
    });
    if (!openFormWindow(html, def.title)) alert('팝업이 차단되었습니다. 팝업을 허용해 주세요.');
  };

  // 스타일
  const th = { border: '1px solid #334155', background: '#f1f5f9', padding: '6px', fontSize: '13px', fontWeight: 700, textAlign: 'center', color: '#111827', whiteSpace: 'nowrap' };
  const td = { border: '1px solid #334155', padding: '3px 6px', fontSize: '13px', verticalAlign: 'middle' };
  const inp = { border: 'none', outline: 'none', fontSize: '13px', fontWeight: 600, padding: '4px', background: 'transparent', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', color: '#111827' };
  const inpR = { ...inp, textAlign: 'right' };
  const lead = { fontSize: '15px', fontWeight: 800, color: '#111827', margin: '10px 0 5px' };
  const tabBtn = (on) => ({ padding: '8px 16px', fontSize: '15px', fontWeight: on ? 800 : 600, border: '1px solid #e5e7eb', borderBottom: on ? '2px solid #4f46e5' : '1px solid #e5e7eb', background: on ? '#eef2ff' : 'white', color: on ? '#4f46e5' : '#374151', borderRadius: '6px 6px 0 0', cursor: 'pointer', whiteSpace: 'nowrap' });
  const smallInput = { boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 10px', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', outline: 'none', color: '#111827' };
  const addBtn = { padding: '6px 14px', fontSize: '14px', fontWeight: 700, border: '1px solid #6366f1', borderRadius: '5px', background: 'white', color: '#4f46e5', cursor: 'pointer', whiteSpace: 'nowrap' };
  const delBtn = { border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: '15px' };

  const rootStyle = page
    ? { width: '100%', flex: 1, minHeight: 0, background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
    : { width: '920px', maxWidth: '96vw', background: 'white', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', overflow: 'hidden' };
  const card = (
    <div onClick={(e) => e.stopPropagation()} style={rootStyle}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
        <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>{title}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={openPreview} style={{ padding: '7px 16px', fontSize: '14px', fontWeight: 700, color: '#fff', background: '#4f46e5', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>미리보기 · 인쇄</button>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#111827' }}>×</button>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: '4px', padding: '10px 18px 0', background: '#fafafa', borderBottom: '1px solid #e5e7eb' }}>
        {TABS.map((t) => <button key={t} type="button" onClick={() => setTab(t)} style={tabBtn(t === tab)}>{t}</button>)}
      </div>

      <div style={{ padding: '14px 20px', maxHeight: page ? 'none' : '78vh', flex: page ? 1 : undefined, minHeight: page ? 0 : undefined, overflowY: 'auto' }}>
        {/* 물건 소재지 */}
        <div style={lead}>[물건 소재지]</div>
        <input value={shared.address} onChange={setShr('address')} placeholder="물건 소재지" style={{ ...smallInput, width: '100%', border: '1px solid #334155', fontSize: '14px', fontWeight: 700 }} />

        {/* 정산 내역 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...lead }}>
          <span>[정산 내역]</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={resetTab} style={{ ...addBtn, borderColor: '#cbd5e1', color: '#111827' }}>기본값 복원</button>
            <button type="button" onClick={addRow} style={addBtn}>＋ 행 추가</button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          <tr>
            <td style={{ ...th, width: '32%' }}>적요</td>
            <td style={{ ...th, width: '90px' }}>가감</td>
            <td style={{ ...th, width: '26%' }}>금액(원)</td>
            <td style={th}>비고</td>
            <td style={{ ...th, width: '36px' }}></td>
          </tr>
          {cur.rows.map((r, i) => (
            <tr key={i}>
              <td style={td}><input value={r.item} onChange={(e) => setRow(i, 'item', e.target.value)} placeholder="적요" style={inp} /></td>
              <td style={{ ...td, textAlign: 'center' }}>
                <select value={r.sign} onChange={(e) => setRow(i, 'sign', e.target.value)} style={{ ...inp, textAlign: 'center', cursor: 'pointer' }}>
                  <option value=""> </option>
                  <option value="+">＋</option>
                  <option value="-">－</option>
                </select>
              </td>
              <td style={td}><input value={fmt(r.amount)} onChange={(e) => setRow(i, 'amount', e.target.value)} style={inpR} /></td>
              <td style={td}><input value={r.note} onChange={(e) => setRow(i, 'note', e.target.value)} placeholder="비고" style={inp} /></td>
              <td style={{ ...td, textAlign: 'center' }}><button type="button" onClick={() => delRow(i)} title="삭제" style={delBtn}>✕</button></td>
            </tr>
          ))}
          <tr>
            <td style={{ ...td, textAlign: 'center', fontWeight: 800, background: '#f8fafc' }}>잔금 정산액</td>
            <td style={{ ...td, background: '#f8fafc' }}></td>
            <td style={{ ...td, textAlign: 'right', fontWeight: 800, fontSize: '14px', color: '#1d4ed8', background: '#f8fafc' }}>₩{total.toLocaleString('ko-KR')}</td>
            <td style={{ ...td, background: '#f8fafc' }} colSpan={2}></td>
          </tr>
        </tbody></table>

        {/* 기타 사항 */}
        <div style={{ ...lead, marginTop: '14px' }}>[기타 사항]</div>
        <textarea value={cur.etcText} onChange={(e) => patchTab({ etcText: e.target.value })} rows={4} placeholder="기타사항" style={{ ...smallInput, width: '100%', border: '1px solid #334155', resize: 'vertical', lineHeight: 1.6 }} />

        {/* 발행일 / 당사자 / 사무소 */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>발행일 :</span>
          <input value={shared.issueY} onChange={setShr('issueY')} placeholder="____" style={{ ...smallInput, width: '80px', textAlign: 'center' }} /><span style={{ fontWeight: 700 }}>년</span>
          <input value={shared.issueM} onChange={setShr('issueM')} placeholder="__" style={{ ...smallInput, width: '56px', textAlign: 'center' }} /><span style={{ fontWeight: 700 }}>월</span>
          <input value={shared.issueD} onChange={setShr('issueD')} placeholder="__" style={{ ...smallInput, width: '56px', textAlign: 'center' }} /><span style={{ fontWeight: 700 }}>일</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>{def.p1} :</span>
            <input value={cur.p1Name} onChange={(e) => patchTab({ p1Name: e.target.value })} placeholder="성명" style={{ ...smallInput, width: '180px' }} /><span style={{ fontWeight: 700 }}>(인)</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>{def.p2} :</span>
            <input value={cur.p2Name} onChange={(e) => patchTab({ p2Name: e.target.value })} placeholder="성명" style={{ ...smallInput, width: '180px' }} /><span style={{ fontWeight: 700 }}>(인)</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={shared.officeName} onChange={setShr('officeName')} placeholder="사무소명" style={{ ...smallInput, flex: '1 1 220px' }} />
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>연락처 :</span>
          <input value={shared.officePhone} onChange={setShr('officePhone')} placeholder="연락처" style={{ ...smallInput, width: '200px' }} />
        </div>
      </div>

      {/* 하단 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 18px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
        <button onClick={onClose} style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', background: 'white', border: '1px solid #cbd5e1', borderRadius: '5px', cursor: 'pointer' }}>닫기</button>
        {onSave && (
          <button onClick={async () => { const ok = await onSave({ tab, shared, tabs }); if (ok) onClose?.(); }} style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 700, color: '#fff', background: '#059669', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>저장</button>
        )}
        <button onClick={openPreview} style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 700, color: '#fff', background: '#4f46e5', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>미리보기 · 인쇄</button>
      </div>
    </div>
  );

  // 새 창(page): 여백·테두리 없이 전체 화면 flat / 웹 폴백: 인페이지 오버레이 모달
  if (page) {
    return <div style={{ position: 'fixed', inset: 0, background: 'white', display: 'flex', flexDirection: 'column' }}>{card}</div>;
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px' }}>
      {card}
    </div>
  );
}
