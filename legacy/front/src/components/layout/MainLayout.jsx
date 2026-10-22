import React, { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import TopInfoBar from './TopInfoBar';
import TabSystem from '../TabSystem/TabSystem';
import NotificationPanel from '../notifications/NotificationPanel';
import HubModal from '../modals/HubModal';
import NoteHost from '../hub/NoteHost';
import PhoneCallHost from '../phone/PhoneCallHost';
import { useMenuStore } from '../../stores/menuStore';
import { useHubModalStore } from '../../stores/hubModalStore';

const MainLayout = () => {
  const { initializeMenus } = useMenuStore();
  const { isOpen, editData, defaultTradeDiv, closeModal } = useHubModalStore();
  const tabSystemRef = useRef(null);

  useEffect(() => {
    initializeMenus();
  }, [initializeMenus]);

  // TabSystem에 탭 추가하는 함수를 전역으로 노출
  useEffect(() => {
    window.openTab = (id, title, content) => {
      if (tabSystemRef.current) {
        tabSystemRef.current.addTab(id, title, content, true);
      }
    };

    return () => {
      delete window.openTab;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col min-h-screen">
        {/* <TopInfoBar /> */}
        <TopBar />
        <main className="flex-1" style={{ position: 'relative' }}>
          {/* TabSystem 오버레이 */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, pointerEvents: 'none' }}>
            <TabSystem ref={tabSystemRef} />
          </div>

          {/* 기본 라우트 컨텐츠 (탭이 없을 때 표시) */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* 알림 패널 */}
      <NotificationPanel />

      {/* 쪽지 전역 호스트 (실시간 수신 + 미니팝업 + 쪽지관리 모달) */}
      <NoteHost />

      {/* 전화 수신 전역 호스트 (KT 브리지 착신 → 우하단 팝업) */}
      <PhoneCallHost />

      {/* 공동중개망 모달 (전역) */}
      <HubModal
        isOpen={isOpen}
        onClose={closeModal}
        onSuccess={() => {
          // 공동중개망 페이지인 경우 목록 갱신이 필요하면 이벤트 발생
          window.dispatchEvent(new Event('hubModalSuccess'));
        }}
        editData={editData}
        defaultTradeDiv={defaultTradeDiv}
      />
    </div>
  );
};

export default MainLayout;