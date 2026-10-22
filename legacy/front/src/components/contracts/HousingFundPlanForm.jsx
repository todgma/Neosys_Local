import React, { useEffect, useMemo, useState } from 'react';
import { openFormWindow } from '../../constants/receiptForms';

/**
 * 주택취득자금 조달 및 입주계획서 (부동산 거래신고 등에 관한 법률 시행규칙 별지 제1호의3서식) — A4 2장
 *  - 1장: ①자금조달계획(자기자금 ②~⑦ / 차입금 ⑧~⑬) + ⑭지급방식 + ⑱입주계획 + 제출문구
 *  - 2장: 유의사항 / 첨부서류 / 작성방법
 *  - 계약서작성 "거래관련서식 > 주택자금조달계획서"에서 호출. 편집 → 미리보기·인쇄.
 */
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const toNum = (v) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isNaN(n) ? 0 : n; };
const fmt = (v) => { const n = toNum(v); return n ? n.toLocaleString('ko-KR') : ''; };
const chk = (b) => (b ? '☑' : '☐');

const 유의사항 = [
  '제출하신 주택취득자금 조달 및 입주계획서는 국세청 등 관계기관에 통보되어, 신고내역 조사 및 관련 세법에 따른 조사 시 참고자료로 활용됩니다.',
  '주택취득자금 조달 및 입주계획서(첨부서류 제출대상인 경우 첨부서류를 포함합니다)를 계약체결일부터 30일 이내에 제출하지 않거나 거짓으로 작성하는 경우 「부동산 거래신고 등에 관한 법률」 제28조제2항 또는 제3항에 따라 과태료가 부과되오니 유의하시기 바랍니다.',
  '이 서식은 부동산거래계약 신고서 접수 전에는 제출이 불가하오니 별도 제출하는 경우에는 미리 부동산거래계약 신고서의 제출여부를 신고서 제출자 또는 신고관청에 확인하시기 바랍니다.',
];
const 첨부인트로 = '투기과열지구에 소재하는 주택의 거래계약을 체결한 경우나 「부동산 거래신고 등에 관한 법률」 제11조제1항에 따른 허가 및 변경허가를 받아 같은 법 제10조에 따른 토지거래허가구역에 소재하는 주택의 거래계약을 체결하는 경우에는 다음 각 호의 구분에 따른 서류를 첨부해야 합니다. 이 경우 주택취득자금 조달 및 입주계획서의 제출일을 기준으로 주택취득에 필요한 자금의 대출이 실행되지 않았거나 본인 소유 부동산의 매매계약이 체결되지 않은 경우 등 항목별 금액 증명이 어려운 경우에는 그 사유서를 첨부해야 합니다.';
const 첨부서류 = [
  '금융기관 예금액 항목을 적은 경우: 예금잔액증명서 등 예금 금액을 증명할 수 있는 서류',
  '주식·채권 매각대금 항목을 적은 경우: 주식거래내역서 또는 예금잔액증명서 등 주식·채권 매각 금액을 증명할 수 있는 서류',
  '증여·상속 항목을 적은 경우: 증여세·상속세 신고서 또는 납세증명서 등 증여 또는 상속받은 금액을 증명할 수 있는 서류',
  '현금 등 그 밖의 자금 항목을 적은 경우: 가. 소득금액증명원 또는 근로소득 원천징수영수증 등 소득을 증명할 수 있는 서류 / 나. 외국환신고(확인)필증 또는 지급수단등의 수출입(변경)신고서 등 외국환의 반입을 증명할 수 있는 서류(외국환의 반입을 신고한 경우만 해당합니다)',
  '부동산 처분대금 등 항목을 적은 경우: 부동산 매매계약서 또는 부동산 임대차계약서 등 부동산 처분 등에 따른 금액을 증명할 수 있는 서류',
  '금융기관 대출액 합계 항목을 적은 경우: 금융거래확인서, 부채증명서 또는 금융기관 대출신청서 등 금융기관으로부터 대출받은 금액을 증명할 수 있는 서류',
  '임대보증금 항목을 적은 경우: 부동산 임대차계약서',
  '회사지원금·사채 또는 그 밖의 차입금 항목을 적은 경우: 금전을 빌린 사실과 그 금액을 확인할 수 있는 서류',
];
const 작성방법 = [
  '① “자금조달계획”에는 해당 주택의 취득에 필요한 자금의 조달계획(부동산 거래신고를 하기 전에 부동산 거래대금이 모두 지급된 경우에는 조달방법)을 적고, 매수인이 다수인 경우 각 매수인별로 작성해야 하며, 각 매수인별 금액을 합산한 총 금액과 거래신고된 주택거래금액이 일치해야 합니다.',
  '② ~ ⑥에는 자기자금을 종류별로 구분하여 중복되지 않게 적습니다.',
  '② “금융기관 예금액”에는 금융기관에 예치되어 있는 본인명의의 예금(적금 등)을 통해 조달하려는 자금을 적습니다. 해외 금융기관에서 국내 금융기관으로 자금을 이체한 경우에는 송금한 해외 금융기관명 및 자금도 적습니다.',
  '③ “주식·채권·가상화폐 매각대금”에는 본인 명의 주식·채권 및 각종 유가증권 매각 등을 통해 조달하려는 자금을 적습니다.',
  '④ “증여·상속”에는 가족 등으로부터 증여 받거나 상속받아 조달하는 자금 및 증여세, 상속세 신고 여부와 금액을 적고, 자금을 제공한 자와의 관계를 해당 난에 √표시를 하며, 부부 외의 경우 해당 관계를 적습니다.',
  '⑤ “현금 등 그 밖의 자금”에는 현금으로 보유하고 있는 자금 및 자기자금 중 다른 항목에 포함되지 않는 그 밖의 본인 자산을 통해 조달하려는 자금(금융기관 예금액 외의 각종 금융상품 및 간접투자상품을 통해 조달하려는 자금 포함)을 적고, 해당 자금이 보유하고 있는 현금일 경우 “보유 현금”에 √표시를 하고, 현금이 아닌 경우 “그 밖의 자산”에 √표시를 하고 자산의 종류를 적습니다.',
  '⑥ “부동산 처분대금 등”에는 본인 소유 부동산의 매도, 기존 임대보증금 회수 등을 통해 조달하려는 자금 또는 재건축, 재개발시 발생한 종전 부동산 권리가액 등을 적습니다.',
  '⑦ “소계”에는 ② ~ ⑥의 합계액을 적습니다.',
  '⑧ ~ ⑪에는 자기자금을 제외한 차입금 등을 종류별로 구분하여 중복되지 않게 적습니다.',
  '⑧ “금융기관 대출액 합계”에는 금융기관으로부터 대출을 통해 조달하려는 자금 또는 매도인의 대출금 승계 자금을 적고, 주택담보대출·신용대출·사업자대출·해외 금융기관 대출인 경우 각 해당 난에 대출액과 금융기관명을 적으며, 그 밖의 대출인 경우 대출액 및 대출 종류를 적습니다. 또한 주택담보 대출액이 있는 경우 “기존 주택 보유 여부”의 해당 난에 √표시를 합니다. 이 경우 기존 주택은 신고하려는 거래계약 대상인 주택은 제외하고, 주택을 취득할 수 있는 권리와 주택을 지분으로 보유하고 있는 경우는 포함하며, “기존 주택 보유 여부” 중 “보유”에 √표시를 한 경우에는 기존 주택 보유 수(지분으로 보유하고 있는 경우에는 각 건별로 계산합니다)를 적습니다.',
  '⑨ “임대보증금”에는 취득 주택의 신규 임대차 계약 또는 매도인으로부터 승계한 임대차 계약의 임대보증금 등 임대를 통해 조달하는 자금을 적습니다.',
  '⑩ “회사지원금·사채”에는 금융기관 외의 법인, 개인사업자로부터 차입을 통해 조달하려는 자금을 적습니다.',
  '⑪ “그 밖의 차입금”에는 ⑧ ~ ⑩에 포함되지 않는 차입금 등을 적고, 자금을 제공한 자와의 관계를 해당 난에 √표시를 하고 부부 외의 경우 해당 관계를 적습니다.',
  '⑫에는 ⑧ ~ ⑪의 합계액을, ⑬에는 ⑦과 ⑫의 합계액을 적습니다.',
  '⑭ “조달자금 지급방식”에는 조달한 자금을 매도인에게 지급하는 방식 등을 각 항목별로 적습니다.',
  '⑮ “계좌이체 금액”에는 금융기관 계좌이체로 지급했거나 지급 예정인 금액 등 금융기관을 통해서 자금지급 확인이 가능한 금액을 적습니다.',
  '⑯ “보증금·대출 승계 금액”에는 종전 임대차계약 보증금 또는 대출금 승계 등 매도인으로부터 승계했거나 승계 예정인 자금의 금액을 적습니다.',
  '⑰ “현금 및 그 밖의 지급방식 금액”에는 ⑮, ⑯ 외의 방식으로 지급했거나 지급 예정인 금액을 적고 계좌이체가 아닌 현금(수표) 등의 방식으로 지급하는 구체적인 사유를 적습니다.',
  '⑱ “입주 계획”에는 해당 주택의 거래계약을 체결한 이후 첫 번째 입주자 기준(다세대, 다가구 등 2세대 이상인 경우에는 해당 항목별 중복하여 적습니다)으로 적으며, “본인입주”란 매수자 및 주민등록상 동일 세대원이 함께 입주하는 경우를, “본인 외 가족입주”란 매수자와 주민등록상 세대가 분리된 가족이 입주하는 경우를 말하며, 이 경우에는 입주 예정 시기 연월을 적습니다. 또한 재건축 추진 또는 멸실 후 신축 등 해당 주택에 입주 또는 임대하지 않는 경우 등에는 “그 밖의 경우”에 √표시를 합니다.',
];

