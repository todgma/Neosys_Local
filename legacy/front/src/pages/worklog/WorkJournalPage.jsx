import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  X, RefreshCw, Save, Trash2,
  ChevronLeft, ChevronRight, ChevronDown, CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { worklogService } from '../../services/worklogService';
import { realestaterService } from '../../services/realestaterService';
import ScheduleModal from '../../components/modals/ScheduleModal';
import { CalendarPlus } from 'lucide-react';

/**
 * 업무일지 (백엔드 연동)
 *  · 좌측: 월 선택 + 1일~말일 일자 목록(일정관리식). 작성된 날은 "작성완료" 표시
 *      - 대표중개사(RTTYP01) 또는 공유 ON: 일자별 트리 → 직원별 작성완료/미작성
 *      - 공유 OFF 직원: 본인 일자 목록만
 *  · 대표: 좌측에 공유 토글(모든 직원이 서로의 업무일지 열람, 기본 ON)
 *  · 우측: 문서(사무소·성명 + 자동집계 + 업무내용 + 특이사항) — 본인 것만 편집/저장, 타인 것은 읽기전용
 *  · 마지막 페이지: 선택 날짜의 전 직원 작업이력(hist 통합, 시간 오름차순) 표
 */
const LOG_LABEL = { I: '등록', U: '수정', D: '삭제' };
const fmtTime = (v) => { try { const d = new Date(v); const q = (n) => String(n).padStart(2, '0'); return `${q(d.getHours())}:${q(d.getMinutes())}:${q(d.getSeconds())}`; } catch { return ''; } };

const pick = (o, ...keys) => { for (const k of keys) { if (o && o[k] != null && o[k] !== '') return o[k]; } return ''; };

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const p2 = (n) => String(n).padStart(2, '0');

// 자동집계 카테고리 — 시스템 기록(hist/로그) 기반 읽기전용 표기(5열 × 2줄)
const SUMMARY_CATS = [
  // 1줄: 기존
  { key: 'prop', label: '물건 등록/수정/삭제', subs: [['propReg', '등록'], ['propUpd', '수정'], ['propDel', '삭제']] },
  { key: 'cust', label: '고객 등록/수정/삭제', subs: [['custReg', '등록'], ['custUpd', '수정'], ['custDel', '삭제']] },
  { key: 'contract', label: '(가)계약서 작성/수정', subs: [['contractWrite', '작성'], ['contractUpd', '수정']] },
  { key: 'sched', label: '일정 등록/수정/삭제', subs: [['schedReg', '등록'], ['schedUpd', '수정'], ['schedDel', '삭제']] },
  { key: 'hub', label: '중개망 등록/수정/삭제', subs: [['hubReg', '등록'], ['hubUpd', '수정'], ['hubDel', '삭제']] },
  // 2줄: 추가
  { key: 'io', label: '인바운드/아웃바운드', subs: [['inbound', '인바운드'], ['outbound', '아웃바운드']], pending: true },
  { key: 'vendor', label: '업체 등록/수정/삭제', subs: [['vendorReg', '등록'], ['vendorUpd', '수정'], ['vendorDel', '삭제']] },
  { key: 'note', label: '쪽지상담', subs: [['note', '건수']] },
  { key: 'sms', label: '문자전송/전번편집', subs: [['smsSend', '문자전송'], ['phoneEdit', '전번편집']] },
  { key: 'community', label: '커뮤니티 등록/수정/삭제', subs: [['commReg', '등록'], ['commUpd', '수정'], ['commDel', '삭제']] },
];
// 전체 집계 키(기본 0)
const SUMMARY_KEYS = SUMMARY_CATS.flatMap((c) => c.subs.map(([k]) => k)).concat(['call', 'consultMemo']);

let _pid = 1;
const newPage = () => ({ id: ++_pid, text: '' });

