import React, { useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';


const DataGrid = ({
  columnDefs,
  rowData,
  onSelectionChanged,
  onRowDoubleClicked,
  loading = false,
  pagination = true,
  paginationPageSize = 50,
  defaultColDef,
  enableRangeSelection = true,
  enableMultiRowSelection = true,
  suppressRowClickSelection = false,
  rowMultiSelectWithClick = false,
  className = '',
  height = '500px',
}) => {
  const gridRef = useRef(null);
  const gridApiRef = useRef(null);
  const columnApiRef = useRef(null);

  const defaultColumnDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    minWidth: 100,
    ...defaultColDef,
  }), [defaultColDef]);

  const onGridReady = useCallback((event) => {
    gridApiRef.current = event.api;
    columnApiRef.current = event.columnApi;
  }, []);

  const handleSelectionChanged = useCallback((event) => {
    if (onSelectionChanged) {
      const selectedRows = event.api.getSelectedRows();
      onSelectionChanged(selectedRows);
    }
  }, [onSelectionChanged]);

  const handleRowDoubleClicked = useCallback((event) => {
    if (onRowDoubleClicked) {
      onRowDoubleClicked(event.data);
    }
  }, [onRowDoubleClicked]);

  const gridOptions = useMemo(() => ({
    columnDefs,
    rowData,
    defaultColDef: defaultColumnDef,
    pagination,
    paginationPageSize,
    rowSelection: enableMultiRowSelection ? 'multiple' : 'single',
    enableRangeSelection,
    suppressRowClickSelection,
    rowMultiSelectWithClick,
    animateRows: true,
    loadingOverlayComponent: 'agLoadingOverlay',
    noRowsOverlayComponent: 'agNoRowsOverlay',
    suppressMenuHide: true,
    enableBrowserTooltips: true,
  }), [
    columnDefs,
    rowData,
    defaultColumnDef,
    pagination,
    paginationPageSize,
    enableMultiRowSelection,
    enableRangeSelection,
    suppressRowClickSelection,
    rowMultiSelectWithClick,
  ]);

  // 그리드 API 메소드들을 외부에서 사용할 수 있도록 노출
  const exportApi = useMemo(() => ({
    exportToCsv: () => gridApiRef.current?.exportDataAsCsv(),
    exportToExcel: () => gridApiRef.current?.exportDataAsExcel(),
    getSelectedRows: () => gridApiRef.current?.getSelectedRows() || [],
    selectAll: () => gridApiRef.current?.selectAll(),
    deselectAll: () => gridApiRef.current?.deselectAll(),
    setRowData: (data) => gridApiRef.current?.setRowData(data),
    refreshCells: () => gridApiRef.current?.refreshCells(),
    sizeColumnsToFit: () => gridApiRef.current?.sizeColumnsToFit(),
  }), []);

  React.useImperativeHandle(gridRef, () => exportApi, [exportApi]);

  return (
    <div className={`ag-theme-alpine ${className}`} style={{ height }}>
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}
      <AgGridReact
        ref={gridRef}
        {...gridOptions}
        onGridReady={onGridReady}
        onSelectionChanged={handleSelectionChanged}
        onRowDoubleClicked={handleRowDoubleClicked}
      />
    </div>
  );
};

export default DataGrid;