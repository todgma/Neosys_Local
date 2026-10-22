// 서식자료실 영수증 서식(HTML) + A4 새 창 미리보기/인쇄 헬퍼 — 계약관리/계약서작성 공용

const _box = '<span style="display:inline-block;width:22px;height:24px;border:1px solid #000;margin:0 1px;vertical-align:middle;"></span>';
const _taxBoxes = _box.repeat(3) + '<span style="margin:0 4px;">-</span>' + _box.repeat(2) + '<span style="margin:0 4px;">-</span>' + _box.repeat(5);

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cell = (v) => (v == null || v === '') ? '&nbsp;' : esc(v);
const chk = (on) => (on ? '☑' : '☐');

// 영수증1 (부동산중개업법시행규칙 별지27호 서식) — d 값이 있으면 채워서 렌더
export const buildReceipt1Html = (d = {}) => {
  const rows = (Array.isArray(d.rows) && d.rows.length ? d.rows : [{}, {}, {}, {}]);
  const bottom = rows.map((r) => `<tr>
      <td style="border:1px solid #000;height:40px;text-align:center;font-size:12px;">${cell(r.date)}</td>
      <td style="border:1px solid #000;text-align:center;font-size:12px;">${cell(r.target)}</td>
      <td style="border:1px solid #000;text-align:right;padding:0 6px;font-size:12px;">${cell(r.tradeAmt)}</td>
      <td style="border:1px solid #000;text-align:right;padding:0 6px;font-size:12px;">${cell(r.feeTotal)}</td>
      <td style="border:1px solid #000;text-align:right;padding:0 6px;font-size:12px;">${cell(r.sellerFee)}</td>
      <td style="border:1px solid #000;text-align:right;padding:0 6px;font-size:12px;">${cell(r.buyerFee)}</td>
    </tr>`).join('');
  return `
  <div style="font-size:12px;margin-bottom:6px;">[부동산중개업법시행규칙 별지27호 서식]</div>
  <table style="width:100%;border-collapse:collapse;border:2px solid #000;"><tbody>
    <tr>
      <td style="border:1px solid #000;text-align:center;font-size:40px;font-weight:800;letter-spacing:16px;padding:26px 0;width:58%;">영 수 증</td>
      <td style="border:1px solid #000;padding:14px 16px;font-size:13px;line-height:2;vertical-align:top;">
        일련번호 : <span style="display:inline-block;border-bottom:1px solid #000;min-width:120px;">${cell(d.serialNo)}</span><br>${chk(d.use === '보관')} 사무소 보관용<br>${chk(d.use === '매도')} 매도(임대)자용<br>${chk(d.use === '매수')} 매수(임차)자용
      </td>
    </tr>
  </tbody></table>
  <table style="width:100%;border-collapse:collapse;border:2px solid #000;border-top:none;"><tbody>
    <tr>
      <td rowspan="4" style="border:1px solid #000;width:26px;text-align:center;font-weight:700;font-size:13px;">중<br>개<br>업<br>자</td>
      <td style="border:1px solid #000;width:100px;text-align:center;font-weight:700;font-size:13px;padding:6px;">납세번호</td>
      <td style="border:1px solid #000;padding:8px;" colspan="4">${d.taxNo ? esc(d.taxNo) : _taxBoxes}</td>
    </tr>
    <tr>
      <td style="border:1px solid #000;text-align:center;font-weight:700;font-size:13px;padding:6px;">사무소명칭</td>
      <td style="border:1px solid #000;padding:10px;" colspan="2">${cell(d.officeName)}</td>
      <td style="border:1px solid #000;text-align:center;font-weight:700;font-size:12px;padding:6px;width:80px;">성 명<br>(대표자)</td>
      <td style="border:1px solid #000;padding:10px;text-align:right;width:130px;">${cell(d.repName)} 印</td>
    </tr>
    <tr><td style="border:1px solid #000;text-align:center;font-weight:700;font-size:13px;padding:6px;">사무소소재지</td><td style="border:1px solid #000;padding:10px;" colspan="4">${cell(d.officeAddr)}</td></tr>
    <tr><td style="border:1px solid #000;text-align:center;font-weight:700;font-size:13px;padding:6px;">등록번호</td><td style="border:1px solid #000;padding:10px;" colspan="4">${cell(d.regNo)}</td></tr>
  </tbody></table>
  <table style="width:100%;border-collapse:collapse;border:2px solid #000;border-top:none;"><tbody>
    <tr>
      <td style="border:1px solid #000;width:120px;text-align:center;font-weight:700;font-size:14px;padding:8px;">작성년월일</td>
      <td style="border:1px solid #000;text-align:center;font-weight:700;font-size:14px;padding:8px;letter-spacing:8px;">금 액</td>
      <td style="border:1px solid #000;width:230px;text-align:center;font-weight:700;font-size:14px;padding:8px;letter-spacing:8px;">비 고</td>
    </tr>
    <tr>
      <td style="border:1px solid #000;height:58px;text-align:center;">${cell(d.writeDate)}</td>
      <td style="border:1px solid #000;text-align:right;padding:0 12px;font-size:15px;">${cell(d.amount)}</td>
      <td style="border:1px solid #000;padding:0 8px;">${cell(d.note)}</td>
    </tr>
  </tbody></table>
  <div style="text-align:center;font-size:16px;font-weight:700;letter-spacing:6px;margin:12px 0;">위 금액을 영 수 함</div>
  <table style="width:100%;border-collapse:collapse;border:2px solid #000;"><tbody>
    <tr>
      <td rowspan="2" style="border:1px solid #000;text-align:center;font-weight:700;font-size:13px;width:120px;padding:6px;">년 월 일</td>
      <td rowspan="2" style="border:1px solid #000;text-align:center;font-weight:700;font-size:12px;width:90px;padding:6px;">중개(확인)<br>대상물</td>
      <td rowspan="2" style="border:1px solid #000;text-align:center;font-weight:700;font-size:13px;padding:6px;letter-spacing:6px;">거 래 액</td>
      <td colspan="3" style="border:1px solid #000;text-align:center;font-weight:700;font-size:13px;padding:6px;">수수료 또는 실비</td>
    </tr>
    <tr>
      <td style="border:1px solid #000;text-align:center;font-weight:700;font-size:13px;width:90px;padding:6px;">계</td>
      <td style="border:1px solid #000;text-align:center;font-weight:700;font-size:11px;width:120px;padding:6px;">매도(임대)자<br>부 담</td>
      <td style="border:1px solid #000;text-align:center;font-weight:700;font-size:11px;width:120px;padding:6px;">매수(임차)자<br>부 담</td>
    </tr>
    ${bottom}
  </tbody></table>
`;
};

