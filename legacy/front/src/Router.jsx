import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { hydrateContractTemplateCache, loadContractTemplates } from './services/contractTemplateCache';
import { authService } from './services/authService';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import PropertiesPage from './pages/properties/PropertiesPage';
import ContractsPage from './pages/contracts/ContractsPage';
import AgentsPage from './pages/agents/AgentsPage';
import StaffPermissionPage from './pages/agents/StaffPermissionPage';
import OfficeManagementPage from './pages/agents/OfficeManagementPage';
import OfficeHubPage from './pages/agents/OfficeHubPage';
import PartnersPage from './pages/partners/PartnersPage';
import TransactionNetworkPage from './pages/transaction-network/TransactionNetworkPage';
import FileUploadPage from './pages/file-upload/FileUploadPage';
import SettingsPage from './pages/settings/SettingsPage';
import ProfileEditPage from './pages/settings/ProfileEditPage';
import SecurityPage from './pages/settings/SecurityPage';
import NoticesPage from './pages/notice/NoticesPage';
import NoticeDetailPage from './pages/notice/NoticeDetailPage';
import SupportPage from './pages/support/SupportPage';
import InquiryDetailPage from './pages/support/InquiryDetailPage';
import InterviewPage from './pages/interview/InterviewPage';
import SchedulePage from './pages/schedule/SchedulePage';
import CustomersPage from './pages/customers/CustomersPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import TabPage from './pages/TabPage';
import DetachedTabPage from './pages/DetachedTabPage';
import ModalPage from './pages/modal/ModalPage';
import DataUploadPage from './pages/upload/DataUploadPage';
import NeobotPage from './pages/neobot/NeobotPage';
import ExpiryPage from './pages/expiry/ExpiryPage';
import MemoPage from './pages/memo/MemoPage';
import WorkJournalPage from './pages/worklog/WorkJournalPage';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const Router = () => {
  useEffect(() => {
    // 계약서 서식 템플릿 캐시: 즉시 하이드레이트 + 백그라운드 갱신(ver 다를 때만 재fetch)
    hydrateContractTemplateCache();
    loadContractTemplates();
  }, []);

  useEffect(() => {
    // 앱 시작 시 자동 로그인 체크 (메인 윈도우에서만 실행)
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    // HashRouter 사용 시 hash 또는 일반 URL 경로 모두 체크
    const isDetachedTab = window.location.hash.includes('/tab') || window.location.pathname.includes('/tab');

    // 분리된 탭이 아니고 rememberMe가 false인 경우에만 로그아웃 처리
    if (!rememberMe && !isDetachedTab) {
      // 자동 로그인이 아니면 인증 정보 삭제
      localStorage.removeItem('auth-storage');

      // zustand store도 초기화
      const { user, logout } = useAuthStore.getState();
      if (user) {
        // 로그아웃 처리 (단, rememberMe는 이미 제거되므로 재설정 방지)
        useAuthStore.setState({
          user: null,
          token: null,
          isAuthenticated: false,
          office: null,
        });
      }
    } else if (rememberMe && !isDetachedTab) {
      // 자동 로그인(세션 유지)으로 진입 → 로그인 이력 기록(AUTO). 서버에서 IP 캡처
      const { user } = useAuthStore.getState();
      if (user?.userId) authService.logLogin(user.userId, 'AUTO');
    }
  }, []);

  useEffect(() => {
    // 공동중개망 전송 팝업이 닫힌 뒤, 팝업을 연 창에 완료 알림 표시
    if (!window.electronAPI?.modal?.on) return;
    return window.electronAPI.modal.on('success', ({ type, data, isOpener }) => {
      if (type === 'hub-form' && isOpener !== false && data?.hubNotice) toast.success(data.hubNotice);
    });
  }, []);

  return (
    <HashRouter>
      {/* 전역 토스트 알림 - 화면 가운데 상단 */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* 로그인 페이지 */}
        <Route path="/login" element={<LoginPage />} />

        {/* 분리창 진입용 라우트 */}
        <Route path="/tab" element={<DetachedTabPage />} />

        {/* 기존 탭 페이지 */}
        <Route path="/tab/:tabId" element={<TabPage />} />

        {/* 모달 전용 라우트 */}
        <Route path="/modal/:type" element={<ModalPage />} />

        {/* 네오봇 전용 라우트 */}
        <Route path="/neobot" element={<NeobotPage />} />

        {/* 만기관리 */}
        <Route path="/expiry" element={<ExpiryPage />} />

        {/* 메모 (별도 창) */}
        <Route path="/memo" element={<MemoPage />} />

        {/* 업무일지 (별도 창) */}
        <Route path="/worklog" element={<div style={{ height: '100vh' }}><WorkJournalPage /></div>} />

        {/* 메인 애플리케이션 라우트 (로그인 필요) */}
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="properties" element={<PropertiesPage />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="agents/office-management" element={<OfficeManagementPage />} />
          <Route path="agents/office-hub" element={<OfficeHubPage />} />
          <Route path="agents/staff-permission" element={<StaffPermissionPage />} />
          <Route path="file-upload" element={<FileUploadPage />} />
          <Route path="partners" element={<PartnersPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="interview" element={<InterviewPage />} />
          <Route path="transaction-network" element={<TransactionNetworkPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/profile-edit" element={<ProfileEditPage />} />
          <Route path="settings/security" element={<SecurityPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="notices" element={<NoticesPage />} />
          <Route path="notices/:noticeId" element={<NoticeDetailPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="support/:inquiryId" element={<InquiryDetailPage />} />

          <Route path="interview" element={<InterviewPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="data-upload" element={<DataUploadPage />} />

        </Route>
      </Routes>
    </HashRouter>
  );
};

export default Router;