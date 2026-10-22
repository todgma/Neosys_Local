import React, { useMemo, useState } from 'react';
import { buildUtilitySettlementHtml, calcUtilityTotal, openFormWindow } from '../../constants/receiptForms';

/**
 * 공과금 등 정산서 (한국공인중개사협회 서식) — 표 형태로 입력 → 미리보기·인쇄(A4)
 *  - 계약서작성 "영수증 등 > 공과금등 정산서"에서 호출. 다른 서류와 동일하게 편집/미리보기/인쇄.
 *  - 항목별(가스/전기/수도/장기수선충당금/기타) 행 추가·삭제. 정산총액은 각 정산금액 합계로 자동계산.
 */
const emptyMeter = () => ({ meter: '', usage: '', period: '', amount: '' });
const emptyLr = () => ({ period: '', months: '', monthly: '', amount: '' });
const emptyEtc = () => ({ content: '', amount: '' });
const won = (v) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isNaN(n) ? 0 : n; };
const fmt = (v) => { const n = won(v); return n ? n.toLocaleString('ko-KR') : ''; };

export default function UtilitySettlementForm({ title = '공과금 등 정산서', onClose, defaults = {}, page = false, initial = null, onSave = null }) {
  const base = {
    address: defaults.address || '',
    mgmtMemo: '', mgmtFee: '',
    gas: [emptyMeter()],
    elec: [emptyMeter()],
    water: [emptyMeter()],
    longRepair: [emptyLr()],
    etc: [emptyEtc()],
    totalNote: '',
    etcText: '',
    officeName: defaults.officeName || '',
    repName: defaults.repName || '',
    officePhone: defaults.officePhone || '',
    issueDate: defaults.issueDate || '',
  };
  const [d, setD] = useState(initial && typeof initial === 'object' ? { ...base, ...initial } : base);

  const set = (k) => (e) => setD((p) => ({ ...p, [k]: e && e.target ? e.target.value : e }));
  const setRow = (key, i, k) => (e) => setD((p) => ({ ...p, [key]: p[key].map((r, j) => (j === i ? { ...r, [k]: e.target.value } : r)) }));
  const addRow = (key, mk) => () => setD((p) => ({ ...p, [key]: [...p[key], mk()] }));
  const delRow = (key, i) => () => setD((p) => ({ ...p, [key]: p[key].length > 1 ? p[key].filter((_, j) => j !== i) : p[key] }));

  const total = useMemo(() => calcUtilityTotal(d), [d]);

  const openPreview = () => { if (!openFormWindow(buildUtilitySettlementHtml(d), title)) alert('팝업이 차단되었습니다. 팝업을 허용해 주세요.'); };

  // 스타일
  const th = { border: '1px solid #334155', background: '#f1f5f9', padding: '6px', fontSize: '13px', fontWeight: 700, textAlign: 'center', color: '#111827', whiteSpace: 'nowrap' };
  const td = { border: '1px solid #334155', padding: '3px 6px', fontSize: '13px', verticalAlign: 'middle' };
  const inp = { border: 'none', outline: 'none', fontSize: '13px', fontWeight: 600, padding: '4px 4px', background: 'transparent', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', color: '#111827' };
  const inpR = { ...inp, textAlign: 'right' };
  const sec = { fontSize: '15px', fontWeight: 800, color: '#111827', margin: '14px 0 4px' };
  const lead = { fontSize: '15px', fontWeight: 800, color: '#111827', margin: '8px 0 5px' };
  const addBtn = { padding: '3px 10px', fontSize: '13px', fontWeight: 700, border: '1px solid #6366f1', borderRadius: '4px', background: 'white', color: '#4f46e5', cursor: 'pointer', whiteSpace: 'nowrap' };
  const delBtn = (disabled) => ({ border: 'none', background: 'transparent', color: disabled ? '#cbd5e1' : '#dc2626', cursor: disabled ? 'default' : 'pointer', fontSize: '15px' });

  // 검침형(가스/전기/수도) 표 — 컴포넌트가 아닌 함수로 인라인 렌더(입력 포커스 유지)
  const renderMeter = (label, no, keyName) => (
    <React.Fragment key={keyName}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...sec }}>
        <span>{no}. {label}.</span>
        <button onClick={addRow(keyName, emptyMeter)} style={addBtn}>＋ 행추가</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
        <tr>
          <td style={{ ...th, width: '20%' }}>검침 수치</td>
          <td style={{ ...th, width: '20%' }}>정산 사용량</td>
          <td style={th}>정산 기간</td>
          <td style={{ ...th, width: '190px' }}>정산 금액</td>
          <td style={{ ...th, width: '36px' }}></td>
        </tr>
        {d[keyName].map((r, i) => (
          <tr key={i}>
            <td style={td}><input value={r.meter} onChange={setRow(keyName, i, 'meter')} style={inp} /></td>
            <td style={td}><input value={r.usage} onChange={setRow(keyName, i, 'usage')} style={inpR} /></td>
            <td style={td}><input value={r.period} onChange={setRow(keyName, i, 'period')} placeholder="예: 2026-07-01 ~ 2026-07-31" style={inp} /></td>
            <td style={td}><input value={fmt(r.amount)} onChange={setRow(keyName, i, 'amount')} style={inpR} /></td>
            <td style={{ ...td, textAlign: 'center' }}><button onClick={delRow(keyName, i)} disabled={d[keyName].length <= 1} title="삭제" style={delBtn(d[keyName].length <= 1)}>✕</button></td>
          </tr>
        ))}
      </tbody></table>
    </React.Fragment>
  );

  const rootStyle = page
    ? { width: '100%', flex: 1, minHeight: 0, background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
    : { width: '900px', maxWidth: '96vw', background: 'white', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', overflow: 'hidden' };
  const card = (
      <div onClick={(e) => e.stopPropagation()} style={rootStyle}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>{title} <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>(한국공인중개사협회 서식)</span></div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={openPreview} style={{ padding: '7px 16px', fontSize: '14px', fontWeight: 700, color: '#fff', background: '#4f46e5', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>미리보기 · 인쇄</button>
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#111827' }}>×</button>
          </div>
        </div>

        <div style={{ padding: '16px 20px', maxHeight: page ? 'none' : '80vh', flex: page ? 1 : undefined, minHeight: page ? 0 : undefined, overflowY: 'auto' }}>
          {/* 물건 소재지 */}
          <div style={lead}>[물건 소재지]</div>
          <input value={d.address} onChange={set('address')} placeholder="물건 소재지" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #334155', borderRadius: '3px', padding: '7px 10px', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: '#111827' }} />

          <div style={{ ...lead, marginTop: '12px' }}>[정산내역]</div>

          {/* 1. 관리비 */}
          <div style={sec}>1. 관리비.</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
            <tr>
              <td style={{ ...th, width: '40%' }}>관리비 정산액(관리사무소 확인분)</td>
              <td style={td}><input value={d.mgmtMemo} onChange={set('mgmtMemo')} placeholder="비고" style={inp} /></td>
              <td style={{ ...td, width: '190px' }}><input value={fmt(d.mgmtFee)} onChange={set('mgmtFee')} style={inpR} /></td>
            </tr>
          </tbody></table>

          {/* 2·3·4 검침형 */}
          {renderMeter('가스요금', '2', 'gas')}
          {renderMeter('전기요금', '3', 'elec')}
          {renderMeter('수도요금', '4', 'water')}

          {/* 5. 장기수선충당금 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...sec }}>
            <span>5. 장기수선충당금.</span>
            <button onClick={addRow('longRepair', emptyLr)} style={addBtn}>＋ 행추가</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
            <tr>
              <td style={{ ...th, width: '32%' }}>납입 기간</td>
              <td style={{ ...th, width: '16%' }}>납입 개월수</td>
              <td style={{ ...th, width: '22%' }}>월납입액</td>
              <td style={{ ...th, width: '190px' }}>정산 금액</td>
              <td style={{ ...th, width: '36px' }}></td>
            </tr>
            {d.longRepair.map((r, i) => (
              <tr key={i}>
                <td style={td}><input value={r.period} onChange={setRow('longRepair', i, 'period')} style={inp} /></td>
                <td style={td}><input value={r.months} onChange={setRow('longRepair', i, 'months')} style={inpR} /></td>
                <td style={td}><input value={fmt(r.monthly)} onChange={setRow('longRepair', i, 'monthly')} style={inpR} /></td>
                <td style={td}><input value={fmt(r.amount)} onChange={setRow('longRepair', i, 'amount')} style={inpR} /></td>
                <td style={{ ...td, textAlign: 'center' }}><button onClick={delRow('longRepair', i)} disabled={d.longRepair.length <= 1} style={delBtn(d.longRepair.length <= 1)}>✕</button></td>
              </tr>
            ))}
          </tbody></table>

          {/* 6. 기타 사항 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...sec }}>
            <span>6. 기타 사항</span>
            <button onClick={addRow('etc', emptyEtc)} style={addBtn}>＋ 행추가</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
            {d.etc.map((r, i) => (
              <tr key={i}>
                <td style={td}><input value={r.content} onChange={setRow('etc', i, 'content')} placeholder="내용" style={inp} /></td>
                <td style={{ ...td, width: '190px' }}><input value={fmt(r.amount)} onChange={setRow('etc', i, 'amount')} style={inpR} /></td>
                <td style={{ ...td, width: '36px', textAlign: 'center' }}><button onClick={delRow('etc', i)} disabled={d.etc.length <= 1} style={delBtn(d.etc.length <= 1)}>✕</button></td>
              </tr>
            ))}
          </tbody></table>

          {/* 7. 정산총액 */}
          <div style={sec}>7. 정산총액</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
            <tr>
              <td style={{ ...th, width: '90px' }}>정산총액</td>
              <td style={{ ...th, width: '90px' }}>정산내역</td>
              <td style={td}><input value={d.totalNote} onChange={set('totalNote')} placeholder="정산내역" style={inp} /></td>
              <td style={{ ...td, width: '190px', textAlign: 'right', fontWeight: 800, fontSize: '14px', color: '#111827' }}>₩{total.toLocaleString('ko-KR')}</td>
            </tr>
          </tbody></table>

          {/* 기타사항 */}
          <div style={{ ...lead, marginTop: '14px' }}>[기타사항]</div>
          <textarea value={d.etcText} onChange={set('etcText')} rows={4} placeholder="기타사항" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #334155', borderRadius: '3px', padding: '8px 10px', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.6, color: '#111827' }} />

          {/* 하단 발행 정보 */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={d.officeName} onChange={set('officeName')} placeholder="사무소명" style={{ flex: '1 1 200px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '7px 10px', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', outline: 'none', color: '#111827' }} />
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>[담당자]</span>
            <input value={d.repName} onChange={set('repName')} placeholder="성명" style={{ width: '160px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '7px 10px', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', outline: 'none', color: '#111827' }} />
            <input value={d.officePhone} onChange={set('officePhone')} placeholder="전화번호" style={{ width: '160px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '7px 10px', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', outline: 'none', color: '#111827' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>발행일 :</span>
            <input type="date" value={d.issueDate} onChange={set('issueDate')} style={{ width: '180px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 10px', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', outline: 'none', color: '#111827' }} />
          </div>
        </div>

        {/* 하단 버튼 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 18px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', background: 'white', border: '1px solid #cbd5e1', borderRadius: '5px', cursor: 'pointer' }}>닫기</button>
          {onSave && (
            <button onClick={async () => { const ok = await onSave(d); if (ok) onClose?.(); }} style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 700, color: '#fff', background: '#059669', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>저장</button>
          )}
          <button onClick={openPreview} style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 700, color: '#fff', background: '#4f46e5', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>미리보기 · 인쇄</button>
        </div>
      </div>
  );

  // 새 창(page): 여백·테두리 없이 전체 화면 flat / 웹 폴백: 인페이지 오버레이 모달
  if (page) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'white', display: 'flex', flexDirection: 'column' }}>{card}</div>
    );
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px' }}>
      {card}
    </div>
  );
}