// ── 공과금 등 정산서 (한국공인중개사협회 서식) ──────────────────────────────
const arr = (a) => (Array.isArray(a) ? a : []);
const won0 = (v) => {
  const s = String(v ?? '').replace(/[^\d.-]/g, '');
  const n = Number(s || 0);
  return '₩' + (Number.isNaN(n) ? 0 : n).toLocaleString('ko-KR');
};
const toNum = (v) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isNaN(n) ? 0 : n; };

// 정산총액 = 관리비 + 가스/전기/수도/장기수선충당금/기타의 각 정산금액 합계
export const calcUtilityTotal = (d = {}) => {
  let t = toNum(d.mgmtFee);
  ['gas', 'elec', 'water', 'longRepair', 'etc'].forEach((k) => arr(d[k]).forEach((r) => { t += toNum(r.amount); }));
  return t;
};

export const buildUtilitySettlementHtml = (d = {}) => {
  const meterRows = (rows) => (arr(rows).length ? arr(rows) : [{}]).map((r) => `<tr>
      <td class="c">${cell(r.meter)}</td>
      <td class="r">${cell(r.usage)}</td>
      <td class="c">${cell(r.period)}</td>
      <td class="a">${won0(r.amount)}</td></tr>`).join('');
  const lrRows = (arr(d.longRepair).length ? arr(d.longRepair) : [{}]).map((r) => `<tr>
      <td class="c">${cell(r.period)}</td>
      <td class="r">${cell(r.months)}</td>
      <td class="r">${won0(r.monthly)}</td>
      <td class="a">${won0(r.amount)}</td></tr>`).join('');
  const etcRows = (arr(d.etc).length ? arr(d.etc) : [{}]).map((r) => `<tr>
      <td>${cell(r.content)}</td>
      <td class="a" style="width:200px;">${won0(r.amount)}</td></tr>`).join('');
  const total = calcUtilityTotal(d);
  const etcText = esc(d.etcText || '').replace(/\n/g, '<br>');
  return `
  <style>
    .us{font-family:"Malgun Gothic",sans-serif;color:#000;}
    .us .ttl{text-align:center;font-size:26px;font-weight:800;letter-spacing:10px;margin:0 0 14px;}
    .us .sec{font-size:14px;font-weight:800;margin:12px 0 4px;}
    .us .lead{font-size:15px;font-weight:800;margin:10px 0 6px;}
    .us table{width:100%;border-collapse:collapse;}
    .us .t td{border:1px solid #000;font-size:12px;padding:5px 8px;height:30px;}
    .us .t .h td{font-weight:700;text-align:center;background:#f4f6f9;}
    .us .lbl{font-weight:700;text-align:center;background:#f4f6f9;}
    .us .c{text-align:center;} .us .r{text-align:right;} .us .a{text-align:right;font-weight:700;width:200px;}
    .us .addr{border:1px solid #000;padding:7px 10px;font-size:14px;font-weight:700;}
    .us .big{border:1px solid #000;min-height:90px;padding:8px 10px;font-size:13px;line-height:1.6;}
    .us .foot{margin-top:14px;font-size:13px;font-weight:700;}
    .us .foot td{padding:4px 6px;}
    .us .issue{text-align:center;font-size:14px;font-weight:700;margin-top:8px;}
  </style>
  <div class="us">
    <div class="ttl">공 과 금 등 정 산 서</div>
    <div class="lead">[물건 소재지]</div>
    <div class="addr">${cell(d.address)}</div>
    <div class="lead">[정 산 내 역]</div>

    <div class="sec">1. 관리비.</div>
    <table class="t"><tbody><tr>
      <td class="lbl" style="width:40%;">관리비 정산액(관리사무소 확인분)</td>
      <td>${cell(d.mgmtMemo)}</td>
      <td class="a">${won0(d.mgmtFee)}</td>
    </tr></tbody></table>

    <div class="sec">2. 가스요금.</div>
    <table class="t"><tbody>
      <tr class="h"><td style="width:22%;">검침 수치</td><td style="width:22%;">정산 사용량</td><td>정산 기간</td><td style="width:200px;">정산 금액</td></tr>
      ${meterRows(d.gas)}
    </tbody></table>

    <div class="sec">3. 전기요금.</div>
    <table class="t"><tbody>
      <tr class="h"><td style="width:22%;">검침 수치</td><td style="width:22%;">정산 사용량</td><td>정산 기간</td><td style="width:200px;">정산 금액</td></tr>
      ${meterRows(d.elec)}
    </tbody></table>

    <div class="sec">4. 수도요금.</div>
    <table class="t"><tbody>
      <tr class="h"><td style="width:22%;">검침 수치</td><td style="width:22%;">정산 사용량</td><td>정산 기간</td><td style="width:200px;">정산 금액</td></tr>
      ${meterRows(d.water)}
    </tbody></table>

    <div class="sec">5. 장기수선충당금.</div>
    <table class="t"><tbody>
      <tr class="h"><td style="width:32%;">납입 기간</td><td style="width:18%;">납입 개월수</td><td style="width:22%;">월납입액</td><td style="width:200px;">정산 금액</td></tr>
      ${lrRows}
    </tbody></table>

    <div class="sec">6. 기타 사항</div>
    <table class="t"><tbody>${etcRows}</tbody></table>

    <div class="sec">7. 정산총액</div>
    <table class="t"><tbody><tr>
      <td class="lbl" style="width:90px;">정산총액</td>
      <td class="lbl" style="width:90px;">정산내역</td>
      <td>${cell(d.totalNote)}</td>
      <td class="a">${won0(total)}</td>
    </tr></tbody></table>

    <div class="lead" style="margin-top:14px;">[기타사항]</div>
    <div class="big">${etcText || '&nbsp;'}</div>

    <table class="foot"><tbody><tr>
      <td style="width:44%;">${cell(d.officeName)}</td>
      <td style="width:30%;">[담당자] ${cell(d.repName)}</td>
      <td>${cell(d.officePhone)}</td>
    </tr></tbody></table>
    <div class="issue">발행일 : ${cell(d.issueDate)}</div>
  </div>`;
};

