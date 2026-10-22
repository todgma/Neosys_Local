'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const g = (o, ...keys) => { for (const k of keys) { if (o && o[k] != null) return o[k]; } return ''; };
// 최근수정일 표기: 'YYYY-MM-DD HH:MM'까지만
const fmtDt = (s) => { if (!s) return '-'; const t = String(s); return t.length >= 16 ? t.slice(0, 16) : t; };
// 여러 날짜 중 가장 최근(문자열 사전순 max)
const maxDt = (...arr) => { const v = arr.filter(Boolean).sort(); return v.length ? v[v.length - 1] : null; };
// 단지유형(hscp_type_code) → 한글
const HSCP_LABEL = {
  SYCA101: '아파트', SYCA102: '오피스텔', SYCA103: '주상복합',
  SYCA104: '재건축', SYCA105: '아파트분양권', SYCA106: '오피스텔분양권',
  SYCA107: '주상복합 분양권', SYCA120: '재개발',
};
const EMPTY_AREA = { idx: null, planTypeName: '', ptpNo: '', splySpc: '', exclsSpc: '', ctrtSpc: '', roomCnt: '', bathroomCnt: '', inUse: 'Y' };
const EMPTY_HO = { naverDanjiCode: '', dongNo: '', hoNumber: '', hoName: '', ptpName: '', ptpNo: '', floor: '', splySpc: '', exclsSpc: '', ctrtSpc: '', hoGubun: '일반', lineNo: '' };
const HO_GUBUN_FIXED = ['일반', '상가', '필로티', '기타'];
const EMPTY_DONG = { dongNo: '', dongName: '', highestFloorCnt: '', directionTypeCode: '', entranceTypeCd: '', inUse: 'Y' };
const EMPTY_DANJI = { buildingName: '', bjdCode: '', addressBunji: '', naverDanjiCode: '', familyCnt: '', maxFloor: '', minFloor: '', totBldCnt: '', approveDate: '' };
const PAGE_SIZE = 20;

