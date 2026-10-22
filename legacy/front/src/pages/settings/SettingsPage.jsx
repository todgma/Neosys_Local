import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { User, Lock, Bell } from 'lucide-react';
import Card from '../../components/ui/Card';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const settingsMenu = [
    {
      id: 'profile',
      title: '회원정보 수정',
      description: '계정 정보 및 프로필을 수정합니다',
      icon: User,
      onClick: () => navigate('/settings/profile-edit'),
    },
    {
      id: 'security',
      title: '보안 설정',
      description: '비밀번호 및 보안 옵션을 관리합니다',
      icon: Lock,
      onClick: () => navigate('/settings/security'),
    },
    {
      id: 'notifications',
      title: '알림 설정',
      description: '알림 및 이메일 수신 설정을 관리합니다',
      icon: Bell,
      onClick: () => alert('알림 설정 기능은 곧 추가될 예정입니다.'),
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="text-gray-600">시스템 설정을 관리하세요</p>
      </div>

      {/* 사용자 정보 카드 */}
      <Card>
        <Card.Content>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{user?.name || '사용자'}</h3>
              <p className="text-sm text-gray-600">{user?.email || ''}</p>
              <p className="text-xs text-gray-500 mt-1">
                {user?.role === 'admin' ? '관리자' : '사용자'} · {user?.phone || '전화번호 미등록'}
              </p>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* 설정 메뉴 */}
      <div className="space-y-2">
        {settingsMenu.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.id}>
              <Card.Content>
                <button
                  onClick={item.onClick}
                  className="w-full flex items-center gap-4 p-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
                    <p className="text-xs text-gray-600 truncate">{item.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </button>
              </Card.Content>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SettingsPage;