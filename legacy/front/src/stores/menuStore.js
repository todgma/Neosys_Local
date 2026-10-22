// src/stores/menuStore.js
import { create } from 'zustand';
import menuService from '../services/menuService'; // ✅ 함수가 아니라 service 인스턴스를 사용

// 아이콘 매핑 (메뉴명에 따른 아이콘 설정)
const getIconByMenuName = (menuName) => {
  const iconMap = {
    '대시보드': 'LayoutDashboard',
    '물건관리': 'Building',
    '계약관리': 'FileText',
    '사무실관리': 'Users',
    '협력업체관리': 'Handshake',
    '고객관리': 'UserCheck',
    '공동중개망': 'Link',
    '상담관리': 'Headphones',
    '일정관리': 'Calendar',
    '설정': 'Settings',
    '계약목록': 'FileText',
    '계약서작성': 'FileText',
    '수수료관리': 'DollarSign',
    '사무실정보': 'Building2',
    '직원목록': 'Users',
    '직원권한관리': 'Shield',
  };

  const cleanName = String(menuName || '').replace(/\s/g, '');
  return (
    Object.entries(iconMap).find(([key]) => key.replace(/\s/g, '') === cleanName)?.[1] ||
    'Circle'
  );
};

// 경로 매핑 (메뉴명에 따른 경로 설정)
const getPathByMenuName = (menuName) => {
  const pathMap = {
    '대시보드': '/dashboard',
    '물건관리': '/properties',
    '계약관리': '/contracts',
    '계약목록': '/contracts',
    '계약서작성': '/contracts/create',
    '수수료관리': '/contracts/commission',
    '사무실관리': '/agents',
    '사무실정보': '/agents/office-management',
    '사무실정보수정': '/agents/office-management',
    '직원목록': '/agents',
    '직원권한관리': '/agents/staff-permission',
    '협력업체관리': '/partners',
    '고객관리': '/customers',
    '공동중개망': '/transaction-network',
    '설정': '/settings',
    '상담관리': '/interview',
    '일정관리': '/schedule',
    '만기관리': '/expiry',
  };

  const cleanName = String(menuName || '').replace(/\s/g, '');
  const path = Object.entries(pathMap).find(([key]) => key.replace(/\s/g, '') === cleanName)?.[1];

  return path || `/${String(menuName || '').toLowerCase().replace(/\s/g, '-')}`;
};

// API 응답을 메뉴 구조로 변환 (data.menusRt / menusRt / MenusRt 모두 대응)
const transformMenuData = (apiMenus) => {
  const menuList =
    apiMenus?.data?.menusRt ??
    apiMenus?.menusRt ??
    apiMenus?.MenusRt ??
    [];

  if (!Array.isArray(menuList) || menuList.length === 0) return [];

  const menuMap = new Map();
  const rootMenus = [];

  const safeGetIcon = (name) =>
    typeof getIconByMenuName === 'function' ? getIconByMenuName(name) : undefined;
  const safeGetPath = (name) =>
    typeof getPathByMenuName === 'function' ? getPathByMenuName(name) : undefined;

  // 모든 메뉴를 정규화하여 Map에 저장
  menuList.forEach((menu, idx) => {
    const {
      id,
      mnuNm,
      lvl,
      parentId,
      cYn,
      rYn,
      uYn,
      dYn,
      useYn,
      sort, // 있을 수도, 없을 수도
    } = menu;

    const isRoot = !parentId || Number(parentId) === 0;
    const order =
      (typeof sort === 'number' ? sort : Number(sort)) ??
      (1000 + idx); // sort 없으면 인덱스 기반 보정

    const node = {
      id: String(id),
      title: mnuNm,
      icon: safeGetIcon(mnuNm), // 모든 메뉴에 아이콘 설정
      path: safeGetPath(mnuNm), // 모든 메뉴에 경로 설정
      order,
      isActive: (useYn ?? 'Y') === 'Y',
      level: lvl,
      parentId: isRoot ? null : String(parentId),
      permissions: {
        create: (cYn ?? 'N') === 'Y',
        read:   (rYn ?? 'N') === 'Y',
        update: (uYn ?? 'N') === 'Y',
        delete: (dYn ?? 'N') === 'Y',
      },
      children: [],
    };

    menuMap.set(node.id, node);
  });

  // 부모-자식 트리 구성
  menuMap.forEach((node) => {
    if (node.parentId && menuMap.has(node.parentId)) {
      menuMap.get(node.parentId).children.push(node);
    } else {
      rootMenus.push(node);
    }
  });

  // 정렬 (order → title → id)
  const sortMenus = (arr) => {
    arr.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      if (a.title !== b.title) return String(a.title).localeCompare(String(b.title));
      return a.id.localeCompare(b.id);
    });
    arr.forEach((m) => {
      if (m.children?.length) sortMenus(m.children);
    });
  };

  sortMenus(rootMenus);

  // 대시보드/상담관리 메뉴 제외 (상담관리는 고객관리 내 상담이력으로 통합되어 대시보드에서 숨김)
  return rootMenus.filter(menu => menu.title !== '대시보드' && menu.title !== '상담관리');
};

