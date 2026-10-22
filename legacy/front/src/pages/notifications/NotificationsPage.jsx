import React, { useState, useEffect } from 'react';
import { Bell, BellRing, CheckCheck, Trash2, MessageSquare, FileText, Network } from 'lucide-react';
import Card from '../../components/ui/Card';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';

const NotificationsPage = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'notice', 'hub'
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 목 데이터
  const mockNotifications = [
    {
      id: 1,
      type: 'notice',
      title: '시스템 점검 안내',
      content: '2024년 1월 15일 새벽 2시~4시까지 시스템 점검이 있습니다.',
      isRead: false,
      createdAt: '2024-01-10T10:30:00',
      icon: FileText,
      color: 'blue',
    },
    {
      id: 2,
      type: 'hub',
      title: '새로운 공동중개 요청',
      content: '강남구 역삼동 아파트 매매 고객을 찾습니다. (예산: 10억)',
      isRead: false,
      createdAt: '2024-01-10T09:15:00',
      icon: Network,
      color: 'green',
      tradeDiv: 'CUST',
    },
    {
      id: 3,
      type: 'hub',
      title: '공동중개 물건 등록',
      content: '서초구 반포동 오피스텔 전세 물건이 등록되었습니다.',
      isRead: true,
      createdAt: '2024-01-09T16:45:00',
      icon: Network,
      color: 'green',
      tradeDiv: 'PT',
    },
    {
      id: 4,
      type: 'system',
      title: '계약서 승인 완료',
      content: '김철수 고객님의 계약서가 승인되었습니다.',
      isRead: true,
      createdAt: '2024-01-09T14:20:00',
      icon: CheckCheck,
      color: 'indigo',
    },
    {
      id: 5,
      type: 'notice',
      title: '신규 기능 업데이트',
      content: '공동중개망 공동중개 기능이 추가되었습니다.',
      isRead: true,
      createdAt: '2024-01-08T11:00:00',
      icon: FileText,
      color: 'blue',
    },
    {
      id: 6,
      type: 'hub',
      title: '공동중개 매칭 성공',
      content: '등록하신 물건에 관심있는 고객이 있습니다.',
      isRead: false,
      createdAt: '2024-01-08T09:30:00',
      icon: Network,
      color: 'green',
    },
  ];

  useEffect(() => {
    loadNotifications();
  }, [activeTab]);

  const loadNotifications = () => {
    setIsLoading(true);

    // 탭에 따라 필터링
    let filtered = [...mockNotifications];
    if (activeTab === 'notice') {
      filtered = filtered.filter(n => n.type === 'notice');
    } else if (activeTab === 'hub') {
      filtered = filtered.filter(n => n.type === 'hub');
    }

    setNotifications(filtered);
    setIsLoading(false);
  };

  const handleMarkAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    toast.success('읽음 처리되었습니다.');
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success('모든 알림을 읽음 처리했습니다.');
  };

  const handleDelete = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success('알림이 삭제되었습니다.');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f9fafb' }}>
      {/* 헤더 */}
      <div style={{ padding: '1.5rem', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        {/* 페이지 제목 */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-7 h-7" />
            알림
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            시스템 알림과 공동중개 정보를 확인합니다
          </p>
        </div>

        {/* 탭 및 액션 버튼 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              전체
              {activeTab === 'all' && unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-white text-indigo-600 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setActiveTab('notice')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'notice'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              공지
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setActiveTab('hub')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'hub'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Network className="w-4 h-4 inline mr-1" />
              공동중개망
            </button>
          </div>

          {/* 우측 버튼 */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              모두 읽음 처리
            </button>
          )}
        </div>
      </div>

      {/* 알림 목록 */}
      <div className="flex-1 overflow-auto p-4">
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">
              로딩 중...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>알림이 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => {
                const Icon = notification.icon;
                const colorClass = {
                  blue: 'bg-blue-100 text-blue-600',
                  green: 'bg-green-100 text-green-600',
                  indigo: 'bg-indigo-100 text-indigo-600',
                  red: 'bg-red-100 text-red-600',
                  yellow: 'bg-yellow-100 text-yellow-600',
                }[notification.color] || 'bg-gray-100 text-gray-600';

                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* 아이콘 */}
                      <div className={`p-2 rounded-full ${colorClass} flex-shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className={`text-sm font-medium ${
                            !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                            {!notification.isRead && (
                              <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
                            )}
                          </h3>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.content}
                        </p>

                        {/* 공동중개망 타입 표시 */}
                        {notification.type === 'hub' && notification.tradeDiv && (
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                            notification.tradeDiv === 'CUST'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {notification.tradeDiv === 'CUST' ? '고객 찾기' : '물건 찾기'}
                          </span>
                        )}
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex gap-1 flex-shrink-0">
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="읽음 처리"
                          >
                            <CheckCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default NotificationsPage;
