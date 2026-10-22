import apiClient from '../utils/apiClient';
import API_ENDPOINTS from '../config/apiEndpoints';
import { getPropertyTypeLabel } from '../constants/propertyTypes';
import { saleDivLabel } from '../constants/tradeDivisions';

/**
 * 네오봇 전용 서비스 — 공용 통합검색(unifiedSearchService)과 분리된 복사본.
 *  · search(): /api/neobot/search  (물건 PT / 고객 CUST / 계약 CT)
 *  · getDetail(): 클릭 항목의 상세(요약 + 소유자/임차인|희망지역 + 상담이력 + 일정)
 *  응답은 camelCase/PascalCase 모두 대응.
 */

// camelCase(기본) / PascalCase 모두 대응
const pick = (obj, ...keys) => {
  for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  return undefined;
};

// 거래유형 코드 → 라벨
const TRADE_LABEL = {
  SALEDIV01: '매매', SALEDIV02: '전세', SALEDIV03: '월세', SALEDIV04: '기타임대',
};
const tradeLabel = (code) => {
  if (!code) return '';
  const first = String(code).split(',')[0];
  return TRADE_LABEL[first] || first;
};

// 백엔드 검색 행 → 네오봇 항목
const mapRow = (r) => {
  const kind = pick(r, 'kind', 'Kind');
  const refId = pick(r, 'refId', 'RefId');
  const typeCode = pick(r, 'typeCode', 'TypeCode');
  const addr = pick(r, 'addr', 'Addr') || '';
  const name = pick(r, 'name', 'Name') || '';
  const phone = pick(r, 'phone', 'Phone') || '';
  const amount = pick(r, 'amount', 'Amount');
  const subInfo = pick(r, 'subInfo', 'SubInfo') || '';
  const refDate = pick(r, 'refDate', 'RefDate');
  let persons = [];
  try { persons = JSON.parse(pick(r, 'personsJson', 'PersonsJson') || '[]') || []; } catch { persons = []; }
  persons = persons
    .map((x) => ({ name: x.name || '', phone: x.phone || '', role: x.role || '', past: !!x.past }))
    .filter((x) => x.name || x.phone);

  // 가계약/계약 — 물건처럼 계약서종류(typeCode=doc_type) · 주소 를 제목, 거래유형을 둘째줄에 표기
  if (kind === 'PRE') {
    const trade = tradeLabel(subInfo);
    return {
      kind: 'PRE', refId, type: '가계약', category: '가계약',
      title: `${typeCode || '가계약'} · ${addr || '-'}`,
      sub: trade ? `[${trade}]` : '', persons, typeCode, amount, subInfo, refDate, name, phone,
    };
  }
  if (kind === 'CT') {
    const trade = tradeLabel(subInfo);
    return {
      kind: 'CT', refId, type: '계약', category: '계약',
      title: `${typeCode || '계약서'} · ${addr || '-'}`,
      sub: trade ? `[${trade}]` : '', persons, typeCode, amount, subInfo, refDate, name, phone,
    };
  }
  if (kind === 'CUST') {
    const region = addr.split(',').map((s) => s.trim()).filter(Boolean);
    const regionText = region.length === 0 ? '-' : region.length === 1 ? region[0] : `${region[0]} 외 ${region.length - 1}곳`;
    return {
      kind: 'CUST', refId, type: '고객', category: '구입자',
      title: `${getPropertyTypeLabel(typeCode) || typeCode || '희망물건'} · ${regionText}`,
      sub: regionText, persons, typeCode, amount, subInfo, refDate, name, phone,
    };
  }
  // PT — subInfo = sale_div CSV → 거래구분 라벨(매매(생각)/매매(보류)/전세 …)
  const trade = saleDivLabel(subInfo, ' · ');
  const sub = trade !== '-' ? `[${trade}]` : '';
  return {
    kind: 'PT', refId, type: '물건', category: '물건명',
    title: `${getPropertyTypeLabel(typeCode) || typeCode || '물건'} · ${addr || '-'}`,
    sub, persons, typeCode, amount, subInfo, refDate, name, phone, trade,
  };
};