// 메뉴 고정 순서/구성 (상단 메뉴 카드)
//  - gated:true  → 메뉴조회 API 결과에 있으면 활성(권한 있음), 없으면 연하게 + "권한없음"
//  - gated:false → 항상 활성(앱 기본 메뉴). icon/path를 직접 지정
//  ※ 쪽지/문자/만기안내/업무일지/메모/PC폰관리는 대시보드 하단 별도 그리드에서 렌더(중복 방지 위해 여기서 제외)
const MENU_LAYOUT = [
  { title: '네오봇', gated: false, icon: 'Bot', path: '/neobot' },
  { title: '물건관리', gated: true },
  { title: '고객관리', gated: true },
  { title: '공동중개망', gated: true },
  { title: '계약관리', gated: true },
  { title: '협력업체관리', gated: true },
  // 사무소관리(표시명='사무소관리 | 직원관리 | 가입비 및 상품결제', API매칭='사무실관리'): 클릭 → 비밀번호 재검증 → 하위메뉴
  //  ※ apiTitle 은 백엔드 메뉴명('사무실관리')과 매칭하는 키이므로 표시명을 바꿔도 반드시 '사무실관리' 유지(안 그러면 백엔드 메뉴가 중복 노출)
  { title: '사무소관리 | 직원관리 | 가입비 및 상품결제', apiTitle: '사무실관리', gated: true, children: [
    { title: '사무실 정보 관리', path: '/agents/office-management' },
    { title: '직원관리', path: '/agents' },
  ] 
},
  { title: '일정관리', gated: false, icon: 'Calendar', path: '/schedule' },
];

// 고정 하위메뉴 → 메뉴 노드 children 형태로 변환
const buildDefaultChildren = (cfg, parentId, authorized) =>
  (cfg.children || []).map((c, i) => ({
    id: `${parentId}-sub-${i}`,
    title: c.title,
    icon: getIconByMenuName(c.title),
    path: c.path || getPathByMenuName(c.title),
    order: i,
    isActive: true,
    authorized,
    level: 1,
    parentId,
    permissions: { create: authorized, read: authorized, update: authorized, delete: authorized },
    children: [],
  }));

