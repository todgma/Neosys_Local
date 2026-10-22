import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { communityService } from '../../services/communityService';
import axios from 'axios';
import systemService from '../../services/systemService';
import { API_BASE_URL } from '../../config/apiEndpoints';
import { officeService } from '../../services/officeService';
import { useAuthStore } from '../../stores/authStore';
import DaumAddressModal from '../common/DaumAddressModal';
import DateInput from '../ui/DateInput';
import addressService from '../../services/common/addressService';

// 주소검색 버튼을 붙일 필드(공통 주소모달 연계)
const ADDR_FIELD_KEYS = ['소재지', '사무소주소'];
const GENDER_OPTS = ['남자', '여자'];

// 지역 콤보(시/도·시/군/구·읍면동 드롭다운 + 직접입력) — 구직 희망근무지
function RegionCombo({ value, onChange, inpStyle }) {
  const [sido, setSido] = useState([]);
  const [sigungu, setSigungu] = useState([]);
  const [dong, setDong] = useState([]);
  const [sc, setSc] = useState(''); const [gc, setGc] = useState(''); const [dc, setDc] = useState('');
  useEffect(() => { addressService.getSidoList().then((d) => setSido(d || [])).catch(() => {}); }, []);
  const nameOf = (list, code) => (list.find((x) => x.bjdCode === code)?.bjdName || '');
  const emit = (s, g, d) => onChange([nameOf(sido, s), nameOf(sigungu, g), nameOf(dong, d)].filter(Boolean).join(' '));
  const onSido = async (code) => { setSc(code); setGc(''); setDc(''); setSigungu([]); setDong([]); onChange(nameOf(sido, code)); if (code) { try { setSigungu(await addressService.getSigunguList(code) || []); } catch { /* */ } } };
  const onSg = async (code) => { setGc(code); setDc(''); setDong([]); emit(sc, code, ''); if (code) { try { setDong(await addressService.getEupMyeonDongList(code) || []); } catch { /* */ } } };
  const onDong = (code) => { setDc(code); emit(sc, gc, code); };
  const sel = { ...inpStyle, width: 'auto', flex: 1, minWidth: 0, cursor: 'pointer' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        <select value={sc} onChange={(e) => onSido(e.target.value)} style={sel}><option value="">시/도</option>{sido.map((x) => <option key={x.bjdCode} value={x.bjdCode}>{x.bjdName}</option>)}</select>
        <select value={gc} onChange={(e) => onSg(e.target.value)} style={sel} disabled={!sc}><option value="">시/군/구</option>{sigungu.map((x) => <option key={x.bjdCode} value={x.bjdCode}>{x.bjdName}</option>)}</select>
        <select value={dc} onChange={(e) => onDong(e.target.value)} style={sel} disabled={!gc}><option value="">읍/면/동</option>{dong.map((x) => <option key={x.bjdCode} value={x.bjdCode}>{x.bjdName}</option>)}</select>
      </div>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="직접 입력 또는 위에서 지역 선택" style={{ ...inpStyle, width: '100%', fontWeight: 500 }} />
    </div>
  );
}

/**
 * 커뮤니티 — 공지사항 · 구직 게시판 · 구인 게시판 · 사무소 매수/매도.
 *  - 공지사항: 기존 공지 API(읽기 전용).
 *  - 구직/구인: 정형 입력(항목별 필드) — /api/community/job (community_job, 사무소 게시판과 DB 분리).
 *  - 사무소 매수/매도: 자유 리치에디터 — /api/community (community_post).
 *  - page=true: 새 창 / page=false: 인페이지 오버레이. initialTab으로 진입 탭 지정.
 */
const TABS = ['공지사항', '이벤트', '구직 게시판', '구인 게시판', '사무소 매수/매도'];
// 저장값('사무소 매수/매도')은 유지하되 화면 표기만 '사무소 양도'로 변경(기존 게시글 호환)
const TAB_LABEL = (t) => (t === '사무소 매수/매도' ? '사무소 양도' : t);
const SPECIAL_CHARS = ['★', '●', '■', '▶', '✓', '※', '→'];
const COLORS = [['빨강', '#dc2626'], ['파랑', '#2563eb'], ['초록', '#16a34a'], ['주황', '#ea580c'], ['검정', '#111827']];

