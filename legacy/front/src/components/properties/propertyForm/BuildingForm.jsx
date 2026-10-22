import React, { useState } from 'react';
import LeaseStatusModal from './LeaseStatusModal';
import { LAND_USES } from '../../../constants/landUses';
import { LAND_CATEGORIES } from '../../../constants/landCategories';
import { HEAT_METHOD_OPTIONS, HEAT_FUEL_OPTIONS } from '../../../constants/propertyOptions';
import AmountInput from '../../ui/AmountInput';
import DateInput from '../../ui/DateInput';
import TradeDivisionSelector from './TradeDivisionSelector';

/**
 * 건물(빌딩) 좌측 메인 폼 영역 (CommercialForm 복사본)
 * - 대상 물건유형: 빌딩/건물 (BUILDING_FORM_CODES = SYCA108)
 * - 면적 = 대지면적/건축면적/연면적/대지지분, 일정 row 없음
 * - 세부유형(빌딩/상업시설/숙박·콘도/특수시설)은 상단 헤더 드롭다운(PropertyFormPageV2)에서 처리
 */
export default function BuildingForm({
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
  const [showLeaseStatus, setShowLeaseStatus] = useState(false);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1' }}>

      {/* Row: 면적 (대지/건축/연면적/대지지분) */}
      <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
        <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '500', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <div>면적</div>
          <button type="button" onClick={() => setFormData((p) => {
            const toPyeong = (p.areaUnit || '㎡') === '㎡'; // ㎡→평 방향
            const factor = toPyeong ? 0.302500 : 3.305785; // 1평=3.305785㎡
            const conv = (v) => (v === '' || v == null || isNaN(Number(v))) ? v : String(Math.round(Number(v) * factor * 100) / 100);
            return { ...p, areaUnit: toPyeong ? '평' : '㎡', landShare: conv(p.landShare), buildingArea: conv(p.buildingArea), grossArea: conv(p.grossArea) };
          })}
            title="평 / ㎡ 전환 (값도 함께 환산)"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '10px', fontWeight: '700', padding: '0 4px', border: '1px solid #a78bfa', borderRadius: '10px', background: '#ede9fe', color: '#5b4aa8', cursor: 'pointer', boxShadow: '0 1px 1px rgba(0,0,0,0.05)' }}>
            <span style={{ lineHeight: 1 }}>⇄</span>{formData.areaUnit || '㎡'}
          </button>
        </div>
        <div style={{ flex: 1, padding: '6px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>대지면적</label>
              <AmountInput decimal value={formData.landShare} onChange={(v) => handleChange('landShare', v)} style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
              <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>{formData.areaUnit || '㎡'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>건축면적</label>
              <AmountInput decimal value={formData.buildingArea || ''} onChange={(v) => handleChange('buildingArea', v)} style={{ width: '52px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
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

      {/* Row: 거래구분 — 건물/빌딩은 매매만(공용 컴포넌트, onlyKeys=매매) */}
      <TradeDivisionSelector formData={formData} setFormData={setFormData} etcLeaseTypes={etcLeaseTypes} onlyKeys={['sale']} />

      {/* Row: 금액 (권리금/시설비, 대출금액 없음) */}
      <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
        <div style={{ width: '90px', flexShrink: 0, padding: '6px', fontSize: '14px', fontWeight: '500', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div>금액</div>
          <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '500', lineHeight: '1.3', color: '#fef08a' }}>단위(만원)</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: '6px', overflowX: 'auto' }}>
          {(() => {
            const n = (v) => parseFloat(v) || 0;
            const incM = n(formData.incRentM) + n(formData.incMgmtM) + n(formData.incEtcM);
            const incY = n(formData.incRentY) + n(formData.incMgmtY) + n(formData.incEtcY);
            const expM = n(formData.expLaborM) + n(formData.expUtilM) + n(formData.expLoanM) + n(formData.expEtcM);
            const expY = n(formData.expLaborY) + n(formData.expUtilY) + n(formData.expLoanY) + n(formData.expEtcY);
            const topLbl = { fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' };
            const topIn = { width: '56px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1', textAlign: 'right', boxSizing: 'border-box' };
            const th = { padding: '5px 4px', border: '1px solid #cbd5e1', background: '#f1f5f9', fontWeight: 700, fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap', color: '#334155' };
            const lblIn = { padding: '5px 4px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 700, fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap', color: '#1d4ed8' };
            const lblEx = { ...lblIn, color: '#c2410c' };
            const cell = { border: '1px solid #cbd5e1', padding: '2px' };
            const inp = { width: '100%', padding: '4px 6px', fontSize: '13px', border: 'none', outline: 'none', textAlign: 'right', boxSizing: 'border-box', background: 'white' };
            const sumTd = { border: '1px solid #cbd5e1', background: '#f8fafc', textAlign: 'right', padding: '4px 6px', fontSize: '13px', fontWeight: 700, color: '#1e293b' };
            const fmt = (v) => (v ? v.toLocaleString() : '');
            return (
              <div>
                {/* 상단: 매매금액 / 보증금총액 / 대출금액 / 투자금액 */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={topLbl}>매매금액</span>
                    <AmountInput value={formData.saleAmt} onChange={(v) => handleChange('saleAmt', v)} style={topIn} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={topLbl}>보증금총액</span>
                    <AmountInput value={formData.depositTotal || ''} onChange={(v) => handleChange('depositTotal', v)} style={topIn} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={topLbl}>대출금액</span>
                    <AmountInput value={formData.loanTotal || ''} onChange={(v) => handleChange('loanTotal', v)} style={topIn} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={topLbl}>투자금액</span>
                    <AmountInput value={formData.investAmt || ''} onChange={(v) => handleChange('investAmt', v)} style={topIn} />
                  </div>
                </div>
                {/* 수입 · 지출 분석표 */}
                <table style={{ width: '510px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '56px' }} />
                    <col style={{ width: '69px' }} />
                    <col style={{ width: '69px' }} />
                    <col style={{ width: '178px' }} />
                    <col style={{ width: '69px' }} />
                    <col style={{ width: '69px' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={th}>항목</th>
                      <th style={th}>월수입</th>
                      <th style={th}>년수입</th>
                      <th style={th}>항목</th>
                      <th style={th}>월지출</th>
                      <th style={th}>년지출</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={lblIn}>차임</td>
                      <td style={cell}><AmountInput value={formData.incRentM || ''} onChange={(v) => handleChange('incRentM', v)} style={inp} /></td>
                      <td style={cell}><AmountInput value={formData.incRentY || ''} onChange={(v) => handleChange('incRentY', v)} style={inp} /></td>
                      <td style={lblEx}>인건비</td>
                      <td style={cell}><AmountInput value={formData.expLaborM || ''} onChange={(v) => handleChange('expLaborM', v)} style={inp} /></td>
                      <td style={cell}><AmountInput value={formData.expLaborY || ''} onChange={(v) => handleChange('expLaborY', v)} style={inp} /></td>
                    </tr>
                    <tr>
                      <td style={lblIn}>관리비</td>
                      <td style={cell}><AmountInput value={formData.incMgmtM || ''} onChange={(v) => handleChange('incMgmtM', v)} style={inp} /></td>
                      <td style={cell}><AmountInput value={formData.incMgmtY || ''} onChange={(v) => handleChange('incMgmtY', v)} style={inp} /></td>
                      <td style={lblEx}>공과금(전기,가스,수도)</td>
                      <td style={cell}><AmountInput value={formData.expUtilM || ''} onChange={(v) => handleChange('expUtilM', v)} style={inp} /></td>
                      <td style={cell}><AmountInput value={formData.expUtilY || ''} onChange={(v) => handleChange('expUtilY', v)} style={inp} /></td>
                    </tr>
                    <tr>
                      <td style={lblIn}>기타</td>
                      <td style={cell}><AmountInput value={formData.incEtcM || ''} onChange={(v) => handleChange('incEtcM', v)} style={inp} /></td>
                      <td style={cell}><AmountInput value={formData.incEtcY || ''} onChange={(v) => handleChange('incEtcY', v)} style={inp} /></td>
                      <td style={lblEx}>대출이자</td>
                      <td style={cell}><AmountInput value={formData.expLoanM || ''} onChange={(v) => handleChange('expLoanM', v)} style={inp} /></td>
                      <td style={cell}><AmountInput value={formData.expLoanY || ''} onChange={(v) => handleChange('expLoanY', v)} style={inp} /></td>
                    </tr>
                    <tr>
                      <td style={lblIn}></td>
                      <td style={cell}></td>
                      <td style={cell}></td>
                      <td style={lblEx}>기타</td>
                      <td style={cell}><AmountInput value={formData.expEtcM || ''} onChange={(v) => handleChange('expEtcM', v)} style={inp} /></td>
                      <td style={cell}><AmountInput value={formData.expEtcY || ''} onChange={(v) => handleChange('expEtcY', v)} style={inp} /></td>
                    </tr>
                    <tr>
                      <td style={lblIn}>합계</td>
                      <td style={sumTd}>{fmt(incM)}</td>
                      <td style={sumTd}>{fmt(incY)}</td>
                      <td style={lblEx}>합계</td>
                      <td style={sumTd}>{fmt(expM)}</td>
                      <td style={sumTd}>{fmt(expY)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Row: 현상황 (+ 업종/상호) */}
      <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1' }}>
        <div style={{ width: '90px', padding: '6px', fontSize: '14px', fontWeight: '500', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div>현상황</div>
        </div>
        <div style={{ flex: 1, padding: '6px' }}>
          {/* 임대차현황서 / 수익분석표 버튼만 노출 (그 외 항목 제거) */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button type="button" onClick={() => setShowLeaseStatus(true)} style={{ padding: '5px 12px', fontSize: '13px', fontWeight: 600, border: '1px solid #6366f1', borderRadius: '4px', background: 'white', color: '#4f46e5', cursor: 'pointer', whiteSpace: 'nowrap' }}>임대차현황서</button>
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
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>전기차충전대수</label>
              <input type="number" value={formData.evChargerCnt || ''} onChange={(e) => handleChange('evChargerCnt', e.target.value)} style={{ width: '48px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
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
            {/* 승강기수 / 계단수 — 난방연료 우측 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>승강기수</label>
              <input type="number" value={formData.elevatorCnt || ''} onChange={(e) => handleChange('elevatorCnt', e.target.value)} style={{ width: '30px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' , textAlign: 'right' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>계단수</label>
              <input type="number" value={formData.stairsCnt || ''} onChange={(e) => handleChange('stairsCnt', e.target.value)} style={{ width: '30px', padding: '2px 2px', fontSize: '13px', border: '1px solid #cbd5e1' , textAlign: 'right' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>건물구조</label>
              <select value={formData.buidStruct} onChange={(e) => handleChange('buidStruct', e.target.value)} style={{ width: '84px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                <option value="">선택</option>
                <option value="철근콘크리트">철근콘크리트</option>
                <option value="철골">철골</option>
                <option value="철골콘크리트">철골콘크리트</option>
                <option value="벽돌">벽돌</option>
                <option value="기타">기타</option>
              </select>
            </div>
          </div>

          {/* 건축물주용도 + 용도지역 (인라인) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>건축물주용도</label>
              <select value={formData.mainBuildingUse || ''} onChange={(e) => handleChange('mainBuildingUse', e.target.value)} style={{ width: '110px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                <option value="">선택</option>
                <option value="주용도1">주용도1</option>
                <option value="주용도2">주용도2</option>
                <option value="주용도3">주용도3</option>
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
        </div>
      </div>

      {/* 임대차현황서 모달 */}
      <LeaseStatusModal open={showLeaseStatus} onClose={() => setShowLeaseStatus(false)} formData={formData} onChange={(rows) => handleChange('leaseRows', rows)} />
    </div>
  );
}
