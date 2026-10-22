import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import hubService from '../../services/hubService';
import { useNoteStore } from '../../stores/noteStore';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/authService';
import ConfirmDialog from '../ui/ConfirmDialog';
import DateInput from '../ui/DateInput';

/**
 * 쪽지 관리 (공동중개망, 개인 단위) — 메신저(카톡) 방식
 *  - 대화목록: 상대별 최근 메시지 1줄 표기 (받은/보낸 구분 없음)
 *  - 채팅창 : 클릭 시 상대와 주고받은 쪽지를 말풍선으로, 하단 입력창으로 전송
 *  - 제목   : 공동중개망 쪽지보내기 진입 시 등록일/물건유형/주소 자동기입
 * props:
 *  - isOpen, onClose
 *  - userId, userName        : 현재 사용자(개인)
 *  - initialReceivers        : [{ id, name }] 선택된 물건/고객 행의 등록자 (진입 시 바로 채팅)
 *  - initialTitle            : 제목 자동기입값(등록일 물건유형 주소)
 *  - onChanged               : 목록/읽음 변경 시 콜백 (미읽음 배지 갱신용)
 */

const fmt = (dt) => {
  if (!dt) return '';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
// 채팅 말풍선용 시각(HH:MM)
const fmtTime = (dt) => { const s = fmt(dt); return s.length >= 16 ? s.slice(11) : s; };
// 날짜 구분선용 키/표기(카톡처럼 날짜가 바뀌면 구분선)
const dayKey = (dt) => { const s = fmt(dt); return s ? s.slice(0, 10) : ''; };
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const fmtDay = (dt) => {
  if (!dt) return '';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[d.getDay()]})`;
};

const NoteModal = ({ isOpen, onClose, userId, userName, initialReceivers = [], initialTab = null, initialTitle = '', openNonce, onChanged, page = false, onComposingChange, isRep: propIsRep, offNo: propOffNo }) => {
  const authUser = useAuthStore((s) => s.user);
  const authOffice = useAuthStore((s) => s.office);
  // 대표(RTTYP01) 여부 · 사무소번호 (props 우선, 없으면 authStore)
  const isRep = propIsRep != null ? propIsRep : (authUser?.rtType === 'RTTYP01');
  const offNo = propOffNo != null ? propOffNo : (authOffice?.offNo ?? null);

  // 대화방설정(공개여부 제어) — 대표 전용, 우상단 토글 ON + 비밀번호 재확인 후 노출
  const [settingsUnlocked, setSettingsUnlocked] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const toggleSettings = () => {
    if (settingsUnlocked) { setSettingsUnlocked(false); return; }
    setPw(''); setPwErr(''); setPwOpen(true);
  };
  const confirmSettingsPw = async () => {
    if (!pw) { setPwErr('비밀번호를 입력하세요.'); return; }
    setPwLoading(true); setPwErr('');
    try {
      const res = await authService.login(userId, pw);
      if (res?.success) { setSettingsUnlocked(true); setPwOpen(false); setPw(''); }
      else setPwErr('비밀번호가 일치하지 않습니다.');
    } catch { setPwErr('비밀번호가 일치하지 않습니다.'); }
    finally { setPwLoading(false); }
  };

  const [mode, setMode] = useState('list');            // 'list'(대화목록) | 'chat'(채팅창)
  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  // 대화목록 검색: 기간 / 상호 / 통합
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [searchBiz, setSearchBiz] = useState('');
  const [searchAll, setSearchAll] = useState('');

  const [activeReceivers, setActiveReceivers] = useState([]); // 현재 채팅 상대 [{id,name}]
  const [activeOwner, setActiveOwner] = useState(null);       // 현재 방의 우리측 담당자 {id,name} (대표가 직원방 열람 시 사용)
  const [shares, setShares] = useState(() => new Map());      // 공개여부 맵: `${ownerId}::${partnerId}` → boolean(공개)
  const [thread, setThread] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState(null);
  // 대화방 내 검색(돋보기): 날짜 / 내용
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchDate, setChatSearchDate] = useState('');
  const [chatSearchText, setChatSearchText] = useState('');
  const unreadCount = useNoteStore((s) => s.unreadCount);

  // 작성 중 여부(전송 안 한 메시지) → 창 닫기 경고용
  const composing = mode === 'chat' && content.trim().length > 0;
  useEffect(() => { onComposingChange?.(composing); }, [composing, onComposingChange]);

  function dedupeReceivers(list) {
    const seen = new Set();
    return (list || []).filter((r) => r && r.id && !seen.has(String(r.id)) && seen.add(String(r.id)));
  }

  // 쪽지 1건에서 "상대"(나 아닌 쪽) 추출
  const partnerOf = useCallback((n) => (
    String(n.senderId) === String(userId)
      ? { id: String(n.receiverId), name: n.receiverName || String(n.receiverId) }
      : { id: String(n.senderId), name: n.senderName || String(n.senderId) }
  ), [userId]);

  // 대화목록: 대화방 = (우리측 담당자 owner) + (상대 사무소·담당자 partner)
  //  - 대표(사무소): 사무소 전체 직원의 대화방 노출 / 직원: 본인 방 + 대표가 공개한 방
  //  - 사무소 조회(getOfficeNotes) 미구현 시 개인 조회로 폴백(기존 동작 유지)
  const loadConversations = useCallback(async () => {
    if (!userId) return;
    setLoadingList(true);
    // 검색조건은 서버(API)에서 필터 — 기간/통합/상호
    const searchOpts = {
      regDtFr: searchFrom || undefined,
      regDtTo: searchTo || undefined,
      keyword: searchAll.trim() || undefined,
      bizKeyword: searchBiz.trim() || undefined,
    };
    try {
      let all = [];
      let ownerAware = false; // 사무소 조회 결과는 각 쪽지에 ownerId(우리측 담당자)가 실려온다고 가정
      if (offNo) {
        const off = await hubService.getOfficeNotes(offNo, userId, searchOpts);
        if (off.success && off.data.length) { all = off.data; ownerAware = true; }
      }
      if (!all.length) {
        const res = await hubService.getNotes(userId, 'all', searchOpts);
        all = res.data || [];
      }
      // 공개여부 맵
      const shMap = new Map();
      if (offNo) {
        const sh = await hubService.getNoteShares(offNo);
        for (const s of (sh.data || [])) shMap.set(`${s.ownerId}::${s.partnerId}`, s.share === 'Y');
      }
      setShares(shMap);

      const map = new Map();
      for (const n of all) {
        let ownerId, ownerName, partner;
        if (ownerAware) {
          if (n.ownerId == null) continue; // 사무소 조회 결과는 ownerId(우리측 담당자) 필수
          ownerId = String(n.ownerId);
          ownerName = n.ownerName || ownerId;
          partner = String(n.senderId) === ownerId
            ? { id: String(n.receiverId), name: n.receiverName || String(n.receiverId) }
            : { id: String(n.senderId), name: n.senderName || String(n.senderId) };
        } else {
          ownerId = String(userId); ownerName = userName; partner = partnerOf(n);
        }
        if (!partner.id) continue;
        const key = `${ownerId}::${partner.id}`; // 대화방 = 우리측 담당자 + 상대 담당자
        const mineRoom = ownerId === String(userId);
        const shared = shMap.get(key) === true;
        // 표시 범위: 대표=전체 / 직원=본인 방 또는 공개된 방
        if (!isRep && !mineRoom && !shared) continue;
        const cur = map.get(key) || { key, ownerId, ownerName, id: partner.id, name: partner.name, last: null, unread: 0, mineRoom };
        if ((!cur.name || cur.name === cur.id) && partner.name) cur.name = partner.name;
        if (!cur.last || new Date(n.regDt || 0) > new Date(cur.last.regDt || 0)) cur.last = n;
        if (String(n.receiverId) === ownerId && n.isRead !== 'Y') cur.unread += 1;
        map.set(key, cur);
      }
      const list = Array.from(map.values())
        .sort((a, b) => new Date(b.last?.regDt || 0) - new Date(a.last?.regDt || 0));
      setConversations(list);
    } catch { /* noop */ } finally { setLoadingList(false); }
  }, [userId, userName, partnerOf, isRep, offNo, searchFrom, searchTo, searchBiz, searchAll]);

  // 채팅창: 우리측 담당자(ownerId)와 상대(recs) 간 쪽지 전체(시간 오름차순) + 본인 방이면 읽음처리
  //  - ownerId 미지정이면 본인(userId). 대표가 다른 직원 방을 열면 사무소 조회로 해당 방 로드
  const loadThread = useCallback(async (recs, ownerId) => {
    const rlist = recs || activeReceivers;
    const oid = String(ownerId || userId);
    if (!userId || rlist.length === 0) { setThread([]); return; }
    const rids = new Set(rlist.map((r) => String(r.id)));
    setLoadingThread(true);
    try {
      let all = [];
      if (oid !== String(userId) && offNo) {
        const off = await hubService.getOfficeNotes(offNo, userId);
        all = (off.success && off.data.length) ? off.data : [];
      }
      if (!all.length) {
        const res = await hubService.getNotes(userId, 'all');
        all = res.data || [];
      }
      const msgs = all
        .filter((n) => {
          const s = String(n.senderId), r = String(n.receiverId);
          return (s === oid && rids.has(r)) || (rids.has(s) && r === oid);
        })
        .sort((a, b) => new Date(a.regDt || 0) - new Date(b.regDt || 0));
      setThread(msgs);
      // 읽음처리는 본인 방일 때만
      if (oid === String(userId)) {
        const unread = msgs.filter((n) => String(n.receiverId) === String(userId) && n.isRead !== 'Y');
        if (unread.length) {
          await Promise.all(unread.map((n) => hubService.markNoteRead(n.noteId).catch(() => {})));
          onChanged?.();
        }
      }
    } catch { /* noop */ } finally { setLoadingThread(false); }
  }, [userId, activeReceivers, onChanged, offNo]);

  // 오픈/재오픈: 수신자 지정 진입이면 바로 채팅, 아니면 대화목록
  useEffect(() => {
    if (!isOpen) return;
    setChatSearchOpen(false); setChatSearchDate(''); setChatSearchText('');
    if (initialReceivers.length > 0) {
      const recs = dedupeReceivers(initialReceivers);
      setActiveReceivers(recs);
      setActiveOwner({ id: String(userId), name: userName });
      setTitle('');
      // 공동중개망 진입 시 물건 등 정보를 쪽지 내용으로 최초 자동세팅(수정 후 전송 가능)
      setContent(initialTitle || '');
      setMode('chat');
      loadThread(recs, userId);
    } else {
      setMode('list');
      setActiveReceivers([]);
      setActiveOwner(null);
      setTitle(''); setContent('');
      // 대화목록 검색조건 초기화 (목록 로드는 아래 디바운스 effect가 담당)
      setSearchFrom(''); setSearchTo(''); setSearchBiz(''); setSearchAll('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, openNonce]);

  // 대화목록: 검색조건(기간/상호/통합) 변경 시 서버 재조회 (디바운스)
  useEffect(() => {
    if (!isOpen || mode !== 'list') return;
    const t = setTimeout(() => { loadConversations(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, searchFrom, searchTo, searchBiz, searchAll]);

  if (!isOpen) return null;

  const resetChatSearch = () => { setChatSearchOpen(false); setChatSearchDate(''); setChatSearchText(''); };

  const openConversation = (c) => {
    const recs = [{ id: c.id, name: c.name }];
    setActiveReceivers(recs);
    setActiveOwner({ id: c.ownerId, name: c.ownerName });
    setTitle('');   // 방 제목은 상대 상호로 표기 · 메시지 제목은 비움
    setContent('');
    resetChatSearch();
    setMode('chat');
    loadThread(recs, c.ownerId);
  };

  const backToList = () => {
    setMode('list');
    setActiveOwner(null);
    setContent('');
    resetChatSearch();
    loadConversations();
  };

  // 대표: 대화방 공개여부 토글
  const toggleShare = async (c, e) => {
    e?.stopPropagation?.();
    if (!offNo) { toast.error('사무소 정보가 없습니다.'); return; }
    const next = !(shares.get(c.key) === true);
    const r = await hubService.setNoteShare({ offNo, ownerId: c.ownerId, partnerId: c.id, share: next ? 'Y' : 'N' });
    if (r.success) { const m = new Map(shares); m.set(c.key, next); setShares(m); }
    else toast.error('공개여부 저장에 실패했습니다.');
  };
  // 대표: 전체 공개여부 일괄 설정 — mode: 'Y'(전체공개) | 'R'(대표+당사자만) | 'N'(전체비공개)
  //  ※ 소속중개사에게는 'Y'만 타인 대화방이 보이고, 'R'/'N'은 본인방+대표만 열람
  const setAllShare = async (mode) => {
    if (!offNo) { toast.error('사무소 정보가 없습니다.'); return; }
    const r = await hubService.setAllNoteShare({ offNo, share: mode });
    if (r.success) {
      const m = new Map();
      conversations.forEach((c) => m.set(c.key, mode === 'Y'));
      setShares(m);
      const msg = mode === 'Y' ? '사무소 전체 대화방을 전체공개로 설정했습니다.'
        : mode === 'R' ? '대표자+당사자만 공개로 설정했습니다.'
        : '사무소 전체 대화방을 비공개로 설정했습니다.';
      toast.success(msg);
    } else toast.error('전체 공개설정에 실패했습니다.');
  };

  const handleSend = async () => {
    if (activeReceivers.length === 0) { toast.error('받는 대상이 없습니다.'); return; }
    if (!content.trim()) { toast.error('메시지를 입력하세요.'); return; }
    setSending(true);
    try {
      await hubService.sendNote({
        senderId: userId,
        senderName: userName,
        receiverIds: activeReceivers.map((r) => r.id),
        receiverNames: activeReceivers.map((r) => r.name || ''),
        title: (title || '').slice(0, 50),
        content: content.slice(0, 500),
      });
      setContent('');
      onChanged?.();
      await loadThread(activeReceivers, userId);
    } catch { /* handled */ } finally { setSending(false); }
  };

  const handleDeleteConversation = () => {
    if (thread.length === 0) return;
    setConfirm({
      message: '이 대화의 쪽지를 모두 삭제하시겠습니까?',
      onConfirm: async () => {
        try {
          for (const n of thread) {
            // eslint-disable-next-line no-await-in-loop
            await hubService.deleteNote(n.noteId, userId).catch(() => {});
          }
          toast.success('대화를 삭제했습니다.');
          onChanged?.();
          backToList();
        } catch { /* noop */ }
      },
    });
  };

  const partnerNames = activeReceivers.map((r) => r.name || r.id).join(', ');
  const roomName = partnerNames || '대화'; // 방 제목 = 상대방 상호
  // 현재 방의 우리측 담당자 · 본인 방 여부(대표가 직원 방을 열면 읽기전용)
  const ownerId = String(activeOwner?.id || userId);
  const ownRoom = ownerId === String(userId);
  // 대화방 내 검색(날짜/내용) 적용된 표시 메시지
  const displayThread = thread.filter((m) => {
    if (chatSearchDate && dayKey(m.regDt) !== chatSearchDate) return false;
    if (chatSearchText.trim() && !String(m.content || '').toLowerCase().includes(chatSearchText.trim().toLowerCase())) return false;
    return true;
  });
  const chatSearching = !!(chatSearchDate || chatSearchText.trim());

  // 페이지 모드: 어두운 오버레이 없이 창 전체를 채움
  const outerStyle = page
    ? { position: 'fixed', inset: 0, background: '#f1f5f9', display: 'flex', alignItems: 'stretch', justifyContent: 'center', zIndex: 1 }
    : { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
  const innerStyle = page
    ? { width: '100%', maxWidth: '760px', height: '100vh', maxHeight: '100vh', background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
    : { width: '600px', height: '82vh', maxHeight: '82vh', background: 'white', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' };

  const badge = (n) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '18px', height: '18px', padding: '0 5px', borderRadius: '9px', background: '#ef4444', color: 'white', fontSize: '13px', fontWeight: 500, lineHeight: 1 }}>
      {n > 99 ? '99+' : n}
    </span>
  );

  // 대화목록 검색(기간/상호/통합)은 서버(API)에서 필터 → 여기서는 결과를 그대로 표시
  const visibleConversations = conversations;
  const sInp = { padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '3px', boxSizing: 'border-box', color: '#374151', outline: 'none' };
  const sLbl = { fontSize: '14px', fontWeight: 500, color: '#000', whiteSpace: 'nowrap' };

  return (
    <div style={outerStyle} onClick={page ? undefined : onClose}>
      <div style={innerStyle} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          {mode === 'chat' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <button onClick={backToList} title="대화목록" style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#374151', lineHeight: 1, flexShrink: 0 }}>←</button>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{roomName}</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827' }}>대화목록</div>
              {unreadCount > 0 && badge(unreadCount)}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* 대화방설정 토글 (대표 전용) — ON 시 비밀번호 재확인 후 공개설정 노출 */}
            {isRep && mode === 'list' && (
              <button type="button" onClick={toggleSettings} title="대화방설정(공개여부)"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '4px 10px', border: `1px solid ${settingsUnlocked ? '#4f46e5' : '#cbd5e1'}`, borderRadius: '999px', background: settingsUnlocked ? '#eef2ff' : 'white', cursor: 'pointer' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: settingsUnlocked ? '#4f46e5' : '#334155', whiteSpace: 'nowrap' }}>대화방설정</span>
                <span style={{ position: 'relative', width: '34px', height: '18px', borderRadius: '999px', background: settingsUnlocked ? '#4f46e5' : '#cbd5e1', transition: 'background .15s', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', top: '2px', left: settingsUnlocked ? '18px' : '2px', width: '14px', height: '14px', borderRadius: '50%', background: 'white', transition: 'left .15s' }} />
                </span>
              </button>
            )}
            {mode === 'chat' && (
              <button onClick={() => { if (chatSearchOpen) { setChatSearchDate(''); setChatSearchText(''); } setChatSearchOpen((v) => !v); }} title="대화 내 검색"
                style={{ border: 'none', background: chatSearchOpen ? '#e0e7ff' : 'transparent', borderRadius: '6px', fontSize: '15px', cursor: 'pointer', color: chatSearchOpen ? '#4f46e5' : '#374151', lineHeight: 1, padding: '3px 5px' }}>🔍</button>
            )}
            {mode === 'chat' && thread.length > 0 && ownRoom && (
              <button onClick={handleDeleteConversation} title="대화 삭제" style={{ border: 'none', background: 'transparent', fontSize: '14px', cursor: 'pointer', color: '#dc2626' }}>🗑</button>
            )}
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#000' }}>×</button>
          </div>
        </div>

        {/* 대화방 내 검색 바(돋보기 클릭 시) — 날짜/내용 */}
        {mode === 'chat' && chatSearchOpen && (
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '8px 12px', borderBottom: '1px solid #eef2f7', background: '#fafbfc' }}>
            <span style={sLbl}>날짜</span>
            <DateInput value={chatSearchDate} onChange={(v) => setChatSearchDate(v)} style={{ ...sInp, width: '120px' }} />
            <span style={sLbl}>내용</span>
            <input type="text" value={chatSearchText} onChange={(e) => setChatSearchText(e.target.value)} placeholder="내용 검색" style={{ ...sInp, flex: 1, minWidth: '120px' }} />
            {chatSearching && <span style={{ fontSize: '14px', color: '#6366f1', whiteSpace: 'nowrap' }}>{displayThread.length}건</span>}
            {chatSearching && (
              <button type="button" onClick={() => { setChatSearchDate(''); setChatSearchText(''); }} style={{ fontSize: '14px', fontWeight: 500, padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #cbd5e1', background: 'white', color: '#64748b' }}>초기화</button>
            )}
          </div>
        )}

        {/* 본문 */}
        {mode === 'list' ? (
          /* ===== 대화목록 ===== */
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {/* 검색 바: 기간검색 / 상호검색 / 통합검색 */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '8px 12px', borderBottom: '1px solid #eef2f7', background: '#fafbfc' }}>
              <span style={sLbl}>기간검색</span>
              <DateInput value={searchFrom} onChange={(v) => setSearchFrom(v)} style={{ ...sInp, width: '110px' }} />
              <span style={{ color: '#9ca3af' }}>~</span>
              <DateInput value={searchTo} onChange={(v) => setSearchTo(v)} style={{ ...sInp, width: '110px' }} />
              <span style={sLbl}>상호검색</span>
              <input type="text" value={searchBiz} onChange={(e) => setSearchBiz(e.target.value)} placeholder="상호" style={{ ...sInp, width: '110px' }} />
              <span style={sLbl}>통합검색</span>
              <input type="text" value={searchAll} onChange={(e) => setSearchAll(e.target.value)} placeholder="상호·제목·내용" style={{ ...sInp, flex: 1, minWidth: '120px' }} />
            </div>
            {/* 대표: 사무소 전체 대화방 공개여부 일괄 설정 (대화방설정 토글 ON 시에만) */}
            {isRep && settingsUnlocked && (
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderBottom: '1px solid #eef2f7', background: '#fbfaff' }}>
                <span style={{ ...sLbl, color: '#6366f1' }}>직원 공개설정(대표)</span>
                <button type="button" onClick={() => setAllShare('Y')} style={{ fontSize: '14px', fontWeight: 500, padding: '3px 10px', borderRadius: '999px', cursor: 'pointer', border: '1px solid #16a34a', background: '#dcfce7', color: '#15803d' }}>전체 공개</button>
                <button type="button" onClick={() => setAllShare('R')} style={{ fontSize: '14px', fontWeight: 500, padding: '3px 10px', borderRadius: '999px', cursor: 'pointer', border: '1px solid #6366f1', background: '#eef2ff', color: '#4338ca' }}>대표자+당사자만 공개</button>
                <button type="button" onClick={() => setAllShare('N')} style={{ fontSize: '14px', fontWeight: 500, padding: '3px 10px', borderRadius: '999px', cursor: 'pointer', border: '1px solid #cbd5e1', background: 'white', color: '#64748b' }}>전체 비공개</button>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>· 사무소 소속중개사에게 적용됩니다</span>
              </div>
            )}
            {/* 대화목록 */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {loadingList ? (
              <div style={{ fontSize: '13px', color: '#9ca3af', padding: '30px 0', textAlign: 'center' }}>불러오는 중...</div>
            ) : visibleConversations.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#9ca3af', padding: '30px 0', textAlign: 'center' }}>{conversations.length === 0 ? '대화가 없습니다.' : '검색 결과가 없습니다.'}</div>
            ) : (
              visibleConversations.map((c) => {
                const last = c.last;
                const mineLast = last && String(last.senderId) === String(c.ownerId);
                const prefix = mineLast ? (c.mineRoom ? '나: ' : `${c.ownerName || '담당'}: `) : '';
                const preview = last ? `${prefix}${last.content || ''}` : '';
                const roomLabel = c.name || c.id; // 방 이름 = 상대방 상호
                const isShared = shares.get(c.key) === true;
                return (
                  <div key={c.key} onClick={() => openConversation(c)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: c.unread > 0 ? '#eff6ff' : 'white' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#c7d2fe', color: '#3730a3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 500, flexShrink: 0 }}>
                      {(c.name || '?').slice(0, 1)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {roomLabel}
                          {isRep && !c.mineRoom && <span style={{ marginLeft: '6px', fontSize: '14px', fontWeight: 600, color: '#6366f1' }}>· 담당 {c.ownerName}</span>}
                        </span>
                        <span style={{ fontSize: '14px', color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>{last ? fmt(last.regDt) : ''}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '2px', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: c.unread > 0 ? '#334155' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {preview}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          {c.unread > 0 && badge(c.unread)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </div>
        ) : (
          /* ===== 채팅창 ===== */
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {/* 대화 내용 (말풍선) */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: '#b2c7d9', padding: '12px' }}>
              {loadingThread ? (
                <div style={{ fontSize: '13px', color: '#475569', padding: '20px 0', textAlign: 'center' }}>불러오는 중...</div>
              ) : thread.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#475569', padding: '24px 0', textAlign: 'center' }}>아직 주고받은 쪽지가 없습니다. 첫 메시지를 보내보세요.</div>
              ) : displayThread.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#475569', padding: '24px 0', textAlign: 'center' }}>검색 결과가 없습니다.</div>
              ) : (
                displayThread.map((m, i) => {
                  // 우리측(담당자) 메시지를 노란색으로 — 대표가 직원 방을 봐도 담당자 기준으로 표기
                  const mine = String(m.senderId) === ownerId;
                  const showDay = i === 0 || dayKey(m.regDt) !== dayKey(displayThread[i - 1].regDt);
                  // 우리측 상호도 상대처럼 말풍선 위에 표기
                  const senderLabel = mine ? (m.senderName || activeOwner?.name || userName) : (m.senderName || m.senderId);
                  return (
                    <React.Fragment key={m.noteId || i}>
                      {showDay && (
                        <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 12px' }}>
                          <span style={{ fontSize: '14px', color: '#334155', background: 'rgba(255,255,255,0.65)', borderRadius: '10px', padding: '2px 10px' }}>{fmtDay(m.regDt)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', margin: '0 4px 2px' }}>{senderLabel}</div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', flexDirection: mine ? 'row-reverse' : 'row', maxWidth: '78%' }}>
                          <div style={{ padding: '8px 10px', borderRadius: '10px', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: mine ? '#fee500' : 'white', color: '#111827', boxShadow: '0 1px 1px rgba(0,0,0,0.08)' }}>
                            {m.content || ''}
                          </div>
                          <span style={{ fontSize: '13px', color: '#334155', whiteSpace: 'nowrap' }}>
                            {fmtTime(m.regDt)}{mine && m.isRead === 'Y' ? ' · 읽음' : ''}
                          </span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
            </div>
            {/* 입력창 — 본인 방만 전송 가능(대표가 직원 방 열람 시 읽기전용) */}
            {ownRoom ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', padding: '10px 12px', borderTop: '1px solid #e5e7eb', background: 'white' }}>
                <textarea value={content} maxLength={500} rows={2}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="메시지 입력 (Enter 전송 · Shift+Enter 줄바꿈)"
                  style={{ flex: 1, padding: '8px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', resize: 'none', fontFamily: 'inherit' }} />
                <button onClick={handleSend} disabled={sending}
                  style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 600, color: 'white', background: sending ? '#a5b4fc' : '#6366f1', border: 'none', borderRadius: '6px', cursor: sending ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
                  {sending ? '전송…' : '보내기'}
                </button>
              </div>
            ) : (
              <div style={{ padding: '10px 12px', borderTop: '1px solid #e5e7eb', background: 'white', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
                {activeOwner?.name || '직원'} 님의 대화방입니다 · 열람 전용
              </div>
            )}
          </div>
        )}

        {/* 삭제 확인 (공통 컴포넌트) */}
        <ConfirmDialog
          open={!!confirm}
          message={confirm?.message}
          confirmText="삭제"
          onConfirm={() => { confirm?.onConfirm?.(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />

        {/* 대화방설정 비밀번호 재확인 */}
        {pwOpen && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => { if (!pwLoading) setPwOpen(false); }}>
            <div style={{ width: '360px', maxWidth: '94%', background: 'white', borderRadius: '10px', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>대화방설정</span>
                <button onClick={() => { if (!pwLoading) setPwOpen(false); }} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 800 }}>×</button>
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>보안을 위해 비밀번호를 다시 입력해주세요.</div>
                <input type="password" autoFocus value={pw} onChange={(e) => { setPw(e.target.value); setPwErr(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !pwLoading) confirmSettingsPw(); }} placeholder="비밀번호"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: '14px', border: `1px solid ${pwErr ? '#fca5a5' : '#cbd5e1'}`, borderRadius: '6px', outline: 'none', color: '#111827' }} />
                {pwErr && <div style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626', marginTop: '6px' }}>{pwErr}</div>}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button onClick={() => { if (!pwLoading) setPwOpen(false); }} style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', background: 'white', color: '#374151', borderRadius: '6px', cursor: 'pointer' }}>취소</button>
                  <button onClick={confirmSettingsPw} disabled={pwLoading} style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 700, border: '1px solid #4f46e5', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: pwLoading ? 'default' : 'pointer', opacity: pwLoading ? 0.6 : 1 }}>{pwLoading ? '확인 중...' : '확인'}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteModal;
