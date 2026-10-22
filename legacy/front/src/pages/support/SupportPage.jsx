import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { inquiryService } from '../../services/inquiryService';
import Card from '../../components/ui/Card';
import InquiryModal from '../../components/support/InquiryModal';

const SupportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [inquiryList, setInquiryList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(true); // 진입 시 자동으로 모달 오픈
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchInquiryList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchInquiryList = async () => {
    setIsLoading(true);
    try {
      const response = await inquiryService.getInquiryList(
        null,
        user?.userId,
        null,
        null,
        currentPage,
        rowsPerPage
      );
      if (response.success && response.data) {
        setInquiryList(response.data.inquiries || []);
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (error) {
      console.error('문의 목록 조회 실패:', error);
      toast.error('문의 목록 조회에 실패했습니다.');
      setInquiryList([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveInquiry = async (inquiryData) => {
    try {
      const response = await inquiryService.createInquiry({
        ...inquiryData,
        regId: user?.userId,
      });

      if (response.success) {
        toast.success('문의가 접수되었습니다.');
        setIsModalOpen(false);
        fetchInquiryList();
      }
    } catch (error) {
      console.error('문의 접수 실패:', error);
      toast.error(error.message || '문의 접수에 실패했습니다.');
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'PENDING':
        return '대기중';
      case 'ANSWERED':
        return '답변완료';
      case 'CLOSED':
        return '종료';
      default:
        return status || '대기중';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ANSWERED':
        return 'bg-green-100 text-green-800';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
  };

  const handleInquiryClick = (inquiry) => {
    navigate(`/support/${inquiry.inquiryId}`, { state: { inquiry } });
  };

  return (
    <>
      <div className="p-6 space-y-6 bg-gray-50 min-h-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">고객센터</h1>
            <p className="text-gray-600">문의사항을 접수하고 확인하세요</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            문의 접수
          </button>
        </div>

        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">나의 문의 내역</h2>
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">로딩 중...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 list-topline">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-[15px] font-semibold text-gray-700 uppercase tracking-wider">
                          번호
                        </th>
                        <th className="px-6 py-3 text-left text-[15px] font-semibold text-gray-700 uppercase tracking-wider">
                          유형
                        </th>
                        <th className="px-6 py-3 text-left text-[15px] font-semibold text-gray-700 uppercase tracking-wider">
                          제목
                        </th>
                        <th className="px-6 py-3 text-left text-[15px] font-semibold text-gray-700 uppercase tracking-wider">
                          상태
                        </th>
                        <th className="px-6 py-3 text-left text-[15px] font-semibold text-gray-700 uppercase tracking-wider">
                          접수일
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inquiryList.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                            <Headphones className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                            접수된 문의가 없습니다.
                          </td>
                        </tr>
                      ) : (
                        inquiryList.map((inquiry, index) => (
                          <tr
                            key={inquiry.inquiryId}
                            onClick={() => handleInquiryClick(inquiry)}
                            className="hover:bg-gray-50 cursor-pointer"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(currentPage - 1) * rowsPerPage + index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                {inquiry.category || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {inquiry.title}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(inquiry.status)}`}>
                                {getStatusText(inquiry.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(inquiry.regDt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      페이지 {currentPage} / {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                      >
                        이전
                      </button>
                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                      >
                        다음
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {isModalOpen && (
          <InquiryModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveInquiry}
            user={user}
          />
        )}
      </div>
    </>
  );
};

export default SupportPage;
