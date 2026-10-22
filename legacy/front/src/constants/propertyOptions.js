/**
 * 물건 관련 드롭다운 공통 옵션 (물건등록폼 / 고객등록폼 / 공동중개망등록폼 공통)
 * - 한 곳에서 바꾸면 세 폼에 동일하게 반영됨
 */

// 난방/구조/방향
export const HEAT_METHOD_OPTIONS = ['개별난방', '중앙난방', '지역난방'];
export const HEAT_FUEL_OPTIONS = ['도시가스', '기름', '전기', '심야전기'];
export const ENTR_STRUCT_OPTIONS = ['계단식', '복도식', '복합식'];
export const BUILDING_STRUCT_OPTIONS = ['철근콘크리트', '철골', '벽돌', '목조', '기타'];
export const BUILDING_FORM_OPTIONS = ['판상형', '타워형'];
export const BALCONY_OPTIONS = [{ value: 'Y', label: '확장' }, { value: 'N', label: '미확장' }];
export const DIRECTION_OPTIONS = ['남향', '동향', '서향', '북향', '남동향', '남서향', '북동향', '북서향'];
export const DIRECTION_BASE_OPTIONS = ['거실기준', '안방기준', '주된출입구'];

// 주택임대사업자 — 물건(houseRental)은 한글 문자열, 공동중개망(owner_rent_bsn_yn CHAR(1))은 코드값
export const RENT_BSN_OPTIONS = [{ value: 'Y', label: '등록' }, { value: 'N', label: '미등록' }, { value: 'P', label: '예정' }];
// 한글/코드 어느 쪽이 와도 CHAR(1) 코드로 변환 (알 수 없는 값은 null)
export const toRentBsnCode = (v) => {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  const hit = RENT_BSN_OPTIONS.find((o) => o.value === s || o.label === s);
  return hit ? hit.value : null;
};
export const rentBsnLabel = (v) => RENT_BSN_OPTIONS.find((o) => o.value === v)?.label || v || '';

/**
 * 물건유형(SYCA)별 세부유형 옵션
 * - 원투룸(SYCA117): 오피스텔 / 단독|다가구 / 빌라|연립 / 도시형생활주택 / 생활형숙박시설 / 기숙사
 * - 상가·사무실(109/113/114), 오피스텔·오피스텔분양권(102/106), 건물(108), 주택(119) 등
 */
export const SUBTYPE_OPTIONS_BY_TYPE = {
  SYCA109: ['사무실', '오피스텔', '상가건물', '단지내상가', '일반상가', '복합상가'],
  SYCA113: ['사무실', '오피스텔', '상가건물', '단지내상가', '일반상가', '복합상가'],
  SYCA114: ['사무실', '오피스텔', '상가건물', '단지내상가', '일반상가', '복합상가'],
  SYCA102: ['업무용', '주거용', '무관'],
  SYCA106: ['업무용', '주거용', '무관'],
  SYCA108: ['상가 | 사무실', '사옥', '단독 | 다가구', '숙박 | 펜션'],
  SYCA110: ['호텔', '모텔', '여관 | 여인숙', '생활형숙박시설', '레지던스', '펜션'],
  SYCA117: ['오피스텔', '단독 | 다가구', '빌라 | 연립', '도시형생활주택', '생활형숙박시설', '기숙사'],
  SYCA119: ['단독주택', '상가주택', '다가구주택'],
  SYCA105: ['입주권', '분양권'], // 아파트분양권 (물건등록폼은 상단 입주권/분양권 드롭다운으로 별도 처리)
  SYCA104: ['전부', '입주권', '분양권'], // 재건축 — 전부/입주권/분양권
  SYCA120: ['전부', '입주권', '분양권'], // 재개발 — 전부/입주권/분양권
};

export const getSubTypeOptions = (ptType) => SUBTYPE_OPTIONS_BY_TYPE[ptType] || [];
