import React, { useState, useEffect } from 'react';
import { propertyService } from '../../services/propertyService';
import { holderService } from '../../services/holderService';
import { useAuthStore } from '../../stores/authStore';
import ConsultationHistoryPanel from '../../components/consultation/ConsultationHistoryPanel';
import { X, FileText, Paperclip, MessageSquare } from 'lucide-react';
import { PROPERTY_TYPES } from '../../constants/propertyTypes';
import { saleDivLabel } from '../../constants/tradeDivisions';

const PropertyDetailPage = ({ onClose, property: initialProperty, onEdit }) => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('property');
  const [property, setProperty] = useState(initialProperty || {});
  const [holders, setHolders] = useState([]);

  const tabs = [
    { id: 'property', label: '물건정보', icon: FileText },
    { id: 'attachments', label: '첨부파일', icon: Paperclip },
    { id: 'consultation', label: '상담이력', icon: MessageSquare },
  ];

  const propertyStatuses = [
    { value: 'PTSTS01', label: '진행중' },
    { value: 'PTSTS02', label: '계약' },
    { value: 'PTSTS03', label: '타계' },
    { value: 'PTSTS04', label: '보류' },
  ];

  const tradeDivisions = [
    { value: 'SALEDIV01', label: '매매' },
    { value: 'SALEDIV02', label: '전세' },
    { value: 'SALEDIV03', label: '월세' },
    { value: 'SALEDIV04', label: '기타임대' },
  ];

  useEffect(() => {
    if (initialProperty?.ptNo) {
      loadDetailData(initialProperty.ptNo);
    }
  }, [initialProperty]);

  const loadDetailData = async (ptNo) => {
    try {
      const response = await propertyService.getDetail(ptNo);
      if (response?.data) {
        setProperty(response.data);

        // Load holders
        if (response.data.holders && response.data.holders.length > 0) {
          setHolders(response.data.holders);
        }
      }
    } catch (error) {
      console.error('상세 데이터 로드 실패:', error);
    }
  };

  const getPropertyTypeLabel = (code) => {
    const type = PROPERTY_TYPES.find(t => t.code === code);
    return type?.label || code;
  };

  const getStatusLabels = (codes) => {
    if (!codes || !Array.isArray(codes) || codes.length === 0) return '-';
    return codes.map(code => {
      const status = propertyStatuses.find(s => s.value === code);
      return status?.label || code;
    }).join(', ');
  };

  const getTradeDivisionLabels = (codes) => saleDivLabel(Array.isArray(codes) ? codes.join(',') : codes, ', ');

  return (
    <div className="property_v_form-page">
      {/* 헤더 */}
      <div className="property_v_page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 className="property_v_page-title">물건 상세</h1>
          {property.regDt && (
            <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#64748b' }}>
              <span>등록자: {property.regId || '-'}</span>
              <span>등록일: {property.regDt ? new Date(property.regDt).toLocaleDateString() : '-'}</span>
              <span style={{ color: '#ef4444', fontWeight: '500' }}>
                최근수정일: {property.updDt ? new Date(property.updDt).toLocaleString() : '-'}
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="property_v_close-btn"
          title="닫기"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 탭 네비게이션 */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '16px',
        background: '#f8fafc'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === tab.id ? 'white' : 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === tab.id ? '#3b82f6' : '#64748b',
              fontWeight: activeTab === tab.id ? '600' : '400',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="property_v_page-form" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
        {activeTab === 'property' && (
          <div className="property_v_form-content">
            {/* 3개 카드: 소유주 | 매도인/임대인 | 임차인 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              {/* 1. 소유주 카드 */}
              <div style={{ border: '1px solid #cbd5e1', padding: '6px', background: '#f8fafc' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>소유주</div>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', background: 'white' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '4px 2px', border: '1px solid #cbd5e1' }}>성명</th>
                      <th style={{ padding: '4px 2px', border: '1px solid #cbd5e1' }}>연락처</th>
                      <th style={{ padding: '4px 2px', border: '1px solid #cbd5e1' }}>관계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holders.filter(h => h.holderType === 'OWNER').map((holder, index) => (
                      <tr key={index}>
                        <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{holder.holderName || '-'}</td>
                        <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{holder.holderPhone || '-'}</td>
                        <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{holder.holderRelation || '-'}</td>
                      </tr>
                    ))}
                    {holders.filter(h => h.holderType === 'OWNER').length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ padding: '10px', textAlign: 'center', color: '#94a3b8', fontSize: '11px', border: '1px solid #cbd5e1' }}>
                          소유주 정보 없음
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 2. 매도인/임대인 카드 */}
              <div style={{ border: '1px solid #cbd5e1', padding: '6px', background: '#f0fdf4' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>매도인/임대인</div>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', background: 'white' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '4px 2px', border: '1px solid #cbd5e1' }}>성명</th>
                      <th style={{ padding: '4px 2px', border: '1px solid #cbd5e1' }}>연락처</th>
                      <th style={{ padding: '4px 2px', border: '1px solid #cbd5e1' }}>메모</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holders.filter(h => h.holderType === 'SELLER').map((holder, index) => (
                      <tr key={index}>
                        <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{holder.holderName || '-'}</td>
                        <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{holder.holderPhone || '-'}</td>
                        <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{holder.holderMemo || '-'}</td>
                      </tr>
                    ))}
                    {holders.filter(h => h.holderType === 'SELLER').length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ padding: '10px', textAlign: 'center', color: '#94a3b8', fontSize: '11px', border: '1px solid #cbd5e1' }}>
                          매도인/임대인 정보 없음
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 3. 임차인 카드 */}
              <div style={{ border: '1px solid #cbd5e1', padding: '6px', background: '#faf5ff' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>임차인</div>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', background: 'white' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '4px 2px', border: '1px solid #cbd5e1' }}>성명</th>
                      <th style={{ padding: '4px 2px', border: '1px solid #cbd5e1' }}>연락처</th>
                      <th style={{ padding: '4px 2px', border: '1px solid #cbd5e1' }}>메모</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holders.filter(h => h.holderType === 'BUYER').map((holder, index) => (
                      <tr key={index}>
                        <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{holder.holderName || '-'}</td>
                        <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{holder.holderPhone || '-'}</td>
                        <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{holder.holderMemo || '-'}</td>
                      </tr>
                    ))}
                    {holders.filter(h => h.holderType === 'BUYER').length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ padding: '10px', textAlign: 'center', color: '#94a3b8', fontSize: '11px', border: '1px solid #cbd5e1' }}>
                          임차인 정보 없음
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ■ 기본 정보 */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#1e293b' }}>■ 기본 정보</div>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 8px', width: '90px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>물건명</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }} colSpan="3">{property.ptName || '-'}</td>
                    <td style={{ padding: '4px 8px', width: '90px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>물건유형</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{getPropertyTypeLabel(property.ptType)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>물건상태</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }} colSpan="5">{getStatusLabels(property.ptSts)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>물건설명</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }} colSpan="5">{property.ptExpl || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>메모</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }} colSpan="5">{property.ptMemo || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ■ 소재지 */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#1e293b' }}>■ 소재지</div>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 8px', width: '90px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>주소</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }} colSpan="5">
                      <div>{`${property.addr1 || ''} ${property.addr2 || ''} ${property.addr3 || ''} ${property.addr4 || ''}`}</div>
                      <div style={{ marginTop: '4px' }}>{`${property.dong || ''} ${property.floor || ''}층 ${property.ho || ''}호`}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ■ 면적/층 정보 */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#1e293b' }}>■ 면적/층 정보</div>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 8px', width: '90px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>공급면적(㎡)</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.supArea ? parseFloat(property.supArea).toFixed(2) : '-'}</td>
                    <td style={{ padding: '4px 8px', width: '90px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>전용면적(㎡)</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.excArea ? parseFloat(property.excArea).toFixed(2) : '-'}</td>
                    <td style={{ padding: '4px 8px', width: '90px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>대지지분(㎡)</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.landShare ? parseFloat(property.landShare).toFixed(2) : '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>해당층</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.floor1 || '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>탑층</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.floor2 || '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>층(구)</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.floor || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>방 개수</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.roomCnt || '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>욕실 개수</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.bathCnt || '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>주차대수</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.pkCnt || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ■ 건물 정보 */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#1e293b' }}>■ 건물 정보</div>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 8px', width: '90px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>아파트타입</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.aptTyp || '-'}</td>
                    <td style={{ padding: '4px 8px', width: '90px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>세대수</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.houseCnt || '-'}</td>
                    <td style={{ padding: '4px 8px', width: '90px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>방향</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.dirStd || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>난방방식</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.heatMethod || '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>난방연료</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.heatFuel || '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>현관구조</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.entrStruct || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>건물구조</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.buidStruct || '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>발코니확장</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.balcExt === 'Y' ? '확장' : property.balcExt === 'N' ? '미확장' : '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>준공년도</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.compYear || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ■ 금액 정보 */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#1e293b' }}>■ 금액 정보</div>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 8px', width: '90px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>거래구분</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }} colSpan="5">{getTradeDivisionLabels(property.saleDiv)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>매매가(만원)</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.saleAmt ? Number(property.saleAmt).toLocaleString() : '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>전세가(만원)</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.lesAmt ? Number(property.lesAmt).toLocaleString() : '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>보증금(만원)</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.protAmt ? Number(property.protAmt).toLocaleString() : '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>월세(만원)</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.monAmt ? Number(property.monAmt).toLocaleString() : '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>기타임대(만원)</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.etcAmt ? Number(property.etcAmt).toLocaleString() : '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>깔세(만원)</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.layAmt ? Number(property.layAmt).toLocaleString() : '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>현보증금(만원)</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.nowDepAmt ? Number(property.nowDepAmt).toLocaleString() : '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>현월차임(만원)</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.nowMonAmt ? Number(property.nowMonAmt).toLocaleString() : '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>대출금액(만원)</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.loanAmt ? Number(property.loanAmt).toLocaleString() : '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>잔금후대출금액(만원)</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.loanAmtAft ? Number(property.loanAmtAft).toLocaleString() : '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>관리비(만원)</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.maintCost ? Number(property.maintCost).toLocaleString() : '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>관리비 내역</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.maintDtl || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ■ 예정일/기타 정보 */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#1e293b' }}>■ 예정일/기타 정보</div>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 8px', width: '90px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>진행상태</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>
                      {property.prgSts === 'PRGSTS01' ? '접수' : property.prgSts === 'PRGSTS02' ? '진행중' : property.prgSts === 'PRGSTS03' ? '완료' : property.prgSts === 'PRGSTS04' ? '보류' : '-'}
                    </td>
                    <td style={{ padding: '4px 8px', width: '90px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>만기일</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.mtryDate || '-'}</td>
                    <td style={{ padding: '4px 8px', width: '90px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>이사예정일</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.exptMovDate || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>입주예정일</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.exptDate || '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>준공예정일</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.exptComDate || '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>공유여부</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.shaYn === 'Y' ? '공유' : '비공유'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>옵션</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.opt || '-'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>이전가능</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.mvnPsbYn === 'Y' ? '가능' : '불가'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>임대주택</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>{property.houseRental === 'Y' ? '예' : '아니오'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>반려동물</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }} colSpan="2">{property.petYn === 'Y' ? '가능' : '불가'}</td>
                    <td style={{ padding: '4px 8px', fontWeight: '500', border: '1px solid #cbd5e1', background: '#f1f5f9' }}>탑층여부</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }} colSpan="2">{property.top === 'Y' ? '예' : property.top === 'N' ? '아니오' : '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'attachments' && (
          <div className="property_v_form-content">
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              <Paperclip className="w-12 h-12 mx-auto mb-4" style={{ color: '#cbd5e1' }} />
              <p style={{ fontSize: '14px' }}>첨부파일 기능은 준비 중입니다.</p>
            </div>
          </div>
        )}

        {activeTab === 'consultation' && (
          <div className="property_v_form-content">
            {property?.ptNo ? (
              <ConsultationHistoryPanel
                propertyId={property.ptNo}
                isEmbedded={true}
              />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <MessageSquare className="w-12 h-12 mx-auto mb-4" style={{ color: '#cbd5e1' }} />
                <p style={{ fontSize: '14px' }}>물건 정보를 불러올 수 없습니다.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .property_v_form-page {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #f9fafb;
        }

        .property_v_page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 1rem;
          background-color: white;
          border-bottom: 1px solid #e5e7eb;
          flex-shrink: 0;
        }

        .property_v_page-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }

        .property_v_close-btn {
          padding: 0.5rem;
          border-radius: 0.375rem;
          border: none;
          background: none;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.2s;
        }

        .property_v_close-btn:hover {
          background-color: #f3f4f6;
          color: #111827;
        }

        .property_v_page-form {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .property_v_form-content {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }
      `}</style>
    </div>
  );
};

export default PropertyDetailPage;
