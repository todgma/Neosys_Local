import React, { useState, useEffect, useMemo } from 'react';
import { layoutService } from '../../services/layoutService';
import { propertyService } from '../../services/propertyService';
import { useAuthStore } from '../../stores/authStore';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { parseDivCode } from '../../constants/tradeDivisions';

// 점유상태 메타(색/라벨).
// - 매매/전세/월세: 물건등록폼(거래구분 sale_div)에 따라 자동표기(읽기전용). 수동 입력 불가.
// - 조합원분: 배치도에서 직접 입력하는 유일한 수동 점유상태.
const STATUS_META = [
  { value: 'SALE', label: '매매', color: '#EF4444' },
  { value: 'JEONSE', label: '전세', color: '#3B82F6' },
  { value: 'MONTHLY', label: '월세', color: '#F59E0B' },
  { value: 'ETCLEASE', label: '기타임대', color: '#10B981' },
  { value: 'UNION', label: '조합원분', color: '#8B5CF6' }
];
// 물건등록폼(sale_div)에서 자동으로 표기되는 상태값
const AUTO_STATUS_VALUES = ['SALE', 'JEONSE', 'MONTHLY', 'ETCLEASE'];
// 배치도에서 수동 입력 가능한 상태값(모달 체크박스)
const MANUAL_STATUS_VALUES = ['UNION'];
const MANUAL_STATUSES = STATUS_META.filter(s => MANUAL_STATUS_VALUES.includes(s.value));
// 물건 거래구분(sale_div) 코드 -> 자동 점유상태
const SALEDIV_TO_STATUS = { SALEDIV01: 'SALE', SALEDIV02: 'JEONSE', SALEDIV03: 'MONTHLY', SALEDIV04: 'ETCLEASE' };

const statusColor = (v) => STATUS_META.find(s => s.value === v)?.color || '#9ca3af';
const statusLabelOf = (v) => STATUS_META.find(s => s.value === v)?.label || v;
// 상태값 배열을 중복 제거 + STATUS_META 순서로 정렬
const orderStatuses = (arr) =>
  [...new Set(arr)].sort((a, b) => STATUS_META.findIndex(s => s.value === a) - STATUS_META.findIndex(s => s.value === b));

