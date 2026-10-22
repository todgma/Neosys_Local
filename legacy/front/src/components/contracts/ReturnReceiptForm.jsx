import { useState, useRef } from 'react';
import { Printer, X, RefreshCw } from 'lucide-react';
import { printElement } from '../../utils/printDoc';

// 미리보기/인쇄 공통 CSS (인쇄 시 자체완결 문서에도 그대로 사용)
const RRC_CSS = `
        .rrc-root { position: fixed; inset: 0; background: #eef1f5; display: flex; flex-direction: column; overflow: hidden; }
        /* page 모드(인앱 모달 카드 내부): 전체화면 대신 부모(카드)를 채움 */
        .rrc-root.rrc-page { position: relative; inset: auto; width: 100%; height: 100%; }
        .rrc-bar { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 14px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
        .rrc-bar h2 { font-size: 14px; font-weight: 800; color: #111827; margin: 0; }
        .rrc-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 13px; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 4px; background: white; color: #374151; cursor: pointer; white-space: nowrap; }
        .rrc-btn.primary { background: #4f46e5; border-color: #4f46e5; color: white; }
        .rrc-btn.save { background: #059669; border-color: #059669; color: white; }
        .rrc-cols { flex: 1; min-height: 0; display: flex; }
        .rrc-left { width: 320px; flex-shrink: 0; overflow-y: auto; background: #f8fafc; border-right: 1px solid #e2e8f0; padding: 16px 16px 24px; }
        .rrc-left-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 800; color: #1e293b; margin: 0 0 14px; }
        .rrc-card { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
        .rrc-card > .rrc-cap { font-size: 13px; font-weight: 800; color: #111827; letter-spacing: .5px; margin: 0 0 9px; }
        .rrc-fld { margin-bottom: 12px; }
        .rrc-fld:last-child { margin-bottom: 0; }
        .rrc-fld > label { display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 5px; }
        .rrc-fld .rrc-input { width: 100%; box-sizing: border-box; height: 36px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 10px; font-size: 14px; font-family: inherit; color: #0f172a; background: #fbfdff; }
        .rrc-fld .rrc-input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
        .rrc-fld textarea.rrc-input { height: 84px; padding: 7px 10px; resize: vertical; line-height: 1.5; }
        .rrc-amt { display: flex; align-items: stretch; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #fbfdff; }
        .rrc-amt .won { display: flex; align-items: center; justify-content: center; width: 34px; background: #eef2ff; color: #4f46e5; font-size: 15px; font-weight: 800; border-right: 1px solid #dfe3ea; }
        .rrc-amt input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; height: 36px; padding: 0 10px; font-size: 15px; font-weight: 700; text-align: right; color: #0f172a; font-family: inherit; }
        .rrc-pills { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .rrc-pills button { height: 34px; font-size: 14px; font-weight: 700; border: 1.5px solid #e2e8f0; border-radius: 999px; background: white; color: #111827; cursor: pointer; transition: all .12s; }
        .rrc-pills button.on { border-color: #4f46e5; background: #4f46e5; color: white; box-shadow: 0 2px 6px rgba(79,70,229,.25); }
        .rrc-reload { font-size: 13px; font-weight: 700; color: #4f46e5; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border: 1px solid #c7d2fe; border-radius: 999px; background: #eef2ff; }
        .rrc-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .rrc-right { flex: 1; min-width: 0; overflow-y: auto; background: #f1f5f9; padding: 18px; display: flex; flex-direction: column; gap: 18px; align-items: center; }
        .rrc-copy { width: 100%; max-width: 780px; background: white; border: 1px solid #334155; box-sizing: border-box; padding: 16px 20px 22px; font-family: '굴림','Gulim','돋움','Dotum','Malgun Gothic',sans-serif; color: #111; }
        .rrc-copy-head { display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 700; }
        .rrc-tag { color: #1e3a8a; }
        .rrc-no { color: #111; }
        .rrc-title { text-align: center; font-size: 26px; font-weight: 800; letter-spacing: 6px; margin: 8px 0 14px; }
        .rrc-to { font-size: 15px; font-weight: 700; margin: 0 0 8px; }
        .rrc-tb { width: 100%; border-collapse: collapse; }
        .rrc-tb th { width: 130px; border: 1px solid #94a3b8; background: #eef2f7; font-size: 14px; font-weight: 800; padding: 10px 8px; text-align: center; white-space: nowrap; }
        .rrc-tb td { border: 1px solid #94a3b8; font-size: 14px; font-weight: 700; padding: 10px 10px; height: 22px; }
        .rrc-body-txt { margin: 14px 2px; font-size: 14px; font-weight: 700; line-height: 1.9; }
        .rrc-body-txt p { margin: 0; }
        .rrc-date { text-align: right; font-size: 14px; font-weight: 700; margin: 28px 0 10px; }
        .rrc-sign td { height: 20px; }
        .rrc-sign .rrc-in-mark { width: 46px; text-align: center; color: #111827; font-weight: 700; }
        .rrc-logo { text-align: right; margin-top: 10px; font-size: 15px; font-weight: 800; color: #cbd5e1; letter-spacing: 1px; }
        @media print {
          @page { size: A4; margin: 20mm 20mm 10mm 20mm; }
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .rrc-right { display: block !important; padding: 0 !important; margin: 0 !important; gap: 0 !important; background: #fff !important; }
          .rrc-copy { max-width: none !important; border: 1px solid #111 !important; min-height: 128mm; box-sizing: border-box; page-break-inside: avoid; }
          .rrc-copy:first-child { border-bottom: 2px dashed #000 !important; }
          .rrc-copy, .rrc-tb th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .rrc-tag { color: #111 !important; }
        }
`;

