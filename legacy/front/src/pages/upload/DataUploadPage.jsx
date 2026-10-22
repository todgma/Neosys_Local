import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getUploadFieldGroups } from '../../constants/uploadFields';
import { PROPERTY_TYPE_OPTIONS, APARTMENT_RELATED_CODES } from '../../constants/propertyTypes';
import addressService from '../../services/common/addressService';
import { propertyService } from '../../services/propertyService';
import { customerService } from '../../services/customerService';
import { uploadStagingService } from '../../services/uploadStagingService';
import { useAuthStore } from '../../stores/authStore';

// 업로드 필드 타입(그 외는 문자열) — 숫자/소수/불리언 변환용
const INT_KEYS = new Set(['floor1', 'floor2', 'houseCnt', 'roomCnt', 'bathCnt', 'saleAmt', 'lesAmt', 'protAmt', 'monAmt', 'etcAmt', 'etcAmt2', 'loanAmt', 'maintCost', 'nowDepAmt', 'nowMonAmt',
  // 추가 금액/수량(pt_sale)
  'presaleAmt', 'premiumAmt', 'layAmt', 'rightValueAmt', 'addContribAmt', 'expansionAmt', 'optionAmt', 'facilityCost', 'movingCost', 'investAmt', 'depositTotal', 'loanTotal',
  'incRentM', 'incRentY', 'incMgmtM', 'incMgmtY', 'incEtcM', 'incEtcY', 'expLaborM', 'expLaborY', 'expUtilM', 'expUtilY', 'expLoanM', 'expLoanY', 'expEtcM', 'expEtcY',
  'elevatorCnt', 'stairsCnt', 'evChargerCnt', 'guestRoomCnt', 'basementFloor', 'groundFloor', 'toilet']);
const DEC_KEYS = new Set(['supArea', 'excArea', 'landShare', 'buildingArea', 'grossArea', 'pkCnt', 'officeArea', 'formerArea', 'formerLandShareRatio']);
const BOOL_KEYS = new Set(['zoneAdjust', 'zoneOverheat', 'zoneSpec', 'zoneLandPermit']);
const SKIP_KEYS = new Set(['areaUnit', 'consultContent']); // DTO에 직접 매핑 안 함(별도 처리: consultContent→상담내용)
// 전화번호를 010-0000-0000 형식으로 통일(숫자만 추출 후 하이픈 삽입). 형식 불명확하면 원본 유지.
const fmtPhone = (v) => {
  const d = String(v || '').replace(/[^\d]/g, '');
  if (!d) return '';
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return String(v || '').trim();
};
const PARTY_KEYS = new Set(['owner1Name', 'owner1Phone', 'owner2Name', 'owner2Phone', 'tenant1Name', 'tenant1Phone', 'tenant2Name', 'tenant2Phone', 'agent1Name', 'agent1Phone', 'agent2Name', 'agent2Phone']);
// 고객 업로드 타입(그 외는 문자열) — 숫자/소수 변환 + 특수(구입자/별칭/지역) 처리
const CUST_INT_KEYS = new Set(['custType', 'roomCnt', 'bathCnt', 'parkCnt', 'saleAmtFr', 'saleAmtTo', 'lesAmtFr', 'lesAmtTo', 'protAmtFr', 'protAmtTo', 'monAmtFr', 'monAmtTo',
  'etcProtAmtFr', 'etcProtAmtTo', 'etcMonAmtFr', 'etcMonAmtTo', 'elevatorCnt', 'stairCnt']);
