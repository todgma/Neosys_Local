import React, { useState, useRef } from 'react';
import PropertyGrid from './components/PropertyGrid';
import TabSystem from './components/TabSystem/TabSystem';

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
    {
      id: 'properties',
      name: '물건관리',
      icon: '🏢',
      subMenus: [
        { id: 'property-status', name: '물건현황', tabTitle: '물건현황', contentType: 'property-grid' }
      ]
    },
    { id: 'contracts', name: '계약관리', icon: '📋' },
    { id: 'employees', name: '직원관리', icon: '👥' },
    { id: 'consultations', name: '상담관리', icon: '💬' },
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
        // 새 창이 닫혔을 때 처리할 로직이 있다면 여기에 추가
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
            공인중개사 ERP 시스템
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

  const renderTabContent = (tabId) => {
    switch (tabId) {
      case 'property-status':
        return <PropertyGrid />;
      default:
        return <div style={{ padding: '2rem' }}>탭 내용이 여기에 표시됩니다.</div>;
    }
  };

  const openInNewWindow = (tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // 새 창 열기
    const newWindow = window.open('', '_blank', 'width=1400,height=900,resizable=yes,scrollbars=yes');

    if (newWindow) {
      // 새 창 HTML 구성 (PropertyGrid를 직접 구현)
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${tab.title} - 공인중개사 ERP</title>
          <meta charset="UTF-8">
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard Variable", Pretendard, Roboto, "Noto Sans KR", "Segoe UI", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif;
              background-color: #f5f5f5;
            }
            .container { height: 100vh; display: flex; flex-direction: column; }
            .toolbar {
              padding: 1rem;
              background-color: #f8f9fa;
              border-bottom: 1px solid #e5e5e5;
              display: flex;
              gap: 0.5rem;
              flex-wrap: wrap;
            }
            .btn {
              padding: 0.5rem 1rem;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
            }
            .btn-primary { background-color: #3b82f6; }
            .btn-success { background-color: #10b981; }
            .btn-purple { background-color: #8b5cf6; }
            .grid-container { flex: 1; overflow: auto; border: 1px solid #e5e5e5; }
            table { width: 100%; border-collapse: collapse; }
            th, td {
              padding: 0.75rem;
              border: 1px solid #e5e5e5;
              text-align: left;
            }
            th {
              background-color: #f8f9fa;
              font-weight: bold;
              position: sticky;
              top: 0;
              z-index: 10;
            }
            tbody tr:nth-child(even) { background-color: #f8f9fa; }
            tbody tr:nth-child(odd) { background-color: #ffffff; }
            td[contenteditable] { outline: none; }
            .status-bar {
              padding: 0.5rem 1rem;
              background-color: #f8f9fa;
              border-top: 1px solid #e5e5e5;
              font-size: 0.875rem;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="toolbar">
              <button class="btn btn-primary" onclick="addColumn()">컬럼 추가</button>
              <button class="btn btn-success" onclick="saveSettings()">설정 저장</button>
              <button class="btn btn-purple" onclick="loadSettings()">설정 로드</button>
            </div>
            <div class="grid-container">
              <table id="dataTable">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>물건종류</th>
                    <th>주소</th>
                    <th>면적(㎡)</th>
                    <th>가격(만원)</th>
                    <th>보증금(만원)</th>
                    <th>월세(만원)</th>
                    <th>층수</th>
                    <th>방수</th>
                    <th>욕실수</th>
                    <th>주차</th>
                    <th>상태</th>
                    <th>등록일</th>
                    <th>비고</th>
                  </tr>
                </thead>
                <tbody id="tableBody">
                </tbody>
              </table>
            </div>
            <div class="status-bar" id="statusBar">
              총 100개 항목 | 표시된 컬럼: 14개
            </div>
          </div>

          <script>
            // 샘플 데이터 생성
            function generateSampleData() {
              const propertyTypes = ['아파트', '원룸', '투룸', '오피스텔'];
              const parkingOptions = ['가능', '불가능'];
              const statusOptions = ['임대가능', '임대중', '계약완료'];
              const data = [];

              for (let i = 1; i <= 100; i++) {
                data.push({
                  id: i,
                  propertyType: propertyTypes[Math.floor(Math.random() * propertyTypes.length)],
                  address: \`서울시 강남구 \${i}번지\`,
                  area: Math.floor(Math.random() * 100) + 20,
                  price: Math.floor(Math.random() * 50000) + 10000,
                  deposit: Math.floor(Math.random() * 10000) + 1000,
                  monthlyRent: Math.floor(Math.random() * 200) + 50,
                  floor: Math.floor(Math.random() * 20) + 1,
                  rooms: Math.floor(Math.random() * 4) + 1,
                  bathrooms: Math.floor(Math.random() * 3) + 1,
                  parking: parkingOptions[Math.floor(Math.random() * parkingOptions.length)],
                  status: statusOptions[Math.floor(Math.random() * statusOptions.length)],
                  registrationDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString(),
                  notes: \`메모 \${i}\`
                });
              }
              return data;
            }

            // 테이블 렌더링
            function renderTable() {
              const data = generateSampleData();
              const tbody = document.getElementById('tableBody');
              tbody.innerHTML = '';

              data.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = \`
                  <td contenteditable>\${row.id}</td>
                  <td contenteditable>\${row.propertyType}</td>
                  <td contenteditable>\${row.address}</td>
                  <td contenteditable>\${row.area}</td>
                  <td contenteditable>\${row.price}</td>
                  <td contenteditable>\${row.deposit}</td>
                  <td contenteditable>\${row.monthlyRent}</td>
                  <td contenteditable>\${row.floor}</td>
                  <td contenteditable>\${row.rooms}</td>
                  <td contenteditable>\${row.bathrooms}</td>
                  <td contenteditable>\${row.parking}</td>
                  <td contenteditable>\${row.status}</td>
                  <td contenteditable>\${row.registrationDate}</td>
                  <td contenteditable>\${row.notes}</td>
                \`;
                tbody.appendChild(tr);
              });
            }

            function addColumn() {
              const columnName = prompt('새 컬럼명을 입력하세요:');
              if (columnName) {
                // 헤더에 컬럼 추가
                const headerRow = document.querySelector('thead tr');
                const th = document.createElement('th');
                th.textContent = columnName;
                headerRow.appendChild(th);

                // 모든 데이터 행에 빈 셀 추가
                const rows = document.querySelectorAll('tbody tr');
                rows.forEach(row => {
                  const td = document.createElement('td');
                  td.contentEditable = true;
                  td.textContent = '';
                  row.appendChild(td);
                });

                alert('컬럼이 추가되었습니다.');
              }
            }

            function saveSettings() {
              alert('설정이 저장되었습니다.');
            }

            function loadSettings() {
              alert('설정이 로드되었습니다.');
            }

            // 페이지 로드 시 테이블 렌더링
            window.onload = function() {
              renderTable();
            };

            // 창 닫기 시 메인 창에 알림
            window.onbeforeunload = function() {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: 'TAB_CLOSED', tabId: '${tabId}' }, '*');
              }
            };
          </script>
        </body>
        </html>
      `);

      newWindow.document.close();

      // 탭을 독립 상태로 설정하고 메인 창에서 제거
      setTabs(prev => prev.filter(t => t.id !== tabId));
      if (activeTab === tabId) {
        const remainingTabs = tabs.filter(t => t.id !== tabId && !t.isDocked);
        setActiveTab(remainingTabs.length > 0 ? remainingTabs[0].id : null);
      }
    }
  };

  const renderPageContent = () => {
    // 탭이 있을 때도 메뉴는 항상 표시되도록 수정
    const hasActiveTabs = tabs.some(tab => !tab.isDocked);

    if (hasActiveTabs) {
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* 탭 헤더 */}
          <div style={{
            display: 'flex',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e5e5e5',
            overflow: 'auto'
          }}>
            {tabs.filter(tab => !tab.isDocked).map((tab) => (
              <div
                key={tab.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: '150px',
                  backgroundColor: activeTab === tab.id ? 'white' : '#f8f9fa',
                  borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                  padding: '0.75rem 1rem'
                }}
              >
                <button
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    flex: 1,
                    textAlign: 'left',
                    color: activeTab === tab.id ? '#3b82f6' : '#666'
                  }}
                >
                  {tab.title}
                </button>

                <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem' }}>
                  <button
                    onClick={() => openInNewWindow(tab.id)}
                    title="새 창으로 분리"
                    style={{
                      padding: '0.25rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      color: '#666'
                    }}
                  >
                    🗗
                  </button>

                  <button
                    onClick={() => closeTab(tab.id)}
                    style={{
                      padding: '0.25rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      color: '#666'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 탭 컨텐츠 */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeTab && !tabs.find(t => t.id === activeTab)?.isDocked && renderTabContent(activeTab)}
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'properties':
        return (
          <div style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>물건관리</h2>
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <p>물건 관리 기능이 여기에 표시됩니다.</p>
              <p>좌측 메뉴에서 '물건현황'을 클릭하여 탭을 열어보세요.</p>
            </div>
          </div>
        );
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
                공인중개사 ERP 시스템에 오신 것을 환영합니다!
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
            <h2 style={{ margin: 0, color: '#333', fontSize: '1.2rem' }}>공인중개사 ERP</h2>
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
        <nav style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e5e5',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>안녕하세요, {user?.name}님</span>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              로그아웃
            </button>
          </div>
        </nav>

        {/* Page Content */}
        <main style={{ flex: 1 }}>
          {renderPageContent()}
        </main>
      </div>
    </div>
  );
}

export default App;