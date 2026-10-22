/**
 * 물건 유형 상수
 */
export const PROPERTY_TYPES = [
  { code: 'SYCA101', label: '아파트' },
  { code: 'SYCA102', label: '오피스텔' },
  { code: 'SYCA103', label: '주상복합' },
  { code: 'SYCA104', label: '재건축' },
  { code: 'SYCA105', label: '아파트분양권' },
  { code: 'SYCA106', label: '오피스텔분양권' },
  { code: 'SYCA107', label: '주상복합 분양권' },
  { code: 'SYCA108', label: '건물 | 빌딩' },
  { code: 'SYCA109', label: '상가 | 사무실' }, // (구)상가건물 → 상가/사무실로 통합
  { code: 'SYCA110', label: '숙박 | 펜션' },
  { code: 'SYCA111', label: '공장 | 창고' },
  { code: 'SYCA112', label: '기타' },
  { code: 'SYCA113', label: '상가 | 사무실' }, // (구)사무실 → 상가/사무실 대표코드
  { code: 'SYCA114', label: '상가 | 사무실' }, // (구)상가점포 → 상가/사무실로 통합
  { code: 'SYCA115', label: '토지' },
  { code: 'SYCA116', label: '지식산업센터' },
  { code: 'SYCA117', label: '원투룸' },
  { code: 'SYCA118', label: '빌라 | 연립' },
  { code: 'SYCA119', label: '단독 | 다가구' },
  { code: 'SYCA120', label: '재개발' },
];

/**
 * 상가/사무실 통합 코드 그룹
 * - 기존 상가건물(109)/사무실(113)/상가점포(114)를 '상가/사무실' 하나로 통합
 * - 신규 저장 대표코드: SYCA113 (COMMERCIAL_OFFICE_CODE)
 * - 기존 데이터(109/114)는 비파괴 — 라벨/조건부 UI에서 동일 취급
 */
export const COMMERCIAL_OFFICE_CODES = ['SYCA109', 'SYCA113', 'SYCA114'];
export const COMMERCIAL_OFFICE_CODE = 'SYCA113';

/**
 * 아파트 계열(단지형) 코드 그룹
 * - 아파트/오피스텔/주상복합/분양권/재건축/재개발
 * - 단지명 드롭다운, 방·욕실·현관구조·건물구조·세대수·발코니 등 아파트 전용 필드 노출 기준
 */
export const APARTMENT_RELATED_CODES = ['SYCA101', 'SYCA102', 'SYCA103', 'SYCA104', 'SYCA105', 'SYCA106', 'SYCA107', 'SYCA120'];

/**
 * 아파트 폼(ApartmentForm)을 사용하는 물건유형
 * - 아파트/오피스텔/주상복합/아파트분양권/오피스텔분양권/주상복합분양권 (단지형 공동주택)
 * - 재건축(SYCA104)/재개발(SYCA120)은 제외 → 별도 폼/인라인 처리
 */
export const APARTMENT_FORM_CODES = ['SYCA101', 'SYCA102', 'SYCA103', 'SYCA105', 'SYCA106', 'SYCA107'];

/**
 * 분양권 폼(SalesRightForm)을 사용하는 물건유형
 * - 아파트 분양권(SYCA105) / 오피스텔 분양권(SYCA106)
 * - ApartmentForm 복사본 + 금액 row에 분양권 전용 금액표(분양금액/확장금액/옵션금액/프리미엄) 추가
 * - APARTMENT_FORM_CODES에도 포함되어 있으므로 디스패치에서 이 코드를 먼저 검사할 것
 */
export const SALES_RIGHT_FORM_CODES = ['SYCA105', 'SYCA106'];

/**
 * 건물 폼(BuildingForm)을 사용하는 물건유형
 * - 빌딩/건물(SYCA108)
 * - CommercialForm 복사본, 면적=대지/건축/연면적/대지지분, 일정 row 없음
 * - 세부유형(빌딩/상업시설/숙박·콘도/특수시설)은 헤더 드롭다운에서 처리
 */
export const BUILDING_FORM_CODES = ['SYCA108'];

/**
 * 숙박 | 펜션 폼(LodgingForm)을 사용하는 물건유형
 * - 숙박 | 펜션(SYCA110)
 * - BuildingForm 복사본 (전용 폼), 소재지 바는 건물과 동일(BuildingAddressBar) 사용
 */
export const LODGING_FORM_CODES = ['SYCA110'];

/**
 * 공장 | 창고 폼(FactoryForm)을 사용하는 물건유형
 * - 공장 | 창고(SYCA111)
 * - LodgingForm 복사본 (전용 폼), 소재지 바는 건물과 동일(BuildingAddressBar) 사용
 */
export const FACTORY_FORM_CODES = ['SYCA111'];

/**
 * 지식산업센터 폼(KnowledgeCenterForm)을 사용하는 물건유형
 * - 지식산업센터(SYCA116)
 * - CommercialForm 복사본 (전용 폼)
 */
export const KNOWLEDGE_FORM_CODES = ['SYCA116'];

/**
 * 빌라·연립 폼(BillaForm)을 사용하는 물건유형
 * - 빌라 | 연립(SYCA118)
 * - ApartmentForm 복사본, 소재지는 일반 주소(DefaultAddressBar, 단지선택 아님)
 */
export const BILLA_FORM_CODES = ['SYCA118'];

/**
 * 원투룸 폼(OneRoomForm)을 사용하는 물건유형
 * - 원투룸(SYCA117)
 * - BillaForm 복사본, 소재지는 일반 주소(DefaultAddressBar)
 */
export const ONEROOM_FORM_CODES = ['SYCA117'];

