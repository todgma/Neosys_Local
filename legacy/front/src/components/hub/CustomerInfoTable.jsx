import React, { useState } from 'react';
import AddressSelectorSimple from '../property/AddressSelectorSimple';
import OptionModal from '../property/OptionModal';
import { PROPERTY_TYPE_OPTIONS, PROPERTY_TYPES as ALL_TYPES } from '../../constants/propertyTypes';
import { BUILDING_USES } from '../../constants/buildingUses';
import { LAND_USES } from '../../constants/landUses';
import { LAND_CATEGORIES } from '../../constants/landCategories';
import { BALCONY_OPTIONS, ENTR_STRUCT_OPTIONS, BUILDING_FORM_OPTIONS } from '../../constants/propertyOptions';
import DateInput from '../ui/DateInput';
import AmountInput from '../ui/AmountInput';

/**
 * 공동중개망 - 고객정보 입력 테이블 (물건등록폼 스타일: 좌측 보라 라벨)
 * props:
 *  - formData    : HubFormPage formData
 *  - handleChange: 이벤트 핸들러
 *  - setField    : (name, value) => void
 *  - danjiList / setDanjiList : 단지 목록
 *  - areas       : 고객 희망지역 목록(복수 가능) [{addr1,addr2,addr3,bldNm,bjdCode,danjiCode}]
 *  - trdTypes    : 고객 희망 거래구분 코드 목록(복수 가능)
 */

// 물건유형: 공통 상수 사용(재건축·재개발 → 입주권 하나로)
const PROPERTY_TYPES = PROPERTY_TYPE_OPTIONS.reduce((acc, t) => {
  if (t.code === 'SYCA104') { acc.push({ value: 'SYCA104,SYCA120', label: '입주권' }); return acc; }
  if (t.code === 'SYCA120') return acc;
  acc.push({ value: t.code, label: t.label });
  return acc;
}, []);
// 코드→라벨: 전체 유형 상수에서(누락 코드 방지) + 입주권(재건축/재개발 통합)
const LABEL_OF = ALL_TYPES.reduce((m, t) => { m[t.code] = t.label; return m; }, { 'SYCA104,SYCA120': '입주권' });

// 구입물건유형 대분류 → 매물유형(코드) — PROPERTY_TYPE_OPTIONS 노출 코드 기준(중복 상가/사무실·기타 제외)
const CATEGORIES = ['주거용', '업무용', '토지'];
const CATEGORY_CODES = {
  주거용: ['SYCA101', 'SYCA102', 'SYCA105', 'SYCA104,SYCA120', 'SYCA106', 'SYCA117', 'SYCA118', 'SYCA119'],
  업무용: ['SYCA108', 'SYCA110', 'SYCA111', 'SYCA113', 'SYCA116'],
  토지: ['SYCA115'],
};
const findCategory = (code) => CATEGORIES.find((c) => CATEGORY_CODES[c].includes(code)) || '';

const TRADE_TYPES = [
  { value: 'TRDTYP01', label: '매매' },
  { value: 'TRDTYP02', label: '전세' },
  { value: 'TRDTYP03', label: '월세' },
  { value: 'TRDTYP04', label: '기타임대' },
];

const APT_TYPES = ['SYCA101', 'SYCA102', 'SYCA103', 'SYCA105', 'SYCA106', 'SYCA107'];

