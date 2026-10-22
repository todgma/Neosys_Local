import apiClient from '../utils/apiClient';
import API_ENDPOINTS from '../config/apiEndpoints';

/**
 * 만기관리 조회 서비스.
 *  GET /api/expiry?ptTypes=&frDate=&toDate=&offNo=&rtNo=&page=&pageSize=
 *  응답 data: { items|Items:[...], totalCount|TotalCount }
 */
const pick = (o, ...keys) => { for (const k of keys) if (o?.[k] !== undefined && o?.[k] !== null) return o[k]; return undefined; };

export async function getExpiryList({ ptTypes, frDate, toDate, user, page = 1, pageSize = 50 } = {}) {
  const params = { page, pageSize };
  if (ptTypes) params.ptTypes = ptTypes;
  if (frDate) params.frDate = frDate;
  if (toDate) params.toDate = toDate;
  if (user?.offNo != null) params.offNo = user.offNo;
  if (user?.rtNo) params.rtNo = user.rtNo;

  const res = await apiClient.get(API_ENDPOINTS.expiry.list, params);
  const d = res?.data || {};
  const rawItems = pick(d, 'items', 'Items') || [];
  const totalCount = pick(d, 'totalCount', 'TotalCount') || 0;
  const items = rawItems.map((r) => ({
    ptNo: pick(r, 'ptNo', 'PtNo'),
    ptType: pick(r, 'ptType', 'PtType') || '',
    ptName: pick(r, 'ptName', 'PtName') || '',
    addr: pick(r, 'addr', 'Addr') || '',
    // 주소 상세(단지명/상세주소 구성용) — 백엔드가 내려주면 사용, 없으면 addr로 대체
    addr1: pick(r, 'addr1', 'Addr1') || '',
    addr2: pick(r, 'addr2', 'Addr2') || '',
    addr3: pick(r, 'addr3', 'Addr3') || '',
    addr4: pick(r, 'addr4', 'Addr4') || '',
    addr5: pick(r, 'addr5', 'Addr5') || '',
    danjiName: pick(r, 'danjiName', 'DanjiName') || '',
    danjiCode: pick(r, 'danjiCode', 'DanjiCode') || '',
    currentStatus: pick(r, 'currentStatus', 'CurrentStatus') || '',
    ptSts: pick(r, 'ptSts', 'PtSts') || '',
    saleDiv: pick(r, 'saleDiv', 'SaleDiv') || '',
    // 출처(물건관리/계약관리) — 백엔드 미제공 시 기본 '물건'
    source: pick(r, 'source', 'Source') || '',
    // 면적/금액
    aptTyp: pick(r, 'aptTyp', 'AptTyp') || '',
    supArea: pick(r, 'supArea', 'SupArea'),
    excArea: pick(r, 'excArea', 'ExcArea'),
    saleAmt: pick(r, 'saleAmt', 'SaleAmt'),
    lesAmt: pick(r, 'lesAmt', 'LesAmt'),
    protAmt: pick(r, 'protAmt', 'ProtAmt'),
    monAmt: pick(r, 'monAmt', 'MonAmt'),
    etcAmt: pick(r, 'etcAmt', 'EtcAmt'),
    etcAmt2: pick(r, 'etcAmt2', 'EtcAmt2'),
    dong: pick(r, 'dong', 'Dong') || '',
    ho: pick(r, 'ho', 'Ho') || '',
    jibun: pick(r, 'jibun', 'Jibun') || '',
    expiryDate: pick(r, 'expiryDate', 'ExpiryDate') || '',
    ownerName: pick(r, 'ownerName', 'OwnerName') || '',
    ownerPhone: pick(r, 'ownerPhone', 'OwnerPhone') || '',
    tenantName: pick(r, 'tenantName', 'TenantName') || '',
    tenantPhone: pick(r, 'tenantPhone', 'TenantPhone') || '',
  }));
  return { items, totalCount };
}

export default { getExpiryList };
