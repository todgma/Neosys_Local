import React from 'react';
import CustomerTable from '../ui/CustomerTable';

/**
 * 계약목록 전용 테이블 — 물건/고객 목록(PropertyListTable)과 동일한 공통 테이블(CustomerTable) +
 * 헤더/보더 스타일(.prop-list-grid)을 그대로 재사용. 계약관리엔 자체 상단 툴바가 있어 여기선 그리드만 렌더.
 *  · 1회 클릭=선택(onRowSelect) / 2회 클릭=열기(onRowClick) — CustomerTable 내장
 *  · 데이터/헤더 폰트 14px, 헤더 상단 2px·하단 1px 검정 보더(고객관리와 동일)
 */
const ContractListTable = ({
  menuId = 'contracts',
  allColumns,
  defaultColumns,
  data,
  isLoading,
  renderCell,
  onRowClick,
  onRowSelect,
  onRowEdit,
  onRowCopy,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  emptyMessage = '검색 결과가 없습니다',
  colorFillRequest = null,
  fixedColumns = true,
  fixedWidth = true,
  fluidWidth = false,
  inlineSub = true,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }} className="prop-list-grid contract-list-grid">
      <style>{`
        .contract-list-grid td, .contract-list-grid th { white-space: nowrap !important; }
        .contract-list-grid td { text-align: center; }
        /* 데이터 셀 — 14px */
        .contract-list-grid td { font-size: 14px !important; font-weight: 500 !important; color: #000 !important; padding-top: 6px !important; padding-bottom: 6px !important; line-height: 1.25 !important; }
        .contract-list-grid td div, .contract-list-grid td span { font-size: 14px !important; font-weight: 500 !important; color: #000 !important; }
        /* 헤더 — 14px, 흰 배경, 총 높이 50px(고객/물건관리 동일). CustomerTable은 헤더가 2행(빈 2행 포함)이라 각 25px */
        .contract-list-grid thead th { padding-top: 3px !important; padding-bottom: 3px !important; line-height: 1.2 !important; background: #fff !important; }
        .contract-list-grid thead tr:only-child th { height: 50px !important; max-height: 50px !important; }
        .contract-list-grid thead tr:not(:only-child) { height: 25px !important; }
        .contract-list-grid thead tr:not(:only-child) th { height: 25px !important; max-height: 25px !important; }
        .contract-list-grid thead th, .contract-list-grid thead th * { font-size: 14px !important; font-weight: 600 !important; color: #000 !important; }
        /* 헤더 하단 경계선(검정) + 상단(검정 2px) — 고객/물건관리와 동일 */
        .contract-list-grid thead tr:last-child th { border-bottom: 1px solid #000 !important; }
        .contract-list-grid thead th[rowspan="2"] { border-bottom: 1px solid #000 !important; }
        .contract-list-grid thead tr:first-child th { border-top: 2px solid #000 !important; }
        /* 레코드 구분선 */
        .contract-list-grid tbody tr td { border-bottom: 1px solid #94a3b8 !important; }
      `}</style>
      <CustomerTable
        menuId={menuId}
        allColumns={allColumns}
        defaultColumns={defaultColumns}
        data={data}
        isLoading={isLoading}
        renderCell={renderCell}
        onRowClick={onRowClick}
        onRowSelect={onRowSelect}
        onRowEdit={onRowEdit}
        onRowCopy={onRowCopy}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={onPageChange}
        emptyMessage={emptyMessage}
        showHeader={false}
        colorFillRequest={colorFillRequest}
        fixedColumns={fixedColumns}
        fixedWidth={fixedWidth}
        fluidWidth={fluidWidth}
        inlineSub={inlineSub}
      />
    </div>
  );
};

export default ContractListTable;
