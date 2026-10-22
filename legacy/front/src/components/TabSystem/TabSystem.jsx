import React, { useState, useRef, useEffect } from 'react';
import PropertyGrid from '../PropertyGrid';
import StaffAccountManagementPage from '../../pages/agents/StaffAccountManagementPage';
import StaffPermissionPage from '../../pages/agents/StaffPermissionPage';
import OfficeManagementPage from '../../pages/agents/OfficeManagementPage';
import PropertiesPage from '../../pages/properties/PropertiesPage';
import PartnersPage from '../../pages/partners/PartnersPage';
import TransactionNetworkPage from '../../pages/transaction-network/TransactionNetworkPage';
import CustomersPage from '../../pages/customers/CustomersPage';
import InterviewPage from '../../pages/interview/InterviewPage';
import SchedulePage from '../../pages/schedule/SchedulePage';
import DashboardPage from '../../pages/dashboard/DashboardPage';
import ContractsPage from '../../pages/contracts/ContractsPage';
import SettingsPage from '../../pages/settings/SettingsPage';
import NoticesPage from '../../pages/notice/NoticesPage';
import SupportPage from '../../pages/support/SupportPage';
import DataUploadPage from '../../pages/upload/DataUploadPage';

const TabSystem = React.forwardRef((props, ref) => {
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [layout, setLayout] = useState('single'); // 'single' only - removed split functionality
  const [dragPreview, setDragPreview] = useState({ show: false, position: null });
  const [dropZones, setDropZones] = useState([]);
  const [isDraggingOutside, setIsDraggingOutside] = useState(false);
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, tabId: null });
  const dragStartRef = useRef(null);
  const containerRef = useRef(null);
  const dragCounterRef = useRef(0);

  // 탭 재연결 이벤트 리스너
  React.useEffect(() => {
    if (window.electronAPI) {
      const off = window.electronAPI.onTabReattach(({ tabId }) => {
        setTabs((prev) => prev.map(t => t.id === tabId ? { ...t, detached: false } : t));
      });
      return () => { off && off(); };
    }
  }, []);

  // ref를 통해 외부에서 호출할 수 있는 함수들 노출
  React.useImperativeHandle(ref, () => ({
    addTab: (id, title, content, closable = true) => {
      addTab(id, title, content, closable);
    }
  }));

  // 글로벌 드래그 이벤트 리스너
  React.useEffect(() => {
    const handleGlobalDragEnd = (e) => {
      if (dragStartRef.current && isDraggingOutside) {
        // 창 밖으로 드롭된 경우 새 창 생성
        createDetachedWindow(dragStartRef.current);
      }
      handleDragEnd();
    };

    document.addEventListener('dragend', handleGlobalDragEnd);
    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, [isDraggingOutside]);

  // 탭 추가
  const addTab = (id, title, content, closable = true) => {
    const existingTab = tabs.find(tab => tab.id === id);
    if (existingTab) {
      setActiveTab(id);
      return;
    }

    const newTab = {
      id,
      title,
      content,
      closable,
      isDirty: false,
      detached: false,
      route: getRouteForContent(content)
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTab(id);
  };

  // 탭 닫기
  const closeTab = (tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || !tab.closable) return;

    setTabs(prev => prev.filter(t => t.id !== tabId));

    if (activeTab === tabId) {
      const remainingTabs = tabs.filter(t => t.id !== tabId);
      setActiveTab(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].id : null);
    }
  };


  // 드래그 앤 드롭 - VS Code 스타일
  const handleDragStart = (e, tabId) => {
    dragStartRef.current = tabId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', tabId);

    // Removed drop zone calculation for split functionality
  };

  const handleDragEnd = () => {
    setDragPreview({ show: false, position: null });
    setDropZones([]);
    setIsDraggingOutside(false);
    dragStartRef.current = null;
    dragCounterRef.current = 0;
  };

  // 콘텐츠 타입에 따른 라우트 매핑
  const getRouteForContent = (content) => {
    switch (content) {
      case 'dashboard':
        return '/dashboard';
      case 'properties':
        return '/properties';
      case 'property-grid':
        return '/properties';
      case 'contracts':
        return '/contracts';
      case 'partners':
        return '/partners';
      case 'customers':
        return '/customers';
      case 'interview':
        return '/interview';
      case 'schedule':
        return '/schedule';
      case 'transaction-network':
        return '/transaction-network';
      case 'staff-account-management':
        return '/agents';
      case 'staff-permission-management':
        return '/agents/staff-permission';
      case 'office-management':
        return '/agents/office-management';
      case 'settings':
        return '/settings';
      case 'notices':
        return '/notices';
      case 'support':
        return '/support';
      case 'data-upload':
        return '/data-upload';
      default:
        return '/';
    }
  };

  // 창 밖으로 드래그되었을 때 새 창 생성
  const createDetachedWindow = async (tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    try {
      if (window.electronAPI) {
        // Electron 환경에서 실제 분리 창 생성
        setTabs((prev) => prev.map(t => t.id === tabId ? { ...t, detached: true } : t));

        await window.electronAPI.openTabInWindow({
          tabId: tab.id,
          route: tab.route,
          title: tab.title,
          content: tab.content,
          initState: {}
        });

        console.log(`Tab ${tab.title} moved to new Electron window`);
      } else {
        // 브라우저 환경에서는 일반 popup 사용
        const newWindow = window.open('', `_blank_${tabId}`, 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes');

        if (newWindow) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html lang="ko">
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>${tab.title} - 네오시스</title>
                <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                <style>
                  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
                </style>
              </head>
              <body>
                <div id="root">
                  <div style="padding: 2rem; height: 100vh; overflow: auto;">
                    <h1 style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem; color: #1f2937;">${tab.title}</h1>
                    <p style="color: #6b7280; margin-bottom: 2rem;">이 탭이 새 창에서 열렸습니다.</p>
                    <div style="background: #f3f4f6; padding: 2rem; border-radius: 8px;">
                      <p style="color: #374151;">새 창에서의 ${tab.title} 페이지 내용입니다.</p>
                      <p style="color: #6b7280; font-size: 0.875rem; margin-top: 1rem;">Electron 환경에서는 실제 페이지가 표시됩니다.</p>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `);
          newWindow.document.close();
          newWindow.focus();

          setTabs(prev => prev.filter(t => t.id !== tabId));
          if (activeTab === tabId) {
            const remainingTabs = tabs.filter(t => t.id !== tabId);
            setActiveTab(remainingTabs.length > 0 ? remainingTabs[0].id : null);
          }
        } else {
          alert('새 창을 열 수 없습니다. 팝업 차단을 해제해 주세요.');
        }
      }
    } catch (error) {
      console.error('Failed to create detached window:', error);
      alert('새 창 생성에 실패했습니다.');
    }
  };


  const handleDragOver = (e) => {
    e.preventDefault();
    if (!dragStartRef.current) return;

    // Removed split zone detection - only detect outside window dragging
    setDragPreview({
      show: false,
      position: null
    });
  };

  // 창 밖으로 드래그되는 것을 감지
  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounterRef.current--;

    if (dragCounterRef.current === 0) {
      setIsDraggingOutside(true);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounterRef.current++;
    setIsDraggingOutside(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    // Only handle drag end - no split functionality
    handleDragEnd();
  };


  // 컨텐츠 렌더링
  const renderTabContent = (tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return null;

    switch (tab.content) {
      case 'dashboard':
        return <DashboardPage />;
      case 'properties':
        return <PropertiesPage />;
      case 'property-grid':
        return <PropertyGrid />;
      case 'contracts':
        return <ContractsPage />;
      case 'partners':
        return <PartnersPage />;
      case 'customers':
        return <CustomersPage />;
      case 'interview':
        return <InterviewPage />;
      case 'schedule':
        return <SchedulePage />;
      case 'transaction-network':
        return <TransactionNetworkPage />;
      case 'staff-account-management':
        return <StaffAccountManagementPage />;
      case 'staff-permission-management':
        return <StaffPermissionPage />;
      case 'office-management':
        return <OfficeManagementPage />;
      case 'settings':
        return <SettingsPage />;
      case 'notices':
        return <NoticesPage />;
      case 'support':
        return <SupportPage />;
      case 'data-upload':
        return <DataUploadPage />;
      default:
        return (
          <div style={{ padding: '2rem', height: '100%' }}>
            <h2>{tab.title}</h2>
            <p>탭 내용이 여기에 표시됩니다.</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '1rem' }}>
              Content type: {tab.content}
            </p>
          </div>
        );
    }
  };

  // 탭 헤더 렌더링
  const renderTabHeader = (tab, isActive, onClose) => (
    <div
      key={tab.id}
      draggable
      onDragStart={(e) => handleDragStart(e, tab.id)}
      onDragEnd={handleDragEnd}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0.5rem 1rem',
        backgroundColor: isActive ? '#ffffff' : '#f3f4f6',
        borderRight: '1px solid #e5e7eb',
        borderTop: isActive ? '2px solid #3b82f6' : '2px solid transparent',
        cursor: 'pointer',
        minWidth: '120px',
        maxWidth: '200px',
        position: 'relative',
        userSelect: 'none'
      }}
      onClick={() => {
        setActiveTab(tab.id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({
          show: true,
          x: e.clientX,
          y: e.clientY,
          tabId: tab.id
        });
      }}
    >
      <span
        style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: '0.875rem',
          color: isActive ? '#1f2937' : '#6b7280',
          opacity: tab.detached ? 0.5 : 1
        }}
      >
        {tab.isDirty && '*'}{tab.title}{tab.detached && ' (분리됨)'}
      </span>

      {/* 탭 액션 버튼들 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.5rem' }}>
        {/* 닫기 버튼 */}
        {tab.closable && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose(tab.id);
            }}
            style={{
              padding: '0.125rem',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.75rem',
              opacity: isActive ? 1 : 0,
              transition: 'opacity 0.2s'
            }}
            title="닫기"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );


  // 탭이 없으면 아무것도 렌더링하지 않음
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backgroundColor: 'white',
        pointerEvents: 'auto'
      }}
    >
      {/* 탭 헤더 */}
      <div style={{
        display: 'flex',
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        overflow: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {tabs.map(tab =>
          renderTabHeader(
            tab,
            activeTab === tab.id,
            closeTab
          )
        )}
      </div>

      {/* 창 밖으로 드래그 시 오버레이 */}
      {isDraggingOutside && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          border: '3px dashed #22c55e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#22c55e',
          zIndex: 1001,
          pointerEvents: 'none'
        }}>
          🗗 새 창으로 분리하기
        </div>
      )}


      {/* 탭 컨텐츠 영역 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab && !tabs.find(t => t.id === activeTab)?.detached && renderTabContent(activeTab)}
        {activeTab && tabs.find(t => t.id === activeTab)?.detached && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            flexDirection: 'column',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗗</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#1f2937' }}>
              탭이 새 창에서 열렸습니다
            </h3>
            <p>이 탭은 별도 창에서 실행 중입니다.</p>
          </div>
        )}
      </div>

      {/* 컨텍스트 메뉴 */}
      {contextMenu.show && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 998
            }}
            onClick={() => setContextMenu({ show: false, x: 0, y: 0, tabId: null })}
          />
          <div
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              zIndex: 999,
              minWidth: '150px'
            }}
          >
            <button
              onClick={() => {
                createDetachedWindow(contextMenu.tabId);
                setContextMenu({ show: false, x: 0, y: 0, tabId: null });
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: '#374151'
              }}
            >
              🗗 새 창으로 분리
            </button>
            <hr style={{ margin: '0.25rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
            <button
              onClick={() => {
                closeTab(contextMenu.tabId);
                setContextMenu({ show: false, x: 0, y: 0, tabId: null });
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: '#374151'
              }}
            >
              × 탭 닫기
            </button>
          </div>
        </>
      )}

    </div>
  );
});

export default TabSystem;