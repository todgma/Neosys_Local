import React from 'react';
import { HEAT_METHOD_OPTIONS, HEAT_FUEL_OPTIONS, DIRECTION_OPTIONS, DIRECTION_BASE_OPTIONS } from '../../../constants/propertyOptions';
import { LAND_USES } from '../../../constants/landUses';
import { LAND_CATEGORIES } from '../../../constants/landCategories';
import { BUILDING_USES } from '../../../constants/buildingUses';
import AmountInput from '../../ui/AmountInput';
import DateInput from '../../ui/DateInput';
import TradeDivisionSelector from './TradeDivisionSelector';

/**
 * 지식산업센터 좌측 메인 폼 영역 (CommercialForm 복사본)
 * - 대상 물건유형: 지식산업센터 (KNOWLEDGE_FORM_CODES = SYCA116)
 * - 지식산업센터 전용 항목은 이 파일에서 개별 조정 예정
 */
export default function KnowledgeCenterForm({
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
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1' }}>

      {/* Row: 면적 (공급/전용/대지/연면적/대지지분) */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>대지면적</label>
              <AmountInput decimal value={formData.landShare} onChange={(v) => handleChange('landShare', v)} style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
              <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>{formData.areaUnit || '㎡'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>연면적</label>
              <AmountInput decimal value={formData.grossArea || ''} onChange={(v) => handleChange('grossArea', v)} style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
              <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>{formData.areaUnit || '㎡'}</span>
            </div>
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
            const amtTdLight = { ...amtTd, borderRight: '1px solid #e5e7eb' }; // 월세/기타임대 보증금-차임 사이(연한색)
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
          {/* 권리금/시설비(관리비 좌측) / 관리비 / 관리비내역 — 한 줄 */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap', marginTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>권리금</label>
              <AmountInput value={formData.layAmt} onChange={(v) => handleChange('layAmt', v)} style={{ width: '55px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} placeholder="" /><span style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>만</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>시설비</label>
              <AmountInput value={formData.facilityCost || ''} onChange={(v) => handleChange('facilityCost', v)} style={{ width: '55px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} placeholder="" /><span style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>만</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>관리비</label>
              <AmountInput value={formData.maintCost} onChange={(v) => handleChange('maintCost', v)} style={{ width: '55px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} placeholder="" /><span style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>만</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>관리비내역</label>
              <input type="text" value={formData.maintDtl} onChange={(e) => handleChange('maintDtl', e.target.value)} placeholder="관리규약에 따라 부과" style={{ flex: 1, minWidth: 0, padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
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
                <input type="text" value={formData.businessName} onChange={(e) => handleChange('businessName', e.target.value)} placeholder="예: OO테크" style={{ width: '150px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>업종</label>
                <input type="text" value={formData.businessType} onChange={(e) => handleChange('businessType', e.target.value)} placeholder="예: 제조업, IT" style={{ width: '150px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row: 추천업종 (바로 입력창 · 프론트 전용) */}
      <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
        <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '500', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>추천업종</div>
        <div style={{ flex: 1, padding: '6px' }}>
          <input type="text" value={formData.recommendedBusiness || ''} onChange={(e) => handleChange('recommendedBusiness', e.target.value)} placeholder="예: 제조, 연구소, 사무 등 추천 업종" style={{ width: '100%', maxWidth: '400px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
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

      {/* Row: 상세정보 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
        <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '500', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>상세정보</div>
        <div style={{ flex: 1, padding: '6px' }}>
          {/* 1줄: 주차, 준공년도, 난방방식, 난방연료 */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>총 주차대수</label>
              <input type="number" step="0.1" value={formData.pkCnt} onChange={(e) => handleChange('pkCnt', e.target.value)} style={{ width: '45px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' , textAlign: 'right' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>준공년도</label>
              <DateInput ymd8 value={formData.compYear} onChange={(v) => handleChange('compYear', v)} style={{ width: '85px', padding: '4px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
            </div>
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
          </div>

          {/* 2줄: 방향, 방향기준, 승강기수, 계단수 */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>승강기수</label>
              <input type="number" value={formData.elevatorCnt || ''} onChange={(e) => handleChange('elevatorCnt', e.target.value)} style={{ width: '30px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' , textAlign: 'right' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>계단수</label>
              <input type="number" value={formData.stairsCnt || ''} onChange={(e) => handleChange('stairsCnt', e.target.value)} style={{ width: '30px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' , textAlign: 'right' }} />
            </div>
          </div>

          {/* 3줄: 건축물용도, 지목, 용도지역 */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>건축물용도</label>
              <select value={formData.buildingUse} onChange={(e) => handleChange('buildingUse', e.target.value)} style={{ width: '130px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                <option value="">선택</option>
                {BUILDING_USES.map((use) => (<option key={use.code} value={use.code}>{use.label}</option>))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>지목</label>
              <select value={formData.landCategory || ''} onChange={(e) => handleChange('landCategory', e.target.value)} style={{ width: '88px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                <option value="">선택</option>
                {LAND_CATEGORIES.map((cat) => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>용도지역</label>
              <select value={formData.landUse} onChange={(e) => handleChange('landUse', e.target.value)} style={{ width: '130px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                <option value="">선택</option>
                {LAND_USES.map((use) => (<option key={use.value} value={use.value}>{use.label}</option>))}
              </select>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