export default function HousingFundPlanForm({ title = '주택취득자금 조달 및 입주계획서', onClose, defaults = {}, page = false, initial = null, onSave = null, embedded = false, onReady = null }) {
  const _base = {
    buyerName: defaults.buyerName || '', buyerRegNo: '', buyerAddr: defaults.buyerAddr || '', buyerPhone: '',
    depositAmt: '', overseasBankName: '', overseasAmt: '',
    chkStock: false, stockBondAmt: '', chkCrypto: false, cryptoAmt: '',
    chkGift: false, giftAmt: '', giftTax: '', chkInherit: false, inheritAmt: '', inheritTax: '',
    rel4Spouse: false, rel4Lineal: false, rel4LinealText: '', rel4Other: false, rel4OtherText: '',
    cashEtcAmt: '', chkForeign: false, foreignAmt: '', foreignReport: '', chkCashHold: false, chkOtherAsset: false, otherAssetType: '',
    chkHouseLand: false, houseLandAmt: '', chkRentDep: false, rentDepAmt: '', chkEtc6: false, etc6Type: '', etc6Amt: '',
    mortgageBank: '', mortgageAmt: '', creditBank: '', creditAmt: '', bizBank: '', bizAmt: '',
    overseasLoanBank: '', overseasLoanAmt: '', otherLoanType: '', otherLoanAmt: '',
    existHousing: '', existHousingCount: '',
    acqRentDeposit: '',
    chkCompany: false, companyAmt: '', chkPrivateBond: false, privateBondAmt: '',
    otherBorrowAmt: '', rel11Spouse: false, rel11Lineal: false, rel11LinealText: '', rel11Other: false, rel11OtherText: '',
    totalDeal: '', transferAmt: '', assumeAmt: '', cashPayAmt: '', payReason: '',
    chkSelfMove: false, chkFamilyMove: false, moveInY: '', moveInM: '', chkRent: false, chkOther: false,
    submitY: '', submitM: '', submitD: '', submitterName: defaults.buyerName || '',
  };
  const [d, setD] = useState(initial && typeof initial === 'object' ? { ..._base, ...initial } : _base);
  const set = (k) => (e) => setD((p) => ({ ...p, [k]: e && e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  const setAmt = (k) => (e) => setD((p) => ({ ...p, [k]: e.target.value }));

  const sums = useMemo(() => {
    const v3 = toNum(d.stockBondAmt) + toNum(d.cryptoAmt);
    const v4 = toNum(d.giftAmt) + toNum(d.inheritAmt);
    const v6 = toNum(d.houseLandAmt) + toNum(d.rentDepAmt) + toNum(d.etc6Amt);
    const v7 = toNum(d.depositAmt) + v3 + v4 + toNum(d.cashEtcAmt) + v6;
    const v8 = toNum(d.mortgageAmt) + toNum(d.creditAmt) + toNum(d.bizAmt) + toNum(d.overseasLoanAmt) + toNum(d.otherLoanAmt);
    const v10 = toNum(d.companyAmt) + toNum(d.privateBondAmt);
    const v12 = v8 + toNum(d.acqRentDeposit) + v10 + toNum(d.otherBorrowAmt);
    const v13 = v7 + v12;
    return { v3, v4, v6, v7, v8, v10, v12, v13 };
  }, [d]);

  const openPreview = () => { if (!openFormWindow(buildHtml(d, sums), title)) alert('팝업이 차단되었습니다. 팝업을 허용해 주세요.'); };

  // 상단 다크바(DocModalShell)에서 인쇄/저장을 호출할 수 있도록 등록
  useEffect(() => {
    if (embedded && onReady) onReady({ print: openPreview, save: () => onSave?.(d) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, embedded]);

  // ── 편집 스타일 ──
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
    : { width: '960px', maxWidth: '96vw', background: 'white', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', overflow: 'hidden' };

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
        <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: 800, margin: '2px 0 12px' }}>주택취득자금 조달 및 입주계획서</div>

        {/* 제출인 */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          <tr>
            <td style={{ ...vlbl, width: '54px' }} rowSpan={2}>제출인<br />(매수인)</td>
            <td style={{ ...lbl, width: '110px' }}>성명(법인명)</td><td style={td}>{txt('buyerName', '100%')}</td>
            <td style={{ ...lbl, width: '150px' }}>주민등록번호<br />(법인·외국인등록번호)</td><td style={td}>{txt('buyerRegNo', '100%')}</td>
          </tr>
          <tr>
            <td style={lbl}>주소(법인소재지)</td><td style={td}>{txt('buyerAddr', '100%')}</td>
            <td style={lbl}>(휴대)전화번호</td><td style={td}>{txt('buyerPhone', '100%')}</td>
          </tr>
        </tbody></table>

        {/* ① 자금조달계획 - 자기자금 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}><tbody>
          <tr>
            <td style={{ ...vlbl }} rowSpan={18}>①<br />자금<br />조달<br />계획</td>
            <td style={{ ...vlbl }} rowSpan={9}>자기<br />자금</td>
            <td style={{ ...lbl, textAlign: 'left', width: '40%' }}>② 금융기관 예금액</td><td style={td}>{amt('depositAmt', '150px')} 원</td>
          </tr>
          <tr><td style={td}>해외예금을 국내 송금한 경우<br />(해외 금융기관명: {txt('overseasBankName', '110px')})</td><td style={td}>{amt('overseasAmt', '150px')} 원</td></tr>
          <tr><td style={{ ...lbl, textAlign: 'left' }}>③ 주식·채권·가상화폐 매각대금</td><td style={td}>{sumCell(sums.v3)}</td></tr>
          <tr><td style={td} colSpan={2}>{cb('chkStock', '주식·채권 매각대금')} {amt('stockBondAmt', '130px')} 원 &nbsp; {cb('chkCrypto', '가상화폐 매각대금')} {amt('cryptoAmt', '130px')} 원</td></tr>
          <tr><td style={{ ...lbl, textAlign: 'left' }}>④ 증여·상속</td><td style={{ ...lbl, textAlign: 'left' }}>⑤ 현금 등 그 밖의 자금 <span style={{ float: 'right' }}>{amt('cashEtcAmt', '130px')} 원</span></td></tr>
          <tr>
            <td style={td}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>{cb('chkGift', '증여')}<span>(금액 : {amt('giftAmt', '110px')} 원)</span></div>
              <div style={{ marginLeft: '24px', marginTop: '3px' }}>증여세 신고 여부 : {yn('giftTax')}</div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>{cb('chkInherit', '상속')}<span>(금액 : {amt('inheritAmt', '110px')} 원)</span></div>
              <div style={{ marginLeft: '24px', marginTop: '3px' }}>상속세 신고 여부 : {yn('inheritTax')}</div>
            </td>
            <td style={{ ...td, verticalAlign: 'top' }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>{cb('chkForeign', '외화')}<span>(금액 : {amt('foreignAmt', '110px')} 원)</span></div>
              <div style={{ marginLeft: '24px', marginTop: '3px' }}>외화반입 신고 여부 : {yn('foreignReport')}</div>
            </td>
          </tr>
          <tr>
            <td style={td}>{cb('rel4Spouse', '부부')} {cb('rel4Lineal', '직계존비속')} 관계 {txt('rel4LinealText', '80px')} {cb('rel4Other', '그 밖의 관계')} {txt('rel4OtherText', '90px')}</td>
            <td style={td}>{cb('chkCashHold', '보유 현금')} &nbsp; {cb('chkOtherAsset', '그 밖의 자산')} 종류 {txt('otherAssetType', '110px')}</td>
          </tr>
          <tr><td style={{ ...lbl, textAlign: 'left' }}>⑥ 부동산 처분대금 등 <span style={{ float: 'right' }}>{sumCell(sums.v6)}</span></td><td style={{ ...lbl, textAlign: 'left' }} rowSpan={2}>⑦ 소계 (②~⑥)<div style={{ textAlign: 'right', marginTop: '10px' }}>{sumCell(sums.v7)}</div></td></tr>
          <tr><td style={td}>
            <div>{cb('chkHouseLand', '주택·토지')} {amt('houseLandAmt', '120px')} 원</div>
            <div style={{ marginTop: '4px' }}>{cb('chkRentDep', '임대보증금(취득주택 외)')} {amt('rentDepAmt', '120px')} 원</div>
            <div style={{ marginTop: '4px' }}>{cb('chkEtc6', '기타')} 종류 {txt('etc6Type', '80px')} {amt('etc6Amt', '110px')} 원</div>
          </td></tr>

          {/* 차입금 등 */}
          <tr>
            <td style={{ ...vlbl }} rowSpan={8}>차입금<br />등</td>
            <td style={{ ...lbl, textAlign: 'left' }} rowSpan={5}>⑧ 금융기관<br />대출액 합계<div style={{ textAlign: 'right', marginTop: '30px' }}>{sumCell(sums.v8)}</div></td>
            <td style={td}><span style={{ display: 'inline-block', width: '120px', fontWeight: 700 }}>주택담보대출</span> (금융기관명: {txt('mortgageBank', '100px')}) {amt('mortgageAmt', '120px')} 원</td>
          </tr>
          <tr><td style={td}><span style={{ display: 'inline-block', width: '120px', fontWeight: 700 }}>신용대출</span> (금융기관명: {txt('creditBank', '100px')}) {amt('creditAmt', '120px')} 원</td></tr>
          <tr><td style={td}><span style={{ display: 'inline-block', width: '120px', fontWeight: 700 }}>사업자대출</span> (금융기관명: {txt('bizBank', '100px')}) {amt('bizAmt', '120px')} 원</td></tr>
          <tr><td style={td}><span style={{ display: 'inline-block', width: '120px', fontWeight: 700 }}>해외 금융기관 대출</span> (금융기관명: {txt('overseasLoanBank', '100px')}) {amt('overseasLoanAmt', '120px')} 원</td></tr>
          <tr><td style={td}><span style={{ display: 'inline-block', width: '120px', fontWeight: 700 }}>그 밖의 대출</span> (대출 종류: {txt('otherLoanType', '100px')}) {amt('otherLoanAmt', '120px')} 원</td></tr>
          <tr><td style={td} colSpan={2}>기존 주택 보유 여부 <span style={{ fontSize: '13px', color: '#111827' }}>(주택담보대출이 있는 경우만 기재)</span> &nbsp; <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600 }}><input type="radio" name="existHousing" checked={d.existHousing === '미보유'} onChange={() => set('existHousing')('미보유')} /> 미보유</label> &nbsp; <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600 }}><input type="radio" name="existHousing" checked={d.existHousing === '보유'} onChange={() => set('existHousing')('보유')} /> 보유</label> ( {txt('existHousingCount', '50px')} 건)</td></tr>
          <tr>
            <td style={{ ...lbl, textAlign: 'left' }}>⑨ 취득주택의 임대보증금 <span style={{ float: 'right' }}>{amt('acqRentDeposit', '120px')} 원</span></td>
            <td style={td}><span style={{ fontSize: '18px', fontWeight: 800 }}>⑩</span> 회사지원금·사채 &nbsp; {cb('chkCompany', '회사지원금')} {amt('companyAmt', '110px')} 원 &nbsp; {cb('chkPrivateBond', '사채')} {amt('privateBondAmt', '110px')} 원</td>
          </tr>
          <tr>
            <td style={td}><span style={{ fontSize: '18px', fontWeight: 800 }}>⑪</span> 그 밖의 차입금 <span style={{ float: 'right' }}>{amt('otherBorrowAmt', '120px')} 원</span><div style={{ marginTop: '6px', clear: 'both' }}>{cb('rel11Spouse', '부부')} {cb('rel11Lineal', '직계존비속')} 관계 {txt('rel11LinealText', '70px')} {cb('rel11Other', '그 밖의 관계')} {txt('rel11OtherText', '80px')}</div></td>
            <td style={{ ...lbl, textAlign: 'left' }}>⑫ 소계<div style={{ textAlign: 'right', marginTop: '10px' }}>{sumCell(sums.v12)}</div></td>
          </tr>
          <tr>
            <td style={{ ...lbl, textAlign: 'left' }} colSpan={2}>⑬ 합계 (⑦+⑫)</td>
            <td style={td}>{sumCell(sums.v13)}</td>
          </tr>
        </tbody></table>

        {/* ⑭ 조달자금 지급방식 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}><tbody>
          <tr><td style={{ ...vlbl }} rowSpan={5}>⑭ 조달<br />자금<br />지급방식</td><td style={{ ...lbl, textAlign: 'left', width: '40%' }}>총 거래금액</td><td style={td}>{amt('totalDeal', '170px')} 원</td></tr>
          <tr><td style={{ ...lbl, textAlign: 'left' }}>⑮ 계좌이체 금액</td><td style={td}>{amt('transferAmt', '170px')} 원</td></tr>
          <tr><td style={{ ...lbl, textAlign: 'left' }}>⑯ 보증금·대출 승계 금액</td><td style={td}>{amt('assumeAmt', '170px')} 원</td></tr>
          <tr><td style={{ ...lbl, textAlign: 'left' }}>⑰ 현금 및 그 밖의 지급방식 금액</td><td style={td}>{amt('cashPayAmt', '170px')} 원</td></tr>
          <tr><td style={td}>지급 사유</td><td style={td}>{txt('payReason', '100%', '지급 사유')}</td></tr>
        </tbody></table>

        {/* ⑱ 입주 계획 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}><tbody>
          <tr>
            <td style={{ ...vlbl, width: '80px' }}>⑱ 입주 계획</td>
            <td style={td}>
              {cb('chkSelfMove', '본인입주')} &nbsp; {cb('chkFamilyMove', '본인 외 가족입주')} &nbsp; (입주 예정 시기: {txt('moveInY', '60px')} 년 {txt('moveInM', '46px')} 월) &nbsp;&nbsp; {cb('chkRent', '임대(전·월세)')} &nbsp; {cb('chkOther', '그 밖의 경우(재건축 등)')}
            </td>
          </tr>
        </tbody></table>

        {/* 제출 문구 */}
        <p style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.7, margin: '14px 0 8px' }}>「부동산 거래신고 등에 관한 법률 시행령」 별표 1 제2호나목, 같은 표 제3호가목 전단, 같은 호 나목, 같은 표 제3호의2가목 전단, 같은 호 나목 및 같은 법 시행규칙 제2조제6항·제7항·제9항·제10항에 따라 위와 같이 주택취득자금 조달 및 입주계획서를 제출합니다.</p>
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
    .hfp{font-family:"Malgun Gothic",sans-serif;color:#000;font-size:12px;}
    .hfp .head{font-size:11px;margin-bottom:4px;display:flex;justify-content:space-between;}
    .hfp .ttl{text-align:center;font-size:22px;font-weight:800;margin:2px 0 4px;}
    .hfp .guide{font-size:11px;margin-bottom:4px;display:flex;justify-content:space-between;}
    .hfp table{width:100%;border-collapse:collapse;}
    .hfp td{border:1px solid #000;padding:5px 7px;font-size:12px;vertical-align:middle;}
    .hfp .lbl{background:#eef3fa;text-align:center;font-weight:700;}
    .hfp .h{background:#eef3fa;text-align:left;font-weight:700;}
    .hfp .g{background:#d7d7d7;}
    .hfp .vlbl{background:#eef3fa;text-align:center;font-weight:700;width:40px;line-height:1.4;word-break:keep-all;}
    .hfp .r{text-align:right;} .hfp .amt{float:right;font-weight:400;} .hfp .amtb{float:right;font-weight:800;}
    .hfp .cn{font-size:1.45em;font-weight:800;line-height:1;}
    .hfp .note{font-size:12px;line-height:1.6;margin:12px 0 8px;}
    .hfp .foot{font-size:11px;text-align:right;color:#333;margin-top:6px;}
    .hfp .bar{text-align:center;background:#d7d7d7;border:1px solid #000;padding:6px;font-size:14px;font-weight:800;margin:0 0 8px;}
    .hfp .warn li{font-size:11.5px;line-height:1.5;margin-bottom:5px;}
  </style>
  <div class="hfp">
    <div class="head"><span>■ 부동산 거래신고 등에 관한 법률 시행규칙 [별지 제1호의3서식] &lt;개정 2026. 2. 6.&gt;</span><span>부동산거래관리시스템(rtms.molit.go.kr)에서도 신청할 수 있습니다.</span></div>
    <div class="ttl">주택취득자금 조달 및 입주계획서</div>
    <div class="guide"><span>※ 색상이 어두운 난은 신청인이 적지 않으며, [ ]에는 해당되는 곳에 √표시를 합니다.</span><span>(앞쪽)</span></div>

    <table><tbody>
      <tr><td class="lbl g" style="width:30%;">접수번호</td><td class="lbl g" style="width:35%;">접수일시</td><td class="lbl g">처리기간</td></tr>
    </tbody></table>
    <table style="border-top:none;"><tbody>
      <tr>
        <td class="vlbl" rowspan="2">제출인<br>(매수인)</td>
        <td class="lbl" style="width:110px;">성명(법인명)</td><td>${c(d.buyerName)}</td>
        <td class="lbl" style="width:150px;">주민등록번호<br>(법인·외국인등록번호)</td><td>${c(d.buyerRegNo)}</td>
      </tr>
      <tr>
        <td class="lbl">주소(법인소재지)</td><td>${c(d.buyerAddr)}</td>
        <td class="lbl">(휴대)전화번호</td><td>${c(d.buyerPhone)}</td>
      </tr>
    </tbody></table>

    <table style="border-top:none;"><tbody>
      <tr>
        <td class="vlbl" rowspan="16">①<br>자금<br>조달<br>계획</td>
        <td class="vlbl" rowspan="7">자기<br>자금</td>
        <td class="h" style="width:40%;">② 금융기관 예금액<span class="amt">${w(d.depositAmt)}</span></td>
        <td class="h">③ 주식·채권·가상화폐 매각대금<span class="amt">${w(s.v3)}</span></td>
      </tr>
      <tr>
        <td>해외예금을 국내 송금한 경우<br>(해외 금융기관명: ${c(d.overseasBankName)})<span class="amt">${w(d.overseasAmt)}</span></td>
        <td>${chk(d.chkStock)} 주식·채권 매각대금<span class="amt">${w(d.stockBondAmt)}</span><br>${chk(d.chkCrypto)} 가상화폐 매각대금<span class="amt">${w(d.cryptoAmt)}</span></td>
      </tr>
      <tr><td class="h">④ 증여·상속</td><td class="h">⑤ 현금 등 그 밖의 자금<span class="amt">${w(d.cashEtcAmt)}</span></td></tr>
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
        <td class="h" rowspan="2" style="vertical-align:top;">⑦ 소계<div style="text-align:right;font-weight:800;margin-top:30px;">${w(s.v7)}</div></td>
      </tr>
      <tr>
        <td>${chk(d.chkHouseLand)} 주택·토지<span class="amt">${w(d.houseLandAmt)}</span><br>${chk(d.chkRentDep)} 임대보증금(취득주택 외)<span class="amt">${w(d.rentDepAmt)}</span><br>${chk(d.chkEtc6)} 기타(종류: ${c(d.etc6Type)})<span class="amt">${w(d.etc6Amt)}</span></td>
      </tr>

      <tr>
        <td class="vlbl" rowspan="8">차입금<br>등</td>
        <td class="h" rowspan="5" style="vertical-align:top;width:26%;">⑧ 금융기관<br>대출액 합계<div style="text-align:right;font-weight:800;margin-top:40px;">${w(s.v8)}</div></td>
        <td>주택담보대출 (금융기관명: ${c(d.mortgageBank)})<span class="amt">${w(d.mortgageAmt)}</span></td>
      </tr>
      <tr><td>신용대출 (금융기관명: ${c(d.creditBank)})<span class="amt">${w(d.creditAmt)}</span></td></tr>
      <tr><td>사업자대출 (금융기관명: ${c(d.bizBank)})<span class="amt">${w(d.bizAmt)}</span></td></tr>
      <tr><td>해외 금융기관 대출 (금융기관명: ${c(d.overseasLoanBank)})<span class="amt">${w(d.overseasLoanAmt)}</span></td></tr>
      <tr><td>그 밖의 대출 (대출 종류: ${c(d.otherLoanType)})<span class="amt">${w(d.otherLoanAmt)}</span></td></tr>
      <tr><td colspan="2">기존 주택 보유 여부 (주택담보대출이 있는 경우만 기재) &nbsp; ${chk(d.existHousing === '미보유')} 미보유 &nbsp; ${chk(d.existHousing === '보유')} 보유 ( ${c(d.existHousingCount)} 건)</td></tr>
      <tr>
        <td class="h">⑨ 취득주택의 임대보증금<span class="amt">${w(d.acqRentDeposit)}</span></td>
        <td>⑩ 회사지원금·사채 &nbsp; ${chk(d.chkCompany)} 회사지원금 ${w(d.companyAmt)} &nbsp; ${chk(d.chkPrivateBond)} 사채 ${w(d.privateBondAmt)}</td>
      </tr>
      <tr>
        <td class="h">⑪ 그 밖의 차입금<span class="amt">${w(d.otherBorrowAmt)}</span><br><span style="font-weight:400;">${chk(d.rel11Spouse)} 부부 &nbsp; ${chk(d.rel11Lineal)} 직계존비속(관계: ${c(d.rel11LinealText)}) &nbsp; ${chk(d.rel11Other)} 그 밖의 관계(${c(d.rel11OtherText)})</span></td>
        <td class="h" style="vertical-align:top;">⑫ 소계<div style="text-align:right;font-weight:800;margin-top:14px;">${w(s.v12)}</div></td>
      </tr>
      <tr>
        <td class="h" colspan="2">⑬ 합계 (⑦+⑫)</td>
        <td><span class="amtb">${w(s.v13)}</span></td>
      </tr>
    </tbody></table>

    <table style="border-top:none;"><tbody>
      <tr><td class="vlbl" rowspan="5" style="width:40px;">⑭ 조달<br>자금<br>지급<br>방식</td><td class="h" style="width:40%;">총 거래금액</td><td><span class="amt">${w(d.totalDeal)}</span></td></tr>
      <tr><td class="h">⑮ 계좌이체 금액</td><td><span class="amt">${w(d.transferAmt)}</span></td></tr>
      <tr><td class="h">⑯ 보증금·대출 승계 금액</td><td><span class="amt">${w(d.assumeAmt)}</span></td></tr>
      <tr><td class="h">⑰ 현금 및 그 밖의 지급방식 금액</td><td><span class="amt">${w(d.cashPayAmt)}</span></td></tr>
      <tr><td>지급 사유</td><td>${c(d.payReason)}</td></tr>
    </tbody></table>

    <table style="border-top:none;"><tbody>
      <tr>
        <td class="vlbl" style="width:60px;">⑱ 입주<br>계획</td>
        <td>${chk(d.chkSelfMove)} 본인입주 &nbsp; ${chk(d.chkFamilyMove)} 본인 외 가족입주 &nbsp;(입주 예정 시기: ${c(d.moveInY)} 년 ${c(d.moveInM)} 월)</td>
        <td style="width:22%;">${chk(d.chkRent)} 임대(전·월세)</td>
        <td style="width:24%;">${chk(d.chkOther)} 그 밖의 경우(재건축 등)</td>
      </tr>
    </tbody></table>

    <p class="note">「부동산 거래신고 등에 관한 법률 시행령」 별표 1 제2호나목, 같은 표 제3호가목 전단, 같은 호 나목, 같은 표 제3호의2가목 전단, 같은 호 나목 및 같은 법 시행규칙 제2조제6항·제7항·제9항·제10항에 따라 위와 같이 주택취득자금 조달 및 입주계획서를 제출합니다.</p>
    <div style="text-align:right;font-size:13px;font-weight:700;margin:16px 0 4px;">${c(d.submitY) === '&nbsp;' ? '_____' : c(d.submitY)} 년 &nbsp; ${c(d.submitM) === '&nbsp;' ? '__' : c(d.submitM)} 월 &nbsp; ${c(d.submitD) === '&nbsp;' ? '__' : c(d.submitD)} 일</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;"><span style="font-size:16px;font-weight:800;">시장ㆍ군수ㆍ구청장 <span style="font-size:12px;font-weight:400;">귀하</span></span><span style="font-size:14px;font-weight:700;">제출인 : ${c(d.submitterName)} <span style="font-weight:400;">(서명 또는 인)</span></span></div>
    <div class="foot">210mm×297mm[백상지(80g/㎡) 또는 중질지(80g/㎡)]</div>
  </div></div><div class="pg"><div class="hfp">
    <div class="guide" style="justify-content:flex-end;"><span>(뒤쪽)</span></div>
    <div class="bar">유 의 사 항</div>
    <ol style="padding-left:20px;margin:0 0 12px;">${유의사항.map((t) => `<li class="warn">${esc(t)}</li>`).join('')}</ol>

    <table><tbody>
      <tr>
        <td class="vlbl" style="width:60px;">첨부<br>서류</td>
        <td>
          <div style="margin-bottom:6px;">${esc(첨부인트로)}</div>
          <ol style="padding-left:20px;margin:0;">${첨부서류.map((t) => `<li class="warn">${esc(t)}</li>`).join('')}</ol>
        </td>
      </tr>
    </tbody></table>

    <div class="bar" style="margin-top:12px;">작 성 방 법</div>
    <ol style="padding-left:20px;margin:0;">${작성방법.map((t) => `<li class="warn">${esc(t)}</li>`).join('')}</ol>
  </div>`;
  // 원문자(①~⑳)를 크고 굵게 강조
  return _h.replace(/([①-⑳])/g, '<span class="cn">$1</span>');
}
