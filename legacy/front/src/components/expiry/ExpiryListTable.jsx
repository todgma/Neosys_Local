import React, { useState } from 'react';
import { Palette, MessageSquare, CalendarPlus } from 'lucide-react';
import CustomerTable from '../ui/CustomerTable';

/**
 * 만기관리 전용 목록 테이블 (PropertyListTable 복사본).
 *  · 공통 테이블(CustomerTable)을 감싸고, 우상단에 만기관리 전용 액션(문자보내기 / 일정등록 / 색채우기)을 둔다.
 *  · 신규등록/수정/삭제 액션은 만기관리에 불필요하여 제외.
 */
const ExpiryListTable = ({
  menuId = 'expiry',
  allColumns,
  defaultColumns,
  data,
  isLoading,
  renderCell,
  onRowClick,
  onRowSelect,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  emptyMessage = '검색 결과가 없습니다',
  selectedCount = 0,
  onSendSms,       // 문자보내기(선택 대상)
  onAddSchedule,   // 일정등록(선택 대상)
  onColorFill,
  colorFillRequest = null,
  leftContent = null,
  leftAfterCount = null,
  rightLeadContent = null,
  searchSlot = null,
  fixedColumns = false,
  fixedWidth = false,
  fluidWidth = false,
  inlineSub = false,
  stackToolbar = false,
}) => {
  const [showPalette, setShowPalette] = useState(false);
  const fillColors = ['#fee2e2', '#fef9c3', '#dcfce7', '#dbeafe', '#f3e8ff', '#fed7aa'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
      {/* 툴바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', padding: '4px 8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: stackToolbar ? '1 1 100%' : '0 1 auto', minWidth: 0 }}>
          {leftContent}
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>
            {(data || []).length}건
          </span>
          {leftAfterCount}
        </div>
        <div style={{ display: 'flex', justifyContent: searchSlot ? 'space-between' : 'flex-end', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: 'auto', flexWrap: 'wrap', flex: searchSlot ? '1 1 100%' : undefined }}>
          {searchSlot && <div style={{ display: 'flex', alignItems: 'center' }}>{searchSlot}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {rightLeadContent}

            {/* 색 채우기 */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowPalette((v) => !v)}
                style={{ padding: '6px 14px', fontSize: '14px', fontWeight: '500', border: '1px solid #6366f1', borderRadius: '6px', backgroundColor: 'white', color: '#4f46e5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Palette className="w-4 h-4" />
                색 채우기{selectedCount > 0 ? ` (${selectedCount})` : ''}
              </button>
              {showPalette && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', zIndex: 50, background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', padding: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {fillColors.map((c) => (
                    <button key={c} onClick={() => { onColorFill?.(c); setShowPalette(false); }} title="색 적용"
                      style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: c, cursor: 'pointer' }} />
                  ))}
                  <button onClick={() => { onColorFill?.(null); setShowPalette(false); }} title="색 지우기"
                    style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', fontSize: '13px', color: '#dc2626', lineHeight: 1 }}>✕</button>
                </div>
              )}
            </div>

            {/* 일정등록 */}
            <button onClick={onAddSchedule}
              style={{ padding: '6px 14px', fontSize: '14px', fontWeight: '500', border: '1px solid #7c3aed', borderRadius: '6px', backgroundColor: '#7c3aed', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CalendarPlus className="w-4 h-4" />
              일정등록{selectedCount > 0 ? ` (${selectedCount})` : ''}
            </button>

            {/* 문자보내기 */}
            <button onClick={onSendSms}
              style={{ padding: '6px 14px', fontSize: '14px', fontWeight: '500', border: '1px solid #2563eb', borderRadius: '6px', backgroundColor: '#2563eb', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MessageSquare className="w-4 h-4" />
              문자보내기{selectedCount > 0 ? ` (${selectedCount})` : ''}
            </button>
          </div>
        </div>
      </div>

      {/* 공통 테이블 */}
      <div style={{ flex: 1, minHeight: 0 }} className="prop-list-grid">
        <style>{`
          .prop-list-grid td, .prop-list-grid th { white-space: nowrap !important; }
          .prop-list-grid td { text-align: center; }
          .prop-list-grid td {
            font-size: 11px !important; font-weight: 500 !important; color: #000 !important;
            padding-top: 6px !important; padding-bottom: 6px !important; line-height: 1.25 !important;
          }
          .prop-list-grid td div, .prop-list-grid td span { font-size: 11px !important; font-weight: 500 !important; color: #000 !important; }
          .prop-list-grid thead th { padding-top: 3px !important; padding-bottom: 3px !important; line-height: 1.2 !important; background: #fff !important; }
          .prop-list-grid thead th, .prop-list-grid thead th * { font-size:14px;font-weight: 500 !important; color: #000 !important; }
          .prop-list-grid thead tr:last-child th { border-bottom: 1px solid #000 !important; }
          .prop-list-grid thead th[rowspan="2"] { border-bottom: 1px solid #000 !important; }
          .prop-list-grid thead tr:first-child th { border-top: 2px solid #000 !important; }
          .prop-list-grid tbody tr:nth-of-type(2n) td { border-bottom: 1px solid #94a3b8 !important; }
          .prop-list-grid td[rowspan="2"] { border-bottom: 1px solid #94a3b8 !important; }
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
    </div>
  );
};

export default ExpiryListTable;
