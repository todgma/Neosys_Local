import { propertyService } from './propertyService';
import { customerService } from './customerService';
import apiClient from '../utils/apiClient';
import API_ENDPOINTS from '../config/apiEndpoints';
import { getPropertyTypeLabel } from '../constants/propertyTypes';

/**
 * 통합검색 — 내 물건(소유자/임차인) + 고객(구입자)을 한 번에 검색해 공통 결과로 합침.
 *  결과 항목(item):
 *   { id, kind:'PT'|'CUST', name, phone, ptType, badge, title, sub, persons:[{name,phone,role}] }
 *   - name/phone: 대표 인물(주소록 추가용) / persons: 관련 인물 전체(소유자/임차인/구입자)
 *   - badge: '물건' | '고객' / title, sub: 표시용
 *
 *  ⚠ 현재는 기존 목록 API를 병합하는 클라이언트 버전. (백엔드 전용 통합검색 엔드포인트로 교체 예정)
 */

const num = (v) => (v || v === 0 ? String(v) : '');

// 물건 → 통합 항목
const mapProperty = (p) => {
  const owners = (p.holders || []).filter((h) => h.holderType === 'OWNER');
  const tenants = (p.holders || []).filter((h) => h.holderType === 'BUYER');
  const persons = [
    ...owners.map((h) => ({ name: h.holderName || '', phone: h.holderPhone || '', role: '소유자' })),
    ...tenants.map((h) => ({ name: h.holderName || '', phone: h.holderPhone || '', role: '임차인' })),
  ].filter((x) => x.name || x.phone);
  const primary = persons.find((x) => x.phone) || persons[0] || { name: '', phone: '' };
  const region = [p.addr1, p.addr2, p.addr3].filter(Boolean).join(' ');
  const isApt = ['SYCA101', 'SYCA102', 'SYCA103', 'SYCA105', 'SYCA106', 'SYCA107'].includes(p.ptType) || !!p.danjiCode;
  const building = (isApt ? p.addr4 : p.addr5) || p.ptName || '';
  const addr = [region, building].filter(Boolean).join(' ');
  const personLabel = persons.map((x) => `${x.role} ${x.name || '-'}`).join(', ');
  return {
    id: `PT_${p.ptNo}`,
    kind: 'PT',
    badge: '물건',
    name: primary.name,
    phone: primary.phone,
    ptType: p.ptType,
    title: `${getPropertyTypeLabel(p.ptType) || p.ptType || '물건'} · ${addr || '-'}`,
    sub: personLabel || '-',
    persons,
    raw: p,
  };
};

// 고객 → 통합 항목
const mapCustomer = (c) => {
  const region = (c.wishAreas || '').split(',').map((s) => s.trim()).filter(Boolean);
  const regionText = region.length === 0 ? '-' : region.length === 1 ? region[0] : `${region[0]} 외 ${region.length - 1}곳`;
  return {
    id: `CUST_${c.custNo}`,
    kind: 'CUST',
    badge: '고객',
    name: c.name || '',
    phone: c.tel || '',
    title: `${getPropertyTypeLabel(c.wantType) || c.wantType || '희망물건'} · ${regionText}`,
    sub: `구입자 ${c.name || '-'}`,
    persons: [{ name: c.name || '', phone: c.tel || '', role: '구입자' }],
    raw: c,
  };
};

// 백엔드 통합검색 행 → 통합 항목 (서버 인라인 UNION 쿼리 결과)
//  row: { kind:'PT'|'CUST', refId, typeCode, addr, personsJson, name, phone }
const mapBackendRow = (row) => {
  let persons = [];
  try { persons = JSON.parse(row.personsJson || '[]') || []; } catch { persons = []; }
  persons = persons
    .map((x) => ({ name: x.name || '', phone: x.phone || '', role: x.role || '' }))
    .filter((x) => x.name || x.phone);
  const primary = persons.find((x) => x.phone) || persons[0] || { name: row.name || '', phone: row.phone || '' };

  if (row.kind === 'CUST') {
    const region = (row.addr || '').split(',').map((s) => s.trim()).filter(Boolean);
    const regionText = region.length === 0 ? '-' : region.length === 1 ? region[0] : `${region[0]} 외 ${region.length - 1}곳`;
    return {
      id: `CUST_${row.refId}`,
      kind: 'CUST',
      badge: '고객',
      name: primary.name,
      phone: primary.phone,
      title: `${getPropertyTypeLabel(row.typeCode) || row.typeCode || '희망물건'} · ${regionText}`,
      sub: `구입자 ${primary.name || '-'}`,
      persons: persons.length ? persons : [{ name: primary.name, phone: primary.phone, role: '구입자' }],
      raw: row,
    };
  }
  // PT
  const personLabel = persons.map((x) => `${x.role} ${x.name || '-'}`).join(', ');
  return {
    id: `PT_${row.refId}`,
    kind: 'PT',
    badge: '물건',
    name: primary.name,
    phone: primary.phone,
    ptType: row.typeCode,
    title: `${getPropertyTypeLabel(row.typeCode) || row.typeCode || '물건'} · ${row.addr || '-'}`,
    sub: personLabel || '-',
    persons,
    raw: row,
  };
};

