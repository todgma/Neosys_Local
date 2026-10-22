import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import Card from '../../components/ui/Card';

const NoticeDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const notice = location.state?.notice;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
  };

  if (!notice) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-full">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/notices')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            목록으로
          </button>
        </div>
        <Card>
          <div className="p-6 text-center py-12">
            <Bell className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">공지사항을 찾을 수 없습니다.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/notices')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          목록으로
        </button>
      </div>

      <Card>
        <div className="p-6">
          <div className="space-y-4">
            <div className="border-b pb-4">
              <div className="flex items-center gap-2 mb-2">
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
              <h1 className="text-2xl font-bold text-gray-900">{notice.title}</h1>
              <p className="mt-2 text-sm text-gray-500">
                작성일: {formatDate(notice.regDt)}
              </p>
            </div>

            <div className="py-6">
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-gray-700">{notice.content}</p>
              </div>
            </div>

            {notice.attachFile && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">첨부파일</p>
                <a
                  href={notice.attachFile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  {notice.attachFile}
                </a>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default NoticeDetailPage;
