import React from 'react';
import { BUILDING_USES } from '../../../constants/buildingUses';
import { LAND_USES } from '../../../constants/landUses';
import { LAND_CATEGORIES } from '../../../constants/landCategories';
import { HEAT_METHOD_OPTIONS, HEAT_FUEL_OPTIONS, ENTR_STRUCT_OPTIONS, BUILDING_FORM_OPTIONS, BALCONY_OPTIONS, DIRECTION_OPTIONS, DIRECTION_BASE_OPTIONS } from '../../../constants/propertyOptions';
import AmountInput from '../../ui/AmountInput';
import DateInput from '../../ui/DateInput';
import TradeDivisionSelector from './TradeDivisionSelector';

/**
 * 분양권 좌측 메인 폼 영역 (ApartmentForm 복사본)
 * - 대상 물건유형: 아파트 분양권(SYCA105) / 오피스텔 분양권(SYCA106) (SALES_RIGHT_FORM_CODES)
 * - 아파트폼과 동일 구성 + 금액 row 상단에 분양권 전용 금액표(분양금액/확장금액/옵션금액/프리미엄) 추가
 * - formData/상태는 부모(PropertyFormPageV2)가 소유하고, 이 컴포넌트는 표현(HTML/CSS)만 담당
 */
export default function SalesRightForm({
  formData,
  handleChange,
  setFormData,
  propertyStatuses,
  handleOpenHistory,
  historyCount,
  editData,
  tradeDivisions,
  etcLeaseTypes,
  danjiAreaList,
  handleDanjiAreaSelect,
  holders,
  setHolders,
  shareHistory,
  setShareHistory,
}) {
  // 단지형 전용 값(가독성용)
  const isDanjiType = ['SYCA101', 'SYCA102', 'SYCA103', 'SYCA105', 'SYCA106', 'SYCA107'].includes(formData.ptType);
  const showLandArea = !isDanjiType; // 재건축/재개발 등은 대지면적 노출
  const showBuildingUse = formData.ptType !== 'SYCA115'
    && !['SYCA101', 'SYCA102', 'SYCA105', 'SYCA106', 'SYCA107', 'SYCA104', 'SYCA120'].includes(formData.ptType);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1' }}>

      {/* 세부유형(입주권/분양권)은 상단 매물유형 우측 드롭다운으로 이동 */}

      {/* Row: 면적 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
        <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '500', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <div>면적</div>
          <button type="button" onClick={() => setFormData((p) => {
            const toPyeong = (p.areaUnit || '㎡') === '㎡'; // ㎡→평 방향
            const factor = toPyeong ? 0.302500 : 3.305785; // 1평=3.305785㎡
            const conv = (v) => (v === '' || v == null || isNaN(Number(v))) ? v : String(Math.round(Number(v) * factor * 100) / 100);
            return { ...p, areaUnit: toPyeong ? '평' : '㎡', supArea: conv(p.supArea), excArea: conv(p.excArea), landShare: conv(p.landShare), buildingArea: conv(p.buildingArea), grossArea: conv(p.grossArea) };
          })}
            title="평 / ㎡ 전환 (값도 함께 환산)"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '10px', fontWeight: '700', padding: '0 4px', border: '1px solid #a78bfa', borderRadius: '10px', background: '#ede9fe', color: '#5b4aa8', cursor: 'pointer', boxShadow: '0 1px 1px rgba(0,0,0,0.05)' }}>
            <span style={{ lineHeight: 1 }}>⇄</span>{formData.areaUnit || '㎡'}
          </button>
        </div>
        <div style={{ flex: 1, padding: '6px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {isDanjiType && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>타입</label>
                {danjiAreaList.length > 0 ? (
                  <select value={danjiAreaList.find(a => a.plan_type_name === formData.aptTyp)?.ptp_no || ''} onChange={(e) => handleDanjiAreaSelect(e.target.value)} style={{ width: '72px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                    <option value="">타입</option>
                    {danjiAreaList.map((area) => (
                      <option key={area.ptp_no} value={area.ptp_no}>{area.plan_type_name} ({area.excls_spc}㎡)</option>
                    ))}
                  </select>
                ) : (
                  <select value={formData.aptTyp || ''} onChange={(e) => handleChange('aptTyp', e.target.value)} style={{ width: '72px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                    <option value="">타입</option>
                    <option value="59A">59A</option>
                    <option value="59B">59B</option>
                    <option value="59C">59C</option>
                    <option value="74A">74A</option>
                    <option value="74B">74B</option>
                    <option value="84A">84A</option>
                    <option value="84B">84B</option>
                    <option value="84C">84C</option>
                    <option value="99A">99A</option>
                    <option value="99B">99B</option>
                    <option value="114A">114A</option>
                    <option value="114B">114B</option>
                    <option value="129A">129A</option>
                    <option value="129B">129B</option>
                    <option value="144A">144A</option>
                    <option value="144B">144B</option>
                    <option value="159A">159A</option>
                    <option value="174A">174A</option>
                    <option value="194A">194A</option>
                  </select>
                )}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>공급면적</label>
              <AmountInput decimal value={formData.supArea} onChange={(v) => handleChange('supArea', v)} style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
              <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>{formData.areaUnit || '㎡'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>전용면적</label>
              <AmountInput decimal value={formData.excArea} onChange={(v) => handleChange('excArea', v)} style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
              <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>{formData.areaUnit || '㎡'}</span>
            </div>
            {showLandArea && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>대지면적</label>
                <AmountInput decimal value={formData.landShare} onChange={(v) => handleChange('landShare', v)} style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
                <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>{formData.areaUnit || '㎡'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row: 거래구분 — 구분별 상태 드롭다운(공용 컴포넌트) */}
      <TradeDivisionSelector formData={formData} setFormData={setFormData} etcLeaseTypes={etcLeaseTypes} />

      {/* Row: 금액 (분양권 금액표 + 기본 금액표) */}
      <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
        <div style={{ width: '90px', flexShrink: 0, padding: '6px', fontSize: '14px', fontWeight: '500', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div>금액</div>
          <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '500', lineHeight: '1.4', color: '#fef08a' }}>단위(만원)<br />관리비(원)</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: '6px', overflowX: 'auto' }}>
          {(() => {
            const amtTh = { padding: '7px 4px', border: '1px solid #b8c5db', borderRight: '1.5px solid #94a3b8', background: '#c9d6ea', fontWeight: 700, fontSize: '13px', color: '#1e293b', textAlign: 'center', whiteSpace: 'nowrap' };
            const amtTd = { border: '1px solid #e5e7eb', borderRight: '1.5px solid #b6c0cf', padding: '4px', background: '#f8fafc' };
            const amtTdLight = { ...amtTd, borderRight: '1px solid #e5e7eb' }; // 월세/기타임대 보증금-차임 사이(연한색)
            const amtIn = { width: '100%', padding: '2px 2px', fontSize: '13px', border: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box', background: 'white' };
            return (
              <>
                {/* 분양권 전용 금액 — 라벨+입력창 형식 (표 아님) */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>분양금액</label>
                    <AmountInput value={formData.presaleAmt || ''} onChange={(v) => handleChange('presaleAmt', v)} style={{ width: '55px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', textAlign: 'right' }} /><span style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>만</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>확장금액</label>
                    <AmountInput value={formData.expansionAmt || ''} onChange={(v) => handleChange('expansionAmt', v)} style={{ width: '55px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', textAlign: 'right' }} /><span style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>만</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>옵션금액</label>
                    <AmountInput value={formData.optionAmt || ''} onChange={(v) => handleChange('optionAmt', v)} style={{ width: '55px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', textAlign: 'right' }} /><span style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>만</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>프리미엄</label>
                    <AmountInput value={formData.premiumAmt || ''} onChange={(v) => handleChange('premiumAmt', v)} style={{ width: '55px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', textAlign: 'right' }} /><span style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>만</span>
                  </div>
                </div>
                {/* 기본 금액표 */}
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
              </>
            );
          })()}
          {/* 관리비 / 관리비내역 — 라벨+입력창 (세대수 등과 동일 형태) */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>대출금액</label>
              <AmountInput value={formData.loanAmt} onChange={(v) => handleChange('loanAmt', v)} style={{ width: '55px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} placeholder="" /><span style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>만</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>관리비</label>
              <AmountInput value={formData.maintCost} onChange={(v) => handleChange('maintCost', v)} style={{ width: '55px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} placeholder="" /><span style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>원</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: '240px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>관리비내역</label>
              <input type="text" value={formData.maintDtl} onChange={(e) => handleChange('maintDtl', e.target.value)} placeholder="관리규약에 따라 부과" style={{ flex: 1, minWidth: '180px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Row: 현상황 */}
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
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>주택임대사업자</label>
                <select value={formData.houseRental || ''} onChange={(e) => handleChange('houseRental', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                  <option value="">선택</option>
                  <option value="등록">등록</option>
                  <option value="미등록">미등록</option>
                  <option value="예정">예정</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>계약갱신청구권</label>
                <select value={formData.contractRenewalRight} onChange={(e) => handleChange('contractRenewalRight', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                  <option value="">선택</option>
                  <option value="사용">사용</option>
                  <option value="미사용">미사용</option>
                </select>
              </div>
            </div>
          </div>
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

      {/* Row: 제한사항 (규제지역 / 어린이·반려동물) */}
      <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
        <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '500', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>제한사항</div>
        <div style={{ flex: 1, padding: '6px' }}>
          {/* 위줄: 규제지역 4종 (프론트 전용, 백엔드 연동 예정) */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
            {[
              { key: 'zoneAdjust', label: '청약조정대상지역' },
              { key: 'zoneOverheat', label: '투기과열지구' },
              { key: 'zoneSpec', label: '투기지역' },
              { key: 'zoneLandPermit', label: '토지거래허가구역' },
            ].map((z) => (
              <label key={z.key} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                <input type="checkbox" checked={!!formData[z.key]} onChange={(e) => handleChange(z.key, e.target.checked)} style={{ cursor: 'pointer' }} />
                <span>{z.label}</span>
              </label>
            ))}
          </div>
          {/* 아래줄: 어린이/반려동물 + 공통 조건부 내용 입력창(하나) */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'nowrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>어린이</label>
              <select value={formData.childYn} onChange={(e) => handleChange('childYn', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                <option value="Y">가능</option>
                <option value="N">불가능</option>
                <option value="C">조건부</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>반려동물</label>
              <select value={formData.petAllow} onChange={(e) => handleChange('petAllow', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                <option value="">선택</option>
                <option value="가능">가능</option>
                <option value="불가능">불가능</option>
                <option value="조건부">조건부</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
              <input type="text" value={formData.childCond || ''} onChange={(e) => handleChange('childCond', e.target.value)} placeholder="조건부 내용" style={{ flex: 1, minWidth: 0, padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Row: 상세정보 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
        <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '500', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>상세정보</div>
        <div style={{ flex: 1, padding: '6px' }}>
          {/* 1줄: 세대수, 주차, 준공년도, 방, 욕실 */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>세대수</label>
              <input type="number" value={formData.houseCnt} onChange={(e) => handleChange('houseCnt', e.target.value)} style={{ width: '45px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' , textAlign: 'right' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>총 주차대수</label>
              <input type="number" step="0.1" value={formData.pkCnt} onChange={(e) => handleChange('pkCnt', e.target.value)} style={{ width: '45px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' , textAlign: 'right' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>전기차충전대수</label>
              <input type="number" value={formData.evChargerCnt || ''} onChange={(e) => handleChange('evChargerCnt', e.target.value)} style={{ width: '48px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>준공년도</label>
              <DateInput ymd8 value={formData.compYear} onChange={(v) => handleChange('compYear', v)} style={{ width: '85px', padding: '4px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>

          {/* 2줄: 난방방식, 난방연료, 현관구조, 건물형태 (건물구조는 아파트 계열 숨김) */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>난방방식</label>
              <select value={formData.heatMethod} onChange={(e) => handleChange('heatMethod', e.target.value)} style={{ width: '72px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                <option value="">선택</option>
                {HEAT_METHOD_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>난방연료</label>
              <select value={formData.heatFuel} onChange={(e) => handleChange('heatFuel', e.target.value)} style={{ width: '72px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                <option value="">선택</option>
                {HEAT_FUEL_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>현관구조</label>
              <select value={formData.entrStruct} onChange={(e) => handleChange('entrStruct', e.target.value)} style={{ width: '72px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                <option value="">선택</option>
                {ENTR_STRUCT_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>건물형태</label>
              <select value={formData.buildingForm || ''} onChange={(e) => handleChange('buildingForm', e.target.value)} style={{ width: '72px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                <option value="">선택</option>
                {BUILDING_FORM_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
              </select>
            </div>
          </div>

          {/* 3줄: 발코니, 방향, 방향기준 */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>발코니</label>
              <select value={formData.balcExt} onChange={(e) => handleChange('balcExt', e.target.value)} style={{ width: '75px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                <option value="">선택</option>
                {BALCONY_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>방향</label>
              <select value={formData.dirStd} onChange={(e) => handleChange('dirStd', e.target.value)} style={{ width: '75px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                <option value="">선택</option>
                {DIRECTION_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>방향기준</label>
              <select value={formData.dirBase || ''} onChange={(e) => handleChange('dirBase', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                <option value="">선택</option>
                {DIRECTION_BASE_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
              </select>
            </div>
            {/* 방향기준 우측: 방 수 / 욕실 수 (분양권) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>방 수</label>
              <input type="number" value={formData.roomCnt} onChange={(e) => handleChange('roomCnt', e.target.value)} style={{ width: '30px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>욕실 수</label>
              <input type="number" value={formData.bathCnt} onChange={(e) => handleChange('bathCnt', e.target.value)} style={{ width: '30px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
            </div>
          </div>

          {/* 커뮤니티시설 (직접 입력) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>커뮤니티시설</label>
            <input type="text" value={formData.communityFacility || ''} onChange={(e) => handleChange('communityFacility', e.target.value)} placeholder="예: 헬스장, 골프연습장, 게스트하우스 등" style={{ flex: 1, minWidth: '260px', maxWidth: '520px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
          </div>

          {/* 건축물용도 + 지목 + 용도지역 (주상복합 등 일부 유형) */}
          {showBuildingUse && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>건축물용도</label>
                <select value={formData.buildingUse} onChange={(e) => handleChange('buildingUse', e.target.value)} style={{ width: '130px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                  <option value="">선택</option>
                  {BUILDING_USES.map(use => (
                    <option key={use.code} value={use.code}>{use.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>지목</label>
                <select value={formData.landCategory || ''} onChange={(e) => handleChange('landCategory', e.target.value)} style={{ width: '88px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                  <option value="">선택</option>
                  {LAND_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>용도지역</label>
                <select value={formData.landUse} onChange={(e) => handleChange('landUse', e.target.value)} style={{ width: '130px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                  <option value="">선택</option>
                  {LAND_USES.map(use => (
                    <option key={use.value} value={use.value}>{use.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
