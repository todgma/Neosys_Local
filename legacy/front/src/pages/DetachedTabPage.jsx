import React, { useEffect, useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import PropertyGrid from '../components/PropertyGrid';
import StaffAccountManagementPage from './agents/StaffAccountManagementPage';
import StaffPermissionPage from './agents/StaffPermissionPage';
import OfficeManagementPage from './agents/OfficeManagementPage';
import OfficeHubPage from './agents/OfficeHubPage';
import PropertiesPage from './properties/PropertiesPage';
import PartnersPage from './partners/PartnersPage';
import TransactionNetworkPage from './transaction-network/TransactionNetworkPage';
import CustomersPage from './customers/CustomersPage';
import InterviewPage from './interview/InterviewPage';
import SchedulePage from './schedule/SchedulePage';
import DashboardPage from './dashboard/DashboardPage';
import ContractsPage from './contracts/ContractsPage';
import SettingsPage from './settings/SettingsPage';
import NoticesPage from './notice/NoticesPage';
import SupportPage from './support/SupportPage';
import NotificationsPage from './notifications/NotificationsPage';
import DataUploadPage from './upload/DataUploadPage';
import NeobotPage from './neobot/NeobotPage';
import ExpiryPage from './expiry/ExpiryPage';
import NoteHost from '../components/hub/NoteHost';
import PhoneCallHost from '../components/phone/PhoneCallHost';
import NoteManagerPage from './note/NoteManagerPage';
import MemoPage from './memo/MemoPage';
import PcPhoneManagerPage from './phone/PcPhoneManagerPage';
import WorkJournalPage from './worklog/WorkJournalPage';
import TopInfoBar from '../components/layout/TopInfoBar';

export default function DetachedTabPage() {
  const [tabData, setTabData] = useState(null);
  const [params] = useSearchParams();
  const { isAuthenticated } = useAuthStore();

  // 인증 체크
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // URL로 최소 정보 확보 (initState도 URL에 실려오면 즉시 반영 → IPC 타이밍 경쟁 방지)
  useEffect(() => {
    const tabId = params.get('tabId') || '';
    const route = params.get('route') || '/';
    let initState = {};
    const raw = params.get('initState');
    if (raw) {
      try { initState = JSON.parse(raw); } catch { initState = {}; }
    }
    setTabData({ tabId, route, initState });
  }, [params]);

  // 메인에서 오는 초기 상태 적용
  useEffect(() => {
    if (window.electronAPI) {
      const off = window.electronAPI.onTabInit((data) => {
        setTabData(data);
      });
      return () => { off && off(); };
    }
  }, []);

  // 라우트에 따른 제목 반환
  const getTitle = (route) => {
    switch (route) {
      case '/dashboard':
        return '대시보드';
      case '/properties':
        return '물건관리';
      case '/contracts':
        return '계약관리';
      case '/partners':
        return '협력업체관리';
      case '/customers':
        return '고객관리';
      case '/interview':
        return '상담관리';
      case '/schedule':
        return '일정관리';
      case '/transaction-network':
        return '공동중개망';
      case '/note-manager':
        return '쪽지관리';
      case '/agents':
        return '직원계정관리';
      case '/agents/staff-permission':
        return '직원권한관리';
      case '/agents/office-management':
        return '사무실관리';
      case '/agents/office-hub':
        return '사무실관리';
      case '/settings':
        return '설정';
      case '/notifications':
        return '알림';
      case '/notices':
        return '공지사항';
      case '/support':
        return '고객센터';
      case '/data-upload':
        return '데이터 업로드';
      case '/neobot':
        return '네오봇';
      case '/expiry':
        return '만기관리';
      case '/memo':
        return '메모';
      case '/pc-phone':
        return 'PC폰관리';
      case '/worklog':
        return '업무일지';
      default:
        return '분리된 탭';
    }
  };

  // 컨텐츠 렌더링
  const renderTabContent = (route) => {
    switch (route) {
      case '/dashboard':
        return <DashboardPage />;
      case '/properties':
        return <PropertiesPage />;
      case '/contracts':
        return <ContractsPage />;
      case '/partners':
        return <PartnersPage />;
      case '/customers':
        return <CustomersPage />;
      case '/interview':
        return <InterviewPage />;
      case '/schedule':
        return <SchedulePage />;
      case '/transaction-network':
        return <TransactionNetworkPage />;
      case '/note-manager':
        return <NoteManagerPage initState={tabData?.initState} />;
      case '/agents':
        return <StaffAccountManagementPage />;
      case '/agents/staff-permission':
        return <StaffPermissionPage />;
      case '/agents/office-management':
        return <OfficeManagementPage />;
      case '/agents/office-hub':
        return <OfficeHubPage />;
      case '/settings':
        return <SettingsPage />;
      case '/notifications':
        return <NotificationsPage />;
      case '/notices':
        return <NoticesPage />;
      case '/support':
        return <SupportPage />;
      case '/data-upload':
        return <DataUploadPage />;
      case '/neobot':
        return <NeobotPage initState={tabData?.initState} />;
      case '/expiry':
        return <ExpiryPage />;
      case '/memo':
        return <MemoPage />;
      case '/pc-phone':
        return <PcPhoneManagerPage />;
      case '/worklog':
        return <div style={{ height: '100%' }}><WorkJournalPage /></div>;
      default:
        return (
          <div style={{ padding: '2rem', height: '100%' }}>
            <h2>분리된 탭</h2>
            <p>탭 내용이 여기에 표시됩니다.</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '1rem' }}>
              Route: {route}
            </p>
          </div>
        );
    }
  };

  if (!tabData) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f9fafb'
      }}>
        <div>로딩 중...</div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      backgroundColor: '#f9fafb',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 상단 정보바(전역) */}
      {/* <TopInfoBar /> */}
      {/* 탭 컨텐츠 */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto'
      }}>
        {renderTabContent(tabData.route)}
      </div>

      {/* 쪽지 전역 호스트 (분리창에서도 실시간 수신 + 미니팝업 + 쪽지관리 모달) */}
      <NoteHost />

      {/* 전화 수신 전역 호스트 */}
      <PhoneCallHost />
    </div>
  );
}