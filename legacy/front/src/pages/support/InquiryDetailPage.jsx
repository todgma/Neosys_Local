import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Headphones } from 'lucide-react';
import Card from '../../components/ui/Card';

const InquiryDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const inquiry = location.state?.inquiry;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
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

  if (!inquiry) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-full">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/support')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            목록으로
          </button>
        </div>
        <Card>
          <div className="p-6 text-center py-12">
            <Headphones className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">문의 내역을 찾을 수 없습니다.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/support')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          목록으로
        </button>
      </div>

      <Card>
        <div className="p-6">
          <div className="space-y-6">
            {/* 문의 정보 */}
            <div className="border-b pb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  {inquiry.category || '-'}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(inquiry.status)}`}>
                  {getStatusText(inquiry.status)}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{inquiry.title}</h1>
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">문의자:</span> {inquiry.name || '-'}
                </div>
                <div>
                  <span className="font-medium">연락처:</span> {inquiry.phone || '-'}
                </div>
                <div>
                  <span className="font-medium">이메일:</span> {inquiry.email || '-'}
                </div>
                <div>
                  <span className="font-medium">접수일:</span> {formatDate(inquiry.regDt)}
                </div>
              </div>
            </div>

            {/* 문의 내용 */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">문의 내용</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="whitespace-pre-wrap text-gray-700">{inquiry.content}</p>
              </div>
            </div>

            {/* 답변 내용 */}
            {inquiry.answer && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">답변</h2>
                <div className="bg-indigo-50 rounded-lg p-4">
                  <p className="whitespace-pre-wrap text-gray-700">{inquiry.answer}</p>
                  {inquiry.answerDt && (
                    <p className="mt-3 text-sm text-gray-500">
                      답변일: {formatDate(inquiry.answerDt)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 답변 대기 중 메시지 */}
            {!inquiry.answer && inquiry.status === 'PENDING' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">답변</h2>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <p className="text-yellow-800">답변 대기 중입니다.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InquiryDetailPage;
