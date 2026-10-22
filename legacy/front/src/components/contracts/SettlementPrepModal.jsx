import { useState } from 'react';
import { toast } from 'react-hot-toast';

/**
 * 잔금시 준비사항 — 거래주체(매도/매수/임대/임차 × 개인/법인)별 탭으로 준비서류를 조회/편집/저장.
 *  - 새 창(Electron)에서는 page 모드로 전체 화면, 웹 폴백은 인페이지 오버레이 모달.
 *  - 저장은 백엔드 연동 전 임시로 localStorage(settlementPrepData_v1)에 보관.
 */
const STORE_KEY = 'settlementPrepData_v1';
const TABS = ['매도인(개인)', '매도인(법인)', '매수인(개인)', '매수인(법인)', '임대인(개인)', '임대인(법인)', '임차인(개인)', '임차인(법인)'];

const DEFAULT_DATA = {
  '매도인(개인)': [
    { label: '준비서류', items: ['등기권리증', '인감도장', '매도용 인감증명서(매수인 인적사항 기재)', '주민등록초본(주소변동내역포함)', '관리비/공과금 정산내역', '선수관리비 영수증', '매도인 계좌'] },
    { label: '임차인이 있는 경우', items: ['임대차계약서'] },
    { label: '본인 참석시', items: ['신분증', '도장'] },
    { label: '대리인 참석시', items: ['위임장(매도인 인감날인)', '가족관계증명서(가족 대리시)', '매도인 신분증', '매도인 인감도장(필수아님)', '대리인 신분증', '대리인 도장'] },
  ],
  '매도인(법인)': [
    { label: '준비서류', items: ['등기권리증', '법인인감도장(or 사용인감+사용인감계)', '매도용 법인인감증명서', '법인등기사항전부증명서', '사업자등록증', '관리비/공과금 정산내역', '선수관리비 영수증', '법인명의 계좌'] },
    { label: '임차인이 있는 경우', items: ['임대차계약서'] },
    { label: '대표자 참석시', items: ['대표자 신분증', '대표자 도장'] },
    { label: '대리인 참석시', items: ['위임장(법인인감날인)', '대리인 재직증명서', '대리인 신분증', '대리인 도장'] },
  ],
  '매수인(개인)': [
    { label: '잔금 준비서류', items: ['계좌이체 한도조정', '주민등록등본'] },
    { label: '본인 참석시', items: ['신분증', '도장'] },
    { label: '대리인 참석시', items: ['위임장(매수인 인감날인)', '인감증명서(매수인 본인발급)', '가족관계증명서(가족 대리시)', '매수인 신분증', '매수인 인감도장(필수아님)', '대리인 신분증', '대리인 도장'] },
  ],
  '매수인(법인)': [
    { label: '잔금 준비서류', items: ['계좌이체 한도조정', '법인인감도장(or 사용인감+사용인감계)', '법인인감증명서', '법인등기사항전부증명서', '사업자등록증'] },
    { label: '대표자 참석시', items: ['신분증', '도장'] },
    { label: '대리인 참석시', items: ['위임장(법인인감날인)', '대리인 재직증명서', '대리인 신분증', '대리인 도장'] },
  ],
  '임대인(개인)': [
    { label: '서류', items: ['관리비/공과금 정산내역', '임대인명의 계좌', '열쇠/비밀번호'] },
    { label: '본인 참석시', items: ['신분증', '도장(서명가능)'] },
    { label: '대리인 참석시', items: ['위임장(인감날인)', '인감증명서(임대인 본인발급)', '가족관계증명서(가족대리시)', '임대인 신분증', '임대인 인감도장(필수아님)', '대리인 신분증', '대리인 도장(서명가능)'] },
  ],
  '임대인(법인)': [
    { label: '서류', items: ['관리비/공과금 정산내역', '법인명의 계좌', '열쇠/비밀번호'] },
    { label: '대표자 참석시', items: ['신분증', '도장'] },
    { label: '대리인 참석시', items: ['위임장(법인인감날인)', '법인인감증명서', '대리인 재직증명서', '대리인 신분증', '대리인 도장'] },
  ],
  '임차인(개인)': [
    { label: '잔금', items: ['계좌이체 한도조정'] },
    { label: '본인 참석시', items: ['신분증', '도장(서명가능)'] },
    { label: '대리인 참석시', items: ['위임장(인감날인)', '인감증명서(임차인 본인발급)', '가족관계증명서(가족대리시)', '임차인 신분증', '임차인 인감도장(필수아님)', '대리인 신분증', '대리인 도장(서명가능)'] },
  ],
  '임차인(법인)': [
    { label: '잔금', items: ['계좌이체 한도조정'] },
    { label: '대표자 참석시', items: ['신분증', '도장'] },
    { label: '대리인 참석시', items: ['위임장(법인인감날인)', '법인인감증명서', '대리인 재직증명서', '대리인 신분증', '대리인 도장'] },
  ],
};

// 계약시 준비사항 등 빈 내용 변형용: 같은 탭, 각 탭 빈 행
export const EMPTY_PREP_DATA = TABS.reduce((acc, t) => { acc[t] = []; return acc; }, {});