// 상담이력 정규화 → ConsultationCard 표시 형태 { itvNo, datetime, userId, content }
const normConsults = (arr) => (arr || []).map((i) => ({
  itvNo: pick(i, 'itvNo', 'ItvNo'),
  // 시간 표기를 위해 reg_dt(타임스탬프) 우선, 없으면 itv_date(날짜)
  datetime: (pick(i, 'regDt', 'RegDt') || pick(i, 'itvDate', 'ItvDate') || '').toString().replace('T', ' ').slice(0, 16),
  userId: pick(i, 'regId', 'RegId') || '',
  content: pick(i, 'itvContent', 'ItvContent') || '',
  contactName: pick(i, 'contactName', 'ContactName') || '',
  contactPhone: pick(i, 'contactPhone', 'ContactPhone') || '',
}));

// 일정 정규화
const normSchedules = (arr) => (arr || []).map((s) => ({
  scheduleId: pick(s, 'scheduleId', 'ScheduleId'),
  title: pick(s, 'title', 'Title') || '',
  content: pick(s, 'content', 'Content') || '',
  category: pick(s, 'category', 'Category') || '',
  startAt: pick(s, 'startAt', 'StartAt') || null,
  endAt: pick(s, 'endAt', 'EndAt') || null,
  location: pick(s, 'location', 'Location') || '',
}));

// 소유자/임차인 정규화
const normHolders = (arr) => (arr || []).map((h) => ({
  holderType: pick(h, 'holderType', 'HolderType') || '',
  holderName: pick(h, 'holderName', 'HolderName') || '',
  holderPhone: pick(h, 'holderPhone', 'HolderPhone') || '',
  holderRelation: pick(h, 'holderRelation', 'HolderRelation') || '',
  holderRegDate: pick(h, 'holderRegDate', 'HolderRegDate') || null,
  isPast: !!pick(h, 'isPast', 'IsPast'),
}));

export async function searchNeobot(query, opts = {}) {
  const q = (query || '').trim();
  if (!q) return { items: [] };
  const { user, limit = 30 } = opts;
  const res = await apiClient.get(API_ENDPOINTS.neobot.search, {
    q,
    limit,
    ...(user?.offNo != null ? { offNo: user.offNo } : {}),
    ...(user?.rtNo ? { rtNo: user.rtNo } : {}),
  });
  const rawItems = pick(res?.data, 'items', 'Items') || [];
  return { items: rawItems.map(mapRow) };
}

// 상담이력 검색 — 전화번호(숫자)면 연락처 포함검색, 그 외 내용/성함 검색
export async function searchConsultations(query, opts = {}) {
  const q = (query || '').trim();
  if (!q) return [];
  const { user, limit = 50 } = opts;
  const res = await apiClient.get(API_ENDPOINTS.neobot.consultations, {
    q,
    limit,
    ...(user?.offNo != null ? { offNo: user.offNo } : {}),
    ...(user?.rtNo ? { rtNo: user.rtNo } : {}),
  });
  const rows = pick(res?.data, 'consultations', 'Consultations') || [];
  return normConsults(rows);
}

