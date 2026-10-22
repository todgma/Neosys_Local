import React, { useEffect, useMemo, useState } from 'react';
import { openFormWindow } from '../../constants/receiptForms';

/**
 * 토지취득자금 조달계획서 (부동산 거래신고 등에 관한 법률 시행규칙 별지 제10호서식) — A4 2장
 *  - 1장: 조달계획(자기자금 ①~⑧ / 차입금 ⑨~⑬) + 제출문구, 2장: 유의사항.
 *  - 계약서작성 "거래관련서식 > 토지자금조달계획서"에서 호출. 편집 → 미리보기·인쇄. 새 창(page)/폴백 지원.
 */
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const toNum = (v) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isNaN(n) ? 0 : n; };
const fmt = (v) => { const n = toNum(v); return n ? n.toLocaleString('ko-KR') : ''; };
const chk = (b) => (b ? '☑' : '☐');

const 유의사항 = [
  '① “자기자금”란에는 자기자금을 종류별로 구분하여 중복되지 않게 적습니다.',
  '② “금융기관 예금액”란에는 금융기관에 예치되어 있는 본인명의의 예금(적금 등)을 통해 조달하려는 자금을 적습니다. 해외 금융기관에서 국내 금융기관으로 자금을 이체한 경우에는 송금한 해외 금융기관명 및 자금도 적습니다.',
  '③ “주식·채권·가상화폐 매각대금”란에는 본인 명의의 주식·채권 및 각종 유가증권 매각 등을 통해 조달하려는 자금을 적습니다.',
  '④ “증여·상속”란에는 가족 등으로부터 증여 받거나 상속받아 조달하는 자금 및 증여세, 상속세 신고 여부와 금액을 적고, 자금을 제공한 자와의 관계를 해당 난에 √표시를 하며, 부부 외의 경우 그 관계를 적습니다.',
  '⑤ “현금 등 그 밖의 자금”란에는 현금으로 보유하고 있는 자금 및 자기자금 중 다른 항목에 포함되지 않는 그 밖의 본인 자산을 통해 조달하려는 자금(금융기관 예금액 외의 각종 금융상품 및 간접투자상품을 통해 조달하려는 자금 포함)을 적고, 해당 자금이 보유하고 있는 현금일 경우 “보유 현금”에 √표시를 하며, 현금이 아닌 경우 “그 밖의 자산”에 √표시를 하고 자산의 종류를 적습니다.',
  '⑥ “부동산 처분대금 등”란에는 본인 소유 부동산의 처분을 통해 조달하려는 자금을 적습니다.',
  '⑦ “토지보상금”란에는 「공익사업을 위한 토지 등의 취득 및 보상에 관한 법률」 등에 따른 공익사업 등의 시행으로 토지를 양도하거나 토지가 수용되어 지급받는 보상금 중 조달하려는 자금을 적으며, 토지보상금을 지급받은 후 금융기관에 예탁하거나 현금으로 보유하고 있더라도 ⑦란에 기재합니다.',
  '⑧ “소계”란에는 ② ~ ⑦란의 합계액을 적습니다.',
  '⑩란 및 ⑪란에는 자기 자금을 제외한 차입금 등을 종류별로 구분하여 중복되지 않게 적습니다.',
  '⑩ “금융기관 대출액 합계”란에는 금융기관으로부터 대출을 통해 조달하려는 자금을 적고, 토지담보대출ㆍ신용대출ㆍ해외 금융기관 대출인 경우 각 해당 난에 대출액과 금융기관명을 적으며, 그 밖의 대출인 경우 대출액 및 대출 종류를 적습니다.',
  '⑪ “그 밖의 차입금”란에는 ⑩란에 포함되지 않는 차입금 등을 적고, 자금을 제공한 자와의 관계를 해당 난에 √표시를 하고 부부 외의 경우 그 관계를 적습니다.',
  '⑫란에는 ⑩란 및 ⑪란의 합계액을, ⑬란에는 ⑧란과 ⑫란의 합계액을 적습니다.',
];

