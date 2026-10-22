// const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:7146';

// const API_BASE_URL = 'http://rapi.codeme.kr:5011';
const API_BASE_URL = 'https://api.neosis.kr';
// const API_BASE_URL = 'https://localhost:7146';
const API_ENDPOINTS = {
  // 인증 관련
  auth: {
    login: `${API_BASE_URL}/api/realestaters/login`,
    register: `${API_BASE_URL}/api/realestaters`,
    logout: `${API_BASE_URL}/api/auth/logout`,
    refresh: `${API_BASE_URL}/api/auth/refresh`,
    checkId: `${API_BASE_URL}/api/realestaters/CheckRealestaterId`,
    referralInfo: `${API_BASE_URL}/api/realestaters/referral-info`,
    loginLog: `${API_BASE_URL}/api/auth/login-log`,
    changePassword: `${API_BASE_URL}/api/realestaters/change-password`,
  },

  // 통합검색 (물건 소유자/임차인 + 고객 구입자)
  search: {
    unified: `${API_BASE_URL}/api/search/unified`,
  },

  // 만기관리
  expiry: {
    list: `${API_BASE_URL}/api/expiry`,
  },

  // 네오봇 전용 (통합검색 + 상세: 물건/고객/계약)
  neobot: {
    search: `${API_BASE_URL}/api/neobot/search`,
    consultations: `${API_BASE_URL}/api/neobot/consultations`,
    propertyDetail: (ptNo) => `${API_BASE_URL}/api/neobot/detail/property/${ptNo}`,
    customerDetail: (custNo) => `${API_BASE_URL}/api/neobot/detail/customer/${custNo}`,
    contractDetail: (masterId) => `${API_BASE_URL}/api/neobot/detail/contract/${encodeURIComponent(masterId)}`,
  },

  // 커뮤니티 게시판 (공지사항 / 구인·구직 / 점포 매수·매도)
  community: {
    list: `${API_BASE_URL}/api/community/list`,
    detail: (postId) => `${API_BASE_URL}/api/community/${postId}`,
    create: `${API_BASE_URL}/api/community`,
    remove: (postId) => `${API_BASE_URL}/api/community/${postId}`,
    // 구인·구직 게시판(정형 입력)
    jobList: `${API_BASE_URL}/api/community/job/list`,
    jobDetail: (postId) => `${API_BASE_URL}/api/community/job/${postId}`,
    jobCreate: `${API_BASE_URL}/api/community/job`,
    jobRemove: (postId) => `${API_BASE_URL}/api/community/job/${postId}`,
  },

  // 메뉴 관리
  menu: {
    list: `${API_BASE_URL}/api/menu/GetMenuList`,
    userList: `${API_BASE_URL}/api/menu/GetMenuListRt`,
    create: `${API_BASE_URL}/api/menu/InsertMenuList`,
    update: `${API_BASE_URL}/api/menu/UpdateMenuList`,
    delete: `${API_BASE_URL}/api/menu/DeleteRealestater`,
    userCreate: `${API_BASE_URL}/api/menu/InsertMenuListRt`,
    userUpdate: `${API_BASE_URL}/api/menu/UpdateMenuListRt`,
    userDelete: `${API_BASE_URL}/api/menu/DeleteRealestaterRt`,
  },

  // 중개인 정보 관리 (직원)
  realestater: {
    list: `${API_BASE_URL}/api/realestaters`,
    detail: (rtNo) => `${API_BASE_URL}/api/realestaters/${rtNo}`,
    create: `${API_BASE_URL}/api/realestaters`,
    update: (rtNo) => `${API_BASE_URL}/api/realestaters/${rtNo}`,
    delete: (rtNo) => `${API_BASE_URL}/api/realestaters/${rtNo}`,
  },

  // 사무실 정보 관리
  office: {
    getByUser: `${API_BASE_URL}/api/office/GetUserOffice`,
    list: `${API_BASE_URL}/api/office/GetOfficeList`,
    create: `${API_BASE_URL}/api/office`,
    update: (offNo) => `${API_BASE_URL}/api/office/${offNo}`,
    delete: (offNo) => `${API_BASE_URL}/api/office/${offNo}`,
  },

  // 협력업체 관리
  vendor: {
    list: `${API_BASE_URL}/api/vendors`,
    create: `${API_BASE_URL}/api/vendors`,
    update: (vendorId) => `${API_BASE_URL}/api/vendors/${vendorId}`,
    delete: (vendorId) => `${API_BASE_URL}/api/vendors/${vendorId}`,
    // 영업지역
    regionList: `${API_BASE_URL}/api/vendors/regions`,
    regionCreate: `${API_BASE_URL}/api/vendors/regions`,
    regionUpdate: (vendorRegionId) => `${API_BASE_URL}/api/vendors/regions/${vendorRegionId}`,
    regionDelete: (vendorRegionId) => `${API_BASE_URL}/api/vendors/regions/${vendorRegionId}`,
  },

  // 공지사항 관리
  notice: {
    list: `${API_BASE_URL}/api/admin/notices`,
    create: `${API_BASE_URL}/api/admin/notices`,
    update: (noticeId) => `${API_BASE_URL}/api/admin/notices/${noticeId}`,
    delete: (noticeId) => `${API_BASE_URL}/api/admin/notices/${noticeId}`,
  },

  // 고객센터 관리
  // 일괄변경요청(고객센터와 분리된 전용 테이블 rt_bulk_request)
  bulkRequest: {
    list: `${API_BASE_URL}/api/bulk-requests`,
    create: `${API_BASE_URL}/api/bulk-requests`,
    complete: (reqId) => `${API_BASE_URL}/api/bulk-requests/${reqId}/complete`,
  },

  inquiry: {
    list: `${API_BASE_URL}/api/admin/inquiries`,
    create: `${API_BASE_URL}/api/admin/inquiries`,
    update: (inquiryId) => `${API_BASE_URL}/api/admin/inquiries/${inquiryId}`,
    delete: (inquiryId) => `${API_BASE_URL}/api/admin/inquiries/${inquiryId}`,
    answer: (inquiryId) => `${API_BASE_URL}/api/admin/inquiries/${inquiryId}/answer`,
  },

  // 고객면담 관리 (상담관리)
  interview: {
    list: `${API_BASE_URL}/api/Interview`,
    byCustomer: (custNo) => `${API_BASE_URL}/api/Interview/by-customer/${custNo}`,
    byProperty: (ptNo) => `${API_BASE_URL}/api/Interview/by-property/${ptNo}`,
    byVendor: (vendorId) => `${API_BASE_URL}/api/Interview/by-vendor/${vendorId}`,
    create: `${API_BASE_URL}/api/Interview`,
    update: (itvNo) => `${API_BASE_URL}/api/Interview/${itvNo}`,
    delete: (itvNo) => `${API_BASE_URL}/api/Interview/${itvNo}`,
  },

  // 일정 관리
  schedule: {
    list: `${API_BASE_URL}/api/Schedule`,
    byProperty: (ptNo) => `${API_BASE_URL}/api/Schedule/by-property/${ptNo}`,
    create: `${API_BASE_URL}/api/Schedule`,
    update: (scheduleId) => `${API_BASE_URL}/api/Schedule/${scheduleId}`,
    delete: (scheduleId) => `${API_BASE_URL}/api/Schedule/${scheduleId}`,
  },

  // 스티커 메모 (대시보드 메모관리)
  memo: {
    list: `${API_BASE_URL}/api/Memo`,
    create: `${API_BASE_URL}/api/Memo`,
    update: (memoId) => `${API_BASE_URL}/api/Memo/${memoId}`,
    delete: (memoId) => `${API_BASE_URL}/api/Memo/${memoId}`,
  },

  // 대량문자관리 (주소록 그룹 + 발송 이력)
  sms: {
    groups: `${API_BASE_URL}/api/Sms/groups`,
    groupUpdate: (groupId) => `${API_BASE_URL}/api/Sms/groups/${groupId}`,
    groupDelete: (groupId) => `${API_BASE_URL}/api/Sms/groups/${groupId}`,
    history: `${API_BASE_URL}/api/Sms/history`,
    send: `${API_BASE_URL}/api/Sms/send`,
  },

  // 고객 관리
  customer: {
    list: `${API_BASE_URL}/api/Customers`,
    detail: (custNo) => `${API_BASE_URL}/api/Customers/${custNo}`,
    create: `${API_BASE_URL}/api/Customers`,
    bulkCreate: `${API_BASE_URL}/api/Customers/bulk`,
    update: (custNo) => `${API_BASE_URL}/api/Customers/${custNo}`,
    delete: (custNo) => `${API_BASE_URL}/api/Customers/${custNo}`,
    // 고객 상담메모 (pt_memo + cust_no)
    memoList: (custNo) => `${API_BASE_URL}/api/Customers/${custNo}/memos`,
    memoCreate: (custNo) => `${API_BASE_URL}/api/Customers/${custNo}/memos`,
    memoUpdate: (custNo, memoNo) => `${API_BASE_URL}/api/Customers/${custNo}/memos/${memoNo}`,
    memoDelete: (custNo, memoNo) => `${API_BASE_URL}/api/Customers/${custNo}/memos/${memoNo}`,
    // 고객 거래정보
    tradeList: `${API_BASE_URL}/api/CustomersTrade`,
    tradeCreate: `${API_BASE_URL}/api/CustomersTrade`,
    tradeUpdate: (trdNo) => `${API_BASE_URL}/api/CustomersTrade/${trdNo}`,
    tradeDelete: (trdNo) => `${API_BASE_URL}/api/CustomersTrade/${trdNo}`,
    // 고객 거래지역
    tradeAreaList: `${API_BASE_URL}/api/CustomersTradeArea`,
    tradeAreaCreate: `${API_BASE_URL}/api/CustomersTradeArea`,
    tradeAreaUpdate: (trdNo) => `${API_BASE_URL}/api/CustomersTradeArea/${trdNo}`,
    tradeAreaDelete: (trdNo) => `${API_BASE_URL}/api/CustomersTradeArea/${trdNo}`,
  },

  // 물건 관리
  property: {
    list: `${API_BASE_URL}/api/property/GetPropertyList`,
    detail: (ptNo) => `${API_BASE_URL}/api/property/detail/${ptNo}`,
    create: `${API_BASE_URL}/api/property`,
    bulkCreate: `${API_BASE_URL}/api/property/bulk`,
    update: (ptNo) => `${API_BASE_URL}/api/property/${ptNo}`,
    delete: (ptNo) => `${API_BASE_URL}/api/property/${ptNo}`,
    updateStatus: (ptNo) => `${API_BASE_URL}/api/property/${ptNo}/status`,
    archive: (ptNo) => `${API_BASE_URL}/api/property/archive/${ptNo}`,
    history: (ptNo) => `${API_BASE_URL}/api/property/history/${ptNo}`,
  },

  // 계약관리 — 계약서 마스터 + 부속문서
  contractMaster: {
    list: `${API_BASE_URL}/api/contract-master`,
    save: `${API_BASE_URL}/api/contract-master`,
    detail: (id) => `${API_BASE_URL}/api/contract-master/${id}`,
    remove: (id) => `${API_BASE_URL}/api/contract-master/${id}`,
    copy: (id) => `${API_BASE_URL}/api/contract-master/${id}/copy`,
    ensure: (id) => `${API_BASE_URL}/api/contract-master/${id}/ensure`,
    reportDate: (id) => `${API_BASE_URL}/api/contract-master/${id}/report-date`,
    docSave: (id, kind) => `${API_BASE_URL}/api/contract-master/${id}/document/${encodeURIComponent(kind)}`,
    docGet: (id, kind) => `${API_BASE_URL}/api/contract-master/${id}/document/${encodeURIComponent(kind)}`,
    docKinds: (id) => `${API_BASE_URL}/api/contract-master/${id}/documents`,
  },

  // 계약서 서식 템플릿(조항) — 캐시 로드 + 관리자 편집
  contractTemplate: {
    list: `${API_BASE_URL}/api/contract-template`,
    version: `${API_BASE_URL}/api/contract-template/version`,
    detail: (code) => `${API_BASE_URL}/api/contract-template/${encodeURIComponent(code)}`,
    save: `${API_BASE_URL}/api/contract-template`,
    remove: (code) => `${API_BASE_URL}/api/contract-template/${encodeURIComponent(code)}`,
  },

  // 보고서 (매물 브리핑)
  report: {
    create: `${API_BASE_URL}/api/reports`,
    detail: (reportNo) => `${API_BASE_URL}/api/reports/${reportNo}`,
    byCustomer: (custNo) => `${API_BASE_URL}/api/reports/by-customer/${custNo}`,
    byProperty: (ptNo) => `${API_BASE_URL}/api/reports/by-property/${ptNo}`,
    byUser: (userId) => `${API_BASE_URL}/api/reports/by-user/${encodeURIComponent(userId)}`,
    attachCustomers: (reportNo) => `${API_BASE_URL}/api/reports/${reportNo}/customers`,
    shares: (reportNo) => `${API_BASE_URL}/api/reports/${reportNo}/customers`,
    remove: (reportNo) => `${API_BASE_URL}/api/reports/${reportNo}`,
  },

  // 물건 메모 관리
  propertyMemo: {
    list: (ptNo) => `${API_BASE_URL}/api/property/${ptNo}/memos`,
    latest: (ptNo) => `${API_BASE_URL}/api/property/${ptNo}/memos/latest`,
    create: (ptNo) => `${API_BASE_URL}/api/property/${ptNo}/memos`,
    update: (ptNo, memoNo) => `${API_BASE_URL}/api/property/${ptNo}/memos/${memoNo}`,
    delete: (ptNo, memoNo) => `${API_BASE_URL}/api/property/${ptNo}/memos/${memoNo}`,
  },

  // 소유주 정보 관리
  holder: {
    list: `${API_BASE_URL}/api/holder/GetPropertyList`,
    create: `${API_BASE_URL}/api/holder`,
    update: (ptNo) => `${API_BASE_URL}/api/holder/${ptNo}`,
    delete: (ptNo) => `${API_BASE_URL}/api/holder/${ptNo}`,
  },

  // 공동중개망 (Hub)
  hub: {
    list: `${API_BASE_URL}/api/Hub`,
    recent: `${API_BASE_URL}/api/Hub/recent`,
    create: `${API_BASE_URL}/api/Hub`,
    update: (tradeId) => `${API_BASE_URL}/api/Hub/${tradeId}`,
    delete: (tradeId) => `${API_BASE_URL}/api/Hub/${tradeId}`,
    mainRegionList: `${API_BASE_URL}/api/Hub/main-region`,
    mainRegionCreate: `${API_BASE_URL}/api/Hub/main-region`,
    mainRegionDelete: (regionId) => `${API_BASE_URL}/api/Hub/main-region/${regionId}`,
    blockList: `${API_BASE_URL}/api/Hub/block`,
    blockCreate: `${API_BASE_URL}/api/Hub/block`,
    blockDelete: (blockId) => `${API_BASE_URL}/api/Hub/block/${blockId}`,
    noteList: `${API_BASE_URL}/api/Hub/note`,
    noteUnreadCount: `${API_BASE_URL}/api/Hub/note/unread-count`,
    noteSend: `${API_BASE_URL}/api/Hub/note`,
    noteRead: (noteId) => `${API_BASE_URL}/api/Hub/note/${noteId}/read`,
    noteDelete: (noteId) => `${API_BASE_URL}/api/Hub/note/${noteId}`,
    // 대표(사무소) 단위 대화목록 조회 · 대화방 공개여부 설정 (백엔드 구현 필요)
    noteOffice: `${API_BASE_URL}/api/Hub/note/office`,
    noteShare: `${API_BASE_URL}/api/Hub/note/share`,
    noteShareAll: `${API_BASE_URL}/api/Hub/note/share/all`,
  },

  // 프로그램 버전 (자동 업데이트)
  version: {
    latest: (platform = 'win') => `${API_BASE_URL}/api/version/latest?platform=${platform}`,
  },

  // 배치도 관리
  layout: {
    all: (danjiCode, offNo) => `${API_BASE_URL}/api/layout/all/${danjiCode}?offNo=${offNo || 0}`,
    dongList: (danjiCode) => `${API_BASE_URL}/api/layout/dong/${danjiCode}`,
    hoList: (danjiCode, dongNo) => `${API_BASE_URL}/api/layout/ho/${danjiCode}/${dongNo}`,
    occupancyList: (danjiCode, dongNo, offNo) => `${API_BASE_URL}/api/layout/occupancy/${danjiCode}/${dongNo}?offNo=${offNo || 0}`,
    occupancySave: `${API_BASE_URL}/api/layout/occupancy`,
  },
};

export { API_BASE_URL };
export default API_ENDPOINTS;
