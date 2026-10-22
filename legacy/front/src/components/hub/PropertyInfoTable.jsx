import React, { useState } from 'react';
import AddressSelectorSimple from '../property/AddressSelectorSimple';
import OptionModal from '../property/OptionModal';
import {
  PROPERTY_TYPE_OPTIONS,
  COMMERCIAL_OFFICE_CODES,
  BUILDING_FORM_CODES,
  LODGING_FORM_CODES,
  FACTORY_FORM_CODES,
  KNOWLEDGE_FORM_CODES,
  BILLA_FORM_CODES,
  ONEROOM_FORM_CODES,
  HOUSE_FORM_CODES,
  REDEV_FORM_CODES,
  SALES_RIGHT_FORM_CODES,
  APARTMENT_FORM_CODES,
  getPropertyTypeLabel,
} from '../../constants/propertyTypes';
import {
  HEAT_METHOD_OPTIONS, HEAT_FUEL_OPTIONS, ENTR_STRUCT_OPTIONS, BUILDING_STRUCT_OPTIONS,
  BUILDING_FORM_OPTIONS, BALCONY_OPTIONS, DIRECTION_OPTIONS, DIRECTION_BASE_OPTIONS,
  RENT_BSN_OPTIONS, getSubTypeOptions,
} from '../../constants/propertyOptions';
import { BUILDING_USES } from '../../constants/buildingUses';
import { LAND_CATEGORIES } from '../../constants/landCategories';
import { LAND_USES } from '../../constants/landUses';
import DateInput from '../ui/DateInput';
import AmountInput from '../ui/AmountInput';

// 금액 필드(천단위 콤마 표기) — 물건등록폼과 동일 UX
const MONEY_FIELDS = new Set([
  'pSaleAmt', 'pLesAmt', 'pNowDepAmt', 'pNowMonAmt', 'pEtcDepAmt', 'pEtcMonAmt',
  'pLoanAmt', 'pLoanAmtAft', 'pMaintCost', 'pPresaleAmt', 'pExpansionAmt', 'pOptionAmt',
  'pPremiumAmt', 'pAddContribAmt', 'pRightValueAmt', 'pMovingCost', 'pLayAmt', 'pFacilityCost',
]);

/**
 * 공동중개망 - 물건정보 입력 테이블 (물건등록폼 스타일: 좌측 보라 라벨)
 * props:
 *  - formData    : HubFormPage formData (pXxx + addr1~5/bjdCode/danjiCode)
 *  - handleChange: 이벤트 핸들러 (name 기반 input/select)
 *  - setField    : (name, value) => void  (주소 선택기/드롭다운용)
 *  - danjiList   : 단지 목록, setDanjiList : 단지목록 setter
 */

const SALE_DIVS = [
  { value: 'SALEDIV01', label: '매매' },
  { value: 'SALEDIV02', label: '전세' },
  { value: 'SALEDIV03', label: '월세' },
  { value: 'SALEDIV04', label: '기타임대' },
];

const APT_TYPES = ['SYCA101', 'SYCA102', 'SYCA103', 'SYCA105', 'SYCA106', 'SYCA107'];


