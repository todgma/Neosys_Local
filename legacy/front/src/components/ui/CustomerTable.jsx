import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 컬럼 기본 구성 버전 — 기본 컬럼 세트가 바뀌면 올려서 이전 저장분(컬럼 순서)만 무시(색/정렬은 유지)
const TABLE_CONFIG_VERSION = 2;

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

// 드래그 가능한 헤더 셀 (subHeaders 있으면 colspan, 없으면 rowspan 2 / inlineSub면 한 셀에 가로로)
const SortableHeaderCell = ({ id, column, freshLabel, sortConfig, onSort, filterValue, onFilterChange, onContextMenu, isSortDisabled, isFilterDisabled, inlineSub = false }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

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

  const hasSubHeaders = column.subHeaders && column.subHeaders.length > 0;
  const inlineMode = inlineSub && hasSubHeaders; // subHeaders를 한 셀에 가로로 합침(2행→1행)

  return (
    <th
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="px-2 py-1 text-center text-[15px] font-normal text-black uppercase relative group border leading-tight"
      colSpan={(hasSubHeaders && !inlineMode) ? column.subHeaders.length : (column.colSpan || undefined)}
      rowSpan={column.titleFilter ? 1 : ((hasSubHeaders && !inlineMode) ? undefined : 2)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(id, e);
      }}
    >
      <div className="flex items-center justify-center space-x-2">
        <span>{inlineMode ? column.subHeaders.join(' · ') : (freshLabel !== undefined ? freshLabel : column.label)}</span>
      </div>
    </th>
  );
};