/**
 * 영수증 / 반환금영수증 — 좌측 입력 + 우측 실시간 미리보기(매수인용·매도인용 2부).
 *  - title만 다르고 UI/서식 동일(영수증 ↔ 반환금 영수증).
 *  - 새 창(page)에서 렌더 · 인쇄(window.print) 시 좌측 패널/툴바 숨김.
 *  - 데이터(부동산표시·금액) 계약 연동은 추후 지시 예정. defaults로 초기값 주입 가능.
 */

// 숫자 → 한글 금액(예: 111111 → 일십일만일천일백일십일)
const HAN_NUM = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const HAN_UNIT = ['', '십', '백', '천'];
const HAN_BIG = ['', '만', '억', '조', '경'];
const digitsOnly = (v) => String(v ?? '').replace(/[^0-9]/g, '');
const comma = (v) => { const n = digitsOnly(v); return n ? Number(n).toLocaleString() : ''; };
const numToKorean = (v) => {
  let num = Number(digitsOnly(v)) || 0;
  if (num === 0) return '';
  let result = '';
  let groupIndex = 0;
  while (num > 0) {
    const group = num % 10000;
    if (group > 0) {
      let g = group, unit = 0, gs = '';
      while (g > 0) {
        const dgt = g % 10;
        if (dgt > 0) gs = HAN_NUM[dgt] + HAN_UNIT[unit] + gs;
        g = Math.floor(g / 10); unit++;
      }
      result = gs + HAN_BIG[groupIndex] + result;
    }
    num = Math.floor(num / 10000); groupIndex++;
  }
  return result;
};

const AMOUNT_ITEMS = ['총 금액', '계약금', '중도금', '잔금'];

const BLANK = {
  amountItem: '총 금액',
  amount: '',            // 금액(숫자)
  propertyDisplay: '',   // 부동산의 표시
  issueDate: '',         // 발행일
  serialNo: '',          // 영수증 번호(NO.)
};