export default function WorkJournalPage({ inModal = false, onClose = null }) {
  const { user, office } = useAuthStore();
  const myId = pick(user, 'id', 'userId', 'Id');
  const myRtNo = pick(user, 'rtNo', 'RtNo') || null;
  const myName = pick(user, 'rtNm', 'RtNm', 'userName', 'name') || myId || '-';
  const officeName = pick(office, 'offNm', 'OffNm', 'office_nm') || '-';
  const offNo = Number(pick(user, 'offNo', 'OffNo') || pick(office, 'offNo', 'OffNo')) || null;
  const isRep = pick(user, 'rtType', 'RtType') === 'RTTYP01'; // 대표(개업공인중개사)

  // 소속직원 목록(roster)
  const [staffList, setStaffList] = useState([]);
  useEffect(() => {
    if (!offNo) return;
    (async () => {
      try {
        const r = await realestaterService.getList(null, offNo);
        const raw = r?.data;
        const list = Array.isArray(raw) ? raw : (raw?.Relaters || raw?.relaters || raw?.items || raw?.list || []);
        setStaffList(list || []);
      } catch (e) { console.error('직원 목록 조회 실패:', e); }
    })();
  }, [offNo]);

  // 공유 설정(사무소 단위, 백엔드 저장, 기본 ON) — 대표만 토글
  const [shareAll, setShareAll] = useState(true);
  useEffect(() => {
    if (!offNo) return;
    (async () => {
      try { const d = await worklogService.getShare(offNo); setShareAll((d?.shareAll ?? 'Y') !== 'N'); }
      catch (e) { console.error('공유설정 조회 실패:', e); }
    })();
  }, [offNo]);
  // 공유 모드 설정 — all=true(모두공개, 'Y') / false(대표+담당자공개, 'N'). 대표만, 사무소 전체 적용
  const setShareMode = async (all) => {
    if (all === shareAll) return;
    setShareAll(all);
    try { await worklogService.setShare(offNo, all ? 'Y' : 'N', myId); toast.success('공유설정이 저장되었습니다.'); }
    catch (e) { console.error(e); toast.error('공유설정 저장에 실패했습니다.'); setShareAll(!all); }
  };
  // 트리(직원별) 표시 여부 — 대표는 항상, 직원은 공유 ON일 때
  const showTree = isRep || shareAll;

  // 표시 roster: {id, name, rtNo, rep}
  const roster = useMemo(() => {
    const mapped = (staffList || []).map((s) => ({
      id: pick(s, 'id', 'Id', 'userId'),
      name: pick(s, 'rtNm', 'RtNm', 'name') || pick(s, 'id', 'Id'),
      rtNo: pick(s, 'rtNo', 'RtNo') || null,
      rep: pick(s, 'rtType', 'RtType') === 'RTTYP01',
    })).filter((s) => s.id);
    mapped.sort((a, b) => (Number(b.rep) - Number(a.rep)) || String(a.name).localeCompare(String(b.name)));
    if (showTree && mapped.length) return mapped;
    return [{ id: myId, name: myName, rtNo: myRtNo, rep: isRep }];
  }, [staffList, showTree, myId, myName, myRtNo, isRep]);

  const now = useMemo(() => new Date(), []);
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 }); // m: 1~12
  const lastDay = new Date(ym.y, ym.m, 0).getDate();
  const isCurMonth = ym.y === now.getFullYear() && ym.m === now.getMonth() + 1;

  const defaultDay = isCurMonth ? now.getDate() : 1;
  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [viewStaff, setViewStaff] = useState(null);   // 보고 있는 직원 이름(null=본인)
  const [viewStaffId, setViewStaffId] = useState(null); // 보고 있는 직원 로그인 id(null=본인)
  const [expanded, setExpanded] = useState(() => new Set()); // 트리 펼친 날짜
  const [savedNonce, setSavedNonce] = useState(0);    // 저장 후 작성현황 재조회 트리거
  const todayRowRef = useRef(null);                   // 좌측 일자목록에서 '오늘' 행 — 열 때 자동 스크롤용

  const dateStr = (day) => `${ym.y}-${p2(ym.m)}-${p2(day)}`;
  const isPastDay = (day) => new Date(ym.y, ym.m - 1, day) <= new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 월별 작성현황(사무소) — 작성된 (userId|date) 집합
  const [statusSet, setStatusSet] = useState(() => new Set());
  useEffect(() => {
    if (!offNo) return;
    (async () => {
      try {
        const d = await worklogService.getStatus(offNo, ym.y, ym.m);
        setStatusSet(new Set((d?.items || []).map((it) => `${it.userId}|${it.date}`)));
      } catch (e) { console.error('작성현황 조회 실패:', e); }
    })();
  }, [offNo, ym.y, ym.m, savedNonce]);

  // 열거나 현재 월로 올 때 좌측 목록을 '오늘' 행으로 자동 스크롤(1일이 아니라 오늘이 바로 보이게)
  useEffect(() => {
    if (isCurMonth && todayRowRef.current) {
      todayRowRef.current.scrollIntoView({ block: 'center' });
    }
  }, [isCurMonth, ym.y, ym.m]);

  const isWritten = (day, staffId) => statusSet.has(`${staffId}|${dateStr(day)}`);
  const dayDoneCount = (day) => roster.reduce((acc, s) => acc + (isWritten(day, s.id) ? 1 : 0), 0);

  const selectedDate = `${ym.y}-${p2(ym.m)}-${p2(selectedDay)}`;
  const selectedLabel = `${selectedDate} (${DAYS[new Date(ym.y, ym.m - 1, selectedDay).getDay()]})`;
  const viewUserId = viewStaffId || myId;            // 현재 문서의 작성자 id
  const canEdit = !viewStaffId || viewStaffId === myId; // 본인 것만 편집/저장

  // 편집 상태
  const [summary, setSummary] = useState(() => Object.fromEntries(SUMMARY_KEYS.map((k) => [k, 0])));
  const [content, setContent] = useState('');
  const [remark, setRemark] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false); // 내일 할일 → 일정등록
  const [extraPages, setExtraPages] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const resetEditor = () => {
    setSummary(Object.fromEntries(SUMMARY_KEYS.map((k) => [k, 0])));
    setContent(''); setRemark(''); setExtraPages([]); setLoaded(false);
  };
  const changeMonth = (delta) => {
    setYm((prev) => {
      const d = new Date(prev.y, prev.m - 1 + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() + 1 };
    });
    setExpanded(new Set());
    setViewStaff(null); setViewStaffId(null);
    resetEditor();
    const cur = new Date();
    const goCur = (new Date(ym.y, ym.m - 1 + delta, 1).getMonth() === cur.getMonth()) && (new Date(ym.y, ym.m - 1 + delta, 1).getFullYear() === cur.getFullYear());
    setSelectedDay(goCur ? cur.getDate() : 1);
  };
  const selectDay = (day, staff = null) => {
    setSelectedDay(day); setViewStaff(staff?.name || null); setViewStaffId(staff?.id || null);
  };
  const toggleExpand = (day) => setExpanded((prev) => {
    const next = new Set(prev); next.has(day) ? next.delete(day) : next.add(day); return next;
  });

  // 선택 날짜/직원의 업무일지 로드 → 편집 상태 채움(없으면 초기화)
  const applyJournal = (j) => {
    if (!j) { resetEditor(); return; }
    setSummary({
      propReg: j.prop_reg ?? '', propUpd: j.prop_upd ?? '', schedReg: j.sched_reg ?? '',
      schedUpd: j.sched_upd ?? '', call: j.call_cnt ?? '', consultMemo: j.consult_memo ?? '',
    });
    setContent(j.content || ''); setRemark(j.remark || '');
    setExtraPages(Array.isArray(j.extra_pages) ? j.extra_pages.map((p) => ({ id: p.id ?? (++_pid), text: p.text || '' })) : []);
    setLoaded(Boolean(j.prop_reg || j.prop_upd || j.sched_reg || j.sched_upd || j.call_cnt || j.consult_memo));
  };
  useEffect(() => {
    if (!viewUserId) { resetEditor(); return; }
    (async () => {
      try { const d = await worklogService.getJournal(viewUserId, selectedDate); applyJournal(d?.item || null); }
      catch (e) { console.error('업무일지 로드 실패:', e); resetEditor(); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, viewUserId, savedNonce]);

  // 마지막 페이지: 해당 업무일지(선택 직원)의 작업이력(hist 통합, 시간 오름차순)
  const [activity, setActivity] = useState([]);
  useEffect(() => {
    if (!showTree || !offNo || !viewUserId) { setActivity([]); return; }
    (async () => {
      try { const d = await worklogService.getActivity(offNo, selectedDate, viewUserId); setActivity(d?.items || []); }
      catch (e) { console.error('이력 조회 실패:', e); setActivity([]); }
    })();
  }, [showTree, offNo, selectedDate, viewUserId, savedNonce]);

  const nameOfId = (uid) => { const s = roster.find((x) => x.id === uid); return s ? s.name : (uid || '-'); };

  // hist 기반 자동집계 적용(공통)
  const applySummary = (s) => setSummary(Object.fromEntries(SUMMARY_KEYS.map((k) => [k, Number(s?.[k]) || 0])));

  // 시스템 기록 불러오기(hist 기반 자동집계) — 버튼
  const loadFromSystem = async () => {
    try {
      const d = await worklogService.getSummary(viewUserId, selectedDate);
      applySummary(d?.summary || {});
      setLoaded(true);
      toast.success('시스템 기록에서 불러왔습니다.');
    } catch (e) { console.error(e); toast.error('집계 조회에 실패했습니다.'); }
  };
  // 조회 대상(직원·날짜) 변경 시 자동집계 자동 로드(표시용)
  useEffect(() => {
    if (!viewUserId || !selectedDate) return;
    (async () => {
      try { const d = await worklogService.getSummary(viewUserId, selectedDate); applySummary(d?.summary || {}); setLoaded(true); }
      catch { /* noop */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewUserId, selectedDate, savedNonce]);

  const autoText = useMemo(() => (
    loaded ? SUMMARY_CATS.flatMap((c) => c.subs.map(([k, lbl]) => `· ${c.key === 'io' ? lbl : `${c.label.split(' ')[0]} ${lbl}`} ${summary[k] || 0}건`)).join('\n') : ''
  ), [loaded, summary]);

  const addPage = () => setExtraPages((prev) => [...prev, newPage()]);
  const removePage = (id) => setExtraPages((prev) => prev.filter((p) => p.id !== id));
  const setPageText = (id, text) => setExtraPages((prev) => prev.map((p) => (p.id === id ? { ...p, text } : p)));

  const handleSave = async () => {
    if (!canEdit) { toast('본인 업무일지만 저장할 수 있습니다.'); return; }
    if (!myId) { toast.error('사용자 정보가 없습니다.'); return; }
    const n0 = (v) => Number(v) || 0;
    try {
      await worklogService.saveJournal({
        offNo, rtNo: myRtNo, userId: myId, date: selectedDate,
        propReg: n0(summary.propReg), propUpd: n0(summary.propUpd),
        schedReg: n0(summary.schedReg), schedUpd: n0(summary.schedUpd),
        call: n0(summary.call), consultMemo: n0(summary.consultMemo),
        content, remark,
        extraPages: extraPages.map((p) => ({ id: p.id, text: p.text })),
      });
      toast.success('업무일지가 저장되었습니다.');
      setSavedNonce((x) => x + 1);
    } catch (e) { console.error(e); toast.error('저장에 실패했습니다.'); }
  };
  const handleClose = () => {
    if (onClose) return onClose();
    if (window.electronAPI?.closeCurrentWindow) { window.electronAPI.closeCurrentWindow(); return; }
    try { window.close(); } catch { /* noop */ }
  };

  const overlay = inModal ? {
    position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.45)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px',
  } : { position: 'relative', height: '100%' };

  const days = Array.from({ length: lastDay }, (_, i) => i + 1);

  return (
    <div style={overlay}>
      <div style={{
        width: '100%', height: inModal ? '94vh' : '100%', maxWidth: inModal ? '1280px' : 'none',
        background: '#ffffff', border: inModal ? '1px solid #cbd5e1' : 'none', borderRadius: inModal ? '10px' : 0,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* ===== 좌측: 월 선택 + 일자 목록 ===== */}
          <div style={{ width: '288px', flexShrink: 0, borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* 월 선택 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #e2e8f0' }}>
              <button onClick={() => changeMonth(-1)} style={navBtn} title="이전 달"><ChevronLeft className="h-4 w-4" /></button>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{ym.y}년 {ym.m}월</div>
              <button onClick={() => changeMonth(1)} style={navBtn} title="다음 달"><ChevronRight className="h-4 w-4" /></button>
            </div>
            {/* 대표: 공유 설정 (기본 모두공개) — 사무소 전체에 적용, 소속중개사도 이 설정을 따름 */}
            {isRep && (
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #eef2f7', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="radio" name="shareOpt" checked={shareAll} onChange={() => setShareMode(true)} style={{ cursor: 'pointer' }} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>모두공개 <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>(모든직원 업무 서로공유)</span></span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="radio" name="shareOpt" checked={!shareAll} onChange={() => setShareMode(false)} style={{ cursor: 'pointer' }} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>대표+담당자공개</span>
                </label>
              </div>
            )}
            <div style={{ padding: '8px 14px', borderBottom: '1px solid #eef2f7', fontSize: '13px', fontWeight: 700, color: '#475569' }}>
              {showTree ? '일자별 · 직원 작성현황' : '일자별 작성현황'}
            </div>

            {/* 일자 목록 */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {days.map((day) => {
                const wd = new Date(ym.y, ym.m - 1, day).getDay();
                const active = day === selectedDay;
                const isToday = isCurMonth && day === now.getDate();
                const done = dayDoneCount(day);
                const open = expanded.has(day);
                const dayColor = wd === 0 ? '#dc2626' : wd === 6 ? '#2563eb' : '#0f172a';
                return (
                  <div key={day} ref={isToday ? todayRowRef : undefined} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <div
                      onClick={() => (showTree ? toggleExpand(day) : selectDay(day))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', cursor: 'pointer',
                        background: active ? '#eef2ff' : '#fff', // 선택된 날짜 배경 강조(트리/비트리 공통)
                      }}
                    >
                      {showTree && (
                        <span style={{ color: '#64748b', display: 'inline-flex' }}>
                          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </span>
                      )}
                      <span style={{ minWidth: '72px', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: active ? 800 : 700, color: dayColor }}>
                        {ym.m}/{day} ({DAYS[wd]})
                      </span>
                      {isToday && (
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'white', background: '#ef4444', borderRadius: '8px', padding: '1px 7px', lineHeight: 1.4, whiteSpace: 'nowrap' }}>오늘</span>
                      )}
                      <span style={{ marginLeft: 'auto' }}>
                        {showTree
                          ? <span style={{ fontSize: '13px', fontWeight: 700, color: done === roster.length ? '#16a34a' : '#94a3b8' }}>{done}/{roster.length}</span>
                          : (isWritten(day, myId) ? <DoneBadge /> : <NotBadge past={isPastDay(day)} />)}
                      </span>
                    </div>

                    {/* 트리: 직원별 작성현황(대표 또는 공유 ON) */}
                    {showTree && open && (
                      <div style={{ background: '#fafbfc' }}>
                        {roster.map((s) => {
                          const w = isWritten(day, s.id);
                          const staffActive = active && viewStaffId === s.id;
                          return (
                            <div key={s.id}
                              onClick={() => selectDay(day, s)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px 8px 34px', cursor: 'pointer',
                                background: staffActive ? '#eef2ff' : 'transparent',
                              }}
                            >
                              <span style={{ fontSize: '13px', fontWeight: staffActive ? 800 : 600, color: '#334155' }}>{s.name}</span>
                              <span style={{ marginLeft: 'auto' }}>{w ? <DoneBadge /> : <NotBadge past={isPastDay(day)} />}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===== 우측: 문서 ===== */}
          <div style={{ flex: 1, overflow: 'auto', background: '#ffffff', padding: '24px 40px', minWidth: 0 }}>
            <div style={{ position: 'relative', paddingTop: '4px' }}>
              <table style={{ position: 'absolute', top: 0, right: 0, borderCollapse: 'collapse', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                <tbody>
                  <tr><th style={thCell}>사무소명</th><td style={tdCell}>{officeName}</td></tr>
                  <tr><th style={thCell}>성명</th><td style={tdCell}>{viewStaff || myName}</td></tr>
                </tbody>
              </table>
              <h1 style={{ textAlign: 'center', fontSize: '30px', fontWeight: 800, letterSpacing: '16px', color: '#0f172a', margin: '14px 0 0', paddingLeft: '16px' }}>
                업 무 일 지
              </h1>
              {/* 작성일자 라인 — 좌측끝 '시스템 기록 불러오기'(소형), 우측 작성일자 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  {canEdit && (
                    <button onClick={loadFromSystem} style={btnPrimarySm}><RefreshCw className="h-3.5 w-3.5" /> 시스템 기록 불러오기</button>
                  )}
                  {!canEdit && <span style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>· 다른 직원 일지(읽기전용)</span>}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>작성일자 : {selectedLabel}</div>
              </div>
            </div>

            <hr style={{ border: 0, borderTop: '2px solid #0f172a', margin: '14px 0 18px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '20px' }}>
              {SUMMARY_CATS.map((c) => (
                <div key={c.key} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', opacity: c.pending ? 0.6 : 1 }}>
                  {/* 카테고리 라벨 (빨간 밑줄) */}
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', paddingBottom: '4px', marginBottom: '6px', borderBottom: '2px solid #dc2626', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.label}>{c.label}</div>
                  {/* 등록/수정/삭제 세 칸(또는 작성/수정 등) — hist 자동집계(읽기전용) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    {c.subs.map(([k, lbl], i) => (
                      <span key={k} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {i > 0 && <span style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', margin: '0 2px' }}>/</span>}
                        <span title={lbl} style={{ minWidth: '28px', textAlign: 'center', fontSize: '18px', fontWeight: 800, color: c.pending ? '#94a3b8' : '#0f172a', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '3px 4px', background: '#f8fafc' }}>
                          {c.pending ? '-' : (summary[k] || 0)}
                        </span>
                      </span>
                    ))}
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginLeft: '3px' }}>건</span>
                  </div>
                </div>
              ))}
            </div>

            <label style={sectionLabel}>오늘 주요 업무</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} readOnly={!canEdit}
              placeholder={autoText ? `자동 집계 예시:\n${autoText}\n\n(위 내용을 참고하여 오늘 업무를 기록하세요)` : '오늘 처리한 업무를 기록하세요.'}
              style={{ ...textareaStyle, minHeight: '110px', background: canEdit ? '#fff' : '#f8fafc' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
              <label style={{ ...sectionLabel, marginTop: 0 }}>내일 할일</label>
              {canEdit && (
                <button type="button" onClick={() => setShowScheduleModal(true)} style={btnOutline}>
                  <CalendarPlus className="h-4 w-4" /> 일정등록
                </button>
              )}
            </div>
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} readOnly={!canEdit}
              placeholder="내일 처리할 일을 기록하세요. (우측 '일정등록'으로 다음날 오전 9시 일정 등록)"
              style={{ ...textareaStyle, minHeight: '120px', background: canEdit ? '#fff' : '#f8fafc' }} />

            {extraPages.map((pg, idx) => (
              <div key={pg.id} style={{ marginTop: '24px', paddingTop: '18px', borderTop: '2px dashed #cbd5e1' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{idx + 2}페이지</div>
                  {canEdit && <button onClick={() => removePage(pg.id)} style={btnGhostDanger}><Trash2 className="h-4 w-4" /> 페이지 삭제</button>}
                </div>
                <textarea value={pg.text} onChange={(e) => setPageText(pg.id, e.target.value)} readOnly={!canEdit}
                  placeholder={`${idx + 2}페이지 내용을 입력하세요.`} style={{ ...textareaStyle, minHeight: '360px', background: canEdit ? '#fff' : '#f8fafc' }} />
              </div>
            ))}

            {/* ===== 마지막 페이지: 선택 날짜 전 직원 작업이력(시간 오름차순) ===== */}
            {showTree && (
              <div style={{ marginTop: '28px', paddingTop: '18px', borderTop: '2px dashed #cbd5e1' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                  {selectedDate} 작업이력 <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>({activity.length}건)</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      {['시간', '직원', '구분', '항목', '대상'].map((h) => (
                        <th key={h} style={actTh}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activity.length === 0 ? (
                      <tr><td colSpan={5} style={{ ...actTd, textAlign: 'center', color: '#94a3b8', padding: '18px' }}>해당 날짜의 작업이력이 없습니다.</td></tr>
                    ) : activity.map((a, i) => (
                      <tr key={i}>
                        <td style={{ ...actTd, whiteSpace: 'nowrap', fontWeight: 700 }}>{fmtTime(a.loggedAt)}</td>
                        <td style={{ ...actTd, whiteSpace: 'nowrap' }}>{nameOfId(a.changedBy)}</td>
                        <td style={{ ...actTd, whiteSpace: 'nowrap', color: a.logType === 'D' ? '#dc2626' : a.logType === 'I' ? '#16a34a' : '#2563eb', fontWeight: 700 }}>{LOG_LABEL[a.logType] || a.logType}</td>
                        <td style={{ ...actTd, whiteSpace: 'nowrap' }}>{a.label}</td>
                        <td style={actTd}>{a.target || a.pk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 하단 고정 툴바 */}
        <div style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', background: '#fff', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* 페이지 추가 버튼 숨김 처리 */}
          <span />
          <div style={{ display: 'flex', gap: '10px' }}>
            {canEdit && <button onClick={handleSave} style={btnDark}><Save className="h-4 w-4" /> 등록</button>}
            <button onClick={handleClose} style={btnOutline}><X className="h-4 w-4" /> 닫기</button>
          </div>
        </div>
      </div>

      {/* 내일 할일 → 일정등록: 내용 자동입력, 날짜=다음날 오전 09시 */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        defaultTitle="내일 할일"
        defaultContent={remark}
        defaultDate={(() => { const d = new Date(`${selectedDate}T00:00:00`); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}
        defaultTime="09:00"
        onSuccess={() => { setShowScheduleModal(false); toast.success('일정이 등록되었습니다.'); }}
      />
    </div>
  );
}

/* ===== 뱃지 ===== */
const DoneBadge = () => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '13px', fontWeight: 700, color: '#16a34a', background: '#dcfce7', borderRadius: '999px', padding: '2px 8px' }}>
    <CheckCircle2 className="h-3.5 w-3.5" /> 작성완료
  </span>
);
const NotBadge = ({ past }) => (
  <span style={{ fontSize: '13px', fontWeight: 600, color: past ? '#94a3b8' : '#cbd5e1' }}>{past ? '미작성' : '-'}</span>
);

/* ===== styles ===== */
const navBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', color: '#334155', cursor: 'pointer' };
const thCell = { border: '1px solid #94a3b8', background: '#f1f5f9', padding: '6px 12px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' };
const tdCell = { border: '1px solid #94a3b8', padding: '6px 14px', minWidth: '120px', fontWeight: 600, color: '#0f172a' };
const actTh = { border: '1px solid #cbd5e1', background: '#f1f5f9', padding: '7px 8px', fontSize: '13px', fontWeight: 800, color: '#334155', whiteSpace: 'nowrap' };
const actTd = { border: '1px solid #e2e8f0', padding: '6px 8px', fontSize: '13px', fontWeight: 600, color: '#0f172a' };
const sectionLabel = { display: 'block', fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' };
const textareaStyle = { width: '100%', resize: 'vertical', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px 16px', fontSize: '15px', fontWeight: 600, color: '#0f172a', lineHeight: 1.7, outline: 'none' };
const btnBase = { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, borderRadius: '8px', padding: '10px 18px', cursor: 'pointer' };
const btnPrimary = { ...btnBase, color: '#fff', background: '#4f46e5', border: 0 };
const btnPrimarySm = { ...btnBase, color: '#fff', background: '#4f46e5', border: 0, padding: '7px 12px', fontWeight: 700 }; // 소형(글자 14px 유지)
const btnDark = { ...btnBase, color: '#fff', background: '#0f172a', border: 0, fontWeight: 800 };
const btnOutline = { ...btnBase, color: '#334155', background: '#fff', border: '1px solid #cbd5e1' };
const btnGhostDanger = { ...btnBase, color: '#dc2626', background: '#fff', border: '1px solid #fecaca', padding: '8px 14px' };