const CustomerTable = ({
  menuId,
  allColumns,
  defaultColumns,
  data,
  isLoading,
  renderCell,
  onRowClick,
  onRowSelect,   // 행 1회 클릭 시 선택(체크) 토글. 없으면 onRowClick으로 폴백
  onRowEdit,     // 우클릭 메뉴 '수정' — (row) 전달
  onRowCopy,     // 우클릭 메뉴 '복사등록' — (row) 전달
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  emptyMessage = '검색 결과가 없습니다',
  showHeader = true, // 상단 타이틀("데이터 목록")/페이지 표시 헤더 노출 여부
  colorFillRequest = null, // { seq, ids: [rowId...], color } - 선택 행 색 채우기 요청
  fixedColumns = false, // true면 컬럼을 로컬스토리지에 저장/복원하지 않고 defaultColumns로 고정
  fixedWidth = false, // true면 tableLayout:fixed + colgroup(px)로 컬럼 절대너비 고정(반응형X). 컬럼 저장/순서는 유지
  fluidWidth = false, // true면 tableLayout:fixed + width:100%로 컨테이너 폭에 맞춰 컬럼 비례 축소(우측 잘림 방지)
  inlineSub = false,  // true면 subHeaders(2행)를 한 셀에 가로로 합쳐 1행(행 높이 축소)
}) => {
  // 행 1회 클릭 = 선택(체크) 토글 / 2회 클릭 = 수정창(onRowClick). 타이머로 단일·더블 구분.
  const rowClickTimer = useRef(null);
  const handleRowSingleClick = (row) => {
    if (!onRowSelect) { onRowClick?.(row); return; } // 폴백: 기존처럼 바로 열기
    if (rowClickTimer.current) return;
    rowClickTimer.current = setTimeout(() => { rowClickTimer.current = null; onRowSelect(row); }, 230);
  };
  const handleRowDoubleClick = (row) => {
    if (rowClickTimer.current) { clearTimeout(rowClickTimer.current); rowClickTimer.current = null; }
    onRowClick?.(row);
  };
  // subHeaders 컬럼이 차지하는 그리드 칸 수(inlineSub면 1)
  const subSpan = (c) => ((c.subHeaders && c.subHeaders.length > 0) ? (inlineSub ? 1 : c.subHeaders.length) : (c.colSpan || 1));
  // 절대너비 레이아웃 여부 (컬럼 고정 모드거나 fixedWidth 지정 시)
  const useFixedLayout = fixedColumns || fixedWidth;
  const [columns, setColumns] = useState(defaultColumns);
  // 헤더 subHeaders는 매 렌더 최신 props에서 조회(동적 헤더: 정렬 아이콘·단위 토글 등 상태 반영)
  const freshColByKey = React.useMemo(() => {
    const m = {};
    (allColumns || []).forEach((c) => { if (c && c.key) m[c.key] = c; });
    (defaultColumns || []).forEach((c) => { if (c && c.key) m[c.key] = c; });
    return m;
  }, [allColumns, defaultColumns]);
  const freshSub = (key, idx, fallback) => {
    const s = freshColByKey[key] && freshColByKey[key].subHeaders;
    return (s && s[idx] != null) ? s[idx] : fallback;
  };
  const [rowColors, setRowColors] = useState({});
  const [cellColors, setCellColors] = useState({});
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedHeader, setSelectedHeader] = useState(null);
  const [headerContextMenu, setHeaderContextMenu] = useState(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [rowContextMenuPosition, setRowContextMenuPosition] = useState({ x: 0, y: 0 });
  const [rowMenuRow, setRowMenuRow] = useState(null); // 우클릭 메뉴 대상 행(수정/복사등록용)
  // 수정/복사등록 메뉴 사용 시: 셀/행 어디서 우클릭해도 캡처 단계에서 가로채 행 메뉴 노출
  const handleRowMenuOpen = (e) => {
    if (!onRowEdit && !onRowCopy) return; // 기능 미사용 시 기존 색상 메뉴 유지
    const tr = e.target.closest && e.target.closest('tr[data-row-index]');
    if (!tr) return;
    const idx = Number(tr.dataset.rowIndex);
    const row = processedData[idx];
    if (!row) return;
    e.preventDefault();
    e.stopPropagation();
    setRowMenuRow(row);
    setSelectedRow(row.id ?? idx);
    setSelectedCell(null);
    setHeaderContextMenu(null);
    setRowContextMenuPosition({ x: e.clientX, y: e.clientY });
  };
  const closeRowMenu = () => { setSelectedRow(null); setRowMenuRow(null); };
  const [cellContextMenuPosition, setCellContextMenuPosition] = useState({ x: 0, y: 0 });
  const [sortConfig, setSortConfig] = useState(null);
  const [filters, setFilters] = useState({});
  const [disabledSort, setDisabledSort] = useState({});
  const [disabledFilter, setDisabledFilter] = useState({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 저장은 직렬화 가능한 필드(key/width)만 — JSX(label/subHeaders/filter)는 절대 저장 금지
  const serializeColumns = (cols) => (cols || []).map((c) => ({ key: c.key, width: c.width }));
  // 저장된 순서/폭을 코드 정의(JSX 포함) 컬럼에 재적용 — 직렬화된 JSX 객체를 렌더하지 않도록 항상 코드에서 재구성
  const rebuildColumns = (savedCols) => {
    const byKey = {};
    (allColumns || []).forEach((c) => { if (c && c.key) byKey[c.key] = c; });
    (defaultColumns || []).forEach((c) => { if (c && c.key && !byKey[c.key]) byKey[c.key] = c; });
    const result = [];
    (savedCols || []).forEach((sc) => {
      const code = sc && sc.key ? byKey[sc.key] : null;
      if (!code) return; // 코드에 없는(오래된) 키 → 드롭 (직렬화 JSX 렌더 방지)
      result.push(sc.width != null ? { ...code, width: sc.width } : code);
    });
    return result.length ? result : defaultColumns;
  };

  // 설정 로드
  useEffect(() => {
    // 고정 컬럼 모드: 로컬스토리지 무시, 항상 defaultColumns 사용
    if (fixedColumns) {
      setColumns(defaultColumns);
      return;
    }
    const savedConfig = TableConfigManager.load(menuId);
    if (savedConfig) {
      // 컬럼 구성 버전이 바뀌면 저장된 컬럼(순서/숨김)은 무시하고 새 기본값 사용 (색/정렬 등은 유지)
      const useSavedColumns = savedConfig.version === TABLE_CONFIG_VERSION && savedConfig.columns;
      setColumns(useSavedColumns ? rebuildColumns(savedConfig.columns) : defaultColumns);
      setRowColors(savedConfig.rowColors || {});
      setCellColors(savedConfig.cellColors || {});
      setSortConfig(savedConfig.sortConfig || null);
      setFilters(savedConfig.filters || {});
      setDisabledSort(savedConfig.disabledSort || {});
      setDisabledFilter(savedConfig.disabledFilter || {});
    }
  }, [menuId, fixedColumns]);

  // 고정 컬럼 모드: defaultColumns가 바뀌면(예: 보기모드 전환) 동기화
  useEffect(() => {
    if (fixedColumns) setColumns(defaultColumns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultColumns, fixedColumns]);

  // 외부(색 채우기 버튼) 요청으로 선택 행에 색 적용 + 저장 (껐다 켜도 유지)
  useEffect(() => {
    if (!colorFillRequest || !Array.isArray(colorFillRequest.ids) || colorFillRequest.ids.length === 0) return;
    setRowColors((prev) => {
      const next = { ...prev };
      colorFillRequest.ids.forEach((id) => {
        if (colorFillRequest.color) {
          next[id] = colorFillRequest.color;
        } else {
          delete next[id]; // color가 없으면 색 제거
        }
      });
      if (!fixedColumns) {
        TableConfigManager.save(menuId, {
          version: TABLE_CONFIG_VERSION,
          columns: serializeColumns(columns),
          rowColors: next,
          cellColors,
          sortConfig,
          filters,
          disabledSort,
          disabledFilter,
        });
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorFillRequest]);

  // 설정 저장
  const saveConfig = () => {
    if (fixedColumns) return; // 고정 컬럼 모드: 저장 안 함
    const config = {
      version: TABLE_CONFIG_VERSION,
      columns: serializeColumns(columns),
      rowColors,
      cellColors,
      sortConfig,
      filters,
      disabledSort,
      disabledFilter,
    };
    TableConfigManager.save(menuId, config);
  };

  // 테이블 DOM 참조 + 현재 드래그중인 컬럼 key
  const tableRef = useRef(null);
  const activeColRef = useRef(null);

  // 변경된 컬럼 배열을 즉시 로컬스토리지에 저장 (rowColors 등 나머지는 현재 값 사용)
  const persistColumns = (nextColumns) => {
    if (fixedColumns) return; // 고정 컬럼 모드: 저장 안 함
    TableConfigManager.save(menuId, {
      version: TABLE_CONFIG_VERSION,
      columns: serializeColumns(nextColumns),
      rowColors,
      cellColors,
      sortConfig,
      filters,
      disabledSort,
      disabledFilter,
    });
  };

  // 드래그중: 해당 컬럼의 (헤더2행 + 본문) 셀들을 헤더와 함께 가로로 이동시켜 "열 전체가 끌리는" UI
  const applyColumnDragTransform = (key, x) => {
    const table = tableRef.current;
    if (!table || !key) return;
    const sel = `[data-col="${(window.CSS && CSS.escape) ? CSS.escape(key) : key}"]`;
    table.querySelectorAll(sel).forEach((el) => {
      el.style.transform = `translateX(${x}px)`;
      el.style.position = 'relative';
      el.style.zIndex = '5';
      el.style.opacity = '0.9';
    });
  };
  const clearColumnDragStyles = () => {
    const table = tableRef.current;
    if (!table) return;
    table.querySelectorAll('[data-col]').forEach((el) => {
      el.style.transform = '';
      el.style.position = '';
      el.style.zIndex = '';
      el.style.opacity = '';
    });
  };

  const handleDragStart = (event) => {
    activeColRef.current = event.active?.id ?? null;
  };
  const handleDragMove = (event) => {
    if (!activeColRef.current) return;
    applyColumnDragTransform(activeColRef.current, event.delta?.x || 0);
  };
  const handleDragCancel = () => {
    clearColumnDragStyles();
    activeColRef.current = null;
  };

  // 컬럼 순서 변경 → 즉시 저장
  const handleDragEnd = (event) => {
    clearColumnDragStyles();
    activeColRef.current = null;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((item) => item.key === active.id);
        const newIndex = items.findIndex((item) => item.key === over.id);
        const next = arrayMove(items, oldIndex, newIndex);
        persistColumns(next); // 순서 변경 즉시 저장
        return next;
      });
    }
  };

  // 컬럼 색상 변경
  const handleColumnColorChange = (columnKey, type, color) => {
    setColumns((prev) => {
      const next = prev.map((col) =>
        col.key === columnKey
          ? { ...col, [type === 'header' ? 'headerColor' : 'cellColor']: color }
          : col
      );
      persistColumns(next);
      return next;
    });
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
        if (prev.direction === 'asc') {
          return { key: columnKey, direction: 'desc' };
        }
        return null;
      }
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
      {/* 헤더 */}
      {showHeader && (
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-black">
              데이터 목록 <span className="text-sm text-gray-500 font-normal">(총 {processedData.length}건)</span>
            </h3>
            {totalPages > 1 && (
              <p className="text-xs text-gray-400 mt-0.5">페이지 {currentPage}/{totalPages}</p>
            )}
            {Object.keys(filters).filter((k) => filters[k]).length > 0 && (
              <p className="text-xs text-indigo-600 mt-0.5">(필터 적용 중)</p>
            )}
          </div>
        </div>
      </div>
      )}

      {/* 테이블 */}
      <div className="flex-1 overflow-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <table ref={tableRef} className={`${useFixedLayout ? '' : 'w-full '}border-collapse`} style={useFixedLayout ? { tableLayout: 'fixed', width: fluidWidth ? '100%' : `${columns.reduce((s, c) => s + (Number(c.width) || 120), 0)}px` } : undefined}>
            {useFixedLayout && (
              <colgroup>
                {columns.flatMap((c) => {
                  const w = c.width;
                  // 셀이 차지하는 그리드 칸 수: subHeaders 개수 또는 colSpan (inlineSub면 1)
                  const span = subSpan(c);
                  if (span > 1) {
                    const each = w ? Math.round(w / span) : undefined;
                    return Array.from({ length: span }, (_, i) => (
                      <col
                        key={`${c.key}_${i}`}
                        style={each ? { width: `${i === span - 1 ? w - each * (span - 1) : each}px` } : undefined}
                      />
                    ));
                  }
                  return [<col key={c.key} style={w ? { width: `${w}px` } : undefined} />];
                })}
              </colgroup>
            )}
            <thead className="bg-gray-50 sticky top-0 z-10">
              {/* 첫 번째 헤더 행 */}
              <tr>
                <SortableContext items={columns.map((c) => c.key)} strategy={horizontalListSortingStrategy}>
                  {columns.map((column) => (
                    <SortableHeaderCell
                      key={column.key}
                      id={column.key}
                      column={column}
                      freshLabel={freshColByKey[column.key]?.label}
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      filterValue={filters[column.key]}
                      onFilterChange={handleFilterChange}
                      onContextMenu={handleHeaderContextMenu}
                      isSortDisabled={disabledSort[column.key]}
                      isFilterDisabled={disabledFilter[column.key]}
                      inlineSub={inlineSub}
                    />
                  ))}
                </SortableContext>
              </tr>
              {/* 두 번째 헤더 행 */}
              <tr>
                {columns.map((column) => {
                  // titleFilter: 상단=제목(row1) / 하단=필터칸(row2), 데이터는 rowspan 2 단일셀
                  if (column.titleFilter) {
                    return (
                      <th key={`${column.key}_f`} data-col={column.key} className="px-1 py-1 border" style={{ background: '#fff' }}>
                        {freshColByKey[column.key]?.filter ?? column.filter}
                      </th>
                    );
                  }
                  // inlineSub: subHeaders를 상단 한 셀에 합쳤으므로 두 번째 헤더 행은 스킵
                  if (inlineSub && column.subHeaders && column.subHeaders.length > 0) return null;
                  if (column.subHeaders && column.subHeaders.length > 0) {
                    // bottomSplit: 하단을 2칸(예: 동 | 호)으로 분리
                    if (column.bottomSplit) {
                      return [0, 1].map((i) => (
                        <th
                          key={`${column.key}_s${i}`}
                          data-col={column.key}
                          className="px-2 py-1 text-center text-[15px] font-normal text-black uppercase border leading-tight"
                        >
                          {freshSub(column.key, i, column.subHeaders[i])}
                        </th>
                      ));
                    }
                    // 기본: subHeaders의 두 번째 요소만 표시 (colspan=2)
                    return (
                      <th
                        key={`${column.key}_1`}
                        data-col={column.key}
                        className="px-2 py-1 text-center text-[15px] font-normal text-black uppercase border leading-tight"
                        colSpan={2}
                      >
                        {freshSub(column.key, 1, column.subHeaders[1])}
                      </th>
                    );
                  }
                  // subHeaders가 없으면 rowspan 2이므로 두 번째 행에서는 스킵 (null 반환)
                  return null;
                })}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200" onContextMenuCapture={handleRowMenuOpen}>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.reduce((sum, col) => sum + subSpan(col), 0)} className="px-4 py-12 text-center text-gray-500 border">
                    로딩 중...
                  </td>
                </tr>
              ) : processedData.length > 0 ? (
                processedData.map((row, index) => {
                  const rowId = row.id || index;
                  const rowBgColor = rowColors[rowId];

                  return (
                    <React.Fragment key={rowId}>
                      {/* 첫 번째 데이터 행 */}
                      <tr
                        data-row-index={index}
                        onClick={() => handleRowSingleClick(row)}
                        onDoubleClick={() => handleRowDoubleClick(row)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedRow(rowId);
                          setSelectedCell(null);
                          setHeaderContextMenu(null);
                          setRowContextMenuPosition({ x: e.clientX, y: e.clientY });
                        }}
                        className="hover:bg-gray-50 cursor-pointer"
                        style={{ backgroundColor: rowBgColor || 'transparent' }}
                      >
                        {columns.map((column) => {
                          const cellBgColor = getCellBackgroundColor(rowId, column.key);

                          // inlineSub: subHeaders 두 값을 한 셀(rowspan2)에 가로로 합쳐 1행으로
                          if (inlineSub && column.subHeaders && column.subHeaders.length > 0) {
                            return (
                              <td
                                key={column.key}
                                data-col={column.key}
                                className="px-0.5 py-3 text-sm text-black text-center border"
                                style={{ backgroundColor: cellBgColor || 'transparent' }}
                                rowSpan={2}
                                onClick={(e) => { if (column.noRowClick) e.stopPropagation(); }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedCell({ rowId, columnKey: column.key });
                                  setSelectedRow(null);
                                  setHeaderContextMenu(null);
                                  setCellContextMenuPosition({ x: e.clientX, y: e.clientY });
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                  <span>{renderCell(row, column, 0)}</span>
                                  <span style={{ color: '#cbd5e1' }}>·</span>
                                  <span>{renderCell(row, column, 1)}</span>
                                </div>
                              </td>
                            );
                          }
                          // subHeaders가 있는 경우 첫 번째 셀 (colspan=2)
                          if (column.subHeaders && column.subHeaders.length > 0) {
                            return (
                              <td
                                key={`${column.key}_0`}
                                data-col={column.key}
                                className="px-0.5 py-3 text-sm text-black text-center border"
                                style={{ backgroundColor: cellBgColor || 'transparent' }}
                                colSpan={2}
                                onClick={(e) => { if (column.noRowClick) e.stopPropagation(); }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedCell({ rowId, columnKey: `${column.key}_0` });
                                  setSelectedRow(null);
                                  setHeaderContextMenu(null);
                                  setCellContextMenuPosition({ x: e.clientX, y: e.clientY });
                                }}
                              >
                                {renderCell(row, column, 0)}
                              </td>
                            );
                          }

                          // rowspan 2 셀
                          return (
                            <td
                              key={column.key}
                              data-col={column.key}
                              className="px-0.5 py-3 text-sm text-black border"
                              style={{ backgroundColor: cellBgColor || 'transparent' }}
                              rowSpan={2}
                              colSpan={column.colSpan || undefined}
                              onClick={(e) => {
                                // checkbox/noRowClick 컬럼은 행 클릭 이벤트 전파 차단
                                if (column.key === 'checkbox' || column.noRowClick) {
                                  e.stopPropagation();
                                }
                              }}
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
                      {/* 두 번째 데이터 행 */}
                      <tr
                        data-row-index={index}
                        onClick={() => handleRowSingleClick(row)}
                        onDoubleClick={() => handleRowDoubleClick(row)}
                        className="hover:bg-gray-50 cursor-pointer"
                        style={{ backgroundColor: rowBgColor || 'transparent' }}
                      >
                        {columns.map((column) => {
                          const cellBgColor = getCellBackgroundColor(rowId, column.key);

                          // inlineSub: subHeaders를 상단 rowspan2 셀로 합쳤으므로 두 번째 행 스킵
                          if (inlineSub && column.subHeaders && column.subHeaders.length > 0) return null;
                          // subHeaders가 있는 경우에만 두 번째 셀 렌더링
                          if (column.subHeaders && column.subHeaders.length > 0) {
                            // bottomSplit: 하단을 2칸으로 분리 (subIndex 1, 2)
                            if (column.bottomSplit) {
                              return [1, 2].map((si) => (
                                <td
                                  key={`${column.key}_${si}`}
                                  data-col={column.key}
                                  className="px-0.5 py-3 text-sm text-black text-center border"
                                  style={{ backgroundColor: cellBgColor || 'transparent' }}
                                  onClick={(e) => { if (column.noRowClick) e.stopPropagation(); }}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedCell({ rowId, columnKey: `${column.key}_${si}` });
                                    setSelectedRow(null);
                                    setHeaderContextMenu(null);
                                    setCellContextMenuPosition({ x: e.clientX, y: e.clientY });
                                  }}
                                >
                                  {renderCell(row, column, si)}
                                </td>
                              ));
                            }
                            return (
                              <td
                                key={`${column.key}_1`}
                                data-col={column.key}
                                className="px-0.5 py-3 text-sm text-black text-center border"
                                style={{ backgroundColor: cellBgColor || 'transparent' }}
                                colSpan={2}
                                onClick={(e) => { if (column.noRowClick) e.stopPropagation(); }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedCell({ rowId, columnKey: `${column.key}_1` });
                                  setSelectedRow(null);
                                  setHeaderContextMenu(null);
                                  setCellContextMenuPosition({ x: e.clientX, y: e.clientY });
                                }}
                              >
                                {renderCell(row, column, 1)}
                              </td>
                            );
                          }
                          // rowspan 2 컬럼은 이미 첫 번째 행에서 렌더링됨
                          return null;
                        })}
                      </tr>
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={columns.reduce((sum, col) => sum + subSpan(col), 0)} className="px-4 py-12 text-center text-gray-500 border">
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
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg py-1 z-50 min-w-[180px]"
          style={{
            top: `${contextMenuPosition.y}px`,
            left: `${contextMenuPosition.x}px`,
          }}
        >
          <div className="px-3 py-2 text-sm font-medium text-gray-700 border-b border-gray-200">
            {columns.find((c) => c.key === headerContextMenu)?.label} 설정
          </div>

          {/* 정렬/필터 토글 */}
          <div className="border-b border-gray-200 py-1">
            <button
              onClick={() => toggleSortEnabled(headerContextMenu)}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center justify-between"
            >
              <span>정렬 기능</span>
              <span className={`px-2 py-0.5 text-xs rounded ${disabledSort[headerContextMenu] ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                {disabledSort[headerContextMenu] ? 'OFF' : 'ON'}
              </span>
            </button>
          </div>

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

          {/* 칼럼 숨김 */}
          <div className="border-t border-gray-200 py-1">
            <button
              onClick={() => {
                const newColumns = columns.filter(c => c.key !== headerContextMenu);
                setColumns(newColumns);
                persistColumns(newColumns);
                setHeaderContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm text-red-600"
            >
              칼럼 숨김
            </button>
          </div>

          <button
            onClick={() => setHeaderContextMenu(null)}
            className="w-full mt-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 border-t border-gray-200"
          >
            닫기
          </button>
        </div>
      )}

      {/* 행 우클릭 컨텍스트 메뉴 (수정/복사등록) */}
      {selectedRow !== null && rowMenuRow && (onRowEdit || onRowCopy) && (
        <div
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50 min-w-[150px]"
          style={{
            top: `${rowContextMenuPosition.y}px`,
            left: `${rowContextMenuPosition.x}px`,
          }}
        >
          <div className="space-y-1">
            {onRowEdit && (
              <button type="button" onClick={() => { const r = rowMenuRow; closeRowMenu(); onRowEdit(r); }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-indigo-50" style={{ fontSize: '14px', fontWeight: 700, color: '#4f46e5' }}>수정</button>
            )}
            {onRowCopy && (
              <button type="button" onClick={() => { const r = rowMenuRow; closeRowMenu(); onRowCopy(r); }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-teal-50" style={{ fontSize: '14px', fontWeight: 700, color: '#0f766e' }}>복사등록</button>
            )}
          </div>
          <button
            onClick={closeRowMenu}
            className="w-full mt-1 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded border-t border-gray-200"
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

      {/* 오버레이 */}
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

export default CustomerTable;
