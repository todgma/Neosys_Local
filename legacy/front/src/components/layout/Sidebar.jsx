import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building,
  Building2,
  FileText,
  Users,
  Upload,
  Settings,
  ChevronRight,
  ChevronDown,
  Menu,
  LogOut,
  Bell,
  Headphones,
  UserCheck,
  Link,
  Circle,
  DollarSign,
  Shield,
  Calendar,
  Network,
  MessageSquare,
  MessageCircle,
  CalendarClock,
  ClipboardList,
  StickyNote,
  Phone,
} from 'lucide-react';
import { useMenuStore } from '../../stores/menuStore';
import { useNotificationStore } from '../../stores/notificationStore';

const iconMap = {
  LayoutDashboard,
  Building,
  Building2,
  FileText,
  Users,
  Upload,
  Settings,
  Bell,
  Headphones,
  UserCheck,
  Handshake: UserCheck,  // Handshake 대신 UserCheck 사용
  Link,
  Circle,
  DollarSign,
  Shield,
  Calendar,
  Network,
  MessageSquare,
  MessageCircle,
  CalendarClock,
  ClipboardList,
  StickyNote,
  Phone,
};

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    menuItems,
    expandedMenus,
    isMenuCollapsed,
    isLoading,
    error,
    toggleMenuExpansion,
    toggleMenuCollapse,
  } = useMenuStore();
  const { togglePanel, unreadCount } = useNotificationStore();

  const getContentTypeForPath = (path) => {
    const contentMap = {
      '/dashboard': 'dashboard',
      '/properties': 'properties',
      '/contracts': 'contracts',
      '/agents': 'staff-account-management',
      '/agents/office-management': 'office-management',
      '/agents/staff-permission': 'staff-permission-management',
      '/partners': 'partners',
      '/customers': 'customers',
      '/interview': 'interview',
      '/schedule': 'schedule',
      '/transaction-network': 'transaction-network',
      '/settings': 'settings',
      '/notifications': 'notifications',
      '/notices': 'notices',
      '/support': 'support',
    };
    return contentMap[path] || path.replace(/^\//, '');
  };

  const handleMenuClick = (item) => {
    // 권한없음(연하게) 메뉴는 클릭 무시
    if (item.authorized === false) return;
    if (item.children && item.children.length > 0) {
      toggleMenuExpansion(item.id);
    } else if (item.path) {
      // 탭으로 열기
      const contentType = getContentTypeForPath(item.path);
      if (window.openTab) {
        window.openTab(item.id, item.title, contentType);
      } else {
        // fallback: 직접 navigate
        navigate(item.path);
      }
    }
  };

  const handleLogout = () => {
    // 로그아웃 처리 (세션 정리 등)
    localStorage.removeItem('authToken');
    sessionStorage.clear();
    navigate('/login');
  };

  const isMenuActive = (item) => {
    if (item.path && location.pathname === item.path) {
      return true;
    }
    if (item.children) {
      return item.children.some(child => child.path && location.pathname.startsWith(child.path));
    }
    return false;
  };

  const renderMenuItem = (item, level = 0) => {
    // 메뉴가 비활성화되어 있으면 렌더링하지 않음
    if (!item.isActive) return null;

    const Icon = iconMap[item.icon] || Circle;
    const isActive = isMenuActive(item);
    const isExpanded = expandedMenus.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const authorized = item.authorized !== false; // API 결과에 없으면 권한없음(연하게)

    return (
      <div key={item.id}>
        <button
          onClick={() => handleMenuClick(item)}
          disabled={!authorized}
          className={`w-full flex items-center px-3 py-2 text-left text-sm font-medium rounded-md transition-colors duration-200 ${
            !authorized
              ? 'text-gray-400 opacity-50 cursor-not-allowed'
              : isActive
              ? 'bg-primary-100 text-primary-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          } ${level > 0 ? 'ml-4' : ''}`}
          title={isMenuCollapsed ? item.title : (!authorized ? '권한없음' : undefined)}
        >
          {Icon && level === 0 && (
            <Icon className={`${isMenuCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
          )}
          {!Icon && level === 0 && (
            <Circle className={`${isMenuCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
          )}
          {level > 0 && !isMenuCollapsed && (
            <span className="mr-3 ml-2">•</span>
          )}
          {!isMenuCollapsed && (
            <>
              <span className="flex-1">
                {item.title}
                {!authorized && (
                  <span className="block text-[10px] leading-tight text-gray-400">권한없음</span>
                )}
              </span>
              {authorized && hasChildren && (
                <div className="ml-auto">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              )}
            </>
          )}
        </button>

        {hasChildren && isExpanded && !isMenuCollapsed && (
          <div className="mt-1 space-y-1">
            {item.children?.filter(child => child.isActive).map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-y-0 left-0 bg-white border-r border-gray-200 transition-all duration-300 z-30 ${
        isMenuCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
          {!isMenuCollapsed && (
            <h1 className="text-xl font-bold text-gray-900">부동산 ERP</h1>
          )}
          <button
            onClick={toggleMenuCollapse}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="text-sm text-gray-500">메뉴 로딩 중...</div>
            </div>
          ) : error ? (
            <div className="px-3 py-2">
              <div className="text-sm text-red-500">메뉴 로드 실패</div>
            </div>
          ) : menuItems.length === 0 ? (
            <div className="px-3 py-2">
              <div className="text-sm text-gray-500">표시할 메뉴가 없습니다.</div>
            </div>
          ) : (
            menuItems.map(item => renderMenuItem(item))
          )}
        </nav>

        {/* 구분선 및 추가 메뉴 */}
        <div className="border-t border-gray-200">
          <div className="px-3 py-2 space-y-1">
            <button
              onClick={togglePanel}
              className="w-full flex items-center px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors duration-200 relative"
              title={isMenuCollapsed ? '알림' : undefined}
            >
              <Bell className={`${isMenuCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
              {!isMenuCollapsed && <span>알림</span>}
              {/* 알림 뱃지 */}
              {unreadCount > 0 && (
                <span className={`absolute ${isMenuCollapsed ? 'top-1 right-1' : 'top-2 right-2'} ${
                  isMenuCollapsed
                    ? 'w-2 h-2'
                    : 'min-w-[18px] h-[18px] px-1 text-[10px] leading-[18px] text-center'
                } bg-red-500 text-white rounded-full font-medium`}>
                  {!isMenuCollapsed && unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                if (window.openTab) {
                  window.openTab('notices', '공지사항', 'notices');
                } else {
                  navigate('/notices');
                }
              }}
              className="w-full flex items-center px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors duration-200"
              title={isMenuCollapsed ? '공지사항' : undefined}
            >
              <Bell className={`${isMenuCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
              {!isMenuCollapsed && <span>공지사항</span>}
            </button>
            <button
              onClick={() => {
                if (window.openTab) {
                  window.openTab('support', '고객센터', 'support');
                } else {
                  navigate('/support');
                }
              }}
              className="w-full flex items-center px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors duration-200"
              title={isMenuCollapsed ? '고객센터' : undefined}
            >
              <Headphones className={`${isMenuCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
              {!isMenuCollapsed && <span>고객센터</span>}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-3 text-left text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
            title={isMenuCollapsed ? '로그아웃' : undefined}
          >
            <LogOut className={`${isMenuCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
            {!isMenuCollapsed && <span>로그아웃</span>}
          </button>
          {!isMenuCollapsed && (
            <div className="px-4 py-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                © 2024 부동산 ERP v1.0
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default Sidebar;