// PascalCase(백엔드) / camelCase 모두 대응
const pick = (obj, ...keys) => {
  for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  return undefined;
};

// 백엔드 전용 통합검색 엔드포인트 호출 (서버 단일 UNION 쿼리)
async function searchUnifiedBackend(q, { user, limit }) {
  const res = await apiClient.get(API_ENDPOINTS.search.unified, {
    q,
    limit,
    ...(user?.offNo != null ? { offNo: user.offNo } : {}),
    ...(user?.rtNo ? { rtNo: user.rtNo } : {}),
  });
  const rawItems = res?.data?.items ?? res?.data?.Items ?? [];
  const items = rawItems.map((r) => mapBackendRow({
    kind: pick(r, 'kind', 'Kind'),
    refId: pick(r, 'refId', 'RefId'),
    typeCode: pick(r, 'typeCode', 'TypeCode'),
    addr: pick(r, 'addr', 'Addr'),
    personsJson: pick(r, 'personsJson', 'PersonsJson'),
    name: pick(r, 'name', 'Name'),
    phone: pick(r, 'phone', 'Phone'),
  }));
  return { items };
}

// 기존 목록 API 병합 (백엔드 엔드포인트 실패 시 fallback)
async function searchUnifiedClientMerge(q, { user, limit }) {
  const [ptRes, custRes] = await Promise.allSettled([
    propertyService.getList(null, null, 1, limit, '', '', '', user?.offNo, user?.rtNo, '', null, null, [], '', 'all', null, q),
    customerService.getList(null, null, null, null, null, null, 1, limit, null, null, null, null, null, q),
  ]);
  const props = (ptRes.status === 'fulfilled' ? (ptRes.value?.data?.ptSales || []) : []).map(mapProperty);
  const custs = (custRes.status === 'fulfilled' ? (custRes.value?.data?.customers || []) : []).map(mapCustomer);
  return { items: [...props, ...custs] };
}

/**
 * 통합검색 실행 — 백엔드 전용 엔드포인트 우선, 실패 시 클라이언트 병합 fallback.
 * @param {string} query 검색어
 * @param {object} opts { user, limit }
 * @returns {Promise<{items:Array}>}
 */
export async function searchUnified(query, opts = {}) {
  const q = (query || '').trim();
  if (!q) return { items: [] };
  const { user, limit = 30 } = opts;

  try {
    return await searchUnifiedBackend(q, { user, limit });
  } catch (e) {
    console.warn('통합검색 백엔드 실패 → 클라이언트 병합 fallback:', e);
    return await searchUnifiedClientMerge(q, { user, limit });
  }
}

// 전화번호(없으면 이름) 기준 중복 제거
const dedupePersons = (persons) => {
  const seen = new Set();
  const out = [];
  persons.forEach((p) => {
    const key = (p.phone || '').replace(/[^0-9]/g, '') || `nm:${p.name}`;
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(p);
  });
  return out;
};