export default function DanjiPage() {
  // 법정동 3단계 select
  const [sidos, setSidos] = useState([]);
  const [sigungus, setSigungus] = useState([]);
  const [dongs, setDongs] = useState([]);
  const [sido, setSido] = useState('');
  const [sigungu, setSigungu] = useState('');
  const [bjd, setBjd] = useState('');
  const [hscpType, setHscpType] = useState(''); // 단지유형 필터
  const [q, setQ] = useState('');

  // 단지 목록(페이징)
  const [danjis, setDanjis] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 뷰 모드: 목록으로 보기 / 배치도로 보기
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'layout'

  // 선택 단지 + 카드 데이터
  const [sel, setSel] = useState(null);       // 목록 행
  const [detail, setDetail] = useState(null);  // 단지 기본정보
  const [modified, setModified] = useState(null); // 섹션별 최근수정일 { dong, area, ho }
  const [danjiForm, setDanjiForm] = useState(null); // 단지 기본정보 수정 폼
  const [dongList, setDongList] = useState([]);     // 동 목록(danji_dong_new)
  const [dongForm, setDongForm] = useState(null);
  const [areas, setAreas] = useState([]);
  const [areaForm, setAreaForm] = useState(null);
  const [hos, setHos] = useState([]);
  const [hoForm, setHoForm] = useState(null);

  // 조합원분(배치도) — 전체공통(off_no=0). unionSet: 설정된 'dong|ho' / 복수설정 모드/선택
  const [unionSet, setUnionSet] = useState(new Set());
  const [unionMode, setUnionMode] = useState(false);
  const [unionSel, setUnionSel] = useState({}); // { 'dong|ho': {dongNo, hoNumber, floor} }

  // 법정동 로드
  useEffect(() => { (async () => {
    try { const d = await api.get('/api/admin/danji/bjd?type=1'); setSidos(d?.items || []); } catch { setSidos([]); }
  })(); }, []);

  const onSido = async (code) => {
    setSido(code); setSigungu(''); setBjd(''); setSigungus([]); setDongs([]);
    if (!code) return;
    try { const d = await api.get(`/api/admin/danji/bjd?type=2&code=${encodeURIComponent(code)}`); setSigungus(d?.items || []); } catch { setSigungus([]); }
  };
  const onSigungu = async (code) => {
    setSigungu(code); setBjd(''); setDongs([]);
    if (!code) return;
    try { const d = await api.get(`/api/admin/danji/bjd?type=4&code=${encodeURIComponent(code)}`); setDongs(d?.items || []); } catch { setDongs([]); }
  };

  // 단지 목록 조회(법정동/검색 + 페이징). 기본 진입 시 최근 단지.
  const loadDanjis = async (pg = 1) => {
    const params = new URLSearchParams({ page: String(pg), pageSize: String(PAGE_SIZE) });
    if (bjd) params.set('bjdCode', bjd);
    if (hscpType) params.set('hscpType', hscpType);
    if (q.trim()) params.set('q', q.trim());
    try {
      const d = await api.get(`/api/admin/danji/list?${params.toString()}`);
      setDanjis(d?.items || []); setTotalPages(d?.totalPages || 1); setPage(d?.page || pg);
    } catch (e) { console.error(e); setDanjis([]); setTotalPages(1); }
  };
  useEffect(() => { loadDanjis(1); /* eslint-disable-next-line */ }, []);
  useEffect(() => { loadDanjis(1); /* eslint-disable-next-line */ }, [bjd, hscpType]);

  // 단지 선택 → 카드/데이터 로드
  const openDanji = async (row) => {
    setSel(row); setDanjiForm(null); setDongForm(null); setAreaForm(null); setHoForm(null);
    const id = g(row, 'id');
    const code = g(row, 'naver_danji_code');
    try { const d = await api.get(`/api/admin/danji/${id}`); setDetail(d?.item || row); } catch { setDetail(row); }
    reloadDongs(code); reloadAreas(code); reloadHos(code); loadModified(code); reloadUnion(code);
  };
  const reloadUnion = async (code) => {
    if (!code) { setUnionSet(new Set()); return; }
    try {
      const u = await api.get(`/api/admin/danji/${encodeURIComponent(code)}/union`);
      setUnionSet(new Set((u?.items || []).map((x) => `${g(x, 'dong_no')}|${g(x, 'ho_number')}`)));
    } catch { setUnionSet(new Set()); }
  };
  // 복수설정: 호 선택 토글
  const toggleUnionSel = (dongNo, hoNumber, floor) => {
    const key = `${dongNo}|${hoNumber}`;
    setUnionSel((prev) => {
      const n = { ...prev };
      if (n[key]) delete n[key];
      else n[key] = { DongNo: String(dongNo), HoNumber: String(hoNumber), Floor: String(floor ?? '') };
      return n;
    });
  };
  // 선택한 호 일괄 조합원분 설정/해제
  const applyUnion = async (on) => {
    const items = Object.values(unionSel);
    if (items.length === 0) { alert('호를 먼저 선택하세요.'); return; }
    const code = g(detail, 'naver_danji_code');
    try {
      await api.post('/api/admin/danji/union', { NaverCode: String(code), On: on, Items: items });
      setUnionSel({}); setUnionMode(false); reloadUnion(code);
    } catch { alert('조합원분 설정에 실패했습니다.'); }
  };
  const reloadDongs = async (code) => {
    try { const d = await api.get(`/api/admin/danji/${encodeURIComponent(code)}/dong`); setDongList(d?.items || []); } catch { setDongList([]); }
    loadModified(code);
  };
  const reloadAreas = async (code) => {
    try { const a = await api.get(`/api/admin/danji/${encodeURIComponent(code)}/area`); setAreas(a?.items || []); } catch { setAreas([]); }
    loadModified(code);
  };
  const reloadHos = async (code) => {
    try { const h = await api.get(`/api/admin/danji/${encodeURIComponent(code)}/ho`); setHos(h?.items || []); } catch { setHos([]); }
    loadModified(code);
  };
  const loadModified = async (code) => {
    if (!code) { setModified(null); return; }
    try { const m = await api.get(`/api/admin/danji/${encodeURIComponent(code)}/modified`); setModified(m?.item || null); } catch { setModified(null); }
  };

  // ── 동정보(단지) ──
  const editDanji = () => setDanjiForm({
    buildingName: g(detail, 'building_name'), bjdCode: g(detail, 'bjd_code'), addressBunji: g(detail, 'address_bunji'),
    naverDanjiCode: g(detail, 'naver_danji_code'), familyCnt: g(detail, 'family_cnt'), maxFloor: g(detail, 'max_floor'),
    minFloor: g(detail, 'min_floor'), totBldCnt: g(detail, 'tot_bld_cnt'), approveDate: g(detail, 'approve_date'),
  });
  const saveDanji = async () => {
    const body = {
      BuildingName: danjiForm.buildingName, BjdCode: danjiForm.bjdCode, AddressBunji: danjiForm.addressBunji,
      NaverDanjiCode: danjiForm.naverDanjiCode, FamilyCnt: numOrNull(danjiForm.familyCnt), MaxFloor: numOrNull(danjiForm.maxFloor),
      MinFloor: numOrNull(danjiForm.minFloor), TotBldCnt: numOrNull(danjiForm.totBldCnt), ApproveDate: danjiForm.approveDate,
    };
    if (!body.BuildingName) { alert('단지명을 입력하세요.'); return; }
    try {
      if (sel && g(sel, 'id')) await api.put(`/api/admin/danji/${g(sel, 'id')}`, body);
      else await api.post('/api/admin/danji', body);
      setDanjiForm(null); await loadDanjis(page);
      if (sel && g(sel, 'id')) { const d = await api.get(`/api/admin/danji/${g(sel, 'id')}`); setDetail(d?.item || detail); }
    } catch { alert('저장 실패'); }
  };
  const addDanji = () => { setSel(null); setDetail(null); setAreas([]); setHos([]); setDanjiForm({ ...EMPTY_DANJI, bjdCode: bjd || '' }); };
  const delDanji = async () => {
    if (!sel || !confirm('단지를 삭제할까요? (면적/호 데이터도 함께 정리됩니다)')) return;
    try { await api.del(`/api/admin/danji/${g(sel, 'id')}`); setSel(null); setDetail(null); setAreas([]); setHos([]); loadDanjis(page); }
    catch { alert('삭제 실패'); }
  };

  // ── 동(棟) — danji_dong_new ──
  const saveDong = async () => {
    const code = g(detail, 'naver_danji_code');
    const body = {
      NaverDanjiCode: code, DongNo: String(dongForm.dongNo || '').trim(), DongName: dongForm.dongName,
      HighestFloorCnt: numOrNull(dongForm.highestFloorCnt), DirectionTypeCode: dongForm.directionTypeCode,
      EntranceTypeCd: dongForm.entranceTypeCd, InUse: dongForm.inUse || 'Y',
    };
    if (!body.DongNo) { alert('동 번호를 입력하세요.'); return; }
    try { await api.post('/api/admin/danji/dong', body); setDongForm(null); reloadDongs(code); }
    catch { alert('저장 실패'); }
  };
  const editDong = (d) => setDongForm({
    dongNo: g(d, 'dong_no'), dongName: g(d, 'dong_name'), highestFloorCnt: g(d, 'highest_floor_cnt'),
    directionTypeCode: g(d, 'direction_type_code'), entranceTypeCd: g(d, 'entrance_type_cd'), inUse: g(d, 'in_use') || 'Y',
  });
  const delDong = async (d) => {
    if (!confirm('동을 삭제할까요?')) return;
    const code = g(detail, 'naver_danji_code');
    try { await api.del(`/api/admin/danji/dong?naverCode=${encodeURIComponent(code)}&dongNo=${encodeURIComponent(g(d, 'dong_no'))}`); reloadDongs(code); }
    catch { alert('삭제 실패'); }
  };

  // 동/면적/호를 각각(또는 전체) 네이버에서 동기화 (외부 플랫폼 전용 엔드포인트)
  //  kind: 'dong' | 'area' | 'ho' | 'all'
  const [syncing, setSyncing] = useState(false);
  const runSync = async (kind) => {
    const code = g(detail, 'naver_danji_code');
    if (!code) { alert('단지를 먼저 선택하세요.'); return; }
    const label = kind === 'dong' ? '동' : kind === 'area' ? '면적' : kind === 'ho' ? '호' : '단지 전체';
    if (!confirm(`${label} 정보를 DB 동기화할까요?`)) return;
    setSyncing(true);
    try {
      const path = kind === 'all'
        ? `/api/admin/naver-sync/${encodeURIComponent(code)}`
        : `/api/admin/naver-sync/${encodeURIComponent(code)}/${kind}`;
      const res = await api.post(path);
      if (res && res.success === false) { alert('동기화 실패: ' + (res.error?.message || '')); return; }
      const r = res || {};
      if (kind === 'dong') { await reloadDongs(code); alert(`동 동기화 완료 — ${r.dongCount ?? 0}건`); }
      else if (kind === 'area') { await reloadAreas(code); alert(`면적 동기화 완료 — ${r.areaCount ?? 0}건`); }
      else if (kind === 'ho') { await reloadHos(code); alert(`호 동기화 완료 — ${r.hoCount ?? 0}건`); }
      else { reloadDongs(code); reloadAreas(code); reloadHos(code); alert(`동기화 완료 — 면적 ${r.areaCount ?? 0} · 동 ${r.dongCount ?? 0} · 호 ${r.hoCount ?? 0}`); }
    } catch (e) {
      alert('동기화 실패: ' + (e?.message || ''));
    } finally { setSyncing(false); }
  };

  // 단지 등록/수정: 네이버 단지코드로 단지 기본정보 불러와 폼 프리필
  const [naverLoading, setNaverLoading] = useState(false);
  const loadDanjiFromNaver = async () => {
    const code = String(danjiForm?.naverDanjiCode || '').trim();
    if (!code) { alert('네이버 단지코드를 입력하세요.'); return; }
    setNaverLoading(true);
    try {
      const res = await api.get(`/api/admin/naver-sync/${encodeURIComponent(code)}/complex`);
      if (res && res.success === false) { alert('불러오기 실패: ' + (res.error?.message || '')); return; }
      const d = res || {};
      setDanjiForm((f) => ({
        ...f,
        buildingName: d.buildingName || f.buildingName,
        bjdCode: d.bjdCode || f.bjdCode,
        addressBunji: d.addressBunji || f.addressBunji,
        familyCnt: d.familyCnt ?? f.familyCnt,
        maxFloor: d.maxFloor ?? f.maxFloor,
        minFloor: d.minFloor ?? f.minFloor,
        totBldCnt: d.totBldCnt ?? f.totBldCnt,
        approveDate: d.approveDate || f.approveDate,
      }));
    } catch (e) { alert('불러오기 실패: ' + (e?.message || '')); }
    finally { setNaverLoading(false); }
  };

  // ── 면적(평형) ──
  const saveArea = async () => {
    const body = {
      Idx: areaForm.idx || null, NaverDanjiCode: g(detail, 'naver_danji_code'),
      PlanTypeName: areaForm.planTypeName, PtpNo: areaForm.ptpNo,
      SplySpc: numOrNull(areaForm.splySpc), ExclsSpc: numOrNull(areaForm.exclsSpc), CtrtSpc: numOrNull(areaForm.ctrtSpc),
      RoomCnt: numOrNull(areaForm.roomCnt), BathroomCnt: numOrNull(areaForm.bathroomCnt), InUse: areaForm.inUse || 'Y',
    };
    try { await api.post('/api/admin/danji/area', body); setAreaForm(null); const a = await api.get(`/api/admin/danji/${encodeURIComponent(g(detail, 'naver_danji_code'))}/area`); setAreas(a?.items || []); }
    catch { alert('저장 실패'); }
  };
  const editArea = (a) => setAreaForm({
    idx: g(a, 'idx'), planTypeName: g(a, 'plan_type_name'), ptpNo: g(a, 'ptp_no'),
    splySpc: g(a, 'sply_spc'), exclsSpc: g(a, 'excls_spc'), ctrtSpc: g(a, 'ctrt_spc'),
    roomCnt: g(a, 'room_cnt'), bathroomCnt: g(a, 'bathroom_cnt'), inUse: g(a, 'in_use') || 'Y',
  });
  const delArea = async (a) => {
    if (!confirm('면적(평형)을 삭제할까요?')) return;
    try { await api.del(`/api/admin/danji/area/${g(a, 'idx')}`); const r = await api.get(`/api/admin/danji/${encodeURIComponent(g(detail, 'naver_danji_code'))}/area`); setAreas(r?.items || []); }
    catch { alert('삭제 실패'); }
  };

  // ── 호 ──
  const saveHo = async () => {
    const code = g(detail, 'naver_danji_code');
    const gubun = (hoForm.hoGubun || '').trim() || '일반';
    const special = gubun !== '일반'; // 일반 외(상가/필로티/기타/직접입력): 라인·층만, 호/타입/면적 미입력
    let hoNumber = String(hoForm.hoNumber || '').trim();
    if (special) {
      // 호번호/타입 미입력 → (층·라인)으로 내부 식별용 호번호 자동부여
      if (!hoForm.dongNo || String(hoForm.lineNo).trim() === '' || String(hoForm.floor).trim() === '') { alert(`${gubun}는 동·라인·층을 입력하세요.`); return; }
      if (!hoNumber) hoNumber = `${String(hoForm.floor).trim()}${String(hoForm.lineNo).trim().padStart(2, '0')}`;
    } else if (!hoForm.dongNo || !hoNumber) { alert('동/호를 입력하세요.'); return; }
    const body = {
      NaverDanjiCode: code, DongNo: hoForm.dongNo, HoNumber: hoNumber, HoName: special ? '' : hoForm.hoName,
      PtpNo: special ? '' : hoForm.ptpNo, PtpName: special ? '' : hoForm.ptpName, Floor: hoForm.floor,
      SplySpc: special ? '' : hoForm.splySpc, ExclsSpc: special ? '' : hoForm.exclsSpc, CtrtSpc: special ? '' : hoForm.ctrtSpc,
      HoGubun: gubun, LineNo: hoForm.lineNo,
    };
    try { await api.post('/api/admin/danji/ho', body); setHoForm(null); reloadHos(code); }
    catch { alert('저장 실패'); }
  };
  const editHo = (h) => setHoForm({
    dongNo: g(h, 'dong_no'), hoNumber: g(h, 'ho_number'), hoName: g(h, 'ho_name'), ptpNo: g(h, 'ptp_no'),
    ptpName: g(h, 'ptp_name'), floor: g(h, 'floor'), splySpc: g(h, 'sply_spc'), exclsSpc: g(h, 'excls_spc'), ctrtSpc: g(h, 'ctrt_spc'),
    hoGubun: g(h, 'ho_gubun') || (g(h, 'store_yn') === 'Y' ? '상가' : g(h, 'piloti_yn') === 'Y' ? '필로티' : '일반'), lineNo: g(h, 'line_no'),
  });
  const delHo = async (h) => {
    if (!confirm('호를 삭제할까요?')) return;
    const code = g(detail, 'naver_danji_code');
    try { await api.del(`/api/admin/danji/ho?naverCode=${encodeURIComponent(code)}&dongNo=${encodeURIComponent(g(h, 'dong_no'))}&hoNumber=${encodeURIComponent(g(h, 'ho_number'))}`); const r = await api.get(`/api/admin/danji/${encodeURIComponent(code)}/ho`); setHos(r?.items || []); }
    catch { alert('삭제 실패'); }
  };

  const inp = { width: '100%', boxSizing: 'border-box' };
  const cardHead = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #e5e7eb' };
  const overlay = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
  const modalBox = { background: '#fff', borderRadius: '8px', padding: '16px', minWidth: '440px', maxWidth: '92vw', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' };

  // 공통 입력 행: [라벨 | 입력창]
  const fRow = { display: 'flex', alignItems: 'center', gap: '6px' };
  const fLbl = { width: '84px', flexShrink: 0, fontSize: '13px', fontWeight: 700, color: '#334155', textAlign: 'right' };
  const fInp = { flex: 1, minWidth: 0, boxSizing: 'border-box' };
  const Field = ({ label, children }) => (
    <label style={fRow}><span style={fLbl}>{label}</span>{children}</label>
  );

  // 동 입력 필드(목록·배치도 공용) — 라벨|입력창
  const dongFields = () => (
    <>
      <Field label="동번호"><input style={fInp} value={dongForm.dongNo} onChange={(e) => setDongForm({ ...dongForm, dongNo: e.target.value })} /></Field>
      <Field label="동이름"><input style={fInp} placeholder="예: 101" value={dongForm.dongName} onChange={(e) => setDongForm({ ...dongForm, dongName: e.target.value })} /></Field>
      <Field label="최고층"><input style={fInp} value={dongForm.highestFloorCnt} onChange={(e) => setDongForm({ ...dongForm, highestFloorCnt: e.target.value })} /></Field>
      <Field label="향(코드)"><input style={fInp} value={dongForm.directionTypeCode} onChange={(e) => setDongForm({ ...dongForm, directionTypeCode: e.target.value })} /></Field>
      <Field label="출입구유형"><input style={fInp} value={dongForm.entranceTypeCd} onChange={(e) => setDongForm({ ...dongForm, entranceTypeCd: e.target.value })} /></Field>
      <Field label="사용여부"><select style={fInp} value={dongForm.inUse} onChange={(e) => setDongForm({ ...dongForm, inUse: e.target.value })}><option value="Y">사용</option><option value="N">미사용</option></select></Field>
    </>
  );
  // 호 입력 필드(목록·배치도 공용) — 라벨|입력창
  const hoFields = () => {
    const rawGubun = hoForm.hoGubun ?? '일반';
    const selValue = HO_GUBUN_FIXED.includes(rawGubun) ? rawGubun : '직접입력';
    const special = rawGubun !== '일반';
    return (
      <>
        <Field label="동">
          <select style={fInp} value={String(hoForm.dongNo ?? '')} onChange={(e) => setHoForm({ ...hoForm, dongNo: e.target.value })}>
            <option value="">선택</option>
            {dongList.map((d, i) => {
              const no = String(g(d, 'dong_no'));
              return <option key={i} value={no}>{g(d, 'dong_name') ? `${g(d, 'dong_name')}동` : `${no}동`}</option>;
            })}
          </select>
        </Field>
        <Field label="구분"><select style={fInp} value={selValue} onChange={(e) => { const v = e.target.value; setHoForm({ ...hoForm, hoGubun: v === '직접입력' ? '' : v }); }}><option value="일반">일반</option><option value="상가">상가</option><option value="필로티">필로티</option><option value="기타">기타</option><option value="직접입력">직접입력</option></select></Field>
        {selValue === '직접입력' && <Field label="구분명"><input style={fInp} placeholder="직접입력" value={hoForm.hoGubun} onChange={(e) => setHoForm({ ...hoForm, hoGubun: e.target.value })} /></Field>}
        <Field label="라인번호"><input style={fInp} value={hoForm.lineNo} onChange={(e) => setHoForm({ ...hoForm, lineNo: e.target.value })} /></Field>
        <Field label="층"><input style={fInp} value={hoForm.floor} onChange={(e) => setHoForm({ ...hoForm, floor: e.target.value })} /></Field>
        {/* 필로티·상가는 호번호/타입/면적 미입력 */}
        {!special && <Field label="호"><input style={fInp} value={hoForm.hoNumber} onChange={(e) => setHoForm({ ...hoForm, hoNumber: e.target.value })} /></Field>}
        {!special && <Field label="호명"><input style={fInp} placeholder="층호코드" value={hoForm.hoName} onChange={(e) => setHoForm({ ...hoForm, hoName: e.target.value })} /></Field>}
        {!special && <Field label="타입명"><input style={fInp} value={hoForm.ptpName} onChange={(e) => setHoForm({ ...hoForm, ptpName: e.target.value })} /></Field>}
        {!special && <Field label="공급면적"><input style={fInp} value={hoForm.splySpc} onChange={(e) => setHoForm({ ...hoForm, splySpc: e.target.value })} /></Field>}
        {!special && <Field label="전용면적"><input style={fInp} value={hoForm.exclsSpc} onChange={(e) => setHoForm({ ...hoForm, exclsSpc: e.target.value })} /></Field>}
        {!special && <Field label="계약면적"><input style={fInp} value={hoForm.ctrtSpc} onChange={(e) => setHoForm({ ...hoForm, ctrtSpc: e.target.value })} /></Field>}
      </>
    );
  };

  // 배치도(동별 층×호 그리드) — LayoutView.jsx 참고. 셀 클릭 시 호 수정.
  const renderLayout = () => {
    if (!detail) return <div className="card" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>상단 목록에서 단지를 선택하세요.</div>;
    const dongNos = dongList.length
      ? dongList.map((d) => String(g(d, 'dong_no')))
      : [...new Set(hos.map((h) => String(g(h, 'dong_no'))))].filter(Boolean).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
    const dongNameOf = (no) => { const d = dongList.find((x) => String(g(x, 'dong_no')) === String(no)); return (d && g(d, 'dong_name')) ? `${g(d, 'dong_name')}동` : `${no}동`; };
    const parseHo = (h) => {
      const s = String(g(h, 'ho_name') || g(h, 'ho_number') || '');
      const unit = s.length >= 3 ? s.slice(-2) : s;                        // 라인(호수 뒤 2자리)
      const fl = g(h, 'floor');
      const floor = (fl !== '' && fl != null) ? String(fl) : (s.length >= 3 ? s.slice(0, -2) : '');
      return { floor, unit };
    };
    return (
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => runSync('all')} disabled={syncing}>{syncing ? 'DB 동기화중…' : 'DB 동기화'}</button>
          <button className="btn primary" onClick={() => setHoForm({ ...EMPTY_HO })}>＋ 호 추가</button>
          <span style={{ width: '1px', alignSelf: 'stretch', background: '#e5e7eb', margin: '0 2px' }} />
          {!unionMode ? (
            <button className="btn" style={{ borderColor: '#c4b5fd', color: '#6d28d9', fontWeight: 700 }}
              onClick={() => { setUnionMode(true); setUnionSel({}); }}>조합원 복수 설정</button>
          ) : (
            <>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#6d28d9', whiteSpace: 'nowrap' }}>
                조합원분 설정할 호 선택 ({Object.keys(unionSel).length}개)
              </span>
              <button className="btn" style={{ background: '#8b5cf6', color: 'white', border: 'none', fontWeight: 700 }} onClick={() => applyUnion(true)}>선택 조합원분 설정</button>
              <button className="btn" style={{ borderColor: '#cbd5e1', fontWeight: 700 }} onClick={() => applyUnion(false)}>선택 조합원분 해제</button>
              <button className="btn" onClick={() => { setUnionMode(false); setUnionSel({}); }}>취소</button>
            </>
          )}
        </div>
        {/* 범례: 조합원분 = 호 글자 밑줄(보라) */}
        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 800, color: '#111827', borderBottom: '3px solid #8b5cf6', paddingBottom: '1px', lineHeight: 1.1 }}>123호</span>
          조합원분 (호 글자 밑줄)
        </div>
        {dongNos.length === 0 ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>동/호 데이터가 없습니다. <b>DB 동기화</b>로 동 정보를 수집하세요.</div>
        ) : (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', overflowX: 'auto', paddingBottom: '8px' }}>
            {dongNos.map((no) => {
              const dhos = hos.filter((h) => String(g(h, 'dong_no')) === String(no)).map((h) => {
                const p = parseHo(h);
                const line = String(g(h, 'line_no'));
                // 열(라인) 기준: line_no 있으면 그것, 없으면 호수의 뒤 2자리(라인)
                const gubun = g(h, 'ho_gubun') || (String(g(h, 'store_yn') || '').toUpperCase() === 'Y' ? '상가' : String(g(h, 'piloti_yn') || '').toUpperCase() === 'Y' ? '필로티' : '일반');
                return { raw: h, floor: p.floor, unit: p.unit, col: line !== '' ? line : p.unit, gubun, special: gubun !== '일반' };
              });
              const floors = [...new Set(dhos.map((x) => x.floor).filter(Boolean))].sort((a, b) => (parseInt(b) || 0) - (parseInt(a) || 0));
              const cols = [...new Set(dhos.map((x) => x.col).filter((v) => v !== ''))].sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
              const cellAt = (fl, col) => dhos.find((x) => x.floor === fl && x.col === col);
              // 라인(열)별 (타입,면적) 조합 수집 — 한 라인에 타입이 여러 개면 모두 표기(중복 제거)
              const colCombos = (col) => {
                const seen = new Set(); const out = [];
                for (const fl of floors) {
                  const x = cellAt(fl, col);
                  if (!x || x.special) continue;
                  const typ = g(x.raw, 'ptp_name') || '';
                  const areaVal = g(x.raw, 'excls_spc');
                  const area = areaVal ? `${areaVal}㎡` : '';
                  if (!typ && !area) continue;
                  const key = `${typ}|${area}`;
                  if (seen.has(key)) continue;
                  seen.add(key); out.push({ typ, area });
                }
                return out;
              };
              const dongRow = dongList.find((x) => String(g(x, 'dong_no')) === String(no));
              const emptyTd = { border: '1px solid #e0e0e0', minWidth: '54px', height: '36px', background: '#f9f9f9' };
              const renderCell = (x, key) => {
                if (!x) return <td key={key} style={emptyTd} />;
                if (x.special) {
                  const label = x.gubun === '필로티' ? '필로티' : x.gubun === '상가' ? '상가층' : x.gubun;
                  const bg = x.gubun === '필로티'
                    ? 'repeating-linear-gradient(45deg,#eef2f7,#eef2f7 6px,#e2e8f0 6px,#e2e8f0 12px)'
                    : x.gubun === '상가'
                      ? 'repeating-linear-gradient(45deg,#fef3c7,#fef3c7 6px,#fde68a 6px,#fde68a 12px)'
                      : 'repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9 6px,#e2e8f0 6px,#e2e8f0 12px)';
                  const color = x.gubun === '상가' ? '#92400e' : '#334155';
                  return (
                    <td key={key} onClick={() => editHo(x.raw)} title={`${x.gubun} (클릭하여 수정)`}
                      style={{ border: '1px solid #e0e0e0', padding: 0, cursor: 'pointer', minWidth: '54px', height: '36px', background: bg }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontWeight: 800, fontSize: '13px', color, wordBreak: 'keep-all', textAlign: 'center' }}>{label}</div>
                    </td>
                  );
                }
                const cTyp = g(x.raw, 'ptp_name') || '';
                const cSup = g(x.raw, 'sply_spc');
                const cExc = g(x.raw, 'excls_spc');
                const hoNo = g(x.raw, 'ho_number');
                const ukey = `${no}|${hoNo}`;
                const isUnion = unionSet.has(ukey);                 // 조합원분(off_no=0)
                const isSel = !!unionSel[ukey];                     // 복수설정 선택
                const cTitle = unionMode
                  ? '클릭하여 조합원분 선택/해제'
                  : [
                      cTyp ? `타입: ${cTyp}` : '',
                      cSup ? `공급면적: ${cSup}㎡` : '',
                      cExc ? `전용면적: ${cExc}㎡` : '',
                      isUnion ? '조합원분' : '',
                      '클릭하여 수정',
                    ].filter(Boolean).join('\n');
                return (
                  <td key={key}
                    onClick={() => unionMode ? toggleUnionSel(no, hoNo, x.floor) : editHo(x.raw)}
                    title={cTitle}
                    style={{ border: isSel ? '2px solid #8b5cf6' : '1px solid #e0e0e0', padding: '2px 4px', textAlign: 'center', cursor: 'pointer', fontSize: '13px', minWidth: '54px', height: '36px', background: isSel ? '#ede9fe' : '#fff', lineHeight: 1.2 }}>
                    <div style={{ fontWeight: 700, ...(isUnion ? { display: 'inline-block', borderBottom: '3px solid #8b5cf6', paddingBottom: '1px' } : {}) }}>
                      {g(x.raw, 'ho_name') || hoNo}
                    </div>
                    {cTyp ? <div style={{ fontSize: '13px', color: '#4f46e5' }}>{cTyp}</div> : null}
                  </td>
                );
              };
              return (
                <div key={no} style={{ flex: '0 0 auto' }}>
                  <table style={{ borderCollapse: 'collapse', border: '1px solid #e0e0e0' }}>
                    <thead>
                      <tr>
                        <td colSpan={cols.length + 1} style={{ padding: '4px 8px', background: '#f5f5f5', border: '1px solid #e0e0e0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <b style={{ fontSize: '14px' }}>{dongNameOf(no)}</b>
                            {dongRow && (
                              <span style={{ whiteSpace: 'nowrap' }}>
                                <button className="btn" style={{ padding: '2px 8px' }} onClick={() => editDong(dongRow)}>수정</button>{' '}
                                <button className="btn danger" style={{ padding: '2px 8px' }} onClick={() => delDong(dongRow)}>삭제</button>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    </thead>
                    <tbody>
                      {/* 최고층 위: 라인별 타입/면적 표기 행(타입 여러 개면 모두) */}
                      {floors.length > 0 && (
                        <tr>
                          <td style={{ border: '1px solid #e0e0e0', padding: '4px 6px', textAlign: 'center', fontWeight: 700, background: '#eef2ff', fontSize: '13px', color: '#4f46e5', whiteSpace: 'nowrap' }}>타입/면적</td>
                          {cols.map((col) => {
                            const combos = colCombos(col);
                            return (
                              <td key={`t${col}`} style={{ border: '1px solid #e0e0e0', padding: '4px 6px', textAlign: 'center', background: '#eef2ff', fontSize: '13px', color: '#334155', minWidth: '54px' }}>
                                {combos.map((cb, i) => (
                                  <div key={i} style={{ marginTop: i > 0 ? '4px' : 0, paddingTop: i > 0 ? '4px' : 0, borderTop: i > 0 ? '1px dashed #c7d2fe' : 'none' }}>
                                    {cb.typ ? <div style={{ fontWeight: 700 }}>{cb.typ}</div> : null}
                                    {cb.area ? <div>{cb.area}</div> : null}
                                  </div>
                                ))}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                      {floors.length === 0 ? (
                        <tr><td style={{ padding: '12px', color: '#999', border: '1px solid #e0e0e0' }}>호 없음</td></tr>
                      ) : floors.map((fl) => (
                        <tr key={fl}>
                          <td style={{ border: '1px solid #e0e0e0', padding: '4px 8px', textAlign: 'center', fontWeight: 700, background: '#fafafa', fontSize: '13px' }}>{fl}층</td>
                          {cols.map((col) => renderCell(cellAt(fl, col), `c${col}`))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px' }}>단지관리</h1>

      {/* 법정동 select + 검색 */}
      <div style={{ display: 'flex', gap: '8px', margin: '0 0 8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={sido} onChange={(e) => onSido(e.target.value)} style={{ minWidth: '120px' }}>
          <option value="">시/도</option>
          {sidos.map((s, i) => <option key={i} value={g(s, 'BjdCode')}>{g(s, 'SidoName')}</option>)}
        </select>
        <select value={sigungu} onChange={(e) => onSigungu(e.target.value)} disabled={!sido} style={{ minWidth: '140px' }}>
          <option value="">시/군/구</option>
          {sigungus.map((s, i) => <option key={i} value={g(s, 'BjdCode')}>{g(s, 'SigunguName')} {g(s, 'SigunguName2')}</option>)}
        </select>
        <select value={bjd} onChange={(e) => setBjd(e.target.value)} disabled={!sigungu} style={{ minWidth: '140px' }}>
          <option value="">법정동</option>
          {dongs.map((s, i) => <option key={i} value={g(s, 'BjdCode')}>{g(s, 'BjdName')}</option>)}
        </select>
        <select value={hscpType} onChange={(e) => setHscpType(e.target.value)} style={{ minWidth: '130px' }}>
          <option value="">유형 전체</option>
          {Object.entries(HSCP_LABEL).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadDanjis(1)} placeholder="단지명·네이버코드" style={{ width: '200px' }} />
        <button className="btn primary" onClick={() => loadDanjis(1)}>검색</button>
        <button className="btn" onClick={addDanji}>＋ 단지 등록</button>
        {/* 뷰 전환: 목록 / 배치도 */}
        <div style={{ marginLeft: 'auto', display: 'inline-flex', border: '1px solid #c7d2fe', borderRadius: '6px', overflow: 'hidden' }}>
          <button className="btn" onClick={() => setViewMode('list')}
            style={{ borderRadius: 0, border: 'none', background: viewMode === 'list' ? '#4f46e5' : 'white', color: viewMode === 'list' ? 'white' : '#4f46e5', fontWeight: 700 }}>목록으로 보기</button>
          <button className="btn" onClick={() => setViewMode('layout')}
            style={{ borderRadius: 0, border: 'none', borderLeft: '1px solid #c7d2fe', background: viewMode === 'layout' ? '#4f46e5' : 'white', color: viewMode === 'layout' ? 'white' : '#4f46e5', fontWeight: 700 }}>배치도로 보기</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* 상단 섹션: 단지 목록 + 페이징 */}
        <div>
          <div className="card" style={{ padding: 0, overflow: 'auto', maxHeight: '30vh' }}>
            <table>
              <thead><tr><th>단지명</th><th>유형</th><th>세대</th><th>층</th><th>네이버코드</th><th>최근수정일</th></tr></thead>
              <tbody>
                {danjis.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '16px' }}>단지 없음</td></tr>
                  : danjis.map((r, i) => (
                    <tr key={i} style={{ cursor: 'pointer', background: sel && g(sel, 'id') === g(r, 'id') ? '#eef2ff' : undefined }} onClick={() => openDanji(r)}>
                      <td>{g(r, 'building_name')}</td>
                      <td>{HSCP_LABEL[g(r, 'hscp_type_code')] || g(r, 'hscp_type_code') || '-'}</td>
                      <td>{g(r, 'family_cnt')}</td>
                      <td>{g(r, 'min_floor')}~{g(r, 'max_floor')}</td>
                      <td>{g(r, 'naver_danji_code')}</td>
                      <td>{fmtDt(g(r, 'last_modified'))}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginTop: '6px' }}>
            <button className="btn" disabled={page <= 1} onClick={() => loadDanjis(page - 1)}>이전</button>
            <span style={{ fontSize: '14px', fontWeight: 700 }}>{page} / {totalPages}</span>
            <button className="btn" disabled={page >= totalPages} onClick={() => loadDanjis(page + 1)}>다음</button>
          </div>
        </div>

        {/* 하단 섹션: 목록으로 보기(카드) / 배치도로 보기(그리드) */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {viewMode === 'layout' ? renderLayout() : !detail && !danjiForm ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>단지를 선택하거나 <b>단지 등록</b>을 눌러주세요.</div>
          ) : (
            <>
              {/* 상단: 단지 기본정보 + 면적정보 나란히 */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* 단지 기본정보 카드 */}
              <div className="card" style={{ padding: 0, flex: '1 1 440px', minWidth: 0 }}>
                <div style={cardHead}>
                  <span style={{ display: 'flex', alignItems: 'center' }}><b>단지 기본정보</b><span style={{ marginLeft: '8px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>최근수정 {fmtDt(maxDt(modified?.dong, modified?.area, modified?.ho))}</span></span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {!danjiForm && detail && g(detail, 'naver_danji_code') && (
                      <a className="btn" href={`http://new.land.naver.com/complexes/${g(detail, 'naver_danji_code')}`} target="_blank" rel="noopener noreferrer"
                        style={{ padding: '4px 10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>네이버에서 보기</a>
                    )}
                    {!danjiForm && detail && <button className="btn" style={{ padding: '4px 10px' }} onClick={editDanji}>수정</button>}
                    {!danjiForm && detail && <button className="btn danger" style={{ padding: '4px 10px' }} onClick={delDanji}>삭제</button>}
                  </div>
                </div>
                {danjiForm ? (
                  <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px 12px' }}>
                    <Field label="단지명"><input style={fInp} value={danjiForm.buildingName} onChange={(e) => setDanjiForm({ ...danjiForm, buildingName: e.target.value })} /></Field>
                    <Field label="네이버코드">
                      <span style={{ display: 'flex', gap: '4px', flex: 1, minWidth: 0 }}>
                        <input style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }} value={danjiForm.naverDanjiCode} onChange={(e) => setDanjiForm({ ...danjiForm, naverDanjiCode: e.target.value })} />
                        <button type="button" className="btn primary" style={{ padding: '2px 8px', whiteSpace: 'nowrap' }} onClick={loadDanjiFromNaver} disabled={naverLoading}>{naverLoading ? '불러오는중…' : '불러오기'}</button>
                      </span>
                    </Field>
                    <Field label="법정동코드"><input style={fInp} value={danjiForm.bjdCode} onChange={(e) => setDanjiForm({ ...danjiForm, bjdCode: e.target.value })} /></Field>
                    <Field label="지번주소"><input style={fInp} value={danjiForm.addressBunji} onChange={(e) => setDanjiForm({ ...danjiForm, addressBunji: e.target.value })} /></Field>
                    <Field label="세대수"><input style={fInp} value={danjiForm.familyCnt} onChange={(e) => setDanjiForm({ ...danjiForm, familyCnt: e.target.value })} /></Field>
                    <Field label="동수"><input style={fInp} value={danjiForm.totBldCnt} onChange={(e) => setDanjiForm({ ...danjiForm, totBldCnt: e.target.value })} /></Field>
                    <Field label="최저층"><input style={fInp} value={danjiForm.minFloor} onChange={(e) => setDanjiForm({ ...danjiForm, minFloor: e.target.value })} /></Field>
                    <Field label="최고층"><input style={fInp} value={danjiForm.maxFloor} onChange={(e) => setDanjiForm({ ...danjiForm, maxFloor: e.target.value })} /></Field>
                    <Field label="사용승인일"><input style={fInp} value={danjiForm.approveDate} onChange={(e) => setDanjiForm({ ...danjiForm, approveDate: e.target.value })} /></Field>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button className="btn" onClick={() => setDanjiForm(null)}>취소</button>
                      <button className="btn primary" onClick={saveDanji}>저장</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px 16px', fontSize: '14px' }}>
                    <div><b>단지명</b> {g(detail, 'building_name') || '-'}</div>
                    <div><b>단지유형</b> {HSCP_LABEL[g(detail, 'hscp_type_code')] || g(detail, 'hscp_type_code') || '-'}</div>
                    <div><b>네이버코드</b> {g(detail, 'naver_danji_code') || '-'}</div>
                    <div><b>법정동코드</b> {g(detail, 'bjd_code') || '-'}</div>
                    <div style={{ gridColumn: '1 / -1' }}><b>지번주소</b> {g(detail, 'address_bunji') || '-'}</div>
                    <div><b>세대수</b> {g(detail, 'family_cnt') || '-'}</div>
                    <div><b>동수</b> {g(detail, 'tot_bld_cnt') || '-'}</div>
                    <div><b>층</b> {g(detail, 'min_floor')}~{g(detail, 'max_floor')}</div>
                    <div><b>사용승인일</b> {g(detail, 'approve_date') || '-'}</div>
                  </div>
                )}
              </div>

              {/* 면적정보 카드 */}
              {detail && (
              <div className="card" style={{ padding: 0, flex: '1 1 440px', minWidth: 0 }}>
                <div style={cardHead}>
                  <span style={{ display: 'flex', alignItems: 'center' }}><b>면적정보 (평형)</b><span style={{ marginLeft: '8px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>최근수정 {fmtDt(modified?.area)}</span></span>
                  <button className="btn" style={{ padding: '4px 10px' }} onClick={() => runSync('area')} disabled={syncing}>{syncing ? 'DB 동기화중…' : 'DB 동기화'}</button>
                </div>
                <table>
                  <thead><tr><th>평형명</th><th>타입</th><th>공급</th><th>전용</th><th>방/욕실</th><th>사용</th><th>관리</th></tr></thead>
                  <tbody>
                    {areas.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>면적 데이터 없음</td></tr>
                      : areas.map((a, i) => (
                        <tr key={i}>
                          <td>{g(a, 'plan_type_name')}</td><td>{g(a, 'ptp_no')}</td><td>{g(a, 'sply_spc')}</td><td>{g(a, 'excls_spc')}</td>
                          <td>{g(a, 'room_cnt')}/{g(a, 'bathroom_cnt')}</td><td>{g(a, 'in_use')}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button className="btn" style={{ padding: '2px 8px' }} onClick={() => editArea(a)}>수정</button>{' '}
                            <button className="btn danger" style={{ padding: '2px 8px' }} onClick={() => delArea(a)}>삭제</button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              )}
              </div>{/* /상단 나란히 */}

              {detail && (
              <>
              {/* 동 목록 카드 (danji_dong_new) */}
              <div className="card" style={{ padding: 0 }}>
                <div style={cardHead}>
                  <span style={{ display: 'flex', alignItems: 'center' }}><b>동 목록</b><span style={{ marginLeft: '8px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>최근수정 {fmtDt(modified?.dong)}</span></span>
                  <button className="btn" style={{ padding: '4px 10px' }} onClick={() => runSync('dong')} disabled={syncing}>{syncing ? 'DB 동기화중…' : 'DB 동기화'}</button>
                </div>
                <table>
                  <thead><tr><th>동번호</th><th>동이름</th><th>최고층</th><th>사용</th><th>관리</th></tr></thead>
                  <tbody>
                    {dongList.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>동 데이터 없음</td></tr>
                      : dongList.map((d, i) => (
                        <tr key={i}>
                          <td>{g(d, 'dong_no')}</td><td>{g(d, 'dong_name')}</td><td>{g(d, 'highest_floor_cnt')}</td><td>{g(d, 'in_use')}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button className="btn" style={{ padding: '2px 8px' }} onClick={() => editDong(d)}>수정</button>{' '}
                            <button className="btn danger" style={{ padding: '2px 8px' }} onClick={() => delDong(d)}>삭제</button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* 호정보 카드 */}
              <div className="card" style={{ padding: 0 }}>
                <div style={cardHead}>
                  <span style={{ display: 'flex', alignItems: 'center' }}><b>호정보 (세대)</b><span style={{ marginLeft: '8px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>최근수정 {fmtDt(modified?.ho)}</span></span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn" style={{ padding: '4px 10px' }} onClick={() => runSync('ho')} disabled={syncing}>{syncing ? 'DB 동기화중…' : 'DB 동기화'}</button>
                    <button className="btn primary" style={{ padding: '4px 10px' }} onClick={() => setHoForm({ ...EMPTY_HO })}>＋ 호 추가</button>
                  </div>
                </div>
                <table>
                  <thead><tr><th>동</th><th>호</th><th>타입</th><th>층</th><th>공급</th><th>전용</th><th>관리</th></tr></thead>
                  <tbody>
                    {hos.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>호 데이터 없음</td></tr>
                      : hos.map((h, i) => (
                        <tr key={i}>
                          <td>{g(h, 'dong_name') ? `${g(h, 'dong_name')}동` : (g(h, 'dong_no') ? `${g(h, 'dong_no')}동` : '-')}</td><td>{g(h, 'ho_name') || g(h, 'ho_number')}</td><td>{g(h, 'ptp_name')}</td><td>{g(h, 'floor')}</td>
                          <td>{g(h, 'sply_spc')}</td><td>{g(h, 'excls_spc')}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button className="btn" style={{ padding: '2px 8px' }} onClick={() => editHo(h)}>수정</button>{' '}
                            <button className="btn danger" style={{ padding: '2px 8px' }} onClick={() => delHo(h)}>삭제</button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              </>
              )}
            </>
          )}
        </div>
      </div>

      {/* 동/호/면적 등록·수정 모달 (목록·배치도 공용) */}
      {dongForm && (
        <div style={overlay} onClick={() => setDongForm(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <b style={{ fontSize: '15px' }}>동 정보</b>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px 12px', marginTop: '12px' }}>{dongFields()}</div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between', marginTop: '14px' }}>
              <span>{dongForm.dongNo ? <button className="btn danger" onClick={async () => { await delDong({ dong_no: dongForm.dongNo }); setDongForm(null); }}>삭제</button> : null}</span>
              <span style={{ display: 'flex', gap: '6px' }}>
                <button className="btn" onClick={() => setDongForm(null)}>취소</button>
                <button className="btn primary" onClick={saveDong}>저장</button>
              </span>
            </div>
          </div>
        </div>
      )}
      {hoForm && (
        <div style={overlay} onClick={() => setHoForm(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <b style={{ fontSize: '15px' }}>호 정보</b>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px 12px', marginTop: '12px' }}>{hoFields()}</div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between', marginTop: '14px' }}>
              <span>{hoForm.hoNumber ? <button className="btn danger" onClick={async () => { await delHo({ dong_no: hoForm.dongNo, ho_number: hoForm.hoNumber }); setHoForm(null); }}>삭제</button> : null}</span>
              <span style={{ display: 'flex', gap: '6px' }}>
                <button className="btn" onClick={() => setHoForm(null)}>취소</button>
                <button className="btn primary" onClick={saveHo}>저장</button>
              </span>
            </div>
          </div>
        </div>
      )}
      {areaForm && (
        <div style={overlay} onClick={() => setAreaForm(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <b style={{ fontSize: '15px' }}>면적(평형) 정보</b>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px 12px', marginTop: '12px' }}>
              <Field label="평형명"><input style={fInp} value={areaForm.planTypeName} onChange={(e) => setAreaForm({ ...areaForm, planTypeName: e.target.value })} /></Field>
              <Field label="타입번호"><input style={fInp} value={areaForm.ptpNo} onChange={(e) => setAreaForm({ ...areaForm, ptpNo: e.target.value })} /></Field>
              <Field label="공급면적"><input style={fInp} value={areaForm.splySpc} onChange={(e) => setAreaForm({ ...areaForm, splySpc: e.target.value })} /></Field>
              <Field label="전용면적"><input style={fInp} value={areaForm.exclsSpc} onChange={(e) => setAreaForm({ ...areaForm, exclsSpc: e.target.value })} /></Field>
              <Field label="계약면적"><input style={fInp} value={areaForm.ctrtSpc} onChange={(e) => setAreaForm({ ...areaForm, ctrtSpc: e.target.value })} /></Field>
              <Field label="방수"><input style={fInp} value={areaForm.roomCnt} onChange={(e) => setAreaForm({ ...areaForm, roomCnt: e.target.value })} /></Field>
              <Field label="욕실수"><input style={fInp} value={areaForm.bathroomCnt} onChange={(e) => setAreaForm({ ...areaForm, bathroomCnt: e.target.value })} /></Field>
              <Field label="사용여부"><select style={fInp} value={areaForm.inUse} onChange={(e) => setAreaForm({ ...areaForm, inUse: e.target.value })}><option value="Y">사용</option><option value="N">미사용</option></select></Field>
            </div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button className="btn" onClick={() => setAreaForm(null)}>취소</button>
              <button className="btn primary" onClick={saveArea}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function numOrNull(v) { if (v === '' || v == null) return null; const n = Number(String(v).replace(/[^0-9.-]/g, '')); return isNaN(n) ? null : n; }