export const UTILITY_SETTLEMENT_HTML = buildUtilitySettlementHtml();

// ── 잔금 정산서 (매매/임대차/전세) ──────────────────────────────────────────
// 잔금 정산액 = Σ( 가감이 '-' 이면 -금액, 그 외 +금액 )
export const calcBalanceTotal = (rows = []) => arr(rows).reduce((t, r) => t + (r.sign === '-' ? -toNum(r.amount) : toNum(r.amount)), 0);

export const buildBalanceSettlementHtml = (d = {}) => {
  const rows = arr(d.rows);
  const total = calcBalanceTotal(rows);
  const body = rows.map((r) => `<tr>
      <td class="c" style="font-weight:700;">${cell(r.item)}</td>
      <td class="c">${r.sign ? esc(r.sign) : '&nbsp;'}</td>
      <td class="a">${won0(r.amount)}</td>
      <td>${cell(r.note)}</td></tr>`).join('');
  const etcText = esc(d.etcText || '').replace(/\n/g, '<br>');
  return `
  <style>
    .bs{font-family:"Malgun Gothic",sans-serif;color:#000;}
    .bs .ttl{text-align:center;font-size:24px;font-weight:800;margin:0 0 18px;}
    .bs .lead{font-size:15px;font-weight:800;margin:12px 0 6px;}
    .bs .addr{border-bottom:1px solid #000;padding:6px 4px;font-size:14px;font-weight:700;min-height:20px;}
    .bs table{width:100%;border-collapse:collapse;}
    .bs .t td{border:1px solid #000;font-size:13px;padding:6px 8px;height:26px;}
    .bs .t .h td{font-weight:700;text-align:center;background:#f4f6f9;}
    .bs .c{text-align:center;} .bs .a{text-align:right;}
    .bs .big{border:1px solid #000;min-height:120px;padding:8px 10px;font-size:13px;line-height:1.6;}
    .bs .issue{text-align:center;font-size:15px;font-weight:800;margin-top:16px;}
    .bs .confirm{text-align:center;font-size:13px;font-weight:600;margin-top:4px;}
    .bs .sign td{padding:14px 6px 4px;font-size:14px;font-weight:700;width:50%;}
    .bs .ln{display:inline-block;border-bottom:1px solid #000;min-width:160px;text-align:center;}
    .bs .office{text-align:center;font-size:13px;font-weight:700;margin-top:10px;}
    .bs .office .ln{min-width:150px;}
  </style>
  <div class="bs">
    <div class="ttl">${cell(d.title)}</div>
    <div class="lead">[물건 소재지]</div>
    <div class="addr">${cell(d.address)}</div>
    <div class="lead">[정산 내역]</div>
    <table class="t"><tbody>
      <tr class="h"><td style="width:32%;">적요</td><td style="width:12%;">가감</td><td style="width:26%;">금액(원)</td><td>비고</td></tr>
      ${body}
      <tr><td class="c" style="font-weight:800;">잔금 정산액</td><td class="c">&nbsp;</td><td class="a" style="font-weight:800;">${won0(total)}</td><td>&nbsp;</td></tr>
    </tbody></table>
    <div class="lead" style="margin-top:16px;">[기타 사항]</div>
    <div class="big">${etcText || '&nbsp;'}</div>
    <div class="issue">발행일 : ${cell(d.issueText)}</div>
    <div class="confirm">상기 내역을 확인하고 정산 수령 합니다.</div>
    <table class="sign"><tbody><tr>
      <td>${cell(d.p1Label)} : <span class="ln">${cell(d.p1Name)}</span> (인)</td>
      <td>${cell(d.p2Label)} : <span class="ln">${cell(d.p2Name)}</span> (인)</td>
    </tr></tbody></table>
    <div class="office"><span class="ln">${cell(d.officeName)}</span> &nbsp; 연락처 : <span class="ln">${cell(d.officePhone)}</span></div>
  </div>`;
};

