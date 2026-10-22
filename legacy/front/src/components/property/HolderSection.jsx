import React, { useState } from 'react';
import { holderService } from '../../services/holderService';
import { toast } from 'react-hot-toast';
import { Trash2, Edit2, Plus } from 'lucide-react';

const HolderSection = ({
  ptNo,
  userId,
  holders,
  onHoldersChange,
  isEditMode = false
}) => {
  const [currentHolder, setCurrentHolder] = useState({
    holderRegDate: '',
    holderName: '',
    holderPhone: '',
    custNo: '',
    holderRelation: '',
    holderMemo: '',
  });
  const [editingHolderIdx, setEditingHolderIdx] = useState(null);
  const [isCustomRelation, setIsCustomRelation] = useState(false);

  const handleHolderChange = (field, value) => {
    setCurrentHolder(prev => ({ ...prev, [field]: value }));

    // 관계 필드가 "직접입력"이면 커스텀 입력 모드 활성화
    if (field === 'holderRelation') {
      setIsCustomRelation(value === '직접입력');
      if (value !== '직접입력') {
        setCurrentHolder(prev => ({ ...prev, holderRelation: value }));
      } else {
        setCurrentHolder(prev => ({ ...prev, holderRelation: '' }));
      }
    }
  };

  const handleSaveHolder = async () => {
    if (!currentHolder.holderName) {
      toast.error('소유주명을 입력해주세요.');
      return;
    }

    if (!ptNo) {
      toast.error('물건을 먼저 저장해주세요.');
      return;
    }

    try {
      const holderDataToSave = {
        ...currentHolder,
        holderRegDate: editingHolderIdx !== null
          ? currentHolder.holderRegDate
          : new Date().toISOString().split('T')[0]
      };

      if (editingHolderIdx !== null) {
        await holderService.update(ptNo, editingHolderIdx, userId, holderDataToSave);
        toast.success('소유주 정보가 수정되었습니다.');
      } else {
        await holderService.create(ptNo, userId, holderDataToSave);
        toast.success('소유주 정보가 등록되었습니다.');
      }

      // 부모 컴포넌트에 변경 알림
      if (onHoldersChange) {
        await onHoldersChange();
      }
      setEditingHolderIdx(null);
    } catch (error) {
      console.error('소유주 정보 저장 실패:', error);
      toast.error('소유주 정보 저장에 실패했습니다.');
    }
  };

  const handleEditHolder = (holder) => {
    setCurrentHolder({
      holderRegDate: holder.holderRegDate || '',
      holderName: holder.holderName || '',
      holderPhone: holder.holderPhone || '',
      custNo: holder.custNo || '',
      holderRelation: holder.holderRelation || '',
      holderMemo: holder.holderMemo || '',
    });
    setEditingHolderIdx(holder.holderIdx);

    const defaultOptions = ['', '본인', '배우자', '자녀', '부모'];
    if (!defaultOptions.includes(holder.holderRelation)) {
      setIsCustomRelation(true);
    } else {
      setIsCustomRelation(false);
    }
  };

  const handleDeleteHolder = async (holder) => {
    if (!confirm('소유주 정보를 삭제하시겠습니까?')) return;

    try {
      await holderService.delete(ptNo, holder.holderIdx, userId);
      toast.success('소유주 정보가 삭제되었습니다.');
      if (onHoldersChange) {
        await onHoldersChange();
      }
    } catch (error) {
      console.error('소유주 정보 삭제 실패:', error);
      toast.error('소유주 정보 삭제에 실패했습니다.');
    }
  };

  const handleNewHolder = () => {
    setCurrentHolder({
      holderRegDate: new Date().toISOString().split('T')[0],
      holderName: '',
      holderPhone: '',
      custNo: '',
      holderRelation: '',
      holderMemo: '',
    });
    setEditingHolderIdx(null);
  };

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600' }}>소유주 정보</h3>
        {isEditMode && (
          <button
            type="button"
            onClick={handleNewHolder}
            className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
          >
            <Plus className="w-3 h-3 inline mr-1" />
            소유주 추가
          </button>
        )}
      </div>

      {/* 소유주 목록 */}
      {holders && holders.length > 0 && (
        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', marginBottom: '12px' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '6px', border: '1px solid #cbd5e1' }}>등록일</th>
              <th style={{ padding: '6px', border: '1px solid #cbd5e1' }}>소유주명</th>
              <th style={{ padding: '6px', border: '1px solid #cbd5e1' }}>연락처</th>
              <th style={{ padding: '6px', border: '1px solid #cbd5e1' }}>관계</th>
              <th style={{ padding: '6px', border: '1px solid #cbd5e1' }}>메모</th>
              {isEditMode && <th style={{ padding: '6px', border: '1px solid #cbd5e1', width: '80px' }}>작업</th>}
            </tr>
          </thead>
          <tbody>
            {holders.map((holder, idx) => (
              <tr key={idx}>
                <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>{holder.holderRegDate}</td>
                <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>{holder.holderName}</td>
                <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>{holder.holderPhone}</td>
                <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>{holder.holderRelation}</td>
                <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>{holder.holderMemo}</td>
                {isEditMode && (
                  <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleEditHolder(holder)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="수정"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteHolder(holder)}
                      className="p-1 text-red-600 hover:text-red-800 ml-1"
                      title="삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 소유주 입력 폼 (편집 모드일 때만) */}
      {isEditMode && (
        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 6px', width: '110px', fontWeight: '600', border: '1px solid #cbd5e1', background: '#f8fafc' }}>등록일</td>
              <td style={{ padding: '2px 4px', border: '1px solid #cbd5e1' }}>
                <input
                  type="date"
                  value={currentHolder.holderRegDate}
                  onChange={(e) => handleHolderChange('holderRegDate', e.target.value)}
                  style={{ width: '100%', padding: '4px 6px', fontSize: '13px', border: 'none' }}
                />
              </td>
              <td style={{ padding: '4px 6px', fontWeight: '600', border: '1px solid #cbd5e1', background: '#f8fafc' }}>소유주명 *</td>
              <td style={{ padding: '2px 4px', border: '1px solid #cbd5e1' }}>
                <input
                  type="text"
                  value={currentHolder.holderName}
                  onChange={(e) => handleHolderChange('holderName', e.target.value)}
                  placeholder="소유주명"
                  style={{ width: '100%', padding: '4px 6px', fontSize: '13px', border: 'none' }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ padding: '4px 6px', fontWeight: '600', border: '1px solid #cbd5e1', background: '#f8fafc' }}>연락처</td>
              <td style={{ padding: '2px 4px', border: '1px solid #cbd5e1' }}>
                <input
                  type="text"
                  value={currentHolder.holderPhone}
                  onChange={(e) => handleHolderChange('holderPhone', e.target.value)}
                  placeholder="010-0000-0000"
                  style={{ width: '100%', padding: '4px 6px', fontSize: '13px', border: 'none' }}
                />
              </td>
              <td style={{ padding: '4px 6px', fontWeight: '600', border: '1px solid #cbd5e1', background: '#f8fafc' }}>관계</td>
              <td style={{ padding: '2px 4px', border: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <select
                    value={isCustomRelation ? '직접입력' : currentHolder.holderRelation}
                    onChange={(e) => handleHolderChange('holderRelation', e.target.value)}
                    style={{ flex: 1, padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">선택</option>
                    <option value="본인">본인</option>
                    <option value="배우자">배우자</option>
                    <option value="자녀">자녀</option>
                    <option value="부모">부모</option>
                    <option value="직접입력">직접입력</option>
                  </select>
                  {isCustomRelation && (
                    <input
                      type="text"
                      value={currentHolder.holderRelation}
                      onChange={(e) => setCurrentHolder(prev => ({ ...prev, holderRelation: e.target.value }))}
                      placeholder="관계 입력"
                      style={{ flex: 1, padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}
                    />
                  )}
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '4px 6px', fontWeight: '600', border: '1px solid #cbd5e1', background: '#f8fafc' }}>메모</td>
              <td style={{ padding: '2px 4px', border: '1px solid #cbd5e1' }} colSpan="3">
                <input
                  type="text"
                  value={currentHolder.holderMemo}
                  onChange={(e) => handleHolderChange('holderMemo', e.target.value)}
                  placeholder="메모"
                  style={{ width: '100%', padding: '4px 6px', fontSize: '13px', border: 'none' }}
                />
              </td>
            </tr>
            <tr>
              <td colSpan="4" style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={handleSaveHolder}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
                >
                  {editingHolderIdx !== null ? '수정' : '추가'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
};

export default HolderSection;
