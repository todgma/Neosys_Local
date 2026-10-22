import React, { useState, useRef, useEffect } from 'react';

const PropertyGrid = () => {
  const [columnOrder, setColumnOrder] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState({});
  const [gridData, setGridData] = useState([]);
  const gridRef = useRef(null);

  const defaultColumns = [
    { prop: 'id', name: 'ID', size: 80 },
    { prop: 'propertyType', name: '물건종류', size: 100 },
    { prop: 'address', name: '주소', size: 200 },
    { prop: 'area', name: '면적(㎡)', size: 100 },
    { prop: 'price', name: '가격(만원)', size: 120 },
    { prop: 'deposit', name: '보증금(만원)', size: 120 },
    { prop: 'monthlyRent', name: '월세(만원)', size: 100 },
    { prop: 'floor', name: '층수', size: 80 },
    { prop: 'rooms', name: '방수', size: 80 },
    { prop: 'bathrooms', name: '욕실수', size: 80 },
    { prop: 'parking', name: '주차', size: 80 },
    { prop: 'status', name: '상태', size: 100 },
    { prop: 'registrationDate', name: '등록일', size: 120 },
    { prop: 'notes', name: '비고', size: 150 }
  ];

  const [columns, setColumns] = useState(defaultColumns);

  useEffect(() => {
    const initialOrder = defaultColumns.map(col => col.prop);
    const initialVisibility = defaultColumns.reduce((acc, col) => {
      acc[col.prop] = true;
      return acc;
    }, {});

    setColumnOrder(initialOrder);
    setVisibleColumns(initialVisibility);

    // 초기 데이터
    const initialData = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      propertyType: ['아파트', '원룸', '투룸', '오피스텔'][Math.floor(Math.random() * 4)],
      address: `서울시 강남구 ${i + 1}번지`,
      area: Math.floor(Math.random() * 100) + 20,
      price: Math.floor(Math.random() * 50000) + 10000,
      deposit: Math.floor(Math.random() * 10000) + 1000,
      monthlyRent: Math.floor(Math.random() * 200) + 50,
      floor: Math.floor(Math.random() * 20) + 1,
      rooms: Math.floor(Math.random() * 4) + 1,
      bathrooms: Math.floor(Math.random() * 3) + 1,
      parking: ['가능', '불가능'][Math.floor(Math.random() * 2)],
      status: ['임대가능', '임대중', '계약완료'][Math.floor(Math.random() * 3)],
      registrationDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString(),
      notes: `메모 ${i + 1}`
    }));

    setGridData(initialData);
  }, []);

  const toggleColumnVisibility = (columnProp) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnProp]: !prev[columnProp]
    }));
  };

  const addCustomColumn = () => {
    const columnName = prompt('새 컬럼명을 입력하세요:');
    if (columnName) {
      const newColumn = {
        prop: `custom_${Date.now()}`,
        name: columnName,
        size: 120
      };
      setColumns(prev => [...prev, newColumn]);
      setVisibleColumns(prev => ({
        ...prev,
        [newColumn.prop]: true
      }));
      setColumnOrder(prev => [...prev, newColumn.prop]);
    }
  };

  const moveColumn = (fromIndex, toIndex) => {
    const newOrder = [...columnOrder];
    const [movedColumn] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedColumn);
    setColumnOrder(newOrder);
  };

  const saveColumnSettings = () => {
    const settings = {
      columnOrder,
      visibleColumns,
      customColumns: columns.filter(col => col.prop.startsWith('custom_'))
    };
    localStorage.setItem('propertyGridSettings', JSON.stringify(settings));
    alert('컬럼 설정이 저장되었습니다.');
  };

  const loadColumnSettings = () => {
    const saved = localStorage.getItem('propertyGridSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      setColumnOrder(settings.columnOrder);
      setVisibleColumns(settings.visibleColumns);
      if (settings.customColumns) {
        setColumns(prev => [...defaultColumns, ...settings.customColumns]);
      }
      alert('컬럼 설정이 로드되었습니다.');
    }
  };

  const visibleColumnConfig = columns
    .filter(col => visibleColumns[col.prop])
    .sort((a, b) => columnOrder.indexOf(a.prop) - columnOrder.indexOf(b.prop));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 툴바 */}
      <div style={{
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #e5e5e5',
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={addCustomColumn}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          컬럼 추가
        </button>

        <button
          onClick={saveColumnSettings}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          설정 저장
        </button>

        <button
          onClick={loadColumnSettings}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          설정 로드
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <select
            onChange={(e) => {
              if (e.target.value) {
                toggleColumnVisibility(e.target.value);
                e.target.value = '';
              }
            }}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px'
            }}
          >
            <option value="">컬럼 표시/숨김</option>
            {columns.map(col => (
              <option key={col.prop} value={col.prop}>
                {visibleColumns[col.prop] ? '✓' : '✗'} {col.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 그리드 영역 */}
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid #e5e5e5' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              {visibleColumnConfig.map((col, index) => (
                <th
                  key={col.prop}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', index.toString());
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    moveColumn(fromIndex, index);
                  }}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #e5e5e5',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    cursor: 'move',
                    minWidth: col.size + 'px',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#f8f9fa',
                    zIndex: 10
                  }}
                >
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gridData.map((row, rowIndex) => (
              <tr
                key={row.id}
                style={{
                  backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f8f9fa'
                }}
              >
                {visibleColumnConfig.map(col => (
                  <td
                    key={col.prop}
                    style={{
                      padding: '0',
                      border: '1px solid #e5e5e5',
                      minWidth: col.size + 'px'
                    }}
                  >
                    <div
                      contentEditable
                      suppressContentEditableWarning={true}
                      onBlur={(e) => {
                        const newData = [...gridData];
                        newData[rowIndex][col.prop] = e.target.textContent;
                        setGridData(newData);
                      }}
                      style={{
                        padding: '0.5rem',
                        outline: 'none',
                        minHeight: '1.5rem'
                      }}
                    >
                      {row[col.prop] || ''}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 상태바 */}
      <div style={{
        padding: '0.5rem 1rem',
        backgroundColor: '#f8f9fa',
        borderTop: '1px solid #e5e5e5',
        fontSize: '0.875rem',
        color: '#666'
      }}>
        총 {gridData.length}개 항목 | 표시된 컬럼: {visibleColumnConfig.length}개
      </div>
    </div>
  );
};

export default PropertyGrid;