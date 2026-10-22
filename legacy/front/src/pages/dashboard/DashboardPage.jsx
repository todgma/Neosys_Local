import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Calendar,
  MessageSquare,
  Clock,
  ChevronRight,
  LayoutDashboard,
  Building,
  Building2,
  FileText,
  Users,
  DollarSign,
  UserCheck,
  Link,
  Circle,
  Shield,
  Network,
  Headphones,
  Settings,
  User,
  Gift,
  UserPlus,
  Bot,
  Lock,
  Smartphone,
  ClipboardList,
  FolderOpen,
  StickyNote,
  Phone,
  Monitor,
  Copy,
  X,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import StickyMemo from '../../components/memo/StickyMemo';
import WorkJournalPage from '../worklog/WorkJournalPage';
import DataRoomModal from '../../components/dashboard/DataRoomModal';
import CommunityBoard from '../../components/community/CommunityBoard';
import NoticePopup from '../../components/notice/NoticePopup';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SmsManagerModal from '../../components/sms/SmsManagerModal';
import MembershipSubscribeModal from '../../components/dashboard/MembershipSubscribeModal';
import FreeMonthsModal from '../../components/dashboard/FreeMonthsModal';
import ReferralListModal from '../../components/dashboard/ReferralListModal';
import EventParticipationModal from '../../components/dashboard/EventParticipationModal';
import { useAuthStore } from '../../stores/authStore';
import { useNoteStore } from '../../stores/noteStore';
import { useMenuStore } from '../../stores/menuStore';
import systemService from '../../services/systemService';
import { authService } from '../../services/authService';
import axios from 'axios';
import { API_BASE_URL } from '../../config/apiEndpoints';
import { staffPermService } from '../../services/staffPermService';
import { officeService } from '../../services/officeService';
import { useConsultMode } from '../../hooks/useConsultMode';
import chatImg from '../../assets/chat.png';
import { toast } from 'react-hot-toast';

