import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, Edit2, Trash2, MessageSquare } from 'lucide-react';
import { interviewService } from '../../services/interviewService';
import ConsultationModal from '../modals/ConsultationModal';
import toast from 'react-hot-toast';

/**
 * 상담 이력 접이식 패널
 * @param {Object} props
 * @param {number} props.custNo - 고객번호
 * @param {number} props.ptNo - 물건번호
 * @param {number} props.vendorId - 협력업체ID
 * @param {Object} props.defaultData - 신규 상담 등록 시 기본값
 * @param {boolean} props.autoOpen - 자동으로 열림 여부
 */
const ConsultationHistoryPanel = ({
  custNo = null,
  ptNo = null,
  vendorId = null,
  defaultData = {},
  autoOpen = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(autoOpen);
  const [consultations, setConsultations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  // 상담 유형 라벨
  const interviewTypes = {
    ITVTYP01: '전화상담',
    ITVTYP02: '방문상담',
    ITVTYP03: '현장상담',
    ITVTYP04: '온라인상담',
  };

  // 상담 목록 조회
  const fetchConsultations = async () => {
    if (!isExpanded) return;

    setIsLoading(true);
    try {
      // 최근 3개월 데이터 조회
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setMonth(fromDate.getMonth() - 3);

      const params = {
        itvFrDate: fromDate.toISOString().split('T')[0],
        itvToDate: toDate.toISOString().split('T')[0],
        page: 1,
        pageSize: 100,
      };

      // 필터 조건 추가
      if (custNo) {
        // custNo로 직접 필터링할 수 없으므로 전체 조회 후 필터링
        // TODO: API에서 custNo 파라미터 지원 시 수정 필요
      }
      if (vendorId) params.vendorId = vendorId;

      const response = await interviewService.getInterviewList(params);

      if (response.success && response.data?.interviews) {
        let filtered = response.data.interviews;

        // 클라이언트 사이드 필터링
        if (custNo) {
          filtered = filtered.filter(itv => itv.custNo === custNo);
        }
        if (ptNo) {
          filtered = filtered.filter(itv => itv.ptNo === ptNo);
        }

        setConsultations(filtered);
      }
    } catch (error) {
      console.error('상담 이력 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      fetchConsultations();
    }
  }, [isExpanded, custNo, ptNo, vendorId]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleAdd = () => {
    setEditData(null);
    setShowModal(true);
  };

  const handleEdit = (consultation) => {
    setEditData(consultation);
    setShowModal(true);
  };

  const handleDelete = async (itvNo) => {
    if (!window.confirm('이 상담 기록을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await interviewService.deleteInterview(itvNo);
      toast.success('상담 기록이 삭제되었습니다.');
      fetchConsultations();
    } catch (error) {
      console.error('상담 삭제 실패:', error);
    }
  };

  const handleModalSuccess = () => {
    fetchConsultations();
  };

  return (
    <div className="border rounded-lg bg-white shadow-sm">
      {/* 헤더 */}
      <div className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors">
        <button
          onClick={handleToggle}
          className="flex items-center gap-2 flex-1"
        >
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-900">상담 이력</span>
          {consultations.length > 0 && (
            <span className="text-sm text-gray-500">({consultations.length}건)</span>
          )}
        </button>
        <button
          onClick={handleAdd}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          상담 등록
        </button>
      </div>

      {/* 내용 */}
      {isExpanded && (
        <div className="border-t">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2">로딩 중...</p>
            </div>
          ) : consultations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>등록된 상담 이력이 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {consultations.map((consultation) => (
                <div key={consultation.itvNo} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {interviewTypes[consultation.itvType] || consultation.itvType}
                        </span>
                        <span className="text-sm text-gray-600">
                          {consultation.itvDate}
                        </span>
                      </div>
                      <div className="text-sm text-gray-900 mb-1">
                        <span className="font-medium">{consultation.custName}</span>
                        {consultation.custPhone && (
                          <span className="text-gray-500 ml-2">{consultation.custPhone}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(consultation)}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="수정"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(consultation.itvNo)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {consultation.itvContent && (
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                      {consultation.itvContent}
                    </p>
                  )}

                  {consultation.itvMemo && (
                    <p className="text-xs text-gray-500 italic">
                      메모: {consultation.itvMemo}
                    </p>
                  )}

                  <div className="text-xs text-gray-400 mt-2">
                    등록: {consultation.regDt ? new Date(consultation.regDt).toLocaleString('ko-KR') : '-'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 상담 모달 */}
      <ConsultationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleModalSuccess}
        editData={editData}
        defaultData={defaultData}
      />
    </div>
  );
};

export default ConsultationHistoryPanel;
