import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar as CalendarIcon, List, Plus, Trash2 } from 'lucide-react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/ko';
import { isSonEomneunNal } from '../../utils/sonEomneun';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Card from '../../components/ui/Card';
import { scheduleService } from '../../services/scheduleService';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';
import ScheduleModal from '../../components/modals/ScheduleModal';

// moment 한글 로케일 설정
moment.locale('ko');
const localizer = momentLocalizer(moment);

const SchedulePage = () => {
  // 페이지 타이틀 설정
  useEffect(() => {
    document.title = '네오시스 - 일정관리';
  }, []);

  const { user, office } = useAuthStore();
  const [viewMode, setViewMode] = useState('calendar'); // 'list' or 'calendar' — 기본 달력보기
  const [scopeFilter, setScopeFilter] = useState('OFFICE'); // 'MY'(나의 일정) | 'OFFICE'(사무소 일정) — 기본 사무소 일정
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [newDate, setNewDate] = useState(''); // 날짜 클릭 시 신규 등록 기본 날짜(YYYY-MM-DD)
  const [timelineDate, setTimelineDate] = useState(null); // 달력보기 우측 타임라인 선택일(Date)
  const [tlPickerOpen, setTlPickerOpen] = useState(false); // 타임라인 날짜 변경용 달력 표시
  const [addPickerOpen, setAddPickerOpen] = useState(false); // 일정등록 1단계 날짜 선택 모달
  const [addPickerDate, setAddPickerDate] = useState(''); // 모달에서 선택한 날짜
  const [selectedScheduleId, setSelectedScheduleId] = useState(null); // 리스트뷰 선택 행
  const [selectedDateStr, setSelectedDateStr] = useState(''); // 선택 행의 날짜(바로 등록용)
  const [zoom, setZoom] = useState(100); // 화면 배율(%)
  const zoomNum = (parseFloat(zoom) || 100);
  const zoomIn = () => setZoom(Math.min(400, zoomNum + 5));
  const zoomOut = () => setZoom(Math.max(30, zoomNum - 5));
  const [expandedDates, setExpandedDates] = useState(() => new Set()); // 리스트뷰: 펼쳐진 날짜(2건 이상은 기본 접힘)
  const toggleExpandDate = (dateStr) => setExpandedDates((prev) => {
    const next = new Set(prev);
    if (next.has(dateStr)) next.delete(dateStr); else next.add(dateStr);
    return next;
  });

  // 리스트 컬럼 폭(px) — 내용 외 고정폭(드래그로 조절), 내용은 나머지/줄바꿈
  // [날짜, 제목, 물건소재지|장소, 전화번호1, 구분1, 성함1, 전화번호2, 구분2, 성함2, 내용]
  const [colWidths, setColWidths] = useState([116, 150, 220, 120, 66, 84, 120, 66, 84, 300]);
  const startResize = (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    const th = e.target.closest('th');
    const startW = th ? th.offsetWidth : (colWidths[index] || 80);
    const startX = e.clientX;
    const onMove = (ev) => {
      const delta = ev.clientX - startX;
      setColWidths((prev) => {
        const next = [...prev];
        next[index] = Math.max(40, startW + delta);
        return next;
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  // 리사이즈 핸들(헤더 우측 경계)
  const ResizeHandle = ({ index }) => (
    <span
      onMouseDown={(e) => startResize(index, e)}
      style={{ position: 'absolute', top: 0, right: 0, width: '6px', height: '100%', cursor: 'col-resize', userSelect: 'none' }}
    />
  );

  // 범위 구분 옵션
  const scopeDivOptions = [
    { value: 'MY', label: '개인' },
    { value: 'OFFICE', label: '사무실' },
    { value: 'SHARE', label: '공유' },
  ];

  // 년도 옵션 (현재 년도 기준 ±5년)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  useEffect(() => {
    fetchSchedules();
  }, [selectedYear, selectedMonth, scopeFilter, viewMode]);

  // 리스트 보기: 오늘(현재 월일 때) 자동 선택 / 달력 보기: 선택 초기화
  useEffect(() => {
    const d = new Date();
    const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const inMonth = d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth;
    setSelectedDateStr(viewMode === 'list' && inMonth ? t : '');
    setSelectedScheduleId(null);
  }, [viewMode, selectedYear, selectedMonth]);

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      // 선택한 년월의 시작일과 종료일 계산 (로컬 기준 — UTC 변환 시 하루 밀림 방지)
      const pad = (n) => String(n).padStart(2, '0');
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);

      const params = {
        startDate: `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`,
        endDate: `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`,
      };

      // 범위 필터 적용
      if (scopeFilter === 'OFFICE') {
        // 사무실 일정: 사무실 구성원 전체가 공유 → 소유자(ownerUserId)로 제한하지 않고 officeId로 조회
        params.scopeDiv = 'OFFICE';
        params.officeId = office?.offNo;
      } else {
        // 나의 일정: 본인 소유 + 본인이 만든 공유(SHARE)만
        params.scopeDiv = 'MY';
        params.ownerUserId = user?.userId;
      }

      const response = await scheduleService.getScheduleList(params);

      if (response.success && response.data) {
        setSchedules(response.data.schedules || []);
      }
    } catch (error) {
      console.error('일정 목록 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSchedule = () => {
    setEditData(null);
    setNewDate('');
    setShowModal(true);
  };

  // 일정등록 버튼: 선택된 날짜가 있으면 바로 그 날짜로 등록, 없으면 날짜 먼저 선택 안내
  const handleAddClick = () => {
    if (selectedDateStr) { handleDateClick(selectedDateStr); return; }
    toast.error('날짜를 먼저 선택해주세요.');
  };

  const handleEdit = (schedule) => {
    setEditData(schedule);
    setNewDate('');
    setShowModal(true);
  };

  // 리스트 행 클릭: 그 날짜 선택(하이라이트) → 같은 일정 재클릭 시 수정창
  const handleRowSelect = (schedule, dateStr) => {
    if (selectedScheduleId === schedule.scheduleId) {
      handleEdit(schedule);
    } else {
      setSelectedScheduleId(schedule.scheduleId);
      setSelectedDateStr(dateStr || '');
    }
  };

  // 날짜(행/셀/슬롯) 클릭: 1번 클릭=선택(우상단 '일정 등록하기 (1)'), 같은 날짜 재클릭·더블클릭=등록창
  const handleDateSelect = (dateStr) => {
    if (dateStr && selectedDateStr === dateStr) { handleDateClick(dateStr); return; }
    setSelectedScheduleId(null);
    setSelectedDateStr(dateStr || '');
  };

  // 리스트에서 날짜 클릭 → 해당 날짜로 신규 등록창
  const handleDateClick = (dateStr) => {
    setEditData(null);
    setNewDate(dateStr || '');
    setShowModal(true);
  };
  // 오늘 날짜(YYYY-MM-DD)
  const todayStr = (() => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  })();

  const handleDelete = async (scheduleId) => {
    if (!window.confirm('이 일정을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await scheduleService.deleteSchedule(scheduleId, user?.userId);
      toast.success('일정이 삭제되었습니다.');
      fetchSchedules();
    } catch (error) {
      console.error('일정 삭제 실패:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return '-';
    return dateString.split('T')[0];
  };

  const getDateAndDay = (dateString) => {
    if (!dateString) return { date: '-', day: '-' };
    const date = new Date(dateString);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = days[date.getDay()];
    return {
      date: `${month}월 ${day}일`,
      day: dayOfWeek
    };
  };

  const getScopeDivLabel = (scopeDiv) => {
    return scopeDivOptions.find(opt => opt.value === scopeDiv)?.label || scopeDiv;
  };

  // HH:mm 형식의 시간 반환
  const formatTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // 해당 월의 모든 날짜를 생성하고 일정 데이터를 매핑
  const monthDaysWithSchedules = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const allDays = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(selectedYear, selectedMonth - 1, day);
      const pad = (n) => String(n).padStart(2, '0');
      const dateStr = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`;

      // 해당 날짜의 일정들을 찾기 (시간 오름차순 정렬)
      const daySchedules = schedules
        .filter((schedule) => (schedule.startAt || '').split('T')[0] === dateStr)
        .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

      allDays.push({
        date: currentDate,
        dateStr: dateStr,
        schedules: daySchedules
      });
    }

    return allDays;
  }, [selectedYear, selectedMonth, schedules]);

  // 달력 이벤트 데이터 변환 — 같은 날짜 + 같은 제목이면 "제목(N)"으로 묶음
  const calendarEvents = useMemo(() => {
    // 시간 오름차순으로 먼저 정렬 → 그룹의 첫 항목/표시가 가장 이른 시간이 되도록
    const sorted = [...schedules].sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    const groups = {};
    sorted.forEach((s) => {
      const title = s.title || '(제목 없음)';
      const dateKey = (s.startAt || '').split('T')[0];
      const key = `${dateKey}|${title}`;
      if (!groups[key]) groups[key] = { title, items: [], first: s };
      groups[key].items.push(s);
    });
    return Object.values(groups).map((g) => {
      const count = g.items.length;
      const s = g.first;
      return {
        id: s.scheduleId,
        title: count > 1 ? `${g.title}(${count})` : g.title,
        start: new Date(s.startAt),
        end: s.endAt ? new Date(s.endAt) : new Date(s.startAt),
        allDay: s.allDay,
        resource: s, // 클릭 시 첫 일정 편집
        count,
        groupItems: g.items, // 겹친 일정 목록(호버 시 펼침)
      };
    });
  }, [schedules]);

  // 달력 겹친 이벤트 호버 팝오버 { items, x, y }
  const [hoverGroup, setHoverGroup] = useState(null);
  const hoverHideTimer = useRef(null);
  const cancelHoverHide = () => { if (hoverHideTimer.current) { clearTimeout(hoverHideTimer.current); hoverHideTimer.current = null; } };
  const scheduleHoverHide = () => { cancelHoverHide(); hoverHideTimer.current = setTimeout(() => setHoverGroup(null), 160); };

  // 달력 커스텀 이벤트 렌더 — 겹친(N>1) 이벤트는 호버 시 개별 일정 팝오버
  const CalEvent = ({ event }) => {
    if (!event.count || event.count <= 1) return <span>{event.title}</span>;
    return (
      <span
        onMouseEnter={(e) => {
          cancelHoverHide();
          const r = e.currentTarget.getBoundingClientRect();
          setHoverGroup({ items: event.groupItems, x: r.left, y: r.bottom });
        }}
        onMouseLeave={scheduleHoverHide}
      >
        {event.title}
      </span>
    );
  };

  // 달력 날짜 헤더: 주말은 숫자 글자색(일=빨강, 토=파랑) + 오늘은 좌상단 '오늘' 배지
  const DateHeaderCell = ({ label, date }) => {
    const dow = date.getDay();
    const p = (n) => String(n).padStart(2, '0');
    const ds = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
    const isToday = ds === todayStr;
    const numColor = dow === 0 ? '#dc2626' : dow === 6 ? '#2563eb' : '#111827';
    const son = isSonEomneunNal(date);
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        {isToday
          ? <span style={{ fontSize: '10px', fontWeight: 700, color: 'white', background: '#ef4444', borderRadius: '8px', padding: '0 6px', lineHeight: '15px', whiteSpace: 'nowrap' }}>오늘</span>
          : <span />}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          {son && <span style={{ fontSize: '10px', fontWeight: 700, color: 'white', background: '#16a34a', borderRadius: '8px', padding: '0 5px', lineHeight: '15px', whiteSpace: 'nowrap' }}>이사날</span>}
          <span style={{ color: numColor, fontWeight: isToday ? 700 : 500 }}>{label}</span>
        </span>
      </div>
    );
  };
  // 리스트뷰 — 손없는날(이사날) 배지(오늘 배지와 동일 스타일, 초록)
  const SonBadge = ({ d }) => (isSonEomneunNal(d) ? <span title="이사날(손없는날)" style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, color: 'white', background: '#16a34a', borderRadius: '8px', padding: '0 5px', lineHeight: '15px', marginRight: '4px', whiteSpace: 'nowrap' }}>이사날</span> : null);

  // 달력 이벤트 클릭 핸들러 (편집 + 타임라인 해당일로 이동)
  const handleSelectEvent = (event) => {
    setTimelineDate(event.start);
    handleEdit(event.resource);
  };

  // 달력에서 날짜(슬롯) 클릭 시 → 타임라인 이동 + 1번 클릭=선택(우상단 '(1)'), 재클릭·더블클릭=등록창
  const handleSelectSlot = ({ start }) => {
    setTimelineDate(start);
    const p = (n) => String(n).padStart(2, '0');
    const dateStr = `${start.getFullYear()}-${p(start.getMonth() + 1)}-${p(start.getDate())}`;
    if (selectedDateStr === dateStr) { handleDateClick(dateStr); }
    else { setSelectedScheduleId(null); setSelectedDateStr(dateStr); }
  };

  // ── 달력 우측 타임라인 ──
  const tlDate = timelineDate || new Date();
  const shiftTimeline = (delta) => {
    const d = new Date(tlDate);
    d.setDate(d.getDate() + delta);
    setTimelineDate(d);
  };
  const tlDateStr = (() => {
    const p = (n) => String(n).padStart(2, '0');
    return `${tlDate.getFullYear()}-${p(tlDate.getMonth() + 1)}-${p(tlDate.getDate())}`;
  })();
  const tlLabelParts = getDateAndDay(tlDate.toISOString());
  const timelineItems = schedules
    .filter((s) => (s.startAt || '').split('T')[0] === tlDateStr)
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f9fafb', zoom: zoomNum / 100 }}>
      {/* 헤더 */}
      <div style={{ padding: '4px 12px 6px', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        {/* 첫 번째 줄: 범위 필터 (사무소 일정 / 나의 일정) */}
        <div className="flex items-center gap-4 mb-1.5">
          <button
            onClick={() => setScopeFilter('OFFICE')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              scopeFilter === 'OFFICE'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            사무소 일정
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => setScopeFilter('MY')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              scopeFilter === 'MY'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            나의 일정
          </button>
        </div>

        {/* 두 번째 줄: 보기 모드, 년월 선택, 새로고침, 등록 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 보기 모드 전환 */}
            <div className="flex border border-gray-300 rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${
                  viewMode === 'calendar'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <CalendarIcon className="w-4 h-4" />
                달력보기
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 border-l ${
                  viewMode === 'list'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <List className="w-4 h-4" />
                리스트보기
              </button>
            </div>

            <span className="text-gray-300 text-xl">|</span>

            {/* 년도 선택 */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>

            {/* 월 선택 버튼 */}
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  className={`px-2.5 py-1.5 text-sm rounded transition-colors ${
                    selectedMonth === month
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {month}월
                </button>
              ))}
            </div>
          </div>

          {/* 우측 버튼들 */}
          <div className="flex gap-2 items-center">
            {/* 배율 */}
            <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '600', whiteSpace: 'nowrap' }}>배율</span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button type="button" onClick={zoomOut} title="축소(-5%)"
                style={{ padding: '3px 8px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '4px 0 0 4px', background: 'white', color: '#374151', cursor: 'pointer' }}>−</button>
              <input type="number" value={zoom}
                onChange={(e) => setZoom(e.target.value)}
                onBlur={(e) => { const v = parseFloat(e.target.value); setZoom(v ? Math.min(400, Math.max(30, v)) : 100); }}
                style={{ width: '52px', padding: '3px 4px', fontSize: '14px', textAlign: 'center', border: '1px solid #e5e7eb', borderLeft: 'none', borderRight: 'none', color: '#374151' }} />
              <span style={{ fontSize: '14px', color: '#6b7280', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', padding: '3px 4px' }}>%</span>
              <button type="button" onClick={zoomIn} title="확대(+5%)"
                style={{ padding: '3px 8px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '0 4px 4px 0', background: 'white', color: '#374151', cursor: 'pointer' }}>+</button>
            </div>
            <div className="relative">
              <button
                onClick={handleAddClick}
                className="flex items-center px-4 py-2 text-[14px] text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
                title={selectedDateStr ? '선택한 날짜로 바로 등록' : '날짜를 먼저 선택하세요'}
              >
                <Plus className="w-4 h-4 mr-2" />
                일정 등록하기{selectedDateStr ? ' (1)' : ''}
              </button>
              {selectedDateStr && (
                <button
                  type="button"
                  onClick={() => { setSelectedDateStr(''); setSelectedScheduleId(null); }}
                  title="선택 해제"
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-gray-600 text-white text-[10px] leading-none hover:bg-gray-700"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {viewMode === 'list' ? (
          /* 리스트 뷰 - 테이블 형식 (데이터 영역 여백 제거) */
          <Card padding="none" className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
            <div className="flex-1 overflow-auto">
              {/* 데이터 셀 패딩 최소화 + 셀 테두리(그리드) */}
              <style>{`
                .schedule-list-grid { border-collapse: collapse; table-layout: fixed; }
                .schedule-list-grid td { padding: 1px 6px !important; border: 1px solid #e5e7eb; vertical-align: top; overflow: hidden; }
                .schedule-list-grid th { border: 1px solid #e5e7eb; }
                /* 내용 외 컬럼은 고정폭 한 줄(넘치면 …), 내용은 줄바꿈 */
                .schedule-list-grid td.fit, .schedule-list-grid th.fit { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .schedule-list-grid td.content-cell { white-space: normal; word-break: break-word; }
                .schedule-list-grid thead tr:first-child th { border-top: 2px solid #94a3b8; }
              `}</style>
              <table className="schedule-list-grid list-topline" style={{ width: 'max-content', minWidth: '100%' }}>
                <colgroup>
                  {colWidths.map((w, i) => (
                    <col key={i} style={{ width: `${w || 100}px` }} />
                  ))}
                </colgroup>
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {['날짜', '제목', '물건소재지 | 장소', '전화번호1', '구분1', '성함1', '전화번호2', '구분2', '성함2', '내용'].map((label, i) => (
                      <th key={label} className={`relative px-2 py-1 text-left text-[14px] uppercase tracking-wider border border-gray-200 ${i < 9 ? 'fit' : ''}`}>
                        {label}
                        <ResizeHandle index={i} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                        로딩 중...
                      </td>
                    </tr>
                  ) : (
                    monthDaysWithSchedules.map((dayData, dayIndex) => {
                      const { date, day } = getDateAndDay(dayData.date.toISOString());
                      const daySchedules = dayData.schedules;
                      // 주말 글자색 (달력과 동일: 일=빨강, 토=파랑)
                      const dow = dayData.date.getDay();
                      const dateColor = dow === 0 ? '#dc2626' : dow === 6 ? '#2563eb' : undefined;

                      if (daySchedules.length === 0) {
                        // 일정이 없는 날
                        return (
                          <tr key={`day-${dayIndex}`}
                            onClick={() => handleDateSelect(dayData.dateStr)}
                            className={`cursor-pointer transition-colors ${selectedDateStr === dayData.dateStr ? 'bg-indigo-200' : 'hover:bg-gray-100'}`}>
                            <td title="클릭: 날짜 선택 / 다시 클릭: 일정 등록"
                              style={{ color: dateColor }}
                              className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                              <SonBadge d={dayData.date} />{date} ({day})
                              {dayData.dateStr === todayStr && <span className="ml-1 text-red-500 font-semibold">오늘</span>}
                            </td>
                            <td colSpan={9} className="px-4 py-3 text-sm text-gray-400">-</td>
                          </tr>
                        );
                      }

                      // 일정이 있는 날
                      const isMulti = daySchedules.length >= 2;
                      const isExpanded = expandedDates.has(dayData.dateStr);

                      // 2건 이상 + 접힘: 달력처럼 제목 요약 한 줄
                      if (isMulti && !isExpanded) {
                        const order = [];
                        const cntMap = {};
                        daySchedules.forEach((s) => {
                          const t = s.title || '(제목 없음)';
                          if (cntMap[t] == null) { cntMap[t] = 0; order.push(t); }
                          cntMap[t] += 1;
                        });
                        const summary = order.map((t) => (cntMap[t] > 1 ? `${t}(${cntMap[t]})` : t)).join(', ');
                        return (
                          <tr key={`day-sum-${dayIndex}`}
                            onClick={() => handleDateSelect(dayData.dateStr)}
                            title="클릭하여 날짜 선택 (펼치기는 우측 버튼)"
                            className={`cursor-pointer transition-colors ${selectedDateStr === dayData.dateStr ? 'bg-indigo-200' : 'hover:bg-gray-100'}`}>
                            <td title="클릭: 날짜 선택 / 다시 클릭: 일정 등록"
                              style={{ color: dateColor }}
                              className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                              <SonBadge d={dayData.date} />{date} ({day})
                              {dayData.dateStr === todayStr && <span className="ml-1 text-red-500 font-semibold">오늘</span>}
                            </td>
                            <td colSpan={9} className="content-cell text-sm text-gray-700">
                              <div className="flex items-center gap-2">
                                <span className="break-words">{summary}</span>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); toggleExpandDate(dayData.dateStr); }}
                                  className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-white bg-blue-500 rounded hover:bg-blue-600"
                                >
                                  펼치기 ▾
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return daySchedules.map((schedule, scheduleIndex) => {
                        const isFirstSchedule = scheduleIndex === 0;
                        return (
                          <tr
                            key={`${dayIndex}-${schedule.scheduleId}`}
                            onClick={() => handleRowSelect(schedule, dayData.dateStr)}
                            className={`cursor-pointer transition-colors ${selectedDateStr === dayData.dateStr ? 'bg-indigo-200' : 'hover:bg-gray-100'}`}
                          >
                            {isFirstSchedule ? (
                              <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap" rowSpan={daySchedules.length}>
                                <div onClick={(e) => { e.stopPropagation(); handleDateSelect(dayData.dateStr); }} title="클릭: 날짜 선택 / 다시 클릭: 일정 등록"
                                  style={{ color: dateColor }}
                                  className="cursor-pointer hover:bg-blue-50">
                                  <SonBadge d={dayData.date} />{date} ({day})
                                  {dayData.dateStr === todayStr && <span className="ml-1 text-red-500 font-semibold">오늘</span>}
                                </div>
                                {isMulti && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); toggleExpandDate(dayData.dateStr); }}
                                    className="mt-1 px-2 py-0.5 text-xs font-semibold text-white bg-slate-500 rounded hover:bg-slate-600"
                                  >
                                    접기 ▴
                                  </button>
                                )}
                              </td>
                            ) : null}
                            <td className="text-sm font-medium text-gray-900 fit" title={schedule.title || ''}>
                              {schedule.title || '(제목 없음)'}
                            </td>
                            <td className="text-sm text-gray-700 fit" title={schedule.location || schedule.ptLocation || ''}>
                              {schedule.location || schedule.ptLocation || '-'}
                            </td>
                            <td className="text-sm text-gray-700 fit">
                              {schedule.phone || '-'}
                            </td>
                            <td className="text-sm text-gray-700 fit">
                              {schedule.contactRole || '-'}
                            </td>
                            <td className="text-sm text-gray-700 fit">
                              {schedule.contactName || '-'}
                            </td>
                            <td className="text-sm text-gray-700 fit">
                              {schedule.phone2 || '-'}
                            </td>
                            <td className="text-sm text-gray-700 fit">
                              {schedule.contactRole2 || '-'}
                            </td>
                            <td className="text-sm text-gray-700 fit">
                              {schedule.contactName2 || '-'}
                            </td>
                            <td className="content-cell text-sm text-gray-700 align-top">
                              <div className="flex items-start justify-between gap-1">
                                <span className="whitespace-pre-wrap break-words flex-1 min-w-0">{schedule.content || '-'}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(schedule.scheduleId);
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                                  title="삭제"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          /* 달력 뷰 (+ 우측 타임라인) */
          <Card padding="none" className="mx-2 mt-1 mb-2 flex-1 overflow-hidden flex flex-row" style={{ minHeight: 0 }}>
            <div className="flex-1 overflow-auto" style={{ minHeight: 500 }}>
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">로딩 중...</div>
                </div>
              ) : (
                <>
                <style>{`
                  /* 셀에 최대 4개 노출되도록 주 행 높이 확보 + 이벤트/‘+N개’ 폰트 14px */
                  .schedule-cal .rbc-month-row { min-height: 132px; }
                  .schedule-cal .rbc-event, .schedule-cal .rbc-event-content { font-size: 13px; }
                  .schedule-cal .rbc-show-more { font-size: 13px; font-weight: 600; color: #2563eb; }
                  /* 날짜 숫자 영역: 좌측정렬(오늘 배지 좌상단 배치용) */
                  .schedule-cal .rbc-date-cell { text-align: left; padding: 2px 4px 0; }
                `}</style>
                <Calendar
                  className="schedule-cal"
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  date={new Date(selectedYear, selectedMonth - 1, 1)}
                  onNavigate={() => {}}
                  style={{ height: '100%', minHeight: 500 }}
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  selectable
                  toolbar={false}
                  components={{ event: CalEvent, month: { dateHeader: DateHeaderCell } }}
                  formats={{
                    weekdayFormat: (date) => ['일', '월', '화', '수', '목', '금', '토'][date.getDay()],
                  }}
                  culture="ko"
                  dayPropGetter={(date) => {
                    const p = (n) => String(n).padStart(2, '0');
                    const ds = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
                    if (ds === selectedDateStr) {
                      return { style: { backgroundColor: '#dbeafe', boxShadow: 'inset 0 0 0 2px #3b82f6' } };
                    }
                    return {};
                  }}
                  messages={{
                    next: '다음',
                    previous: '이전',
                    today: '오늘',
                    month: '월',
                    week: '주',
                    day: '일',
                    agenda: '일정',
                    date: '날짜',
                    time: '시간',
                    event: '일정',
                    noEventsInRange: '해당 기간에 일정이 없습니다.',
                    showMore: (total) => `+${total}개`,
                  }}
                  views={['month']}
                  defaultView="month"
                  popup
                  eventPropGetter={(event) => {
                    const backgroundColor = event.resource.isPrivate
                      ? '#6b7280'
                      : event.resource.scopeDiv === 'OFFICE'
                      ? '#3b82f6'
                      : event.resource.scopeDiv === 'COMPANY'
                      ? '#8b5cf6'
                      : '#10b981';

                    return {
                      style: {
                        backgroundColor,
                        borderRadius: '4px',
                        opacity: 0.95,
                        color: '#111827',
                        fontWeight: 700,
                        border: '0px',
                        display: 'block',
                        fontSize: '14px',
                      },
                    };
                  }}
                />
                </>
              )}
            </div>

            {/* 우측 타임라인 (선택일 기준, 화살표/날짜클릭으로 이동) */}
            <div className="w-72 border-l border-gray-200 flex flex-col flex-shrink-0" style={{ minHeight: 500 }}>
              <div className="flex items-center justify-between px-2 py-2 border-b border-gray-200 bg-gray-50">
                <button type="button" onClick={() => shiftTimeline(-1)} className="px-2 py-1 text-gray-600 hover:bg-gray-200 rounded" title="이전 날짜">‹</button>
                <div className="relative">
                  <button type="button" onClick={() => setTlPickerOpen((v) => !v)} className="text-sm font-semibold text-gray-800 hover:text-blue-600" title="날짜 변경">
                    {tlLabelParts.date} ({tlLabelParts.day})
                    {tlDateStr === todayStr && <span className="ml-1 text-red-500">오늘</span>}
                  </button>
                  {tlPickerOpen && (
                    <input
                      type="date"
                      value={tlDateStr}
                      autoFocus
                      onChange={(e) => { if (e.target.value) setTimelineDate(new Date(`${e.target.value}T00:00:00`)); setTlPickerOpen(false); }}
                      onBlur={() => setTlPickerOpen(false)}
                      className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 px-2 py-1 text-sm border border-gray-300 rounded shadow bg-white"
                    />
                  )}
                </div>
                <button type="button" onClick={() => shiftTimeline(1)} className="px-2 py-1 text-gray-600 hover:bg-gray-200 rounded" title="다음 날짜">›</button>
              </div>
              <div className="flex-1 overflow-auto p-2">
                {timelineItems.length === 0 ? (
                  <div className="text-center text-xs text-gray-400 py-8">일정이 없습니다.</div>
                ) : (
                  timelineItems.map((s) => (
                    <div key={s.scheduleId} onClick={() => handleEdit(s)}
                      className="flex items-start gap-2 px-2 py-2 mb-1 rounded border border-gray-100 hover:bg-blue-50 cursor-pointer">
                      <span className="text-xs font-semibold text-blue-600 whitespace-nowrap w-10 flex-shrink-0">{formatTime(s.startAt)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-gray-900 truncate">{s.title || '(제목 없음)'}</div>
                        {s.location && <div className="text-xs text-gray-500 truncate">{s.location}</div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* 일정 등록/수정 모달 */}
      <ScheduleModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchSchedules}
        editData={editData}
        defaultDate={newDate}
      />

      {/* 날짜 선택 모달 (일정등록 1단계) */}
      {addPickerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setAddPickerOpen(false)}>
          <div style={{ background: 'white', borderRadius: '10px', width: '340px', padding: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '14px', textAlign: 'center' }}>
              일정 등록할 날짜를 선택해주세요
            </div>
            <input
              type="date"
              value={addPickerDate}
              autoFocus
              onChange={(e) => setAddPickerDate(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setAddPickerOpen(false)}
                style={{ padding: '7px 16px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', color: '#475569', cursor: 'pointer' }}>취소</button>
              <button type="button"
                onClick={() => { if (!addPickerDate) { toast.error('날짜를 선택해주세요.'); return; } setAddPickerOpen(false); handleDateClick(addPickerDate); }}
                style={{ padding: '7px 16px', fontSize: '14px', border: 'none', borderRadius: '6px', background: '#4f46e5', color: 'white', fontWeight: 600, cursor: 'pointer' }}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 달력 겹친 일정 호버 팝오버 — 개별 일정 클릭 시 수정창 */}
      {hoverGroup && (
        <div
          style={{ position: 'fixed', left: hoverGroup.x, top: hoverGroup.y + 2, zIndex: 5000, background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 6px 20px rgba(0,0,0,0.18)', minWidth: '200px', maxWidth: '320px', maxHeight: '260px', overflowY: 'auto', padding: '4px' }}
          onMouseEnter={cancelHoverHide}
          onMouseLeave={scheduleHoverHide}
        >
          {hoverGroup.items.map((it) => (
            <button
              key={it.scheduleId}
              type="button"
              onClick={() => { setHoverGroup(null); handleEdit(it); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', fontSize: '14px', border: 'none', background: 'white', cursor: 'pointer', borderRadius: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
            >
              <span style={{ color: '#64748b', marginRight: '6px' }}>{formatTime(it.startAt)}</span>
              {it.title || '(제목 없음)'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SchedulePage;
