// 거래구분(매매/전세/월세/기타임대) + 각 구분별 상태(해당없음/활성/생각/예정/보류)
//  - 저장: sale_div 컬럼에 콤마구분 코드 문자열. '해당없음'은 코드 없음(배열에서 제외).
//  - 활성 코드 = 기존 SALEDIV0n (기존 데이터 호환). 상태는 접미(S/Y/B) 부착.
//    → 백엔드 필터가 LIKE '%SALEDIV0n%' 이므로 접미 코드도 자동 매칭(백엔드 수정 불필요).

export const TRADE_DIVISIONS = [
  { key: 'sale', base: 'SALEDIV01', label: '매매', ch: '매', amt: ['saleAmt'] },
  { key: 'lease', base: 'SALEDIV02', label: '전세', ch: '전', amt: ['lesAmt'] },
  { key: 'month', base: 'SALEDIV03', label: '월세', ch: '월', amt: ['protAmt', 'monAmt'] },
  { key: 'etc', base: 'SALEDIV04', label: '기타임대', ch: '기', amt: ['etcAmt', 'etcAmt2'] },
];

// 상태(드롭다운 옵션). id=내부값, suffix=코드접미(활성='', 해당없음=null), ch=목록문자(활성은 구분문자 사용)
export const DIV_STATUS_OPTIONS = [
  { id: 'none', suffix: null, label: '없음' },
  { id: 'active', suffix: '', label: null /* 라벨은 구분명 사용 */ },
  { id: 'think', suffix: 'S', label: '생각', ch: '생' },
  { id: 'plan', suffix: 'Y', label: '예정', ch: '예' },
  { id: 'hold', suffix: 'B', label: '보류', ch: '보' },
];

const BY_SUFFIX = {};
DIV_STATUS_OPTIONS.forEach((o) => { if (o.suffix !== null) BY_SUFFIX[o.suffix] = o; });

export const NONE_CH = '-';

export const divCode = (base, suffix) => (suffix ? base + suffix : base);

// 코드 문자열 → { div, status } (알 수 없으면 null)
export const parseDivCode = (code) => {
  const c = String(code || '').trim();
  if (!c) return null;
  const div = TRADE_DIVISIONS.find((d) => c.startsWith(d.base));
  if (!div) return null;
  const suffix = c.slice(div.base.length);
  const status = BY_SUFFIX[suffix] || BY_SUFFIX['']; // 알 수 없는 접미 → 활성 취급
  return { div, status };
};

// saleDiv(배열 또는 콤마문자열) → { [divKey]: statusId }  (없는 구분은 'none')
export const saleDivToStatusMap = (saleDiv) => {
  const arr = Array.isArray(saleDiv) ? saleDiv : String(saleDiv || '').split(',');
  const map = {};
  TRADE_DIVISIONS.forEach((d) => { map[d.key] = 'none'; });
  arr.map((s) => String(s).trim()).filter(Boolean).forEach((code) => {
    const p = parseDivCode(code);
    if (p) map[p.div.key] = p.status.id;
  });
  return map;
};

// { [divKey]: statusId } → 코드 배열 ('none' 제외)
export const statusMapToSaleDiv = (map) => TRADE_DIVISIONS
  .filter((d) => map[d.key] && map[d.key] !== 'none')
  .map((d) => {
    const o = DIV_STATUS_OPTIONS.find((x) => x.id === map[d.key]) || DIV_STATUS_OPTIONS[1];
    return divCode(d.base, o.suffix);
  });

// 목록 표기 문자: 구분 + statusId → '매'/'생'/'예'/'보'/'-'
export const divStatusCh = (div, statusId) => {
  if (!statusId || statusId === 'none') return NONE_CH;
  if (statusId === 'active') return div.ch;
  const o = DIV_STATUS_OPTIONS.find((x) => x.id === statusId);
  return (o && o.ch) || NONE_CH;
};

// 드롭다운 옵션 라벨(활성은 구분명 사용)
export const statusOptionLabel = (div, o) => (o.id === 'active' ? div.label : o.label);

// 상세/뷰 공용 라벨: 활성=구분명, 생각/예정/보류=구분명(상태). 여러 구분은 sep로 연결. 없으면 '-'
export const saleDivLabel = (saleDiv, sep = '\n') => {
  const parts = String(saleDiv || '').split(',').map((s) => s.trim()).filter(Boolean).map((code) => {
    const p = parseDivCode(code);
    if (!p) return code;
    return p.status.id === 'active' ? p.div.label : `${p.div.label}(${p.status.label})`;
  });
  return parts.length ? parts.join(sep) : '-';
};

// 특정 구분(base 코드)이 '없음'이 아닌지 — 상태 접미 무관. 예: hasDivision(saleDiv, 'SALEDIV01')
export const hasDivision = (saleDiv, base) => String(saleDiv || '').split(',').some((c) => c.trim().startsWith(base));