// ── 중개보수 영수증 (발행대상 매도인/매수인, 사업자등록번호) ─────────────────
export const buildBrokerFeeReceiptHtml = (d = {}) => {
  const targetLabel = d.issueTarget === '매수인' ? '매수(임차)인' : '매도(임대)인';
  return `
  <style>
    .bf{font-family:"Malgun Gothic",sans-serif;color:#000;}
    .bf .top{display:flex;justify-content:space-between;align-items:flex-end;font-size:13px;font-weight:700;margin-bottom:6px;}
    .bf .ttl{text-align:center;font-size:28px;font-weight:800;letter-spacing:12px;margin:6px 0 2px;}
    .bf .to{text-align:right;font-size:14px;font-weight:700;margin-bottom:8px;}
    .bf table{width:100%;border-collapse:collapse;}
    .bf td{border:1px solid #000;font-size:13px;padding:7px 8px;}
    .bf .lbl{background:#eaf2fb;text-align:center;font-weight:700;white-space:nowrap;}
    .bf .vlbl{background:#eaf2fb;text-align:center;font-weight:700;writing-mode:vertical-rl;letter-spacing:4px;width:26px;}
    .bf .c{text-align:center;} .bf .r{text-align:right;}
    .bf .confirm{text-align:right;font-size:14px;font-weight:700;margin:8px 2px;}
  </style>
  <div class="bf">
    <div class="top"><span>[${targetLabel}용]</span><span>일련번호 : <span style="display:inline-block;border-bottom:1px solid #000;min-width:120px;">${cell(d.serialNo)}</span></span></div>
    <div class="ttl">중 개 보 수 영 수 증</div>
    <div class="to">${targetLabel} 귀하</div>

    <table><tbody>
      <tr>
        <td class="vlbl" rowspan="5">개업공인중개사</td>
        <td class="lbl" style="width:120px;">사업자등록번호</td>
        <td colspan="3">${cell(d.bizNo)}</td>
      </tr>
      <tr><td class="lbl">사무소 명칭</td><td colspan="3">${cell(d.officeName)}</td></tr>
      <tr><td class="lbl">성명(대표자)</td><td colspan="3">${cell(d.repName)} <span style="float:right;">(인)</span></td></tr>
      <tr><td class="lbl">사무소 소재지</td><td colspan="3">${cell(d.officeAddr)}</td></tr>
      <tr><td class="lbl">등록번호</td><td colspan="3">${cell(d.regNo)}</td></tr>
    </tbody></table>

    <table style="border-top:none;"><tbody>
      <tr>
        <td class="lbl" style="width:120px;">작성년월일</td>
        <td class="lbl">중개보수 총액</td>
        <td class="lbl">비 고</td>
      </tr>
      <tr>
        <td class="c" style="width:120px;">${cell(d.writeDate)}</td>
        <td class="r">${won0(d.feeTotal)} 원</td>
        <td>${cell(d.note)}</td>
      </tr>
    </tbody></table>
    <div class="confirm">위의 금액을 영수합니다.</div>

    <table><tbody>
      <tr>
        <td class="lbl" rowspan="2" style="width:110px;">년 월 일</td>
        <td class="lbl" rowspan="2" style="width:150px;">중개(확인)대상물</td>
        <td class="lbl" rowspan="2" style="width:130px;">거래액</td>
        <td class="lbl" colspan="3">중개보수 및 실비</td>
      </tr>
      <tr>
        <td class="lbl" style="width:90px;">계</td>
        <td class="lbl" style="width:120px;">매도인(임대인)</td>
        <td class="lbl" style="width:120px;">매수인(임차인)</td>
      </tr>
      <tr>
        <td class="c">${cell(d.dealDate)}</td>
        <td>${cell(d.target)}</td>
        <td class="r">${won0(d.tradeAmt)}</td>
        <td class="r">${won0(d.feeSum)}</td>
        <td class="r">${won0(d.feeSeller)}</td>
        <td class="r">${won0(d.feeBuyer)}</td>
      </tr>
      <tr>
        <td class="lbl" colspan="3">중개보수 부가가치세</td>
        <td class="r">${won0(d.vatSum)}</td>
        <td class="r">${won0(d.vatSeller)}</td>
        <td class="r">${won0(d.vatBuyer)}</td>
      </tr>
    </tbody></table>
  </div>`;
};