const PropertyInfoTable = ({ formData, handleChange, setField, danjiList = [], setDanjiList, lockTradeFields = false }) => {
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [areaUnit, setAreaUnit] = useState('㎡');
  // 면적 평/㎡ 전환 — 입력된 면적값도 함께 환산 (물건등록폼과 동일 UX)
  const toggleAreaUnit = () => {
    const toPyeong = areaUnit === '㎡'; // ㎡→평 방향
    const factor = toPyeong ? 0.302500 : 3.305785; // 1평=3.305785㎡
    const conv = (v) => (v === '' || v == null || isNaN(Number(v))) ? v : String(Math.round(Number(v) * factor * 100) / 100);
    ['pSupArea', 'pExcArea', 'pLandShareRatio', 'pLandArea', 'pBuildingArea', 'pTotalFloorArea'].forEach((k) => {
      const nv = conv(formData[k]);
      if (nv !== formData[k]) setField(k, nv);
    });
    setAreaUnit(toPyeong ? '평' : '㎡');
  };
  const ROW = { display: 'flex', borderBottom: '1px solid #cbd5e1' };
  const LABEL = { width: '90px', flexShrink: 0, padding: '6px', fontSize: '14px', fontWeight: '600', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', whiteSpace: 'nowrap' };
  const CELL = { flex: 1, padding: '6px', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 };
  const IN = { padding: '4px 0', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' };

  const isApt = APT_TYPES.includes(formData.pPtType);
  const subTypeOptions = getSubTypeOptions(formData.pPtType);
  const MINI_LABEL = { fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' };

  // 물건유형별 상세필드 분기 (물건등록폼 규칙과 동일한 코드그룹 사용)
  const isCommercial = COMMERCIAL_OFFICE_CODES.includes(formData.pPtType); // 상가/사무실
  const isBuilding = BUILDING_FORM_CODES.includes(formData.pPtType);       // 빌딩/건물
  const isLodging = LODGING_FORM_CODES.includes(formData.pPtType);         // 숙박/펜션
  const isFactory = FACTORY_FORM_CODES.includes(formData.pPtType);         // 공장/창고
  const isKnowledge = KNOWLEDGE_FORM_CODES.includes(formData.pPtType);     // 지식산업센터
  const isBilla = BILLA_FORM_CODES.includes(formData.pPtType);             // 빌라/연립
  const isOneRoom = ONEROOM_FORM_CODES.includes(formData.pPtType);         // 원투룸
  const isHouse = HOUSE_FORM_CODES.includes(formData.pPtType);             // 단독/다가구/주택
  const isRedev = REDEV_FORM_CODES.includes(formData.pPtType);             // 재건축/재개발
  const isSalesRight = SALES_RIGHT_FORM_CODES.includes(formData.pPtType);  // 분양권
  const isRedevBunyang = isRedev && formData.pSubType === '분양권';         // 재건축/재개발의 분양권 세부유형
  const isApartmentForm = APARTMENT_FORM_CODES.includes(formData.pPtType); // 아파트폼 계열(분양권 포함)
  const isLand = formData.pPtType === 'SYCA115';                           // 토지
  // 아파트폼 계열(아파트/오피스텔/주상복합/분양권/재건축/재개발/빌라/원투룸) — 방·욕실·발코니·건물구조 등 주거형 필드 노출
  const isResidential = isApartmentForm || isRedev || isBilla || isOneRoom || isHouse;
  // 대지/건물/토지형(비주거) — 연면적·대지면적·건축물용도·지목·용도지역 노출
  const isLandUseType = isCommercial || isBuilding || isLodging || isFactory || isKnowledge || isLand;

  // 유형별 면적 입력 필드 (물건등록폼 각 폼의 면적 row와 동일)
  const AF = {
    sup: { label: '공급면적', key: 'pSupArea' },
    exc: { label: '전용면적', key: 'pExcArea' },
    landShare: { label: '대지지분', key: 'pLandShareRatio' },
    landArea: { label: '대지면적', key: 'pLandArea' },
    buildArea: { label: '건축면적', key: 'pBuildingArea' },
    totalFloor: { label: '연면적', key: 'pTotalFloorArea' },
    landOnly: { label: '토지면적', key: 'pLandArea' },
  };
  const areaConfig = (() => {
    if (isLand) return { showType: false, fields: [AF.landOnly] };
    if (isRedev) return { showType: true, fields: isRedevBunyang ? [AF.sup, AF.exc, AF.landArea] : [AF.sup, AF.exc, AF.landShare, AF.landArea] }; // 분양권은 대지지분 숨김
    if (isApartmentForm) return { showType: true, fields: [AF.sup, AF.exc, AF.landShare] }; // 아파트/오피스텔/주상복합/분양권
    if (isBilla) return { showType: false, fields: [AF.sup, AF.exc, AF.landShare] }; // 빌라/연립: 대지지분 포함
    if (isOneRoom) return { showType: false, fields: [AF.sup, AF.exc] };
    if (isHouse) return { showType: false, fields: [AF.landArea, AF.buildArea, AF.totalFloor] };
    if (isCommercial) return { showType: false, fields: [AF.sup, AF.exc, AF.landShare, AF.landArea, AF.totalFloor] }; // 대지지분 → 대지면적 좌측
    if (isKnowledge) return { showType: false, fields: [AF.sup, AF.exc] }; // 지식산업센터: 공급/전용만
    if (isBuilding) return { showType: false, fields: [AF.landArea, AF.buildArea, AF.totalFloor] }; // 대지지분 제외
    if (isLodging) return { showType: false, fields: [AF.exc, AF.landArea, AF.buildArea, AF.totalFloor] };
    if (isFactory) return { showType: false, fields: [AF.landArea, AF.buildArea, AF.totalFloor] };
    return { showType: true, fields: [AF.sup, AF.exc, AF.landShare] };
  })();
  // 층수(지하/지상) 노출 — 단독/다가구(SYCA119) · 지식산업센터(SYCA116) · 건물/빌딩(SYCA108)
  const showBasementGround = isHouse || isKnowledge || isBuilding;

  // 물건유형/소재지/거래구분은 불러온 매물 기준 읽기전용 표기 (물건 수정폼과 동일)
  const RO_TEXT = { padding: '4px 8px', fontSize: '13px', color: '#111827', fontWeight: 600 };
  const ptTypeLabel = getPropertyTypeLabel(formData.pPtType) || formData.pPtType || '-';
  const addressText = [formData.addr1, formData.addr2, formData.addr3, formData.pJibun, formData.addr5]
    .filter(Boolean).join(' ') || '-';
  // pSaleDiv가 배열/숫자로 들어오는 경우 방어: 문자열로 정규화
  const saleDivStr = Array.isArray(formData.pSaleDiv)
    ? formData.pSaleDiv.join(',')
    : (formData.pSaleDiv == null ? '' : String(formData.pSaleDiv));
  const saleDivText = saleDivStr
    .split(',').map((c) => SALE_DIVS.find((s) => s.value === c.trim())?.label || c.trim())
    .filter(Boolean).join(', ') || '-';
  // 해당 매물의 거래유형 목록(콤마) — 여러개면 하나만 선택하도록 유도
  const availSaleDivs = saleDivStr.split(',').map((s) => s.trim()).filter(Boolean);
  const multiSaleDiv = availSaleDivs.length > 1;

  // 거래유형별 사용 금액 필드 (그 외 금액은 0 처리)
  const AMT_BY_DIV = {
    SALEDIV01: ['pSaleAmt'],                    // 매매
    SALEDIV02: ['pLesAmt'],                     // 전세
    SALEDIV03: ['pNowDepAmt', 'pNowMonAmt'],    // 월세
    SALEDIV04: ['pEtcDepAmt', 'pEtcMonAmt'],    // 기타임대
  };
  const ALL_AMTS = ['pSaleAmt', 'pLesAmt', 'pNowDepAmt', 'pNowMonAmt', 'pEtcDepAmt', 'pEtcMonAmt'];
  const AMT_LABELS = {
    pSaleAmt: '(매매)금액', pLesAmt: '(전세)금액',
    pNowDepAmt: '(월세)보증금', pNowMonAmt: '(월세)차임',
    pEtcDepAmt: '(기타임대)보증금', pEtcMonAmt: '(기타임대)차임',
  };
  const curSaleDiv = formData.pSaleDivSel || (availSaleDivs.length === 1 ? availSaleDivs[0] : '');
  const keepAmts = curSaleDiv ? (AMT_BY_DIV[curSaleDiv] || []) : ALL_AMTS;
  // 거래유형 선택 시: 해당 유형에 쓰지 않는 금액필드는 0 처리
  const handleSaleDivSel = (v) => {
    setField('pSaleDivSel', v);
    const keep = AMT_BY_DIV[v] || [];
    ALL_AMTS.forEach((k) => { if (!keep.includes(k)) setField(k, '0'); });
  };

  // 해당 매물의 실제 층: 호가 있으면 호로 계산(예: 1501호→15층), 없으면 해당층 필드(pFloor1)
  const computedFloor = (() => {
    const ho = String(formData.pHo || '').replace(/[^0-9]/g, '');
    if (ho) { const f = Math.floor(Number(ho) / 100); if (f > 0) return String(f); }
    return formData.pFloor1 != null && formData.pFloor1 !== '' ? String(formData.pFloor1) : '';
  })();
  // 공개층 선택: '해당층' 이면 실제 층으로 전송(pFloor1 세팅)
  const handleFloorDesc = (v) => {
    setField('pFloorDesc', v);
    if (v === '해당층' && computedFloor) setField('pFloor1', computedFloor);
  };
  // 거래금액이 소재지와 수직으로 맞도록 1·2행 첫 셀 너비 고정
  const FIRST_CELL = { ...CELL, flex: '0 0 300px' };
  // 옵션 수기입력 유형(상가·사무실 / 토지 / 빌딩·건물) — 물건등록폼과 동일 규칙
  const isManualOpt = COMMERCIAL_OFFICE_CODES.includes(formData.pPtType) || formData.pPtType === 'SYCA115' || formData.pPtType === 'SYCA108';

  // 제한사항(규제지역) — 물건등록폼과 동일하게 유형별로 노출 체크박스 분기
  // 주거형(아파트/분양권/재개발·재건축/빌라/원투룸/단독주택): 4종, 토지: 토지거래허가구역만, 그 외: 없음
  const restrictZones = isLand
    ? [{ key: 'pZoneLandPermit', label: '토지거래허가구역' }]
    : (isApartmentForm || isRedev || isBilla || isOneRoom || isHouse)
      ? [
          { key: 'pZoneAdjust', label: '청약조정대상지역' },
          { key: 'pZoneOverheat', label: '투기과열지구' },
          { key: 'pZoneSpec', label: '투기지역' },
          { key: 'pZoneLandPermit', label: '토지거래허가구역' },
        ]
      : [];
  // 어린이/반려동물/조건부 노출 유형 — 주거형(물건등록폼과 동일)
  const showChildPet = isApartmentForm || isRedev || isBilla || isOneRoom || isHouse;

  // 중개정보 미니 필드 (컴포넌트가 아닌 함수로 호출 → 리렌더 시 포커스 유지)
  // 항목들을 좌측으로 붙임: 라벨 고정폭/우측정렬 제거(자연폭, 좌측)
  const Field = ({ label, name, type = 'text', w = '60px', disabled = false }) => (
    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>{label}</label>
      {type === 'date' ? (
        /* 날짜: 공통 DateInput(YY.MM.DD 표시 + 달력) — 너비 85px 통일 */
        <DateInput value={formData[name] ?? ''} onChange={(v) => setField(name, v)} style={{ ...IN, width: '85px' }} />
      ) : MONEY_FIELDS.has(name) ? (
        /* 금액: 천단위 콤마(AmountInput) */
        <AmountInput value={formData[name] ?? ''} onChange={(v) => setField(name, v)} disabled={disabled}
          style={{ ...IN, width: w, textAlign: 'right', ...(disabled ? { background: '#f1f5f9', color: '#64748b' } : {}) }} />
      ) : (
        <input type={type} name={name} value={formData[name] ?? ''} onChange={handleChange} disabled={disabled}
          style={{ ...IN, width: w, textAlign: 'right', ...(disabled ? { background: '#f1f5f9', color: '#64748b' } : {}) }} />
      )}
    </div>
  );

  // 드롭다운 미니 필드 (물건등록폼과 동일 옵션) — options: string[] 또는 {value,label}[]
  const Sel = ({ label, name, options, w = '84px' }) => (
    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>{label}</label>
      <select name={name} value={formData[name] ?? ''} onChange={handleChange} style={{ ...IN, width: w }}>
        <option value="">선택</option>
        {options.map((o) => (typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </div>
  );

  return (
    <div style={{ border: '1px solid #cbd5e1' }}>
      {/* 1행: 물건종류 + 세부유형(드롭다운, 개발중 변경 테스트용) | 소재지(읽기전용) */}
      <div style={ROW}>
        <div style={LABEL}>물건종류</div>
        <div style={FIRST_CELL}>
          {/* 물건유형: 불러온 매물 기준 고정(수정 불가, 텍스트 표기) */}
          <span style={{ ...RO_TEXT, fontWeight: 600 }}>{ptTypeLabel}</span>
          {lockTradeFields ? (
            formData.pSubType ? <span style={{ ...RO_TEXT, fontWeight: 600 }}>/ {formData.pSubType}</span> : null
          ) : (
            subTypeOptions.length > 0 && (
              <select name="pSubType" value={formData.pSubType || ''} onChange={handleChange} style={{ ...IN, width: '130px' }}>
                <option value="">세부유형</option>
                {subTypeOptions.map((o) => (<option key={o} value={o}>{o}</option>))}
              </select>
            )
          )}
        </div>
      </div>

      {/* 소재지 — 물건종류 row 아래로 별도 배치 */}
      <div style={ROW}>
        <div style={LABEL}>소재지</div>
        <div style={{ ...CELL, flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            <span style={{ ...RO_TEXT, whiteSpace: 'normal', padding: '4px 0' }}>{addressText}</span>
            {/* 동/호 — 텍스트 표기(입력창 아님, 공동중개망 미노출) */}
            <span style={{ ...RO_TEXT, color: '#64748b' }}>{formData.pDong ? `${formData.pDong}동` : ''} {formData.pHo ? `${formData.pHo}호` : ''}</span>
            {/* 공개층 (다른 중개사 노출용) */}
            <span style={MINI_LABEL}>공개층</span>
            <select name="pFloorDesc" value={formData.pFloorDesc || ''} onChange={(e) => handleFloorDesc(e.target.value)} style={{ ...IN, width: '80px' }}>
              <option value="">선택</option>
              <option value="고 | 중 | 저">고 | 중 | 저</option>
              <option value="해당층">해당층</option>
            </select>
            {/* 해당층 선택 시 실제 층 텍스트 표기 */}
            {formData.pFloorDesc === '해당층' && (
              <span style={{ ...MINI_LABEL, color: '#4f46e5' }}>{computedFloor ? `${computedFloor}층` : '층 정보 없음'}</span>
            )}
            {/* 안내문구 — 공개층 드롭다운 우측 */}
            <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>* 호정보는 비공개처리됨</span>
          </div>
        </div>
      </div>

      {/* 중개정보 */}
      <div style={ROW}>
        <div style={{ ...LABEL, flexDirection: 'column', gap: '4px' }}>
          <button type="button" onClick={toggleAreaUnit} title="평 / ㎡ 전환 (값도 함께 환산)"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '2px', fontSize: '13px', fontWeight: '700', padding: '1px 7px', border: '1px solid #a78bfa', borderRadius: '10px', background: '#ede9fe', color: '#5b4aa8', cursor: 'pointer', boxShadow: '0 1px 1px rgba(0,0,0,0.05)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 5h18" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 19H3" />
            </svg>
            {areaUnit}
          </button>
          <span>중개정보</span>
          <div style={{ fontSize: '12px', fontWeight: '500', color: '#fef08a', lineHeight: 1.3 }}>단위(만원)</div>
          <div style={{ fontSize: '12px', fontWeight: '500', color: '#fef08a', lineHeight: 1.3 }}>관리비(원)</div>
        </div>
        <div style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
          {/* 거래유형(단일선택) + 거래금액 6종 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={MINI_LABEL}>거래유형</label>
              {isBuilding ? (
                /* 건물/빌딩: 매매만 — 텍스트 고정 */
                <span style={{ ...RO_TEXT, fontWeight: 600 }}>매매</span>
              ) : (availSaleDivs.length === 1 || lockTradeFields) ? (
                /* 거래유형이 애초에 하나이거나 전송된 물건: 드롭다운 없이 텍스트로 고정 */
                <span style={{ ...RO_TEXT, fontWeight: 600 }}>{SALE_DIVS.find((s) => s.value === curSaleDiv)?.label || curSaleDiv || '-'}</span>
              ) : (
                <>
                  <select name="pSaleDivSel" value={curSaleDiv} onChange={(e) => handleSaleDivSel(e.target.value)}
                    style={{ ...IN, width: '90px' }}>
                    <option value="">선택</option>
                    {(availSaleDivs.length ? availSaleDivs : SALE_DIVS.map((s) => s.value)).map((v) => (
                      <option key={v} value={v}>{SALE_DIVS.find((s) => s.value === v)?.label || v}</option>
                    ))}
                  </select>
                  {multiSaleDiv && <span style={{ fontSize: '12px', color: '#dc2626', whiteSpace: 'nowrap' }}>* 하나만 선택</span>}
                </>
              )}
            </div>
            {/* 금액 — 건물/빌딩은 매매금액 바로 우측에, 그 외는 거래유형별 금액 */}
            {isBuilding
              ? Field({ label: '매매금액', name: 'pSaleAmt', w: '76px' })
              : (!curSaleDiv
                ? <span style={{ fontSize: '11px', color: '#64748b' }}>거래유형을 선택하면 해당 금액이 표시됩니다.</span>
                : keepAmts.map((k) => Field({ label: AMT_LABELS[k], name: k, w: '76px' })))}
          </div>
          {/* 타입, 공급면적, 전용면적, 대지지분 + 물건유형별 면적필드(연면적/대지면적/토지면적/사무실면적 등) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {/* 타입 — 아파트폼 계열(분양권/재개발재건축 포함)에서만 노출 */}
            {areaConfig.showType && Field({ label: '타입', name: 'pAptTyp', w: '52px' })}
            {/* 유형별 면적 필드 (물건등록폼 각 폼과 동일) — 6자리 보이게 폭 확대 */}
            {areaConfig.fields.map((f) => Field({ label: f.label, name: f.key, w: '52px' }))}
            {/* 층수(지하/지상) — 면적 제일 끝항목 우측에 붙임 (토지 외 전 유형) */}
            {showBasementGround && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={MINI_LABEL}>층수 :</label>
                <label style={MINI_LABEL}>지하</label>
                <input type="number" name="pBasementFloor" value={formData.pBasementFloor ?? ''} onChange={handleChange} style={{ ...IN, width: '52px' , textAlign: 'right' }} />
                <span style={{ fontSize: '11px', color: '#475569' }}>층</span>
                <label style={MINI_LABEL}>지상</label>
                <input type="number" name="pGroundFloor" value={formData.pGroundFloor ?? ''} onChange={handleChange} style={{ ...IN, width: '52px' , textAlign: 'right' }} />
                <span style={{ fontSize: '11px', color: '#475569' }}>층</span>
              </div>
            )}
          </div>
          {/* 분양권 전용 금액 (분양금액/확장금액/옵션금액/프리미엄) */}
          {isSalesRight && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {Field({ label: '분양금액', name: 'pPresaleAmt', w: '76px' })}
              {Field({ label: '확장금액', name: 'pExpansionAmt', w: '76px' })}
              {Field({ label: '옵션금액', name: 'pOptionAmt', w: '76px' })}
              {Field({ label: '프리미엄', name: 'pPremiumAmt', w: '76px' })}
            </div>
          )}
          {/* 재건축/재개발 분양권 — 분양금액/확장/옵션/추가분담금 + 권리가액/이주비/프리미엄 (물건등록폼과 동일) */}
          {isRedevBunyang && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                {Field({ label: '분양금액', name: 'pPresaleAmt', w: '76px' })}
                {Field({ label: '확장금액', name: 'pExpansionAmt', w: '76px' })}
                {Field({ label: '옵션금액', name: 'pOptionAmt', w: '76px' })}
                {Field({ label: '추가분담금', name: 'pAddContribAmt', w: '76px' })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                {Field({ label: '권리가액', name: 'pRightValueAmt', w: '76px' })}
                {Field({ label: '이주비', name: 'pMovingCost', w: '76px' })}
                {Field({ label: '프리미엄', name: 'pPremiumAmt', w: '76px' })}
              </div>
            </>
          )}
          {/* 현상황 line ↔ 대출금액(권리금) line — 상가/사무실은 위아래 교환. 건물/빌딩은 제거(아래 금액표로 대체) */}
          {!isBuilding && (() => {
            const statusLine = (
              <div key="status" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                {Sel({ label: '현상황', name: 'pCurrentStatus', options: ['주인거주', '전세', '공실', '월세', '기타임대'], w: '84px' })}
                {Field({ label: '만기일', name: 'pMaturityDate', type: 'date', w: '140px' })}
                {Field({ label: '잔금예정일', name: 'pExptDate', type: 'date', w: '140px' })}
              </div>
            );
            const loanLine = (
              <div key="loan" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                {/* 권리금/설치비 — 상가/사무실 전용, 대출금액 앞 */}
                {isCommercial && Field({ label: '권리금', name: 'pLayAmt', w: '76px' })}
                {isCommercial && Field({ label: '설치비', name: 'pFacilityCost', w: '76px' })}
                {Field({ label: '대출금액', name: 'pLoanAmt', w: '70px' })}
                {Field({ label: '잔금후대출금액', name: 'pLoanAmtAft', lw: '80px', w: '70px' })}
                {/* 주택임대사업자·계약갱신청구권 — 주거형에서만 (물건등록폼과 동일) */}
                {isResidential && Sel({ label: '주택임대사업자', name: 'ownerRentBsnYn', options: RENT_BSN_OPTIONS, w: '84px' })}
                {isResidential && Sel({ label: '계약갱신청구권', name: 'pContractRenewalRight', options: ['사용', '미사용'], w: '84px' })}
              </div>
            );
            return isCommercial ? [loanLine, statusLine] : [statusLine, loanLine];
          })()}
          {/* 관리비 / 관리비내역 — 건물/빌딩 제외 */}
          {!isBuilding && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {Field({ label: '관리비', name: 'pMaintCost', w: '70px' })}
              {Field({ label: '관리비내역', name: 'pMaintDtl', w: '320px' })}
            </div>
          )}
          {/* 건물/빌딩 전용 금액표 (물건등록폼 BuildingForm 금액 row와 동일 구성) */}
          {isBuilding && (() => {
            const n = (v) => parseFloat(v) || 0;
            const incM = n(formData.pIncRentM) + n(formData.pIncMgmtM) + n(formData.pIncEtcM);
            const incY = n(formData.pIncRentY) + n(formData.pIncMgmtY) + n(formData.pIncEtcY);
            const expM = n(formData.pExpLaborM) + n(formData.pExpUtilM) + n(formData.pExpLoanM) + n(formData.pExpEtcM);
            const expY = n(formData.pExpLaborY) + n(formData.pExpUtilY) + n(formData.pExpLoanY) + n(formData.pExpEtcY);
            const topLbl = { fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' };
            const topIn = { width: '60px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1', textAlign: 'right', boxSizing: 'border-box' };
            const th = { padding: '5px 4px', border: '1px solid #cbd5e1', background: '#f1f5f9', fontWeight: 700, fontSize: '11px', textAlign: 'center', whiteSpace: 'nowrap', color: '#334155' };
            const lblIn = { padding: '5px 4px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 700, fontSize: '11px', textAlign: 'center', whiteSpace: 'nowrap', color: '#1d4ed8' };
            const lblEx = { ...lblIn, color: '#c2410c' };
            const cell = { border: '1px solid #cbd5e1', padding: '2px' };
            const inp = { width: '60px', padding: '4px 6px', fontSize: '13px', border: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box', background: 'white' };
            const sumTd = { border: '1px solid #cbd5e1', background: '#f8fafc', textAlign: 'right', padding: '4px 6px', fontSize: '13px', fontWeight: 700, color: '#1e293b' };
            const fmt = (v) => (v ? v.toLocaleString() : '');
            const A = (name) => (<AmountInput value={formData[name] ?? ''} onChange={(v) => setField(name, v)} style={inp} />);
            return (
              <div>
                <table style={{ width: '760px', maxWidth: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead><tr><th style={th}>항목</th><th style={th}>월수입</th><th style={th}>년수입</th><th style={th}>항목</th><th style={th}>월지출</th><th style={th}>년지출</th></tr></thead>
                  <tbody>
                    <tr><td style={lblIn}>차임</td><td style={cell}>{A('pIncRentM')}</td><td style={cell}>{A('pIncRentY')}</td><td style={lblEx}>인건비</td><td style={cell}>{A('pExpLaborM')}</td><td style={cell}>{A('pExpLaborY')}</td></tr>
                    <tr><td style={lblIn}>관리비</td><td style={cell}>{A('pIncMgmtM')}</td><td style={cell}>{A('pIncMgmtY')}</td><td style={lblEx}>공과금(전기,가스,수도)</td><td style={cell}>{A('pExpUtilM')}</td><td style={cell}>{A('pExpUtilY')}</td></tr>
                    <tr><td style={lblIn}>기타</td><td style={cell}>{A('pIncEtcM')}</td><td style={cell}>{A('pIncEtcY')}</td><td style={lblEx}>대출이자</td><td style={cell}>{A('pExpLoanM')}</td><td style={cell}>{A('pExpLoanY')}</td></tr>
                    <tr><td style={lblIn}></td><td style={cell}></td><td style={cell}></td><td style={lblEx}>기타</td><td style={cell}>{A('pExpEtcM')}</td><td style={cell}>{A('pExpEtcY')}</td></tr>
                    <tr><td style={lblIn}>합계</td><td style={sumTd}>{fmt(incM)}</td><td style={sumTd}>{fmt(incY)}</td><td style={lblEx}>합계</td><td style={sumTd}>{fmt(expM)}</td><td style={sumTd}>{fmt(expY)}</td></tr>
                  </tbody>
                </table>
              </div>
            );
          })()}
          {/* 제한사항(규제지역) — 준공년도 윗줄, 유형에 맞는 체크박스만 (별도 row 아님) */}
          {restrictZones.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {restrictZones.map((z) => (
                <label key={z.key} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={!!formData[z.key]} onChange={(e) => setField(z.key, e.target.checked)} style={{ cursor: 'pointer' }} />
                  <span>{z.label}</span>
                </label>
              ))}
            </div>
          )}
          {/* 어린이 / 반려동물 / 조건부내용 — 주거형만 (물건등록폼과 동일), 준공년도 윗줄 */}
          {showChildPet && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={MINI_LABEL}>어린이</label>
                <select name="pChildYn" value={formData.pChildYn ?? 'N'} onChange={handleChange} style={{ ...IN, width: '80px' }}>
                  <option value="Y">가능</option>
                  <option value="N">불가능</option>
                  <option value="C">조건부</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={MINI_LABEL}>반려동물</label>
                <select name="pPetAllow" value={formData.pPetAllow ?? ''} onChange={handleChange} style={{ ...IN, width: '80px' }}>
                  <option value="">선택</option>
                  <option value="가능">가능</option>
                  <option value="불가능">불가능</option>
                  <option value="조건부">조건부</option>
                </select>
              </div>
              <input type="text" name="pChildCond" value={formData.pChildCond ?? ''} onChange={handleChange} placeholder="조건부 내용" style={{ ...IN, flex: 1, minWidth: '200px' }} />
            </div>
          )}
          {/* 준공년도, 세대수, 주차대수, 방개수, 욕실개수 + 유형별(승강기수/계단수/객실수) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {/* 준공년도 — 토지 제외 전 유형 공통 */}
            {!isLand && Field({ label: '준공년도', name: 'pCompYear', w: '80px' })}
            {/* 세대수 — 아파트/주택/분양권 등 주거형 (원투룸/빌라는 숨김) */}
            {(isApartmentForm || isRedev || isHouse) && Field({ label: '세대수', name: 'pHouseCnt', w: '50px' })}
            {/* 주차대수 — 토지 제외 전 유형 공통 */}
            {!isLand && Field({ label: '주차대수', name: 'pPkCnt', w: '50px' })}
            {/* 방개수/욕실개수 — 주거형 */}
            {isResidential && Field({ label: '방개수', name: 'pRoomCnt', w: '30px' })}
            {isResidential && Field({ label: '욕실개수', name: 'pBathCnt', w: '30px' })}
            {/* 승강기수/계단수 — 상가/사무실/빌딩/지식산업센터 (주차대수 우측) */}
            {(isCommercial || isBuilding || isKnowledge) && Field({ label: '승강기수', name: 'pElevatorCnt', w: '30px' })}
            {(isCommercial || isBuilding || isKnowledge) && Field({ label: '계단수', name: 'pStairCnt', w: '30px' })}
            {/* 객실수 — 숙박/펜션 */}
            {isLodging && Field({ label: '객실수', name: 'pGuestRoomCnt', w: '60px' })}
          </div>
          {/* 난방방식 줄 — 토지 제외 공통 (현관구조/건물형태는 주거형에서만) */}
          {!isLand && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {Sel({ label: '난방방식', name: 'pHeatMethod', options: HEAT_METHOD_OPTIONS, w: '72px' })}
              {Sel({ label: '난방연료', name: 'pHeatFuel', options: HEAT_FUEL_OPTIONS, w: '72px' })}
              {/* 방향 / 방향기준 — 상가/사무실·지식산업센터만 난방연료 우측 */}
              {(isCommercial || isKnowledge) && Sel({ label: '방향', name: 'pDirStd', options: DIRECTION_OPTIONS, w: '80px' })}
              {(isCommercial || isKnowledge) && Sel({ label: '방향기준', name: 'pDirBase', options: DIRECTION_BASE_OPTIONS, w: '90px' })}
              {/* 현관구조 — 아파트/주택/분양권/재건축 */}
              {(isApartmentForm || isRedev || isHouse) && Sel({ label: '현관구조', name: 'pEntrStruct', options: ENTR_STRUCT_OPTIONS, w: '72px' })}
              {/* 건물구조 — 빌라/원투룸/공장/숙박 등 */}
              {(isBilla || isOneRoom || isFactory || isLodging) && Field({ label: '건물구조', name: 'pBuidStruct' })}
              {/* 건물형태 — 아파트/주택/분양권/재건축 (판상형/타워형 등) */}
              {(isApartmentForm || isRedev || isHouse) && Sel({ label: '건물형태', name: 'pBuildingForm', options: BUILDING_FORM_OPTIONS, w: '72px' })}
            </div>
          )}
          {/* 발코니(주거형) / 방향 / 방향기준 — 한 줄 (난방 줄 아래). 상가/사무실·지식산업센터는 방향을 난방줄로 올림 */}
          {!isLand && !isBuilding && !isLodging && !isCommercial && !isKnowledge && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {isResidential && Sel({ label: '발코니', name: 'pBalcExt', options: BALCONY_OPTIONS })}
              {Sel({ label: '방향', name: 'pDirStd', options: DIRECTION_OPTIONS, w: '80px' })}
              {Sel({ label: '방향기준', name: 'pDirBase', options: DIRECTION_BASE_OPTIONS, w: '90px' })}
            </div>
          )}
          {/* 업종/상호 — 공장/창고 전용 (상가/사무실은 제외) */}
          {isFactory && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {Field({ label: '업종', name: 'pBusinessType', w: '150px' })}
              {Field({ label: '상호', name: 'pBusinessName', w: '150px' })}
            </div>
          )}
          {/* 공장/창고 전용 — 진입도로/화장실 */}
          {isFactory && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {Field({ label: '진입도로', name: 'pAccessRoad', w: '70px' })}
              {Field({ label: '화장실', name: 'pToilet', w: '70px' })}
            </div>
          )}
          {/* 대지/건물/토지형 — 건축물용도/지목/용도지역 */}
          {isLandUseType && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {/* 건축물용도 — 토지 제외 (물건등록폼과 동일 상수·드롭다운) */}
              {!isLand && Sel({ label: '건축물용도', name: 'pBuildingUse', options: BUILDING_USES.map((u) => ({ value: u.code, label: u.label })), w: '130px' })}
              {/* 지목 — 상가/사무실은 제외 */}
              {!isCommercial && Sel({ label: '지목', name: 'pLandCategory', options: LAND_CATEGORIES, w: '90px' })}
              {Sel({ label: '용도지역', name: 'pLandUse', options: LAND_USES, w: '130px' })}
            </div>
          )}
          {/* 토지 전용 — 도로/기타제한사항 */}
          {isLand && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {Field({ label: '도로', name: 'pRoadInfo', w: '120px' })}
              {Field({ label: '기타제한사항', name: 'pOtherRestrictions', w: '260px' })}
            </div>
          )}
          {/* 커뮤니티시설 — 아파트/분양권 계열, 한 줄로 넓게 */}
          {!isLand && (isApartmentForm || isRedev) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>커뮤니티시설</label>
              <input type="text" name="pCommunityFacility" value={formData.pCommunityFacility ?? ''} onChange={handleChange} style={{ ...IN, flex: 1, minWidth: 0 }} />
            </div>
          )}
          {/* 옵션 — 커뮤니티시설 아래(중개정보 내). 라벨 클릭→선택, 입력창 직접입력 (물건등록폼과 동일) */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
            <label onClick={() => setShowOptionModal(true)} title="클릭하여 옵션 선택창 열기"
              style={{ fontSize: '13px', fontWeight: '600', color: '#4f46e5', whiteSpace: 'nowrap', paddingTop: '3px', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              옵션 <span style={{ fontSize: '11px' }}>▾</span>
            </label>
            <textarea name="pOpt" value={formData.pOpt || ''} onChange={handleChange} placeholder="옵션 직접 입력 (또는 좌측 '옵션' 클릭하여 선택)" rows={2}
              style={{ flex: 1, minWidth: 0, ...IN, resize: 'none', fontFamily: 'inherit' }} />
          </div>
        </div>
      </div>

      {/* 물건소개 */}
      <div style={{ ...ROW, borderBottom: 'none' }}>
        <div style={LABEL}>물건소개</div>
        <div style={CELL}>
          <textarea name="pPtExpl" value={formData.pPtExpl || ''} onChange={handleChange} rows={4}
            style={{ width: '100%', ...IN, resize: 'vertical' }} />
        </div>
      </div>

      {/* 옵션 선택 모달 */}
      <OptionModal
        isOpen={showOptionModal}
        onClose={() => setShowOptionModal(false)}
        initialValue={formData.pOpt}
        onConfirm={(value) => setField('pOpt', value)}
      />
    </div>
  );
};

export default PropertyInfoTable;
