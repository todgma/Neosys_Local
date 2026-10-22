import React, { useEffect } from 'react';
import { Trash2, X, Eraser } from 'lucide-react';
import { LAND_USES } from '../../../constants/landUses';
import { LAND_CATEGORIES } from '../../../constants/landCategories';
import AmountInput from '../../ui/AmountInput';
import DateInput from '../../ui/DateInput';
import TradeDivisionSelector from './TradeDivisionSelector';
import ParcelRegionSelect from './ParcelRegionSelect';

/**
 * 토지 좌측 메인 폼 영역
 * - 대상 물건유형: 토지 (SYCA115)
 * - formData/상태는 부모(PropertyFormPageV2)가 소유하고, 이 컴포넌트는 표현(HTML/CSS)만 담당
 * - 토지 전용 항목은 이 파일에서 개별 작업 (현재는 상가/사무실 폼 복사본 — 항목 조정 예정)
 */
export default function LandForm({
  formData,
  handleChange,
  setFormData,
  propertyStatuses,
  handleOpenHistory,
  historyCount,
  editData,
  tradeDivisions,
  etcLeaseTypes,
  holders,
  setHolders,
  shareHistory,
  setShareHistory,
  showParcelModal,
  setShowParcelModal,
}) {
  // ===== 다필지(parcels) — 모달 열림 상태는 부모가 소유(소재지 바 버튼과 공유) =====
  const parcels = formData.parcels || [];
  // 빈 행 제외한 실제 입력된 필지 수 (개수 표기용)
  const filledParcelCount = parcels.filter((p) =>
    ['jibun', 'landArea', 'landCategory', 'landUse', 'otherRestrictions'].some((k) => String(p[k] || '').trim() !== '')
  ).length;
  // 여러 동에 걸친 필지면 "동 지번"으로 표기
  const multiDong = new Set(parcels.map((p) => p.dong || '')).size > 1;
  const parcelLabel = (p) => ((multiDong && p.dong) ? `${p.dong} ${p.jibun}` : (p.jibun || '-'));
  const updateParcel = (idx, field, value) => setFormData((prev) => {
    const p = [...(prev.parcels || [])];
    p[idx] = { ...p[idx], [field]: value };
    return { ...prev, parcels: p };
  });
  // 필지 기본값 — 소재지(법정동명)/법정동코드는 물건 소재지를 그대로 채움(행정구역 겹치는 필지는 개별 수정 가능)
  const makeParcel = (dong = '', soji = '', bjdCode = '') => ({ dong, soji, bjdCode, jibun: '', landArea: '', landCategory: '', landUse: '', otherRestrictions: '' });
  const sojiOf = (prev) => [prev.addr1, prev.addr2, prev.addr3].filter(Boolean).join(' ');
  // 삭제: 기본 3행 미만으로는 줄이지 않고 마지막은 내용만 비움(소유자 카드와 동일)
  const deleteParcel = (idx) => setFormData((prev) => {
    const list = prev.parcels || [];
    if (list.length <= 3) return { ...prev, parcels: list.map((p, i) => (i === idx ? makeParcel(prev.addr3 || '', sojiOf(prev), prev.bjdCode || '') : p)) };
    return { ...prev, parcels: list.filter((_, i) => i !== idx) };
  });
  const clearParcel = (idx) => setFormData((prev) => ({
    ...prev,
    parcels: (prev.parcels || []).map((p, i) => (i === idx ? makeParcel(prev.addr3 || '', sojiOf(prev), prev.bjdCode || '') : p)),
  }));
  const addParcelRow = () => setFormData((prev) => ({
    ...prev,
    parcels: [...(prev.parcels || []), makeParcel(prev.addr3 || '', sojiOf(prev), prev.bjdCode || '')],
  }));

  // 기본 3행: 필지목록이 비어 있으면 빈 행 3개로 초기화
  useEffect(() => {
    if (!formData.parcels || formData.parcels.length === 0) {
      setFormData((prev) => ({ ...prev, parcels: [makeParcel(prev.addr3 || '', sojiOf(prev), prev.bjdCode || ''), makeParcel(prev.addr3 || '', sojiOf(prev), prev.bjdCode || ''), makeParcel(prev.addr3 || '', sojiOf(prev), prev.bjdCode || '')] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 필지목록 열 때: 소재지/법정동코드 비어있는 필지는 현재 물건 소재지로 채움(누르기 전 입력된 소재지 그대로 표기)
  useEffect(() => {
    if (!showParcelModal) return;
    setFormData((prev) => ({ ...prev, parcels: (prev.parcels || []).map((p) => ((p.soji || p.bjdCode) ? p : { ...p, soji: sojiOf(prev), bjdCode: prev.bjdCode || '' })) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showParcelModal]);

  // 표 공통 스타일
  const pTh = { padding: '5px 4px', border: '1px solid #b8c5db', background: '#c9d6ea', fontWeight: 700, fontSize: '13px', color: '#1e293b', textAlign: 'center', whiteSpace: 'nowrap' };
  const pTd = { border: '1px solid #e5e7eb', padding: '0px 2px', background: 'white', fontSize: '13px', textAlign: 'center' };
  const pIn = { width: '100%', padding: '3px 4px', fontSize: '13px', border: 'none', outline: 'none', boxSizing: 'border-box', background: 'transparent', textAlign: 'right' };
  const pInL = { ...pIn, textAlign: 'left' };
  const pSel = { width: '100%', padding: '2px', fontSize: '13px', border: 'none', outline: 'none', background: 'transparent' };
  const pDelBtn = { padding: '2px', border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1' }}>

      {/* Row: 면적 (토지면적) */}
      <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
        <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '500', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <div>면적</div>
          <button type="button" onClick={() => setFormData((p) => {
            const toPyeong = (p.areaUnit || '㎡') === '㎡'; // ㎡→평 방향
            const factor = toPyeong ? 0.302500 : 3.305785; // 1평=3.305785㎡
            const conv = (v) => (v === '' || v == null || isNaN(Number(v))) ? v : String(Math.round(Number(v) * factor * 100) / 100);
            return { ...p, areaUnit: toPyeong ? '평' : '㎡', landShare: conv(p.landShare) };
          })}
            title="평 / ㎡ 전환 (값도 함께 환산)"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '10px', fontWeight: '700', padding: '0 4px', border: '1px solid #a78bfa', borderRadius: '10px', background: '#ede9fe', color: '#5b4aa8', cursor: 'pointer', boxShadow: '0 1px 1px rgba(0,0,0,0.05)' }}>
            <span style={{ lineHeight: 1 }}>⇄</span>{formData.areaUnit || '㎡'}
          </button>
        </div>
        <div style={{ flex: 1, padding: '6px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>토지면적</label>
              <AmountInput decimal value={formData.landShare} onChange={(v) => handleChange('landShare', v)} style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
              <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>{formData.areaUnit || '㎡'}</span>
            </div>
            {/* 필지목록 버튼은 소재지 바(지번 입력창 우측)로 이동 */}
          </div>
        </div>
      </div>

      {/* Row: 거래구분 — 구분별 상태 드롭다운(공용 컴포넌트) */}
      <TradeDivisionSelector formData={formData} setFormData={setFormData} etcLeaseTypes={etcLeaseTypes} />

      {/* Row: 금액 (권리금/시설비, 대출금액 없음) */}
      <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
        <div style={{ width: '90px', flexShrink: 0, padding: '6px', fontSize: '14px', fontWeight: '500', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div>금액</div>
          <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '500', lineHeight: '1.3', color: '#fef08a' }}>단위(만원)</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: '6px', overflowX: 'auto' }}>
          {(() => {
            const amtTh = { padding: '7px 4px', border: '1px solid #b8c5db', borderRight: '1.5px solid #94a3b8', background: '#c9d6ea', fontWeight: 700, fontSize: '13px', color: '#1e293b', textAlign: 'center', whiteSpace: 'nowrap' };
            const amtTd = { border: '1px solid #e5e7eb', borderRight: '1.5px solid #b6c0cf', padding: '4px', background: '#f8fafc' };
            const amtTdLight = { ...amtTd, borderRight: '1px solid #e5e7eb' };
            const amtIn = { width: '100%', padding: '2px 2px', fontSize: '13px', border: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box', background: 'white' };
            return (
              <table style={{ width: '456px', borderCollapse: 'collapse', tableLayout: 'fixed', border: '2px solid #94a3b8' }}>
                <thead>
                  <tr>
                    <th style={amtTh}>매매금액</th>
                    <th style={amtTh}>전세금액</th>
                    <th style={amtTh} colSpan={2}>월세금액</th>
                    <th style={amtTh} colSpan={2}>기타임대{formData.etcLeaseType.length ? `(${formData.etcLeaseType[0]})` : ''}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={amtTd}><AmountInput value={formData.saleAmt} onChange={(v) => handleChange('saleAmt', v)} style={amtIn} /></td>
                    <td style={amtTd}><AmountInput value={formData.lesAmt} onChange={(v) => handleChange('lesAmt', v)} style={amtIn} /></td>
                    <td style={amtTdLight}><AmountInput value={formData.protAmt} onChange={(v) => handleChange('protAmt', v)} placeholder="보증금" style={amtIn} /></td>
                    <td style={amtTd}><AmountInput value={formData.monAmt} onChange={(v) => handleChange('monAmt', v)} placeholder="차임" style={amtIn} /></td>
                    <td style={amtTdLight}><AmountInput value={formData.etcAmt} onChange={(v) => handleChange('etcAmt', v)} placeholder="보증금" style={amtIn} /></td>
                    <td style={amtTd}><AmountInput value={formData.etcAmt2} onChange={(v) => handleChange('etcAmt2', v)} placeholder="차임" style={amtIn} /></td>
                  </tr>
                </tbody>
              </table>
            );
          })()}
          {/* 대출금액(표에서 분리) — 라벨+입력창 */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>대출금액</label>
              <AmountInput value={formData.loanAmt} onChange={(v) => handleChange('loanAmt', v)} style={{ width: '55px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} placeholder="" /><span style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>만</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row: 현상황 (+ 업종/상호) */}
      <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
        <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '500', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div>현상황</div>
          <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '500', lineHeight: '1.3', color: '#fef08a' }}>단위(만원)</div>
        </div>
        <div style={{ flex: 1, padding: '6px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>현상태</label>
                <select value={formData.currentStatus} onChange={(e) => handleChange('currentStatus', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                  <option value="">선택</option>
                  <option value="주인거주">주인거주</option>
                  <option value="전세">전세</option>
                  <option value="공실">공실</option>
                  <option value="월세">월세</option>
                  <option value="기타임대">기타임대</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>보증금</label>
                <AmountInput value={formData.nowDepAmt || ''} onChange={(v) => handleChange('nowDepAmt', v)} style={{ width: '55px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} placeholder="" /><span style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>만</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>월차임</label>
                <AmountInput value={formData.nowMonAmt || ''} onChange={(v) => handleChange('nowMonAmt', v)} style={{ width: '55px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} placeholder="" /><span style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>만</span>
              </div>
            </div>
            {/* 업종/상호 */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>사업체명</label>
                <input type="text" value={formData.businessName} onChange={(e) => handleChange('businessName', e.target.value)} placeholder="농장" style={{ width: '150px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>업종</label>
                <input type="text" value={formData.businessType} onChange={(e) => handleChange('businessType', e.target.value)} placeholder="과수원(애플망고)" style={{ width: '150px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row: 추천업종 (바로 입력창 · 프론트 전용) */}
      <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
        <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '500', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>추천업종</div>
        <div style={{ flex: 1, padding: '6px' }}>
          <input type="text" value={formData.recommendedBusiness || ''} onChange={(e) => handleChange('recommendedBusiness', e.target.value)} placeholder="예: 카페, 편의점, 학원 등 추천 업종" style={{ width: '100%', maxWidth: '400px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
        </div>
      </div>

      {/* Row: 일정 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
        <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '500', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>일정</div>
        <div style={{ flex: 1, padding: '6px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>만기일</label>
              <DateInput value={formData.mtryDate} onChange={(v) => handleChange('mtryDate', v)} style={{ width: '85px', padding: '4px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>이사예정일</label>
              <DateInput value={formData.exptMovDate} onChange={(v) => handleChange('exptMovDate', v)} style={{ width: '85px', padding: '4px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>잔금예정일</label>
              <DateInput value={formData.exptDate} onChange={(v) => handleChange('exptDate', v)} style={{ width: '85px', padding: '4px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Row: 상세정보 (토지 전용) — 표 전환 없이 단일 폼 (필지별은 필지목록 모달에서 편집) */}
        <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
          <div style={{ width: '90px', flexShrink: 0, padding: '6px', fontSize: '14px', fontWeight: '500', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>상세정보</div>
          <div style={{ flex: 1, minWidth: 0, padding: '6px' }}>
          <>
          {/* 1줄: 지목, 용도지역, 건축허가+허가일, 도로 */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>지목</label>
              <select value={formData.landCategory} onChange={(e) => handleChange('landCategory', e.target.value)} style={{ width: '88px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                <option value="">선택</option>
                {LAND_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>용도지역</label>
              <select value={formData.landUse} onChange={(e) => handleChange('landUse', e.target.value)} style={{ width: '120px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                <option value="">선택</option>
                {LAND_USES.map(use => (
                  <option key={use.value} value={use.value}>{use.label}</option>
                ))}
              </select>
            </div>
            {/* 건축허가 체크박스 → 허가일 좌측에 붙여 한 그룹으로 (줄바꿈으로 분리되지 않게) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                <input type="checkbox" checked={!!formData.buildPermit} onChange={(e) => handleChange('buildPermit', e.target.checked)} style={{ cursor: 'pointer' }} />
                <span>건축허가</span>
              </label>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>허가일</label>
              <DateInput value={formData.permitDate || ''} onChange={(v) => handleChange('permitDate', v)} style={{ width: '85px', padding: '4px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>도로</label>
              <input type="number" step="0.1" value={formData.roadInfo || ''} onChange={(e) => handleChange('roadInfo', e.target.value)} placeholder="너비" style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' , textAlign: 'right' }} />
              <span style={{ fontSize: '13px', fontWeight: '500' }}>m</span>
            </div>
          </div>

          {/* 2줄: 규제/권리 체크박스 */}
          <div style={{ display: 'flex', gap: '14px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { key: 'zoneDevRestrict', label: '개발제한구역' },
              { key: 'zoneLandPermit', label: '토지거래허가구역' },
              { key: 'rightSurface', label: '지상권' },
              { key: 'rightGrave', label: '분묘기지권' },
              { key: 'rightEasement', label: '지역권' },
            ].map((z) => (
              <label key={z.key} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                <input type="checkbox" checked={!!formData[z.key]} onChange={(e) => handleChange(z.key, e.target.checked)} style={{ cursor: 'pointer' }} />
                <span>{z.label}</span>
              </label>
            ))}
          </div>

          {/* 3줄: 기타제한사항 (긴 입력창) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>기타제한사항</label>
            <input type="text" value={formData.otherRestrictions || ''} onChange={(e) => handleChange('otherRestrictions', e.target.value)} placeholder="예: 주차장 제한 등" style={{ flex: 1, minWidth: '280px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
          </div>
          </>
          </div>
        </div>

      {/* 필지목록 편집 모달 — 면적·지목·용도지역·기타제한사항 */}
      {showParcelModal && (
        <div onClick={() => setShowParcelModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '960px', maxWidth: '96vw', maxHeight: '85vh', background: 'white', borderRadius: '10px', boxShadow: '0 12px 32px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>필지목록 <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>({filledParcelCount}건)</span></span>
              <button type="button" onClick={() => setShowParcelModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ ...pTh, width: '310px' }}>소재지</th>
                    <th style={{ ...pTh, width: '110px' }}>필지(지번)</th>
                    <th style={{ ...pTh, width: '100px' }}>면적(㎡)</th>
                    <th style={{ ...pTh, width: '110px' }}>지목</th>
                    <th style={pTh}>용도지역</th>
                    <th style={{ ...pTh, width: '64px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {parcels.map((p, i) => (
                    <tr key={i}>
                      <td style={pTd}><ParcelRegionSelect bjdCode={p.bjdCode || ''} onChange={(code, name) => setFormData((prev) => ({ ...prev, parcels: (prev.parcels || []).map((pp, j) => (j === i ? { ...pp, bjdCode: code, soji: name } : pp)) }))} /></td>
                      <td style={pTd}><input type="text" value={p.jibun || ''} onChange={(e) => updateParcel(i, 'jibun', e.target.value)} style={pInL} placeholder="지번" /></td>
                      <td style={pTd}><input type="number" step="0.01" value={p.landArea || ''} onChange={(e) => updateParcel(i, 'landArea', e.target.value)} style={{ ...pIn, width: '60px' , textAlign: 'right' }} /><span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>㎡</span></td>
                      <td style={pTd}>
                        <select value={p.landCategory || ''} onChange={(e) => updateParcel(i, 'landCategory', e.target.value)} style={pSel}>
                          <option value="">선택</option>
                          {LAND_CATEGORIES.map(cat => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
                        </select>
                      </td>
                      <td style={pTd}>
                        <select value={p.landUse || ''} onChange={(e) => updateParcel(i, 'landUse', e.target.value)} style={pSel}>
                          <option value="">선택</option>
                          {LAND_USES.map(use => (<option key={use.value} value={use.value}>{use.label}</option>))}
                        </select>
                      </td>
                      <td style={pTd}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <button type="button" onClick={() => clearParcel(i)} title="내용 지우기" style={{ ...pDelBtn, color: '#64748b' }}><Eraser size={13} /></button>
                          <button type="button" onClick={() => deleteParcel(i)} title="필지 삭제" style={pDelBtn}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* 행추가 버튼 행 (소유자 카드와 동일 형태) */}
                  <tr>
                    <td colSpan={6} style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center', background: '#f8fafc' }}>
                      <button type="button" onClick={addParcelRow} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', color: '#4f46e5', cursor: 'pointer' }}>+ 행추가</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