export async function getPropertyDetail(ptNo) {
  const res = await apiClient.get(API_ENDPOINTS.neobot.propertyDetail(ptNo));
  const d = res?.data || {};
  const summaryRaw = pick(d, 'summary', 'Summary') || {};
  return {
    summary: {
      ptNo: pick(summaryRaw, 'ptNo', 'PtNo'),
      ptName: pick(summaryRaw, 'ptName', 'PtName') || '',
      ptType: pick(summaryRaw, 'ptType', 'PtType') || '',
      addr: pick(summaryRaw, 'addr', 'Addr') || '',
      saleDiv: pick(summaryRaw, 'saleDiv', 'SaleDiv') || '',
      saleAmt: pick(summaryRaw, 'saleAmt', 'SaleAmt'),
      lesAmt: pick(summaryRaw, 'lesAmt', 'LesAmt'),
      protAmt: pick(summaryRaw, 'protAmt', 'ProtAmt'),
      monAmt: pick(summaryRaw, 'monAmt', 'MonAmt'),
      supArea: pick(summaryRaw, 'supArea', 'SupArea'),
      excArea: pick(summaryRaw, 'excArea', 'ExcArea'),
      floor: pick(summaryRaw, 'floor', 'Floor'),
      dirStd: pick(summaryRaw, 'dirStd', 'DirStd') || '',
      currentStatus: pick(summaryRaw, 'currentStatus', 'CurrentStatus') || '',
      ptSts: pick(summaryRaw, 'ptSts', 'PtSts') || '',
    },
    holders: normHolders(pick(d, 'holders', 'Holders')),
    consultations: normConsults(pick(d, 'consultations', 'Consultations')),
    schedules: normSchedules(pick(d, 'schedules', 'Schedules')),
  };
}

export async function getCustomerDetail(custNo) {
  const res = await apiClient.get(API_ENDPOINTS.neobot.customerDetail(custNo));
  const d = res?.data || {};
  const summaryRaw = pick(d, 'summary', 'Summary') || {};
  return {
    summary: {
      custNo: pick(summaryRaw, 'custNo', 'CustNo'),
      name: pick(summaryRaw, 'name', 'Name') || '',
      tel: pick(summaryRaw, 'tel', 'Tel') || '',
      addr: pick(summaryRaw, 'addr', 'Addr') || '',
      wantType: pick(summaryRaw, 'wantType', 'WantType') || '',
      wantNm: pick(summaryRaw, 'wantNm', 'WantNm') || '',
      featureNote: pick(summaryRaw, 'featureNote', 'FeatureNote') || '',
      memo: pick(summaryRaw, 'memo', 'Memo') || '',
    },
    buyers: (pick(d, 'buyers', 'Buyers') || []).map((b) => ({
      name: pick(b, 'name', 'Name') || '',
      relation: pick(b, 'relation', 'Relation') || '',
      tel: pick(b, 'tel', 'Tel') || '',
      addr: pick(b, 'addr', 'Addr') || '',
      regDt: pick(b, 'regDt', 'RegDt') || null,
    })),
    wishAreas: (pick(d, 'wishAreas', 'WishAreas') || []).map((a) => ({
      addr1: pick(a, 'addr1', 'Addr1') || '',
      addr2: pick(a, 'addr2', 'Addr2') || '',
      addr3: pick(a, 'addr3', 'Addr3') || '',
      bldNm: pick(a, 'bldNm', 'BldNm') || '',
      tradeStatus: pick(a, 'tradeStatus', 'TradeStatus') || '',
    })),
    consultations: normConsults(pick(d, 'consultations', 'Consultations')),
    schedules: normSchedules(pick(d, 'schedules', 'Schedules')),
  };
}

export async function getContractDetail(masterId) {
  const res = await apiClient.get(API_ENDPOINTS.neobot.contractDetail(masterId));
  const d = res?.data || {};
  return {
    masterId: pick(d, 'masterId', 'MasterId'),
    contractKind: pick(d, 'contractKind', 'ContractKind') || '',
    docType: pick(d, 'docType', 'DocType') || '',
    tradeType: pick(d, 'tradeType', 'TradeType') || '',
    title: pick(d, 'title', 'Title') || '',
    addr: pick(d, 'addr', 'Addr') || '',
    seller: pick(d, 'seller', 'Seller') || '',
    buyer: pick(d, 'buyer', 'Buyer') || '',
    amount: pick(d, 'amount', 'Amount'),
    contractDate: pick(d, 'contractDate', 'ContractDate') || null,
    status: pick(d, 'status', 'Status') || '',
    reportDoneDate: pick(d, 'reportDoneDate', 'ReportDoneDate') || null,
  };
}

export const neobotTradeLabel = tradeLabel;

export default { searchNeobot, searchConsultations, getPropertyDetail, getCustomerDetail, getContractDetail };
