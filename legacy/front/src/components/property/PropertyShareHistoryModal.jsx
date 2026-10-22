import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

/**
 * 부동산공유이력 크게보기 모달
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 콜백
 * @param {Array} props.shareHistory - 공유이력 배열
 * @param {Function} props.onShareHistoryChange - 공유이력 변경 콜백
 * @param {number} props.ptNo - 물건번호
 */
const PropertyShareHistoryModal = ({
  isOpen,
  onClose,
  shareHistory = [],
  onShareHistoryChange,
  ptNo
}) => {
  const [localHistory, setLocalHistory] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isAllChecked, setIsAllChecked] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalHistory(shareHistory);
      setSelectedIds(new Set());
      setIsAllChecked(false);
    }
  }, [isOpen, shareHistory]);

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (isAllChecked) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(localHistory.map((_, idx) => idx));
      setSelectedIds(allIds);
    }
    setIsAllChecked(!isAllChecked);
  };

  // 개별 체크박스
  const handleCheckbox = (index) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIds(newSelected);
    setIsAllChecked(newSelected.size === localHistory.length && localHistory.length > 0);
  };

  // 추가
  const handleAdd = () => {
    const newItem = {
      shareIdx: null,
      officeName: '',   // 상호
      regionName: '',   // 지역명
      officePhone: '',  // 전화번호
      memo: '',         // 내용
    };
    setLocalHistory([...localHistory, newItem]);
  };

  // 필드 변경
  const handleFieldChange = (index, field, value) => {
    const newHistory = [...localHistory];
    newHistory[index][field] = value;
    setLocalHistory(newHistory);
  };

  // 다중 삭제
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) {
      toast.error('삭제할 항목을 선택해주세요.');
      return;
    }

    if (!window.confirm(`선택한 ${selectedIds.size}개 항목을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      // TODO: API 호출이 필요한 경우 여기서 처리
      const newHistory = localHistory.filter((_, i) => !selectedIds.has(i));
      setLocalHistory(newHistory);
      setSelectedIds(new Set());
      setIsAllChecked(false);

      toast.success(`${selectedIds.size}개 항목이 삭제되었습니다.`);
    } catch (error) {
      console.error('삭제 실패:', error);
      toast.error('삭제에 실패했습니다.');
    }
  };

  // 저장
  const handleSave = () => {
    try {
      // 빈 행 제거
      const validHistory = localHistory.filter(h => h.officeName || h.officePhone);

      // 부모 컴포넌트로 전달
      onShareHistoryChange(validHistory);
      toast.success('저장되었습니다.');
      onClose();
    } catch (error) {
      console.error('저장 실패:', error);
      toast.error('저장에 실패했습니다.');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'white',
        width: '90%',
        maxWidth: '900px',
        height: '80vh',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>부동산공유이력</h2>
          <button
            onClick={onClose}
            style={{
              padding: '4px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          gap: '8px'
        }}>
          <button
            type="button"
            onClick={handleAdd}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              border: '1px solid #0284c7',
              background: '#0284c7',
              color: 'white',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Plus size={14} />
            추가
          </button>
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              border: '1px solid #ef4444',
              background: selectedIds.size === 0 ? '#f3f4f6' : '#ef4444',
              color: selectedIds.size === 0 ? '#9ca3af' : 'white',
              cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Trash2 size={14} />
            선택 삭제 ({selectedIds.size})
          </button>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '10px', border: '1px solid #cbd5e1', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={isAllChecked}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '10px', border: '1px solid #cbd5e1', width: '180px' }}>상호</th>
                <th style={{ padding: '10px', border: '1px solid #cbd5e1', width: '160px' }}>지역명</th>
                <th style={{ padding: '10px', border: '1px solid #cbd5e1', width: '160px' }}>전화번호</th>
                <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>내용</th>
              </tr>
            </thead>
            <tbody>
              {localHistory.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      border: '1px solid #cbd5e1'
                    }}
                  >
                    부동산공유이력 정보 없음
                  </td>
                </tr>
              ) : (
                localHistory.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(index)}
                        onChange={() => handleCheckbox(index)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>
                      <input
                        type="text"
                        value={item.officeName || ''}
                        onChange={(e) => handleFieldChange(index, 'officeName', e.target.value)}
                        placeholder="상호"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          fontSize: '13px',
                          border: '1px solid #d1d5db',
                          borderRadius: '3px'
                        }}
                      />
                    </td>
                    <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>
                      <input
                        type="text"
                        value={item.regionName || ''}
                        onChange={(e) => handleFieldChange(index, 'regionName', e.target.value)}
                        placeholder="지역명"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          fontSize: '13px',
                          border: '1px solid #d1d5db',
                          borderRadius: '3px'
                        }}
                      />
                    </td>
                    <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>
                      <input
                        type="text"
                        value={item.officePhone || ''}
                        onChange={(e) => handleFieldChange(index, 'officePhone', e.target.value)}
                        placeholder="전화번호"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          fontSize: '13px',
                          border: '1px solid #d1d5db',
                          borderRadius: '3px'
                        }}
                      />
                    </td>
                    <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>
                      <input
                        type="text"
                        value={item.memo || ''}
                        onChange={(e) => handleFieldChange(index, 'memo', e.target.value)}
                        placeholder="내용"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          fontSize: '13px',
                          border: '1px solid #d1d5db',
                          borderRadius: '3px'
                        }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              border: '1px solid #d1d5db',
              background: 'white',
              color: '#374151',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              border: '1px solid #0284c7',
              background: '#0284c7',
              color: 'white',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyShareHistoryModal;
