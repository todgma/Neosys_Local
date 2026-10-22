import React, { useState, useRef } from 'react';
import TabSystem from './components/TabSystem/TabSystem';
import PropertiesPage from './pages/properties/PropertiesPage';

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [user, setUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const tabSystemRef = useRef(null);

  const handleLogin = (email, password) => {
    if (email === 'admin@realestate.com' && password === 'admin123') {
      setUser({ name: '관리자', email });
      setCurrentPage('dashboard');
    } else {
      alert('잘못된 로그인 정보입니다.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('login');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const menuItems = [
    { id: 'dashboard', name: '대시보드', icon: '🏠' },
    { id: 'properties', name: '물건관리', icon: '🏢' },
    {
      id: 'contracts',
      name: '계약관리',
      icon: '📋',
      subMenus: [
        { id: 'contract-list', name: '계약목록', tabTitle: '계약목록', contentType: 'contract-list' },
        { id: 'contract-register', name: '계약등록', tabTitle: '계약등록', contentType: 'contract-register' }
      ]
    },
    {
      id: 'employees',
      name: '직원관리',
      icon: '👥',
      subMenus: [
        { id: 'employee-list', name: '직원목록', tabTitle: '직원목록', contentType: 'employee-list' },
        { id: 'staff-account-management', name: '직원계정관리', tabTitle: '직원계정관리', contentType: 'staff-account-management' },
        { id: 'staff-permission-management', name: '직원권한관리', tabTitle: '직원권한관리', contentType: 'staff-permission-management' }
      ]
    },
    {
      id: 'consultations',
      name: '상담관리',
      icon: '💬',
      subMenus: [
        { id: 'consultation-list', name: '상담목록', tabTitle: '상담목록', contentType: 'consultation-list' }
      ]
    },
    { id: 'partners', name: '협력업체관리', icon: '🤝' },
    { id: 'transaction-network', name: '공동중개망', icon: '🔗' },
    { id: 'settings', name: '설정', icon: '⚙️' }
  ];

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const openTab = (tabId, tabTitle, contentType) => {
    if (tabSystemRef.current) {
      tabSystemRef.current.addTab(tabId, tabTitle, contentType);
    }
  };

  // 새 창에서 메시지 수신 처리
  React.useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'TAB_CLOSED') {
        console.log('Tab closed in new window:', event.data.tabId);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (currentPage === 'login') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard Variable", Pretendard, Roboto, "Noto Sans KR", "Segoe UI", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#333' }}>
            네오시스
          </h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleLogin(formData.get('email'), formData.get('password'));
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <input
                name="email"
                type="email"
                placeholder="이메일"
                defaultValue="admin@realestate.com"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <input
                name="password"
                type="password"
                placeholder="비밀번호"
                defaultValue="admin123"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              로그인
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '1rem', color: '#666', fontSize: '0.875rem' }}>
            데모 계정: admin@realestate.com / admin123
          </p>
        </div>
      </div>
    );
  }

  const renderPageContent = () => {
    switch (currentPage) {
      case 'properties':
        return null;
      case 'contracts':
        return (
          <div style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>계약관리</h2>
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <p>계약 관리 기능이 여기에 표시됩니다.</p>
            </div>
          </div>
        );
      case 'employees':
        return (
          <div style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>직원관리</h2>
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <p>직원 관리 기능이 여기에 표시됩니다.</p>
            </div>
          </div>
        );
      case 'consultations':
        return (
          <div style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>상담관리</h2>
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <p>상담 관리 기능이 여기에 표시됩니다.</p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>설정</h2>
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <p>시스템 설정이 여기에 표시됩니다.</p>
            </div>
          </div>
        );
      default:
        return (
          <div style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>대시보드</h2>
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <p style={{ color: '#666', marginBottom: '1.5rem' }}>
                네오시스에  오신 것을 환영합니다!
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1rem'
              }}>
                <div style={{
                  backgroundColor: '#dbeafe',
                  padding: '1.5rem',
                  borderRadius: '8px'
                }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e40af' }}>물건 관리</h3>
                  <p style={{ margin: 0, color: '#3730a3', fontSize: '0.875rem' }}>
                    등록된 물건을 관리하세요
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#dcfce7',
                  padding: '1.5rem',
                  borderRadius: '8px'
                }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#166534' }}>계약 관리</h3>
                  <p style={{ margin: 0, color: '#14532d', fontSize: '0.875rem' }}>
                    계약 현황을 확인하세요
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#fae8ff',
                  padding: '1.5rem',
                  borderRadius: '8px'
                }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#7c3aed' }}>직원 관리</h3>
                  <p style={{ margin: 0, color: '#6b21a8', fontSize: '0.875rem' }}>
                    직원 정보를 관리하세요
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarCollapsed ? '60px' : '250px',
        backgroundColor: 'white',
        borderRight: '1px solid #e5e5e5',
        transition: 'width 0.3s ease',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #e5e5e5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {!sidebarCollapsed && (
            <h2 style={{ margin: 0, color: '#333', fontSize: '1.2rem' }}>네오시스</h2>
          )}
          <button
            onClick={toggleSidebar}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav style={{ padding: '1rem 0' }}>
          {menuItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (item.subMenus) {
                    toggleMenu(item.id);
                  } else if (item.id === 'properties') {
                    openTab('properties', '물건관리', 'properties');
                  } else if (item.id === 'partners') {
                    openTab('partners', '협력업체관리', 'partners');
                  } else if (item.id === 'transaction-network') {
                    openTab('transaction-network', '공동중개망', 'transaction-network');
                  } else {
                    setCurrentPage(item.id);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  backgroundColor: currentPage === item.id ? '#f3f4f6' : 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  borderLeft: currentPage === item.id ? '3px solid #3b82f6' : '3px solid transparent',
                  color: currentPage === item.id ? '#3b82f6' : '#666',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </div>
                {!sidebarCollapsed && item.subMenus && (
                  <span style={{ fontSize: '0.8rem' }}>
                    {expandedMenus[item.id] ? '▼' : '▶'}
                  </span>
                )}
              </button>

              {/* 하위메뉴 */}
              {!sidebarCollapsed && item.subMenus && expandedMenus[item.id] && (
                <div style={{ paddingLeft: '2rem' }}>
                  {item.subMenus.map((subItem) => (
                    <button
                      key={subItem.id}
                      onClick={() => openTab(subItem.id, subItem.tabTitle, subItem.contentType)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 1rem',
                        backgroundColor: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: '#888',
                        fontSize: '0.9rem',
                        borderLeft: '2px solid #e5e5e5'
                      }}
                    >
                      {subItem.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Navigation */}
        {/* <nav style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e5e5',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div></div>
        </nav> */}

        {/* Page Content with TabSystem */}
        <main style={{ flex: 1, position: 'relative' }}>
          {/* 기본 페이지 컨텐츠 */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            {renderPageContent()}
          </div>

          {/* TabSystem 오버레이 */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
            <TabSystem ref={tabSystemRef} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;