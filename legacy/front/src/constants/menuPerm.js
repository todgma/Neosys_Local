// 직원 메뉴 권한 대상 — 대시보드 메뉴(고정). key = rt_menu_perm.menu_key (한글 타이틀)
export const MENU_PERM_ITEMS = [
  { key: '네오봇', label: '네오봇' },
  { key: '공동중개망', label: '공동중개망' },
  { key: '물건관리', label: '물건관리' },
  { key: '고객관리', label: '고객관리' },
  { key: '계약관리', label: '계약관리' },
  { key: '협력업체관리', label: '협력업체관리' },
  { key: '일정관리', label: '일정관리' },
  { key: '쪽지관리', label: '쪽지관리' },
  { key: '문자관리', label: '문자관리' },
  { key: '만기안내', label: '만기관리' },
  { key: '업무일지', label: '업무일지' },
  { key: '커뮤니티', label: '커뮤니티' },
  { key: '메모', label: '메모' },
  { key: 'PC폰관리', label: 'PC폰관리' },
  { key: '원격지원', label: '원격지원' },
];

export const MENU_PERM_KEYS = MENU_PERM_ITEMS.map((m) => m.key);
