import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import ExpiryListTable from '../../components/expiry/ExpiryListTable';
import DateInput from '../../components/ui/DateInput';
import ScheduleModal from '../../components/modals/ScheduleModal';
import { getExpiryList } from '../../services/expiryService';
import { PROPERTY_TYPE_FILTER_BUTTONS, getPropertyTypeLabel } from '../../constants/propertyTypes';
import { useAuthStore } from '../../stores/authStore';

// 날짜 헬퍼 (YYYY-MM-DD)
const p2 = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const todayStr = () => fmt(new Date());
const addMonthsStr = (n) => { const d = new Date(); d.setMonth(d.getMonth() + n); return fmt(d); };

// 거래유형(SALEDIV) → 라벨
const SALE_DIV_LABEL = { SALEDIV01: '매매', SALEDIV02: '전세', SALEDIV03: '월세', SALEDIV04: '기타임대' };
const won = (v) => (v || v === 0 ? Number(v).toLocaleString() : '');
// 물건명 — 등록폼 물건명과 동일: 단지형(아파트 계열)=단지명(addr4), 그 외=건물명/기타(addr5), 없으면 ptName
const APT_ROW_CODES = ['SYCA101', 'SYCA102', 'SYCA103', 'SYCA104', 'SYCA105', 'SYCA106', 'SYCA107', 'SYCA120'];
const isAptRow = (r) => APT_ROW_CODES.includes(r.ptType) || !!r.danjiCode;
const danjiText = (r) => (isAptRow(r) ? r.addr4 : r.addr5) || r.ptName || '-';
// 상세주소 — 토지는 지번, 그 외는 동/호 (소재지/지역 미포함)
const detailAddrText = (r) => {
  if (r.ptType === 'SYCA115') return r.jibun || '-'; // 토지
  const dh = [r.dong ? `${r.dong}동` : '', r.ho ? `${r.ho}호` : ''].filter(Boolean).join(' ');
  return dh || r.jibun || '-';
};
// 거래유형 — 현상태(전세/월세/기타임대) 단일 표기
const tradeText = (r) => r.currentStatus || '-';
// 거래금액 — 현상태(거래유형)에 해당하는 금액만 단일 표기
const amountText = (r) => {
  const st = r.currentStatus;
  if (st === '전세') return r.lesAmt ? `전세 ${won(r.lesAmt)}` : '-';
  if (st === '월세') return (r.protAmt || r.monAmt) ? `월세 ${won(r.protAmt)}/${won(r.monAmt)}` : '-';
  if (st === '기타임대') return (r.etcAmt || r.etcAmt2) ? `기타임대 ${won(r.etcAmt)}/${won(r.etcAmt2)}` : '-';
  return '-';
};
const areaText = (r) => {
  if (r.aptTyp) return r.aptTyp;
  if (r.supArea || r.excArea) return `${r.supArea ?? '-'}/${r.excArea ?? '-'}㎡`;
  return '-';
};
const sourceText = (r) => (r.source === '계약' || r.source === 'CONTRACT' || r.source === '계약관리' ? '계약관리' : '물건관리');

