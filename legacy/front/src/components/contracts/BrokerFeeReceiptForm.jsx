import { useState, useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { printElement } from '../../utils/printDoc';

/**
 * 중개보수 영수증 — 좌측 입력(발행대상/일련번호/거래·보수 금액) + 우측 실시간 미리보기 2부.
 *  - 미리보기: [매도인용|매수인용] + [보관용]. 사무소 정보는 자동입력 후 미리보기에서 바로 수정 가능.
 *  - 새 창(page) 렌더 · 인쇄(window.print) 시 좌측/툴바 숨김. 저장은 masterId+docKind로 upsert.
 */
const won = (v) => { const n = Number(String(v ?? '').replace(/[^0-9.-]/g, '')); return Number.isNaN(n) ? 0 : n; };
const fmt = (v) => { const n = won(v); return n ? n.toLocaleString('ko-KR') : '0'; };
const digitsOnly = (v) => String(v ?? '').replace(/[^0-9]/g, '');
const comma = (v) => { const n = digitsOnly(v); return n ? Number(n).toLocaleString() : ''; };

export default function BrokerFeeReceiptForm({ title = '중개보수 영수증', onClose, defaults = {}, page = false, initial = null, onSave = null }) {
  const [d, setD] = useState(() => {
    const dt = new Date();
    const today = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const base = {
      issueTarget: '매도인',        // 발행대상: 매도인 / 매수인 (미리보기 태그 = {issueTarget}용)
      serialNo: '',                 // 일련번호(NO.)
      // 사무소 정보(자동입력 → 미리보기에서 수정 가능)
      bizNo: defaults.bizNo || '',
      officeName: defaults.officeName || '',
      repName: defaults.repName || '',
      officeAddr: defaults.officeAddr || '',
      regNo: defaults.regNo || '',
      writeDate: defaults.writeDate || today,
      note: '',
      // 거래·보수(좌측 입력)
      target: defaults.target || '', // 중개대상물
      tradeAmt: defaults.tradeAmt || '',
      fee: '',                       // 중개보수
      vat: '',                       // 부가세(직접입력 or 10%/없음 버튼으로 그때그때 계산)
    };
    return initial && typeof initial === 'object' ? { ...base, ...initial } : base;
  });
  const set = (k) => (e) => setD((p) => ({ ...p, [k]: e && e.target ? e.target.value : e }));
  const setNum = (k) => (e) => setD((p) => ({ ...p, [k]: digitsOnly(e.target.value) }));
  // 부가세 계산 버튼 — 클릭한 순간의 중개보수 기준으로 값만 채움(선택 상태 유지 없음)
  const applyVat = (rate) => setD((p) => ({ ...p, vat: rate === 0 ? '0' : String(Math.round(won(p.fee) * rate)) }));
  const sum = won(d.fee) + won(d.vat);

  // 인쇄 — 우측 미리보기 DOM + 폼 자체 CSS(<style>)만으로 자체완결 문서를 만들어 인쇄(앱 CSS 미포함 → 빈화면 방지)
  const printRef = useRef(null);
  const handlePrint = () => {
    const css = printRef.current?.closest('.bfr-root')?.querySelector('style')?.textContent || '';
    printElement(printRef.current, css, title);
  };

  // 미리보기 1부 — 사무소정보 입력칸은 편집 가능(양부 공유), 거래·보수는 좌측 입력값 표시(읽기전용)
  const Copy = ({ label }) => (
    <div className="bfr-copy">
      <div className="bfr-head">
        <span className="bfr-tag">[{label}]</span>
        <span className="bfr-no">일련번호: {d.serialNo}</span>
      </div>
      <div className="bfr-title">영 수 증</div>
      <div className="bfr-to">귀하</div>

      <table className="bfr-tb"><tbody>
        <tr>
          <th>사업자등록번호</th>
          <td><input className="bfr-in" value={d.bizNo} onChange={set('bizNo')} placeholder="사업자등록번호" /></td>
          <th style={{ width: '90px' }}>작성일자</th>
          <td style={{ width: '150px' }}><input type="date" className="bfr-in" value={d.writeDate} onChange={set('writeDate')} /></td>
        </tr>
        <tr>
          <th>사무소명칭</th>
          <td colSpan={3}><input className="bfr-in" value={d.officeName} onChange={set('officeName')} placeholder="사무소명칭" /></td>
        </tr>
        <tr>
          <th>소재지</th>
          <td colSpan={3}><input className="bfr-in" value={d.officeAddr} onChange={set('officeAddr')} placeholder="소재지" /></td>
        </tr>
        <tr>
          <th>등록번호</th>
          <td><input className="bfr-in" value={d.regNo} onChange={set('regNo')} placeholder="등록번호" /></td>
          <th style={{ width: '90px' }}>대표자 성명</th>
          <td><span style={{ display: 'inline-flex', width: '100%', alignItems: 'center' }}><input className="bfr-in" value={d.repName} onChange={set('repName')} placeholder="대표자" /><span className="bfr-mark">(인)</span></span></td>
        </tr>
        <tr>
          <th>비고</th>
          <td colSpan={3}><input className="bfr-in" value={d.note} onChange={set('note')} placeholder="" /></td>
        </tr>
      </tbody></table>

      <table className="bfr-tb bfr-deal"><tbody>
        <tr>
          <th>중개대상물</th>
          <th style={{ width: '130px' }}>거래금액</th>
          <th style={{ width: '130px' }}>중개보수</th>
        </tr>
        <tr>
          <td style={{ textAlign: 'left' }}>{d.target}</td>
          <td style={{ textAlign: 'right' }}>{fmt(d.tradeAmt)}</td>
          <td style={{ textAlign: 'right' }}>{fmt(d.fee)}<div style={{ fontSize: '12px', color: '#111827' }}>VAT {fmt(d.vat)}</div></td>
        </tr>
        <tr>
          <th colSpan={2}>계</th>
          <td style={{ textAlign: 'right', fontWeight: 800 }}>{sum ? sum.toLocaleString('ko-KR') : '0'}</td>
        </tr>
      </tbody></table>

      <div className="bfr-lead">상기금액을 본 중개대상물에 대한 중개보수로 영수합니다.</div>
      <div className="bfr-logo">네오시스</div>
    </div>
  );

  return (
    <div className={`bfr-root${page ? ' bfr-page' : ''}`}>
      <style>{`
        .bfr-root { position: fixed; inset: 0; background: #eef1f5; display: flex; flex-direction: column; overflow: hidden; }
        /* page 모드(인앱 모달 카드 내부): 전체화면 대신 부모(카드)를 채움 */
        .bfr-root.bfr-page { position: relative; inset: auto; width: 100%; height: 100%; }
        .bfr-bar { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 14px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
        .bfr-bar h2 { font-size: 14px; font-weight: 800; color: #111827; margin: 0; }
        .bfr-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 13px; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 4px; background: white; color: #374151; cursor: pointer; white-space: nowrap; }
        .bfr-btn.primary { background: #4f46e5; border-color: #4f46e5; color: white; }
        .bfr-btn.save { background: #059669; border-color: #059669; color: white; }
        .bfr-cols { flex: 1; min-height: 0; display: flex; }
        /* 좌측 입력 */
        .bfr-left { width: 320px; flex-shrink: 0; overflow-y: auto; background: #f8fafc; border-right: 1px solid #e2e8f0; padding: 16px 16px 24px; }
        .bfr-left-title { font-size: 15px; font-weight: 800; color: #1e293b; margin: 0 0 14px; }
        .bfr-card { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
        .bfr-cap { font-size: 13px; font-weight: 800; color: #111827; letter-spacing: .5px; margin: 0 0 9px; }
        .bfr-fld { margin-bottom: 12px; }
        .bfr-fld:last-child { margin-bottom: 0; }
        .bfr-fld > label { display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 5px; }
        /* 부가세 10%/없음 토글 */
        .bfr-vat-seg { display: inline-flex; gap: 4px; }
        .bfr-vat-seg button { height: 24px; padding: 0 10px; font-size: 13px; font-weight: 700; border: 1.5px solid #c7d2fe; border-radius: 999px; background: #eef2ff; color: #4f46e5; cursor: pointer; }
        .bfr-vat-seg button:hover { background: #4f46e5; color: white; border-color: #4f46e5; }
        .bfr-input { width: 100%; box-sizing: border-box; height: 36px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 10px; font-size: 14px; font-family: inherit; color: #0f172a; background: #fbfdff; }
        .bfr-input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
        .bfr-input.num { text-align: right; font-weight: 700; }
        .bfr-pills { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .bfr-pills button { height: 34px; font-size: 14px; font-weight: 700; border: 1.5px solid #e2e8f0; border-radius: 999px; background: white; color: #111827; cursor: pointer; transition: all .12s; }
        .bfr-pills button.on { border-color: #4f46e5; background: #4f46e5; color: white; box-shadow: 0 2px 6px rgba(79,70,229,.25); }
        .bfr-total { display: flex; align-items: center; justify-content: space-between; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 10px 12px; }
        .bfr-total .lbl { font-size: 13px; font-weight: 700; color: #4338ca; }
        .bfr-total .val { font-size: 17px; font-weight: 800; color: #4338ca; }
        /* 우측 미리보기 */
        .bfr-right { flex: 1; min-width: 0; overflow-y: auto; background: #f1f5f9; padding: 18px; display: flex; flex-direction: column; gap: 18px; align-items: center; }
        .bfr-copy { width: 100%; max-width: 820px; background: white; border: 1px solid #334155; box-sizing: border-box; padding: 16px 22px 20px; font-family: '굴림','Gulim','돋움','Dotum','Malgun Gothic',sans-serif; color: #111; }
        .bfr-head { display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 700; }
        .bfr-tag { color: #1e3a8a; }
        .bfr-title { text-align: center; font-size: 24px; font-weight: 800; letter-spacing: 8px; margin: 6px 0 6px; }
        .bfr-to { text-align: right; font-size: 14px; font-weight: 700; margin: 0 2px 8px; }
        .bfr-tb { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .bfr-tb th { border: 1px solid #94a3b8; background: #eef2f7; font-size: 13px; font-weight: 800; padding: 8px 6px; text-align: center; white-space: nowrap; width: 120px; }
        .bfr-tb td { border: 1px solid #94a3b8; font-size: 14px; font-weight: 700; padding: 4px 8px; height: 22px; }
        .bfr-in { border: none; outline: none; background: transparent; width: 100%; box-sizing: border-box; font-size: 14px; font-weight: 700; font-family: inherit; color: #1d4ed8; padding: 4px 2px; }
        .bfr-in:focus { background: #eff6ff; }
        .bfr-mark { color: #111827; font-weight: 700; margin-left: 6px; white-space: nowrap; }
        .bfr-deal th { background: #eef2f7; }
        .bfr-deal td { height: 40px; vertical-align: top; }
        /* 중개대상물(첫 컬럼): 기본 th 폭(120px) 대신 남는 폭을 모두 사용 → 넓게 */
        .bfr-deal th:first-child, .bfr-deal td:first-child { width: auto; }
        .bfr-lead { font-size: 14px; font-weight: 700; color: #1d4ed8; margin: 10px 2px 0; }
        .bfr-logo { text-align: right; margin-top: 14px; font-size: 15px; font-weight: 800; color: #cbd5e1; letter-spacing: 1px; }
        /* react-to-print: 우측 미리보기(.bfr-right)만 iframe 격리 인쇄 → 계약서/입력패널은 인쇄 안 됨 */
        @media print {
          @page { size: A4; margin: 20mm 20mm 10mm 20mm; }
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .bfr-right { display: block !important; padding: 0 !important; margin: 0 !important; gap: 0 !important; background: #fff !important; }
          /* A4 한 장에 2부(위/아래) + 가운데 점선 절취선 */
          .bfr-copy { max-width: none !important; border: 1px solid #111 !important; min-height: 128mm; box-sizing: border-box; page-break-inside: avoid; }
          .bfr-copy:first-child { border-bottom: 2px dashed #000 !important; }
          .bfr-copy, .bfr-tb th, .bfr-deal th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bfr-in, .bfr-tag, .bfr-lead { color: #111 !important; }
        }
      `}</style>

      {/* 상단 툴바 */}
      <div className="bfr-bar no-print">
        <h2>{title}</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onSave && <button className="bfr-btn save" onClick={async () => { const ok = await onSave(d); if (ok) onClose?.(); }}>저장</button>}
          <button className="bfr-btn primary" onClick={handlePrint}><Printer className="w-4 h-4" /> 인쇄 / 미리보기</button>
          {onClose && <button className="bfr-btn" onClick={onClose}><X className="w-4 h-4" /> 닫기</button>}
        </div>
      </div>

      <div className="bfr-cols">
        {/* 좌측 입력 */}
        <div className="bfr-left no-print">
          <div className="bfr-card">
            <p className="bfr-cap">발행 구분</p>
            <div className="bfr-fld">
              <label>발행 대상</label>
              <div className="bfr-pills">
                {['매도인', '매수인'].map((it) => (
                  <button key={it} className={d.issueTarget === it ? 'on' : ''} onClick={() => set('issueTarget')(it)}>{it}용</button>
                ))}
              </div>
            </div>
            <div className="bfr-fld">
              <label>일련번호</label>
              <input className="bfr-input" value={d.serialNo} onChange={set('serialNo')} placeholder="일련번호" />
            </div>
          </div>

          <div className="bfr-card">
            <p className="bfr-cap">거래 · 보수</p>
            <div className="bfr-fld">
              <label>중개대상물</label>
              <input className="bfr-input" value={d.target} onChange={set('target')} placeholder="중개대상물" />
            </div>
            <div className="bfr-fld">
              <label>거래금액</label>
              <input className="bfr-input num" value={comma(d.tradeAmt)} onChange={setNum('tradeAmt')} placeholder="0" inputMode="numeric" />
            </div>
            <div className="bfr-fld">
              <label>중개보수</label>
              <input className="bfr-input num" value={comma(d.fee)} onChange={setNum('fee')} placeholder="0" inputMode="numeric" />
            </div>
            <div className="bfr-fld">
              <label>부가세
                <span className="bfr-vat-seg">
                  <button type="button" onClick={() => applyVat(0.1)}>10%</button>
                  <button type="button" onClick={() => applyVat(0)}>없음</button>
                </span>
              </label>
              <input className="bfr-input num" value={comma(d.vat)} onChange={setNum('vat')} placeholder="0" inputMode="numeric" />
            </div>
            <div className="bfr-total">
              <span className="lbl">합계 (중개보수 + 부가세)</span>
              <span className="val">{sum.toLocaleString('ko-KR')} 원</span>
            </div>
          </div>
        </div>

        {/* 우측 미리보기 */}
        <div className="bfr-right" ref={printRef}>
          <Copy label={`${d.issueTarget}용`} />
          <div className="bfr-cut no-print" style={{ width: '100%', maxWidth: '820px', textAlign: 'center', borderTop: '2px dashed #94a3b8', color: '#111827', fontSize: '12px', fontWeight: 700, paddingTop: '4px', letterSpacing: '2px' }}>✂ 절취선</div>
          <Copy label="보관용" />
        </div>
      </div>
    </div>
  );
}