export default function LandFundPlanForm({ title = '토지취득자금 조달계획서', onClose, defaults = {}, page = false, initial = null, onSave = null, embedded = false, onReady = null }) {
  const _base = {
    buyerName: defaults.buyerName || '', buyerRegNo: '', buyerAddr: defaults.buyerAddr || '', buyerPhone: '',
    depositAmt: '', overseasBankName: '', overseasAmt: '',
    chkStock: false, stockBondAmt: '', chkCrypto: false, cryptoAmt: '',
    chkGift: false, giftAmt: '', giftTax: '', chkInherit: false, inheritAmt: '', inheritTax: '',
    rel4Spouse: false, rel4Lineal: false, rel4LinealText: '', rel4Other: false, rel4OtherText: '',
    cashEtcAmt: '', chkForeign: false, foreignAmt: '', foreignReport: '', chkCashHold: false, chkOtherAsset: false, otherAssetType: '',
    chkHouseLand: false, houseLandAmt: '', chkEtcRealty: false, etcRealtyType: '', etcRealtyAmt: '',
    landCompAmt: '',
    landMortgageBank: '', landMortgageAmt: '', creditBank: '', creditAmt: '',
    overseasLoanBank: '', overseasLoanAmt: '', otherLoanType: '', otherLoanAmt: '',
    otherBorrowAmt: '', rel11Spouse: false, rel11Lineal: false, rel11LinealText: '', rel11Other: false, rel11OtherText: '',
    submitY: '', submitM: '', submitD: '', submitterName: defaults.buyerName || '',
  };
  const [d, setD] = useState(initial && typeof initial === 'object' ? { ..._base, ...initial } : _base);
  const set = (k) => (e) => setD((p) => ({ ...p, [k]: e && e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  const setAmt = (k) => (e) => setD((p) => ({ ...p, [k]: e.target.value }));

  // 자동 합계
  const sums = useMemo(() => {
    const v3 = toNum(d.stockBondAmt) + toNum(d.cryptoAmt);
    const v4 = toNum(d.giftAmt) + toNum(d.inheritAmt);
    const v6 = toNum(d.houseLandAmt) + toNum(d.etcRealtyAmt);
    const v10 = toNum(d.landMortgageAmt) + toNum(d.creditAmt) + toNum(d.overseasLoanAmt) + toNum(d.otherLoanAmt);
    const v8 = toNum(d.depositAmt) + v3 + v4 + toNum(d.cashEtcAmt) + v6 + toNum(d.landCompAmt);
    const v12 = v10 + toNum(d.otherBorrowAmt);
    const v13 = v8 + v12;
    return { v3, v4, v6, v8, v10, v12, v13 };
  }, [d]);

  const openPreview = () => { if (!openFormWindow(buildHtml(d, sums), title)) alert('팝업이 차단되었습니다. 팝업을 허용해 주세요.'); };

  // 상단 다크바(DocModalShell)에서 인쇄/저장을 호출할 수 있도록 등록
  useEffect(() => {
    if (embedded && onReady) onReady({ print: openPreview, save: () => onSave?.(d) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, embedded]);

  // ── 편집 스타일 (가독성 위해 15px 기준) ──
  const td = { border: '1px solid #334155', padding: '6px 8px', fontSize: '15px', verticalAlign: 'middle' };
  const lbl = { ...td, background: '#eaf2fb', textAlign: 'center', fontWeight: 800, whiteSpace: 'nowrap', color: '#1e293b', fontSize: '16px' };
  const vlbl = { ...lbl, fontSize: '16px', lineHeight: 1.4, padding: '4px 8px' };
  const inp = { border: 'none', outline: 'none', fontSize: '15px', fontWeight: 600, padding: '4px 5px', background: 'transparent', fontFamily: 'inherit', color: '#111827', boxSizing: 'border-box' };
  const amt = (k, w = '130px') => <input value={fmt(d[k])} onChange={setAmt(k)} style={{ ...inp, width: w, textAlign: 'right' }} placeholder="0" />;
  const txt = (k, w = '130px', ph = '') => <input value={d[k]} onChange={set(k)} style={{ ...inp, width: w }} placeholder={ph} />;
  const cb = (k, label) => <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}><input type="checkbox" checked={!!d[k]} onChange={set(k)} style={{ width: '16px', height: '16px' }} /> {label}</label>;
  // 신고/미신고 √표시(라디오) 쌍
  const yn = (k) => (
    <span style={{ whiteSpace: 'nowrap' }}>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginRight: '10px' }}><input type="radio" name={k} checked={d[k] === '신고'} onChange={() => set(k)('신고')} /> 신고</label>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}><input type="radio" name={k} checked={d[k] === '미신고'} onChange={() => set(k)('미신고')} /> 미신고</label>
    </span>
  );
  const sumCell = (v) => <span style={{ fontWeight: 800, fontSize: '15px', color: '#1d4ed8' }}>{fmt(v) || 0} 원</span>;

  const rootStyle = embedded
    ? { width: '100%', background: 'white' }
    : page
    ? { width: '100%', flex: 1, minHeight: 0, background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
    : { width: '900px', maxWidth: '96vw', background: 'white', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', overflow: 'hidden' };

  const card = (
    <div onClick={(e) => e.stopPropagation()} style={rootStyle}>
      {!embedded && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>{title}</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={openPreview} style={{ padding: '7px 16px', fontSize: '14px', fontWeight: 700, color: '#fff', background: '#4f46e5', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>미리보기 · 인쇄</button>
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#111827' }}>×</button>
          </div>
        </div>
      )}

      <div style={{ padding: '14px 18px', maxHeight: (page || embedded) ? 'none' : '80vh', flex: page ? 1 : undefined, minHeight: page ? 0 : undefined, overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: 800, margin: '2px 0 12px' }}>토지취득자금 조달계획서</div>

        {/* 제출인 */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          <tr>
            <td style={{ ...vlbl, width: '30px' }} rowSpan={2}>제출인<br />(매수인)</td>
            <td style={{ ...lbl, width: '120px' }}>성명(법인명)</td>
            <td style={td}>{txt('buyerName', '100%')}</td>
            <td style={{ ...lbl, width: '160px' }}>주민등록번호<br />(법인·외국인등록번호)</td>
            <td style={td}>{txt('buyerRegNo', '100%')}</td>
          </tr>
          <tr>
            <td style={lbl}>주소(법인소재지)</td>
            <td style={td}>{txt('buyerAddr', '100%')}</td>
            <td style={lbl}>(휴대)전화번호</td>
            <td style={td}>{txt('buyerPhone', '100%')}</td>
          </tr>
        </tbody></table>

        {/* 자기자금 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}><tbody>
          <tr>
            <td style={{ ...vlbl }} rowSpan={11}>①<br />자기자금</td>
            <td style={{ ...lbl, width: '46%' }}>② 금융기관 예금액</td>
            <td style={td}>{amt('depositAmt', '150px')} 원</td>
          </tr>
          <tr>
            <td style={td}>해외예금을 국내로 송금한 경우<br />(해외 금융기관명: {txt('overseasBankName', '120px')})</td>
            <td style={td}>{amt('overseasAmt', '150px')} 원</td>
          </tr>
          <tr>
            <td style={lbl}>③ 주식·채권·가상화폐 매각대금</td>
            <td style={td}>{sumCell(sums.v3)}</td>
          </tr>
          <tr>
            <td style={td} colSpan={2}>{cb('chkStock', '주식·채권 매각대금')} {amt('stockBondAmt', '130px')} 원 &nbsp; {cb('chkCrypto', '가상화폐 매각대금')} {amt('cryptoAmt', '130px')} 원</td>
          </tr>
          <tr>
            <td style={lbl}>④ 증여·상속</td>
            <td style={td}>{sumCell(sums.v4)}</td>
          </tr>
          <tr>
            <td style={td} colSpan={2}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>{cb('chkGift', '증여')}<span>(금액 : {amt('giftAmt', '110px')} 원)</span></div>
              <div style={{ marginLeft: '24px', marginTop: '3px' }}>증여세 신고 여부 : {yn('giftTax')}</div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>{cb('chkInherit', '상속')}<span>(금액 : {amt('inheritAmt', '110px')} 원)</span></div>
              <div style={{ marginLeft: '24px', marginTop: '3px' }}>상속세 신고 여부 : {yn('inheritTax')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
                {cb('rel4Spouse', '부부')} {cb('rel4Lineal', '직계존비속')} 관계 {txt('rel4LinealText', '90px')} {cb('rel4Other', '그 밖의 관계')} {txt('rel4OtherText', '110px')}
              </div>
            </td>
          </tr>
          <tr>
            <td style={lbl}>⑤ 현금 등 그 밖의 자금</td>
            <td style={td}>{amt('cashEtcAmt', '150px')} 원</td>
          </tr>
          <tr>
            <td style={td} colSpan={2}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>{cb('chkForeign', '외화')}<span>(금액 : {amt('foreignAmt', '110px')} 원)</span></div>
              <div style={{ marginLeft: '24px', marginTop: '3px' }}>외화반입 신고 여부 : {yn('foreignReport')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', marginTop: '6px' }}>
                {cb('chkCashHold', '보유 현금')} {cb('chkOtherAsset', '그 밖의 자산')} 종류 {txt('otherAssetType', '130px')}
              </div>
            </td>
          </tr>
          <tr>
            <td style={lbl}>⑥ 부동산 처분대금 등</td>
            <td style={td}>{sumCell(sums.v6)}</td>
          </tr>
          <tr>
            <td style={td} colSpan={2}>
              {cb('chkHouseLand', '주택·토지')} {amt('houseLandAmt', '130px')} 원 &nbsp; {cb('chkEtcRealty', '기타')} 종류 {txt('etcRealtyType', '90px')} {amt('etcRealtyAmt', '110px')} 원
              <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ ...lbl, padding: '3px 8px', border: 'none', background: 'none' }}>⑦ 토지보상금</span> {amt('landCompAmt', '150px')} 원</div>
            </td>
          </tr>
          <tr>
            <td style={lbl}>⑧ 소계 (② ~ ⑦)</td>
            <td style={td}>{sumCell(sums.v8)}</td>
          </tr>
        </tbody></table>

        {/* 차입금 등 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}><tbody>
          <tr>
            <td style={vlbl} rowSpan={7}>⑨<br />차입금 등</td>
            <td style={{ ...lbl, width: '46%' }}>⑩ 금융기관 대출액 합계</td>
            <td style={td}>{sumCell(sums.v10)}</td>
          </tr>
          <tr><td style={td}>토지담보대출 (금융기관명: {txt('landMortgageBank', '110px')})</td><td style={td}>{amt('landMortgageAmt', '150px')} 원</td></tr>
          <tr><td style={td}>신용대출 (금융기관명: {txt('creditBank', '110px')})</td><td style={td}>{amt('creditAmt', '150px')} 원</td></tr>
          <tr><td style={td}>해외 금융기관 대출 (금융기관명: {txt('overseasLoanBank', '110px')})</td><td style={td}>{amt('overseasLoanAmt', '150px')} 원</td></tr>
          <tr><td style={td}>그 밖의 대출 (대출 종류: {txt('otherLoanType', '110px')})</td><td style={td}>{amt('otherLoanAmt', '150px')} 원</td></tr>
          <tr>
            <td style={td}>
              <div style={{ ...lbl, padding: '3px 8px', border: 'none', background: 'none', textAlign: 'left' }}>⑪ 그 밖의 차입금 &nbsp; {amt('otherBorrowAmt', '130px')} 원</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                {cb('rel11Spouse', '부부')} {cb('rel11Lineal', '직계존비속')} 관계 {txt('rel11LinealText', '90px')} {cb('rel11Other', '그 밖의 관계')} {txt('rel11OtherText', '110px')}
              </div>
            </td>
            <td style={td}><div style={{ ...lbl, padding: '3px 8px', border: 'none', background: 'none' }}>⑫ 소계 (⑩+⑪)</div>{sumCell(sums.v12)}</td>
          </tr>
        </tbody></table>

        {/* 합계 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}><tbody>
          <tr><td style={{ ...lbl, width: '46%' }}>⑬ 합계 (⑧+⑫)</td><td style={td}>{sumCell(sums.v13)}</td></tr>
        </tbody></table>

        {/* 제출 문구 / 일자 / 제출인 */}
        <p style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.7, margin: '14px 0 8px' }}>「부동산 거래신고 등에 관한 법률」제11조제1항, 같은 법 시행령 제8조제1항 및 같은 법 시행규칙 제9조제2항제2호에 따라 위와 같이 토지취득자금 조달계획을 제출합니다.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {txt('submitY', '70px', '____')}<span style={{ fontWeight: 700 }}>년</span>
          {txt('submitM', '50px', '__')}<span style={{ fontWeight: 700 }}>월</span>
          {txt('submitD', '50px', '__')}<span style={{ fontWeight: 700 }}>일</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '16px', fontWeight: 800 }}>시장ㆍ군수ㆍ구청장 <span style={{ fontSize: '13px', fontWeight: 600 }}>귀하</span></span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 800 }}>제출인</span>{txt('submitterName', '180px', '성명')}<span style={{ fontWeight: 700 }}>(서명 또는 인)</span>
          </span>
        </div>
      </div>

      {!embedded && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 18px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', background: 'white', border: '1px solid #cbd5e1', borderRadius: '5px', cursor: 'pointer' }}>닫기</button>
          {onSave && (
            <button onClick={async () => { const ok = await onSave(d); if (ok) onClose?.(); }} style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 700, color: '#fff', background: '#059669', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>저장</button>
          )}
          <button onClick={openPreview} style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 700, color: '#fff', background: '#4f46e5', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>미리보기 · 인쇄</button>
        </div>
      )}
    </div>
  );

  if (embedded) return card;
  if (page) {
    return <div style={{ position: 'fixed', inset: 0, background: 'white', display: 'flex', flexDirection: 'column' }}>{card}</div>;
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px' }}>
      {card}
    </div>
  );
}

