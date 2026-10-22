import React from 'react';
import { X, Printer } from 'lucide-react';
import { getPropertyTypeLabel } from '../../constants/propertyTypes';
import { useAuthStore } from '../../stores/authStore';
import { getPropertyAddressOneLine } from '../../utils/propertyUtils';
import { saleDivLabel, hasDivision } from '../../constants/tradeDivisions';

const PropertyBriefingPage = ({ onClose, property }) => {
  const { user } = useAuthStore();

  if (!property) return <div>로딩 중...</div>;

  // 랜덤 색상
  const colors = ['#4f46e5', '#0891b2', '#059669', '#dc2626', '#ea580c', '#7c3aed'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  const getSaleDivLabel = (saleDiv) => saleDivLabel(saleDiv, ', ');

  const pageStyle = {
    width: '210mm',
    minHeight: '297mm',
    margin: '0 auto 20px',
    padding: '20mm',
    background: 'white',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  };

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            .scroll-content { overflow: visible !important; }
            .page { margin: 0 !important; box-shadow: none !important; page-break-after: always; }
          }
          .briefing h1 { font-size: 24px; margin-bottom: 20px; color: #1e293b; }
          .briefing h2 { font-size: 15px; margin: 30px 0 15px 0; padding: 8px 12px; background: #1e293b; color: white; font-weight: 600; border-left: 4px solid #3b82f6; }
          .briefing h2:first-of-type { margin-top: 0; }
          .info-section { background: white; border: 1px solid #cbd5e1; padding: 0; margin-bottom: 18px; }
          .briefing table { width: 100%; border-collapse: collapse; }
          .briefing th, .briefing td { padding: 12px 15px; text-align: left; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
          .briefing tr:last-child th, .briefing tr:last-child td { border-bottom: none; }
          .briefing th { background: #f8fafc; font-weight: 600; width: 35%; color: #475569; }
          .briefing td { color: #1e293b; font-weight: 500; }
        `}
      </style>

      {/* 헤더 */}
      <div className="no-print" style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
          매물 브리핑 - {property.ptName || '물건정보'}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
            <Printer style={{ width: '16px', height: '16px' }} />
            인쇄하기
          </button>
          {onClose && (
            <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#64748b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
              <X style={{ width: '16px', height: '16px' }} />
              닫기
            </button>
          )}
        </div>
      </div>

      {/* 스크롤 영역 */}
      <div className="scroll-content" style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {/* 표지 */}
        <div className="page" style={{ ...pageStyle, padding: 0, background: randomColor, color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '20px' }}>{property.ptName || '매물 정보'}</div>
          <div style={{ fontSize: '24px', opacity: 0.9 }}>{getPropertyTypeLabel(property.ptType)} · {getSaleDivLabel(property.saleDiv)}</div>
          <div style={{ fontSize: '18px', opacity: 0.8, marginTop: '30px' }}>{getPropertyAddressOneLine(property)}</div>
          <div style={{ position: 'absolute', bottom: '30px', right: '30px', textAlign: 'right', fontSize: '14px', opacity: 0.9 }}>
            <div style={{ marginBottom: '5px', fontWeight: '600' }}>{user?.offName || '중개사무소'}</div>
            <div>담당: {user?.userName || user?.userId || '담당자'}</div>
          </div>
        </div>

        {/* 기본정보 */}
        <div className="page briefing" style={pageStyle}>
          <h1>매물 기본정보</h1>
          <h2>물건 정보</h2>
          <div className="info-section">
            <table>
              <tbody>
                <tr><th>물건명</th><td>{property.ptName || '-'}</td></tr>
                <tr><th>매물종류</th><td>{getPropertyTypeLabel(property.ptType)}</td></tr>
                <tr><th>거래구분</th><td>{getSaleDivLabel(property.saleDiv)}</td></tr>
              </tbody>
            </table>
          </div>

          <h2>위치 정보</h2>
          <div className="info-section">
            <table>
              <tbody>
                <tr>
                  <th>주소</th>
                  <td>
                    {property.addr1} {property.addr2} {property.addr3}
                    {property.danjiCode ? (
                      <div style={{ marginTop: '4px', color: '#64748b' }}>{property.addr4} {property.dong}동 {property.ho}호</div>
                    ) : (
                      <div style={{ marginTop: '4px', color: '#64748b' }}>{property.addr4} {property.addr5}</div>
                    )}
                  </td>
                </tr>
                <tr><th>층수</th><td>{property.floor || '-'}층</td></tr>
              </tbody>
            </table>
          </div>

          <h2>면적 정보</h2>
          <div className="info-section">
            <table>
              <tbody>
                <tr><th>공급면적</th><td>{property.supArea ? `${property.supArea}㎡` : '-'}</td></tr>
                <tr><th>전용면적</th><td>{property.excArea ? `${property.excArea}㎡` : '-'}</td></tr>
                <tr><th>방 / 욕실</th><td>{property.roomCnt || 0}개 / {property.bathCnt || 0}개</td></tr>
              </tbody>
            </table>
          </div>

          <h2>가격 정보</h2>
          <div className="info-section">
            <table>
              <tbody>
                {hasDivision(property.saleDiv, 'SALEDIV01') && <tr><th>매매가</th><td>{property.saleAmt ? `${property.saleAmt.toLocaleString()}만원` : '-'}</td></tr>}
                {hasDivision(property.saleDiv, 'SALEDIV02') && <tr><th>전세가</th><td>{property.lesAmt ? `${property.lesAmt.toLocaleString()}만원` : '-'}</td></tr>}
                {hasDivision(property.saleDiv, 'SALEDIV03') && (
                  <>
                    <tr><th>보증금</th><td>{property.protAmt ? `${property.protAmt.toLocaleString()}만원` : '-'}</td></tr>
                    <tr><th>월세</th><td>{property.monAmt ? `${property.monAmt.toLocaleString()}만원` : '-'}</td></tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 상세정보 */}
        <div className="page briefing" style={pageStyle}>
          <h1>상세 정보</h1>
          <h2>건물 기본 사항</h2>
          <div className="info-section">
            <table>
              <tbody>
                <tr><th>준공년도</th><td>{property.compYear || '-'}</td></tr>
                <tr><th>건물구조</th><td>{property.buidStruct || '-'}</td></tr>
                <tr><th>출입구조</th><td>{property.entrStruct || '-'}</td></tr>
                <tr><th>주차대수</th><td>{property.pkCnt || '-'}대</td></tr>
              </tbody>
            </table>
          </div>

          <h2>내부 시설</h2>
          <div className="info-section">
            <table>
              <tbody>
                <tr><th>방향</th><td>{property.dirStd || '-'}</td></tr>
                <tr><th>난방방식</th><td>{property.heatMethod || '-'}</td></tr>
                <tr><th>난방연료</th><td>{property.heatFuel || '-'}</td></tr>
                <tr><th>발코니확장</th><td>{property.balcExt === 'Y' ? '확장' : '미확장'}</td></tr>
              </tbody>
            </table>
          </div>

          <h2>관리 및 입주</h2>
          <div className="info-section">
            <table>
              <tbody>
                <tr><th>관리비</th><td>{property.maintCost ? `${property.maintCost.toLocaleString()}원` : '-'}</td></tr>
                <tr><th>입주가능일</th><td>{property.mvnPsbYn === 'Y' ? '즉시입주' : '협의'}</td></tr>
                <tr><th>반려동물</th><td>{property.petYn === 'Y' ? '가능' : '불가'}</td></tr>
                <tr><th>옵션</th><td>{property.opt || '-'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 이미지 */}
        <div className="page briefing" style={pageStyle}>
          <h1>매물 사진</h1>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ width: '100%', height: '200px', background: '#f1f5f9', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px', marginBottom: '15px' }}>
              이미지 영역 {i}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PropertyBriefingPage;