/**
 * 재개발·재건축 폼(RedevelopmentForm)을 사용하는 물건유형
 * - 재건축(SYCA104) / 재개발(SYCA120)
 * - ApartmentForm 복사본(단지선택 없음, 종전면적 추가), 소재지=지번+해당층/총층
 */
export const REDEV_FORM_CODES = ['SYCA104', 'SYCA120'];

/**
 * 주택 폼(HouseForm)을 사용하는 물건유형
 * - 주택(SYCA119, 표기 '단독 | 다가구')
 * - ApartmentForm 복사본 (우선), 세부유형(단독주택/상가주택/다가구주택)은 헤더 드롭다운에서 처리
 */
export const HOUSE_FORM_CODES = ['SYCA119'];

/**
 * 물건유형 선택 옵션 (드롭다운용)
 * - 상가/사무실 통합에 따라 중복 항목(109 상가건물, 114 상가점포) 제외, 대표코드 113만 노출
 */
// 드롭다운 노출 순서(요청 기준). 라벨은 PROPERTY_TYPES 단일 소스에서 가져옴
const PROPERTY_TYPE_OPTION_ORDER = [
  'SYCA101', // 아파트
  'SYCA102', // 오피스텔
  'SYCA105', // 아파트분양권
  'SYCA104', // 재건축 | 분양권
  'SYCA120', // 재개발 | 분양권
  'SYCA106', // 오피스텔분양권
  'SYCA117', // 원투룸
  'SYCA118', // 빌라 | 연립
  'SYCA119', // 단독 | 다가구
  'SYCA113', // 상가 | 사무실 (대표코드)
  'SYCA116', // 지식산업센터
  'SYCA108', // 건물 | 빌딩
  'SYCA110', // 숙박 | 펜션
  'SYCA111', // 공장 | 창고
  'SYCA115', // 토지
];
export const PROPERTY_TYPE_OPTIONS = PROPERTY_TYPE_OPTION_ORDER
  .map((code) => PROPERTY_TYPES.find((t) => t.code === code))
  .filter(Boolean);

/**
 * 물건유형 필터 버튼 목록 (물건관리·공동중개망·기타 팝업/메뉴 공통)
 * - label/순서 = 등록폼 매물유형 기준
 * - value = 실제 물건유형(SYCA) 코드(복수는 콤마). 등록폼에서 세부유형으로 접힌
 *   주상복합(103)/주상복합분양권(107)은 아파트/아파트분양권에 포함(필터 누락 방지).
 * - "모든유형/전체" 버튼은 각 화면에서 앞에 붙여 사용.
 */
export const PROPERTY_TYPE_FILTER_BUTTONS = [
  { label: '아파트', value: 'SYCA101,SYCA103' },
  { label: '오피스텔', value: 'SYCA102' },
  { label: '아파트분양권', value: 'SYCA105,SYCA107' },
  { label: '재건축', value: 'SYCA104' },
  { label: '재개발', value: 'SYCA120' },
  { label: '오피스텔분양권', value: 'SYCA106' },
  { label: '원투룸', value: 'SYCA117' },
  { label: '빌라 | 연립', value: 'SYCA118' },
  { label: '단독 | 다가구', value: 'SYCA119' },
  { label: '상가 | 사무실', value: 'SYCA109,SYCA113,SYCA114' },
  { label: '지식산업센터', value: 'SYCA116' },
  { label: '건물 | 빌딩', value: 'SYCA108' },
  { label: '숙박 | 펜션', value: 'SYCA110' },
  { label: '공장 | 창고', value: 'SYCA111' },
  { label: '토지', value: 'SYCA115' },
];

/**
 * 물건 유형 코드로 라벨 찾기
 * @param {string} code - 물건 유형 코드 (예: 'SYCA101')
 * @returns {string} 물건 유형 라벨 (예: '아파트')
 */
export const getPropertyTypeLabel = (code) => {
  const type = PROPERTY_TYPES.find(t => t.code === code);
  return type ? type.label : code;
};

/**
 * 물건 유형 라벨로 코드 찾기
 * @param {string} label - 물건 유형 라벨 (예: '아파트')
 * @returns {string} 물건 유형 코드 (예: 'SYCA101')
 */
export const getPropertyTypeCode = (label) => {
  // 통합 라벨은 대표코드(113)로 반환 (중복 라벨 방지)
  if (label === '상가 | 사무실') return COMMERCIAL_OFFICE_CODE;
  const type = PROPERTY_TYPES.find(t => t.label === label);
  return type ? type.code : null;
};

/**
 * 물건 유형 탭 분류
 */
export const PROPERTY_TYPE_TABS = [
  {
    id: 'all',
    label: '전체',
    codes: [], // 빈 배열이면 전체
  },
  {
    id: 'apt',
    label: '아파트·오피스텔·분양권',
    codes: ['SYCA101', 'SYCA102', 'SYCA103', 'SYCA105', 'SYCA106', 'SYCA107'],
  },
  {
    id: 'villa',
    label: '빌라·연립',
    codes: ['SYCA118'],
  },
  {
    id: 'redevelopment',
    label: '재개발',
    codes: ['SYCA104', 'SYCA120'],
  },
  {
    id: 'oneroom',
    label: '원룸·주택+',
    codes: ['SYCA117', 'SYCA119'],
  },
  {
    id: 'commercial',
    label: '상가·사무실',
    codes: ['SYCA109', 'SYCA113', 'SYCA114'], // 상가/사무실 통합(상가건물·사무실·상가점포)
  },
  {
    id: 'building',
    label: '건물·공장·창고',
    codes: ['SYCA108', 'SYCA110', 'SYCA111', 'SYCA116'],
  },
  {
    id: 'land',
    label: '토지·임야',
    codes: ['SYCA115'],
  },
];
