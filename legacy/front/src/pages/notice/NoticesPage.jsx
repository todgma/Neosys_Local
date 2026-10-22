import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { noticeService } from '../../services/noticeService';
import Card from '../../components/ui/Card';

const NoticesPage = () => {
  const navigate = useNavigate();
  const [noticeList, setNoticeList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchNoticeList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchNoticeList = async () => {
    setIsLoading(true);
    try {
      const response = await noticeService.getNoticeList(
        null,
        null,
        'Y', // 공개된 공지사항만 조회
        currentPage,
        rowsPerPage
      );
      if (response.success && response.data) {
        setNoticeList(response.data.notices || []);
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (error) {
      console.error('공지사항 목록 조회 실패:', error);
      toast.error('공지사항 목록 조회에 실패했습니다.');
      setNoticeList([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
  };

  const handleNoticeClick = (notice) => {
    navigate(`/notices/${notice.noticeId}`, { state: { notice } });
  };

  return (
    <>
      <div className="p-6 space-y-6 bg-gray-50 min-h-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>돌아가기</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">공지사항</h1>
              <p className="text-gray-600">시스템 공지사항을 확인하세요</p>
            </div>
          </div>
        </div>

        <Card>
          <div className="p-6">
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
                          구분
                        </th>
                        <th className="px-6 py-3 text-left text-[15px] font-semibold text-gray-700 uppercase tracking-wider">
                          제목
                        </th>
                        <th className="px-6 py-3 text-left text-[15px] font-semibold text-gray-700 uppercase tracking-wider">
                          작성일
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {noticeList.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                            등록된 공지사항이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        noticeList.map((notice, index) => (
                          <tr
                            key={notice.noticeId}
                            onClick={() => handleNoticeClick(notice)}
                            className="hover:bg-gray-50 cursor-pointer"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(currentPage - 1) * rowsPerPage + index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center gap-2">
                                {notice.isTop === 'Y' && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                                    필독
                                  </span>
                                )}
                                {notice.category && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                                    {notice.category}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {notice.title}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(notice.regDt)}
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
      </div>
    </>
  );
};

export default NoticesPage;