const iconMap = {
  LayoutDashboard,
  Building,
  Building2,
  FileText,
  Users,
  Calendar,
  DollarSign,
  UserCheck,
  Handshake: UserCheck,
  Link,
  Circle,
  Shield,
  Network,
  Headphones,
  Bell,
  Settings,
  Bot,
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { unreadCount: unreadNoteCount, openNotes } = useNoteStore();
  const { user, updateUser, office, updateOffice } = useAuthStore();
  const { menuItems, loadUserMenus } = useMenuStore();
  const [membership, setMembership] = useState(null); // 사무소 멤버십(상품명 + 잔여일)
  const [allowedMenus, setAllowedMenus] = useState(null); // 직원 허용 메뉴 Set(null=대표/제한없음)
  const [showFreeMonths, setShowFreeMonths] = useState(false); // 무료개월 내역(웹 폴백 인페이지)
  const [showEventPart, setShowEventPart] = useState(false); // 이벤트참여(웹 폴백 인페이지)
  const [showRemoteGuide, setShowRemoteGuide] = useState(false); // 원격지원 안내 모달
  const [eventWins, setEventWins] = useState([]); // 참여 이벤트 확인완료 알림(대표자 1회 팝업)
  const eventWinShown = useRef(false); // 세션당 1회만 조회
  // 좌상단 인사말 — 사무소 공유(office.greeting). 편집은 대표(RTTYP01)만.
  const DEFAULT_GREETING = '즐거운 하루 되세요';
  const [greeting, setGreeting] = useState(DEFAULT_GREETING);
  const [editingGreeting, setEditingGreeting] = useState(false);
  const [greetingDraft, setGreetingDraft] = useState('');
  useEffect(() => {
    const g = office?.greeting ?? office?.Greeting;
    setGreeting((g && String(g).trim()) ? String(g) : DEFAULT_GREETING);
  }, [office]);
  const startEditGreeting = () => { setGreetingDraft(greeting); setEditingGreeting(true); };
  const saveGreeting = async () => {
    const v = (greetingDraft || '').trim() || DEFAULT_GREETING;
    setGreeting(v); setEditingGreeting(false);
    const offNo = office?.offNo ?? office?.OffNo;
    if (!offNo) return;
    try {
      await officeService.updateGreeting(offNo, v, user?.userId || user?.id);
      updateOffice({ ...(office || {}), greeting: v, Greeting: v }); // 로컬 즉시 반영
    } catch (e) { console.error('인사말 저장 실패:', e); }
  };
  // 직급: rt_realtor_info.Grade(직급) 우선, 없으면 중개사유형(RtType) 라벨. ('user'/'admin' 계정등급 값은 직급 아님)
  const RTTYPE_LABEL = { RTTYP01: '대표', RTTYP02: '소속공인중개사', RTTYP03: '중개보조원', RTTYP04: '기타' };
  const jobGrade = (user?.grade && !['user', 'admin'].includes(String(user.grade).trim().toLowerCase())) ? String(user.grade).trim() : '';
  const jobTitle = jobGrade || RTTYPE_LABEL[user?.rtType] || '';
  const [notices, setNotices] = useState([]);
  const [events, setEvents] = useState([]);
  const [showMemo, setShowMemo] = useState(false); // 스티커 메모
  const [showWorklog, setShowWorklog] = useState(false); // 업무일지(초안)
  const [showDataRoom, setShowDataRoom] = useState(false); // 자료실(서류 다운로드)
  const [showCommunity, setShowCommunity] = useState(false); // 커뮤니티(웹 폴백)
  const [communityTab, setCommunityTab] = useState('공지사항'); // 커뮤니티 진입 탭
  const [communityPostId, setCommunityPostId] = useState(null); // 커뮤니티 진입 시 바로 열 게시글 id
  const [consultOn, toggleConsult] = useConsultMode(); // 상담모드 토글(폼의 특징·상담내용 카드 숨김)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false); // 로그아웃 확인 모달
  const [showSms, setShowSms] = useState(false); // 문자관리
  const [showSubscribe, setShowSubscribe] = useState(false); // 상품 가입 모달(멤버십 미가입)
  const autoSubscribeShown = useRef(false); // 로그인 후 자동 팝업 1회만
  const [showEntryFeePopup, setShowEntryFeePopup] = useState(false); // 가입비 결제 안내 팝업(대표·미결제)
  const [showReferralList, setShowReferralList] = useState(false); // 내 추천인 목록 팝업
  const [recentConsultations, setRecentConsultations] = useState([]);
  const [expiringContracts, setExpiringContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [rollIndex, setRollIndex] = useState(0); // 공지/이벤트 통합 롤링
  // 사무실관리: 하위메뉴 선택 → 비밀번호 재검증 → 페이지 열기
  const [showOfficeMenu, setShowOfficeMenu] = useState(false);
  const [officePwTarget, setOfficePwTarget] = useState(null); // 선택된 하위메뉴
  const [officePw, setOfficePw] = useState('');
  const [officePwLoading, setOfficePwLoading] = useState(false);
  const [officePwError, setOfficePwError] = useState('');

  // 페이지 타이틀 설정
  useEffect(() => {
    document.title = '네오시스 - 대시보드';
  }, []);

  useEffect(() => {
    if (user?.rtNo) {
      loadUserMenus(user.rtNo);
    }
  }, [user, loadUserMenus]);

  // 직원(소속중개사) 메뉴 권한 조회 — 대표(RTTYP01)는 제한없음(null)
  useEffect(() => {
    if (!user?.rtNo) { setAllowedMenus(null); return; }
    if (user?.rtType === 'RTTYP01') { setAllowedMenus(null); return; }
    (async () => {
      try { const keys = await staffPermService.get(user.rtNo); setAllowedMenus(new Set(keys)); }
      catch { setAllowedMenus(new Set()); }
    })();
  }, [user]);

  // 로그인 사무소의 멤버십(상품명 + 잔여일) 조회
  useEffect(() => {
    const off = user?.offNo;
    if (!off) { setMembership(null); return; }
    (async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/memberships/office/${off}`);
        const body = res.data; const m = body?.data ?? body;
        setMembership(m && (m.ProdName ?? m.prodName) ? m : null);
      } catch { setMembership(null); }
    })();
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // 참여 이벤트 "확인완료" 알림 — 대표자 로그인 후 대시보드 최초 1회 팝업 → 표시 즉시 user_seen='Y'
  useEffect(() => {
    if (eventWinShown.current) return;
    if (user?.rtType !== 'RTTYP01') return;
    const uid = user?.id || user?.userId; const off = user?.offNo;
    if (!uid && off == null) return;
    eventWinShown.current = true;
    (async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/events/entries/confirmed-unseen`, { params: { userId: uid || '', offNo: off ?? '' } });
        const items = res?.data?.data?.items || res?.data?.data?.Items || [];
        if (items.length) {
          setEventWins(items);
          const ids = items.map((e) => e.entryId ?? e.EntryId).filter(Boolean);
          try { await axios.post(`${API_BASE_URL}/api/events/entries/mark-seen`, { EntryIds: ids }); } catch { /* noop */ }
        }
      } catch { /* noop */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.rtType, user?.offNo]);

  // 상품가입 — Electron이면 새 창 팝업(대시보드 위), 아니면 인페이지 모달 폴백
  const openSubscribe = () => {
    if (window.electronAPI?.modal?.open) {
      window.electronAPI.modal.open({
        type: 'membership-subscribe',
        data: { title: '상품 가입', offNo: user?.offNo, userId: user?.userId || user?.id },
        width: 840, height: 780, minWidth: 640, minHeight: 560, resizable: true,
      }).catch(() => setShowSubscribe(true));
    } else {
      setShowSubscribe(true);
    }
  };

  // 가입비 결제 — 앱 내 전용 결제창(토스)에서 바로 진행(자동로그인 토큰). 완료 시 상태 반영.
  const openEntryFeePay = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/realestaters/payment-token`, { RtNo: user?.rtNo });
      const d = res?.data?.data ?? res?.data ?? {};
      const token = d.token ?? d.Token;
      const base = token ? `https://neosis.kr/payment?autologin=${encodeURIComponent(token)}` : 'https://neosis.kr/payment';
      if (window.electronAPI?.payment?.open) {
        const r = await window.electronAPI.payment.open({ url: `${base}&auto=1`, width: 520, height: 800 });
        if (r?.status === 'success') { updateUser({ hasEntryFee: true }); setShowEntryFeePopup(false); toast.success('가입비 결제가 완료되었습니다.'); }
        else if (r?.status === 'fail') toast.error('결제가 취소되었거나 실패했습니다.');
      } else if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(base);
        toast('결제 완료 후 창으로 돌아오면 자동 반영됩니다.', { duration: 5000 });
      } else {
        window.open(base, '_blank', 'noopener');
      }
    } catch (e) { console.error(e); toast.error('결제창을 여는 데 실패했습니다.'); }
  };

  // 로그인 직후 '대표자' 자동 팝업(세션당 1회) — ①가입비 미결제면 가입비 팝업만 ②가입비 OK·상품 미가입이면 상품가입 팝업
  useEffect(() => {
    if (user?.rtType !== 'RTTYP01' || !user?.offNo || autoSubscribeShown.current) return;
    if (user?.hasEntryFee === undefined && user?.hasMembership === undefined) return; // 값 로딩 전
    autoSubscribeShown.current = true;
    // [임시] 상품가입 자동 팝업 비활성화. 복구하려면 아래 한 줄의 주석을 해제.
    // if (user?.hasMembership === false) openSubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 외부(별도 창/웹) 결제·가입 완료 후 대시보드 복귀 시 상태 재반영
  useEffect(() => {
    const onFocus = async () => {
      try {
        if (localStorage.getItem('membershipSubscribed')) {
          localStorage.removeItem('membershipSubscribed');
          updateUser({ hasMembership: true });
        }
      } catch { /* ignore */ }
      // 웹에서 가입비 결제 후 복귀 → 사무소 가입비 상태 재확인
      try {
        if (user?.offNo != null && user?.hasEntryFee !== true) {
          const res = await axios.get(`${API_BASE_URL}/api/payments/entry-fee`, { params: { offNo: user.offNo } });
          const d = res?.data?.data ?? res?.data ?? {};
          if ((d.paid ?? d.Paid) === true) { updateUser({ hasEntryFee: true }); setShowEntryFeePopup(false); }
        }
      } catch { /* ignore */ }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [updateUser, user?.offNo, user?.hasEntryFee]);

  // 공지/이벤트 통합 롤링 (한 배너에서 번갈아 표시)
  const rollCount = notices.length + events.length;
  useEffect(() => {
    if (rollCount <= 1) return;
    const interval = setInterval(() => {
      setRollIndex((prev) => (prev + 1) % rollCount);
    }, 5000);
    return () => clearInterval(interval);
  }, [rollCount]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // 공지사항 API 호출
      try {
        const noticeResponse = await systemService.getNotices(null, 1, 5);
        console.log('Dashboard Notice Response:', noticeResponse);

        if (noticeResponse?.success && noticeResponse?.data?.notices) {
          const noticeData = noticeResponse.data.notices
            .filter(n => (n.showOnDashboard ?? n.ShowOnDashboard ?? 'Y') !== 'N') // 대시보드 표기 'N' 제외
            .map(notice => ({
            id: notice.noticeId,
            title: notice.title,
            date: notice.regDt,
            isImportant: notice.isTop === 'Y',
          }));
          setNotices(noticeData);
        } else {
          setNotices([]);
        }
      } catch (error) {
        console.error('Failed to load notices:', error);
        setNotices([]);
      }

      // 이벤트 API 연동 (공개분만) — 롤링 배너에 공지와 번갈아 노출
      try {
        const evRes = await axios.get(`${API_BASE_URL}/api/admin/events`, { params: { isPublic: 'Y', showDashboard: 'Y', rowsPerPage: 20 } });
        const evList = evRes?.data?.data?.events || evRes?.data?.data?.Events || [];
        setEvents(evList.map((e) => ({ id: e.eventId ?? e.EventId, title: e.title ?? e.Title, date: e.regDt ?? e.RegDt, category: '이벤트', linkUrl: e.linkUrl ?? e.LinkUrl })));
      } catch (error) {
        console.error('Failed to load events:', error);
        setEvents([]);
      }

      setRecentConsultations([
        { id: 1, customerName: '김철수', propertyName: '강남구 역삼동 아파트', date: '2025-12-13 14:30', status: '상담중' },
        { id: 2, customerName: '이영희', propertyName: '서초구 서초동 오피스텔', date: '2025-12-13 10:20', status: '완료' },
        { id: 3, customerName: '박민수', propertyName: '송파구 잠실동 상가', date: '2025-12-12 16:45', status: '상담중' },
        { id: 4, customerName: '최지우', propertyName: '강동구 천호동 빌딩', date: '2025-12-12 11:00', status: '완료' },
        { id: 5, customerName: '정다은', propertyName: '광진구 구의동 아파트', date: '2025-12-11 15:20', status: '보류' },
      ]);

      setExpiringContracts([
        { id: 1, customerName: '홍길동', propertyName: '강남구 논현동 아파트', expiryDate: '2025-12-20', daysLeft: 7 },
        { id: 2, customerName: '김미영', propertyName: '서초구 반포동 오피스텔', expiryDate: '2025-12-25', daysLeft: 12 },
        { id: 3, customerName: '이준호', propertyName: '송파구 문정동 상가', expiryDate: '2026-01-05', daysLeft: 23 },
        { id: 4, customerName: '박서연', propertyName: '강동구 암사동 아파트', expiryDate: '2026-01-10', daysLeft: 28 },
        { id: 5, customerName: '윤지호', propertyName: '광진구 자양동 빌딩', expiryDate: '2026-01-15', daysLeft: 33 },
      ]);
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 무료개월 내역 열기(무료개월 클릭) — 데스크톱: 작은 새 창 / 웹: 인페이지 폴백
  const openMembHistory = async () => {
    if (window.electronAPI?.modal?.open) {
      try {
        await window.electronAPI.modal.open({
          type: 'free-months',
          data: { title: '무료개월 내역', offNo: user?.offNo },
          width: 680, height: 560, minWidth: 520, minHeight: 420, resizable: true,
        });
        return;
      } catch (e) { console.error('무료개월 창 열기 실패:', e); }
    }
    setShowFreeMonths(true);
  };

  // 내 추천인 목록 열기 — 데스크톱: 작은 새 창 / 웹: 인페이지 폴백
  const openReferralList = async () => {
    if (window.electronAPI?.modal?.open) {
      try {
        await window.electronAPI.modal.open({
          type: 'referral-list',
          data: { title: '내 추천인 목록', rtNo: user?.rtNo ?? null }, // 열 때 API로 최신 조회
          width: 660, height: 600, minWidth: 520, minHeight: 420, resizable: true,
        });
        return;
      } catch (e) { console.error('추천목록 창 열기 실패:', e); }
    }
    setShowReferralList(true);
  };

  // 이벤트참여 열기 — variant: 'mission'(미션문구·파일) | 'review'(리뷰이벤트·텍스트). 데스크톱 새 창 / 웹 인페이지 폴백
  const openEventParticipation = async (variant = 'mission') => {
    const title = variant === 'review' ? '리뷰이벤트' : '미션문구';
    const data = { title, variant, userId: user?.id || user?.userId, offNo: user?.offNo, rtNo: user?.rtNo, userNm: user?.rtNm || user?.userName };
    if (window.electronAPI?.modal?.open) {
      try {
        await window.electronAPI.modal.open({ type: 'event-participation', data, width: 760, height: 780, minWidth: 560, minHeight: 520, resizable: true });
        return;
      } catch (e) { console.error('이벤트참여 창 열기 실패:', e); }
    }
    setShowEventPart(variant);
  };
  // 매뉴얼 — 준비중
  const openManual = () => toast('매뉴얼은 준비 중입니다.');

  // 원격지원 — ezHelp 위젯 임베드 작은 새 창 (데스크톱: 모달 창 / 웹: 새 창에 임베드)
  const openRemoteSupportWindow = () => {
    setShowRemoteGuide(false);
    if (window.electronAPI?.modal?.open) {
      window.electronAPI.modal.open({ type: 'remote-support', data: { title: '원격지원' }, width: 420, height: 380, minWidth: 380, minHeight: 320, resizable: true })
        .catch((e) => console.error('원격지원 창 열기 실패:', e));
      return;
    }
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>원격지원</title>`
      + `<style>body{margin:0;font-family:Pretendard,system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px;}h3{font-size:16px;margin:0;}</style>`
      + `</head><body><h3>원격지원</h3><div id="ezHelpActivex"></div>`
      + `<script src="https://939.co.kr/runezhelp.js"></` + `script>`
      + `<script>runezHelp({divid:'ezHelpActivex',userid:'neosis2026',width:'370',height:'210',type:'1',lang:'kr'});</` + `script>`
      + `</body></html>`;
    const w = window.open('', 'remoteSupport', 'width=420,height=380');
    if (w) { w.document.open(); w.document.write(html); w.document.close(); }
  };

  // 추천인 코드는 대표중개사(RTTYP01)만 보유 — 소속중개사 계정은 없음
  const isRepBroker = user?.rtType === 'RTTYP01';
  const copyReferral = () => {
    const code = user?.referralCode;
    if (!code) { toast.error('추천인 코드가 없습니다.'); return; }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(() => toast.success('추천인 코드가 복사되었습니다.')).catch(() => toast.error('복사에 실패했습니다.'));
    } else {
      toast.error('복사를 지원하지 않는 환경입니다.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '상담중': return 'bg-blue-100 text-blue-800';
      case '완료': return 'bg-green-100 text-green-800';
      case '보류': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysLeftColor = (days) => {
    if (days <= 7) return 'text-red-600 font-bold';
    if (days <= 14) return 'text-orange-600 font-semibold';
    return 'text-gray-600';
  };

  // 사무실관리 클릭 — 하위메뉴 있으면 선택창, 없으면 바로 비밀번호 단계
  // 사무실관리 클릭 → 먼저 비밀번호 재검증(게이트). 통과 후 하위메뉴 선택(또는 단일 route 바로 열기)
  const openOffice = (menu) => {
    if (!menu) return;
    // 비밀번호 통과 즉시 "사무실정보 수정 / 직원관리" 2탭 창을 바로 연다 (하위메뉴 선택 단계 제거)
    setOfficePwTarget({ key: 'office-hub', title: '사무실관리', route: '/agents/office-hub', gate: true });
    setOfficePw('');
    setOfficePwError('');
  };

  // 지정 route를 새 창(데스크톱)으로 열기
  const openOfficeRoute = (key, title, route) => {
    if (!route) { toast('해당 페이지는 준비 중입니다.'); return; }
    if (window.electronAPI?.openTabInWindow) {
      window.electronAPI.openTabInWindow({ tabId: key, route, title, content: route.replace(/^\//, '') })
        .catch((e) => { console.error('사무실관리 창 열기 실패:', e); toast('해당 페이지는 준비 중입니다.'); });
    } else {
      toast('데스크톱 앱에서 사용할 수 있습니다.');
    }
  };

  // 하위메뉴 선택 → (비밀번호는 이미 게이트에서 통과) 바로 이동
  const selectOfficeSub = (child) => {
    setShowOfficeMenu(false);
    openOfficeRoute(child.id, child.title, child.path);
  };

  // 비밀번호 재검증(로그인 API 재호출) → 통과 시 하위메뉴 열기(또는 단일 route)
  const confirmOfficePw = async () => {
    if (!officePw) { setOfficePwError('비밀번호를 입력하세요.'); return; }
    setOfficePwLoading(true);
    setOfficePwError('');
    try {
      const res = await authService.login(user?.id || user?.userId, officePw);
      if (!res?.success) { setOfficePwError('비밀번호가 일치하지 않습니다.'); return; }
      const target = officePwTarget;
      setOfficePwTarget(null);
      setOfficePw('');
      // 하위메뉴가 있으면 선택 모달, 없으면 단일 route 바로 열기
      if (target?.gate && target?.children && target.children.length > 0) {
        setShowOfficeMenu(true);
        return;
      }
      openOfficeRoute(target?.key, target?.title, target?.route);
    } catch (e) {
      setOfficePwError('비밀번호가 일치하지 않습니다.');
    } finally {
      setOfficePwLoading(false);
    }
  };

  const handleMenuCardClick = async (item) => {
    // 자식 메뉴가 있는 경우 펼치기/접기
    if (item.children && item.children.length > 0) {
      setExpandedMenus(prev => ({
        ...prev,
        [item.id]: !prev[item.id]
      }));
    } else if (item.path) {
      // 자식이 없는 경우 새 창으로 열기
      const contentType = item.path.replace(/^\//, '');
      // 네오봇은 로그아웃 좌측 버튼과 동일 창(tabId 'neobot')으로 열기
      const tabId = item.path === '/neobot' ? 'neobot' : item.id;

      if (window.electronAPI) {
        // Electron 환경에서 새 창으로 열기
        try {
          await window.electronAPI.openTabInWindow({
            tabId,
            title: item.title,
            content: contentType,
            route: item.path
          });
        } catch (error) {
          console.error('Failed to open window:', error);
        }
      }
    }
  };

  // 메뉴를 재귀적으로 렌더링 (아이콘 없이 텍스트 중심, 컴팩트)
  const renderMenuCard = (menu, level = 0) => {
    const hasChildren = menu.children && menu.children.length > 0;
    const isExpanded = expandedMenus[menu.id];
    const activeChildren = menu.children?.filter(child => child.isActive) || [];
    const authorized = menu.authorized !== false; // API 결과에 없으면 권한없음(연하게)
    // 멤버십 미가입: 메뉴는 정상 노출(보이되) + 클릭 시 가입 안내
    const membershipLocked = menuLocked;
    const displayAuthorized = membershipLocked ? true : authorized;
    const MenuIcon = level === 0 && menu.icon ? iconMap[menu.icon] : null;
    // 네오봇 메뉴 카드는 서비스 보라색으로 강조
    const isNeobot = menu.path === '/neobot' || (menu.title || '').includes('네오봇');

    return (
      <div key={menu.id} className={level > 0 ? 'ml-3' : ''}>
        <div
          className={`rounded-lg border transition-all ${
            displayAuthorized
              ? `cursor-pointer hover:shadow-md ${level === 0 ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200'}`
              : 'cursor-not-allowed opacity-50 bg-gray-50 border-gray-200'
          }`}
          style={isNeobot && displayAuthorized ? { background: '#7c3aed', borderColor: '#7c3aed' } : undefined}
          onClick={(e) => {
            e.stopPropagation();
            if (membershipLocked) { lockToast(); return; }
            if (!authorized) return;
            handleMenuCardClick(menu);
          }}
          title={!displayAuthorized ? '권한없음' : undefined}
        >
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="min-w-0 flex items-center gap-1.5">
              {!displayAuthorized && <Lock className="h-4 w-4 flex-shrink-0" style={{ color: '#94a3b8' }} />}
              {displayAuthorized && MenuIcon && <MenuIcon className="h-4 w-4 flex-shrink-0" style={{ color: isNeobot ? '#ffffff' : '#4f46e5' }} />}
              <div className="min-w-0">
                <h3 className={`${level === 0 ? 'text-sm font-semibold' : 'text-xs font-medium'} ${displayAuthorized ? 'text-gray-900' : 'text-slate-400'} truncate`}
                  style={isNeobot && displayAuthorized ? { color: '#ffffff' } : undefined}>
                  {menu.title}
                </h3>
                {!displayAuthorized && (
                  <span className="block leading-tight" style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>권한없음</span>
                )}
              </div>
            </div>
            {displayAuthorized && !membershipLocked && hasChildren && (
              <ChevronRight
                className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            )}
          </div>
        </div>

        {/* 자식 메뉴 렌더링 */}
        {hasChildren && isExpanded && !membershipLocked && (
          <div className="mt-1.5 space-y-1.5">
            {activeChildren.map(child => renderMenuCard(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // 활성화된 루트 메뉴만 필터링
  const activeMenus = menuItems.filter(item => item.isActive && !item.parentId);
  // 사무실관리 메뉴는 그리드에서 빼고 최하단 전체폭으로 별도 렌더 (하위메뉴 선택 + 비밀번호 재검증)
  const officeMenu = activeMenus.find(m => (m.title || '').includes('가입비 및 상품결제'));
  const gridMenus = activeMenus.filter(m => m !== officeMenu);
  const officeChildren = (officeMenu?.children || []).filter(c => c.isActive);
  // 메뉴 잠금은 '멤버십 미가입'만 적용(가입비 미결제로는 메뉴를 막지 않음 — 팝업 안내만).
  // [임시] 미가입 메뉴 잠금 해제. 복구하려면 아래 임시 라인을 지우고 원본 라인을 사용.
  // const menuLocked = user?.hasMembership === false;
  const menuLocked = false;
  const lockToast = () => toast.error('멤버십 가입 후 이용 가능합니다.');
  // 직원 메뉴 권한: allowedMenus가 Set이면 그 안에 있는 메뉴만 허용(권한없음 표기), null이면 제한없음(대표)
  const menuAllowed = (key) => (allowedMenus === null ? true : allowedMenus.has(key));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  // 공지/이벤트 통합 롤링 아이템 (한 배너에서 번갈아 표시)
  // 커뮤니티 열기 (새 창 팝업 / 웹 폴백) — initialTab로 진입 탭 지정
  const openCommunity = async (initialTab = '공지사항', initialPostId = null) => {
    if (window.electronAPI?.modal?.open) {
      try { await window.electronAPI.modal.open({ type: 'community', data: { title: '커뮤니티', initialTab, initialPostId }, width: 900, height: 700, minWidth: 720, minHeight: 560, resizable: true }); return; }
      catch (e) { console.error('커뮤니티 창 열기 실패:', e); }
    }
    setCommunityTab(initialTab);
    setCommunityPostId(initialPostId);
    setShowCommunity(true);
  };

  const rollingItems = [
    ...notices.map((n) => ({ kind: '공지사항', title: n.title, date: n.date, id: n.id })),
    ...events.map((e) => ({ kind: '이벤트', title: e.title, date: e.date, id: e.id })),
  ];
  const rollingCurrent = rollingItems.length ? rollingItems[rollIndex % rollingItems.length] : null;

  // 일주일 이내 여부 확인
  const isNewNotice = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  return (
    <div className="p-3 space-y-2 bg-gray-50 min-h-full">
      {/* 로그인 후 공지 팝업(게시기간·오늘/다시 보지않음·자동정리) */}
      <NoticePopup />

      {/* 가입비 결제 안내 팝업 (대표·미결제 — 로그인 후 1회) */}
      {showEntryFeePopup && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1450, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowEntryFeePopup(false)}>
          <div style={{ width: '460px', maxWidth: '96vw', background: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 16px 44px rgba(0,0,0,0.32)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '24px 26px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>가입비 결제가 필요합니다</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155', lineHeight: 1.7 }}>
                네오시스 이용을 위해 중개사무소 <b style={{ color: '#111827', fontWeight: 800 }}>가입비 {(165000).toLocaleString()}원</b>(부가세 포함)을 먼저 결제해 주세요.<br />
                결제 즉시 멤버십 활성화 및 프로그램 다운로드가 가능합니다.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', padding: '16px 26px 22px' }}>
              <button type="button" onClick={() => setShowEntryFeePopup(false)}
                style={{ padding: '11px 20px', fontSize: '14px', fontWeight: 700, color: '#334155', background: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer' }}>나중에</button>
              <button type="button" onClick={() => { setShowEntryFeePopup(false); openEntryFeePay(); }}
                style={{ padding: '11px 28px', fontSize: '14px', fontWeight: 800, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>가입비 결제하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 참여 이벤트 확인완료 알림 (대표자 최초 1회) */}
      {eventWins.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1400, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setEventWins([])}>
          <div style={{ width: '440px', maxWidth: '96vw', background: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 16px 44px rgba(0,0,0,0.32)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '22px 24px 10px', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f3f0ff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <Gift className="w-7 h-7" style={{ color: '#7c3aed' }} />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827' }}>축하합니다! 🎉</div>
              <div style={{ marginTop: '6px', fontSize: '15px', fontWeight: 700, color: '#334155' }}>참여하신 이벤트가 확인 완료되었습니다.</div>
            </div>
            <div style={{ padding: '6px 24px 4px', maxHeight: '40vh', overflowY: 'auto' }}>
              {eventWins.map((e, i) => (
                <div key={e.entryId ?? e.EntryId ?? i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', border: '1px solid #ede9fe', background: '#faf5ff', borderRadius: '10px', marginBottom: '8px' }}>
                  <Gift className="w-4 h-4 flex-shrink-0" style={{ color: '#7c3aed' }} />
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>{e.eventTitle ?? e.EventTitle ?? '이벤트'}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: 800, color: '#0f766e', whiteSpace: 'nowrap' }}>확인 완료</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 24px 20px', textAlign: 'center' }}>
              <button type="button" onClick={() => setEventWins([])}
                style={{ padding: '11px 32px', fontSize: '14px', fontWeight: 800, color: 'white', background: '#7c3aed', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>확인</button>
            </div>
          </div>
        </div>
      )}
      {/* 1. 회원정보(내혜택 포함) — flat(배경 없음) + 하단 얇은 구분선 */}
      <div className="bg-transparent px-0 pt-0 pb-2 border-b border-gray-200">
        <div className="flex flex-col gap-2">
          {/* 회원정보 + 내혜택 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              {/* 1행: 이름+직급님 (조금 큰 폰트) + 인사말 편집 + (우측끝) 상담모드·로그아웃 */}
              <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: 0 }}>
                  {(user?.rtNm || user?.userName || '사용자')}{jobTitle ? ` ${jobTitle}` : ''}님
                </h2>
                {!editingGreeting && user?.rtType === 'RTTYP01' && (
                  <button type="button" onClick={startEditGreeting} title="인사말 편집 (사무소 공유)"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '14px', fontWeight: 700, color: '#4f46e5', background: 'white', border: '1px solid #c7d2fe', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer' }}>
                    인사말 편집
                  </button>
                )}
                {/* 우측끝: 로그아웃 (상담모드는 이벤트 배너 위 행으로 이동) */}
                <div className="flex items-center gap-3" style={{ marginLeft: 'auto' }}>
                  <button type="button" onClick={() => setShowLogoutConfirm(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 font-semibold text-gray-700 bg-white border border-gray-300 hover:text-red-600 hover:border-red-300 hover:bg-red-50 rounded-md transition-colors"
                    style={{ flexShrink: 0, fontSize: '13px' }}>
                    로그아웃
                  </button>
                </div>
              </div>
              {/* 2행: 인사말 (이름 아래) — 보기/편집 */}
              {editingGreeting ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <input value={greetingDraft} onChange={(e) => setGreetingDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveGreeting(); }} autoFocus
                    style={{ fontSize: '14px', padding: '3px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', minWidth: '240px' }} placeholder="인사말 (예: 즐거운 하루 되세요)" />
                  <button type="button" onClick={saveGreeting} style={{ fontSize: '14px', fontWeight: 700, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '6px', padding: '3px 12px', cursor: 'pointer' }}>저장</button>
                  <button type="button" onClick={() => setEditingGreeting(false)} style={{ fontSize: '14px', fontWeight: 700, color: '#64748b', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer' }}>취소</button>
                </div>
              ) : (
                <div style={{ marginTop: '2px', fontSize: '15px', fontWeight: 700, color: '#4f46e5' }}>{greeting}</div>
              )}
              {/* 내혜택: 무료개월 / 가입일 / 다음결제 (톤다운 — 슬레이트 계열) */}
              <div className="flex items-center gap-3 mt-1" style={{ flexWrap: 'wrap' }}>
                <button type="button" onClick={openMembHistory}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '13px', fontWeight: 600, color: '#475569' }} title="멤버십 변동 이력 보기">
                  무료개월 <span style={{ color: '#334155', fontWeight: 800 }}>{membership ? (membership.FreeMonths ?? membership.freeMonths ?? 0) : 0}개월</span>
                </button>
                {!membership && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>가입된 상품이 없습니다.</span>
                    {/* [임시] 가입하기 버튼 숨김. 복구하려면 아래 블록의 false 를 user?.rtType === 'RTTYP01' 로 되돌리면 됨 */}
                    {false && user?.rtType === 'RTTYP01' && (
                      <button type="button" onClick={openSubscribe}
                        style={{ fontSize: '14px', fontWeight: 800, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '6px', padding: '4px 14px', cursor: 'pointer' }}>가입하기</button>
                    )}
                  </span>
                )}
                {membership && (membership.RegDt ?? membership.regDt) && (
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    가입일 <span style={{ color: '#334155', fontWeight: 800 }}>{String(membership.RegDt ?? membership.regDt).slice(0, 10)}</span>
                  </span>
                )}
                {membership && (membership.NextPaymentDate ?? membership.nextPaymentDate) && (
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    다음결제 <span style={{ color: '#334155', fontWeight: 800 }}>{String(membership.NextPaymentDate ?? membership.nextPaymentDate).slice(0, 10)}</span>
                  </span>
                )}
              </div>
              {/* 내 추천인 코드 (대표중개사 전용) — 색상 톤다운 */}
              {isRepBroker && (
                <div className="flex items-center gap-2 mt-1.5" style={{ flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>내 추천인 코드</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#334155', letterSpacing: '1px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '2px 8px', whiteSpace: 'nowrap' }}>{user?.referralCode || '-'}</span>
                  <button onClick={copyReferral} title="추천인 코드 복사" style={{ flexShrink: 0, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#64748b', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}>
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={openReferralList} title="내 추천인 목록" style={{ flexShrink: 0, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 700, color: '#475569', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}>
                    <UserPlus className="w-3.5 h-3.5" /> 추천목록
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 이벤트 배너 위 — 상담모드(좌) / 이벤트참여·매뉴얼(우) */}
      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <button type="button" onClick={toggleConsult}
          title="상담모드: ON 시 물건/고객 폼의 우측 카드(특징·상담내용·소유자 등)가 숨겨집니다"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: consultOn ? '#4f46e5' : '#111827', whiteSpace: 'nowrap' }}>상담모드</span>
          <span style={{ position: 'relative', width: '38px', height: '20px', borderRadius: '999px', background: consultOn ? '#4f46e5' : '#cbd5e1', transition: 'background .15s', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: '2px', left: consultOn ? '20px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'white', transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
          </span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button type="button" onClick={() => openEventParticipation('mission')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '14px', fontWeight: 700, color: '#7c3aed', background: 'white', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer' }}>
            <Gift className="w-4 h-4" /> 미션문구
          </button>
          <button type="button" onClick={() => openEventParticipation('review')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '14px', fontWeight: 700, color: '#be185d', background: 'white', border: '1px solid #fbcfe8', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer' }}>
            <Gift className="w-4 h-4" /> 리뷰이벤트
          </button>
          <button type="button" onClick={openManual}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '14px', fontWeight: 700, color: '#4f46e5', background: 'white', border: '1px solid #c7d2fe', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer' }}>
            <FileText className="w-4 h-4" /> 매뉴얼
          </button>
        </div>
      </div>

      {/* 2. 공지사항 / 이벤트 롤링 (단일 배너) */}
      <div
        className="bg-white border-2 border-indigo-200 rounded-lg px-4 py-2.5 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => openCommunity(rollingCurrent?.kind === '이벤트' ? '이벤트' : '공지사항', rollingCurrent?.id ?? null)}
      >
        <style>{`@keyframes dashRollUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
        <div className="flex items-center gap-3">
          <Bell className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', height: '22px', position: 'relative' }}>
            {rollingCurrent ? (
              <div key={rollIndex} className="flex items-center gap-2" style={{ height: '22px', animation: 'dashRollUp 0.5s ease' }}>
                <span className={`text-xs font-semibold flex-shrink-0 ${rollingCurrent.kind === '공지사항' ? 'text-indigo-600' : 'text-purple-600'}`}>
                  {rollingCurrent.kind}
                </span>
                {/* N 배지는 공지사항에만 (이벤트 제외) */}
                {rollingCurrent.kind === '공지사항' && isNewNotice(rollingCurrent.date) && (
                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded flex-shrink-0">N</span>
                )}
                <p className="text-sm font-medium text-gray-900 truncate flex-1">{rollingCurrent.title}</p>
                <span className="text-xs text-gray-500 flex-shrink-0">{formatDate(rollingCurrent.date)}</span>
              </div>
            ) : (
              <p className="text-sm text-gray-500" style={{ lineHeight: '22px' }}>등록된 공지사항/이벤트가 없습니다.</p>
            )}
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">더보기 →</span>
        </div>
      </div>

      {/* 3. 메뉴 영역 — 멤버십 미가입 시에도 메뉴는 노출(상품가입은 사무실관리 → 상품가입 탭에서) */}
      <>
      {/* 메뉴 카드 (상단 권한메뉴 + 하단 기능메뉴를 한 그리드에 연속 배치 — 빈칸 방지) */}
      <div className="grid grid-cols-3 gap-2.5">
        {gridMenus.map((menu) => renderMenuCard({ ...menu, authorized: menuAllowed(menu.title) }))}
        {[
          { key: 'note', label: '쪽지관리', icon: MessageSquare, onClick: () => openNotes(), badge: unreadNoteCount },
          { key: 'sms', permKey: '문자관리', label: '대량문자관리', icon: Smartphone, onClick: async () => {
            if (window.electronAPI?.modal?.open) {
              try { await window.electronAPI.modal.open({ type: 'sms-manager', data: { title: '대량문자관리' }, width: 1040, height: 780, minWidth: 820, minHeight: 620, resizable: true }); return; }
              catch (e) { console.error('문자관리 창 열기 실패:', e); }
            }
            setShowSms(true); // 웹 폴백: 인페이지 모달
          } },
          { key: 'expiry', permKey: '만기안내', label: '만기관리', icon: Clock, onClick: async () => {
            if (window.electronAPI?.openTabInWindow) {
              try { await window.electronAPI.openTabInWindow({ tabId: 'expiry', route: '/expiry', title: '만기관리' }); return; }
              catch (e) { console.error('만기관리 창 열기 실패:', e); }
            }
            navigate('/expiry'); // 웹 폴백
          } },
          { key: 'worklog', label: '업무일지', icon: ClipboardList, onClick: async () => {
            if (window.electronAPI?.openTabInWindow) {
              try { await window.electronAPI.openTabInWindow({ tabId: 'worklog', route: '/worklog', title: '업무일지' }); return; }
              catch (e) { console.error('업무일지 창 열기 실패:', e); }
            }
            setShowWorklog(true); // 웹 폴백: 모달
          } },
          { key: 'community', label: '커뮤니티', icon: FolderOpen, onClick: () => openCommunity('공지사항') },
          { key: 'memo', label: '메모', icon: StickyNote, onClick: async () => {
            if (window.electronAPI?.openTabInWindow) {
              try { await window.electronAPI.openTabInWindow({ tabId: 'memo', route: '/memo', title: '메모' }); return; }
              catch (e) { console.error('메모 창 열기 실패:', e); }
            }
            setShowMemo(true); // 웹 폴백: 모달
          } },
          { key: 'pcphone', label: 'PC폰관리', icon: Phone, onClick: () => {
            // 통신사 승인 대기 — 현재는 안내만, 창은 열지 않음
            toast('통신사 승인 대기중입니다.');
          } },
          { key: 'remote', label: '원격지원', icon: Monitor, onClick: () => setShowRemoteGuide(true) },
        ].map((m) => {
          const allowed = menuAllowed(m.permKey || m.label);
          const showEnabled = menuLocked || allowed; // 멤버십 미가입 시에도 정상 노출(클릭 시 가입 안내)
          return (
          <div
            key={m.key}
            className={`rounded-lg border transition-all ${showEnabled ? 'bg-white border-gray-200 cursor-pointer hover:shadow-md' : 'bg-gray-50 border-gray-200 cursor-not-allowed'}`}
            onClick={() => { if (menuLocked) { lockToast(); return; } if (!allowed) { toast.error('권한이 없습니다.'); return; } m.onClick(); }}
            title={showEnabled ? undefined : '권한없음'}
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="min-w-0 flex items-center gap-1.5">
                {!showEnabled ? <Lock className="h-4 w-4 flex-shrink-0" style={{ color: '#94a3b8' }} />
                  : (m.icon && <m.icon className="h-4 w-4 flex-shrink-0" style={{ color: '#4f46e5' }} />)}
                <div className="min-w-0">
                  <h3 className={`text-sm font-semibold truncate ${showEnabled ? 'text-gray-900' : 'text-slate-400'}`}>{m.label}</h3>
                  {!showEnabled && <span className="block leading-tight" style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>권한없음</span>}
                </div>
              </div>
              {showEnabled && m.badge > 0 && (
                <span style={{ minWidth: '18px', height: '18px', padding: '0 5px', borderRadius: '9px', background: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0 }}>
                  {m.badge > 99 ? '99+' : m.badge}
                </span>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {/* 사무실관리 — 최하단 전체폭. 대표자(RTTYP01)만 노출. 클릭 시 비밀번호 재검증 후 페이지 열기 */}
      {officeMenu && user?.rtType === 'RTTYP01' && (
        <div
          className="rounded-lg border bg-white border-gray-200 cursor-pointer transition-all hover:shadow-md"
          style={{ width: '100%' }}
          onClick={() => openOffice(officeMenu)}
        >
          <div className="flex items-center justify-center gap-2 px-3 py-3">
            <Building2 className="h-4 w-4 flex-shrink-0" style={{ color: '#4f46e5' }} />
            <h3 className="text-sm font-semibold text-gray-900">{officeMenu.title}</h3>
            <Lock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          </div>
        </div>
      )}
      </>

      {/* 사무실관리 — 하위메뉴 선택 모달 */}
      {showOfficeMenu && officeMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowOfficeMenu(false)}>
          <div style={{ width: '420px', maxWidth: '96vw', background: 'white', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 className="w-5 h-5" style={{ color: '#4f46e5' }} />
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>{officeMenu.title}</span>
              </div>
              <button onClick={() => setShowOfficeMenu(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#334155', display: 'inline-flex' }}><X className="w-6 h-6" /></button>
            </div>
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {officeChildren.map((sub) => (
                <button key={sub.id} onClick={() => selectOfficeSub(sub)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', fontSize: '14px', fontWeight: 700, textAlign: 'left', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', color: '#111827', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#eef2ff')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}>
                  <span>{sub.title}</span>
                  <ChevronRight className="w-4 h-4" style={{ color: '#94a3b8' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 사무실관리 — 비밀번호 재검증 모달 */}
      {officePwTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1210, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => { if (!officePwLoading) setOfficePwTarget(null); }}>
          <div style={{ width: '380px', maxWidth: '96vw', background: 'white', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock className="w-5 h-5" style={{ color: '#4f46e5' }} />
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>{officePwTarget.title}</span>
              </div>
              <button onClick={() => { if (!officePwLoading) setOfficePwTarget(null); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#334155', display: 'inline-flex' }}><X className="w-6 h-6" /></button>
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>보안을 위해 비밀번호를 다시 입력해주세요.</div>
              <input
                type="password"
                autoFocus
                value={officePw}
                onChange={(e) => { setOfficePw(e.target.value); setOfficePwError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !officePwLoading) confirmOfficePw(); }}
                placeholder="비밀번호"
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: '14px', border: `1px solid ${officePwError ? '#fca5a5' : '#cbd5e1'}`, borderRadius: '6px', outline: 'none', color: '#111827' }}
              />
              {officePwError && <div style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626', marginTop: '6px' }}>{officePwError}</div>}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button onClick={() => { if (!officePwLoading) setOfficePwTarget(null); }}
                  style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', background: 'white', color: '#374151', borderRadius: '6px', cursor: 'pointer' }}>취소</button>
                <button onClick={confirmOfficePw} disabled={officePwLoading}
                  style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 700, border: '1px solid #4f46e5', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: officePwLoading ? 'default' : 'pointer', opacity: officePwLoading ? 0.6 : 1 }}>
                  {officePwLoading ? '확인 중...' : '확인'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 무료개월 내역 (웹 폴백 인페이지 모달 — 데스크톱은 새 창) */}
      {showFreeMonths && (
        <FreeMonthsModal offNo={user?.offNo} onClose={() => setShowFreeMonths(false)} />
      )}

      {/* 내 추천인 목록 (웹 폴백 인페이지 모달 — 데스크톱은 새 창) */}
      {showReferralList && isRepBroker && (
        <ReferralListModal rtNo={user?.rtNo ?? null} onClose={() => setShowReferralList(false)} />
      )}

      {/* 이벤트참여 (웹 폴백 인페이지 모달 — 데스크톱은 새 창) */}
      {showEventPart && (
        <EventParticipationModal
          variant={typeof showEventPart === 'string' ? showEventPart : 'mission'}
          userId={user?.id || user?.userId} offNo={user?.offNo} rtNo={user?.rtNo} userNm={user?.rtNm || user?.userName}
          onClose={() => setShowEventPart(false)}
        />
      )}

      {/* 하단 안내 — 고객센터(이미지 대신 텍스트, 여백 최소화) + 카톡문의 이미지 */}
      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', paddingBottom: '6px' }}>
        {/* 고객센터 안내 (텍스트) — 좌측 정렬, 라벨은 '점심시간' 폭에 맞춰 양끝 정렬 */}
        <div style={{ lineHeight: 1.3, alignSelf: 'flex-start' }}>
          {/* 고객센터 + 전화번호 (같은 줄) */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '4px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>고객센터</span>
            <span style={{ fontSize: '26px', fontWeight: 800, color: '#4f46e5' }}>02-381-2455</span>
          </div>
          {[['평일', '10:00~18:00'], ['점심시간', '12:00~13:30'], ['토요일', '10:00~14:00']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', fontWeight: 700, color: '#334155' }}>
              <span style={{ display: 'inline-block', width: '68px', textAlign: 'justify', textAlignLast: 'justify' }}>{k}</span>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
        {/* 고객센터 아래 구분선 */}
        <hr style={{ width: '100%', maxWidth: '900px', border: 'none', borderTop: '1px solid #e5e7eb', margin: '2px 0' }} />
        {/* 카톡문의 — 클릭 시 카카오톡 채널 채팅(외부 브라우저) */}
        <img
          src={chatImg}
          alt="카톡문의"
          onClick={() => { const url = 'http://pf.kakao.com/_wxjxcrX/chat'; if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url); else window.open(url, '_blank', 'noopener'); }}
          title="카카오톡 채팅 상담"
          style={{ width: 'auto', maxWidth: '100%', display: 'block', cursor: 'pointer' }}
        />
      </div>

      {/* 스티커 메모 */}
      <StickyMemo isOpen={showMemo} onClose={() => setShowMemo(false)} />
      {showWorklog && <WorkJournalPage inModal onClose={() => setShowWorklog(false)} />}

      {/* 자료실 — 서류 다운로드 */}
      <DataRoomModal isOpen={showDataRoom} onClose={() => setShowDataRoom(false)} />
      {showCommunity && <CommunityBoard onClose={() => setShowCommunity(false)} initialTab={communityTab} initialPostId={communityPostId} />}

      {/* 로그아웃 확인 (공통 모달) */}
      <ConfirmDialog
        open={showLogoutConfirm}
        message="로그아웃 하시겠습니까?"
        confirmText="로그아웃"
        cancelText="취소"
        onConfirm={() => { setShowLogoutConfirm(false); try { window.electronAPI?.closeAllExceptMain?.(); } catch { /* noop */ } useAuthStore.getState().logout(); toast.success('로그아웃되었습니다.'); navigate('/login'); }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* 문자관리 (웹 폴백 인페이지 모달) */}
      {showSms && <SmsManagerModal onClose={() => setShowSms(false)} />}

      {/* 원격지원 안내 — 확인 누르면 원격지원 새 창 오픈 */}
      {showRemoteGuide && (
        <div onClick={() => setShowRemoteGuide(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '380px', maxWidth: '92%', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 16px 44px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '26px 22px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>원격지원</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155', lineHeight: 1.6 }}>상담원에게 안내받은 숫자를 클릭해주세요.</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', padding: '0 20px 20px', justifyContent: 'center' }}>
              <button type="button" onClick={() => setShowRemoteGuide(false)}
                style={{ padding: '10px 22px', fontSize: '14px', fontWeight: 700, color: '#334155', background: 'white', border: '1px solid #cbd5e1', borderRadius: '9px', cursor: 'pointer' }}>취소</button>
              <button type="button" onClick={openRemoteSupportWindow}
                style={{ padding: '10px 28px', fontSize: '14px', fontWeight: 800, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '9px', cursor: 'pointer' }}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 상품 가입(멤버십 미가입) — 가입 즉시 hasMembership 갱신하여 메뉴 잠금 해제 */}
      {showSubscribe && (
        <MembershipSubscribeModal
          offNo={user?.offNo}
          userId={user?.userId || user?.id}
          onClose={() => setShowSubscribe(false)}
          onSubscribed={() => updateUser({ hasMembership: true })}
        />
      )}
    </div>
  );
};

export default DashboardPage;