// 영수증1 빈 서식(서식자료실 미리보기용)
export const RECEIPT1_HTML = buildReceipt1Html();
// 영수증2 — 영수증1과 동일 서식(별도 서식 확정 전까지 공용)
export const RECEIPT2_HTML = buildReceipt1Html();

export const FORM_HTML = { receipt1: RECEIPT1_HTML, receipt2: RECEIPT2_HTML };

// 서식 HTML을 A4 새 창으로 열고 인쇄 버튼 제공. 성공 true / (팝업차단·HTML없음) false
export const openFormWindow = (html, title = '서식 미리보기') => {
  if (!html) return false;
  // Electron: 메인 프로세스 인쇄(printHtml)로 위임 — window.open+document.write는 Electron에서 빈화면이 되는 문제 방지
  if (typeof window !== 'undefined' && window.electronAPI?.printHtml) {
    const doc = '<!doctype html><html><head><meta charset="utf-8"><title>' + title + '</title>'
      + '<style>@page{size:A4;margin:20mm 20mm 10mm 20mm;}body{margin:0;background:#fff;font-family:"Malgun Gothic",sans-serif;color:#000;}'
      + '.pg{width:210mm;min-height:297mm;background:#fff;padding:5px;box-sizing:border-box;}'
      + '@media print{.pg{width:auto;min-height:0;page-break-after:always;}.pg:last-child{page-break-after:auto;}}</style></head><body>'
      + '<div class="pg">' + html + '</div></body></html>';
    try { window.electronAPI.printHtml(doc); return true; } catch (e) { console.error('인쇄 실패:', e); }
  }
  const w = window.open('', '_blank', 'width=900,height=1040');
  if (!w) return false;
  w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + title + '</title>'
    + '<style>@page{size:A4;margin:20mm 20mm 10mm 20mm;}body{margin:0;background:#e2e8f0;display:flex;flex-direction:column;align-items:center;gap:20px;padding:20px;font-family:"Malgun Gothic",sans-serif;color:#000;}'
    + '.pg{width:210mm;min-height:297mm;background:#fff;padding:5px;box-sizing:border-box;box-shadow:0 2px 12px rgba(0,0,0,.15);}'
    + '@media print{body{background:#fff;padding:0;gap:0;}.pg{box-shadow:none;width:auto;min-height:0;page-break-after:always;}.pg:last-child{page-break-after:auto;}.pv-bar{display:none;}}'
    + '.pv-bar{position:fixed;top:10px;right:14px;z-index:9;}.pv-bar button{padding:6px 14px;font-size:13px;font-weight:600;color:#fff;background:#4f46e5;border:none;border-radius:4px;cursor:pointer;}</style></head><body>'
    + '<div class="pv-bar"><button onclick="window.print()">인쇄</button></div><div class="pg">' + html + '</div></body></html>');
  w.document.close();
  return true;
};