export default function ReturnReceiptForm({ title = '반환금 영수증', onClose, page = false, initial = null, defaults = null, onSave = null }) {
  const [f, setF] = useState(() => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const base = { ...BLANK, issueDate: today, ...(defaults && typeof defaults === 'object' ? defaults : {}) };
    return initial && typeof initial === 'object' ? { ...base, ...initial } : base;
  });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e && e.target ? e.target.value : e }));
  // '다시 불러오기' — 계약 물건정보에서 부동산 표시 재주입(연동 전엔 defaults 기준)
  const reloadProperty = () => setF((p) => ({ ...p, propertyDisplay: (defaults && defaults.propertyDisplay) || '' }));

  // 인쇄 — 우측 미리보기 DOM + 폼 CSS만으로 자체완결 문서를 만들어 인쇄(앱 전체 CSS 미포함 → 빈화면 방지)
  const printRef = useRef(null);
  const handlePrint = () => printElement(printRef.current, RRC_CSS, title);

  const spacedTitle = title.split('').join(title.includes(' ') ? '' : ' ');
  const kor = numToKorean(f.amount);
  const won = comma(f.amount);

  // 미리보기 1부(매수인용/매도인용)
  const Copy = ({ label }) => (
    <div className="rrc-copy">
      <div className="rrc-copy-head">
        <span className="rrc-tag">[{label}]</span>
        <span className="rrc-no">NO. {f.serialNo || ''}</span>
      </div>
      <div className="rrc-title">{spacedTitle}</div>
      <div className="rrc-to">귀하</div>
      <table className="rrc-tb"><tbody>
        <tr>
          <th>영수금액</th>
          <td>{kor ? `금 ${kor}원 정 (${won} 원)` : ''}</td>
        </tr>
        <tr>
          <th>부동산의 표시</th>
          <td style={{ whiteSpace: 'pre-wrap' }}>{f.propertyDisplay || ''}</td>
        </tr>
      </tbody></table>
      <div className="rrc-body-txt">
        <p>매수인 은(는) 위 표시 부동산에 대한</p>
        <p>매매 대금 원 중 {f.amountItem} {kor ? `${kor}원` : ''}을</p>
        <p>매도인 (으)로부터 영수하고 본 영수증을 발행 합니다.</p>
      </div>
      <div className="rrc-date">발행일: {f.issueDate}</div>
      <table className="rrc-tb rrc-sign"><tbody>
        <tr><th>매도인</th><td></td><td className="rrc-in-mark">(인)</td></tr>
        <tr><th>매수인</th><td></td><td className="rrc-in-mark">(인)</td></tr>
      </tbody></table>
      <div className="rrc-logo">네오시스</div>
    </div>
  );

  return (
    <div className={`rrc-root${page ? ' rrc-page' : ''}`}>
      <style>{`
        .rrc-root { position: fixed; inset: 0; background: #eef1f5; display: flex; flex-direction: column; overflow: hidden; }
        /* page 모드(인앱 모달 카드 내부): 전체화면 대신 부모(카드)를 채움 */
        .rrc-root.rrc-page { position: relative; inset: auto; width: 100%; height: 100%; }
        .rrc-bar { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 14px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
        .rrc-bar h2 { font-size: 14px; font-weight: 800; color: #111827; margin: 0; }
        .rrc-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 13px; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 4px; background: white; color: #374151; cursor: pointer; white-space: nowrap; }
        .rrc-btn.primary { background: #4f46e5; border-color: #4f46e5; color: white; }
        .rrc-btn.save { background: #059669; border-color: #059669; color: white; }
        .rrc-cols { flex: 1; min-height: 0; display: flex; }
        /* 좌측 입력 패널 — 좌측 강조바 + 섹션 카드 스타일(참고 캡처와 구분되는 레이아웃) */
        .rrc-left { width: 320px; flex-shrink: 0; overflow-y: auto; background: #f8fafc; border-right: 1px solid #e2e8f0; padding: 16px 16px 24px; }
        .rrc-left-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 800; color: #1e293b; margin: 0 0 14px; }
        .rrc-card { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
        .rrc-card > .rrc-cap { font-size: 13px; font-weight: 800; color: #111827; letter-spacing: .5px; margin: 0 0 9px; }
        .rrc-fld { margin-bottom: 12px; }
        .rrc-fld:last-child { margin-bottom: 0; }
        .rrc-fld > label { display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 5px; }
        .rrc-fld .rrc-input { width: 100%; box-sizing: border-box; height: 36px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 10px; font-size: 14px; font-family: inherit; color: #0f172a; background: #fbfdff; }
        .rrc-fld .rrc-input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
        .rrc-fld textarea.rrc-input { height: 84px; padding: 7px 10px; resize: vertical; line-height: 1.5; }
        /* 금액: ₩ 접두 어드먼트 */
        .rrc-amt { display: flex; align-items: stretch; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #fbfdff; }
        .rrc-amt .won { display: flex; align-items: center; justify-content: center; width: 34px; background: #eef2ff; color: #4f46e5; font-size: 15px; font-weight: 800; border-right: 1px solid #dfe3ea; }
        .rrc-amt input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; height: 36px; padding: 0 10px; font-size: 15px; font-weight: 700; text-align: right; color: #0f172a; font-family: inherit; }
        /* 금액구분: 알약형 토글(2x2 그리드) */
        .rrc-pills { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .rrc-pills button { height: 34px; font-size: 14px; font-weight: 700; border: 1.5px solid #e2e8f0; border-radius: 999px; background: white; color: #111827; cursor: pointer; transition: all .12s; }
        .rrc-pills button.on { border-color: #4f46e5; background: #4f46e5; color: white; box-shadow: 0 2px 6px rgba(79,70,229,.25); }
        .rrc-reload { font-size: 13px; font-weight: 700; color: #4f46e5; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border: 1px solid #c7d2fe; border-radius: 999px; background: #eef2ff; }
        .rrc-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        /* 우측 미리보기 */
        .rrc-right { flex: 1; min-width: 0; overflow-y: auto; background: #f1f5f9; padding: 18px; display: flex; flex-direction: column; gap: 18px; align-items: center; }
        .rrc-copy { width: 100%; max-width: 780px; background: white; border: 1px solid #334155; box-sizing: border-box; padding: 16px 20px 22px; font-family: '굴림','Gulim','돋움','Dotum','Malgun Gothic',sans-serif; color: #111; }
        .rrc-copy-head { display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 700; }
        .rrc-tag { color: #1e3a8a; }
        .rrc-no { color: #111; }
        .rrc-title { text-align: center; font-size: 26px; font-weight: 800; letter-spacing: 6px; margin: 8px 0 14px; }
        .rrc-to { font-size: 15px; font-weight: 700; margin: 0 0 8px; }
        .rrc-tb { width: 100%; border-collapse: collapse; }
        .rrc-tb th { width: 130px; border: 1px solid #94a3b8; background: #eef2f7; font-size: 14px; font-weight: 800; padding: 10px 8px; text-align: center; white-space: nowrap; }
        .rrc-tb td { border: 1px solid #94a3b8; font-size: 14px; font-weight: 700; padding: 10px 10px; height: 22px; }
        .rrc-body-txt { margin: 14px 2px; font-size: 14px; font-weight: 700; line-height: 1.9; }
        .rrc-body-txt p { margin: 0; }
        .rrc-date { text-align: right; font-size: 14px; font-weight: 700; margin: 28px 0 10px; }
        .rrc-sign td { height: 20px; }
        .rrc-sign .rrc-in-mark { width: 46px; text-align: center; color: #111827; font-weight: 700; }
        .rrc-logo { text-align: right; margin-top: 10px; font-size: 15px; font-weight: 800; color: #cbd5e1; letter-spacing: 1px; }
        /* react-to-print: 우측 미리보기(.rrc-right)만 iframe 격리 인쇄 → 계약서/입력패널은 인쇄 안 됨 */
        @media print {
          @page { size: A4; margin: 20mm 20mm 10mm 20mm; }
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .rrc-right { display: block !important; padding: 0 !important; margin: 0 !important; gap: 0 !important; background: #fff !important; }
          /* A4 한 장에 2부(위/아래) + 가운데 점선 절취선 */
          .rrc-copy { max-width: none !important; border: 1px solid #111 !important; min-height: 128mm; box-sizing: border-box; page-break-inside: avoid; }
          .rrc-copy:first-child { border-bottom: 2px dashed #000 !important; }
          .rrc-copy, .rrc-tb th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .rrc-tag { color: #111 !important; }
        }
      `}</style>

      {/* 상단 툴바 */}
      <div className="rrc-bar no-print">
        <h2>{title}</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onSave && <button className="rrc-btn save" onClick={async () => { const ok = await onSave(f); if (ok) onClose?.(); }}>저장</button>}
          <button className="rrc-btn primary" onClick={handlePrint}><Printer className="w-4 h-4" /> 인쇄 / 미리보기</button>
          {onClose && <button className="rrc-btn" onClick={onClose}><X className="w-4 h-4" /> 닫기</button>}
        </div>
      </div>

      <div className="rrc-cols">
        {/* 좌측 입력 */}
        <div className="rrc-left no-print">
          {/* 금액 카드 */}
          <div className="rrc-card">
            <p className="rrc-cap">금액 정보</p>
            <div className="rrc-fld">
              <label>금액 구분</label>
              <div className="rrc-pills">
                {AMOUNT_ITEMS.map((it) => (
                  <button key={it} className={f.amountItem === it ? 'on' : ''} onClick={() => set('amountItem')(it)}>{it}</button>
                ))}
              </div>
            </div>
            <div className="rrc-fld">
              <label>금액</label>
              <div className="rrc-amt">
                <span className="won">₩</span>
                <input value={comma(f.amount)} onChange={(e) => set('amount')(digitsOnly(e.target.value))} placeholder="0" inputMode="numeric" />
              </div>
            </div>
          </div>

          {/* 부동산 카드 */}
          <div className="rrc-card">
            <p className="rrc-cap">부동산 표시</p>
            <div className="rrc-fld">
              <label>소재지 표기 <span className="rrc-reload" onClick={reloadProperty}><RefreshCw style={{ width: '12px', height: '12px' }} /> 불러오기</span></label>
              <textarea className="rrc-input" value={f.propertyDisplay} onChange={set('propertyDisplay')} placeholder="부동산 표시 내용을 입력하세요" />
            </div>
          </div>

          {/* 발행 카드 */}
          <div className="rrc-card">
            <p className="rrc-cap">발행 정보</p>
            <div className="rrc-fld">
              <label>발행일</label>
              <input type="date" className="rrc-input" value={f.issueDate} onChange={set('issueDate')} />
            </div>
            <div className="rrc-fld">
              <label>영수증 번호</label>
              <input className="rrc-input" value={f.serialNo} onChange={set('serialNo')} placeholder="NO." />
            </div>
          </div>
        </div>

        {/* 우측 미리보기 (매수인용 + 매도인용) */}
        <div className="rrc-right" ref={printRef}>
          <Copy label="매수인용" />
          <div className="rrc-cut no-print" style={{ width: '100%', maxWidth: '780px', textAlign: 'center', borderTop: '2px dashed #94a3b8', color: '#111827', fontSize: '12px', fontWeight: 700, paddingTop: '4px', letterSpacing: '2px' }}>✂ 절취선</div>
          <Copy label="매도인용" />
        </div>
      </div>
    </div>
  );
}
