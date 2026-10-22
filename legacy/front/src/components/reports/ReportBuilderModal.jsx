import React, { useState, useEffect, useRef } from 'react';
import { X, FileImage, FileText, Save, Search, Trash2, Users, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { propertyService } from '../../services/propertyService';
import { customerService } from '../../services/customerService';
import { reportService } from '../../services/reportService';
import { officeService } from '../../services/officeService';
import { getPropertyTypeLabel } from '../../constants/propertyTypes';
import ConfirmDialog from '../ui/ConfirmDialog';

/**
 * 보고서(매물 브리핑) 작성 모달
 * - 단일 매물: 상세 표 형식 보고서
 * - 여러 매물: 매물 중요정보만 표(요약)로 정리
 * - 보고서 본문은 HTML로 저장(report.content_html), 물건 원본은 snapshot(JSON)으로 저장
 */
const SALE_DIV = { SALEDIV01: '매매', SALEDIV02: '전세', SALEDIV03: '월세', SALEDIV04: '기타임대' };
const APT_TYPES = ['SYCA101', 'SYCA102', 'SYCA103', 'SYCA105', 'SYCA106', 'SYCA107'];

// 공동주택이면 단지명, 아니면 건물명 + " 매물 브리핑"
const baseTitleFrom = (pp) => {
  if (!pp) return '매물 브리핑';
  const isApt = APT_TYPES.includes(pp.ptType);
  const nm = isApt ? (pp.addr4 || pp.danjiName || pp.ptName) : (pp.addr5 || pp.buildingName || pp.ptName);
  return `${(nm || '').trim()} 매물 브리핑`.trim();
};

// ===== 포맷/HTML 유틸 =====
const esc = (v) => (v == null ? '' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
const typeLabel = (p) => getPropertyTypeLabel?.(p?.ptType) || p?.ptType || '-';
const saleLabel = (p) => SALE_DIV[p?.saleDiv] || p?.saleDiv || '-';
const addrOf = (p) => [p?.addr1, p?.addr2, p?.addr3, p?.addr4, p?.addr5].filter(Boolean).join(' ') || '-';
const dongHo = (p) => [p?.dong && `${p.dong}동`, p?.ho && `${p.ho}호`].filter(Boolean).join(' ') || '-';
const won = (v) => (v || v === 0 ? Number(v).toLocaleString() : '');
// 공동중개망용: 동 + 공개층(고/중/저 또는 해당층). 호수는 표기하지 않음
const dongFloor = (p) => {
  const dong = p?.dong ? `${p.dong}동` : '';
  const fd = p?.floorDesc || p?.pFloorDesc || '';
  const floor = fd === '해당층' ? (p?.floor1 ? `${p.floor1}층` : '') : (fd ? `${fd}층` : '');
  return [dong, floor].filter(Boolean).join(' ') || '-';
};
// 중개사용 메모(공동중개망): 사무소 상호 / 대표자명 / 연락처
const officeMemoText = (o) => {
  if (!o) return '';
  return [o.officeName, o.repName, o.tel].filter(Boolean).join(' / ');
};
// 금액 요약(만원): 거래유형별로 있는 것만
const amtSummary = (p) => {
  const parts = [];
  if (p?.saleAmt) parts.push(`매매 ${won(p.saleAmt)}`);
  if (p?.lesAmt) parts.push(`전세 ${won(p.lesAmt)}`);
  if (p?.monAmt || p?.protAmt) parts.push(`월세 ${won(p?.protAmt || 0)}/${won(p?.monAmt || 0)}`);
  if (p?.etcAmt || p?.etcAmt2) parts.push(`기타 ${won(p?.etcAmt || 0)}/${won(p?.etcAmt2 || 0)}`);
  return parts.join(', ') || '-';
};
// 거래구분+금액 행 매핑(등록된 유형만) — 물건목록과 동일. 여러개면 각 줄, 금액은 해당 줄 우측.
const tradeRows = (p) => {
  const set = new Set(String(p?.saleDiv || '').split(',').map((s) => s.trim()).filter(Boolean));
  const ORDER = [
    { code: 'SALEDIV01', label: '매매', amt: () => (p?.saleAmt ? won(p.saleAmt) : '-') },
    { code: 'SALEDIV02', label: '전세', amt: () => (p?.lesAmt ? won(p.lesAmt) : '-') },
    { code: 'SALEDIV03', label: '월세', amt: () => ((p?.protAmt || p?.monAmt) ? `${won(p?.protAmt || 0)}/${won(p?.monAmt || 0)}` : '-') },
    { code: 'SALEDIV04', label: '기타임대', amt: () => ((p?.etcAmt || p?.etcAmt2) ? `${won(p?.etcAmt || 0)}/${won(p?.etcAmt2 || 0)}` : '-') },
  ];
  const rows = ORDER.filter((r) => set.has(r.code)).map((r) => ({ label: r.label, amt: r.amt() }));
  return rows.length ? rows : [{ label: '-', amt: '-' }];
};

const ReportBuilderModal = ({ isOpen, onClose, property = null, properties = null, customer = null, reportNo = null, onSaved, mode = 'property', office = null }) => {
  const { user, office: authOffice } = useAuthStore();
  const reportRef = useRef(null);
  // 로그인 중개사무소 정보(별도 창에서는 authStore에 없어 재조회)
  const [offInfo, setOffInfo] = useState(office || authOffice || null);
  useEffect(() => {
    const base = office || authOffice;
    if (base) { setOffInfo(base); return; }
    if (!user?.userId) return;
    (async () => {
      try {
        const res = await officeService.getOfficeByUser(user.userId);
        if (res?.success && res?.data) setOffInfo(res.data);
      } catch { /* noop */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [office, authOffice, user?.userId, isOpen]);
  const isHub = mode === 'hub'; // 공동중개망: 주소에 호수 미표기, 동+고/중/저 표기 / 중개사메모=사무소정보

  const [propertyList, setPropertyList] = useState([]); // 보고서 대상 매물(1개 또는 여러 개)
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  // 복수 매물 표 헤더(편집 가능)
  const [multiHeaders, setMultiHeaders] = useState({
    type: '물건종류', name: '물건명', aptTyp: '타입', sale: '거래구분',
    amt: '금액(만원)', lease: '현임대조건', balance: '잔금예정일', memo: '메모',
  });
  const [editingReportNo, setEditingReportNo] = useState(null); // 기존 보고서 수정 모드
  const [reportVersion, setReportVersion] = useState('agent'); // 'agent'(중개사용) | 'customer'(고객용)
  const [history, setHistory] = useState([]); // 이 물건의 보고서 작성 이력
  const [confirmDeleteNo, setConfirmDeleteNo] = useState(null); // 삭제 확인 대상 report_no
  const [shareOpenNo, setShareOpenNo] = useState(null); // 공유이력 펼친 report_no
  const [shareList, setShareList] = useState([]); // 펼친 보고서의 공유 고객 목록

  // 검색
  const [ptKeyword, setPtKeyword] = useState('');
  const [ptResults, setPtResults] = useState([]);
  const [custKeyword, setCustKeyword] = useState('');
  const [custResults, setCustResults] = useState([]);
  const [saving, setSaving] = useState(false);
  const [propMemos, setPropMemos] = useState({}); // 매물별 메모 (다중 보고서 표 마지막 칼럼)
  const [showPtPicker, setShowPtPicker] = useState(false);   // 매물 선택 팝업
  const [showCustPicker, setShowCustPicker] = useState(false); // 고객 선택 팝업

  const isMulti = propertyList.length > 1;

  useEffect(() => {
    if (!isOpen) return;
    // 초기 매물 목록: properties(배열) 우선, 없으면 property(단일)
    const initList = Array.isArray(properties) && properties.length
      ? properties
      : (property ? [property] : []);
    setPropertyList(initList);
    setSelectedCustomers(customer ? [customer] : []);
    setTitle(initList.length > 1 ? `매물 브리핑 (${initList.length}건)` : baseTitleFrom(initList[0]));
    setComment('');
    setPropMemos({});
    setEditingReportNo(null);
    setPtKeyword(''); setPtResults([]);
    setCustKeyword(''); setCustResults([]);

    setReportVersion('agent');

    if (reportNo) {
      loadReport(reportNo);
    } else if (!isHub && initList.length === 1 && initList[0]?.ptNo) {
      // 단일 매물은 상세 정보로 보강 (공동중개망은 매핑된 객체 유지 — 사무소메모/동층 정보 보존)
      loadPropertyDetail(initList[0].ptNo);
    }
    // 보고서 이력 로드(이 물건 기준)
    const ptNoForHistory = initList[0]?.ptNo;
    if (ptNoForHistory) loadHistory(ptNoForHistory);
    else setHistory([]);
  }, [isOpen, property, properties, customer, reportNo]);

  // 이 물건의 보고서 작성 이력
  const loadHistory = async (ptNo) => {
    try {
      const res = await reportService.getByProperty(ptNo);
      setHistory(res?.data || []);
    } catch (e) { setHistory([]); }
  };

  // 보고서 삭제(확인 후)
  const doDeleteReport = async (rNo) => {
    try {
      await reportService.delete(rNo, user?.userId);
      toast.success('보고서가 삭제되었습니다.');
      if (editingReportNo === rNo) setEditingReportNo(null);
      const ptNo = propertyList[0]?.ptNo;
      if (ptNo) loadHistory(ptNo);
    } catch (e) {
      toast.error('보고서 삭제에 실패했습니다.');
    } finally {
      setConfirmDeleteNo(null);
    }
  };

  // 보고서별 공유이력(고객) 토글
  const toggleShare = async (rNo) => {
    if (shareOpenNo === rNo) { setShareOpenNo(null); setShareList([]); return; }
    setShareOpenNo(rNo);
    setShareList([]);
    try {
      const res = await reportService.getShares(rNo);
      setShareList(res?.data || []);
    } catch (e) { setShareList([]); }
  };

  // 미리보기 셀 직접 수정 → 대상 매물 필드 갱신(스냅샷에 그대로 저장됨)
  const patchProperty = (idx, key, value) => {
    setPropertyList((prev) => prev.map((p, i) => (i === idx ? { ...p, [key]: value } : p)));
  };

  // 기존 보고서 로드 (수정 모드)
  const loadReport = async (rNo) => {
    try {
      const res = await reportService.getDetail(rNo);
      const d = res?.data || {};
      setEditingReportNo(rNo);
      if (d.title) setTitle(d.title);
      if (d.comment != null) setComment(d.comment);
      const custs = d.customers || d.custList || d.reportCusts || [];
      if (Array.isArray(custs) && custs.length) {
        setSelectedCustomers(custs.map((c) => ({ custNo: c.custNo, name: c.name || c.custName || '' })));
      }
      // 스냅샷(당시 물건) 우선 — 단일 객체 또는 배열
      let snap = null;
      try { snap = d.snapshot ? JSON.parse(d.snapshot) : null; } catch (e) { snap = null; }
      if (Array.isArray(snap) && snap.length) {
        setPropertyList(snap);
        if (!d.title) setTitle(snap.length > 1 ? `매물 브리핑 (${snap.length}건)` : baseTitleFrom(snap[0]));
      } else if (snap && snap.ptNo) {
        setPropertyList([snap]);
        if (!d.title) setTitle(baseTitleFrom(snap));
      } else if (d.ptNo) {
        loadPropertyDetail(d.ptNo);
      }
    } catch (e) {
      console.error('보고서 로드 실패:', e);
      toast.error('보고서 정보를 불러오지 못했습니다.');
    }
  };

  // 이력 클릭 — 현재 화면을 교체하지 않고 새 창으로 해당 보고서를 연다(Electron). 웹 폴백은 현재 창에서 로드.
  const openReportWindow = async (rNo, rTitle) => {
    if (window.electronAPI?.modal) {
      try {
        await window.electronAPI.modal.open({
          type: 'report-builder',
          data: { title: rTitle || '보고서 편집', reportNo: rNo },
          width: 1400,
          height: 950,
        });
        return;
      } catch (err) { console.error('보고서 창 열기 실패:', err); }
    }
    loadReport(rNo);
  };

  const loadPropertyDetail = async (ptNo) => {
    try {
      const res = await propertyService.getDetail(ptNo);
      const d = res?.data?.data || res?.data;
      if (d && (d.ptNo || d.PtNo)) {
        // 상세조회 값으로 보강(목록 필드 유지 + 상세 필드 덮어쓰기)
        setPropertyList((prev) => { const base = (prev && prev[0]) ? prev[0] : {}; return [{ ...base, ...d }]; });
        setTitle((t) => (isAutoTitle(t) ? baseTitleFrom(d) : t));
      }
    } catch (e) { console.error('물건 상세 조회 실패(보고서):', e); }
  };

  // 제목이 기본(자동 생성) 형태면 매물 건수에 맞춰 갱신
  const isAutoTitle = (t) => !t || /^매물 브리핑( \(\d+건\))?$/.test(t) || /매물 브리핑$/.test(t);
  const syncAutoTitle = (list) => {
    setTitle((t) => {
      if (!isAutoTitle(t)) return t; // 사용자가 직접 수정한 제목은 유지
      return list.length > 1 ? `매물 브리핑 (${list.length}건)` : baseTitleFrom(list[0]);
    });
  };

  // 매물 검색 결과 토글(추가/제거)
  const togglePropertyList = (pp) => {
    const exists = propertyList.some((x) => x.ptNo === pp.ptNo);
    const next = exists ? propertyList.filter((x) => x.ptNo !== pp.ptNo) : [...propertyList, pp];
    setPropertyList(next);
    syncAutoTitle(next);
  };
  const removeProperty = (ptNo) => {
    const next = propertyList.filter((x) => x.ptNo !== ptNo);
    setPropertyList(next);
    syncAutoTitle(next);
  };

  const searchProperties = async () => {
    try {
      const res = await propertyService.getList(null, ptKeyword, 1, 20);
      setPtResults(res?.data?.ptSales || res?.data?.PtSales || []);
    } catch (e) { toast.error('매물 검색 실패'); }
  };

  const searchCustomers = async () => {
    try {
      const res = await customerService.getList(null, custKeyword, null, null, null, null, 1, 50);
      setCustResults(res?.data?.customers || res?.data?.Customers || []);
    } catch (e) { toast.error('고객 검색 실패'); }
  };

  const toggleCustomer = (c) => {
    setSelectedCustomers((prev) =>
      prev.some((x) => x.custNo === c.custNo) ? prev.filter((x) => x.custNo !== c.custNo) : [...prev, c]
    );
  };

  // ===== 보고서 본문 HTML 생성 =====
  const SECTION = (t) => `<div style="font-size:15px;font-weight:700;color:#fff;background:#1e293b;padding:8px 12px;border-left:4px solid #4f46e5;">${esc(t)}</div>`;
  const TH = 'width:30%;padding:10px 14px;background:#f8fafc;font-size:13px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;text-align:left;';
  const TD = 'padding:10px 14px;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;';
  const row = (label, value) => `<tr><td style="${TH}">${esc(label)}</td><td style="${TD}">${value}</td></tr>`;

  // 단일 매물 상세 HTML
  const buildSingleHtml = (p) => {
    const amt = (v) => (v || v === 0 ? `${won(v)} 만원` : '-');
    const box = (rows) => `<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;margin-bottom:18px;">${rows}</table>`;
    // 매물정보: 한 줄 2칸(라벨/값 2쌍), 주소만 전체 행
    const TH2 = 'width:15%;padding:9px 12px;background:#f8fafc;font-size:13px;font-weight:600;color:#475569;border:1px solid #e2e8f0;text-align:left;white-space:nowrap;';
    const TD2 = 'padding:9px 12px;font-size:13px;color:#1e293b;border:1px solid #e2e8f0;';
    const row2 = (l1, v1, l2, v2) => `<tr><td style="${TH2}">${esc(l1)}</td><td style="${TD2}">${v1}</td><td style="${TH2}">${esc(l2)}</td><td style="${TD2}">${v2}</td></tr>`;
    const rowFull = (l, v) => `<tr><td style="${TH2}">${esc(l)}</td><td style="${TD2}" colspan="3">${v}</td></tr>`;
    const V = (k, fb) => esc(p[k] != null && p[k] !== '' ? p[k] : (fb ?? '-'));
    const floorTxt = `${esc(p.floor1 ?? '-')} / ${esc(p.floor2 ?? '-')}`;
    const dirTxt = `${esc(p.dirStd ?? '-')}${p.dirBase ? ' / ' + esc(p.dirBase) : ''}`;
    const roomTxt = `${esc(p.roomCnt ?? '-')} / ${esc(p.bathCnt ?? '-')}`;
    const heatTxt = `${esc(p.heatMethod ?? '-')}${p.heatFuel ? ' / ' + esc(p.heatFuel) : ''}`;
    const rmd = p.rptRmdDate ? esc(p.rptRmdDate) : (p.rmdDate ? esc(String(p.rmdDate).split('T')[0]) : '-');
    return [
      SECTION('면적 / 금액'),
      box(
        row('공급/전용면적', `${p.rptArea != null ? esc(p.rptArea) : `${esc(p.supArea ?? '-')} / ${esc(p.excArea ?? '-')}`} ㎡`) +
        row('매매가', p.rptSaleAmt != null && p.rptSaleAmt !== '' ? `${esc(p.rptSaleAmt)} 만원` : amt(p.saleAmt)) +
        row('전세가', p.rptLesAmt != null && p.rptLesAmt !== '' ? `${esc(p.rptLesAmt)} 만원` : amt(p.lesAmt)) +
        row('월세(보증/월)', p.rptMonAmt != null && p.rptMonAmt !== '' ? esc(p.rptMonAmt) : `${amt(p.protAmt)} / ${amt(p.monAmt)}`)
      ),
      SECTION('매물정보'),
      box(
        row2('물건유형', V('rptType', typeLabel(p)), '현상태', V('rptStatus', p.currentStatus)) +
        rowFull('주소', V('rptAddr', addrOf(p))) +
        row2('세대수', V('rptHouseCnt', p.houseCnt), '주차대수', V('rptParkCnt', p.pkCnt)) +
        row2('잔금예정일', rmd, '해당층/총층', V('rptFloor', floorTxt)) +
        row2('준공일자', V('rptCompYear', p.compYear), '방향/기준', V('rptDir', dirTxt)) +
        row2('방수/욕실수', V('rptRoom', roomTxt), '난방방식/연료', V('rptHeat', heatTxt)) +
        row2('출입구조', V('rptEntr', p.entrStruct), '건물형태', V('rptBuildingForm', p.buildingForm))
      ),
      SECTION('코멘트 | 물건특징'),
      `<div style="border:1px solid #e2e8f0;padding:12px 14px;min-height:120px;font-size:13px;color:#1e293b;white-space:pre-wrap;line-height:1.6;margin-bottom:18px;">${esc(p.rptMemo != null && p.rptMemo !== '' ? p.rptMemo : (p.featureNote ?? p.ptExpl ?? ''))}</div>`,
    ].join('');
  };

  // 여러 매물 표(테이블만) — 페이지 분할용
  const multiTableHtml = (rows) => {
    const th = 'padding:8px 10px;border:1px solid #334155;font-size:12px;font-weight:600;color:#fff;';
    const td = 'padding:8px 10px;border:1px solid #e2e8f0;font-size:12px;color:#1e293b;text-align:center;vertical-align:middle;';
    const tdL = td + 'text-align:left;';
    const tdR = td + 'text-align:right;white-space:nowrap;';
    const nameOf = (p) => p.rptName ?? (p.ptName || p.addr4 || p.addr5 || '-');
    const aptTypOf = (p) => p.rptAptTyp ?? (p.aptTyp || '-');
    const leaseOf = (p) => p.rptLease ?? ((p.nowDepAmt || p.nowMonAmt) ? `${p.nowDepAmt ?? ''}/${p.nowMonAmt ?? ''}` : '-');
    const balanceOf = (p) => p.rptBalance ?? (p.exptDate ? String(p.exptDate).slice(0, 10).replace(/-/g, '.') : '-');
    const colgroup = `<colgroup><col style="width:11%"/><col style="width:17%"/><col style="width:7%"/><col style="width:8%"/><col style="width:13%"/><col style="width:12%"/><col style="width:10%"/><col style="width:22%"/></colgroup>`;
    const head = `<thead><tr style="background:#1e293b;">
      <th style="${th}">${esc(multiHeaders.type)}</th><th style="${th}">${esc(multiHeaders.name)}</th>
      <th style="${th}">${esc(multiHeaders.aptTyp)}</th><th style="${th}">${esc(multiHeaders.sale)}</th>
      <th style="${th}">${esc(multiHeaders.amt)}</th><th style="${th}">${esc(multiHeaders.lease)}</th>
      <th style="${th}">${esc(multiHeaders.balance)}</th><th style="${th}">${esc(multiHeaders.memo)}</th>
    </tr></thead>`;
    const body = rows.map((p) => {
      const tr = tradeRows(p);
      return `<tr>
      <td style="${td}">${esc(p.rptType ?? typeLabel(p))}</td>
      <td style="${td}">${esc(nameOf(p))}</td>
      <td style="${td}">${esc(aptTypOf(p))}</td>
      <td style="${td}">${tr.map((r) => esc(r.label)).join('<br/>')}</td>
      <td style="${tdR}">${tr.map((r) => esc(r.amt)).join('<br/>')}</td>
      <td style="${td}">${esc(leaseOf(p))}</td>
      <td style="${td}">${esc(balanceOf(p))}</td>
      <td style="${tdL}">${esc(propMemos[p.ptNo] || '')}</td>
    </tr>`;
    }).join('');
    return `<table style="width:100%;border-collapse:collapse;margin-bottom:18px;table-layout:fixed;">${colgroup}${head}<tbody>${body}</tbody></table>`;
  };

  // 저장/인쇄용 전체 HTML — 페이지 분할(단일=1p, 복수=행 8개/장) + 하단중앙 쪽번호
  const buildFullHtml = () => {
    const chargeName = user?.rtNm || user?.userName || user?.userId || '';
    const header = `<div style="border-bottom:3px solid #4f46e5;padding-bottom:10px;margin-bottom:14px;">
      <div style="font-size:13px;color:#64748b;">${esc(new Date().toLocaleDateString('ko-KR'))}</div>
      <div style="margin-top:6px;display:flex;align-items:flex-end;justify-content:space-between;gap:10px;">
        <div style="font-size:24px;font-weight:800;color:#1e293b;">${esc(title || '매물 브리핑')}</div>
        <div style="font-size:13px;font-weight:700;color:#475569;white-space:nowrap;">담당자: ${esc(chargeName)}</div>
      </div>
    </div>`;
    const commentHtml = comment
      ? SECTION('코멘트') + `<div style="border:1px solid #e2e8f0;border-top:none;padding:12px 14px;font-size:13px;color:#1e293b;white-space:pre-wrap;line-height:1.6;">${esc(comment)}</div>`
      : '';
    const off = offInfo;
    const offNm = off?.offNm || '';
    const offTel = off?.offTel || off?.rpsPhone || off?.offRpsPhone || '';
    // 부동산 정보 — 표 대신 한 줄(부동산명 + 부동산전화번호), 우측 하단
    const officeHtml = (off && (offNm || offTel)) ? `
      <div style="margin-top:auto;padding-top:16px;display:flex;justify-content:flex-end;">
        <div style="font-size:14px;font-weight:800;color:#1e293b;">${esc(offNm)}${offNm && offTel ? '&nbsp;&nbsp;' : ''}<span style="font-weight:600;color:#475569;">${esc(offTel)}</span></div>
      </div>` : '';
    const minH = isMulti ? '194mm' : '281mm';
    const pageWrap = (inner, n, total) => `<div style="position:relative;box-sizing:border-box;min-height:${minH};padding-bottom:8mm;display:flex;flex-direction:column;${n < total ? 'page-break-after:always;' : ''}">${inner}<div style="position:absolute;left:0;right:0;bottom:2mm;text-align:center;font-size:12px;color:#64748b;">- ${n} / ${total} -</div></div>`;
    const root = (inner) => `<div style="font-family:'Malgun Gothic',sans-serif;color:#1e293b;">${inner}</div>`;

    if (!propertyList.length) return root(pageWrap('<div style="color:#94a3b8;padding:20px;text-align:center;">매물을 선택하세요.</div>', 1, 1));
    if (!isMulti) return root(pageWrap(header + buildSingleHtml(propertyList[0]) + commentHtml + officeHtml, 1, 1));

    const ROWS = 7;
    const chunks = [];
    for (let i = 0; i < propertyList.length; i += ROWS) chunks.push(propertyList.slice(i, i + ROWS));
    const total = chunks.length;
    const pages = chunks.map((rows, pi) => {
      const first = pi === 0 ? header + SECTION(`매물 목록 (${propertyList.length}건)`) : '';
      const last = pi === total - 1 ? commentHtml + officeHtml : '';
      return pageWrap(first + multiTableHtml(rows) + last, pi + 1, total);
    }).join('');
    return root(pages);
  };

  // 인쇄 — 보고서 HTML을 새 창에 띄워 바로 인쇄(A4, 다중=가로)
  const handlePrint = () => {
    if (!propertyList.length) { toast.error('매물을 선택하세요.'); return; }
    const orient = isMulti ? 'landscape' : 'portrait';
    const w = window.open('', '_blank', 'width=1000,height=800');
    if (!w) { toast.error('팝업이 차단되었습니다. 팝업을 허용해 주세요.'); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title || '매물 브리핑')}</title>
      <style>@page{size:A4 ${orient};margin:8mm;} html,body{margin:0;} body{font-family:'Malgun Gothic',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}</style>
      </head><body>${buildFullHtml()}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch (e) { console.error(e); } }, 350);
  };

  const handleSaveImage = async () => {
    if (!reportRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const link = document.createElement('a');
      link.download = `${title || 'report'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error(e);
      toast.error('이미지 저장 실패 (html2canvas 설치 필요)');
    }
  };

  // 중개사용/고객용 2종을 한 PDF에 각 페이지로 저장 (현재 미리보기를 버전 전환하며 캡처)
  const handleSavePdf = async () => {
    if (!reportRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const orient = isMulti ? 'l' : 'p';
      const pageW = isMulti ? 297 : 210;
      const pageH = isMulti ? 210 : 297;
      const pdf = new jsPDF(orient, 'mm', 'a4');
      const prevVersion = reportVersion;
      const versions = ['agent', 'customer'];
      const wait = () => new Promise((r) => setTimeout(r, 150));
      let firstPage = true;
      for (let vi = 0; vi < versions.length; vi++) {
        setReportVersion(versions[vi]);
        await wait(); // 상태 반영 후 재렌더 대기
        // 각 A4 시트(.rpt-page)를 개별 캡처해 PDF 한 장씩 (쪽 단위 그대로)
        const pageEls = reportRef.current.querySelectorAll('.rpt-page');
        const sheets = pageEls.length ? Array.from(pageEls) : [reportRef.current];
        for (let si = 0; si < sheets.length; si++) {
          const canvas = await html2canvas(sheets[si], { scale: 2, backgroundColor: '#ffffff', useCORS: true });
          const img = canvas.toDataURL('image/png');
          if (!firstPage) pdf.addPage('a4', orient);
          firstPage = false;
          pdf.addImage(img, 'PNG', 0, 0, pageW, pageH); // 시트가 곧 A4 한 장
        }
      }
      setReportVersion(prevVersion);
      pdf.save(`${title || 'report'}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error('PDF 저장 실패 (jspdf 설치 필요)');
    }
  };

  const handleSaveReport = async () => {
    if (!propertyList.length) { toast.error('매물을 선택하세요.'); return; }
    setSaving(true);
    try {
      const res = await reportService.create({
        reportNo: editingReportNo || undefined, // 수정 모드면 기존 보고서번호(백엔드 upsert)
        ptNo: propertyList[0]?.ptNo,             // 대표(첫 번째) 물건번호
        title,
        comment,
        custNos: selectedCustomers.map((c) => c.custNo),
        snapshot: JSON.stringify(isMulti ? propertyList : propertyList[0]),
        contentHtml: buildFullHtml(),            // 보고서 본문 HTML
      }, user?.userId);
      toast.success(editingReportNo ? '보고서가 수정되었습니다.' : '보고서가 저장되었습니다.');
      onSaved && onSaved(res?.data);
      onClose();
    } catch (e) {
      toast.error('보고서 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#f1f5f9', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>보고서 작성 {isMulti && <span style={{ fontSize: '13px', color: '#4f46e5', fontWeight: 600 }}>· 매물 {propertyList.length}건</span>}</span>
            {/* 버전 전환 (중개사용 / 고객용) — 저장은 1건, 인쇄/미리보기는 2종 */}
            <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
              <button onClick={() => setReportVersion('agent')} style={{ padding: '5px 12px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', background: reportVersion === 'agent' ? '#4f46e5' : 'white', color: reportVersion === 'agent' ? 'white' : '#475569' }}>중개사용</button>
              <button onClick={() => setReportVersion('customer')} style={{ padding: '5px 12px', fontSize: '13px', fontWeight: 600, border: 'none', borderLeft: '1px solid #cbd5e1', cursor: 'pointer', background: reportVersion === 'customer' ? '#0891b2' : 'white', color: reportVersion === 'customer' ? 'white' : '#475569' }}>고객용</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handlePrint} style={btn('#0f766e')}><Printer size={15} /> 인쇄</button>
            <button onClick={handleSaveImage} style={btn('#0891b2')}><FileImage size={15} /> 이미지 저장</button>
            <button onClick={handleSavePdf} style={btn('#dc2626')}><FileText size={15} /> PDF 저장(2종)</button>
            <button onClick={handleSaveReport} disabled={saving} style={btn('#4f46e5')}><Save size={15} /> {saving ? '저장 중...' : '보고서 저장'}</button>
            <button onClick={onClose} style={btn('#64748b')}><X size={15} /> 닫기</button>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* 좌측: 컨트롤 */}
          <div style={{ width: '320px', background: 'white', borderRight: '1px solid #e2e8f0', overflow: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* 매물 선택(여러 개 가능) */}
            <div>
              <div style={sectionTitle}>매물 선택 ({propertyList.length})</div>
              {propertyList.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {propertyList.map((pp) => (
                    <span key={pp.ptNo} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: '11px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', color: '#065f46' }}>
                      {pp.ptName || `#${pp.ptNo}`}
                      <button onClick={() => removeProperty(pp.ptNo)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#059669' }}>✕</button>
                    </span>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => { setPtKeyword(''); setPtResults([]); setShowPtPicker(true); }}
                style={{ width: '100%', marginTop: '6px', padding: '7px 10px', fontSize: '13px', fontWeight: 700, border: '1px solid #6366f1', background: '#eef2ff', color: '#4f46e5', borderRadius: '6px', cursor: 'pointer' }}>＋ 매물 선택/추가</button>
            </div>

            {/* 고객(배포) 선택 */}
            <div>
              <div style={sectionTitle}>보고서 받을 고객 ({selectedCustomers.length})</div>
              {selectedCustomers.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {selectedCustomers.map((c) => (
                    <span key={c.custNo} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: '11px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '10px', color: '#3730a3' }}>
                      {c.name}<button onClick={() => toggleCustomer(c)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6366f1' }}>✕</button>
                    </span>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => { setCustKeyword(''); setCustResults([]); setShowCustPicker(true); }}
                style={{ width: '100%', marginTop: '6px', padding: '7px 10px', fontSize: '13px', fontWeight: 700, border: '1px solid #6366f1', background: '#eef2ff', color: '#4f46e5', borderRadius: '6px', cursor: 'pointer' }}>＋ 고객 선택</button>
            </div>

            {/* 코멘트 */}
            <div>
              <div style={sectionTitle}>코멘트</div>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} style={{ ...inputStyle, marginTop: '6px', resize: 'vertical' }} />
            </div>

            {/* 보고서 이력 — 어떤 매물로 언제 만들어졌는지 표시. 클릭=새 창으로 열기(현재 화면 유지) */}
            <div>
              <div style={sectionTitle}>보고서 이력 ({history.length}) · 클릭 시 새 창</div>
              <div style={{ marginTop: '6px', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', background: 'white' }}>
                <div style={{ height: '186px', overflowY: 'auto' }}>
                  {history.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#94a3b8', padding: '10px' }}>저장된 보고서가 없습니다.</div>
                  ) : (
                    history.map((h) => {
                      const ptNm = (h.title || '').replace(/\s*매물 브리핑.*$/, '').trim() || `물건 #${h.ptNo ?? '-'}`;
                      const madeAt = h.regDt ? String(h.regDt).replace('T', ' ').slice(0, 16) : '-';
                      return (
                      <div key={h.reportNo} style={{ borderBottom: '1px solid #f1f5f9', background: editingReportNo === h.reportNo ? '#eef2ff' : 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 8px' }}>
                          <div onClick={() => openReportWindow(h.reportNo, h.title)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} title="클릭하면 새 창으로 이 보고서를 엽니다">
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{editingReportNo === h.reportNo ? '✓ ' : ''}🏠 {ptNm}</div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginTop: '2px' }}>작성 {madeAt}</div>
                          </div>
                          <button type="button" onClick={() => toggleShare(h.reportNo)} title="공유이력" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: shareOpenNo === h.reportNo ? '#0891b2' : '#64748b', padding: '2px', display: 'inline-flex' }}><Users size={14} /></button>
                          <button type="button" onClick={() => setConfirmDeleteNo(h.reportNo)} title="삭제" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626', padding: '2px', display: 'inline-flex' }}><Trash2 size={14} /></button>
                        </div>
                        {/* 공유이력(고객) */}
                        {shareOpenNo === h.reportNo && (
                          <div style={{ padding: '4px 10px 8px', background: '#f8fafc', borderTop: '1px dashed #e2e8f0' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#475569', margin: '2px 0 4px' }}>공유한 고객 ({shareList.length})</div>
                            {shareList.length === 0 ? (
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>공유 이력이 없습니다.</div>
                            ) : (
                              shareList.map((s) => (
                                <div key={s.custNo} style={{ fontSize: '11px', color: '#334155', padding: '1px 0' }}>
                                  {s.name || s.custName || `#${s.custNo}`}{s.tel ? ` · ${s.tel}` : ''}{s.sharedDt ? ` · ${String(s.sharedDt).replace('T', ' ').slice(0, 16)}` : ''}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 우측: A4 미리보기 — 페이지 단위(단일=세로 / 복수=가로), 넘치면 다음 장, 하단중앙 쪽번호 */}
          <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px' }}>
            <div ref={reportRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px' }}>
              {(() => {
                const PW = isMulti ? '297mm' : '210mm';
                const PH = isMulti ? '210mm' : '297mm';
                const pad = isMulti ? '10mm 6mm' : '16mm 10mm';
                const pageStyle = { width: PW, height: PH, background: 'white', padding: pad, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'relative', overflow: 'hidden' };
                const PageNo = ({ n, total }) => (<div style={{ position: 'absolute', left: 0, right: 0, bottom: '5mm', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>- {n} / {total} -</div>);
                const chargeName = user?.rtNm || user?.userName || user?.userId || '';
                const titleBlock = (
                  <div style={{ borderBottom: '3px solid #4f46e5', paddingBottom: '10px', marginBottom: '14px', flexShrink: 0 }}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{new Date().toLocaleDateString('ko-KR')}</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', marginTop: '6px' }}>
                      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="매물 브리핑" style={{ flex: 1, minWidth: 0, fontSize: '24px', fontWeight: 800, color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 12px', boxSizing: 'border-box', outline: 'none' }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap', paddingBottom: '8px' }}>담당자: {chargeName}</span>
                    </div>
                  </div>
                );
                const commentBlock = comment ? (
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'white', background: '#1e293b', padding: '8px 12px', borderLeft: '4px solid #4f46e5', marginTop: '4px' }}>코멘트</div>
                    <div style={{ border: '1px solid #e2e8f0', borderTop: 'none', padding: '12px 14px', fontSize: '13px', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{comment}</div>
                  </div>
                ) : null;
                const officeBlock = (() => {
                  const off = offInfo;
                  if (!off) return null;
                  const offNm = off.offNm || '';
                  const offTel = off.offTel || off.rpsPhone || off.offRpsPhone || '';
                  if (!offNm && !offTel) return null;
                  // 부동산 정보 — 표 대신 한 줄(부동산명 + 부동산전화번호), 우측 하단
                  return (
                    <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>
                        {offNm}{offNm && offTel ? '  ' : ''}
                        {offTel && <span style={{ fontWeight: 600, color: '#475569' }}>{offTel}</span>}
                      </div>
                    </div>
                  );
                })();

                if (propertyList.length === 0) {
                  return <div style={pageStyle} className="rpt-page">{titleBlock}<div style={{ color: '#94a3b8', margin: 'auto' }}>매물을 선택하세요.</div><PageNo n={1} total={1} /></div>;
                }

                // ── 단일: 세로 A4 1페이지 ──
                if (!isMulti) {
                  const p = propertyList[0];
                  const SEC = { fontSize: '15px', fontWeight: 700, color: '#fff', background: '#1e293b', padding: '8px 12px', borderLeft: '4px solid #4f46e5' };
                  const LB = { width: '30%', padding: '8px 12px', background: '#f8fafc', fontSize: '13px', fontWeight: 600, color: '#475569', border: '1px solid #e2e8f0', textAlign: 'left' };
                  const CL = { padding: '4px 8px', border: '1px solid #e2e8f0' };
                  const ein = { width: '100%', border: 'none', outline: 'none', fontSize: '13px', color: '#1e293b', fontFamily: 'inherit', background: 'transparent', boxSizing: 'border-box', padding: '4px 2px' };
                  const box = (children) => <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', marginBottom: '14px' }}><tbody>{children}</tbody></table>;
                  const LB2 = { ...LB, width: '15%' };
                  const eCell = (label, key, fallback) => (<><td style={LB2}>{label}</td><td style={CL}><input value={p[key] ?? (fallback ?? '')} onChange={(e) => patchProperty(0, key, e.target.value)} style={ein} /></td></>);
                  const eRow = (label, key, fallback) => (<tr><td style={LB}>{label}</td><td style={CL}><input value={p[key] ?? (fallback ?? '')} onChange={(e) => patchProperty(0, key, e.target.value)} style={ein} /></td></tr>);
                  const eRow2 = (l1, k1, f1, l2, k2, f2) => (<tr>{eCell(l1, k1, f1)}{eCell(l2, k2, f2)}</tr>);
                  const eRowFull = (label, key, fallback) => (<tr><td style={LB2}>{label}</td><td style={CL} colSpan={3}><input value={p[key] ?? (fallback ?? '')} onChange={(e) => patchProperty(0, key, e.target.value)} style={ein} /></td></tr>);
                  const floorTxt = `${p.floor1 ?? '-'} / ${p.floor2 ?? '-'}`;
                  const dirTxt = `${p.dirStd ?? '-'}${p.dirBase ? ' / ' + p.dirBase : ''}`;
                  const roomTxt = `${p.roomCnt ?? '-'} / ${p.bathCnt ?? '-'}`;
                  const heatTxt = `${p.heatMethod ?? '-'}${p.heatFuel ? ' / ' + p.heatFuel : ''}`;
                  return (
                    <div style={pageStyle} className="rpt-page">
                      {titleBlock}
                      <div style={{ flex: 1, minHeight: 0 }}>
                        <div style={SEC}>면적 / 금액</div>
                        {box(<>
                          {eRow('공급/전용면적(㎡)', 'rptArea', `${p.supArea ?? '-'} / ${p.excArea ?? '-'}`)}
                          {eRow('매매가(만원)', 'rptSaleAmt', won(p.saleAmt))}
                          {eRow('전세가(만원)', 'rptLesAmt', won(p.lesAmt))}
                          {eRow('월세(보증/월)', 'rptMonAmt', `${won(p.protAmt)} / ${won(p.monAmt)}`)}
                        </>)}
                        <div style={SEC}>매물정보</div>
                        {box(<>
                          {eRow2('물건유형', 'rptType', typeLabel(p), '현상태', 'rptStatus', p.currentStatus || '')}
                          {eRowFull('주소', 'rptAddr', addrOf(p))}
                          {eRow2('세대수', 'rptHouseCnt', p.houseCnt ?? '', '주차대수', 'rptParkCnt', p.pkCnt ?? '')}
                          {eRow2('잔금예정일', 'rptRmdDate', p.rmdDate ? String(p.rmdDate).split('T')[0] : '', '해당층/총층', 'rptFloor', floorTxt)}
                          {eRow2('준공일자', 'rptCompYear', p.compYear ?? '', '방향/기준', 'rptDir', dirTxt)}
                          {eRow2('방수/욕실수', 'rptRoom', roomTxt, '난방방식/연료', 'rptHeat', heatTxt)}
                          {eRow2('출입구조', 'rptEntr', p.entrStruct ?? '', '건물형태', 'rptBuildingForm', p.buildingForm ?? '')}
                        </>)}
                        <div style={SEC}>코멘트 | 물건특징</div>
                        <textarea value={p.rptMemo ?? (p.featureNote ?? p.ptExpl ?? '')} onChange={(e) => patchProperty(0, 'rptMemo', e.target.value)} placeholder="코멘트 / 물건특징 입력" rows={6}
                          style={{ width: '100%', border: '1px solid #e2e8f0', borderTop: 'none', padding: '10px 12px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', minHeight: '120px' }} />
                      </div>
                      {commentBlock}
                      {officeBlock}
                      <PageNo n={1} total={1} />
                    </div>
                  );
                }

                // ── 복수: 가로 A4, 행을 페이지로 분할 ──
                const th = { padding: '6px 8px', border: '1px solid #334155', fontSize: '13px', fontWeight: 600, color: '#fff' };
                const td = { padding: '4px 6px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#1e293b', textAlign: 'center', verticalAlign: 'middle' };
                const cin = { width: '100%', border: 'none', outline: 'none', textAlign: 'center', fontSize: '13px', fontFamily: 'inherit', background: 'transparent', boxSizing: 'border-box' };
                const hin = { width: '100%', border: 'none', outline: 'none', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#fff', background: 'transparent', fontFamily: 'inherit', boxSizing: 'border-box' };
                const setH = (k) => (e) => setMultiHeaders((h) => ({ ...h, [k]: e.target.value }));
                const nameOf = (p) => p.rptName ?? (p.ptName || p.addr4 || p.addr5 || '-');
                const aptTypOf = (p) => p.rptAptTyp ?? (p.aptTyp || '-');
                const leaseOf = (p) => p.rptLease ?? ((p.nowDepAmt || p.nowMonAmt) ? `${p.nowDepAmt ?? ''}/${p.nowMonAmt ?? ''}` : '-');
                const balanceOf = (p) => p.rptBalance ?? (p.exptDate ? String(p.exptDate).slice(0, 10).replace(/-/g, '.') : '-');
                const ROWS_PER_PAGE = 7;
                const chunks = [];
                for (let i = 0; i < propertyList.length; i += ROWS_PER_PAGE) chunks.push({ rows: propertyList.slice(i, i + ROWS_PER_PAGE), start: i });
                const total = chunks.length;
                const renderTable = (rowsArr, start) => (
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '11%' }} /><col style={{ width: '17%' }} /><col style={{ width: '7%' }} /><col style={{ width: '8%' }} />
                      <col style={{ width: '13%' }} /><col style={{ width: '12%' }} /><col style={{ width: '10%' }} /><col style={{ width: '22%' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: '#1e293b' }}>
                        <th style={th}><input value={multiHeaders.type} onChange={setH('type')} style={hin} /></th>
                        <th style={th}><input value={multiHeaders.name} onChange={setH('name')} style={hin} /></th>
                        <th style={th}><input value={multiHeaders.aptTyp} onChange={setH('aptTyp')} style={hin} /></th>
                        <th style={th}><input value={multiHeaders.sale} onChange={setH('sale')} style={hin} /></th>
                        <th style={th}><input value={multiHeaders.amt} onChange={setH('amt')} style={hin} /></th>
                        <th style={th}><input value={multiHeaders.lease} onChange={setH('lease')} style={hin} /></th>
                        <th style={th}><input value={multiHeaders.balance} onChange={setH('balance')} style={hin} /></th>
                        <th style={th}><input value={multiHeaders.memo} onChange={setH('memo')} style={hin} /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowsArr.map((p, ri) => { const i = start + ri; const tr = tradeRows(p); return (
                        <tr key={p.ptNo ?? i}>
                          <td style={td}><input value={p.rptType ?? typeLabel(p)} onChange={(e) => patchProperty(i, 'rptType', e.target.value)} style={cin} /></td>
                          <td style={td}><input value={nameOf(p)} onChange={(e) => patchProperty(i, 'rptName', e.target.value)} style={cin} /></td>
                          <td style={td}><input value={aptTypOf(p)} onChange={(e) => patchProperty(i, 'rptAptTyp', e.target.value)} style={cin} /></td>
                          <td style={{ ...td, lineHeight: 1.7 }}>{tr.map((r, k) => <div key={k}>{r.label}</div>)}</td>
                          <td style={{ ...td, textAlign: 'right', lineHeight: 1.7, whiteSpace: 'nowrap' }}>{tr.map((r, k) => <div key={k}>{r.amt}</div>)}</td>
                          <td style={td}><input value={leaseOf(p)} onChange={(e) => patchProperty(i, 'rptLease', e.target.value)} style={cin} /></td>
                          <td style={td}><input value={balanceOf(p)} onChange={(e) => patchProperty(i, 'rptBalance', e.target.value)} style={cin} /></td>
                          <td style={{ ...td, textAlign: 'left' }}>
                            {reportVersion === 'customer' ? (<div style={{ minHeight: '40px' }} />) : (
                              <textarea value={propMemos[p.ptNo] ?? (isHub ? officeMemoText({ officeName: p.officeName || p.pOfficeName || p.rpsNm, repName: p.repName || p.pRepName, tel: p.tel || p.officeTel || p.pOfficeTel }) : '')}
                                onChange={(e) => setPropMemos((m) => ({ ...m, [p.ptNo]: e.target.value }))} placeholder="메모 입력" rows={2}
                                style={{ width: '100%', minWidth: 0, minHeight: '40px', border: '1px solid #e2e8f0', borderRadius: '4px', outline: 'none', resize: 'vertical', fontSize: '13px', fontFamily: 'inherit', padding: '4px 6px', boxSizing: 'border-box' }} />
                            )}
                          </td>
                        </tr>
                      ); })}
                    </tbody>
                  </table>
                );
                return chunks.map((c, pi) => (
                  <div key={pi} style={pageStyle} className="rpt-page">
                    {pi === 0 && titleBlock}
                    {pi === 0 && <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', background: '#1e293b', padding: '8px 12px', borderLeft: '4px solid #4f46e5', flexShrink: 0 }}>매물 목록 ({propertyList.length}건)</div>}
                    <div style={{ flex: 1, minHeight: 0 }}>{renderTable(c.rows, c.start)}</div>
                    {pi === total - 1 && commentBlock}
                    {pi === total - 1 && officeBlock}
                    <PageNo n={pi + 1} total={total} />
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* 매물 선택 팝업 */}
        {showPtPicker && (
          <div onClick={() => setShowPtPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 3200, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '520px', maxWidth: '96vw', height: '560px', maxHeight: '92vh', background: 'white', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>매물 선택 ({propertyList.length})</span>
                <button onClick={() => setShowPtPicker(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#334155', display: 'inline-flex' }}><X size={20} /></button>
              </div>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #eef1f5', display: 'flex', gap: '6px' }}>
                <input autoFocus value={ptKeyword} onChange={(e) => setPtKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchProperties()} placeholder="물건명 검색" style={{ flex: 1, padding: '8px 10px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }} />
                <button onClick={searchProperties} style={{ padding: '8px 14px', fontSize: '14px', fontWeight: 700, border: '1px solid #4f46e5', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>검색</button>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {ptResults.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>물건명으로 검색하세요.</div>
                ) : ptResults.map((r) => {
                  const on = propertyList.some((x) => x.ptNo === r.ptNo);
                  return (
                    <label key={r.ptNo} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px', borderBottom: '1px solid #f4f6f9', cursor: 'pointer', background: on ? '#ecfdf5' : 'white' }}>
                      <input type="checkbox" checked={on} onChange={() => togglePropertyList(r)} style={{ width: '16px', height: '16px' }} />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{r.ptName || '(무명)'} · {typeLabel(r)} · {addrOf(r)}</span>
                    </label>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 16px', borderTop: '1px solid #e5e7eb', background: '#fafafa' }}>
                <button onClick={() => setShowPtPicker(false)} style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 700, border: '1px solid #4f46e5', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>완료 ({propertyList.length})</button>
              </div>
            </div>
          </div>
        )}

        {/* 고객 선택 팝업 */}
        {showCustPicker && (
          <div onClick={() => setShowCustPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 3200, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '520px', maxWidth: '96vw', height: '560px', maxHeight: '92vh', background: 'white', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>고객 선택 ({selectedCustomers.length})</span>
                <button onClick={() => setShowCustPicker(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#334155', display: 'inline-flex' }}><X size={20} /></button>
              </div>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #eef1f5', display: 'flex', gap: '6px' }}>
                <input autoFocus value={custKeyword} onChange={(e) => setCustKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchCustomers()} placeholder="고객명 검색" style={{ flex: 1, padding: '8px 10px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }} />
                <button onClick={searchCustomers} style={{ padding: '8px 14px', fontSize: '14px', fontWeight: 700, border: '1px solid #4f46e5', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>검색</button>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {custResults.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>고객명으로 검색하세요.</div>
                ) : custResults.map((c) => {
                  const on = selectedCustomers.some((x) => x.custNo === c.custNo);
                  return (
                    <label key={c.custNo} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px', borderBottom: '1px solid #f4f6f9', cursor: 'pointer', background: on ? '#eef2ff' : 'white' }}>
                      <input type="checkbox" checked={on} onChange={() => toggleCustomer(c)} style={{ width: '16px', height: '16px' }} />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{c.name} · {c.tel || '-'}</span>
                    </label>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 16px', borderTop: '1px solid #e5e7eb', background: '#fafafa' }}>
                <button onClick={() => setShowCustPicker(false)} style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 700, border: '1px solid #4f46e5', background: '#4f46e5', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>완료 ({selectedCustomers.length})</button>
              </div>
            </div>
          </div>
        )}

        {/* 보고서 삭제 확인 (공통 컴포넌트) */}
        <ConfirmDialog
          open={confirmDeleteNo != null}
          message={'이 보고서를 삭제하시겠습니까?\n삭제된 보고서는 복구할 수 없습니다.'}
          confirmText="삭제"
          cancelText="취소"
          onConfirm={() => doDeleteReport(confirmDeleteNo)}
          onCancel={() => setConfirmDeleteNo(null)}
        />
    </div>
  );
};

const btn = (bg) => ({ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 12px', fontSize: '13px', background: bg, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 });
const iconBtn = { padding: '6px 8px', border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: '4px', cursor: 'pointer' };
const inputStyle = { flex: 1, width: '100%', padding: '6px 8px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' };
const sectionTitle = { fontSize: '13px', fontWeight: 700, color: '#475569' };

export default ReportBuilderModal;
