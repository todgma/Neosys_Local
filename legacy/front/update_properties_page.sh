#!/bin/bash

FILE="c:/gitlab/realestate_maemuljang/front/src/pages/properties/PropertiesPage.jsx"

# 1. LayoutView import 추가
sed -i '/import PropertyBriefingModal/a import LayoutView from '\''../../components/properties/LayoutView'\'';' "$FILE"

# 2. 배치도로 보기 버튼 onClick 수정
sed -i "s/onClick={() => toast.info('배치도 보기 기능은 준비 중입니다.')}/onClick={() => setViewMode('layout')}/g" "$FILE"

# 3. CustomerTable을 조건부 렌더링으로 변경
sed -i '/<CustomerTable/,/\/>/c\
              {viewMode === '\''sheet'\'' ? (\
                <CustomerTable\
                  menuId="properties"\
                  allColumns={allTableColumns}\
                  defaultColumns={defaultTableColumns}\
                  data={tableData}\
                  isLoading={loading}\
                  renderCell={renderTableCell}\
                  onRowClick={handleRowClick}\
                  currentPage={pagination.page}\
                  totalPages={Math.ceil(pagination.total / pagination.pageSize)}\
                  pageSize={pagination.pageSize}\
                  onPageChange={handlePageChange}\
                  emptyMessage="검색 결과가 없습니다"\
                />\
              ) : (\
                <LayoutView\
                  selectedDanji={summaries.find(s => s.selected)}\
                  onClose={() => setViewMode('\''sheet'\'')}\
                />\
              )}' "$FILE"

echo "PropertiesPage.jsx updated successfully"
