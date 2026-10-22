import React, { useState, useMemo } from 'react';
import { Plus, Upload, Trash2, Pencil, Palette, FileText } from 'lucide-react';
import CustomerTable from '../ui/CustomerTable';

/**
 * 물건(Property) 메뉴 전용 목록 테이블 컴포넌트.
 * 공통 테이블(CustomerTable)을 감싸고, 우상단에 물건 메뉴 전용 액션 버튼
 * (엑셀 업로드 / 신규 등록 / 신규 등록2 / 선택 삭제)을 포함한다.
 */
const PropertyListTable = ({
  // CustomerTable 전달 props
  menuId = 'properties',
  allColumns,
  defaultColumns,
  data,
  isLoading,
  renderCell,
  onRowClick,
  onRowSelect,
  onRowEdit,   // 우클릭 '수정'
  onRowCopy,   // 우클릭 '복사등록'
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  emptyMessage = '검색 결과가 없습니다',
  // 물건 메뉴 전용 액션
  onExcelUpload,
  onAddProperty,
  onAddPropertyV2,
  onEditSelected,
  onDeleteSelected,
  hideDelete = false, // true면 툴바 선택삭제 버튼 숨김
  onCreateReport,
  selectedCount = 0,
  leftContent = null, // 툴바 좌측에 렌더할 내용 (예: 거래유형 탭)
  leftAfterCount = null, // 건수(N건) 우측에 렌더할 내용 (예: 보고서 작성 버튼)
  rightLeadContent = null, // 우측 액션 그룹 선두(색 채우기 버튼 좌측)에 렌더할 내용 (예: 줄수 드롭다운)
  searchSlot = null, // 우측 액션줄 '좌측 끝'에 렌더할 내용(예: 검색창). 있으면 그 줄이 전체폭 space-between
  onColorFill, // (color|null) => void : 선택 행에 색 적용
  colorFillRequest = null, // CustomerTable로 전달할 색 채우기 요청
  fixedColumns = false, // 컬럼 고정(로컬스토리지 미사용)
  fixedWidth = false, // true면 컬럼 절대너비(px) 고정 — 반응형 X (컬럼 저장/순서는 유지)
  fluidWidth = false, // true면 컨테이너 폭에 맞춰 컬럼 비례 축소(우측 잘림 방지)
  inlineSub = false, // true면 subHeaders(2행)를 한 셀 가로로 합쳐 행 높이 축소
  stackToolbar = false, // true면 좌측그룹 전체폭 → 우측 액션그룹을 아랫줄로 내림(2줄), false면 한줄
}) => {
  const [showPalette, setShowPalette] = useState(false);
  const fillColors = ['#fee2e2', '#fef9c3', '#dcfce7', '#dbeafe', '#f3e8ff', '#fed7aa'];
  // 그리드 내 검색 (동/층)
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState({ field: null, text: '' });

  const applySearch = (field) => {
    setAppliedSearch({ field, text: searchText.trim() });
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applySearch(appliedSearch.field || 'dong');
    }
  };

  // 동/층 기준 클라이언트 필터링
  const filteredData = useMemo(() => {
    const { field, text } = appliedSearch;
    if (!field || !text) return data || [];
    return (data || []).filter((row) => {
      const v = field === 'dong' ? row.dong : row.floor;
      return v != null && String(v).includes(text);
    });
  }, [data, appliedSearch]);

  const inputBtnStyle = (active) => ({
    padding: '5px 12px',
    fontSize: '13px',
    fontWeight: active ? '600' : '500',
    border: '1px solid #4f46e5',
    borderRadius: '4px',
    backgroundColor: active ? '#4f46e5' : 'white',
    color: active ? 'white' : '#4f46e5',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
      {/* 툴바: 좌측(검색/거래유형/건수) + 우측 액션 버튼들 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', padding: '4px 8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: stackToolbar ? '1 1 100%' : '0 1 auto', minWidth: 0 }}>
          {leftContent}

          {/* 건수 표시 */}
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>
            {filteredData.length}건
          </span>

          {/* 건수 우측 슬롯 (예: 보고서 작성) */}
          {leftAfterCount}
        </div>
        <div style={{ display: 'flex', justifyContent: searchSlot ? 'space-between' : 'flex-end', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: 'auto', flexWrap: 'wrap', flex: searchSlot ? '1 1 100%' : undefined }}>
        {/* 검색 등: 액션줄 좌측 끝 */}
        {searchSlot && <div style={{ display: 'flex', alignItems: 'center' }}>{searchSlot}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* 우측 액션 그룹 선두(색 채우기 좌측)에 렌더 - 예: 줄수 드롭다운 */}
        {rightLeadContent}

        {/* 색 채우기 (체크된 행에 색상 적용 - 껐다 켜도 유지) */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowPalette((v) => !v)}
            style={{
              padding: '6px 14px', fontSize: '14px', fontWeight: '500',
              border: '1px solid #6366f1', borderRadius: '6px', backgroundColor: 'white',
              color: '#4f46e5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}
          >
            <Palette className="w-4 h-4" />
            색 채우기{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </button>
          {showPalette && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', zIndex: 50, background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', padding: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
              {fillColors.map((c) => (
                <button
                  key={c}
                  onClick={() => { onColorFill?.(c); setShowPalette(false); }}
                  title="색 적용"
                  style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: c, cursor: 'pointer' }}
                />
              ))}
              <button
                onClick={() => { onColorFill?.(null); setShowPalette(false); }}
                title="색 지우기"
                style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', fontSize: '13px', color: '#dc2626', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onAddPropertyV2}
          style={{
            padding: '6px 14px', fontSize: '14px', fontWeight: '500',
            border: '1px solid #4f46e5', borderRadius: '6px', backgroundColor: '#4f46e5',
            color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
            transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}
        >
          <Plus className="w-4 h-4" />
          신규 등록
        </button>

        <button
          onClick={onEditSelected}
          style={{
            padding: '6px 14px', fontSize: '14px', fontWeight: '500',
            border: '1px solid #f59e0b', borderRadius: '6px', backgroundColor: '#f59e0b',
            color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
            transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}
        >
          <Pencil className="w-4 h-4" />
          수정
        </button>

        {!hideDelete && (
        <button
          onClick={onDeleteSelected}
          style={{
            padding: '6px 14px', fontSize: '14px', fontWeight: '500',
            border: '1px solid #dc2626', borderRadius: '6px', backgroundColor: '#dc2626',
            color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
            transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}
        >
          <Trash2 className="w-4 h-4" />
          삭제{selectedCount > 0 ? ` (${selectedCount})` : ''}
        </button>
        )}
        </div>
        </div>
      </div>

      {/* 공통 테이블 */}
      <div style={{ flex: 1, minHeight: 0 }} className="prop-list-grid">
        <style>{`
          /* 셀 줄바꿈 금지 → 폭이 모자라면 가로 스크롤 */
          .prop-list-grid td, .prop-list-grid th { white-space: nowrap !important; }
          /* 데이터 셀 가운데 정렬 (text-align 상속 → 개별 inline 지정 없는 셀에 적용) */
          .prop-list-grid td { text-align: center; }
          /* 데이터 셀 글자 · 행 높이 — 전 메뉴 공통 세로 여백 6px(통일) · weight 미설정(normal) · 검정 */
          .prop-list-grid td {
            font-size: 11px !important;
            font-weight: 500 !important;
            color: #000 !important;
            padding-top: 6px !important;
            padding-bottom: 6px !important;
            line-height: 1.25 !important;
          }
          .prop-list-grid td div, .prop-list-grid td span { font-size: 11px !important; font-weight: 500 !important; color: #000 !important; }
          /* 헤더: 높이 축소 + weight 미설정(normal) + 검정 + 배경 흰색 (자식 요소까지 강제) */
          .prop-list-grid thead th { padding-top: 3px !important; padding-bottom: 3px !important; line-height: 1.2 !important; background: #fff !important; }
          .prop-list-grid thead th, .prop-list-grid thead th * { font-size:14px;font-weight: 500 !important; color: #000 !important; }
          /* 헤더-데이터 경계선(하단) 검정 */
          .prop-list-grid thead tr:last-child th { border-bottom: 1px solid #000 !important; }
          .prop-list-grid thead th[rowspan="2"] { border-bottom: 1px solid #000 !important; }
          /* 테이블 최상단(헤더 상단) 굵은 테두리 검정 */
          .prop-list-grid thead tr:first-child th { border-top: 2px solid #000 !important; }
          /* 레코드(2행)마다 하단에 얇은 두줄 구분선 → 행 구분 */
          .prop-list-grid tbody tr:nth-of-type(2n) td { border-bottom: 1px solid #94a3b8 !important; }
          .prop-list-grid td[rowspan="2"] { border-bottom: 1px solid #94a3b8 !important; }
        `}</style>
        <CustomerTable
          menuId={menuId}
          allColumns={allColumns}
          defaultColumns={defaultColumns}
          data={filteredData}
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
    </div>
  );
};

export default PropertyListTable;