const CUST_DEC_KEYS = new Set(['excAreaFr', 'excAreaTo', 'landShareFr', 'landShareTo', 'grossAreaFr', 'grossAreaTo', 'landShareRatioFr', 'landShareRatioTo']);
const CUST_SPECIAL = new Set(['alias1', 'alias2', 'buyer1Name', 'buyer1Phone', 'buyer2Name', 'buyer2Phone', 'region1', 'region2', 'region3', 'consultContent']);
const toInt = (v) => { const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10); return Number.isFinite(n) ? n : null; };
const toDec = (v) => { const n = parseFloat(String(v).replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : null; };
const toBool = (v) => { const s = String(v).trim().toLowerCase(); if (['y', 'yes', 'true', '1', 'o', '예', '해당', '가능'].includes(s)) return true; if (['n', 'no', 'false', '0', 'x', '아니오', '불가', '불가능'].includes(s)) return false; return null; };

/**
 * 엑셀 붙여넣기 업로드 (그리드형) — 물건/고객 공용.
 *  · 상단 공통 폼(물건: 물건유형·소재지·물건명)은 등록폼처럼 지정 → 모든 행에 공통 적용
 *  · 컬럼 헤더 드롭다운으로 나머지 항목 선택 → 엑셀에서 복사해 그리드에 붙여넣기 → 저장
 *  · 그리드 0행은 '헤더행'으로, 엑셀 헤더를 넣어도 DB 업로드에서는 제외됨
 *  · target='property'(물건관리) / 'customer'(고객관리)
 */
const DEFAULT_COLS = 12;
const DATA_ROWS = 100;    // 기본 데이터 행 개수(헤더행 제외). 붙여넣기 시 자동으로 행이 늘어나므로 작게 시작(초기 렌더 성능)
const ADD_ROWS = 100;     // '행 추가' 버튼 클릭 시 증가량

// 헤더행(0행) 1개 + 데이터행 DATA_ROWS 개
const makeGrid = (cols, dataRows = DATA_ROWS) =>
  Array.from({ length: dataRows + 1 }, () => Array(cols).fill(''));

const DataUploadPage = ({ onClose, onSuccess, target: targetProp = null }) => {
  // target이 전달되면 잠금(물건/고객), 없으면 사용자가 상단에서 선택
  const [target, setTarget] = useState(targetProp || 'property');
  const locked = !!targetProp;
  const isProperty = target === 'property';
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [gridBusy, setGridBusy] = useState(false); // 행 추가/붙여넣기 등 무거운 그리드 변경 중 로딩 표시

  // 무거운 그리드 변경은 스피너를 먼저 그린 뒤(지연) 실행 → 화면 멈춤 체감 완화
  const runWithGridBusy = (fn) => {
    setGridBusy(true);
    setTimeout(() => {
      try { fn(); } finally { setTimeout(() => setGridBusy(false), 0); }
    }, 30);
  };

  // 업로드/임시저장 탭 + 임시저장 목록 상태
  const [view, setView] = useState('upload'); // 'upload' | 'staging'
  const [staging, setStaging] = useState([]);
  const [stagingLoading, setStagingLoading] = useState(false);
  const [stagingBusy, setStagingBusy] = useState(false);

  const fieldGroups = useMemo(() => getUploadFieldGroups(target), [target]);

  // 임시저장 목록 표시용 라벨(물건명/고객명 등)
  const labelOfPayload = (pay) => {
    if (!pay) return '(내용 없음)';
    return (pay.ptName || pay.name || pay.addr4 || pay.alias || (pay.buyers?.[0]?.name) || '(제목 없음)');
  };
  const loadStaging = async () => {
    setStagingLoading(true);
    try { setStaging(await uploadStagingService.list(target, user?.offNo ?? null)); }
    catch (e) { console.error(e); setStaging([]); }
    finally { setStagingLoading(false); }
  };
  useEffect(() => { if (view === 'staging') loadStaging(); /* eslint-disable-next-line */ }, [view, target]);

  // 임시저장 — 지금 그리드 내용을 바로 등록하지 않고 스테이징에 보관
  const handleStage = async () => {
    const items = isProperty ? buildPropertyItems() : buildCustomerItems();
    if (items.length === 0) { toast.error('임시저장할 데이터가 없습니다. (0행 헤더는 제외됩니다)'); return; }
    if (isProperty && isDanjiType && !commonDanjiCode) { toast.error('단지형 물건은 상단에서 단지를 선택해야 합니다.'); return; }
    setSaving(true);
    try {
      await uploadStagingService.save({
        target,
        offNo: user?.offNo ?? null,
        regId: user?.userId ?? null,
        items: items.map((p) => ({ payload: p, label: labelOfPayload(p) })),
      });
      toast.success(`${items.length}건 임시저장되었습니다. [임시저장] 탭에서 확정할 수 있습니다.`);
      clearAll();
    } catch (e) { console.error(e); toast.error(e?.message || '임시저장에 실패했습니다.'); }
    finally { setSaving(false); }
  };

  // 임시저장 → 확정: 선택 payload들을 기존 bulkUpload로 재전송 후 스테이징에서 삭제
  const commitStaging = async (rows) => {
    if (!rows || rows.length === 0) { toast.error('확정할 항목이 없습니다.'); return; }
    const propRows = rows.filter((r) => (r.target || target) === 'property');
    const custRows = rows.filter((r) => (r.target || target) === 'customer');
    setStagingBusy(true);
    try {
      let ok = 0, fail = 0;
      if (propRows.length) {
        const res = await propertyService.bulkUpload({
          items: propRows.map((r) => r.payload),
          danjiCode: null,
          offNo: user?.offNo ?? null, rtNo: user?.rtNo ?? null, userId: user?.userId ?? null,
        });
        const d = res?.data || {}; ok += (d.success || 0); fail += (d.failed || 0);
      }
      if (custRows.length) {
        const res = await customerService.bulkUpload({
          items: custRows.map((r) => r.payload),
          offNo: user?.offNo ?? null,
          rtNo: (user?.rtNo != null && String(user.rtNo).trim() !== '') ? Number(user.rtNo) : null,
          userId: user?.userId ?? null,
        });
        const d = res?.data || {}; ok += (d.success || 0); fail += (d.failed || 0);
      }
      // 성공 여부와 무관하게 확정 시도한 스테이징 행은 제거(중복확정 방지). 실패분은 토스트로 안내.
      await uploadStagingService.removeMany(rows.map((r) => r.stagingId));
      if (fail > 0) toast.error(`확정: 성공 ${ok}건 · 실패 ${fail}건`, { duration: 6000 });
      else toast.success(`확정 완료 — ${ok}건 등록되었습니다.`);
      await loadStaging();
      onSuccess?.({ target, result: { success: ok, failed: fail } });
    } catch (e) { console.error(e); toast.error(e?.message || '확정에 실패했습니다.'); }
    finally { setStagingBusy(false); }
  };

  const deleteStaging = async (id) => {
    if (!window.confirm('이 임시저장 항목을 삭제할까요?')) return;
    setStagingBusy(true);
    try { await uploadStagingService.remove(id); await loadStaging(); }
    catch (e) { console.error(e); toast.error('삭제 실패'); }
    finally { setStagingBusy(false); }
  };

  // 상단 공통 폼(물건 전용) — 모든 행에 공통 적용
  const [commonPtType, setCommonPtType] = useState('');
  const [commonAddr, setCommonAddr] = useState('');
  const [commonPtName, setCommonPtName] = useState('');
  // 소재지 드롭다운(시도/시군구/읍면동) + 단지형 단지목록 — 등록폼(PropertyFormPageV2)과 동일 흐름
  const [sidoList, setSidoList] = useState([]);
  const [sigunguList, setSigunguList] = useState([]);
  const [eupList, setEupList] = useState([]);
  const [selSido, setSelSido] = useState('');
  const [selSigungu, setSelSigungu] = useState('');
  const [bjdCode, setBjdCode] = useState('');        // 읍면동(법정동) 코드
  const [danjiList, setDanjiList] = useState([]);
  const [commonDanjiCode, setCommonDanjiCode] = useState('');
  const isDanjiType = APARTMENT_RELATED_CODES.includes(commonPtType); // 단지형(아파트 계열)

  const nameOf = (list, code) => list.find((x) => x.bjdCode === code)?.bjdName || '';
  useEffect(() => { addressService.getSidoList().then((d) => setSidoList(d || [])).catch(() => {}); }, []);
  // 읍면동(또는 유형) 변경 시 단지형이면 단지목록 로드
  useEffect(() => {
    setCommonDanjiCode('');
    if (isDanjiType && bjdCode) { addressService.getDanjiListByBjd(bjdCode).then((d) => setDanjiList(d || [])).catch(() => setDanjiList([])); }
    else setDanjiList([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commonPtType, bjdCode]);

  const onSido = async (code) => {
    setSelSido(code); setSelSigungu(''); setBjdCode(''); setSigunguList([]); setEupList([]);
    setCommonAddr(nameOf(sidoList, code));
    if (code) { try { setSigunguList(await addressService.getSigunguList(code) || []); } catch { /* */ } }
  };
  const onSigungu = async (code) => {
    setSelSigungu(code); setBjdCode(''); setEupList([]);
    setCommonAddr([nameOf(sidoList, selSido), nameOf(sigunguList, code)].filter(Boolean).join(' '));
    if (code) { try { setEupList(await addressService.getEupMyeonDongList(code) || []); } catch { /* */ } }
  };
  const onEup = (code) => {
    setBjdCode(code);
    setCommonAddr([nameOf(sidoList, selSido), nameOf(sigunguList, selSigungu), nameOf(eupList, code)].filter(Boolean).join(' '));
  };
  const onDanji = (naverCode) => {
    setCommonDanjiCode(naverCode);
    const d = danjiList.find((x) => String(x.naverDanjiCode) === String(naverCode));
    setCommonPtName(d?.buildingName || '');
  };

  // 컬럼별 선택된 필드 key (''=미지정)
  const [columns, setColumns] = useState(() => Array(DEFAULT_COLS).fill(''));
  // 그리드 데이터: rows[r][c] (r=0 은 헤더행)
  const [grid, setGrid] = useState(() => makeGrid(DEFAULT_COLS));
  const active = useRef({ r: 0, c: 0 });

  // target 변경 시(잠금 아닐 때) 초기화
  const changeTarget = (t) => {
    setTarget(t);
    setColumns(Array(DEFAULT_COLS).fill(''));
    setGrid(makeGrid(DEFAULT_COLS));
    setCommonPtType(''); setCommonAddr(''); setCommonPtName('');
    setSelSido(''); setSelSigungu(''); setBjdCode(''); setSigunguList([]); setEupList([]); setDanjiList([]); setCommonDanjiCode('');
  };

  const setColField = (c, key) => setColumns((prev) => prev.map((v, i) => (i === c ? key : v)));

  const addColumn = () => {
    setColumns((prev) => [...prev, '']);
    setGrid((prev) => prev.map((row) => [...row, '']));
  };
  const removeColumn = (c) => {
    if (columns.length <= 1) return;
    setColumns((prev) => prev.filter((_, i) => i !== c));
    setGrid((prev) => prev.map((row) => row.filter((_, i) => i !== c)));
  };
  const addRows = (n = ADD_ROWS) => runWithGridBusy(() =>
    setGrid((prev) => [...prev, ...Array.from({ length: n }, () => Array(columns.length).fill(''))]));
  const clearAll = () => setGrid(makeGrid(columns.length));

  const setCell = (r, c, val) => setGrid((prev) => prev.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? val : cell)) : row)));

  // 클립보드 TSV 파싱 — 엑셀이 셀 내 줄바꿈/탭은 큰따옴표로 감싸므로 따옴표 상태를 추적해야
  //  한 셀 안 줄바꿈("1\n2")이 2행으로 쪼개지지 않는다.
  const parseClipboard = (raw) => {
    const s = String(raw).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rows = []; let row = []; let field = ''; let inQ = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (inQ) {
        if (ch === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else { inQ = false; } }
        else { field += ch; }
      } else if (ch === '"') { inQ = true; }
      else if (ch === '\t') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else { field += ch; }
    }
    row.push(field); rows.push(row);
    // 말미 공백행(마지막 개행으로 생긴 빈 행) 제거
    if (rows.length > 1 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') rows.pop();
    return rows;
  };

  // 엑셀 복사 → 붙여넣기: 활성 셀 기준으로 TSV 파싱하여 채움(행/열 자동 확장)
  const handlePaste = (e) => {
    const text = e.clipboardData?.getData('text');
    if (!text) return;
    e.preventDefault();
    const matrix = parseClipboard(text);
    if (matrix.length === 0) return;

    const startR = active.current.r;
    const startC = active.current.c;
    const needCols = startC + Math.max(...matrix.map((row) => row.length));
    const needRows = startR + matrix.length;

    // 대량 붙여넣기는 스피너 먼저 그린 뒤 반영(멈춤 체감 완화)
    runWithGridBusy(() => {
      setColumns((prevCols) => {
        const cols = [...prevCols];
        while (cols.length < needCols) cols.push('');
        return cols;
      });
      setGrid((prev) => {
        const totalCols = Math.max(needCols, columns.length);
        const next = prev.map((row) => {
          const r = [...row];
          while (r.length < totalCols) r.push('');
          return r;
        });
        while (next.length < needRows) next.push(Array(totalCols).fill(''));
        matrix.forEach((rowVals, ri) => {
          rowVals.forEach((val, ci) => {
            next[startR + ri][startC + ci] = val;
          });
        });
        return next;
      });
    });
  };

  const assignedCount = columns.filter(Boolean).length;

  // 물건 payload 목록 생성 — 그리드행 → 등록폼 payload(camelCase) + 거래당사자(holders/shares) + 공통폼 병합
  const buildPropertyItems = () => {
    const items = [];
    const a1 = nameOf(sidoList, selSido);
    const a2 = nameOf(sigunguList, selSigungu);
    const a3 = nameOf(eupList, bjdCode);
    const today = new Date().toISOString().slice(0, 10);
    grid.forEach((row, r) => {
      if (r === 0) return; // 헤더행 제외
      const raw = {};
      let hasValue = false;
      columns.forEach((key, c) => {
        if (!key) return;
        const val = (row[c] ?? '').toString().trim();
        if (val !== '') { hasValue = true; raw[key] = val; }
      });
      if (!hasValue) return;

      const p = {};
      Object.entries(raw).forEach(([key, val]) => {
        if (val === '' || SKIP_KEYS.has(key) || PARTY_KEYS.has(key)) return;
        if (INT_KEYS.has(key)) { const n = toInt(val); if (n != null) p[key] = n; }
        else if (DEC_KEYS.has(key)) { const n = toDec(val); if (n != null) p[key] = n; }
        else if (BOOL_KEYS.has(key)) { const b = toBool(val); if (b != null) p[key] = b; }
        else p[key] = val;
      });

      // 거래당사자: 소유자/임차인 → holders, 공인중개사 → shares(부동산공유)
      const holders = [];
      const addHolder = (type, name, phone) => {
        if ((name || '').trim() || (phone || '').trim())
          holders.push({ holderType: type, holderName: (name || '').trim(), holderPhone: fmtPhone(phone), holderRegDate: today });
      };
      addHolder('OWNER', raw.owner1Name, raw.owner1Phone);
      addHolder('OWNER', raw.owner2Name, raw.owner2Phone);
      addHolder('BUYER', raw.tenant1Name, raw.tenant1Phone);
      addHolder('BUYER', raw.tenant2Name, raw.tenant2Phone);
      const shares = [];
      const addShare = (name, phone) => {
        if ((name || '').trim() || (phone || '').trim())
          shares.push({ officeName: (name || '').trim() || null, officePhone: fmtPhone(phone) || null, date: today });
      };
      addShare(raw.agent1Name, raw.agent1Phone);
      addShare(raw.agent2Name, raw.agent2Phone);
      if (holders.length) p.holders = holders;
      if (shares.length) p.shares = shares;

      // 상담내용 — 상담일은 업로드일(today), 셀 내용은 상담내용으로
      if ((raw.consultContent || '').trim()) {
        p.consultations = [{ itvDate: today, itvContent: raw.consultContent.trim() }];
      }

      // 상단 공통폼 병합(행 값이 있으면 우선)
      if (commonPtType) p.ptType = p.ptType || commonPtType;
      if (bjdCode) p.bjdCode = p.bjdCode || bjdCode;
      if (a1 && !p.addr1) p.addr1 = a1;
      if (a2 && !p.addr2) p.addr2 = a2;
      if (a3 && !p.addr3) p.addr3 = a3;
      if (isDanjiType && commonDanjiCode) p.danjiCode = p.danjiCode || commonDanjiCode;
      const pn = (commonPtName || '').trim();
      if (pn) { p.ptName = p.ptName || pn; if (!p.addr4) p.addr4 = pn; }

      // 물건상태(필수) 기본값: 진행중
      if (!p.ptSts) p.ptSts = 'PTSTS01';

      items.push(p);
    });
    return items;
  };

  // 고객 payload 목록 생성 — 그리드행 → 고객 payload(camelCase) + 구입자(buyers)/희망지역(areas)
  const buildCustomerItems = () => {
    const items = [];
    const today = new Date().toISOString().slice(0, 10);
    grid.forEach((row, r) => {
      if (r === 0) return; // 헤더행 제외
      const raw = {};
      let hasValue = false;
      columns.forEach((key, c) => {
        if (!key) return;
        const val = (row[c] ?? '').toString().trim();
        if (val !== '') { hasValue = true; raw[key] = val; }
      });
      if (!hasValue) return;

      const p = {};
      Object.entries(raw).forEach(([key, val]) => {
        if (val === '' || CUST_SPECIAL.has(key)) return;
        if (CUST_INT_KEYS.has(key)) { const n = toInt(val); if (n != null) p[key] = n; }
        else if (CUST_DEC_KEYS.has(key)) { const n = toDec(val); if (n != null) p[key] = n; }
        else p[key] = val;
      });

      // 별칭(1/2 결합)
      const alias = [raw.alias1, raw.alias2].map((x) => (x || '').trim()).filter(Boolean).join(' / ');
      if (alias) p.alias = alias;

      // 구입자 → buyers (고객의 실체). 고객명(name)은 폼과 동일하게 구입자1/별칭에서 파생(필수 아님)
      const buyers = [];
      const addBuyer = (name, phone) => {
        if ((name || '').trim() || (phone || '').trim())
          buyers.push({ name: (name || '').trim() || null, tel: fmtPhone(phone) || null });
      };
      addBuyer(raw.buyer1Name, raw.buyer1Phone);
      addBuyer(raw.buyer2Name, raw.buyer2Phone);
      if (buyers.length) p.buyers = buyers;
      p.name = (raw.buyer1Name || raw.buyer2Name || raw.alias1 || '').trim();
      if ((raw.buyer1Phone || '').trim()) p.tel = fmtPhone(raw.buyer1Phone);

      // 상담내용 — 상담일은 업로드일(today), 셀 내용은 상담내용으로
      if ((raw.consultContent || '').trim()) {
        p.consultations = [{ itvDate: today, itvContent: raw.consultContent.trim() }];
      }

      // 희망지역 → areas (공백 분해: 시도/시군구/읍면동)
      const areas = [];
      [raw.region1, raw.region2, raw.region3].forEach((rg) => {
        const t = (rg || '').trim();
        if (!t) return;
        const toks = t.split(/\s+/);
        const a = {};
        if (toks.length >= 3) { a.addr1 = toks[0]; a.addr2 = toks[1]; a.addr3 = toks.slice(2).join(' '); }
        else if (toks.length === 2) { a.addr2 = toks[0]; a.addr3 = toks[1]; }
        else a.addr3 = toks[0];
        areas.push(a);
      });
      if (areas.length) p.areas = areas;

      items.push(p);
    });
    return items;
  };

  const handleSave = async () => {
    if (saving) return;

    // 고객 일괄 업로드
    if (target !== 'property') {
      const items = buildCustomerItems();
      if (items.length === 0) { toast.error('업로드할 데이터가 없습니다. (0행 헤더는 제외됩니다)'); return; }
      setSaving(true);
      try {
        const res = await customerService.bulkUpload({
          items,
          offNo: user?.offNo ?? null,
          rtNo: (user?.rtNo != null && String(user.rtNo).trim() !== '') ? Number(user.rtNo) : null,
          vendorId: user?.vendorId ?? null,
          userId: user?.userId ?? null,
        });
        const d = res?.data || {};
        if ((d.failed || 0) > 0) {
          const first = (d.errors || []).slice(0, 5).map((e) => `${e.row}행: ${e.message}`).join('\n');
          toast.error(`성공 ${d.success || 0}건 · 실패 ${d.failed || 0}건\n${first}${(d.errors || []).length > 5 ? '\n…' : ''}`, { duration: 7000 });
        } else {
          toast.success(`업로드 완료 — ${d.success || 0}건 등록되었습니다.`);
        }
        onSuccess?.({ target, result: d });
      } catch (e) {
        toast.error(e?.message || '업로드에 실패했습니다.');
      } finally {
        setSaving(false);
      }
      return;
    }

    const items = buildPropertyItems();
    if (items.length === 0) { toast.error('업로드할 데이터가 없습니다. (0행 헤더는 제외됩니다)'); return; }
    if (isDanjiType && !commonDanjiCode) { toast.error('단지형 물건은 상단에서 단지를 선택해야 동/호를 조회할 수 있습니다.'); return; }

    setSaving(true);
    try {
      const res = await propertyService.bulkUpload({
        items,
        danjiCode: isDanjiType ? commonDanjiCode : null,
        offNo: user?.offNo ?? null,
        rtNo: user?.rtNo ?? null,
        userId: user?.userId ?? null,
      });
      const d = res?.data || {};
      if ((d.failed || 0) > 0) {
        const first = (d.errors || []).slice(0, 5).map((e) => `${e.row}행: ${e.message}`).join('\n');
        toast.error(`성공 ${d.success || 0}건 · 실패 ${d.failed || 0}건\n${first}${(d.errors || []).length > 5 ? '\n…' : ''}`, { duration: 7000 });
      } else {
        toast.success(`업로드 완료 — ${d.success || 0}건 등록되었습니다.`);
      }
      onSuccess?.({ target, result: d });
    } catch (e) {
      toast.error(e?.message || '업로드에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const targetLabel = target === 'customer' ? '고객' : '물건';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      {/* 행 추가/붙여넣기 등 무거운 변경 중 로딩 오버레이 */}
      {gridBusy && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <style>{'@keyframes nsUpSpin{to{transform:rotate(360deg)}}'}</style>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', border: '4px solid #e5e7eb', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'nsUpSpin 0.8s linear infinite' }} />
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#4f46e5' }}>처리 중…</div>
          </div>
        </div>
      )}
      {/* 헤더 */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
          {targetLabel} 엑셀 붙여넣기 업로드
        </h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* 업로드 / 임시저장 탭 */}
          <div style={{ display: 'inline-flex', border: '1px solid #c7d2fe', borderRadius: '6px', overflow: 'hidden', marginRight: '6px' }}>
            {[['upload', '업로드'], ['staging', '임시저장']].map(([v, lb]) => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '7px 14px', fontSize: '14px', fontWeight: 700, border: 'none', cursor: 'pointer', background: view === v ? '#4f46e5' : 'white', color: view === v ? 'white' : '#4f46e5' }}>{lb}</button>
            ))}
          </div>
          {view === 'upload' && (
            <>
              <button onClick={handleStage} disabled={saving} style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 700, color: '#4f46e5', background: 'white', border: '1px solid #4f46e5', borderRadius: '6px', cursor: saving ? 'default' : 'pointer' }}>임시저장</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 700, color: '#fff', background: saving ? '#a5b4fc' : '#4f46e5', border: 'none', borderRadius: '6px', cursor: saving ? 'default' : 'pointer' }}>{saving ? '업로드 중…' : '바로 등록'}</button>
            </>
          )}
          {onClose && <button onClick={onClose} style={{ padding: '8px 14px', fontSize: '14px', fontWeight: 600, color: '#374151', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>닫기</button>}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 18px' }}>
        {view === 'staging' ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                임시저장 목록 <span style={{ color: '#4f46e5' }}>{staging.length}건</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginLeft: '6px' }}>({targetLabel})</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={loadStaging} disabled={stagingLoading || stagingBusy} style={toolBtn}>새로고침</button>
                <button onClick={() => commitStaging(staging)} disabled={stagingBusy || staging.length === 0}
                  style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 800, color: '#fff', background: (stagingBusy || staging.length === 0) ? '#a5b4fc' : '#4f46e5', border: 'none', borderRadius: '6px', cursor: (stagingBusy || staging.length === 0) ? 'default' : 'pointer' }}>
                  전체 확정({staging.length})
                </button>
              </div>
            </div>
            {stagingLoading ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px', fontSize: '14px', fontWeight: 600 }}>불러오는 중…</div>
            ) : staging.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px', fontSize: '14px', fontWeight: 600 }}>임시저장된 항목이 없습니다. [업로드] 탭에서 [임시저장]으로 보관할 수 있습니다.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', border: '1px solid #e5e7eb' }}>
                <thead>
                  <tr>
                    <th style={stTh}>#</th><th style={stTh}>구분</th><th style={{ ...stTh, textAlign: 'left' }}>제목</th><th style={stTh}>임시저장일</th><th style={stTh}>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {staging.map((s, i) => (
                    <tr key={s.stagingId}>
                      <td style={stTd}>{i + 1}</td>
                      <td style={stTd}>{s.target === 'customer' ? '고객' : '물건'}</td>
                      <td style={{ ...stTd, textAlign: 'left' }}>{s.label || '(제목 없음)'}</td>
                      <td style={stTd}>{String(s.regDt || '').slice(0, 16).replace('T', ' ')}</td>
                      <td style={stTd}>
                        <button onClick={() => commitStaging([s])} disabled={stagingBusy} style={{ marginRight: '6px', padding: '4px 12px', fontSize: '14px', fontWeight: 700, color: '#fff', background: '#4f46e5', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>확정</button>
                        <button onClick={() => deleteStaging(s.stagingId)} disabled={stagingBusy} style={{ padding: '4px 10px', fontSize: '14px', fontWeight: 700, color: '#dc2626', background: 'white', border: '1px solid #fca5a5', borderRadius: '5px', cursor: 'pointer' }}>삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (<>
        {/* 대상 선택(잠금 아닐 때) */}
        {!locked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', border: '1px solid #c7d2fe', borderRadius: '6px', overflow: 'hidden' }}>
              {[['property', '물건'], ['customer', '고객']].map(([val, lb]) => (
                <button key={val} onClick={() => changeTarget(val)}
                  style={{ padding: '7px 16px', fontSize: '14px', fontWeight: 700, border: 'none', cursor: 'pointer', background: target === val ? '#4f46e5' : 'white', color: target === val ? 'white' : '#4f46e5' }}>{lb}</button>
              ))}
            </div>
          </div>
        )}

        {/* 상단 공통 폼(물건) — 등록폼처럼 물건유형·소재지·물건명 지정(모든 행에 공통 적용) */}
        {isProperty && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '12px 14px', marginBottom: '12px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '8px' }}>
            <span style={commonLabel}>물건유형</span>
            <select value={commonPtType} onChange={(e) => setCommonPtType(e.target.value)}
              style={{ minWidth: '150px', padding: '6px 8px', fontSize: '14px', fontWeight: 700, border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', color: commonPtType ? '#111827' : '#94a3b8', cursor: 'pointer' }}>
              <option value="">물건유형 선택</option>
              {PROPERTY_TYPE_OPTIONS.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
            </select>
            <span style={commonLabel}>소재지</span>
            <select value={selSido} onChange={(e) => onSido(e.target.value)} style={ddStyle}>
              <option value="">시/도</option>
              {sidoList.map((x) => <option key={x.bjdCode} value={x.bjdCode}>{x.bjdName}</option>)}
            </select>
            <select value={selSigungu} onChange={(e) => onSigungu(e.target.value)} disabled={!selSido} style={ddStyle}>
              <option value="">시/군/구</option>
              {sigunguList.map((x) => <option key={x.bjdCode} value={x.bjdCode}>{x.bjdName}</option>)}
            </select>
            <select value={bjdCode} onChange={(e) => onEup(e.target.value)} disabled={!selSigungu} style={ddStyle}>
              <option value="">읍/면/동</option>
              {eupList.map((x) => <option key={x.bjdCode} value={x.bjdCode}>{x.bjdName}</option>)}
            </select>
            <span style={commonLabel}>물건명</span>
            {isDanjiType ? (
              <select value={commonDanjiCode} onChange={(e) => onDanji(e.target.value)} disabled={!bjdCode}
                style={{ ...ddStyle, minWidth: '220px' }}>
                <option value="">{bjdCode ? '단지 선택' : '읍/면/동 먼저 선택'}</option>
                {danjiList.map((d) => <option key={d.naverDanjiCode} value={d.naverDanjiCode}>{d.buildingName}{d.addressBunji ? ` (${d.addressBunji})` : ''}</option>)}
              </select>
            ) : (
              <input value={commonPtName} onChange={(e) => setCommonPtName(e.target.value)} placeholder="물건명 직접 입력"
                style={{ width: '220px', maxWidth: '40vw', padding: '6px 10px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            )}
          </div>
        )}

        {/* 안내 */}
        <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
          {isProperty && '① 상단 공통 폼 지정 → '}② 컬럼 헤더에서 항목 선택 → ③ 엑셀에서 복사 후 셀 클릭·붙여넣기(Ctrl+V) → ④ 저장하기
          <span style={{ marginLeft: '8px', color: '#dc2626', fontWeight: 700 }}>※ 0행(헤더)은 업로드되지 않습니다.</span>
        </div>

        {/* 그리드 편집 도구 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <button onClick={addColumn} style={toolBtn}>＋ 열 추가</button>
          <button onClick={() => addRows(100)} style={toolBtn}>＋ 100행</button>
          <button onClick={() => addRows(500)} style={toolBtn}>＋ 500행</button>
          <button onClick={() => addRows(1000)} style={toolBtn}>＋ 1000행</button>
          <button onClick={clearAll} style={toolBtn}>데이터 지우기</button>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', alignSelf: 'center' }}>선택된 항목 {assignedCount}개 · {columns.length}열 · 데이터 {grid.length - 1}행</span>
        </div>

        {/* 붙여넣기 그리드 */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'auto', background: 'white', maxHeight: 'calc(100vh - 300px)' }} onPaste={handlePaste}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: `${48 + columns.length * COL_W}px` }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr>
                <th style={{ ...cornerTh, position: 'sticky', left: 0, zIndex: 3 }}>#</th>
                {columns.map((key, c) => (
                  <th key={c} style={headTh}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <select value={key} onChange={(e) => setColField(c, e.target.value)}
                        style={{ flex: 1, minWidth: 0, width: '100%', padding: '4px 4px', fontSize: '13px', fontWeight: 700, border: '1px solid #c7d2fe', borderRadius: '4px', background: key ? '#eef2ff' : 'white', color: key ? '#4f46e5' : '#94a3b8', cursor: 'pointer' }}>
                        <option value="">항목 선택</option>
                        {fieldGroups.map((grp) => (
                          <optgroup key={grp.group} label={grp.group}>
                            {grp.fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                          </optgroup>
                        ))}
                      </select>
                      <button onClick={() => removeColumn(c)} title="열 삭제" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: '14px', fontWeight: 700, padding: '0 2px' }}>✕</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, r) => {
                const isHeader = r === 0;
                return (
                  <tr key={r}>
                    <td style={{ ...idxTd, position: 'sticky', left: 0, zIndex: 1, ...(isHeader ? headerIdxTd : {}) }}>{isHeader ? '헤더' : r}</td>
                    {row.map((cell, c) => (
                      <td key={c} style={{ ...cellTd, ...(isHeader ? headerCellTd : {}) }}>
                        <input
                          value={cell}
                          onFocus={() => { active.current = { r, c }; }}
                          onChange={(e) => setCell(r, c, e.target.value)}
                          placeholder={isHeader ? '헤더(업로드 안 됨)' : ''}
                          style={{ width: '100%', minWidth: 0, border: 'none', outline: 'none', padding: '5px 6px', fontSize: '14px', background: 'transparent', boxSizing: 'border-box', fontWeight: isHeader ? 700 : 400, color: isHeader ? '#92400e' : '#111827' }}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>)}
      </div>
    </div>
  );
};

const commonLabel = { fontSize: '14px', fontWeight: 800, color: '#3730a3', whiteSpace: 'nowrap' };
const stTh = { padding: '9px 10px', fontSize: '14px', fontWeight: 800, color: '#111827', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'center', whiteSpace: 'nowrap' };
const stTd = { padding: '8px 10px', fontSize: '14px', fontWeight: 600, color: '#111827', borderBottom: '1px solid #eef2f7', textAlign: 'center', whiteSpace: 'nowrap' };
const ddStyle = { minWidth: '120px', padding: '6px 8px', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', color: '#111827', cursor: 'pointer' };
const toolBtn = { padding: '6px 12px', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', color: '#374151', cursor: 'pointer' };
// 엑셀처럼 셀 구분선 진하게(#94a3b8) · 열 너비 고정(좁게)
const GRID_LINE = '1px solid #94a3b8';
const COL_W = 120; // 데이터 열 너비(px)
const cornerTh = { width: '48px', minWidth: '48px', padding: '6px', background: '#e2e8f0', borderBottom: GRID_LINE, borderRight: GRID_LINE, fontSize: '13px', fontWeight: 700, color: '#475569' };
const headTh = { width: `${COL_W}px`, padding: '5px 4px', background: '#eef2f7', borderBottom: GRID_LINE, borderRight: GRID_LINE, textAlign: 'left' };
const idxTd = { width: '48px', minWidth: '48px', textAlign: 'center', padding: '4px', background: '#f1f5f9', borderRight: GRID_LINE, borderBottom: GRID_LINE, fontSize: '13px', fontWeight: 600, color: '#64748b' };
const headerIdxTd = { background: '#fef3c7', color: '#92400e', fontWeight: 800 };
const cellTd = { width: `${COL_W}px`, borderRight: GRID_LINE, borderBottom: GRID_LINE, padding: 0 };
const headerCellTd = { background: '#fffbeb', borderBottom: GRID_LINE };

export default DataUploadPage;