// 거래유형 코드 → 라벨 (물건=SALEDIV, 고객=TRDTYP)
const SALE_DIV_LABEL = { SALEDIV01: '매매', SALEDIV02: '전세', SALEDIV03: '월세', SALEDIV04: '기타임대' };
const CUST_TRD_LABEL = { TRDTYP01: '매매', TRDTYP02: '전세', TRDTYP03: '월세', TRDTYP04: '기타임대' };
// 물건명/상세주소 — 만기관리(ExpiryPage)와 동일 규칙
const APT_ROW_CODES = ['SYCA101', 'SYCA102', 'SYCA103', 'SYCA104', 'SYCA105', 'SYCA106', 'SYCA107', 'SYCA120'];
const isAptRow = (r) => APT_ROW_CODES.includes(r.ptType) || !!r.danjiCode;
const ptDanjiText = (r) => (isAptRow(r) ? r.addr4 : r.addr5) || r.ptName || ''; // 물건명(단지명 또는 입력 물건명)
const ptDetailAddr = (r) => {
  if (r.ptType === 'SYCA115') return r.jibun || ''; // 토지=지번
  const dh = [r.dong ? `${r.dong}동` : '', r.ho ? `${r.ho}호` : ''].filter(Boolean).join(' ');
  return dh || r.jibun || ''; // 그 외=동/호
};
const custRegionText = (c) => {
  const region = (c.wishAreas || c.wishArea || '').split(',').map((s) => s.trim()).filter(Boolean);
  return region.length === 0 ? '' : region.length === 1 ? region[0] : `${region[0]} 외 ${region.length - 1}곳`;
};

/**
 * 조건으로 대상 인물 검색 — 주소록 그룹 신규 등록용(대량문자관리).
 *  · source='property': 물건유형(ptType)+거래유형(tradeType=SALEDIV) → 소유자/임차인
 *    반환 추가필드: ptTypeLabel(물건유형), tradeLabel(거래유형), ptName(물건명), detailAddr(상세주소)
 *  · source='customer': 구입물건유형(wantType)+거래유형(trdType=TRDTYP)+희망지역(region) → 구입자
 *    반환 추가필드: wantLabel(구입유형), tradeLabel(거래유형), region(희망지역)
 */
export async function searchPersonsByCondition({ source, ptType, tradeType, wantType, trdType, region, bjdCode, danjiCode, holderType, user, limit = 300 } = {}) {
  if (source === 'property') {
    const bjdCodes = bjdCode ? [bjdCode] : [];
    const res = await propertyService.getList(null, null, 1, limit, ptType || '', danjiCode || '', '', user?.offNo, user?.rtNo, tradeType || '', null, null, bjdCodes, '', 'all', null, null);
    const list = res?.data?.ptSales || res?.data?.PtSales || [];
    const persons = [];
    list.forEach((p) => {
      const ptName = ptDanjiText(p);
      const detailAddr = ptDetailAddr(p);
      const tradeLabel = p.currentStatus || SALE_DIV_LABEL[tradeType] || '';
      const ptTypeLabel = getPropertyTypeLabel(p.ptType) || p.ptType || '';
      (p.holders || []).forEach((h) => {
        // 소유구분 필터: ''=전체, 'OWNER'=소유자, 'BUYER'=임차인
        if (holderType && h.holderType !== holderType) return;
        const role = h.holderType === 'OWNER' ? '소유자' : h.holderType === 'BUYER' ? '임차인' : '';
        if (!role) return;
        const name = h.holderName || ''; const phone = h.holderPhone || '';
        if (!name && !phone) return;
        persons.push({ name, phone, role, source: '물건', ptType: p.ptType, ptTypeLabel, tradeLabel, ptName, detailAddr });
      });
    });
    return dedupePersons(persons);
  }
  // customer — 구입자
  const res = await customerService.getList(null, null, null, null, user?.offNo, null, 1, limit, wantType || null, trdType || null, null, null, null, null);
  let list = res?.data?.customers || res?.data?.Customers || [];
  const rq = (region || '').trim();
  if (rq) list = list.filter((c) => (c.wishAreas || c.wishArea || '').includes(rq));
  const persons = list
    .map((c) => ({
      name: c.name || '', phone: c.tel || '', role: '구입자', source: '고객',
      wantType: c.wantType, wantLabel: getPropertyTypeLabel(c.wantType) || c.wantType || '',
      tradeLabel: (c.trdType || '').split(',').map((s) => CUST_TRD_LABEL[s.trim()]).filter(Boolean).join('·'),
      region: custRegionText(c),
    }))
    .filter((x) => x.name || x.phone);
  return dedupePersons(persons);
}

export default { searchUnified, searchPersonsByCondition };
