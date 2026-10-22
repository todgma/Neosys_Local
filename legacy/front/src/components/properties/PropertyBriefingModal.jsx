import React, { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { getPropertyTypeLabel } from '../../constants/propertyTypes';
import { useAuthStore } from '../../stores/authStore';
import { saleDivLabel, hasDivision } from '../../constants/tradeDivisions';

const PropertyBriefingModal = ({ isOpen, onClose, property }) => {
  const printRef = useRef();
  const { user } = useAuthStore();

  if (!isOpen || !property) return null;

  // 랜덤 색상 선택 (썸네일용)
  const thumbnailColors = [
    '#4f46e5', // indigo
    '#0891b2', // cyan
    '#059669', // emerald
    '#dc2626', // red
    '#ea580c', // orange
    '#7c3aed', // violet
  ];
  const randomColor = thumbnailColors[Math.floor(Math.random() * thumbnailColors.length)];

  // 인쇄 핸들러
  const handlePrint = () => {
    const printContent = printRef.current;
    const printWindow = window.open('', '_blank');

    printWindow.document.write(`
      <html>
        <head>
          <title>매물 브리핑 - ${property.ptName || '물건정보'}</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: 'Malgun Gothic', sans-serif;
              margin: 0;
              padding: 0;
            }
            .page {
              width: 210mm;
              height: 297mm;
              padding: 20mm;
              box-sizing: border-box;
              page-break-after: always;
              background: white;
            }
            .page:last-child {
              page-break-after: auto;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 10px;
              color: #1e293b;
            }
            h2 {
              font-size: 15px;
              margin: 30px 0 12px 0;
              padding: 8px 12px;
              background: #1e293b;
              color: white;
              font-weight: 600;
              border-left: 4px solid #3b82f6;
            }
            h2:first-of-type {
              margin-top: 15px;
            }
            h3 {
              font-size: 13px;
              margin: 15px 0 8px 0;
              padding: 6px 10px;
              background: #f1f5f9;
              color: #475569;
              font-weight: 600;
              border-left: 3px solid #94a3b8;
            }
            .info-section {
              background: white;
              border: 1px solid #cbd5e1;
              padding: 0;
              margin-bottom: 18px;
            }
            .info-row {
              display: flex;
              border-bottom: 1px solid #e2e8f0;
              padding: 0;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              width: 35%;
              padding: 10px 15px;
              background: #f8fafc;
              font-weight: 600;
              color: #475569;
              font-size: 13px;
              border-right: 1px solid #e2e8f0;
            }
            .info-value {
              width: 65%;
              padding: 10px 15px;
              color: #1e293b;
              font-size: 13px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 0;
            }
            th, td {
              padding: 12px 15px;
              border: none;
              text-align: left;
              font-size: 13px;
              border-bottom: 1px solid #e2e8f0;
            }
            tr:last-child th,
            tr:last-child td {
              border-bottom: none;
            }
            th {
              background: white;
              font-weight: 600;
              width: 35%;
              color: #475569;
            }
            td {
              color: #1e293b;
              font-weight: 500;
            }
            .thumbnail-page {
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              background: ${randomColor};
              color: white;
            }
            .thumbnail-title {
              font-size: 48px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .thumbnail-subtitle {
              font-size: 24px;
              opacity: 0.9;
            }
            .image-placeholder {
              width: 100%;
              height: 200px;
              background: #f1f5f9;
              border: 2px dashed #cbd5e1;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #64748b;
              font-size: 14px;
              margin-bottom: 15px;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();

    // 인쇄 다이얼로그 열기
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // 진행상태 매핑
  const getPrgStsLabel = (prgSts) => {
    const labels = {
      'PRGSTS01': '대기',
      'PRGSTS02': '진행',
      'PRGSTS03': '보류',
      'PRGSTS04': '완료',
      'PRGSTS05': '취소',
    };
    return labels[prgSts] || prgSts;
  };

  // 거래구분 매핑(상태 접미 포함, 여러 구분은 콤마로 연결)
  const getSaleDivLabel = (saleDiv) => saleDivLabel(saleDiv, ', ');

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#f8fafc',
          width: '90%',
          maxWidth: '900px',
          height: '90vh',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div
          style={{
            padding: '16px 24px',
            background: 'white',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
            매물 브리핑 미리보기
          </h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              <Printer className="w-4 h-4" />
              인쇄하기
            </button>
            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: '#64748b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              <X className="w-4 h-4" />
              닫기
            </button>
          </div>
        </div>

        {/* 미리보기 영역 */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
          }}
        >
          <div ref={printRef}>
            {/* 1페이지: 썸네일 */}
            <div className="page thumbnail-page" style={{
              width: '210mm',
              height: '297mm',
              margin: '0 auto 20px',
              boxSizing: 'border-box',
              background: randomColor,
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              position: 'relative',
            }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '20px' }}>
                {property.ptName || '매물 정보'}
              </div>
              <div style={{ fontSize: '24px', opacity: 0.9 }}>
                {getPropertyTypeLabel(property.ptType)} · {getSaleDivLabel(property.saleDiv)}
              </div>
              <div style={{ fontSize: '18px', opacity: 0.8, marginTop: '30px' }}>
                {property.addr1} {property.addr2} {property.addr3}
              </div>

              {/* 우하단: 사무소 및 담당자 정보 */}
              <div style={{
                position: 'absolute',
                bottom: '30px',
                right: '30px',
                textAlign: 'right',
                fontSize: '14px',
                opacity: 0.9,
              }}>
                <div style={{ marginBottom: '5px', fontWeight: '600' }}>
                  {user?.offName || '중개사무소'}
                </div>
                <div>
                  담당: {user?.userName || user?.userId || '담당자'}
                </div>
              </div>
            </div>

            {/* 2페이지: 기본정보 */}
            <div className="page" style={{
              width: '210mm',
              height: '297mm',
              margin: '0 auto 20px',
              padding: '20mm',
              boxSizing: 'border-box',
              background: 'white',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}>
              <h1>매물 기본정보</h1>

              <h2>기본 정보</h2>
              <div className="info-section">
                <h3>물건 정보</h3>
                <table>
                  <tbody>
                    <tr>
                      <th>물건명</th>
                      <td>{property.ptName || '-'}</td>
                    </tr>
                    <tr>
                      <th>매물종류</th>
                      <td>{getPropertyTypeLabel(property.ptType)}</td>
                    </tr>
                    <tr>
                      <th>거래구분</th>
                      <td>{getSaleDivLabel(property.saleDiv)}</td>
                    </tr>
                    <tr>
                      <th>진행상태</th>
                      <td>{getPrgStsLabel(property.prgSts)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="info-section">
                <h3>위치 정보</h3>
                <table>
                <tbody>
                  <tr>
                    <th>주소</th>
                    <td>
                      {property.addr1} {property.addr2} {property.addr3}
                      {property.danjiCode && (
                        <div style={{ marginTop: '4px', color: '#64748b' }}>
                          {property.addr4} {property.dong}동 {property.ho}호
                        </div>
                      )}
                      {!property.danjiCode && (
                        <div style={{ marginTop: '4px', color: '#64748b' }}>
                          {property.addr4} {property.addr5}
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>층수</th>
                    <td>{property.floor || '-'}층</td>
                  </tr>
                </tbody>
              </table>
              </div>

              <h2>면적 및 가격</h2>
              <div className="info-section">
                <h3>면적</h3>
              <table>
                <tbody>
                  <tr>
                    <th>공급면적</th>
                    <td>{property.supArea ? `${property.supArea}㎡` : '-'}</td>
                  </tr>
                  <tr>
                    <th>전용면적</th>
                    <td>{property.excArea ? `${property.excArea}㎡` : '-'}</td>
                  </tr>
                  <tr>
                    <th>방 / 욕실</th>
                    <td>{property.roomCnt || 0}개 / {property.bathCnt || 0}개</td>
                  </tr>
                  {hasDivision(property.saleDiv, 'SALEDIV01') && (
                    <tr>
                      <th>매매가</th>
                      <td>{property.saleAmt ? `${property.saleAmt.toLocaleString()}만원` : '-'}</td>
                    </tr>
                  )}
                  {hasDivision(property.saleDiv, 'SALEDIV02') && (
                    <tr>
                      <th>전세가</th>
                      <td>{property.lesAmt ? `${property.lesAmt.toLocaleString()}만원` : '-'}</td>
                    </tr>
                  )}
                  {hasDivision(property.saleDiv, 'SALEDIV03') && (
                    <>
                      <tr>
                        <th>보증금</th>
                        <td>{property.protAmt ? `${property.protAmt.toLocaleString()}만원` : '-'}</td>
                      </tr>
                      <tr>
                        <th>월세</th>
                        <td>{property.monAmt ? `${property.monAmt.toLocaleString()}만원` : '-'}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
              </div>
            </div>

            {/* 3페이지: 상세정보 */}
            <div className="page" style={{
              width: '210mm',
              height: '297mm',
              margin: '0 auto 20px',
              padding: '20mm',
              boxSizing: 'border-box',
              background: 'white',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}>
              <h1>상세 정보</h1>
              <h2>건물 정보</h2>
              <div className="info-section">
              <table>
                <tbody>
                  <tr>
                    <th>준공년도</th>
                    <td>{property.compYear || '-'}</td>
                  </tr>
                  <tr>
                    <th>건물구조</th>
                    <td>{property.buidStruct || '-'}</td>
                  </tr>
                  <tr>
                    <th>출입구조</th>
                    <td>{property.entrStruct || '-'}</td>
                  </tr>
                  <tr>
                    <th>방향</th>
                    <td>{property.dirStd || '-'}</td>
                  </tr>
                  <tr>
                    <th>난방방식</th>
                    <td>{property.heatMethod || '-'}</td>
                  </tr>
                  <tr>
                    <th>난방연료</th>
                    <td>{property.heatFuel || '-'}</td>
                  </tr>
                  <tr>
                    <th>발코니확장</th>
                    <td>{property.balcExt === 'Y' ? '확장' : '미확장'}</td>
                  </tr>
                  <tr>
                    <th>주차대수</th>
                    <td>{property.pkCnt || '-'}대</td>
                  </tr>
                </tbody>
              </table>
              </div>

              <h2>추가 정보</h2>
              <div className="info-section">
              <table>
                <tbody>
                  <tr>
                    <th>관리비</th>
                    <td>{property.maintCost ? `${property.maintCost.toLocaleString()}원` : '-'}</td>
                  </tr>
                  <tr>
                    <th>입주가능일</th>
                    <td>{property.mvnPsbYn === 'Y' ? '즉시입주' : '협의'}</td>
                  </tr>
                  <tr>
                    <th>반려동물</th>
                    <td>{property.petYn === 'Y' ? '가능' : '불가'}</td>
                  </tr>
                  <tr>
                    <th>옵션</th>
                    <td>{property.opt || '-'}</td>
                  </tr>
                </tbody>
              </table>
              </div>

              {property.ptMemo && (
                <>
                  <h2>메모</h2>
                  <div className="info-section" style={{
                    fontSize: '13px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {property.ptMemo}
                  </div>
                </>
              )}
            </div>

            {/* 4페이지: 이미지 */}
            <div className="page" style={{
              width: '210mm',
              height: '297mm',
              margin: '0 auto',
              padding: '20mm',
              boxSizing: 'border-box',
              background: 'white',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}>
              <h1>매물 사진</h1>
              <div style={{
                width: '100%',
                height: '200px',
                background: '#f1f5f9',
                border: '2px dashed #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontSize: '14px',
                marginBottom: '15px',
              }}>
                이미지 영역 1
              </div>
              <div style={{
                width: '100%',
                height: '200px',
                background: '#f1f5f9',
                border: '2px dashed #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontSize: '14px',
                marginBottom: '15px',
              }}>
                이미지 영역 2
              </div>
              <div style={{
                width: '100%',
                height: '200px',
                background: '#f1f5f9',
                border: '2px dashed #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontSize: '14px',
              }}>
                이미지 영역 3
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyBriefingModal;
