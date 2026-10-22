// 협력업체 분류 — 프로그램(협력업체관리 상단 버튼)과 등록 폼 드롭다운 공용 소스.
//  · prep:true = 클릭 시 '준비 중' (필터/등록 대상 아님)
//  · span = 그리드 가로 병합 칸수
//  · label 내 ' / ' = 그룹 버튼(2줄 표기). 저장/필터 값은 ' / ' 형태로 통일(관리자 페이지와 동일)
export const PARTNER_CATEGORY_GRID = [
  // 1줄: 요청 순서(중개사무소 → 네이버광고 → … → 교육/강좌). 변호사|행정사 우측에 '기타'
  { label: '중개사무소' }, { label: '네이버광고' }, { label: '이사 | 청소' }, { label: '은행 | 대출상담' }, { label: '법무 | 세무' }, { label: '지도 | 평면도' }, { label: '분양대행사' }, { label: '시행 | 시공 | 설계' }, { label: '인테리어 | 철거' }, { label: '변호사 | 행정사' }, { label: '기타' }, { label: '교육/강좌', prep: true },
  // 2줄: 사무/장비 — 그룹 버튼(' / '는 2줄로 표시). cc카메라 우측에 '소품', '개업인사'(이사|개업이사 통합)
  { label: '고객관리프로그램 자료 업로드', prep: true, span: 2 }, { label: '블로그 | 유튜브 | 인스타그램' }, { label: '컴퓨터 | 프린터 / 인터넷 | 네트워크' }, { label: '정수기 | 디퓨저 / cc카메라 | 소품' }, { label: '차 | 음료 | 다과 / 문구 | 명함' }, { label: '개업인사 / 떡케잌 | 꽃배달' }, null, null, null, null, null,
];

// 등록 드롭다운용 분류 목록(기능/준비중 버튼 제외). 값은 grid label 그대로(필터 일치용)
export const PARTNER_CATEGORY_OPTIONS = PARTNER_CATEGORY_GRID.filter((c) => c && !c.prep).map((c) => c.label);

// 상단 버튼 표시용 — ' / '를 줄바꿈으로(2줄 버튼)
export const categoryTwoLine = (v) => (v || '').replace(/ \/ /g, '\n');
// 드롭다운 표시용 — 값 그대로(' / ' 유지)
export const categoryDisplay = (v) => (v || '');
