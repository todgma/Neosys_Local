import React, { useState } from 'react';
import { Save, X, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 2행(subHeaders) 컬럼은 "상위/하위" 형태로 전체 표기 (예: 주택임대사업자/계약갱신청구권)
const columnDisplayLabel = (col) =>
  (col.subHeaders && col.subHeaders.length > 0) ? col.subHeaders.join('/') : col.label;

// 드래그 가능한 컬럼 아이템
const SortableColumnItem = ({ id, column, isVisible, onToggle, onHeaderColorChange, onCellColorChange }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const colors = [
    { name: '없음', value: null },
    { name: '파랑', value: '#dbeafe' },
    { name: '초록', value: '#d1fae5' },
    { name: '노랑', value: '#fef3c7' },
    { name: '빨강', value: '#fee2e2' },
    { name: '보라', value: '#ede9fe' },
    { name: '회색', value: '#f3f4f6' },
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
    >
      {/* 드래그 핸들 */}
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5 text-gray-400" />
      </div>

      {/* 체크박스 */}
      <input
        type="checkbox"
        checked={isVisible}
        onChange={(e) => onToggle(column.key, e.target.checked)}
        className="rounded border-gray-300"
      />

      {/* 컬럼명 (2행 컬럼은 상위/하위 전체 표기) */}
      <span className={`flex-1 text-sm ${isVisible ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
        {columnDisplayLabel(column)}
      </span>

      {/* 헤더 색상 선택 */}
      <div className="flex items-center space-x-1">
        <span className="text-xs text-gray-500">헤더:</span>
        <select
          value={column.headerColor || ''}
          onChange={(e) => onHeaderColorChange(column.key, e.target.value || null)}
          className="text-xs border border-gray-300 rounded px-1 py-0.5"
          style={{ backgroundColor: column.headerColor || 'white' }}
        >
          {colors.map((color) => (
            <option key={color.name} value={color.value || ''}>
              {color.name}
            </option>
          ))}
        </select>
      </div>

      {/* 셀 색상 선택 */}
      <div className="flex items-center space-x-1">
        <span className="text-xs text-gray-500">셀:</span>
        <select
          value={column.cellColor || ''}
          onChange={(e) => onCellColorChange(column.key, e.target.value || null)}
          className="text-xs border border-gray-300 rounded px-1 py-0.5"
          style={{ backgroundColor: column.cellColor || 'white' }}
        >
          {colors.map((color) => (
            <option key={color.name} value={color.value || ''}>
              {color.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

const TableSettings = ({ isOpen, onClose, menuId, allColumns, columns, setColumns, onSave }) => {
  const [localColumns, setLocalColumns] = useState(columns);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 컬럼 토글
  const handleToggleColumn = (columnKey, isVisible) => {
    if (isVisible) {
      // 컬럼 추가
      const columnToAdd = allColumns.find((col) => col.key === columnKey);
      if (columnToAdd) {
        setLocalColumns([...localColumns, columnToAdd]);
        setHasChanges(true);
      }
    } else {
      // 컬럼 제거
      setLocalColumns(localColumns.filter((col) => col.key !== columnKey));
      setHasChanges(true);
    }
  };

  // 헤더 색상 변경
  const handleHeaderColorChange = (columnKey, color) => {
    setLocalColumns((prev) =>
      prev.map((col) =>
        col.key === columnKey ? { ...col, headerColor: color } : col
      )
    );
    setHasChanges(true);
  };

  // 셀 색상 변경
  const handleCellColorChange = (columnKey, color) => {
    setLocalColumns((prev) =>
      prev.map((col) =>
        col.key === columnKey ? { ...col, cellColor: color } : col
      )
    );
    setHasChanges(true);
  };

  // 드래그 끝
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setLocalColumns((items) => {
        const oldIndex = items.findIndex((item) => item.key === active.id);
        const newIndex = items.findIndex((item) => item.key === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasChanges(true);
    }
  };

  // 저장
  const handleSave = () => {
    setColumns(localColumns);
    onSave?.();
    setHasChanges(false);
    alert('테이블 설정이 저장되었습니다.');
    onClose();
  };

  // 설정 초기화 (저장된 컬럼/색상 등 모두 삭제 후 기본값으로)
  const handleResetSettings = () => {
    if (window.confirm('테이블 설정(컬럼 구성/순서/색상 등)을 모두 초기화하시겠습니까?')) {
      try {
        localStorage.removeItem(`table_config_${menuId}`);
      } catch (e) {
        console.error('테이블 설정 초기화 실패:', e);
      }
      window.location.reload();
    }
  };

  // 취소
  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm('변경사항이 저장되지 않았습니다. 정말 닫으시겠습니까?')) {
        setLocalColumns(columns);
        setHasChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleCancel}
      />

      {/* 모달 */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">헤드라인 설정</h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 내용 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 컬럼 선택 (간단한 그리드 뷰) */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-3">표시할 컬럼 선택</h3>
              <div className="grid grid-cols-4 gap-2">
                {allColumns.map((col) => {
                  const isVisible = localColumns.some((c) => c.key === col.key);
                  return (
                    <label
                      key={col.key}
                      className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-white p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={(e) => handleToggleColumn(col.key, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className={isVisible ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                        {columnDisplayLabel(col)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 안내 문구 */}
            <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-md p-4 space-y-1">
              <p>• 체크박스를 선택/해제하면 해당 컬럼이 표시/숨김 처리됩니다.</p>
              <p>• 컬럼 순서는 목록 헤더를 드래그하면 즉시 변경·저장됩니다.</p>
              <p>• '저장' 버튼을 클릭하면 설정이 브라우저에 저장됩니다.</p>
            </div>
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleResetSettings}
              className="px-4 py-2 text-sm text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50"
            >
              설정 초기화
            </button>
            <div className="flex items-center space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="flex items-center px-4 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              <Save className="w-4 h-4 mr-1" />
              저장
            </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TableSettings;