const ExpiryPage = () => {
  const { user } = useAuthStore();
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPtType, setSelectedPtType] = useState(''); // '' = 모든유형, else CSV(SYCA...) — 물건관리 기준
  const [frDate, setFrDate] = useState(todayStr());
  const [toDate, setToDate] = useState(addMonthsStr(3));
  const [activeMonth, setActiveMonth] = useState(3); // 1~6개월 퀵버튼 활성표시
  const [selectedPtNos, setSelectedPtNos] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rowCount, setRowCount] = useState('50');
  const pageSize = rowCount === 'all' ? 9999 : parseInt(rowCount, 10);
  const [colorFillRequest, setColorFillRequest] = useState(null);
  const [showSms, setShowSms] = useState(false);
  const [smsTargets, setSmsTargets] = useState([]); // [{name, phone}]
  const [smsMsg, setSmsMsg] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState(null);

  useEffect(() => { document.title = '네오시스 - 만기관리'; }, []);

  useEffect(() => { fetchRows(); /* eslint-disable-next-line */ }, [selectedPtType, frDate, toDate, currentPage, rowCount]);

  const fetchRows = async () => {
    setIsLoading(true);
    try {
      const res = await getExpiryList({
        ptTypes: selectedPtType || null,
        frDate: frDate || null,
        toDate: toDate || null,
        user,
        page: currentPage,
        pageSize,
      });
      setRows(res.items || []);
      setTotalPages(Math.max(1, Math.ceil((res.totalCount || 0) / pageSize)));
    } catch (e) {
      console.error('만기관리 조회 실패:', e);
      toast.error('만기관리 조회에 실패했습니다.');
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 기간 퀵버튼 (오늘 ~ +N개월)
  const applyMonths = (n) => {
    setActiveMonth(n);
    setFrDate(todayStr());
    setToDate(addMonthsStr(n));
    setCurrentPage(1);
  };

  const handleSelectPtType = (v) => { setSelectedPtType(v); setCurrentPage(1); };

  // 일정 주소/내용용 상세주소 조합 (동·호수 또는 지번 + 유형)
  const detailLoc = (row) => {
    if (!row) return '';
    const detail = (row.dong || row.ho)
      ? [row.dong ? `${row.dong}동` : '', row.ho ? `${row.ho}호` : ''].filter(Boolean).join(' ')
      : (row.jibun || '');
    return [row.addr || row.ptName || '', detail].filter(Boolean).join(' ').trim();
  };
  const scheduleContent = (row) => {
    if (!row) return '';
    const type = getPropertyTypeLabel(row.ptType) || row.ptType || '';
    return `[만기] ${type ? type + ' ' : ''}${detailLoc(row)}`.trim();
  };

  // 행 선택(체크) / 더블클릭(수정폼)
  const handleRowSelect = (row) => {
    setSelectedPtNos((prev) => (prev.includes(row.ptNo) ? prev.filter((n) => n !== row.ptNo) : [...prev, row.ptNo]));
  };
  const handleRowClick = async (row) => {
    // 물건관리 더블클릭과 동일 — 물건 수정폼(V2) 새창
    if (window.electronAPI?.modal) {
      try {
        await window.electronAPI.modal.open({
          type: 'property-form-v2',
          data: { title: `물건 수정 - ${row.ptName || row.addr || '물건정보'}`, ptNo: row.ptNo },
          width: 1580, height: 900, minWidth: 1580, minHeight: 900, resizable: true,
        });
      } catch (e) { console.error('물건 수정창 열기 실패:', e); toast.error('수정 창을 열 수 없습니다.'); }
    } else {
      toast.error('데스크톱 앱에서만 수정할 수 있습니다.');
    }
  };

  const handleColorFill = (color) => {
    if (selectedPtNos.length === 0) { toast.error('색을 채울 행을 선택하세요.'); return; }
    setColorFillRequest({ seq: Date.now(), ids: [...selectedPtNos], color });
  };

  // 문자보내기 — 선택 행의 소유자·임차인 연락처 수집
  const handleSendSms = () => {
    if (selectedPtNos.length === 0) { toast.error('문자 보낼 행을 선택하세요.'); return; }
    const sel = rows.filter((r) => selectedPtNos.includes(r.ptNo));
    const targets = [];
    const seen = new Set();
    sel.forEach((r) => {
      [[r.ownerName, r.ownerPhone], [r.tenantName, r.tenantPhone]].forEach(([nm, ph]) => {
        const phone = (ph || '').trim();
        if (phone && !seen.has(phone)) { seen.add(phone); targets.push({ name: nm || '', phone }); }
      });
    });
    if (targets.length === 0) { toast.error('선택한 행에 연락처가 없습니다.'); return; }
    setSmsTargets(targets); setSmsMsg(''); setShowSms(true);
  };

  const doSendSms = async () => {
    if (!window.electronAPI?.phone?.sendSms) { toast.error('데스크톱 앱에서만 문자 전송이 가능합니다.'); return; }
    if (!smsMsg.trim()) { toast.error('문자 내용을 입력하세요.'); return; }
    setSmsSending(true);
    let ok = 0, fail = 0;
    for (const t of smsTargets) {
      try { const r = await window.electronAPI.phone.sendSms(t.phone, smsMsg.trim()); if (r?.success) ok++; else fail++; }
      catch { fail++; }
    }
    setSmsSending(false); setShowSms(false);
    toast.success(`문자 전송 완료 (성공 ${ok}${fail ? `, 실패 ${fail}` : ''})`);
  };

  // 일정등록 — 마지막 선택 행 기준
  const handleAddSchedule = () => {
    if (selectedPtNos.length === 0) { toast.error('일정 등록할 행을 선택하세요.'); return; }
    const last = selectedPtNos[selectedPtNos.length - 1];
    const row = rows.find((r) => r.ptNo === last);
    if (!row) { toast.error('선택 행을 찾을 수 없습니다.'); return; }
    setScheduleTarget(row); setShowSchedule(true);
  };

  const tableColumns = [
    { key: 'checkbox', label: '선택', width: 44, noRowClick: true },
    { key: 'expiryDate', label: '만기일자', width: 104 },
    { key: 'source', label: '출처', width: 88 },
    { key: 'ptType', label: '매물유형', width: 100 },
    { key: 'tradeType', label: '거래유형', width: 90 },
    { key: 'amount', label: '거래금액', width: 150 },
    { key: 'ptName', label: '물건명', width: 200 },
    { key: 'detailAddr', label: '상세주소', width: 220 },
    { key: 'area', label: '면적', width: 100 },
    { key: 'ownerName', label: '소유자', width: 84 },
    { key: 'ownerPhone', label: '소유자 연락처', width: 128 },
    { key: 'tenantName', label: '임차인', width: 84 },
    { key: 'tenantPhone', label: '임차인 연락처', width: 128 },
  ];

  const renderCell = (row, column) => {
    switch (column.key) {
      case 'checkbox':
        return (
          <input type="checkbox" checked={selectedPtNos.includes(row.ptNo)}
            onClick={(e) => e.stopPropagation()}
            onChange={() => handleRowSelect(row)} style={{ cursor: 'pointer' }} />
        );
      case 'expiryDate':
        return <span style={{ fontWeight: 800 }}>{row.expiryDate || '-'}</span>;
      case 'source': {
        const isContract = sourceText(row) === '계약관리';
        return <span style={{ fontWeight: 800, color: isContract ? '#b45309' : '#4f46e5' }}>{sourceText(row)}</span>;
      }
      case 'ptType':
        return <span>{getPropertyTypeLabel(row.ptType) || row.ptType || '-'}</span>;
      case 'tradeType':
        return <span>{tradeText(row)}</span>;
      case 'amount':
        return <span style={{ display: 'block', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={amountText(row)}>{amountText(row)}</span>;
      case 'ptName':
        return <span title={danjiText(row)} style={{ display: 'block', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{danjiText(row)}</span>;
      case 'detailAddr':
        return <span title={detailAddrText(row)} style={{ display: 'block', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detailAddrText(row)}</span>;
      case 'area':
        return <span>{areaText(row)}</span>;
      case 'ownerName': return <span>{row.ownerName || '-'}</span>;
      case 'ownerPhone': return <span>{row.ownerPhone || '-'}</span>;
      case 'tenantName': return <span>{row.tenantName || '-'}</span>;
      case 'tenantPhone': return <span>{row.tenantPhone || '-'}</span>;
      default: return row[column.key] || '-';
    }
  };

  const tableData = rows.map((r) => ({ ...r, id: r.ptNo }));

  const monthBtn = (n) => (
    <button key={n} onClick={() => applyMonths(n)}
      style={{ padding: '5px 12px', fontSize: '14px', fontWeight: 700, border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: activeMonth === n ? '#4f46e5' : 'white', color: activeMonth === n ? 'white' : '#000', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {n}개월
    </button>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f9fafb' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* 상단 필터 (카드형 X · 다른 메뉴처럼 평면) */}
        <div className="exp-filter">
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* 물건유형 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
              {[{ label: '전체', value: '' }, ...PROPERTY_TYPE_FILTER_BUTTONS].map((t) => (
                <button key={t.label} onClick={() => handleSelectPtType(t.value)}
                  style={{ padding: '5px 12px', fontSize: '14px', fontWeight: 700, border: '1px solid #d1d5db', borderRadius: '6px', background: selectedPtType === t.value ? '#4f46e5' : 'white', color: selectedPtType === t.value ? 'white' : '#000', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {t.label}
                </button>
              ))}
            </div>
            {/* 기간검색 + 1~6개월 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>만기일 검색</span>
              <DateInput value={frDate} onChange={(v) => { setFrDate(v); setActiveMonth(0); setCurrentPage(1); }} style={{ width: '120px', padding: '5px 6px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>~</span>
              <DateInput value={toDate} onChange={(v) => { setToDate(v); setActiveMonth(0); setCurrentPage(1); }} style={{ width: '120px', padding: '5px 6px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', marginRight: '2px' }}>만기 전</span>
                {[1, 2, 3, 4, 5, 6].map((n) => monthBtn(n))}
              </div>
            </div>
          </div>
        </div>

        {/* 목록 (카드/그림자/라운드 X) */}
        <div className="exp-table-wrap">
          <ExpiryListTable
            menuId="expiry"
            allColumns={tableColumns}
            defaultColumns={tableColumns}
            data={tableData}
            isLoading={isLoading}
            renderCell={renderCell}
            onRowClick={handleRowClick}
            onRowSelect={handleRowSelect}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            emptyMessage="해당 기간에 만기 물건이 없습니다"
            selectedCount={selectedPtNos.length}
            onSendSms={handleSendSms}
            onAddSchedule={handleAddSchedule}
            onColorFill={handleColorFill}
            colorFillRequest={colorFillRequest}
            fluidWidth
            rightLeadContent={
              <>
                <span style={{ fontSize: '14px', color: '#000', fontWeight: 600, whiteSpace: 'nowrap' }}>줄수</span>
                <select value={rowCount} onChange={(e) => { setRowCount(e.target.value); setCurrentPage(1); }}
                  style={{ padding: '4px 8px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', color: '#000' }}>
                  <option value="all">전부</option>
                  <option value="30">30줄</option>
                  <option value="50">50줄</option>
                  <option value="100">100줄</option>
                </select>
              </>
            }
          />
        </div>
      </div>

      <style>{`
        .exp-filter { flex-shrink: 0; padding: 8px 8px 4px; background: #f9fafb; }
        .exp-table-wrap { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; padding: 0 8px 8px; }
        .exp-table-wrap .prop-list-grid td, .exp-table-wrap .prop-list-grid td div, .exp-table-wrap .prop-list-grid td span { font-size: 14px !important; }
        .exp-table-wrap .prop-list-grid thead th { height: 50px !important; max-height: 50px !important; }
        .exp-table-wrap td, .exp-table-wrap .prop-list-grid td { padding-top: 6px !important; padding-bottom: 6px !important; text-align: center !important; vertical-align: middle !important; }
        .exp-table-wrap td > * { text-align: center !important; margin-left: auto !important; margin-right: auto !important; }
        .exp-table-wrap tbody tr:nth-of-type(2n) td { border-bottom: 1px solid #94a3b8 !important; }
      `}</style>

      {/* 문자보내기 모달 */}
      {showSms && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => !smsSending && setShowSms(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxHeight: '80vh', background: 'white', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', fontSize: 16, fontWeight: 800, color: '#1e3a8a' }}>문자보내기 <span style={{ fontSize: 14, color: '#2563eb' }}>{smsTargets.length}명</span></div>
            <div style={{ padding: 16, overflowY: 'auto' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>수신 대상</div>
              <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 8px', marginBottom: 12 }}>
                {smsTargets.map((t, i) => (
                  <div key={i} style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', padding: '2px 0' }}>{t.name ? `${t.name} ` : ''}{t.phone}</div>
                ))}
              </div>
              <textarea value={smsMsg} onChange={(e) => setSmsMsg(e.target.value)} rows={5} placeholder="문자 내용을 입력하세요"
                style={{ width: '100%', fontSize: 14, fontWeight: 600, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '0 16px 16px' }}>
              <button onClick={() => setShowSms(false)} disabled={smsSending}
                style={{ padding: '8px 16px', fontSize: 14, fontWeight: 700, border: '1px solid #cbd5e1', borderRadius: 6, background: 'white', color: '#334155', cursor: 'pointer' }}>취소</button>
              <button onClick={doSendSms} disabled={smsSending}
                style={{ padding: '8px 18px', fontSize: 14, fontWeight: 700, border: 'none', borderRadius: 6, background: smsSending ? '#93c5fd' : '#2563eb', color: 'white', cursor: 'pointer' }}>{smsSending ? '전송 중…' : '전송'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 일정등록 */}
      {showSchedule && scheduleTarget && (
        <ScheduleModal
          isOpen={showSchedule}
          onClose={() => { setShowSchedule(false); setScheduleTarget(null); }}
          onSuccess={() => { setShowSchedule(false); setScheduleTarget(null); toast.success('일정이 등록되었습니다.'); }}
          linkPtNo={scheduleTarget.ptNo}
          defaultLocation={detailLoc(scheduleTarget)}
          defaultTitle="만기일"
          defaultDate={scheduleTarget.expiryDate || ''}
          defaultContent={scheduleContent(scheduleTarget)}
        />
      )}
    </div>
  );
};

export default ExpiryPage;
