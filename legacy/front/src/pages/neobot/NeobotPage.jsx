import { useState, useEffect, useRef } from 'react';
import { Search, User, Calendar, MapPin, FileText, ArrowLeft, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import NeobotConsultationEditor from '../../components/neobot/NeobotConsultationEditor';
import { searchNeobot, searchConsultations, getPropertyDetail, getCustomerDetail, getContractDetail, neobotTradeLabel } from '../../services/neobotService';
import { getPropertyTypeLabel } from '../../constants/propertyTypes';
import { saleDivLabel } from '../../constants/tradeDivisions';
import { useAuthStore } from '../../stores/authStore';

// 저장일 표기용: ISO/문자 → "YY.MM.DD"
const ymd = (v) => {
  if (!v) return '';
  const s = String(v).replace('T', ' ').slice(0, 10);
  const [y, m, d] = s.split('-');
  return (y && m && d) ? `${y.slice(2)}.${m}.${d}` : s;
};
// reg_date 최신순 정렬(내림차순)
const byRegDesc = (a, b) => String(b || '').localeCompare(String(a || ''));

// 전화번호 정규화 : +82 / 국가코드 / 하이픈·공백 제거 → 0으로 시작하는 숫자만
const normalizePhone = (raw) => {
  let s = String(raw || '').trim().replace(/[^\d+]/g, '');
  if (s.startsWith('+82')) s = '0' + s.slice(3);
  else if (s.startsWith('82') && s.length >= 11) s = '0' + s.slice(2);
  return s.replace(/\D/g, '');
};
// 표시용 하이픈 포맷
const formatPhone = (raw) => {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return d.startsWith('02') ? `02-${d.slice(2, 6)}-${d.slice(6)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return raw || '';
};

const NeobotPage = ({ initState = null }) => {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [consultResults, setConsultResults] = useState([]); // 검색어와 일치하는 상담이력(전화번호/내용)
  const [selectedItem, setSelectedItem] = useState(null);
  const [detail, setDetail] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [callInfo, setCallInfo] = useState(null); // { number, at } - 착신 시 표시/기본세팅
  const searchInputRef = useRef(null);
  const searchTimer = useRef(null);
  const autoPick = useRef(false);

  // 만원 단위 → 한글 금액
  const won = (v) => {
    if (v == null || v === '') return '-';
    const n = Number(v); if (!n) return '-';
    if (n >= 10000) {
      const eok = Math.floor(n / 10000);
      const man = n % 10000;
      return man ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`;
    }
    return `${n.toLocaleString()}만`;
  };
  const fmtDate = (iso) => {
    if (!iso) return '-';
    const s = String(iso).replace('T', ' ');
    return s.slice(0, 10).replace(/-/g, '.');
  };
  const fmtDateTime = (iso) => {
    if (!iso) return '-';
    const s = String(iso).replace('T', ' ');
    return `${s.slice(0, 10).replace(/-/g, '.')} ${s.slice(11, 16)}`.trim();
  };

  useEffect(() => {
    document.title = '네오봇';
    if (searchInputRef.current) setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  // 착신으로 열린 경우: 번호 정규화 → 자동검색 + 배너 + 첫 결과 자동선택
  useEffect(() => {
    const pn = initState?.phoneNumber;
    if (!pn) return;
    const norm = normalizePhone(pn);
    if (!norm) return;
    setCallInfo({ number: norm, at: initState.callAt || new Date().toISOString() });
    setSearchQuery(norm);
    autoPick.current = true;
    handleSearch(norm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 착신 시에는 검색 결과만 표시하고, 하단 상담이력 입력창에 착신번호가 자동 입력됨(수정창 자동 오픈 안 함)

  const highlightText = (text, query) => {
    if (!query || !text) return text;
    const parts = String(text).split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={index} style={{ background: '#fef08a', fontWeight: 800 }}>{part}</mark>
        : part
    );
  };

  const handleSearch = (query) => {
    clearTimeout(searchTimer.current);
    if (!query.trim()) { setSearchResults([]); setConsultResults([]); setSelectedItem(null); setDetail(null); setIsSearching(false); return; }
    setIsSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        // 통합검색 + 상담이력검색(전화번호/내용) 병렬
        const [{ items }, consults] = await Promise.all([
          searchNeobot(query, { user }),
          searchConsultations(query, { user }).catch(() => []),
        ]);
        setSearchResults(items);
        setConsultResults(consults || []);
      } catch (error) {
        console.error('네오봇 검색 실패:', error);
        toast.error('검색에 실패했습니다.');
        setSearchResults([]);
        setConsultResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // 검색결과 행 클릭 → 물건이면 물건수정창, 고객이면 고객수정창 열기 (계약은 안내)
  const handleResultClick = async (result) => {
    if (!window.electronAPI?.modal) { toast.error('창을 열 수 없습니다.'); return; }
    try {
      if (result.kind === 'PT') {
        await window.electronAPI.modal.open({
          type: 'property-form-v2',
          data: { title: `물건 수정 - ${result.title || '물건정보'}`, ptNo: result.refId },
          width: 1580, height: 900, minWidth: 1580, minHeight: 900, resizable: true,
        });
      } else if (result.kind === 'CUST') {
        await window.electronAPI.modal.open({
          type: 'customer',
          data: { title: `고객 수정 - ${result.name || '고객정보'}`, editData: { custNo: result.refId } },
          width: 1200, height: 900, minHeight: 800, resizable: false,
        });
      } else {
        // 계약/가계약 → 계약관리 화면 열기
        await handleQuickAction('contract');
      }
    } catch (error) {
      console.error('수정 창 열기 실패:', error);
      toast.error('창 열기에 실패했습니다.');
    }
  };

  // 검색결과 셋째 줄: 현/과거 소유자·임차인(물건) · 구입자(고객) 이름·전화
  const personsLine = (result) => {
    const ps = (result.persons || []).filter((p) => p && (p.name || p.phone));
    if (!ps.length) return '';
    return ps.map((p) => {
      const role = p.role || '';
      // 소유자/임차인은 현재/과거 상태를 접두어로 표기, 구입자 등은 역할만 표기
      const label = (role === '소유자' || role === '임차인') ? `${p.past ? '과거 ' : '현 '}${role}` : role;
      return `${label} ${p.name || ''}${p.phone ? ` ${p.phone}` : ''}`.trim();
    }).join(', ');
  };

  const reloadDetail = async () => {
    if (!selectedItem) return;
    try {
      let d = null;
      if (selectedItem.kind === 'PT') d = await getPropertyDetail(selectedItem.refId);
      else if (selectedItem.kind === 'CUST') d = await getCustomerDetail(selectedItem.refId);
      else if (selectedItem.kind === 'CT') d = await getContractDetail(selectedItem.refId);
      setDetail(d);
    } catch (error) { console.error('상세 재조회 실패:', error); }
  };

  const handleBack = () => { setSelectedItem(null); setDetail(null); };

  const handleQuickAction = async (actionType) => {
    if (!window.electronAPI) return;
    const map = {
      property: { tabId: 'properties', title: '물건관리', route: '/properties' },
      customer: { tabId: 'customers', title: '고객관리', route: '/customers' },
      contract: { tabId: 'contracts', title: '계약관리', route: '/contracts' },
      schedule: { tabId: 'schedule', title: '일정관리', route: '/schedule' },
    };
    try { await window.electronAPI.openTabInWindow(map[actionType]); }
    catch (error) { console.error('Failed to open window:', error); toast.error('창 열기에 실패했습니다.'); }
  };

  // 배지 색상
  const badgeStyle = (type) => {
    const m = { 물건: ['#dbeafe', '#1d4ed8'], 고객: ['#dcfce7', '#15803d'], 계약: ['#fef3c7', '#b45309'], 가계약: ['#ffe4e6', '#be123c'] };
    const [bg, fg] = m[type] || ['#e5e7eb', '#374151'];
    return { background: bg, color: fg, fontSize: 13, fontWeight: 800, padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' };
  };

  // 일정 카테고리 색
  const schedColor = (cat) => {
    if (['계약일', '중도금일', '잔금일', '만기일', '거래신고기한'].includes(cat)) return '#7c3aed';
    if (['전화드리기', '임장', '내방', '미팅'].includes(cat)) return '#0891b2';
    return '#2563eb';
  };

  const labelStyle = { fontSize: 13, fontWeight: 700, color: '#64748b' };
  const valueStyle = { fontSize: 15, fontWeight: 700, color: '#1f2937' };

  // 일정 섹션 (공통)
  const renderSchedules = (schedules) => (
    <div style={{ border: '1px solid #bfdbfe', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe' }}>
        <Calendar size={15} color="#2563eb" />
        <span style={{ fontSize: 15, fontWeight: 800, color: '#1e3a8a' }}>일정</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>{(schedules || []).length}건</span>
      </div>
      {(!schedules || schedules.length === 0) ? (
        <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#475569' }}>연동된 일정이 없습니다</div>
      ) : (
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {schedules.map((s, idx) => (
            <div key={s.scheduleId ?? idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', borderBottom: idx === schedules.length - 1 ? 'none' : '1px solid #eff6ff' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: schedColor(s.category), minWidth: 62 }}>{s.category || '일정'}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#334155', minWidth: 92 }}>{fmtDateTime(s.startAt)}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', flex: 1 }}>
                {s.title || '-'}{s.content ? ` · ${s.content}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      {/* 착신 배너 */}
      {callInfo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#fef2f2', borderBottom: '1px solid #fecaca', animation: 'neobotCallBlink 0.9s ease-in-out infinite' }}>
          <Phone size={17} color="#dc2626" />
          <span style={{ fontSize: 15, fontWeight: 800, color: '#dc2626' }}>전화왔어요</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>{formatPhone(callInfo.number)}</span>
          <style>{`@keyframes neobotCallBlink {0%,100%{opacity:1;}50%{opacity:0.4;}}`}</style>
        </div>
      )}
      {/* 검색창 */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); handleSearch(e.target.value); }}
            placeholder="고객·물건·계약 통합 검색 (이름/소재지/의뢰인)"
            style={{ width: '100%', paddingLeft: 34, paddingRight: 12, height: 38, fontSize: 14, fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none' }}
          />
        </div>
      </div>

      {/* 상담이력 입력창 — 물건등록폼 우측 상담이력 UI 동일.
          전화번호 기준 단독 저장 → 백엔드에서 매칭 고객(구입자)/물건(소유자·임차인) 상담이력에도 동시 저장 */}
      <div style={{ padding: '6px 6px 0' }}>
        <NeobotConsultationEditor
          user={user}
          consultations={consultResults}
          contacts={[]}
          defaultDatetime={callInfo?.at || null}
          defaultPhone={callInfo ? formatPhone(callInfo.number) : ''}
          highlight={!!callInfo}
        />
      </div>

      {/* 본문 (검색 결과) */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isSearching ? (
          <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 14, fontWeight: 600, color: '#475569' }}>검색 중...</div>
        ) : !searchQuery ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', color: '#94a3b8' }}>
            <Search size={44} style={{ opacity: 0.5, marginBottom: 8 }} />
            <p style={{ fontSize: 14, fontWeight: 700 }}>검색어를 입력하세요</p>
            <p style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>고객·물건·계약을 한 번에 검색합니다</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', color: '#94a3b8' }}>
            <Search size={44} style={{ opacity: 0.5, marginBottom: 8 }} />
            <p style={{ fontSize: 14, fontWeight: 700 }}>검색 결과가 없습니다</p>
          </div>
        ) : (
          // 결과 리스트 (3줄: 제목 / 거래·지역 / 소유자·임차인·구입자)
          <div>
            {searchResults.map((result, index) => {
              const line3 = personsLine(result);
              return (
                <div key={index} onClick={() => handleResultClick(result)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}>
                  <span style={{ ...badgeStyle(result.type), marginTop: 1 }}>{result.type}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* 첫째 줄: 제목(유형·소재지) */}
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {highlightText(result.title, searchQuery)}
                    </div>
                    {/* 둘째 줄: 거래구분(물건) · 지역(고객) */}
                    {result.sub ? (
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {highlightText(result.sub, searchQuery)}
                      </div>
                    ) : null}
                    {/* 셋째 줄: 소유자/임차인(물건) · 구입자(고객) */}
                    {line3 ? (
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f766e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {highlightText(line3, searchQuery)}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── 물건 상세 ──
const PropertyDetail = ({ d, won, labelStyle, valueStyle }) => {
  const s = d.summary || {};
  // 소유자/임차인 N행 — 저장일(regDate) 최신순 정렬
  const owners = (d.holders || []).filter((h) => h.holderType === 'OWNER').sort((a, b) => byRegDesc(a.holderRegDate, b.holderRegDate));
  const tenants = (d.holders || []).filter((h) => h.holderType === 'BUYER').sort((a, b) => byRegDesc(a.holderRegDate, b.holderRegDate));
  const areaTxt = s.excArea ? `${s.excArea}㎡` : (s.supArea ? `${s.supArea}㎡` : '-');
  const status = s.currentStatus || s.ptSts || '-';
  const tradeTxt = saleDivLabel(s.saleDiv, ' · '); // 매매(생각)/매매(보류)/매매(예정)/전세 …

  const HolderRow = ({ h }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
      <span style={{ fontSize: 13, fontWeight: 800, padding: '1px 7px', borderRadius: 5, background: h.isPast ? '#fee2e2' : '#dcfce7', color: h.isPast ? '#b91c1c' : '#15803d' }}>
        {h.isPast ? '과거' : '현재'}
      </span>
      <span style={{ fontSize: 15, fontWeight: 800, color: '#1f2937' }}>{h.holderName || '-'}</span>
      {h.holderPhone && <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{h.holderPhone}</span>}
      {h.holderRelation && <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{h.holderRelation}</span>}
      {h.holderRegDate && <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>{ymd(h.holderRegDate)}</span>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 요약 */}
      <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
          <MapPin size={16} color="#64748b" style={{ marginTop: 2 }} />
          <div>
            <div style={labelStyle}>소재지</div>
            <div style={{ ...valueStyle, fontSize: 16, fontWeight: 800 }}>{s.addr || s.ptName || '-'}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>{getPropertyTypeLabel(s.ptType) || s.ptType || ''}{s.ptName ? ` · ${s.ptName}` : ''}</div>
          </div>
        </div>
        {/* 거래구분 — 매매(생각/보류/예정)·전세·월세 등 (중요) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
          <span style={labelStyle}>거래구분</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: tradeTxt === '-' ? '#94a3b8' : '#dc2626' }}>{tradeTxt}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
          <div><div style={labelStyle}>면적</div><div style={valueStyle}>{areaTxt}</div></div>
          <div><div style={labelStyle}>층</div><div style={valueStyle}>{s.floor ? `${s.floor}층` : '-'}</div></div>
          <div><div style={labelStyle}>방향</div><div style={valueStyle}>{s.dirStd || '-'}</div></div>
          <div><div style={labelStyle}>현상태</div><div style={valueStyle}>{status}</div></div>
        </div>
        {/* 금액조건 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, paddingTop: 8, marginTop: 8, borderTop: '1px solid #e5e7eb' }}>
          <div><div style={labelStyle}>매매</div><div style={{ ...valueStyle, color: '#16a34a', fontWeight: 800 }}>{won(s.saleAmt)}</div></div>
          <div><div style={labelStyle}>전세</div><div style={{ ...valueStyle, color: '#2563eb', fontWeight: 800 }}>{won(s.lesAmt)}</div></div>
          <div><div style={labelStyle}>월세</div><div style={{ ...valueStyle, color: '#7c3aed', fontWeight: 800 }}>{s.monAmt ? `${won(s.protAmt)}/${won(s.monAmt)}` : '-'}</div></div>
        </div>
      </div>

      {/* 소유자/임차인 */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>소유자</div>
        {owners.length ? owners.map((h, i) => <HolderRow key={i} h={h} />) : <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>등록된 소유자가 없습니다</div>}
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '10px 0 4px' }}>임차인</div>
        {tenants.length ? tenants.map((h, i) => <HolderRow key={i} h={h} />) : <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>등록된 임차인이 없습니다</div>}
      </div>
    </div>
  );
};

// ── 고객 상세 ──
const CustomerDetail = ({ d, labelStyle, valueStyle }) => {
  const s = d.summary || {};
  const areaLine = (a) => [a.addr1, a.addr2, a.addr3].filter(Boolean).join(' ') + (a.bldNm ? ` ${a.bldNm}` : '');
  const buyers = (d.buyers || []).slice().sort((a, b) => byRegDesc(a.regDt, b.regDt)); // 구입자 N행 최신순
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <User size={16} color="#64748b" />
          <div style={{ ...valueStyle, fontSize: 17, fontWeight: 800 }}>{s.name || '-'}</div>
          {s.tel && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 14, fontWeight: 700, color: '#334155' }}><Phone size={13} />{s.tel}</span>}
        </div>
        <div style={{ paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
          <div style={labelStyle}>구입희망 유형</div>
          <div style={{ ...valueStyle, color: '#2563eb', fontWeight: 800 }}>{getPropertyTypeLabel(s.wantType) || s.wantType || '-'}{s.wantNm ? ` · ${s.wantNm}` : ''}</div>
        </div>
        {(s.featureNote || s.memo) && (
          <div style={{ paddingTop: 8, marginTop: 8, borderTop: '1px solid #e5e7eb' }}>
            <div style={labelStyle}>메모</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', whiteSpace: 'pre-wrap' }}>{s.featureNote || s.memo}</div>
          </div>
        )}
      </div>

      {/* 구입자 (N행, 저장일 최신순) */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>구입자 <span style={{ fontSize: 13, color: '#2563eb', fontWeight: 700 }}>{buyers.length}명</span></div>
        {buyers.length === 0 ? (
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>등록된 구입자가 없습니다</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {buyers.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#1f2937' }}>{b.name || '-'}</span>
                {b.relation && <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{b.relation}</span>}
                {b.tel && <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{b.tel}</span>}
                {b.regDt && <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>{ymd(b.regDt)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 구입희망물건(소재지 목록) */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>구입희망물건 <span style={{ fontSize: 13, color: '#2563eb', fontWeight: 700 }}>{(d.wishAreas || []).length}곳</span></div>
        {(d.wishAreas || []).length === 0 ? (
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>등록된 희망지역이 없습니다</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {d.wishAreas.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={13} color="#94a3b8" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1f2937' }}>{areaLine(a) || '-'}</span>
                {a.tradeStatus && <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{a.tradeStatus}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── 계약 상세 ──
const ContractDetail = ({ d, won, fmtDate, tradeLabel, labelStyle, valueStyle }) => (
  <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: 12 }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
      <FileText size={16} color="#b45309" style={{ marginTop: 2 }} />
      <div>
        <div style={labelStyle}>소재지</div>
        <div style={{ ...valueStyle, fontSize: 16, fontWeight: 800 }}>{d.addr || '-'}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#b45309' }}>{[d.contractKind, d.docType].filter(Boolean).join(' · ') || ''}</div>
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 8, borderTop: '1px solid #fde68a' }}>
      <div><div style={labelStyle}>거래유형</div><div style={valueStyle}>{tradeLabel(d.tradeType) || '-'}</div></div>
      <div><div style={labelStyle}>거래금액</div><div style={{ ...valueStyle, color: '#16a34a', fontWeight: 800 }}>{won(d.amount)}</div></div>
      <div><div style={labelStyle}>취득의뢰인</div><div style={valueStyle}>{d.buyer || '-'}</div></div>
      <div><div style={labelStyle}>이전의뢰인</div><div style={valueStyle}>{d.seller || '-'}</div></div>
      <div><div style={labelStyle}>계약일</div><div style={valueStyle}>{fmtDate(d.contractDate)}</div></div>
      <div><div style={labelStyle}>상태</div><div style={valueStyle}>{d.status || '-'}</div></div>
    </div>
    {d.reportDoneDate && (
      <div style={{ paddingTop: 8, marginTop: 8, borderTop: '1px solid #fde68a' }}>
        <div style={labelStyle}>거래신고 완료일</div>
        <div style={valueStyle}>{fmtDate(d.reportDoneDate)}</div>
      </div>
    )}
  </div>
);

export default NeobotPage;
