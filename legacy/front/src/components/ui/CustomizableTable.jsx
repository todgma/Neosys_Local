import React, { useState, useEffect } from 'react';
import { Settings, Palette, Save, ArrowUpDown, ArrowUp, ArrowDown, Filter, X } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 로컬스토리지 유틸
const TableConfigManager = {
  save: (menuId, config) => {
    try {
      localStorage.setItem(`table_config_${menuId}`, JSON.stringify(config));
    } catch (error) {
      console.error('테이블 설정 저장 실패:', error);
    }
  },
  load: (menuId) => {
    try {
      const saved = localStorage.getItem(`table_config_${menuId}`);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('테이블 설정 로드 실패:', error);
      return null;
    }
  }
};

// 드래그 가능한 헤더 셀
const SortableHeaderCell = ({ id, column, sortConfig, onSort, filterValue, onFilterChange, onContextMenu, isSortDisabled, isFilterDisabled }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [showFilterInput, setShowFilterInput] = React.useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    backgroundColor: column.headerColor || 'transparent',
  };

  const getSortIcon = () => {
    if (sortConfig?.key === id) {
      return sortConfig.direction === 'asc'
        ? <ArrowUp className="w-3 h-3" />
        : <ArrowDown className="w-3 h-3" />;
    }
    return null;
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase relative group border border-gray-200"
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(id, e);
      }}
    >
      <div className="flex flex-col space-y-1">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (!isSortDisabled) {
                onSort?.(id);
              }
            }}
          >
            <span>{column.label}</span>
            {!isSortDisabled && sortConfig?.key === id && (
              <span className="ml-1">{getSortIcon()}</span>
            )}
          </div>
          {!isFilterDisabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFilterInput(!showFilterInput);
              }}
              className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded ${filterValue ? 'opacity-100 text-indigo-600' : ''}`}
              title="필터"
            >
              <Filter className="w-4 h-4" />
            </button>
          )}
        </div>
        {!isFilterDisabled && showFilterInput && (
          <div className="flex items-center space-x-1 mt-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={filterValue || ''}
              onChange={(e) => onFilterChange?.(id, e.target.value)}
              placeholder="검색..."
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            {filterValue && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFilterChange?.(id, '');
                }}
                className="p-1 hover:bg-gray-200 rounded"
                title="초기화"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </th>
  );
};

const CustomizableTable = ({
  menuId,
  allColumns, // 전체 컬럼 목록 (추가 가능한 모든 컬럼)
  defaultColumns, // 기본 표시 컬럼
  data,
  isLoading,
  renderCell,
  onRowClick,
  onRowContextMenu, // 우클릭 핸들러 추가
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  emptyMessage = '검색 결과가 없습니다',
  sortableColumns = [], // 사용 안함 (하위 호환성)
  filterableColumns = [], // 사용 안함 (하위 호환성)
  showRowNumber = true, // 번호 칼럼 표시 여부
}) => {
  // allColumns가 없으면 defaultColumns 사용 (하위 호환성)
  const availableColumns = allColumns || defaultColumns;
  const [columns, setColumns] = useState(defaultColumns);
  const [rowColors, setRowColors] = useState({});
  const [cellColors, setCellColors] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedHeader, setSelectedHeader] = useState(null);
  const [headerContextMenu, setHeaderContextMenu] = useState(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [rowContextMenuPosition, setRowContextMenuPosition] = useState({ x: 0, y: 0 });
  const [cellContextMenuPosition, setCellContextMenuPosition] = useState({ x: 0, y: 0 });
  const [sortConfig, setSortConfig] = useState(null); // { key: 'columnKey', direction: 'asc' | 'desc' }
  const [filters, setFilters] = useState({}); // { columnKey: 'filterValue' }
  const [disabledSort, setDisabledSort] = useState({}); // { columnKey: boolean } - 정렬 비활성화 컬럼
  const [disabledFilter, setDisabledFilter] = useState({}); // { columnKey: boolean } - 필터 비활성화 컬럼
  const [hiddenColumns, setHiddenColumns] = useState({}); // { columnKey: boolean } - 숨김 처리된 컬럼

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 설정 로드
  useEffect(() => {
    const savedConfig = TableConfigManager.load(menuId);
    if (savedConfig) {
      setColumns(savedConfig.columns || defaultColumns);
      setRowColors(savedConfig.rowColors || {});
      setCellColors(savedConfig.cellColors || {});
      setSortConfig(savedConfig.sortConfig || null);
      setFilters(savedConfig.filters || {});
      setDisabledSort(savedConfig.disabledSort || {});
      setDisabledFilter(savedConfig.disabledFilter || {});
      setHiddenColumns(savedConfig.hiddenColumns || {});
    }
  }, [menuId]);

  // 설정 저장
  const saveConfig = () => {
    const config = {
      columns,
      rowColors,
      cellColors,
      sortConfig,
      filters,
      disabledSort,
      disabledFilter,
      hiddenColumns,
    };
    TableConfigManager.save(menuId, config);
  };

  // 컬럼 추가 (숨겨진 컬럼을 표시)
  const addColumn = (columnKey) => {
    // 이미 columns에 있으면 숨김만 해제
    const existsInColumns = columns.some((col) => col.key === columnKey);
    if (existsInColumns) {
      setHiddenColumns((prev) => ({
        ...prev,
        [columnKey]: false,
      }));
    } else {
      // columns에 없으면 추가
      const columnToAdd = availableColumns.find((col) => col.key === columnKey);
      if (columnToAdd) {
        setColumns((prev) => [...prev, columnToAdd]);
        setHiddenColumns((prev) => ({
          ...prev,
          [columnKey]: false,
        }));
      }
    }
  };

  // 컬럼 숨김/표시 토글
  const toggleColumnHidden = (columnKey) => {
    setHiddenColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  // 표시할 컬럼만 필터링
  const visibleColumns = columns.filter((col) => !hiddenColumns[col.key]);

  // 컬럼 순서 변경
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((item) => item.key === active.id);
        const newIndex = items.findIndex((item) => item.key === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // 컬럼 색상 변경
  const handleColumnColorChange = (columnKey, type, color) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.key === columnKey
          ? { ...col, [type === 'header' ? 'headerColor' : 'cellColor']: color }
          : col
      )
    );
  };

  // 행 색상 변경
  const handleRowColorChange = (rowId, color) => {
    setRowColors((prev) => ({
      ...prev,
      [rowId]: color,
    }));
  };

  // 셀 색상 변경
  const handleCellColorChange = (rowId, columnKey, color) => {
    setCellColors((prev) => ({
      ...prev,
      [`${rowId}_${columnKey}`]: color,
    }));
  };

  // 정렬 처리
  const handleSort = (columnKey) => {
    setSortConfig((prev) => {
      if (prev?.key === columnKey) {
        // 같은 컬럼 클릭 시: asc -> desc -> null
        if (prev.direction === 'asc') {
          return { key: columnKey, direction: 'desc' };
        }
        return null;
      }
      // 새 컬럼 클릭 시: asc로 시작
      return { key: columnKey, direction: 'asc' };
    });
  };

  // 필터 처리
  const handleFilterChange = (columnKey, value) => {
    setFilters((prev) => ({
      ...prev,
      [columnKey]: value,
    }));
  };

  // 헤더 우클릭 메뉴 처리
  const handleHeaderContextMenu = (columnKey, event) => {
    setSelectedHeader(columnKey);
    setHeaderContextMenu(columnKey);
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setSelectedRow(null);
    setSelectedCell(null);
  };

  // 정렬 기능 토글
  const toggleSortEnabled = (columnKey) => {
    setDisabledSort((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  // 필터 기능 토글
  const toggleFilterEnabled = (columnKey) => {
    setDisabledFilter((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
    // 필터 비활성화 시 기존 필터값 제거
    if (!disabledFilter[columnKey]) {
      setFilters((prev) => {
        const newFilters = { ...prev };
        delete newFilters[columnKey];
        return newFilters;
      });
    }
  };

  // 데이터 정렬 및 필터링
  const processedData = React.useMemo(() => {
    let result = [...data];

    // 필터 적용
    Object.keys(filters).forEach((columnKey) => {
      const filterValue = filters[columnKey];
      if (filterValue) {
        result = result.filter((row) => {
          const cellValue = String(row[columnKey] || '').toLowerCase();
          return cellValue.includes(filterValue.toLowerCase());
        });
      }
    });

    // 정렬 적용
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === bValue) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        const comparison = aValue > bValue ? 1 : -1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, filters, sortConfig]);

  // 색상 팔레트
  const colors = [
    { name: '없음', value: null },
    { name: '파랑', value: '#dbeafe' },
    { name: '초록', value: '#d1fae5' },
    { name: '노랑', value: '#fef3c7' },
    { name: '빨강', value: '#fee2e2' },
    { name: '보라', value: '#ede9fe' },
    { name: '회색', value: '#f3f4f6' },
  ];

  // 셀 배경색 가져오기
  const getCellBackgroundColor = (rowId, columnKey) => {
    const cellKey = `${rowId}_${columnKey}`;
    return cellColors[cellKey] || columns.find((c) => c.key === columnKey)?.cellColor || null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* 설정 버튼 */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900">데이터 목록</h3>
          <p className="text-sm text-gray-500 mt-1">
            총 {processedData.length}건 {totalPages > 1 && `(페이지 ${currentPage}/${totalPages})`}
            {Object.keys(filters).filter((k) => filters[k]).length > 0 && (
              <span className="ml-2 text-indigo-600">(필터 적용 중)</span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Settings className="w-4 h-4 mr-1" />
            {showSettings ? '닫기' : '설정'}
          </button>
        </div>
      </div>

      {/* 설정 패널 */}
      {showSettings && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-gray-600">
              <p>헤더 드래그: 순서변경 | 헤더 클릭: 정렬 | 헤더 우클릭: 숨김/설정 | 행/셀 우클릭: 색상변경</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  saveConfig();
                  alert('현재 설정이 저장되었습니다.');
                }}
                className="flex items-center px-3 py-1.5 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                현재 설정 저장
              </button>
              <button
                onClick={() => {
                  if (window.confirm('테이블 설정을 초기화하시겠습니까? 컬럼 순서, 숨김 설정, 색상 등이 모두 초기화됩니다.')) {
                    localStorage.removeItem(`table_config_${menuId}`);
                    window.location.reload();
                  }
                }}
                className="flex items-center px-3 py-1.5 text-xs text-white bg-red-600 rounded hover:bg-red-700"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                초기화
              </button>
            </div>
          </div>

          {/* 컬럼 관리 섹션 */}
          <div className="pt-3 border-t border-gray-300">
            <h4 className="text-sm font-medium text-gray-900 mb-2">컬럼 추가</h4>

            {/* 추가 가능한 컬럼 (숨김 컬럼 + 미추가 컬럼 모두 포함) */}
            <div className="text-xs text-gray-600 mb-1.5">클릭하여 컬럼 추가</div>
            <div className="flex flex-wrap gap-2">
              {/* 숨겨진 컬럼들 (이미 추가되었지만 숨김 상태) */}
              {columns
                .filter((col) => hiddenColumns[col.key])
                .map((col) => (
                  <button
                    key={col.key}
                    onClick={() => toggleColumnHidden(col.key)}
                    className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-indigo-50 hover:border-indigo-400 text-gray-700"
                  >
                    + {col.label}
                  </button>
                ))}

              {/* 아직 추가되지 않은 컬럼들 */}
              {availableColumns
                .filter((col) => !columns.some((c) => c.key === col.key))
                .map((col) => (
                  <button
                    key={col.key}
                    onClick={() => addColumn(col.key)}
                    className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-indigo-50 hover:border-indigo-400 text-gray-700"
                  >
                    + {col.label}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 테이블 */}
      <div className="flex-1 overflow-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {/* 목록 테이블 최상단(헤더 상단) 굵은 테두리 — 물건관리 목록과 통일 */}
          <style>{`.cz-list-grid thead tr:first-child th { border-top: 2px solid #94a3b8 !important; }`}</style>
          <table className="w-full border-collapse cz-list-grid">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {showRowNumber && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border border-gray-200">번호</th>
                )}
                <SortableContext items={visibleColumns.map((c) => c.key)} strategy={horizontalListSortingStrategy}>
                  {visibleColumns.map((column) => (
                    <SortableHeaderCell
                      key={column.key}
                      id={column.key}
                      column={column}
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      filterValue={filters[column.key]}
                      onFilterChange={handleFilterChange}
                      onContextMenu={handleHeaderContextMenu}
                      isSortDisabled={disabledSort[column.key]}
                      isFilterDisabled={disabledFilter[column.key]}
                    />
                  ))}
                </SortableContext>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={visibleColumns.length + (showRowNumber ? 1 : 0)} className="px-4 py-12 text-center text-gray-500">
                    로딩 중...
                  </td>
                </tr>
              ) : processedData.length > 0 ? (
                processedData.map((row, index) => {
                  const rowId = row.id || index;
                  const rowBgColor = rowColors[rowId];

                  return (
                    <tr
                      key={rowId}
                      onClick={() => onRowClick?.(row)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        // 외부에서 onRowContextMenu가 제공되면 그것을 우선 사용
                        if (onRowContextMenu) {
                          onRowContextMenu(e, row);
                        } else {
                          // 기본 동작 (행 색상 설정 등)
                          setSelectedRow(rowId);
                          setSelectedCell(null);
                          setHeaderContextMenu(null);
                          setRowContextMenuPosition({ x: e.clientX, y: e.clientY });
                        }
                      }}
                      className="hover:bg-gray-50 cursor-pointer"
                      style={{ backgroundColor: rowBgColor || 'transparent' }}
                    >
                      {showRowNumber && (
                        <td className="px-4 py-3 text-sm text-gray-900 border border-gray-200">
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                      )}
                      {visibleColumns.map((column) => {
                        const cellBgColor = getCellBackgroundColor(rowId, column.key);
                        return (
                          <td
                            key={column.key}
                            className="px-4 py-3 text-sm text-gray-900 border border-gray-200"
                            style={{ backgroundColor: cellBgColor || 'transparent' }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedCell({ rowId, columnKey: column.key });
                              setSelectedRow(null);
                              setHeaderContextMenu(null);
                              setCellContextMenuPosition({ x: e.clientX, y: e.clientY });
                            }}
                          >
                            {renderCell(row, column)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length + (showRowNumber ? 1 : 0)} className="px-4 py-12 text-center text-gray-500">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </DndContext>
      </div>

      {/* 헤더 컨텍스트 메뉴 */}
      {headerContextMenu !== null && (
        <div
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg py-1 z-50 min-w-[180px] max-w-[280px]"
          style={{
            top: `${contextMenuPosition.y}px`,
            left: `${contextMenuPosition.x}px`,
          }}
        >
          <div className="px-3 py-2 text-sm font-medium text-gray-700 border-b border-gray-200">
            {columns.find((c) => c.key === headerContextMenu)?.label} 설정
          </div>

          {/* 컬럼 숨김 */}
          <div className="border-b border-gray-200 py-1">
            <button
              onClick={() => {
                toggleColumnHidden(headerContextMenu);
                setHeaderContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm text-red-600"
            >
              컬럼 숨기기
            </button>
          </div>

          {/* 정렬 기능 ON/OFF */}
          <div className="border-b border-gray-200 py-1">
            <button
              onClick={() => {
                toggleSortEnabled(headerContextMenu);
              }}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center justify-between"
            >
              <span>정렬 기능</span>
              <span className={`px-2 py-0.5 text-xs rounded ${disabledSort[headerContextMenu] ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                {disabledSort[headerContextMenu] ? 'OFF' : 'ON'}
              </span>
            </button>
          </div>

          {/* 정렬 옵션 - 정렬 기능이 ON일 때만 표시 */}
          {!disabledSort[headerContextMenu] && (
            <div className="border-b border-gray-200 py-1">
              <div className="px-2 py-1 text-xs text-gray-500 uppercase">정렬</div>
              <button
                onClick={() => {
                  setSortConfig({ key: headerContextMenu, direction: 'asc' });
                  setHeaderContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center space-x-2"
              >
                <ArrowUp className="w-4 h-4" />
                <span>오름차순 정렬</span>
                {sortConfig?.key === headerContextMenu && sortConfig.direction === 'asc' && (
                  <span className="ml-auto text-indigo-600">✓</span>
                )}
              </button>
              <button
                onClick={() => {
                  setSortConfig({ key: headerContextMenu, direction: 'desc' });
                  setHeaderContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center space-x-2"
              >
                <ArrowDown className="w-4 h-4" />
                <span>내림차순 정렬</span>
                {sortConfig?.key === headerContextMenu && sortConfig.direction === 'desc' && (
                  <span className="ml-auto text-indigo-600">✓</span>
                )}
              </button>
              {sortConfig?.key === headerContextMenu && (
                <button
                  onClick={() => {
                    setSortConfig(null);
                    setHeaderContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center space-x-2 text-gray-600"
                >
                  <X className="w-4 h-4" />
                  <span>정렬 해제</span>
                </button>
              )}
            </div>
          )}

          {/* 필터 기능 ON/OFF */}
          <div className="border-b border-gray-200 py-1">
            <button
              onClick={() => {
                toggleFilterEnabled(headerContextMenu);
              }}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center justify-between"
            >
              <span>필터 기능</span>
              <span className={`px-2 py-0.5 text-xs rounded ${disabledFilter[headerContextMenu] ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                {disabledFilter[headerContextMenu] ? 'OFF' : 'ON'}
              </span>
            </button>
          </div>

          {/* 필터 옵션 - 필터 기능이 ON일 때만 표시 */}
          {!disabledFilter[headerContextMenu] && (
            <div className="border-b border-gray-200 py-1">
              <div className="px-2 py-1 text-xs text-gray-500 uppercase">필터</div>
              <div className="px-3 py-2">
                <input
                  type="text"
                  value={filters[headerContextMenu] || ''}
                  onChange={(e) => handleFilterChange(headerContextMenu, e.target.value)}
                  placeholder="검색어 입력..."
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
              {filters[headerContextMenu] && (
                <button
                  onClick={() => {
                    handleFilterChange(headerContextMenu, '');
                    setHeaderContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center space-x-2 text-gray-600"
                >
                  <X className="w-4 h-4" />
                  <span>필터 해제</span>
                </button>
              )}
            </div>
          )}

          {/* 색상 옵션 */}
          <div className="py-1">
            <div className="px-2 py-1 text-xs text-gray-500 uppercase">헤더 색상</div>
            <div className="px-2 py-1 space-y-1">
              {colors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => {
                    handleColumnColorChange(headerContextMenu, 'header', color.value);
                    setHeaderContextMenu(null);
                  }}
                  className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded flex items-center space-x-2"
                >
                  <div
                    className="w-4 h-4 rounded border border-gray-300"
                    style={{ backgroundColor: color.value || 'white' }}
                  />
                  <span className="text-sm">{color.name}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setHeaderContextMenu(null)}
            className="w-full mt-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 border-t border-gray-200"
          >
            닫기
          </button>
        </div>
      )}

      {/* 색상 선택 컨텍스트 메뉴 - 행 (onRowContextMenu가 제공되지 않았을 때만 표시) */}
      {selectedRow !== null && !onRowContextMenu && (
        <div
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50 min-w-[150px]"
          style={{
            top: `${rowContextMenuPosition.y}px`,
            left: `${rowContextMenuPosition.x}px`,
          }}
        >
          <div className="text-sm font-medium text-gray-700 mb-2">행 색상 선택</div>
          <div className="space-y-1">
            {colors.map((color) => (
              <button
                key={color.name}
                onClick={() => {
                  handleRowColorChange(selectedRow, color.value);
                  setSelectedRow(null);
                }}
                className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded flex items-center space-x-2"
              >
                <div
                  className="w-4 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: color.value || 'white' }}
                />
                <span className="text-sm">{color.name}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setSelectedRow(null)}
            className="w-full mt-2 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            취소
          </button>
        </div>
      )}

      {/* 색상 선택 컨텍스트 메뉴 - 셀 */}
      {selectedCell !== null && (
        <div
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50 min-w-[150px]"
          style={{
            top: `${cellContextMenuPosition.y}px`,
            left: `${cellContextMenuPosition.x}px`,
          }}
        >
          <div className="text-sm font-medium text-gray-700 mb-2">셀 색상 선택</div>
          <div className="space-y-1">
            {colors.map((color) => (
              <button
                key={color.name}
                onClick={() => {
                  handleCellColorChange(selectedCell.rowId, selectedCell.columnKey, color.value);
                  setSelectedCell(null);
                }}
                className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded flex items-center space-x-2"
              >
                <div
                  className="w-4 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: color.value || 'white' }}
                />
                <span className="text-sm">{color.name}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setSelectedCell(null)}
            className="w-full mt-2 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            취소
          </button>
        </div>
      )}

      {/* 오버레이 - 컨텍스트 메뉴 닫기 */}
      {(selectedRow !== null || selectedCell !== null || headerContextMenu !== null) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setSelectedRow(null);
            setSelectedCell(null);
            setHeaderContextMenu(null);
          }}
        />
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 flex items-center justify-center space-x-2">
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            이전
          </button>
          <span className="text-sm text-gray-600">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomizableTable;
