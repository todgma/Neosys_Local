import React, { useState, useRef } from 'react';
import { buildReceipt1Html } from '../../constants/receiptForms';
import { printDocHtml } from '../../utils/printDoc';

/**
 * 영수증(부동산중개업법시행규칙 별지27호) — 좌측 표 입력 + 우측 실시간 A4 미리보기(2부+절취선).
 *  - 서식자료실 / 계약서작성 공용. title로 영수증1·영수증2 구분(서식 동일)
 *  - 인쇄는 react-to-print로 우측 미리보기(printRef)만 iframe 격리 출력 → 계약서 인쇄 안 됨
 */
export default function ReceiptForm({ title = '영수증', onClose, page = false, initial = null, onSave = null }) {
  const base = {
    serialNo: '', use: '', taxNo: '', officeName: '', repName: '', officeAddr: '', regNo: '',
    writeDate: '', amount: '', note: '',
    rows: [{ date: '', target: '', tradeAmt: '', feeTotal: '', sellerFee: '', buyerFee: '' }],
  };
  const [d, setD] = useState(
    initial && typeof initial === 'object'
      ? { ...base, ...initial, rows: initial.rows && initial.rows.length ? initial.rows : base.rows }
      : base
  );
  const set = (k) => (e) => setD((p) => ({ ...p, [k]: e && e.target ? e.target.value : e }));
  const setRow = (i, k) => (e) => setD((p) => ({ ...p, rows: p.rows.map((r, j) => (j === i ? { ...r, [k]: e.target.value } : r)) }));
  const addRow = () => setD((p) => ({ ...p, rows: [...p.rows, { date: '', target: '', tradeAmt: '', feeTotal: '', sellerFee: '', buyerFee: '' }] }));
  const delRow = (i) => setD((p) => ({ ...p, rows: p.rows.filter((_, j) => j !== i) }));

  // A4 한 장에 동일 영수증 2부(위/아래) + 가운데 점선 절취선 (미리보기 = 인쇄 본문)
  //  Electron은 렌더러 window.print()가 미리보기 미지원 → 준비된 iframe HTML을 메인 프로세스 인쇄로 위임
  const printRef = useRef(null);
  const copyHtml = buildReceipt1Html(d);
  // 인쇄 — 영수증 2부(위/아래) 자체완결 문서(인라인 스타일 포함)로 직접 인쇄 → 앱 CSS 의존 없음(빈화면 방지)
  const handlePrint = () => {
    const one = `<div style="width:100%;box-sizing:border-box;padding:0 0 8mm;page-break-inside:avoid;">${copyHtml}</div>`;
    printDocHtml(`<div style="width:190mm;max-width:100%;margin:0 auto;">${one}${one}</div>`, '', title);
  };

  const th = { border: '1px solid #334155', background: '#f1f5f9', padding: '6px', fontSize: '13px', fontWeight: 700, textAlign: 'center', color: '#111827', whiteSpace: 'nowrap' };
  const td = { border: '1px solid #334155', padding: '3px 6px', fontSize: '13px', verticalAlign: 'middle' };
  const inp = { border: 'none', outline: 'none', fontSize: '13px', padding: '3px 4px', background: 'transparent', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
  const R = (name, val, label) => (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '13px', marginRight: '10px', cursor: 'pointer' }}>
      <input type="radio" name={name} checked={d.use === val} onChange={() => set('use')(val)} /> {label}
    </label>
  );

  const rootStyle = page
    ? { width: '100%', flex: 1, minHeight: 0, background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
    : { width: '1180px', maxWidth: '97vw', height: '88vh', background: 'white', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' };

  const card = (
      <div onClick={(e) => e.stopPropagation()} style={rootStyle}>
        <style>{`
          /* react-to-print: 우측 미리보기(.rc-print)만 iframe 격리 인쇄 */
          @media print {
            @page { size: A4; margin: 20mm 20mm 10mm 20mm; }
            html, body { background: #fff !important; }
            .rc-print { display: flex !important; flex-direction: column; min-height: 277mm; }
          }
        `}</style>
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc', flexShrink: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{title} <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>(부동산중개업법시행규칙 별지27호)</span></div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {onSave && (
              <button onClick={async () => { const ok = await onSave(d); if (ok) onClose?.(); }} style={{ padding: '7px 16px', fontSize: '14px', fontWeight: 600, color: '#fff', background: '#059669', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>저장</button>
            )}
            <button onClick={handlePrint} style={{ padding: '7px 16px', fontSize: '14px', fontWeight: 600, color: '#fff', background: '#4f46e5', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>인쇄 / 미리보기</button>
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#111827' }}>×</button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          {/* 좌측 입력 */}
          <div className="no-print" style={{ width: '440px', flexShrink: 0, borderRight: '1px solid #e2e8f0', padding: '16px 18px', overflowY: 'auto' }}>
            {/* 상단: 일련번호 / 용도 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}><tbody>
              <tr>
                <td style={{ ...th, width: '90px' }}>일련번호</td>
                <td style={td}><input value={d.serialNo} onChange={set('serialNo')} placeholder="일련번호" style={inp} /></td>
              </tr>
              <tr>
                <td style={th}>용도</td>
                <td style={td}>{R('use', '보관', '보관용')}{R('use', '매도', '매도(임대)자용')}{R('use', '매수', '매수(임차)자용')}</td>
              </tr>
            </tbody></table>

            {/* 중개업자 */}
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: '2px 0 5px' }}>중개업자</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}><tbody>
              <tr>
                <td style={{ ...th, width: '90px' }}>납세번호</td>
                <td style={td}><input value={d.taxNo} onChange={set('taxNo')} placeholder="납세번호" style={inp} /></td>
              </tr>
              <tr>
                <td style={th}>사무소명칭</td>
                <td style={td}><input value={d.officeName} onChange={set('officeName')} placeholder="사무소명칭" style={inp} /></td>
              </tr>
              <tr>
                <td style={th}>성명(대표자)</td>
                <td style={td}><input value={d.repName} onChange={set('repName')} placeholder="대표자 성명" style={inp} /></td>
              </tr>
              <tr>
                <td style={th}>사무소소재지</td>
                <td style={td}><input value={d.officeAddr} onChange={set('officeAddr')} placeholder="사무소 소재지" style={inp} /></td>
              </tr>
              <tr>
                <td style={th}>등록번호</td>
                <td style={td}><input value={d.regNo} onChange={set('regNo')} placeholder="등록번호" style={inp} /></td>
              </tr>
            </tbody></table>

            {/* 작성년월일 / 금액 / 비고 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}><tbody>
              <tr>
                <td style={{ ...th, width: '90px' }}>작성년월일</td>
                <td style={td}><input type="date" value={d.writeDate} onChange={set('writeDate')} style={inp} /></td>
              </tr>
              <tr>
                <td style={th}>금 액</td>
                <td style={td}><input value={d.amount} onChange={set('amount')} placeholder="금액" style={{ ...inp, textAlign: 'right' }} /></td>
              </tr>
              <tr>
                <td style={th}>비 고</td>
                <td style={td}><input value={d.note} onChange={set('note')} placeholder="비고" style={inp} /></td>
              </tr>
            </tbody></table>

            {/* 거래액 / 수수료 표 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 0 5px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>거래액 · 수수료(실비)</span>
              <button onClick={addRow} style={{ padding: '4px 10px', fontSize: '13px', fontWeight: 600, border: '1px solid #6366f1', borderRadius: '4px', background: 'white', color: '#4f46e5', cursor: 'pointer' }}>＋ 행추가</button>
            </div>
            {d.rows.map((r, i) => (
              <table key={i} style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}><tbody>
                <tr>
                  <td style={{ ...th, width: '90px' }}>년 월 일</td>
                  <td style={td}><input type="date" value={r.date} onChange={setRow(i, 'date')} style={inp} /></td>
                  <td style={{ ...td, width: '34px', textAlign: 'center' }}>
                    <button onClick={() => delRow(i)} disabled={d.rows.length <= 1} title="삭제" style={{ border: 'none', background: 'transparent', color: d.rows.length <= 1 ? '#cbd5e1' : '#dc2626', cursor: d.rows.length <= 1 ? 'default' : 'pointer', fontSize: '14px' }}>✕</button>
                  </td>
                </tr>
                <tr>
                  <td style={th}>중개대상물</td>
                  <td style={td} colSpan={2}><input value={r.target} onChange={setRow(i, 'target')} style={inp} /></td>
                </tr>
                <tr>
                  <td style={th}>거래액</td>
                  <td style={td} colSpan={2}><input value={r.tradeAmt} onChange={setRow(i, 'tradeAmt')} style={{ ...inp, textAlign: 'right' }} /></td>
                </tr>
                <tr>
                  <td style={th}>수수료 계</td>
                  <td style={td} colSpan={2}><input value={r.feeTotal} onChange={setRow(i, 'feeTotal')} style={{ ...inp, textAlign: 'right' }} /></td>
                </tr>
                <tr>
                  <td style={th}>매도(임대)자 부담</td>
                  <td style={td} colSpan={2}><input value={r.sellerFee} onChange={setRow(i, 'sellerFee')} style={{ ...inp, textAlign: 'right' }} /></td>
                </tr>
                <tr>
                  <td style={th}>매수(임차)자 부담</td>
                  <td style={td} colSpan={2}><input value={r.buyerFee} onChange={setRow(i, 'buyerFee')} style={{ ...inp, textAlign: 'right' }} /></td>
                </tr>
              </tbody></table>
            ))}
          </div>

          {/* 우측 미리보기 = 인쇄 본문(2부 + 절취선) */}
          <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: '#f1f5f9', padding: '18px' }}>
            <div ref={printRef} className="rc-print" style={{ width: '210mm', maxWidth: '100%', margin: '0 auto', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,.15)', padding: '10mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: '1 1 0', pageBreakInside: 'avoid' }} dangerouslySetInnerHTML={{ __html: copyHtml }} />
              <div style={{ borderTop: '2px dashed #000', margin: '5mm 0', textAlign: 'center', fontSize: '13px', color: '#000', letterSpacing: '2px' }}>✂ 절취선</div>
              <div style={{ flex: '1 1 0', pageBreakInside: 'avoid' }} dangerouslySetInnerHTML={{ __html: copyHtml }} />
            </div>
          </div>
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
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      {card}
    </div>
  );
}