const CustomerInfoTable = ({ formData, handleChange, setField, danjiList = [], setDanjiList, areas = [], trdTypes = [] }) => {
  const [showOptionModal, setShowOptionModal] = useState(false);
  const ROW = { display: 'flex', borderBottom: '1px solid #cbd5e1' };
  const LABEL = { width: '90px', flexShrink: 0, padding: '6px', fontSize: '14px', fontWeight: '600', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', whiteSpace: 'nowrap' };
  const FIRST_CELL = { flex: 1, padding: '6px', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' };
  const CELL = { flex: 1, padding: '6px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0 };
  const IN = { padding: '4px 0', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' };
  const CK = { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' };
  const sub = { fontSize: '13px', color: '#000' };
  const dim = { fontSize: '13px', color: '#000', fontWeight: 500 };
  const mLbl = { fontSize: '13px', fontWeight: 500, color: '#000', whiteSpace: 'nowrap' };
  const uni = { fontSize: '13px', color: '#000', whiteSpace: 'nowrap' };

  const isApt = APT_TYPES.includes(formData.custWantType);
  const selectedCategory = formData.custWantCategory || findCategory(formData.custWantType);
  const subOptions = selectedCategory ? CATEGORY_CODES[selectedCategory].map((c) => ({ value: c, label: LABEL_OF[c] || c })) : [];
  const availTrd = (Array.isArray(trdTypes) && trdTypes.length) ? trdTypes : TRADE_TYPES.map((t) => t.value);

  // 거래구분별 금액 필드
  const amt = (() => {
    switch (formData.custTrdType) {
      case 'TRDTYP01': return { key: 'custSaleAmt', label: '매매금액' };
      case 'TRDTYP02': return { key: 'custLesAmt', label: '전세금액' };
      case 'TRDTYP03':
      case 'TRDTYP04': return { key: 'custProtAmt', label: '보증금' };
      default: return { key: 'custLesAmt', label: '금액' };
    }
  })();

  // [직접입력][범위 최소 ~ 최대] — 직접입력은 최소값 자동표시(직접 수정 가능)
  const directRange = (dkey, fr, to, unit, type = 'text') => {
    const directVal = (formData[dkey] !== undefined && formData[dkey] !== '') ? formData[dkey] : (formData[fr] || '');
    // 날짜: 공통 DateInput(YY.MM.DD 표시 + 달력) — 너비 85px 통일
    if (type === 'date') {
      const dStyle = { ...IN, width: '85px' };
      return (
        <>
          <DateInput value={directVal} onChange={(v) => setField(dkey, v)} style={dStyle} />
          <span style={{ ...dim, marginLeft: '6px' }}>범위</span>
          <DateInput value={formData[fr] ?? ''} onChange={(v) => setField(fr, v)} style={dStyle} />
          <span style={{ color: '#64748b' }}>~</span>
          <DateInput value={formData[to] ?? ''} onChange={(v) => setField(to, v)} style={dStyle} />
        </>
      );
    }
    // 금액(만원): 천단위 콤마(AmountInput)
    if (unit === '만원') {
      return (
        <>
          <AmountInput value={directVal} onChange={(v) => setField(dkey, v)} placeholder="직접입력" style={{ ...IN, width: '100px', textAlign: 'right' }} />
          <span style={sub}>{unit}</span>
          <span style={{ ...dim, marginLeft: '6px' }}>범위</span>
          <AmountInput value={formData[fr] ?? ''} onChange={(v) => setField(fr, v)} placeholder="최소" style={{ ...IN, width: '90px', textAlign: 'right' }} />
          <span style={sub}>{unit}</span>
          <span style={{ color: '#64748b' }}>~</span>
          <AmountInput value={formData[to] ?? ''} onChange={(v) => setField(to, v)} placeholder="최대" style={{ ...IN, width: '90px', textAlign: 'right' }} />
          <span style={sub}>{unit}</span>
        </>
      );
    }
    return (
      <>
        <input type={type} value={directVal} onChange={(e) => setField(dkey, e.target.value)} placeholder="직접입력" style={{ ...IN, width: '100px', textAlign: 'right' }} />
        {unit && <span style={sub}>{unit}</span>}
        <span style={{ ...dim, marginLeft: '6px' }}>범위</span>
        <input type={type} name={fr} value={formData[fr] ?? ''} onChange={handleChange} placeholder="최소" style={{ ...IN, width: '90px', textAlign: 'right' }} />
        {unit && <span style={sub}>{unit}</span>}
        <span style={{ color: '#64748b' }}>~</span>
        <input type={type} name={to} value={formData[to] ?? ''} onChange={handleChange} placeholder="최대" style={{ ...IN, width: '90px', textAlign: 'right' }} />
        {unit && <span style={sub}>{unit}</span>}
      </>
    );
  };

  return (
    <div style={{ border: '1px solid #cbd5e1' }}>
      {/* 구입물건유형 (대분류 → 매물유형 캐스케이드) */}
      <div style={ROW}>
        <div style={LABEL}>구입물건유형</div>
        <div style={FIRST_CELL}>
          <select value={selectedCategory} onChange={(e) => { setField('custWantCategory', e.target.value); setField('custWantType', ''); }} style={{ ...IN, width: '110px' }}>
            <option value="">대분류</option>
            {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
          <select value={formData.custWantType || ''} onChange={(e) => setField('custWantType', e.target.value)} disabled={!selectedCategory} style={{ ...IN, width: '170px' }}>
            <option value="">매물유형 선택</option>
            {subOptions.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
          </select>
        </div>
      </div>

      {/* 소재지 (희망지역 복수 → 하나 선택) */}
      <div style={ROW}>
        <div style={LABEL}>소재지</div>
        <div style={{ ...CELL, flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
          {areas.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={dim}>희망지역</span>
              <select value={formData._areaIdx ?? ''} onChange={(e) => {
                const i = e.target.value; const a = areas[i];
                setField('_areaIdx', i);
                if (a) {
                  setField('addr1', a.addr1 || ''); setField('addr2', a.addr2 || ''); setField('addr3', a.addr3 || '');
                  setField('addr5', a.bldNm || ''); setField('bjdCode', a.bjdCode || ''); setField('danjiCode', a.danjiCode || '');
                }
              }} style={{ ...IN, width: '280px' }}>
                <option value="">희망지역 선택 ({areas.length}건)</option>
                {areas.map((a, i) => (<option key={i} value={i}>{[a.addr1, a.addr2, a.addr3, a.bldNm].filter(Boolean).join(' ') || `지역 ${i + 1}`}</option>))}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            <AddressSelectorSimple formData={formData} onChange={setField} onDanjiListChange={setDanjiList} ptType={formData.custWantType} />
            {isApt && (
              <select value={formData.danjiCode || ''} onChange={(e) => {
                const sel = (danjiList || []).find((d) => d.naverDanjiCode === e.target.value);
                setField('danjiCode', e.target.value); setField('addr5', sel ? sel.buildingName : '');
              }} disabled={!danjiList || danjiList.length === 0} style={{ ...IN, width: '200px' }}>
                <option value="">단지 선택</option>
                {(danjiList || []).map((d) => (<option key={d.buildingCode} value={d.naverDanjiCode}>{d.buildingName}</option>))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* 거래구분 (희망 거래구분 복수 → 하나 선택) | 금액 (직접입력 + 범위) */}
      <div style={ROW}>
        <div style={LABEL}>거래구분</div>
        <div style={{ ...CELL, flex: '0 0 auto', flexWrap: 'nowrap' }}>
          {availTrd.map((code) => {
            const t = TRADE_TYPES.find((x) => x.value === code);
            if (!t) return null;
            return (
              <label key={code} style={CK}>
                <input type="radio" name="custTrdType" checked={formData.custTrdType === code} onChange={() => setField('custTrdType', code)} /> {t.label}
              </label>
            );
          })}
        </div>
        <div style={{ ...LABEL, borderLeft: 'none' }}>{amt.label}</div>
        <div style={{ ...CELL, flexWrap: 'nowrap' }}>{directRange(`${amt.key}Direct`, `${amt.key}Fr`, `${amt.key}To`, '만원')}</div>
      </div>

      {/* 전용면적 (직접입력 + 범위) */}
      <div style={ROW}>
        <div style={LABEL}>전용면적</div>
        <div style={CELL}>{directRange('custExcAreaDirect', 'custExcAreaFr', 'custExcAreaTo', '㎡')}</div>
      </div>

      {/* 실입주 여부 */}
      <div style={ROW}>
        <div style={LABEL}>실입주 여부</div>
        <div style={CELL}>
          <label style={CK}>
            <input type="checkbox" checked={formData.custMoveinYn === 'Y'} onChange={(e) => setField('custMoveinYn', e.target.checked ? 'Y' : '')} />
            <span>실입주</span>
          </label>
        </div>
      </div>

      {/* 잔금예정일 (직접입력 + 범위) */}
      <div style={ROW}>
        <div style={LABEL}>잔금예정일</div>
        <div style={CELL}>{directRange('custMoveDateDirect', 'custMoveDateFr', 'custMoveDateTo', '', 'date')}</div>
      </div>

      {/* 상세정보 — 구입물건유형(주거용/업무용/토지)에 따라 항목 변경 */}
      <div style={ROW}>
        <div style={LABEL}>상세정보</div>
        <div style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
          {selectedCategory === '업무용' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={mLbl}>업종</span>
                <input type="text" name="custBizType" value={formData.custBizType || ''} onChange={handleChange} placeholder="업종" style={{ ...IN, flex: 1, minWidth: 0 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={uni}>승강기수</span><input type="number" name="custElevatorCnt" value={formData.custElevatorCnt ?? ''} onChange={handleChange} style={{ ...IN, width: '40px' , textAlign: 'right' }} />
                <span style={uni}>계단수</span><input type="number" name="custStairCnt" value={formData.custStairCnt ?? ''} onChange={handleChange} style={{ ...IN, width: '40px' , textAlign: 'right' }} />
                <span style={uni}>주차차량</span><input type="number" name="custParkCnt" value={formData.custParkCnt ?? ''} onChange={handleChange} style={{ ...IN, width: '50px' , textAlign: 'right' }} /><span style={uni}>대 이상</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={mLbl}>도시가스</span>
                <select value={formData.custCityGasYn || ''} onChange={(e) => setField('custCityGasYn', e.target.value)} style={{ ...IN, width: '80px', cursor: 'pointer' }}>
                  <option value="">선택</option><option value="필요">필요</option><option value="불필요">불필요</option><option value="무관">무관</option>
                </select>
                <span style={uni}>전기용량</span><input type="text" name="custElecCapacity" value={formData.custElecCapacity || ''} onChange={handleChange} style={{ ...IN, width: '64px' }} /><span style={uni}>kw</span>
                <span style={uni}>진입도로</span><input type="number" name="custAccessRoad" value={formData.custAccessRoad ?? ''} onChange={handleChange} style={{ ...IN, width: '65px' , textAlign: 'right' }} /><span style={uni}>m 이상</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={mLbl}>용도지역</span>
                <select value={formData.custLandUse || ''} onChange={(e) => setField('custLandUse', e.target.value)} style={{ ...IN, width: '110px', cursor: 'pointer' }}><option value="">선택</option>{LAND_USES.map((u) => (<option key={u.value} value={u.value}>{u.label}</option>))}</select>
                <span style={mLbl}>지목</span>
                <select value={formData.custLandCategory || ''} onChange={(e) => setField('custLandCategory', e.target.value)} style={{ ...IN, width: '90px', cursor: 'pointer' }}><option value="">선택</option>{LAND_CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}</select>
                <span style={mLbl}>건축물용도</span>
                <select value={formData.custBuildingUse || ''} onChange={(e) => setField('custBuildingUse', e.target.value)} style={{ ...IN, width: '120px', cursor: 'pointer' }}><option value="">선택</option>{BUILDING_USES.map((u) => (<option key={u.code} value={u.code}>{u.label}</option>))}</select>
              </div>
            </>
          ) : selectedCategory === '토지' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={mLbl}>업종 | 사용용도</span>
                <input type="text" name="custBizType" value={formData.custBizType || ''} onChange={handleChange} placeholder="과수원(애플망고)" style={{ ...IN, flex: 1, minWidth: 0 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={mLbl}>용도지역</span>
                <select value={formData.custLandUse || ''} onChange={(e) => setField('custLandUse', e.target.value)} style={{ ...IN, width: '130px', cursor: 'pointer' }}><option value="">선택</option>{LAND_USES.map((u) => (<option key={u.value} value={u.value}>{u.label}</option>))}</select>
                <span style={mLbl}>지목</span>
                <select value={formData.custLandCategory || ''} onChange={(e) => setField('custLandCategory', e.target.value)} style={{ ...IN, width: '90px', cursor: 'pointer' }}><option value="">선택</option>{LAND_CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}</select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={mLbl}>건축허가</span>
                <select value={formData.custBuildPermitPref || ''} onChange={(e) => setField('custBuildPermitPref', e.target.value)} style={{ ...IN, width: '90px', cursor: 'pointer' }}><option value="">선택</option><option value="필수">필수</option><option value="선호">선호</option><option value="무관">무관</option></select>
                <span style={mLbl}>도로</span>
                <input type="number" name="custAccessRoad" value={formData.custAccessRoad ?? ''} onChange={handleChange} style={{ ...IN, width: '65px' , textAlign: 'right' }} /><span style={uni}>m</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={mLbl}>어린이</span>
                <select value={formData.custChildYn || ''} onChange={(e) => setField('custChildYn', e.target.value)} style={{ ...IN, width: '80px', cursor: 'pointer' }}><option value="">선택</option><option value="Y">있음</option><option value="N">없음</option><option value="C">조건부</option></select>
                <span style={mLbl}>반려동물</span>
                <select value={formData.custPetAllow || ''} onChange={(e) => setField('custPetAllow', e.target.value)} style={{ ...IN, width: '80px', cursor: 'pointer' }}><option value="">선택</option><option value="있음">있음</option><option value="없음">없음</option><option value="조건부">조건부</option></select>
                <input type="text" name="custChildCond" value={formData.custChildCond || ''} onChange={handleChange} placeholder="조건부 내용" style={{ ...IN, flex: 1, minWidth: '120px' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={uni}>방</span><input type="number" name="custRoomCnt" value={formData.custRoomCnt ?? ''} onChange={handleChange} style={{ ...IN, width: '40px' , textAlign: 'right' }} /><span style={uni}>개</span>
                <span style={uni}>욕실</span><input type="number" name="custBathCnt" value={formData.custBathCnt ?? ''} onChange={handleChange} style={{ ...IN, width: '40px' , textAlign: 'right' }} /><span style={uni}>개</span>
                <span style={uni}>주차차량</span><input type="number" name="custParkCnt" value={formData.custParkCnt ?? ''} onChange={handleChange} style={{ ...IN, width: '50px' , textAlign: 'right' }} /><span style={uni}>대</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={uni}>발코니</span>
                <select value={formData.custBalcExt || ''} onChange={(e) => setField('custBalcExt', e.target.value)} style={{ ...IN, width: '84px', cursor: 'pointer' }}><option value="">선택</option>{BALCONY_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}</select>
                <span style={uni}>현관구조</span>
                <select value={formData.custEntrStruct || ''} onChange={(e) => setField('custEntrStruct', e.target.value)} style={{ ...IN, width: '84px', cursor: 'pointer' }}><option value="">선택</option>{ENTR_STRUCT_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}</select>
                <span style={uni}>건물형태</span>
                <select value={formData.custBuildingForm || ''} onChange={(e) => setField('custBuildingForm', e.target.value)} style={{ ...IN, width: '84px', cursor: 'pointer' }}><option value="">선택</option>{BUILDING_FORM_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}</select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={uni}>커뮤니티시설</span>
                <input type="text" name="custCommunityFac" value={formData.custCommunityFac || ''} onChange={handleChange} placeholder="커뮤니티시설" style={{ ...IN, flex: 1, minWidth: 0 }} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 옵션 — 라벨 클릭→선택, 입력창 직접입력 (물건등록폼과 동일) */}
      <div style={ROW}>
        <div onClick={() => setShowOptionModal(true)} title="클릭하여 옵션 선택창 열기"
          style={{ ...LABEL, flexDirection: 'column', gap: '2px', cursor: 'pointer' }}>
          <span>옵션</span>
          <span style={{ fontSize: '12px', fontWeight: '500', color: '#fef08a' }}>선택 ▾</span>
        </div>
        <div style={CELL}>
          <textarea name="custOpt" value={formData.custOpt || ''} onChange={handleChange} placeholder="옵션 직접입력 (또는 좌측 '옵션' 라벨 클릭하여 선택)" rows={2} style={{ ...IN, width: '100%', resize: 'none', fontFamily: 'inherit' }} />
        </div>
      </div>

      {/* 구입물건특징 (직접입력 전용 — 데이터 미연동) */}
      <div style={{ ...ROW, borderBottom: 'none' }}>
        <div style={LABEL}>구입물건특징</div>
        <div style={CELL}>
          <textarea name="custFeatureNote" value={formData.custFeatureNote || ''} onChange={handleChange} rows={3} placeholder="구입물건특징 직접입력"
            style={{ width: '100%', ...IN, resize: 'vertical' }} />
        </div>
      </div>

      {/* 옵션 선택 모달 (물건등록폼과 동일) */}
      <OptionModal
        isOpen={showOptionModal}
        onClose={() => setShowOptionModal(false)}
        initialValue={formData.custOpt}
        onConfirm={(value) => setField('custOpt', value)}
      />
    </div>
  );
};

export default CustomerInfoTable;