// 구인·구직 정형 입력 스키마 (rows: 2열 배치, 단일 항목은 전폭 / areas: 전폭 여러 줄)
const JOB_SCHEMA = {
  구인: {
    kind: '구인',
    titleKey: '제목',
    authorKey: '대표자명',
    rows: [
      ['제목'],
      ['대표자명', '사무소명칭'],
      ['급여수준', '사무소주소'],
      ['마감일', '근무지'],
      ['모집대상', '모집인원'],
      ['성별', '학력'],
      ['전화번호', '팩스번호'],
      ['전자우편', '회사URL'],
    ],
    areas: ['제출서류', '사무소소개 및 업무내용'],
  },
  구직: {
    kind: '구직',
    titleKey: '제목',
    authorKey: '성명',
    rows: [
      ['제목'],
      ['성명', '비밀번호'],
      ['희망근무지', '성별'],
      ['경력사항', '희망부서'],
      ['최종학력', '희망급여'],
      ['전화번호', '핸드폰'],
      ['전자우편', '개인URL'],
    ],
    areas: ['이력서', '자기소개'],
  },
};
const parseFields = (v) => { try { return typeof v === 'string' ? JSON.parse(v || '{}') : (v || {}); } catch { return {}; } };

// 사무소 매수/매도 — 매물 정보(정형) + 게시자 정보(로그인 사용자 자동 기입)
const OFFICE_SCHEMA = {
  titleKey: '제목',
  authorKey: '성명',
  rows: [
    ['제목'],
    ['등록일'],
    ['소재지'],
    ['나머지주소'],
    ['전용면적(㎡)', '계약면적(㎡)'],
    ['중개대상물 종류'],
    ['해당층', '총층'],
    ['거래 구분', '가격(만원)'],
    ['준공인가일'],
    ['방향', '방향기준'],
    ['주차대수'],
  ],
  areas: ['세부사항'],
  poster: ['성명', '상호명', '연락처'],  // 게시자 정보(자동)
};
// 필수 입력 항목 — 라벨에 빨간 * 표시 + 저장 전 검증(백엔드는 title만 NOT NULL이나 최소 식별/연락 정보 안내)
const JOB_REQUIRED = {
  구인: ['제목', '대표자명', '전화번호'],
  구직: ['제목', '성명', '전화번호'],
};
const OFFICE_REQUIRED = ['제목', '소재지', '거래 구분', '가격(만원)'];
const DATE_KEYS = ['등록일', '준공인가일', '마감일'];
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function CommunityBoard({ title = '커뮤니티', onClose, page = false, initialTab, initialPostId = null, single = false }) {
  const { user, office: storeOffice } = useAuthStore();
  const [office, setOffice] = useState(storeOffice || null);
  const [tab, setTab] = useState(TABS.includes(initialTab) ? initialTab : TABS[0]);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [compose, setCompose] = useState(null); // 일반: {title, author} / 구인·구직: {fields:{}}
  const [detail, setDetail] = useState(null);
  const [addrKey, setAddrKey] = useState(null); // 주소검색 대상 필드키(모달 오픈)
  const editorRef = useRef(null);

  const isNotice = tab === '공지사항';
  const isEvent = tab === '이벤트';
  const jobKind = tab === '구인 게시판' ? '구인' : tab === '구직 게시판' ? '구직' : null;
  const isJob = !!jobKind;
  const isOffice = tab === '사무소 매수/매도';

  // 게시자 정보 자동 기입용 사무소 정보(새 창은 authStore.office 미보존 → 재조회)
  useEffect(() => {
    if (office || !user?.userId) return;
    (async () => {
      try { const res = await officeService.getOfficeByUser(user.userId); const d = res?.data || res; if (d) setOffice(d); } catch { /* ignore */ }
    })();
  }, [office, user]);

  const mapNotice = (n) => ({
    postId: n.noticeId, title: n.title, author: n.regId || '관리자',
    regDt: n.regDt, viewCnt: n.viewCount ?? n.viewCnt ?? 0, content: n.content, isTop: n.isTop,
  });
  const mapEvent = (e) => ({
    postId: e.eventId ?? e.EventId, title: e.title ?? e.Title, author: '관리자',
    regDt: e.regDt ?? e.RegDt, viewCnt: e.viewCount ?? e.ViewCount ?? 0, content: e.content ?? e.Content,
  });

  const load = useCallback(async (t, query) => {
    setLoading(true);
    try {
      if (t === '공지사항') {
        const res = await systemService.getNotices(null, 1, 200);
        let notices = (res?.data?.notices || res?.notices || []).map(mapNotice);
        const q2 = (query || '').trim().toLowerCase();
        if (q2) notices = notices.filter((n) => `${n.title} ${n.author}`.toLowerCase().includes(q2));
        setList(notices);
      } else if (t === '이벤트') {
        const res = await axios.get(`${API_BASE_URL}/api/admin/events`, { params: { isPublic: 'Y', rowsPerPage: 200 } });
        let evs = (res?.data?.data?.events || res?.data?.data?.Events || []).map(mapEvent);
        const q2 = (query || '').trim().toLowerCase();
        if (q2) evs = evs.filter((n) => `${n.title}`.toLowerCase().includes(q2));
        setList(evs);
      } else if (t === '구인 게시판' || t === '구직 게시판') {
        const kind = t === '구인 게시판' ? '구인' : '구직';
        setList(await communityService.getJobList(kind, query));
      } else {
        setList(await communityService.getList(t, query));
      }
    } catch (e) { console.error('목록 조회 실패:', e); setList([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { setQ(''); setCompose(null); setDetail(null); load(tab, ''); }, [tab, load]);

  const openDetail = async (post) => {
    const viewerId = user?.userId || null; // 조회수 하루 1회(본인 기준)
    try {
      if (isNotice) {
        const res = await systemService.getNoticeDetail(post.postId, viewerId);
        const d = res?.data || res;
        setDetail(d ? mapNotice(d) : post);
        return;
      }
      if (isEvent) {
        // 이벤트 상세 — 조회수 하루 1회 +1 후 갱신본 표시
        const res = await axios.get(`${API_BASE_URL}/api/admin/events/${post.postId}`, { params: viewerId ? { viewerId } : {} });
        const d = res?.data?.data || res?.data;
        setDetail(d ? mapEvent(d) : post);
        setList((prev) => prev.map((p) => (p.postId === post.postId ? { ...p, viewCnt: (d?.viewCount ?? d?.ViewCount ?? p.viewCnt) } : p)));
        return;
      }
      if (isJob) {
        const full = await communityService.getJobDetail(post.postId, viewerId);
        setDetail(full || post);
        setList((prev) => prev.map((p) => (p.postId === post.postId ? { ...p, viewCnt: (full?.viewCnt ?? p.viewCnt) } : p)));
        return;
      }
      const full = await communityService.getDetail(post.postId, viewerId);
      setDetail(full || post);
      setList((prev) => prev.map((p) => (p.postId === post.postId ? { ...p, viewCnt: (full?.viewCnt ?? p.viewCnt) } : p)));
    } catch { setDetail(post); }
  };

  // 진입 시 특정 게시글 바로 열기(대시보드 롤링/상단바 클릭) — 최초 1회
  const didAutoOpen = useRef(false);
  useEffect(() => {
    if (didAutoOpen.current) return;
    if (initialPostId == null || initialPostId === '') return;
    didAutoOpen.current = true;
    openDetail({ postId: initialPostId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPostId]);

  // 등록 — 일반(리치에디터)
  const submitGeneric = async () => {
    const html = editorRef.current ? editorRef.current.innerHTML : '';
    if (!compose.title.trim()) { toast.error('제목을 입력하세요.'); return; }
    try {
      await communityService.create({
        tab, title: compose.title.trim(), content: html,
        author: compose.author.trim() || user?.userName || user?.userId || '익명',
        offNo: user?.offNo ?? null, rtNo: user?.rtNo ?? null, regId: user?.userId ?? null,
      });
      toast.success('등록되었습니다.');
      setCompose(null);
      load(tab, q);
    } catch (e) { console.error(e); toast.error('등록에 실패했습니다.'); }
  };

  // 등록 — 구인·구직(정형)
  const submitJob = async () => {
    const schema = JOB_SCHEMA[jobKind];
    const f = compose.fields || {};
    if (!checkRequired(f, JOB_REQUIRED[jobKind] || ['제목'])) return;
    const title = (f[schema.titleKey] || '').trim();
    try {
      await communityService.createJob({
        kind: jobKind, title,
        author: (f[schema.authorKey] || '').trim() || user?.userName || '익명',
        fields: f, pwd: f['비밀번호'] || null,
        offNo: user?.offNo ?? null, rtNo: user?.rtNo ?? null, regId: user?.userId ?? null,
      });
      toast.success('등록되었습니다.');
      setCompose(null);
      load(tab, q);
    } catch (e) { console.error(e); toast.error('등록에 실패했습니다.'); }
  };

  // 등록 — 사무소 매수/매도(매물 정형)
  const submitOffice = async () => {
    const f = compose.fields || {};
    if (!checkRequired(f, OFFICE_REQUIRED)) return;
    const title = (f[OFFICE_SCHEMA.titleKey] || '').trim();
    try {
      await communityService.create({
        tab, title, content: f['세부사항'] || '',
        author: (f[OFFICE_SCHEMA.authorKey] || '').trim() || user?.userName || '익명',
        fields: f,
        offNo: user?.offNo ?? null, rtNo: user?.rtNo ?? null, regId: user?.userId ?? null,
      });
      toast.success('등록되었습니다.');
      setCompose(null);
      load(tab, q);
    } catch (e) { console.error(e); toast.error('등록에 실패했습니다.'); }
  };

  const remove = async (postId) => {
    if (!window.confirm('이 글을 삭제할까요?')) return;
    try {
      if (isJob) await communityService.removeJob(postId);
      else await communityService.remove(postId);
      toast.success('삭제되었습니다.');
      if (detail?.postId === postId) setDetail(null);
      load(tab, q);
    } catch (e) { console.error(e); toast.error('삭제에 실패했습니다.'); }
  };

  // 현재 탭을 별도 새 창(팝업)으로 열기
  const openInNewWindow = async () => {
    if (window.electronAPI?.modal?.open) {
      try {
        await window.electronAPI.modal.open({ type: 'community', data: { title: TAB_LABEL(tab), initialTab: tab, single: true }, width: 900, height: 700, minWidth: 720, minHeight: 560, resizable: true });
        return;
      } catch (e) { console.error('커뮤니티 새 창 열기 실패:', e); }
    }
    toast('데스크톱 앱에서 새 창으로 열립니다.');
  };

  // 리치 에디터 명령(사무소 매수/매도 전용)
  const exec = (cmd, val) => { editorRef.current?.focus(); document.execCommand(cmd, false, val); };
  const insertText = (text) => { editorRef.current?.focus(); document.execCommand('insertText', false, text); };
  const todayText = () => { const d = new Date(); return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} `; };

  const tabBtn = (on) => ({ padding: '8px 16px', fontSize: '15px', fontWeight: on ? 800 : 600, border: '1px solid #e5e7eb', borderBottom: on ? '2px solid #4f46e5' : '1px solid #e5e7eb', background: on ? '#eef2ff' : 'white', color: on ? '#4f46e5' : '#374151', borderRadius: '6px 6px 0 0', cursor: 'pointer', whiteSpace: 'nowrap' });
  const th = { padding: '8px 10px', fontSize: '14px', fontWeight: 700, color: '#334155', background: '#f1f5f9', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' };
  const td = { padding: '8px 10px', fontSize: '14px', color: '#111827', border: '1px solid #e2e8f0' };
  const inp = { boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 10px', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit', outline: 'none', color: '#111827' };
  const primaryBtn = { padding: '8px 16px', fontSize: '14px', fontWeight: 700, color: '#fff', background: '#4f46e5', border: 'none', borderRadius: '5px', cursor: 'pointer', whiteSpace: 'nowrap' };
  const ghostBtn = { padding: '8px 16px', fontSize: '14px', fontWeight: 600, color: '#334155', background: 'white', border: '1px solid #cbd5e1', borderRadius: '5px', cursor: 'pointer', whiteSpace: 'nowrap' };
  const toolBtn = { padding: '4px 8px', fontSize: '13px', fontWeight: 700, border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', color: '#374151', cursor: 'pointer' };
  const fLabel = { ...th, width: '120px', textAlign: 'left' };

  const rootStyle = page
    ? { width: '100%', flex: 1, minHeight: 0, background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
    : { width: '900px', maxWidth: '96vw', height: '660px', maxHeight: '92vh', background: 'white', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' };

  // 구인·구직 정형 입력 폼
  const setField = (k, v) => setCompose((c) => ({ ...c, fields: { ...(c.fields || {}), [k]: v } }));
  const fieldInput = (k, opts = {}) => {
    const v = compose.fields?.[k] ?? '';
    // 성별: 남자/여자 체크박스(복수선택) — 구인·구직 공통
    if (k === '성별') {
      const sel = String(v).split(',').map((s) => s.trim()).filter(Boolean);
      const toggle = (g) => { const has = sel.includes(g); setField(k, (has ? sel.filter((x) => x !== g) : [...sel, g]).join(',')); };
      return (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {GENDER_OPTS.map((g) => (
            <label key={g} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '14px', fontWeight: 600, color: '#111827', cursor: 'pointer' }}>
              <input type="checkbox" checked={sel.includes(g)} onChange={() => toggle(g)} />{g}
            </label>
          ))}
        </div>
      );
    }
    // 희망근무지: 지역 드롭다운 + 직접입력
    if (k === '희망근무지' && !opts.readOnly) {
      return <RegionCombo value={v} onChange={(val) => setField(k, val)} inpStyle={inp} />;
    }
    // 날짜: 달력 컴포넌트
    if (DATE_KEYS.includes(k) && !opts.readOnly) {
      return <DateInput value={v} onChange={(val) => setField(k, val)} style={{ ...inp, width: '100%', fontWeight: 500 }} />;
    }
    const type = k === '비밀번호' ? 'password' : 'text';
    const input = <input type={type} value={v} readOnly={opts.readOnly} onChange={(e) => setField(k, e.target.value)} placeholder={k}
      style={{ ...inp, width: '100%', fontWeight: 500, background: opts.readOnly ? '#f8fafc' : 'white' }} />;
    // 주소 필드는 [주소 검색] 버튼 연계(공통 DaumAddressModal)
    if (ADDR_FIELD_KEYS.includes(k) && !opts.readOnly) {
      return (
        <div style={{ display: 'flex', gap: '6px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>{input}</div>
          <button type="button" onClick={() => setAddrKey(k)}
            style={{ flexShrink: 0, padding: '0 12px', fontSize: '14px', fontWeight: 700, color: 'white', background: '#4f46e5', border: '1px solid #4f46e5', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>주소 검색</button>
        </div>
      );
    }
    return input;
  };

  // 필수 항목 라벨(빨간 * 표시)
  const reqLabel = (key, required) => (
    required.includes(key)
      ? <>{key}<span style={{ color: '#ef4444', fontWeight: 800, marginLeft: '2px' }}>*</span></>
      : key
  );
  // 저장 전 필수 항목 검증 — 비어있는 첫 항목 안내 토스트
  const checkRequired = (f, required) => {
    for (const k of required) {
      if (!String(f?.[k] ?? '').trim()) { toast.error(`${k} 항목을 입력해주세요.`); return false; }
    }
    return true;
  };

  const composeJob = () => {
    const schema = JOB_SCHEMA[jobKind];
    const required = JOB_REQUIRED[jobKind] || ['제목'];
    return (
      <div style={{ padding: '16px 20px', flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>[{TAB_LABEL(tab)}] 글쓰기</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          {schema.rows.map((row, ri) => (
            <tr key={ri}>
              {row.length === 1 ? (
                <><td style={fLabel}>{reqLabel(row[0], required)}</td><td style={td} colSpan={3}>{fieldInput(row[0])}</td></>
              ) : (
                <><td style={fLabel}>{reqLabel(row[0], required)}</td><td style={td}>{fieldInput(row[0])}</td>
                  <td style={fLabel}>{reqLabel(row[1], required)}</td><td style={td}>{fieldInput(row[1])}</td></>
              )}
            </tr>
          ))}
          {schema.areas.map((a) => (
            <tr key={a}>
              <td style={fLabel}>{a}</td>
              <td style={td} colSpan={3}>
                <textarea value={compose.fields?.[a] ?? ''} onChange={(e) => setField(a, e.target.value)} placeholder={a} rows={a === schema.areas[schema.areas.length - 1] ? 8 : 3}
                  style={{ ...inp, width: '100%', fontWeight: 500, resize: 'vertical', lineHeight: 1.6 }} />
              </td>
            </tr>
          ))}
        </tbody></table>
        {jobKind === '구직' && <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>* 수정·삭제 시 등록한 비밀번호를 입력해 주세요.</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" onClick={() => setCompose(null)} style={ghostBtn}>취소</button>
          <button type="button" onClick={submitJob} style={primaryBtn}>등록</button>
        </div>
      </div>
    );
  };

  const detailJob = () => {
    const schema = JOB_SCHEMA[jobKind] || JOB_SCHEMA[detail.kind] || JOB_SCHEMA.구인;
    const f = parseFields(detail.fields);
    const cellVal = (k) => (f[k] ? String(f[k]) : '');
    return (
      <div style={{ padding: '16px 20px', flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>{detail.title}</div>
        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{detail.author || '익명'} · {(detail.regDt || '').toString().slice(0, 10).replace(/-/g, '.')} · 조회 {detail.viewCnt ?? 0}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          {schema.rows.map((row, ri) => (
            <tr key={ri}>
              {row.length === 1 ? (
                <><td style={fLabel}>{row[0]}</td><td style={td} colSpan={3}>{cellVal(row[0])}</td></>
              ) : (
                <><td style={fLabel}>{row[0]}</td><td style={td}>{cellVal(row[0])}</td>
                  <td style={fLabel}>{row[1]}</td><td style={td}>{cellVal(row[1])}</td></>
              )}
            </tr>
          ))}
          {schema.areas.map((a) => (
            <tr key={a}>
              <td style={fLabel}>{a}</td>
              <td style={td} colSpan={3}><div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{cellVal(a)}</div></td>
            </tr>
          ))}
        </tbody></table>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button type="button" onClick={() => remove(detail.postId)} style={{ ...ghostBtn, color: '#dc2626', borderColor: '#fca5a5' }}>삭제</button>
          <button type="button" onClick={() => setDetail(null)} style={ghostBtn}>목록</button>
        </div>
      </div>
    );
  };

  // 사무소 매수/매도 — 매물 정보 + 게시자 정보(자동)
  const composeOffice = () => (
    <div style={{ padding: '16px 20px', flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
        {OFFICE_SCHEMA.rows.map((row, ri) => (
          <tr key={ri}>
            {row.length === 1 ? (
              <><td style={fLabel}>{reqLabel(row[0], OFFICE_REQUIRED)}</td><td style={td} colSpan={3}>{fieldInput(row[0])}</td></>
            ) : (
              <><td style={fLabel}>{reqLabel(row[0], OFFICE_REQUIRED)}</td><td style={td}>{fieldInput(row[0])}</td>
                <td style={fLabel}>{reqLabel(row[1], OFFICE_REQUIRED)}</td><td style={td}>{fieldInput(row[1])}</td></>
            )}
          </tr>
        ))}
        {OFFICE_SCHEMA.areas.map((a) => (
          <tr key={a}>
            <td style={fLabel}>{a}</td>
            <td style={td} colSpan={3}>
              <textarea value={compose.fields?.[a] ?? ''} onChange={(e) => setField(a, e.target.value)} placeholder={a} rows={8}
                style={{ ...inp, width: '100%', fontWeight: 500, resize: 'vertical', lineHeight: 1.6 }} />
            </td>
          </tr>
        ))}
      </tbody></table>
      <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', marginTop: '4px' }}>게시자 정보 <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>(로그인 사용자 자동 기입)</span></div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
        <tr>
          <td style={fLabel}>성 명</td><td style={td}>{fieldInput('성명', { readOnly: true })}</td>
          <td style={fLabel}>연락처</td><td style={td}>{fieldInput('연락처', { readOnly: true })}</td>
        </tr>
        <tr>
          <td style={fLabel}>상호명</td><td style={td} colSpan={3}>{fieldInput('상호명', { readOnly: true })}</td>
        </tr>
      </tbody></table>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button type="button" onClick={() => setCompose(null)} style={ghostBtn}>취소</button>
        <button type="button" onClick={submitOffice} style={primaryBtn}>등록</button>
      </div>
    </div>
  );

  const detailOffice = () => {
    const f = parseFields(detail.fields);
    const cellVal = (k) => (f[k] ? String(f[k]) : '');
    return (
      <div style={{ padding: '16px 20px', flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>{detail.title}</div>
        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{detail.author || '익명'} · {(detail.regDt || '').toString().slice(0, 10).replace(/-/g, '.')} · 조회 {detail.viewCnt ?? 0}</div>
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>매물 정보</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          {OFFICE_SCHEMA.rows.map((row, ri) => (
            <tr key={ri}>
              {row.length === 1 ? (
                <><td style={fLabel}>{row[0]}</td><td style={td} colSpan={3}>{cellVal(row[0])}</td></>
              ) : (
                <><td style={fLabel}>{row[0]}</td><td style={td}>{cellVal(row[0])}</td>
                  <td style={fLabel}>{row[1]}</td><td style={td}>{cellVal(row[1])}</td></>
              )}
            </tr>
          ))}
          {OFFICE_SCHEMA.areas.map((a) => (
            <tr key={a}><td style={fLabel}>{a}</td><td style={td} colSpan={3}><div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{cellVal(a)}</div></td></tr>
          ))}
        </tbody></table>
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>게시자 정보</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          <tr>
            <td style={fLabel}>성 명</td><td style={td}>{cellVal('성명')}</td>
            <td style={fLabel}>연락처</td><td style={td}>{cellVal('연락처')}</td>
          </tr>
          <tr><td style={fLabel}>상호명</td><td style={td} colSpan={3}>{cellVal('상호명')}</td></tr>
        </tbody></table>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button type="button" onClick={() => remove(detail.postId)} style={{ ...ghostBtn, color: '#dc2626', borderColor: '#fca5a5' }}>삭제</button>
          <button type="button" onClick={() => setDetail(null)} style={ghostBtn}>목록</button>
        </div>
      </div>
    );
  };

  const body = (() => {
    // 글쓰기
    if (compose) {
      if (isJob) return composeJob();
      if (isOffice) return composeOffice();
      return (
        <div style={{ padding: '16px 20px', flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>[{TAB_LABEL(tab)}] 글쓰기</div>
          <input value={compose.title} onChange={(e) => setCompose({ ...compose, title: e.target.value })} placeholder="제목" style={{ ...inp, width: '100%' }} />
          <input value={compose.author} onChange={(e) => setCompose({ ...compose, author: e.target.value })} placeholder="작성자(선택)" style={{ ...inp, width: '240px' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '5px', padding: '6px', background: '#fafafa' }}>
            <button type="button" onClick={() => exec('bold')} style={{ ...toolBtn, fontWeight: 800 }}>B</button>
            <button type="button" onClick={() => exec('underline')} style={{ ...toolBtn, textDecoration: 'underline' }}>U</button>
            <button type="button" onClick={() => exec('italic')} style={{ ...toolBtn, fontStyle: 'italic' }}>I</button>
            <span style={{ width: '1px', height: '18px', background: '#e5e7eb', margin: '0 2px' }} />
            {COLORS.map(([name, c]) => (
              <button key={c} type="button" title={name} onClick={() => exec('foreColor', c)} style={{ ...toolBtn, color: c, width: '26px', padding: '4px 0' }}>가</button>
            ))}
            <span style={{ width: '1px', height: '18px', background: '#e5e7eb', margin: '0 2px' }} />
            <button type="button" onClick={() => exec('fontSize', '5')} style={toolBtn}>크게</button>
            <button type="button" onClick={() => exec('fontSize', '3')} style={toolBtn}>보통</button>
            <button type="button" onClick={() => exec('fontSize', '1')} style={toolBtn}>작게</button>
            <span style={{ width: '1px', height: '18px', background: '#e5e7eb', margin: '0 2px' }} />
            <button type="button" onClick={() => insertText(todayText())} style={toolBtn}>날짜</button>
            <select value="" onChange={(e) => { if (e.target.value) insertText(e.target.value); e.target.value = ''; }} style={{ ...toolBtn, cursor: 'pointer' }}>
              <option value="">특수문자</option>
              {SPECIAL_CHARS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div ref={editorRef} contentEditable suppressContentEditableWarning data-ph="내용을 입력하세요."
            style={{ flex: 1, minHeight: '260px', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '10px 12px', fontSize: '14px', lineHeight: 1.7, color: '#111827', outline: 'none', overflowY: 'auto', background: 'white' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={() => setCompose(null)} style={ghostBtn}>취소</button>
            <button type="button" onClick={submitGeneric} style={primaryBtn}>등록</button>
          </div>
        </div>
      );
    }
    // 상세보기
    if (detail) {
      if (isJob) return detailJob();
      if (isOffice) return detailOffice();
      return (
        <div style={{ padding: '16px 20px', flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>{detail.title}</div>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{detail.author || '익명'} · {(detail.regDt || '').toString().slice(0, 10).replace(/-/g, '.')} · 조회 {detail.viewCnt ?? 0}</div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', fontSize: '14px', color: '#111827', lineHeight: 1.8, flex: 1 }}
            dangerouslySetInnerHTML={{ __html: detail.content || '<span style="color:#94a3b8">(내용 없음)</span>' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {(isNotice || isEvent) ? <span /> : <button type="button" onClick={() => remove(detail.postId)} style={{ ...ghostBtn, color: '#dc2626', borderColor: '#fca5a5' }}>삭제</button>}
            <button type="button" onClick={() => setDetail(null)} style={ghostBtn}>목록</button>
          </div>
        </div>
      );
    }
    // 목록
    const composeStart = () => {
      if (isJob) { setCompose({ fields: {} }); return; }
      if (isOffice) {
        setCompose({ fields: {
          등록일: todayISO(),
          성명: user?.userName || user?.rtNm || '',
          상호명: office?.offNm || office?.officeName || '',
          연락처: office?.offTel || office?.rpsPhone || office?.offPhone || user?.phone || '',
        } });
        return;
      }
      setCompose({ title: '', author: user?.userName || '' });
    };
    // 게시판별 목록 칼럼 정의 (사무소매매/구인/구직/공지)
    const pf = (p) => parseFields(p.fields ?? p.Fields);
    const dt = (v) => (v || '').toString().slice(0, 10).replace(/-/g, '.');
    const listCols = isOffice ? [
      { h: '지역', w: '150px', c: (p) => pf(p).소재지 || '-' },
      { h: '제목', c: (p) => p.title },
      { h: '글쓴이', w: '110px', ctr: true, c: (p) => p.author || '익명' },
      { h: '등록일', w: '110px', ctr: true, c: (p) => dt(pf(p).등록일 || p.regDt) },
      { h: '조회', w: '64px', ctr: true, c: (p) => p.viewCnt ?? 0 },
    ] : jobKind === '구인' ? [
      { h: '사무소', c: (p) => pf(p).사무소명칭 || '-' },
      { h: '모집구분', w: '120px', ctr: true, c: (p) => pf(p).모집대상 || '-' },
      { h: '모집인원', w: '90px', ctr: true, c: (p) => pf(p).모집인원 || '-' },
      { h: '성별', w: '90px', ctr: true, c: (p) => pf(p).성별 || '-' },
      { h: '마감일', w: '110px', ctr: true, c: (p) => dt(pf(p).마감일 || p.regDt) },
    ] : jobKind === '구직' ? [
      { h: '성명', w: '110px', ctr: true, c: (p) => p.author || '-' },
      { h: '제목', c: (p) => p.title },
      { h: '성별', w: '90px', ctr: true, c: (p) => pf(p).성별 || '-' },
      { h: '경력', w: '120px', ctr: true, c: (p) => pf(p).경력사항 || '-' },
      { h: '학력', w: '120px', ctr: true, c: (p) => pf(p).최종학력 || '-' },
    ] : [
      { h: '제목', c: (p) => p.title },
      { h: '작성자', w: '110px', ctr: true, c: (p) => p.author || '익명' },
      { h: '작성일', w: '110px', ctr: true, c: (p) => dt(p.regDt) },
      { h: '조회', w: '64px', ctr: true, c: (p) => p.viewCnt ?? 0 },
    ];
    const colSpanAll = listCols.length + 2;
    return (
      <div style={{ padding: '14px 20px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {isJob && <div style={{ color: '#dc2626', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>* 게시일로부터 3개월 경과한 게시글은 자동 삭제됩니다</div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', gap: '6px', flex: 1, maxWidth: '360px' }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(tab, q); }} placeholder="제목·작성자·내용 검색" style={{ ...inp, flex: 1 }} />
            <button type="button" onClick={() => load(tab, q)} style={primaryBtn}>검색</button>
          </div>
          {!isNotice && !isEvent && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={openInNewWindow} style={ghostBtn}>새 창으로 열기</button>
              <button type="button" onClick={composeStart} style={primaryBtn}>＋ 글쓰기</button>
            </div>
          )}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <td style={{ ...th, width: '56px', textAlign: 'center' }}>번호</td>
                {listCols.map((col) => <td key={col.h} style={{ ...th, ...(col.w ? { width: col.w } : {}), ...(col.ctr ? { textAlign: 'center' } : {}) }}>{col.h}</td>)}
                <td style={{ ...th, width: '44px', textAlign: 'center' }}></td>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: '40px' }} colSpan={colSpanAll}>불러오는 중...</td></tr>
              ) : list.length === 0 ? (
                <tr><td style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: '40px' }} colSpan={colSpanAll}>{q ? '검색 결과가 없습니다.' : '등록된 글이 없습니다.'}</td></tr>
              ) : list.map((p, i) => (
                <tr key={p.postId} style={{ cursor: 'pointer' }} onClick={() => openDetail(p)}>
                  <td style={{ ...td, textAlign: 'center', color: '#64748b' }}>{list.length - i}</td>
                  {listCols.map((col) => <td key={col.h} style={{ ...td, ...(col.ctr ? { textAlign: 'center', color: '#64748b' } : { fontWeight: 700 }) }}>{col.c(p)}</td>)}
                  <td style={{ ...td, textAlign: 'center' }}>{!isNotice && !isEvent && <button type="button" onClick={(e) => { e.stopPropagation(); remove(p.postId); }} title="삭제" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: '15px' }}>✕</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  })();

  const card = (
    <div onClick={(e) => e.stopPropagation()} style={rootStyle}>
      <style>{`[contenteditable][data-ph]:empty:before{content:attr(data-ph);color:#94a3b8;}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc', flexShrink: 0 }}>
        <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>{title}</div>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#334155' }}>×</button>
      </div>
      {!single && (
        <div style={{ display: 'flex', gap: '4px', padding: '10px 18px 0', background: '#fafafa', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          {TABS.map((t) => <button key={t} type="button" onClick={() => setTab(t)} style={tabBtn(t === tab)}>{TAB_LABEL(t)}</button>)}
        </div>
      )}
      {body}
      {addrKey && (
        <DaumAddressModal
          onClose={() => setAddrKey(null)}
          onComplete={(d) => { setField(addrKey, d.roadAddress || d.jibunAddress || ''); setAddrKey(null); }}
        />
      )}
    </div>
  );

  if (page) {
    return <div style={{ position: 'fixed', inset: 0, background: 'white', display: 'flex', flexDirection: 'column' }}>{card}</div>;
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {card}
    </div>
  );
}
