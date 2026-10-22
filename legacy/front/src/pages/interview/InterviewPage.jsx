import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Download, Upload, Filter, X, Calendar, User, FileText, Edit, Trash2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import CustomizableTable from '../../components/ui/CustomizableTable';
import { interviewService } from '../../services/interviewService';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'react-hot-toast';
import ConsultationModal from '../../components/modals/ConsultationModal';

const InterviewPage = () => {
  const { user } = useAuthStore();
  const [interviews, setInterviews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    itvFrDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    itvToDate: new Date().toISOString().split('T')[0],
    itvNo: '',
    custName: '',
    itvContent: '',
    itvMemo: '',
    vendorId: '',
  });
  const [showFilters, setShowFilters] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(20);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  // 상담 유형
  const interviewTypes = [
    { value: 'ITVTYP01', label: '전화상담' },
    { value: 'ITVTYP02', label: '방문상담' },
    { value: 'ITVTYP03', label: '현장상담' },
    { value: 'ITVTYP04', label: '온라인상담' },
  ];

  // 페이지 로드 시 상담 목록 조회
  useEffect(() => {
    fetchInterviews();
  }, [currentPage]);

  // 상담 목록 조회
  const fetchInterviews = async () => {
    setIsLoading(true);
    try {
      const response = await interviewService.getInterviewList({
        itvFrDate: searchFilters.itvFrDate,
        itvToDate: searchFilters.itvToDate,
        itvNo: searchFilters.itvNo || null,
        custName: searchFilters.custName || null,
        itvContent: searchFilters.itvContent || null,
        itvMemo: searchFilters.itvMemo || null,
        vendorId: searchFilters.vendorId || null,
        page: currentPage,
        pageSize: pageSize,
      });

      if (response.success && response.data) {
        setInterviews(response.data.interviews || []);
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (error) {
      console.error('상담 목록 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 검색 필터 변경
  const handleFilterChange = (field, value) => {
    setSearchFilters(prev => ({ ...prev, [field]: value }));
  };

  // 검색 실행
  const handleSearch = () => {
    setCurrentPage(1);
    fetchInterviews();
  };

  // 필터 초기화
  const handleResetFilters = () => {
    setSearchFilters({
      itvFrDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
      itvToDate: new Date().toISOString().split('T')[0],
      itvNo: '',
      custName: '',
      itvContent: '',
      itvMemo: '',
      vendorId: '',
    });
    setCurrentPage(1);
  };

  // 상담 유형 라벨 가져오기
  const getInterviewTypeLabel = (type) => {
    return interviewTypes.find(t => t.value === type)?.label || type;
  };

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return dateString.split('T')[0];
  };

  // 상담 등록 버튼 클릭
  const handleAddConsultation = () => {
    setEditData(null);
    setShowModal(true);
  };

  // 수정 버튼 클릭
  const handleEdit = (interview) => {
    setEditData(interview);
    setShowModal(true);
  };

  // 삭제 버튼 클릭
  const handleDelete = async (itvNo) => {
    if (!window.confirm('이 상담 기록을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await interviewService.deleteInterview(itvNo, user?.userId);
      toast.success('상담 기록이 삭제되었습니다.');
      fetchInterviews();
    } catch (error) {
      console.error('상담 삭제 실패:', error);
    }
  };

  // 모달 성공 콜백
  const handleModalSuccess = () => {
    fetchInterviews();
  };

  // 테이블 컬럼 정의
  const tableColumns = [
    { key: 'itvNo', label: '상담번호' },
    { key: 'itvType', label: '상담유형' },
    { key: 'itvDate', label: '상담일자' },
    { key: 'custName', label: '고객명' },
    { key: 'custPhone', label: '연락처' },
    { key: 'itvContent', label: '상담내용' },
    { key: 'itvMemo', label: '메모' },
    { key: 'regDt', label: '등록일' },
    { key: 'actions', label: '작업' },
  ];

  // 정렬 가능한 컬럼
  const sortableColumns = ['itvNo', 'itvDate', 'custName', 'regDt'];

  // 필터 가능한 컬럼
  const filterableColumns = ['itvNo', 'custName', 'itvContent', 'itvMemo'];

  // 테이블 셀 렌더링
  const renderTableCell = (interview, column) => {
    switch (column.key) {
      case 'itvNo':
        return <span className="font-medium text-indigo-600">{interview.itvNo}</span>;
      case 'itvType':
        return getInterviewTypeLabel(interview.itvType);
      case 'itvDate':
        return formatDate(interview.itvDate);
      case 'custName':
        return interview.custName || '-';
      case 'custPhone':
        return interview.custPhone || '-';
      case 'itvContent':
        return <span className="max-w-xs truncate block">{interview.itvContent || '-'}</span>;
      case 'itvMemo':
        return <span className="max-w-xs truncate block text-gray-500">{interview.itvMemo || '-'}</span>;
      case 'regDt':
        return <span className="text-gray-500">{formatDate(interview.regDt)}</span>;
      case 'actions':
        return (
          <div className="flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(interview);
              }}
              className="text-indigo-600 hover:text-indigo-900"
              title="수정"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(interview.itvNo);
              }}
              className="text-red-600 hover:text-red-900"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      default:
        return interview[column.key] || '-';
    }
  };

  // 페이지 변경 핸들러
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // 테이블 데이터 준비 (고유 id 추가)
  const tableData = interviews.map((interview) => ({
    ...interview,
    id: interview.itvNo,
  }));

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f9fafb' }}>
      {/* 헤더 */}
      <div style={{ padding: '1.5rem', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">상담관리</h1>
            <p className="text-gray-600">고객 상담 내역을 조회하고 관리합니다</p>
          </div>
          <div className="flex space-x-2">
            <button className="flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              <Download className="w-4 h-4 mr-2" />
              다운로드
            </button>
            <button className="flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              <Upload className="w-4 h-4 mr-2" />
              업로드
            </button>
            <button
              onClick={handleAddConsultation}
              className="flex items-center px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              상담등록
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 검색 필터 */}
        <Card className="m-4 mb-2">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">검색 조건</h3>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <Filter className="w-4 h-4 mr-1" />
                {showFilters ? '접기' : '펼치기'}
              </button>
            </div>

            {showFilters && (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-3">
                  {/* 기간 검색 */}
                  <div className="col-span-2 flex items-center space-x-2">
                    <label className="text-sm text-gray-600 whitespace-nowrap">상담일자:</label>
                    <input
                      type="date"
                      value={searchFilters.itvFrDate}
                      onChange={(e) => handleFilterChange('itvFrDate', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span>~</span>
                    <input
                      type="date"
                      value={searchFilters.itvToDate}
                      onChange={(e) => handleFilterChange('itvToDate', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* 상담번호 */}
                  <input
                    type="text"
                    placeholder="상담번호"
                    value={searchFilters.itvNo}
                    onChange={(e) => handleFilterChange('itvNo', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  {/* 고객명 */}
                  <input
                    type="text"
                    placeholder="고객명"
                    value={searchFilters.custName}
                    onChange={(e) => handleFilterChange('custName', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {/* 상담내용 */}
                  <input
                    type="text"
                    placeholder="상담내용"
                    value={searchFilters.itvContent}
                    onChange={(e) => handleFilterChange('itvContent', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  {/* 메모 */}
                  <input
                    type="text"
                    placeholder="메모"
                    value={searchFilters.itvMemo}
                    onChange={(e) => handleFilterChange('itvMemo', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  {/* 협력업체 ID */}
                  <input
                    type="text"
                    placeholder="협력업체 ID"
                    value={searchFilters.vendorId}
                    onChange={(e) => handleFilterChange('vendorId', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  {/* 버튼들 */}
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSearch}
                      className="flex-1 px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                    >
                      <Search className="w-4 h-4 inline mr-1" />
                      검색
                    </button>
                    <button
                      onClick={handleResetFilters}
                      className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      초기화
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 상담 목록 - CustomizableTable 사용 */}
        <Card className="mx-4 mb-4 flex-1 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
          <CustomizableTable
            menuId="interview"
            defaultColumns={tableColumns}
            data={tableData}
            isLoading={isLoading}
            renderCell={renderTableCell}
            onRowClick={handleEdit}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            sortableColumns={sortableColumns}
            filterableColumns={filterableColumns}
            emptyMessage="검색 결과가 없습니다"
          />
        </Card>
      </div>

      {/* 상담 등록/수정 모달 */}
      <ConsultationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleModalSuccess}
        editData={editData}
      />
    </div>
  );
};

export default InterviewPage;