// ── A4 2장 인쇄 HTML ──
function buildHtml(d, s) {
  const c = (v) => (v == null || v === '' ? '&nbsp;' : esc(v));
  const w = (v) => `${fmt(v) || 0} 원`;
  const _h = `
  <style>
    .lfp{font-family:"Malgun Gothic",sans-serif;color:#000;font-size:12px;}
    .lfp .head{font-size:11px;margin-bottom:4px;}
    .lfp .ttl{text-align:center;font-size:22px;font-weight:800;margin:2px 0 10px;}
    .lfp .side{text-align:right;font-size:11px;margin-bottom:2px;}
    .lfp table{width:100%;border-collapse:collapse;}
    .lfp td{border:1px solid #000;padding:5px 7px;font-size:12px;vertical-align:middle;}
    .lfp .lbl{background:#eef3fa;text-align:center;font-weight:700;}
    .lfp .h{background:#eef3fa;text-align:left;font-weight:700;}
    .lfp .vlbl{background:#eef3fa;text-align:center;font-weight:700;width:42px;line-height:1.4;word-break:keep-all;}
    .lfp .r{text-align:right;} .lfp .b{font-weight:800;}
    .lfp .amt{float:right;font-weight:400;}
    .lfp .amtb{float:right;font-weight:800;}
    .lfp .cn{font-size:1.45em;font-weight:800;line-height:1;}
    .lfp .note{font-size:12px;line-height:1.6;margin:12px 0 8px;}
    .lfp .foot{font-size:11px;text-align:right;color:#333;margin-top:6px;}
    .lfp .warn h3{text-align:center;background:#dcdcdc;border:1px solid #000;padding:6px;font-size:15px;font-weight:800;margin:0 0 10px;}
    .lfp .warn li{font-size:12px;line-height:1.55;margin-bottom:6px;}
  </style>
  <div class="lfp">
    <div class="head">■ 부동산 거래신고 등에 관한 법률 시행규칙 [별지 제10호서식] &lt;개정 2026. 2. 6.&gt;</div>
    <div class="ttl">토지취득자금 조달계획서</div>
    <div class="side">(앞쪽)</div>

    <table><tbody>
      <tr>
        <td class="vlbl" rowspan="2">제출인<br>(매수인)</td>
        <td class="lbl" style="width:120px;">성명(법인명)</td><td>${c(d.buyerName)}</td>
        <td class="lbl" style="width:150px;">주민등록번호<br>(법인·외국인등록번호)</td><td>${c(d.buyerRegNo)}</td>
      </tr>
      <tr>
        <td class="lbl">주소(법인소재지)</td><td>${c(d.buyerAddr)}</td>
        <td class="lbl">(휴대)전화번호</td><td>${c(d.buyerPhone)}</td>
      </tr>
    </tbody></table>

    <table style="border-top:none;"><tbody>
      <tr>
        <td class="vlbl" rowspan="8">①<br>자기자금</td>
        <td class="h" style="width:44%;">② 금융기관 예금액<span class="amt">${w(d.depositAmt)}</span></td>
        <td class="h" style="width:44%;">③ 주식·채권·가상화폐 매각대금<span class="amt">${w(s.v3)}</span></td>
      </tr>
      <tr>
        <td>해외예금을 국내로 송금한 경우<br>(해외 금융기관명: ${c(d.overseasBankName)})<span class="amt">${w(d.overseasAmt)}</span></td>
        <td>${chk(d.chkStock)} 주식·채권 매각대금<span class="amt">${w(d.stockBondAmt)}</span><br>${chk(d.chkCrypto)} 가상화폐 매각대금<span class="amt">${w(d.cryptoAmt)}</span></td>
      </tr>
      <tr>
        <td class="h">④ 증여·상속</td>
        <td class="h">⑤ 현금 등 그 밖의 자금<span class="amt">${w(d.cashEtcAmt)}</span></td>
      </tr>
      <tr>
        <td>${chk(d.chkGift)} 증여(금액 : ${w(d.giftAmt)})<br>&nbsp;&nbsp;&nbsp;증여세 신고 여부 : ${chk(d.giftTax === '신고')}신고 ${chk(d.giftTax === '미신고')}미신고<br>${chk(d.chkInherit)} 상속(금액 : ${w(d.inheritAmt)})<br>&nbsp;&nbsp;&nbsp;상속세 신고 여부 : ${chk(d.inheritTax === '신고')}신고 ${chk(d.inheritTax === '미신고')}미신고</td>
        <td>${chk(d.chkForeign)} 외화(금액: ${w(d.foreignAmt)})<br>&nbsp;&nbsp;&nbsp;외화반입 신고 여부 : ${chk(d.foreignReport === '신고')}신고 ${chk(d.foreignReport === '미신고')}미신고</td>
      </tr>
      <tr>
        <td>${chk(d.rel4Spouse)} 부부 &nbsp; ${chk(d.rel4Lineal)} 직계존비속(관계: ${c(d.rel4LinealText)})<br>${chk(d.rel4Other)} 그 밖의 관계(${c(d.rel4OtherText)})</td>
        <td>${chk(d.chkCashHold)} 보유 현금<br>${chk(d.chkOtherAsset)} 그 밖의 자산(종류: ${c(d.otherAssetType)})</td>
      </tr>
      <tr>
        <td class="h">⑥ 부동산 처분대금 등<span class="amt">${w(s.v6)}</span></td>
        <td class="h" rowspan="2" style="vertical-align:top;">⑦ 토지보상금<div style="text-align:right;font-weight:400;margin-top:26px;">${w(d.landCompAmt)}</div></td>
      </tr>
      <tr>
        <td>${chk(d.chkHouseLand)} 주택·토지<span class="amt">${w(d.houseLandAmt)}</span><br>${chk(d.chkEtcRealty)} 기타(종류: ${c(d.etcRealtyType)})<span class="amt">${w(d.etcRealtyAmt)}</span></td>
      </tr>
      <tr>
        <td class="h" colspan="2">⑧ 소계<span class="amtb">${w(s.v8)}</span></td>
      </tr>
    </tbody></table>

    <table style="border-top:none;"><tbody>
      <tr>
        <td class="vlbl" rowspan="6">⑨<br>차입금 등</td>
        <td class="h" rowspan="4" style="vertical-align:top;width:24%;">⑩ 금융기관 대출액 합계<div style="text-align:right;font-weight:800;margin-top:46px;">${w(s.v10)}</div></td>
        <td class="h" style="width:18%;">토지담보대출</td>
        <td>(금융기관명: ${c(d.landMortgageBank)})<span class="amt">${w(d.landMortgageAmt)}</span></td>
      </tr>
      <tr><td class="h">신용대출</td><td>(금융기관명: ${c(d.creditBank)})<span class="amt">${w(d.creditAmt)}</span></td></tr>
      <tr><td class="h">해외 금융기관 대출</td><td>(금융기관명: ${c(d.overseasLoanBank)})<span class="amt">${w(d.overseasLoanAmt)}</span></td></tr>
      <tr><td class="h">그 밖의 대출</td><td>(대출 종류: ${c(d.otherLoanType)})<span class="amt">${w(d.otherLoanAmt)}</span></td></tr>
      <tr>
        <td class="h">⑪ 그 밖의 차입금<span class="amt">${w(d.otherBorrowAmt)}</span></td>
        <td class="h" colspan="2" rowspan="2" style="vertical-align:top;">⑫ 소계<div style="text-align:right;font-weight:800;margin-top:16px;">${w(s.v12)}</div></td>
      </tr>
      <tr>
        <td>${chk(d.rel11Spouse)} 부부 &nbsp; ${chk(d.rel11Lineal)} 직계존비속(관계: ${c(d.rel11LinealText)})<br>${chk(d.rel11Other)} 그 밖의 관계(${c(d.rel11OtherText)})</td>
      </tr>
    </tbody></table>

    <table style="border-top:none;"><tbody>
      <tr><td class="h" style="width:14%;text-align:center;">⑬ 합계</td><td><span class="amtb">${w(s.v13)}</span></td></tr>
    </tbody></table>

    <p class="note">「부동산 거래신고 등에 관한 법률」제11조제1항, 같은 법 시행령 제8조제1항 및 같은 법 시행규칙 제9조제2항제2호에 따라 위와 같이 토지취득자금 조달계획을 제출합니다.</p>
    <div style="text-align:right;font-size:13px;font-weight:700;margin:16px 0 4px;">${c(d.submitY) === '&nbsp;' ? '_____' : c(d.submitY)} 년 &nbsp; ${c(d.submitM) === '&nbsp;' ? '__' : c(d.submitM)} 월 &nbsp; ${c(d.submitD) === '&nbsp;' ? '__' : c(d.submitD)} 일</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;"><span style="font-size:16px;font-weight:800;">시장ㆍ군수ㆍ구청장 <span style="font-size:12px;font-weight:400;">귀하</span></span><span style="font-size:14px;font-weight:700;">제출인 : ${c(d.submitterName)} <span style="font-weight:400;">(서명 또는 인)</span></span></div>
    <div class="foot">210mm×297mm[백상지(80g/㎡) 또는 중질지(80g/㎡)]</div>
  </div></div><div class="pg"><div class="lfp">
    <div class="side">(뒤쪽)</div>
    <div class="warn">
      <h3>유 의 사 항</h3>
      <ol style="padding-left:20px;margin:0;">
        ${유의사항.map((t) => `<li>${esc(t)}</li>`).join('')}
      </ol>
    </div>
  </div>`;
  // 원문자(①~⑳)를 크고 굵게 강조
  return _h.replace(/([①-⑳])/g, '<span class="cn">$1</span>');
}