const deepClone = (o) => JSON.parse(JSON.stringify(o));
const loadData = (storeKey, defaultData) => {
  try {
    const raw = localStorage.getItem(storeKey);
    if (raw) return { ...deepClone(defaultData), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return deepClone(defaultData);
};

export default function SettlementPrepModal({ onClose, page = false, title = '잔금시 준비사항', storeKey = STORE_KEY, defaultData = DEFAULT_DATA, initial = null, onSave = null }) {
  const [data, setData] = useState(() => (
    initial && typeof initial === 'object' && Object.keys(initial).length
      ? { ...deepClone(defaultData), ...initial }
      : loadData(storeKey, defaultData)
  ));
  const [tab, setTab] = useState(TABS[0]);
  const rows = data[tab] || [];

  const setRows = (updater) => setData((p) => ({ ...p, [tab]: typeof updater === 'function' ? updater(p[tab] || []) : updater }));
  const setLabel = (i, val) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, label: val } : r)));
  const setItems = (i, val) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, items: val.split('\n') } : r)));
  const addRow = () => setRows((rs) => [...rs, { label: '', items: [''] }]);
  const removeRow = (i) => setRows((rs) => rs.filter((_, j) => j !== i));

  const save = async () => {
    if (onSave) { const ok = await onSave(data); if (ok) onClose?.(); return; } // 백엔드(계약 부속문서) 저장
    try { localStorage.setItem(storeKey, JSON.stringify(data)); toast.success('저장되었습니다.'); }
    catch { toast.error('저장에 실패했습니다.'); }
  };
  const resetTab = () => {
    if (window.confirm(`[${tab}] 내용을 기본값으로 되돌릴까요?`)) setRows(deepClone(defaultData[tab] || []));
  };

  // 스타일
  const btnBase = { padding: '6px 14px', fontSize: '13px', fontWeight: 600, borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' };
  const btnPrimary = { ...btnBase, border: '1px solid #4f46e5', background: '#4f46e5', color: 'white' };
  const btnGray = { ...btnBase, border: '1px solid #cbd5e1', background: 'white', color: '#374151' };
  const tabBtn = (on) => ({ padding: '7px 12px', fontSize: '13px', fontWeight: on ? 700 : 600, border: '1px solid #e5e7eb', borderBottom: on ? '2px solid #4f46e5' : '1px solid #e5e7eb', background: on ? '#eef2ff' : 'white', color: on ? '#4f46e5' : '#374151', borderRadius: '6px 6px 0 0', cursor: 'pointer', whiteSpace: 'nowrap' });
  const th = { border: '1px solid #cbd5e1', background: '#f1f5f9', padding: '6px 8px', fontSize: '13px', fontWeight: 700, color: '#334155', textAlign: 'center' };
  const tdC = { border: '1px solid #cbd5e1', padding: '4px', verticalAlign: 'top' };
  const tdLabel = { ...tdC, background: '#f8fafc' };
  const tdDel = { ...tdC, textAlign: 'center', verticalAlign: 'middle' };
  const inBase = { width: '100%', border: '1px solid transparent', outline: 'none', fontFamily: 'inherit', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical', background: 'transparent', padding: '4px 6px', lineHeight: 1.55 };
  const inLabel = { ...inBase, fontWeight: 700, color: '#334155', textAlign: 'center' };
  const inItems = { ...inBase, color: '#1f2937' };
  const delBtn = { width: '26px', height: '26px', border: '1px solid #fca5a5', borderRadius: '6px', background: 'white', color: '#dc2626', cursor: 'pointer', fontSize: '16px', lineHeight: 1 };
  const addBtn = { marginTop: '10px', padding: '6px 14px', fontSize: '13px', fontWeight: 700, border: '1px dashed #8b93ea', borderRadius: '6px', background: 'white', color: '#4f46e5', cursor: 'pointer' };

  const body = (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'white' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{title}</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={resetTab} style={btnGray}>기본값 복원</button>
          <button onClick={save} style={btnPrimary}>저장</button>
          {onClose && <button onClick={onClose} style={btnGray}>닫기</button>}
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '10px 16px 0', borderBottom: '1px solid #e5e7eb', background: '#fafafa' }}>
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} style={tabBtn(t === tab)}>{t}</button>
        ))}
      </div>

      {/* 내용 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '170px' }} />
            <col />
            <col style={{ width: '48px' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={th}>구분</th>
              <th style={th}>준비 서류 / 내용 (한 줄에 한 항목)</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={tdLabel}>
                  <textarea value={r.label} onChange={(e) => setLabel(i, e.target.value)} rows={Math.max(1, r.label.split('\n').length)} placeholder="구분" style={inLabel} />
                </td>
                <td style={tdC}>
                  <textarea value={r.items.join('\n')} onChange={(e) => setItems(i, e.target.value)} rows={Math.max(2, r.items.length)} placeholder="항목을 한 줄에 하나씩 입력" style={inItems} />
                </td>
                <td style={tdDel}>
                  <button type="button" onClick={() => removeRow(i)} title="행 삭제" style={delBtn}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={addRow} style={addBtn}>＋ 행 추가</button>
      </div>
    </div>
  );

  if (page) {
    return <div style={{ position: 'fixed', inset: 0, background: 'white', display: 'flex', flexDirection: 'column' }}>{body}</div>;
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ width: '980px', maxWidth: '96vw', height: '760px', maxHeight: '92vh', background: 'white', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        {body}
      </div>
    </div>
  );
}