const LayoutView = ({ selectedDanji, onClose }) => {
  const { user } = useAuthStore();
  const [dongList, setDongList] = useState([]);
  const [selectedDongs, setSelectedDongs] = useState([]);
  // 점유상태 필터(빈 배열=전체). 선택된 상태의 호수만 남기고 나머지는 빈 칸(빵꾸)으로 표시
  const [statusFilter, setStatusFilter] = useState([]);
  // 타입 필터(상단 타입 클릭). 선택된 타입 호수만 남기고 나머지는 빈 칸(빵꾸)
  const [typeFilter, setTypeFilter] = useState([]);
  const toggleTypeFilter = (typ) => { if (!typ) return; setTypeFilter((prev) => prev.includes(typ) ? prev.filter((t) => t !== typ) : [...prev, typ]); };
  const [layoutData, setLayoutData] = useState({});
  // 물건목록 기반 자동 점유상태 맵: { "동명|호명": ['SALE','JEONSE'...] } (동+호 기준, 중개사무소 단위 공유)
  const [propStatusMap, setPropStatusMap] = useState({});
  // 동+호 기준 연동 물건 맵: { "동명|호명": property } (셀 클릭 시 수정창 열기용)
  const [propByUnit, setPropByUnit] = useState({});
  // 배치도 상단 단지 헤더(아파트명/주소/세대수)
  const [danjiInfo, setDanjiInfo] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: null });
  const [formData, setFormData] = useState({
    statuses: [],
    occupancyName: '',
    occupancyPhone: '',
    memo: ''
  });

  // 배치도 내 타입 목록 — 전용면적 오름차순(대표 최소면적 기준). 상단 타입 클릭과 동일 typeFilter 사용
  const typeOptions = useMemo(() => {
    const map = new Map(); // type -> 전용면적(number)
    Object.values(layoutData).forEach((d) => (d.hoList || []).forEach((ho) => {
      const gubun = ho.hoGubun || ho.ho_gubun
        || (String(ho.storeYn || '').toUpperCase() === 'Y' ? '상가'
          : String(ho.pilotiYn || '').toUpperCase() === 'Y' ? '필로티' : '일반');
      if (gubun !== '일반') return; // 일반 호만 타입/면적 집계
      const typ = ho.ptpName || ho.aptTyp || ho.typeName || '';
      if (!typ) return;
      const area = parseFloat(ho.exclsSpc ?? ho.exclusiveArea ?? ho.splySpc ?? 0) || 0;
      if (!map.has(typ) || area < map.get(typ)) map.set(typ, area);
    }));
    return [...map.entries()].map(([type, area]) => ({ type, area })).sort((a, b) => a.area - b.area);
  }, [layoutData]);

  // 점유상태 문자열(콤마 구분) -> 배열
  const parseStatuses = (occ) => (occ?.occupancyStatus || '').split(',').map(s => s.trim()).filter(Boolean);
  // 저장된 점유상태 중 수동 입력 항목(조합원분)만 추출 (매매/전세/월세는 물건폼 자동표기라 제외)
  const manualStatusesOf = (occ) => parseStatuses(occ).filter(v => MANUAL_STATUS_VALUES.includes(v));
  // 동명+호명으로 물건목록 기반 자동 점유상태 조회 (동+호 기준 매칭)
  const autoStatusesOf = (dongName, hoName) =>
    propStatusMap[`${`${dongName ?? ''}`.trim()}|${`${hoName ?? ''}`.trim()}`] || [];

  useEffect(() => {
    if (selectedDanji?.danjiCode) {
      loadAllLayoutData();
      loadPropertyStatuses(selectedDanji.danjiCode);
    }
  }, [selectedDanji]);

  // 중개사무소 물건목록에서 단지코드로 조회 → 동/호 기준 자동 점유상태 맵 구성
  // (로그인 유저 개인이 아닌 중개사무소(off_no) 단위로 공유되도록 rtNo는 넘기지 않음)
  const loadPropertyStatuses = async (danjiCode) => {
    try {
      const res = await propertyService.getList(
        null,            // ptNo
        null,            // ptName
        1,               // page
        9999,            // pageSize (단지 전체)
        null,            // ptType
        String(danjiCode), // danjiCode(아파트번호)
        null,            // addr3
        user?.offNo,     // 중개사무소 번호(공유 단위)
        null,            // rtNo (개인 필터 미적용 → 사무소 공유)
        null, null, null, null, null, null
      );
      const list = res?.data?.ptSales || [];
      const map = {};
      const byUnit = {};
      list.forEach(p => {
        const dongName = (p.dong ?? '').toString().trim();
        const hoName = (p.ho ?? '').toString().trim();
        if (!dongName || !hoName) return;
        const key = `${dongName}|${hoName}`;
        // 동+호 기준 연동 물건(수정창 열기용) — 첫 물건 보관
        if (!byUnit[key]) byUnit[key] = p;
        (p.saleDiv || '').split(',').forEach(code => {
          // 상태(생각/예정/보류) 접미가 있어도 구분(base) 기준으로 점유상태 매핑 — null이 아니면 해당 구분으로 표기
          const parsed = parseDivCode(code);
          const st = parsed ? SALEDIV_TO_STATUS[parsed.div.base] : null;
          if (!st) return;
          if (!map[key]) map[key] = [];
          if (!map[key].includes(st)) map[key].push(st);
        });
      });
      setPropStatusMap(map);
      setPropByUnit(byUnit);
    } catch (error) {
      console.error('물건목록 기반 점유상태 조회 실패:', error);
      setPropStatusMap({});
      setPropByUnit({});
    }
  };

  const loadAllLayoutData = async () => {
    try {
      const data = await layoutService.getAllLayoutData(selectedDanji.danjiCode, user?.offNo);
      setDongList(data.dongList || []);
      setDanjiInfo(data.danjiInfo || null);

      if (data.dongList && data.dongList.length > 0) {
        setSelectedDongs(data.dongList.map(dong => dong.dongNo));
      }

      const newLayoutData = {};
      (data.layoutData || []).forEach(dongData => {
        newLayoutData[dongData.dongNo] = {
          hoList: dongData.hoList || [],
          occupancyMap: (dongData.occupancyList || []).reduce((acc, occ) => {
            acc[occ.hoNumber] = occ;
            return acc;
          }, {})
        };
      });
      setLayoutData(newLayoutData);
    } catch (error) {
      console.error('배치도 데이터 조회 실패:', error);
      setDongList([]);
    }
  };
  const handleSelectAll = () => {
    if (dongList && dongList.length > 0) {
      setSelectedDongs(dongList.map(dong => dong.dongNo));
    }
  };

  const handleDeselectAll = () => {
    setSelectedDongs([]);
  };

  const handleDongToggle = (dongNo) => {
    setSelectedDongs(prev =>
      prev.includes(dongNo)
        ? prev.filter(d => d !== dongNo)
        : [...prev, dongNo]
    );
  };

  // 셀 클릭: 연동 물건이 있으면 물건 수정창, 없으면 물건 등록창(단지/동/호 자동입력)
  const handleUnitClick = (dongNo, ho, dongName) => {
    const dName = (dongName ?? '').toString().trim();
    const hName = (ho?.hoName ?? '').toString().trim();
    const linked = propByUnit[`${dName}|${hName}`];
    if (linked?.ptNo) {
      openPropertyEdit(linked);
    } else {
      openPropertyRegister(ho, dName, hName, dongNo);
    }
  };

  // 연동 물건 수정창
  const openPropertyEdit = async (property) => {
    if (!window.electronAPI?.modal) { alert('물건 수정창을 열 수 없습니다.'); return; }
    try {
      await window.electronAPI.modal.open({
        type: 'property-form-v2',
        data: { title: `물건 수정 - ${property.ptName || '물건정보'}`, ptNo: property.ptNo },
        width: 1500, height: 900, minWidth: 1500, minHeight: 900, resizable: true,
      });
    } catch (e) {
      console.error('물건 수정창 열기 실패:', e);
    }
  };

  // 물건 등록창 (물건유형/단지/동/호/해당층/총층 자동입력 + 잠금)
  const openPropertyRegister = async (ho, dongName, hoName, dongNo) => {
    if (!window.electronAPI?.modal) { alert('물건 등록창을 열 수 없습니다.'); return; }
    const dong = dongList.find((d) => String(d.dongNo) === String(dongNo));
    const copyData = {
      ptType: 'SYCA101',                                                   // 단지(아파트) 기준
      danjiCode: String(selectedDanji?.danjiCode || ''),
      addr1: danjiInfo?.sidoName || '',                                    // 시도
      addr2: danjiInfo?.sigunguName || '',                                 // 시군구
      addr3: danjiInfo?.bjdName || '',                                     // 읍면동
      jibun: danjiInfo?.addressBunji || '',                                // 지번(자동입력)
      addr4: danjiInfo?.buildingName || selectedDanji?.danjiName || '',    // 단지명(표시용)
      bjdCode: danjiInfo?.bjdCode || selectedDanji?.bjdCode || '',         // 법정동코드(단지 드롭다운 로드용)
      dong: dongName,
      ho: hoName,
      floor1: ho?.floor ?? ho?.parsedFloor ?? '',                          // 해당층(자동)
      floor2: dong?.highestFloorCnt ?? '',                                 // 총층(자동)
      // 타입/면적 자동입력 (배치도 호 정보 기준)
      aptTyp: ho?.ptpName || ho?.aptTyp || '',                             // 타입(=plan_type_name)
      supArea: ho?.splySpc != null ? parseFloat(ho.splySpc).toFixed(2) : '', // 공급면적
      excArea: ho?.exclsSpc != null ? parseFloat(ho.exclsSpc).toFixed(2) : '', // 전용면적
    };
    try {
      await window.electronAPI.modal.open({
        type: 'property-form-v2',
        // 배치도 진입 → 소재지/물건유형/층 수정 불가
        data: { title: '물건 등록', copyData, lockAddress: true, lockType: true, lockFloor: true },
        width: 1500, height: 900, minWidth: 1500, minHeight: 900, resizable: true,
      });
    } catch (e) {
      console.error('물건 등록창 열기 실패:', e);
    }
  };

  const handleSave = async () => {
    try {
      if (!user?.offNo) { alert('중개사무소 정보가 없어 저장할 수 없습니다.'); return; }
      await layoutService.saveOccupancy({
        offNo: user.offNo,
        naverDanjiCode: selectedDanji.danjiCode,
        dongNo: selectedUnit.dongNo,
        hoNumber: selectedUnit.ho.hoNumber,
        floor: selectedUnit.ho.floor,
        occupancyStatus: formData.statuses.join(','),
        occupancyName: formData.occupancyName,
        occupancyPhone: formData.occupancyPhone,
        memo: formData.memo,
        userId: user?.userId
      });
      setShowModal(false);
      loadAllLayoutData();
    } catch (error) {
      console.error('점유현황 저장 실패:', error);
      alert('저장에 실패했습니다.');
    }
  };

  const renderAllBuildings = () => {
    if (selectedDongs.length === 0) return null;

    return (
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', paddingBottom: '20px' }}>
        {/* 1층 baseline 정렬(하단 맞춤) — 꼭대기층이 다르면 상단이 비수평. 동 헤더(타입/면적)는 sticky 고정 */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'nowrap', alignItems: 'flex-end' }}>
        {selectedDongs.map(dongNo => {
          const data = layoutData[dongNo];
          const dong = dongList.find(d => d.dongNo === dongNo);

          if (!data || !data.hoList || data.hoList.length === 0) {
            return (
              <div key={dongNo} style={{ flex: '0 0 auto' }}>
                <div style={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                  fontSize: '14px'
                }}>
                  {dong?.dongName || dongNo + '동'}
                </div>
                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  데이터 없음
                </div>
              </div>
            );
          }

          // hoName에서 층과 호수 파싱
          const parseHoName = (hoName) => {
            if (!hoName) return { floor: null, unit: null };
            // "1507" -> floor: "15", unit: "07"
            const str = String(hoName);
            if (str.length >= 3) {
              const floor = str.slice(0, -2);
              const unit = str.slice(-2);
              return { floor, unit };
            }
            return { floor: null, unit: null };
          };

          // 해당 동의 호 파싱: 층 + 라인(line_no 또는 호수 뒤 2자리) + 필로티
          const floors = new Set();
          const parsedHoList = data.hoList.map(ho => {
            const parsed = parseHoName(ho.hoName);
            const floor = String(parsed.floor || ho.floor || '');
            if (floor) floors.add(floor);
            const line = (ho.lineNo != null && String(ho.lineNo) !== '') ? String(ho.lineNo) : (parsed.unit || '');
            // 호 구분: ho_gubun(신규) 우선, 없으면 과거 pilotiYn/storeYn로 호환
            const gubun = ho.hoGubun || ho.ho_gubun
              || (String(ho.storeYn || '').toUpperCase() === 'Y' ? '상가'
                : String(ho.pilotiYn || '').toUpperCase() === 'Y' ? '필로티' : '일반');
            return { ...ho, parsedFloor: floor, parsedUnit: parsed.unit, line, gubun, special: gubun !== '일반' };
          });

          // 층 내림차순(최상층부터)
          const sortedFloors = Array.from(floors).sort((a, b) => (parseInt(b) || 0) - (parseInt(a) || 0));
          // 열 = 라인 기준(오름차순) → 빠진 호는 빈 칸으로 정렬 유지
          const lines = [...new Set(parsedHoList.map(h => h.line).filter(v => v !== ''))].sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
          const cellAt = (floor, line) => parsedHoList.find(h => h.parsedFloor === String(floor) && h.line === line);
          const colCount = lines.length || 1;

          return (
            <div key={dongNo} style={{ flex: '0 0 auto' }}>
              <table style={{ borderCollapse: 'collapse', border: '1px solid #e0e0e0' }}>
                {/* 스크롤해도 상단 고정: 동명 + 타입/면적 (층만 스크롤) */}
                <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                  {/* 동 정보 */}
                  <tr>
                    <td colSpan={colCount + 1} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', padding: '8px', backgroundColor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
                      {dong?.dongName ? (dong.dongName + '동') : (dongNo + '동')}
                    </td>
                  </tr>
                  {/* 최고층 위: 호 라인별 타입/면적 표기 행 */}
                  <tr>
                    <td style={{ border: '1px solid #e0e0e0', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#eef2ff', fontSize: '13px', color: '#4f46e5', whiteSpace: 'nowrap' }}>타입/면적</td>
                    {lines.map(line => {
                      // 해당 라인의 모든 호에서 (타입,면적) 조합 수집 — 중복 제거, 필로티 제외
                      //  · 한 라인에 타입이 여러 개면(예: 501호/1501호 타입 상이) 모두 표기
                      const combos = [];
                      const seen = new Set();
                      for (const f of sortedFloors) {
                        const c = cellAt(f, line);
                        if (!c || c.special) continue;
                        const typ = c.ptpName || c.aptTyp || c.typeName || '';
                        const areaVal = c.exclsSpc ?? c.exclusiveArea;
                        const area = areaVal ? `${areaVal}㎡` : '';
                        if (!typ && !area) continue;
                        const key = `${typ}|${area}`;
                        if (seen.has(key)) continue;
                        seen.add(key);
                        combos.push({ typ, area });
                      }
                      return (
                        <td key={line} style={{ border: '1px solid #e0e0e0', padding: '4px 6px', textAlign: 'center', backgroundColor: '#eef2ff', fontSize: '13px', color: '#334155', minWidth: '70px' }}>
                          {combos.map((cb, i) => {
                            const on = cb.typ && typeFilter.includes(cb.typ);
                            return (
                              <div key={i}
                                onClick={() => toggleTypeFilter(cb.typ)}
                                title={cb.typ ? `${cb.typ} 타입만 보기` : undefined}
                                style={{ marginTop: i > 0 ? '5px' : 0, paddingTop: i > 0 ? '5px' : 0, borderTop: i > 0 ? '1px dashed #c7d2fe' : 'none', cursor: cb.typ ? 'pointer' : 'default', borderRadius: '4px', background: on ? '#4f46e5' : 'transparent', color: on ? 'white' : '#334155', padding: cb.typ ? '2px 4px' : 0 }}>
                                {cb.typ && <div style={{ fontWeight: 700 }}>{cb.typ}</div>}
                                {cb.area && <div>{cb.area}</div>}
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedFloors.map(floor => (
                    <tr key={floor}>
                      <td style={{ border: '1px solid #e0e0e0', padding: '8px 12px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fafafa', fontSize: '13px' }}>
                        {floor}층
                      </td>
                      {lines.map(line => {
                        const ho = cellAt(floor, line);

                        // 호 없음 → 빈 박스
                        if (!ho) {
                          return <td key={line} style={{ border: '1px solid #e0e0e0', padding: '6px', textAlign: 'center', backgroundColor: '#f9f9f9', minWidth: '70px', height: '40px' }} />;
                        }

                        // 구분(필로티/상가/기타/직접입력) → 호 자리에 라벨 박스(정가운데 고정)
                        if (ho.special) {
                          const label = ho.gubun === '필로티' ? '필로티' : ho.gubun === '상가' ? '상가층' : ho.gubun; // 기타/직접입력은 그대로
                          const bg = ho.gubun === '필로티'
                            ? 'repeating-linear-gradient(45deg,#eef2f7,#eef2f7 6px,#e2e8f0 6px,#e2e8f0 12px)'
                            : ho.gubun === '상가'
                              ? 'repeating-linear-gradient(45deg,#fef3c7,#fef3c7 6px,#fde68a 6px,#fde68a 12px)'
                              : 'repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9 6px,#e2e8f0 6px,#e2e8f0 12px)';
                          const color = ho.gubun === '상가' ? '#92400e' : '#334155';
                          return (
                            <td key={line} style={{ border: '1px solid #e0e0e0', padding: 0, minWidth: '70px', height: '40px', background: bg }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontWeight: 800, fontSize: '13px', color, wordBreak: 'keep-all', textAlign: 'center' }}>{label}</div>
                            </td>
                          );
                        }

                        const occupancy = data.occupancyMap[ho.hoNumber];
                        // 자동(물건등록폼 sale_div, 동+호 기준) + 수동(조합원분, 관리자 설정) 점유상태 병합
                        const cellStatuses = orderStatuses([
                          ...autoStatusesOf(dong?.dongName, ho.hoName),
                          ...manualStatusesOf(occupancy),
                        ]);
                        // 조합원분(UNION)은 사각형 점이 아니라 '호 글자 색깔 밑줄'로 표기. 나머지는 점(dot)
                        const hasUnion = cellStatuses.includes('UNION');
                        const dotStatuses = cellStatuses.filter((v) => v !== 'UNION');

                        // 상태필터/타입필터 활성 시: 조건 미해당 호는 빈 칸(빵꾸)으로 표시 → 해당 호수만 부각
                        const cellType = ho.ptpName || ho.aptTyp || ho.typeName || '';
                        const statusHidden = statusFilter.length > 0 && !cellStatuses.some(s => statusFilter.includes(s));
                        const typeHidden = typeFilter.length > 0 && !typeFilter.includes(cellType);
                        if (statusHidden || typeHidden) {
                          return <td key={line} style={{ border: '1px solid #eef0f2', backgroundColor: '#fbfbfc', minWidth: '70px', height: '40px' }} />;
                        }

                        return (
                          <td
                            key={line}
                            onClick={() => handleUnitClick(dongNo, ho, dong?.dongName)}
                            style={{ border: '1px solid #e0e0e0', padding: '6px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#fff', fontSize: '13px', fontWeight: '500', minWidth: '70px', height: '40px', transition: 'background-color 0.2s', position: 'relative' }}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const tooltipContent = [];

                              // 타입/면적(공급·전용) — 배치도 호 정보 기준
                              const tTyp = ho.ptpName || ho.aptTyp || ho.typeName || '';
                              if (tTyp) tooltipContent.push(`타입: ${tTyp}`);
                              const tSup = ho.splySpc ?? ho.supplyArea;
                              if (tSup) tooltipContent.push(`공급면적: ${tSup}㎡`);
                              const tExc = ho.exclsSpc ?? ho.exclusiveArea;
                              if (tExc) tooltipContent.push(`전용면적: ${tExc}㎡`);

                              if (occupancy) {
                                if (cellStatuses.length > 0) {
                                  tooltipContent.push(`점유상태: ${cellStatuses.map(statusLabelOf).join(', ')}`);
                                }
                                if (occupancy.occupancyName) {
                                  tooltipContent.push(`점유자: ${occupancy.occupancyName}`);
                                }
                                if (occupancy.memo) {
                                  tooltipContent.push(`메모: ${occupancy.memo}`);
                                }
                              }

                              if (tooltipContent.length > 0) {
                                setTooltip({ show: true, x: rect.left + rect.width / 2, y: rect.top - 10, content: tooltipContent });
                              }

                              e.currentTarget.style.backgroundColor = '#f0f0f0';
                            }}
                            onMouseLeave={(e) => {
                              setTooltip({ show: false, x: 0, y: 0, content: null });
                              e.currentTarget.style.backgroundColor = '#fff';
                            }}
                          >
                            <div
                              title={hasUnion ? '조합원분' : undefined}
                              style={hasUnion ? {
                                display: 'inline-block',
                                borderBottom: `3px solid ${statusColor('UNION')}`,
                                paddingBottom: '1px', lineHeight: 1.1,
                              } : undefined}
                            >{ho.hoName}호</div>
                            {dotStatuses.length > 0 && (
                              <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '3px' }}>
                                {dotStatuses.map(v => (
                                  <div key={v} title={statusLabelOf(v)} style={{ width: '9px', height: '9px', backgroundColor: statusColor(v), border: '1px solid #888', borderRadius: '2px' }} />
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        </div>
      </div>
    );
  };

  if (!selectedDanji) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ fontSize: '16px', color: '#666', marginBottom: '20px' }}>
          좌측 목록에서 단지를 선택해주세요.
        </div>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: '#fff', cursor: 'pointer' }}>
          시트로 보기
        </button>
      </div>
    );
  }

  if (!selectedDanji.danjiCode) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ fontSize: '16px', color: '#666', marginBottom: '20px' }}>
          배치도가 존재하지 않습니다.
        </div>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: '#fff', cursor: 'pointer' }}>
          시트로 보기
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      {/* 우상단 닫기(X) — 시트로 복귀 */}
      {onClose && (
        <button
          onClick={onClose}
          title="배치도 닫기"
          style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 20, width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', color: '#64748b', cursor: 'pointer', fontSize: '15px', lineHeight: 1 }}
        >
          ✕
        </button>
      )}
      {/* 커스텀 툴팁 */}
      {tooltip.show && tooltip.content && (
        <div style={{
          position: 'fixed',
          left: `${tooltip.x}px`,
          top: `${tooltip.y}px`,
          transform: 'translate(-50%, -100%)',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '13px',
          whiteSpace: 'nowrap',
          zIndex: 9999,
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          {tooltip.content.map((line, idx) => (
            <div key={idx} style={{ marginBottom: idx < tooltip.content.length - 1 ? '4px' : '0' }}>
              {line}
            </div>
          ))}
          <div style={{
            position: 'absolute',
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid rgba(0, 0, 0, 0.85)'
          }} />
        </div>
      )}

      {/* 좌측상단 단지 헤더: 전체주소 / 단지명 / 세대수 + (우측) 점유상태 색상 범례 */}
      {(danjiInfo || selectedDanji?.danjiName) && (
        <div style={{ flexShrink: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 16px', marginBottom: '14px', fontFamily: 'Pretendard, sans-serif', fontSize: '16px', fontWeight: 500, color: '#111827' }}>
          {(danjiInfo?.fullAddress || danjiInfo?.addressBunji) ? <span>{danjiInfo.fullAddress || danjiInfo.addressBunji}</span> : null}
          <span>{danjiInfo?.buildingName || selectedDanji?.danjiName || ''}</span>
          {(danjiInfo?.familyCnt != null) ? <span>{Number(danjiInfo.familyCnt).toLocaleString()}세대</span> : null}
          {/* 점유상태 색상 범례 (매매/전세/월세/기타임대=물건등록 자동, 조합원분=수동) — 우상단 닫기버튼과 겹치지 않게 우측 여백 */}
          <div style={{ marginLeft: 'auto', marginRight: '56px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {STATUS_META.map(status => (
              <div key={status.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {status.value === 'UNION' ? (
                  // 조합원분 — 호 글자 밑줄 샘플(사각형 아님)
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#111827', borderBottom: `3px solid ${status.color}`, paddingBottom: '1px', lineHeight: 1.1 }}>123호</span>
                ) : (
                  <div style={{ width: '16px', height: '16px', backgroundColor: status.color, border: '1px solid #ddd', borderRadius: '2px' }} />
                )}
                <span style={{ fontSize: '13px', color: '#555' }}>{status.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ flexShrink: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ position: 'relative', maxWidth: '400px', flex: '0 0 auto' }}>
          <div
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', minWidth: '200px' }}
          >
            <span>
              {dongList.length === 0
                ? '동 정보 없음'
                : selectedDongs.length === dongList.length
                  ? '전체 동'
                  : selectedDongs.length === 0
                    ? '동을 선택하세요'
                    : selectedDongs.length + '개 동 선택됨'}
            </span>
            {dropdownOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {dropdownOpen && dongList.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', marginTop: '4px', zIndex: 1000, maxHeight: '300px', overflowY: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', gap: '10px' }}>
                <button onClick={handleSelectAll} style={{ padding: '5px 10px', fontSize: '13px', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f0f0f0' }}>
                  전체 선택
                </button>
                <button onClick={handleDeselectAll} style={{ padding: '5px 10px', fontSize: '13px', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f0f0f0' }}>
                  선택 해제
                </button>
              </div>
              {dongList.map(dong => (
                <div key={dong.dongNo} onClick={() => handleDongToggle(dong.dongNo)} style={{ padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f0f0f0' }}>
                  <input type="checkbox" checked={selectedDongs.includes(dong.dongNo)} onChange={() => {}} style={{ cursor: 'pointer' }} />
                  <span>{dong.dongName || dong.dongNo + '동'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 점유상태 필터 체크박스 — 선택 시 해당 상태 호수만 남기고 나머지는 빈 칸(빵꾸)으로 표시 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#111827' }}>
            <input type="checkbox" checked={statusFilter.length === 0} onChange={() => setStatusFilter([])} style={{ cursor: 'pointer' }} />
            전체
          </label>
          {STATUS_META.map(status => (
            <label key={status.value} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '14px', color: '#111827' }}>
              <input
                type="checkbox"
                checked={statusFilter.includes(status.value)}
                onChange={(e) => setStatusFilter(prev => e.target.checked ? [...prev, status.value] : prev.filter(v => v !== status.value))}
                style={{ cursor: 'pointer' }}
              />
              {status.label}
            </label>
          ))}
          {/* 타입 필터 활성 표시/해제 — 상단 타입 클릭 시 활성 */}
          {typeFilter.length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: '4px', padding: '2px 8px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '14px', fontSize: '13px', fontWeight: 700, color: '#4f46e5' }}>
              타입: {typeFilter.join(', ')}
              <button type="button" onClick={() => setTypeFilter([])} title="타입필터 해제" style={{ border: 'none', background: 'transparent', color: '#6366f1', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}>✕</button>
            </span>
          )}
        </div>
      </div>

      {/* 타입 필터 체크박스 — 전용면적 오름차순. 상단 타입 클릭과 동일한 typeFilter 사용 */}
      {typeOptions.length > 0 && (
        <div style={{ flexShrink: 0, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#4f46e5', whiteSpace: 'nowrap' }}>타입</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#111827' }}>
            <input type="checkbox" checked={typeFilter.length === 0} onChange={() => setTypeFilter([])} style={{ cursor: 'pointer' }} />
            전체
          </label>
          {typeOptions.map((o) => (
            <label key={o.type} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '14px', color: '#111827' }}>
              <input type="checkbox" checked={typeFilter.includes(o.type)} onChange={() => toggleTypeFilter(o.type)} style={{ cursor: 'pointer' }} />
              <span style={{ fontWeight: 700 }}>{o.type}</span>
              {o.area ? <span style={{ color: '#334155', fontSize: '13px' }}>{o.area}㎡</span> : null}
            </label>
          ))}
        </div>
      )}

      {renderAllBuildings()}
      {/* 점유상태 입력 모달 제거: 셀 클릭 시 연동 물건이면 수정창, 없으면 등록창을 연다 */}
    </div>
  );
};

export default LayoutView;