// 고정 레이아웃 위에 API 결과를 얹어 순서 고정 + 권한(authorized) 플래그 세팅
const buildMenus = (transformedMenus) => {
  const norm = (s) => String(s || '').replace(/\s/g, '');
  const apiByTitle = new Map((transformedMenus || []).map((m) => [norm(m.title), m]));
  const used = new Set();

  const items = MENU_LAYOUT.map((cfg, idx) => {
    const key = norm(cfg.apiTitle || cfg.title); // API 매칭 키(apiTitle 우선)
    const iconPathName = cfg.apiTitle || cfg.title; // 아이콘/경로 매핑용 이름
    if (cfg.gated) {
      const apiNode = apiByTitle.get(key);
      if (apiNode) {
        used.add(key);
        // 표시명(title)은 레이아웃 값으로 강제, 나머지는 API 노드 사용
        const node = { ...apiNode, title: cfg.title, authorized: true, order: idx };
        // 고정 하위메뉴가 정의된 메뉴(사무실관리)는 API가 children을 안 줘도 항상 노출(+백엔드 하위 흡수)
        if (cfg.children) {
          node.children = buildDefaultChildren(cfg, node.id, true);
        }
        return node;
      }
      // API 결과에 없음 → 권한없음(연하게). 단, 고정 하위메뉴는 유지(비밀번호 게이트로 진입 제어)
      const baseId = `base-${key}`;
      return {
        id: baseId,
        title: cfg.title,
        icon: getIconByMenuName(iconPathName),
        path: getPathByMenuName(iconPathName),
        order: idx,
        isActive: true,
        authorized: false,
        level: 0,
        parentId: null,
        permissions: { create: false, read: false, update: false, delete: false },
        children: cfg.children ? buildDefaultChildren(cfg, baseId, true) : [],
      };
    }
    // 항상 활성(앱 기본 메뉴)
    return {
      id: `default-${key}`,
      title: cfg.title,
      icon: cfg.icon || getIconByMenuName(cfg.title),
      path: cfg.path || getPathByMenuName(cfg.title),
      order: idx,
      isActive: true,
      authorized: true,
      level: 0,
      parentId: null,
      permissions: { create: true, read: true, update: true, delete: true },
      children: [],
    };
  });

  // 고정 레이아웃에 없지만 API가 내려준 메뉴는 뒤에 유지(권한 있음)
  //  ※ '데이터 업로드'는 대시보드에서 노출 제외
  const EXCLUDED = new Set([norm('데이터 업로드')]);
  const extras = (transformedMenus || [])
    .filter((m) => !used.has(norm(m.title)) && !EXCLUDED.has(norm(m.title)))
    .map((m, i) => ({ ...m, authorized: true, order: 1000 + i }));

  return [...items, ...extras];
};

export const useMenuStore = create((set, get) => ({
  // 초기값부터 고정 레이아웃(권한없음 잠금) — 메뉴는 항상 노출, API는 권한 유무 체크용
  menuItems: buildMenus([]),
  activeMenuItem: null,
  expandedMenus: [],
  isMenuCollapsed: false,
  isLoading: false,
  error: null,

  setMenuItems: (items) => set({ menuItems: items }),

  setActiveMenuItem: (itemId) => set({ activeMenuItem: itemId }),

  toggleMenuExpansion: (itemId) => {
    const { expandedMenus } = get();
    const isExpanded = expandedMenus.includes(itemId);
    set({
      expandedMenus: isExpanded
        ? expandedMenus.filter((id) => id !== itemId)
        : [...expandedMenus, itemId],
    });
  },

  toggleMenuCollapse: () => set((state) => ({ isMenuCollapsed: !state.isMenuCollapsed })),

  // ✅ rtNo를 받아서 사용자별 메뉴 로드 (menuService.getMenuListByRtNo 사용)
  loadUserMenus: async (rtNo) => {
    set({ isLoading: true, error: null });

    try {
      const response = await menuService.getMenuListByRtNo(rtNo); // ← 함수명 유지, service 메서드 호출

      if (response?.success && response?.data) {
        const transformedMenus = transformMenuData(response.data); // response.data = { menusRt: [...] }
        // 고정 순서 레이아웃으로 구성 + API 결과에 없는(권한없는) 메뉴는 연하게 처리
        const menuItems = buildMenus(transformedMenus);

        set({ menuItems, isLoading: false });
        return menuItems;
      }

      throw new Error(response?.message || '메뉴 로드 실패');
    } catch (error) {
      console.error('Failed to load user menus:', error);
      // 오류 시에도 기본 레이아웃(6개 대상 메뉴)은 항상 노출 → 권한 없음(자물쇠)으로 잠금
      const menuItems = buildMenus([]);
      set({
        error: error.message || '메뉴를 불러오는 중 오류가 발생했습니다.',
        isLoading: false,
        menuItems,
      });
      return menuItems;
    }
  },

  // 메뉴 초기화 (로그아웃 시 사용)
  clearMenus: () => {
    set({
      menuItems: [],
      activeMenuItem: null,
      expandedMenus: [],
      error: null,
    });
  },

  // 로그인 이후 rtNo로 loadUserMenus 호출하도록 가이드
  initializeMenus: async () => {
    console.log('Menu initialization should be done after login with rtNo');
  },
}));
