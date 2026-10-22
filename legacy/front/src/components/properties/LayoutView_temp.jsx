import React, { useState, useEffect } from 'react';
import { layoutService } from '../../services/layoutService';
import { ChevronDown, ChevronUp } from 'lucide-react';

const LayoutView = ({ selectedDanji, onClose }) => {
  const [dongList, setDongList] = useState([]);
  const [selectedDongs, setSelectedDongs] = useState([]);
  const [layoutData, setLayoutData] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    occupancyStatus: 'NEED_CHECK',
    customStatus: '',
    occupancyName: '',
    occupancyPhone: '',
    memo: ''
  });

  const occupancyStatuses = [
    { value: 'NEED_CHECK', label: '확인필요', color: '#FFE4E1' },
    { value: 'RESIDENT', label: '실거주', color: '#E8F5E9' },
    { value: 'JEONSE', label: '전세', color: '#E3F2FD' },
    { value: 'MONTHLY', label: '월세', color: '#FFF9C4' },
    { value: 'VACANT', label: '공실', color: '#FFEBEE' },
    { value: 'UNION_MEMBER', label: '조합원분', color: '#F3E5F5' },
    { value: 'OTHER', label: '기타', color: '#E0E0E0' },
    { value: 'CUSTOM', label: '직접입력', color: '#FFFFFF' }
  ];


  useEffect(() => {
    if (selectedDanji?.danjiCode) {
      loadAllLayoutData();
    }
  }, [selectedDanji]);

  const loadAllLayoutData = async () => {
    try {
      const data = await layoutService.getAllLayoutData(selectedDanji.danjiCode);
      setDongList(data.dongList || []);

      if (data.dongList && data.dongList.length > 0) {
        setSelectedDongs(data.dongList.map(dong => dong.dongNo));
      }

      const newLayoutData = {};
      (data.layoutData || []).forEach(dongData => {
        newLayoutData[dongData.dongNo] = {
          hoList: dongData.hoList || [],
          occupancyMap: (dongData.occupancyList || []).reduce((acc, occ) => {
            acc[occ.hoNumber] = occ;
            return acc;
          }, {})
        };
      });
      setLayoutData(newLayoutData);
    } catch (error) {
      console.error('배치도 데이터 조회 실패:', error);
      setDongList([]);
    }
  };
  const handleSelectAll = () => {
    if (dongList && dongList.length > 0) {
      setSelectedDongs(dongList.map(dong => dong.dongNo));
    }
  };

  const handleDeselectAll = () => {
    setSelectedDongs([]);
  };

  const handleDongToggle = (dongNo) => {
    setSelectedDongs(prev =>
      prev.includes(dongNo)
        ? prev.filter(d => d !== dongNo)
        : [...prev, dongNo]
    );
  };

  const handleUnitClick = (dongNo, ho) => {
    const occupancy = layoutData[dongNo]?.occupancyMap[ho.hoNumber] || {};
    setSelectedUnit({ dongNo, ho });
    setFormData({
      occupancyStatus: occupancy.occupancyStatus || 'NEED_CHECK',
      customStatus: occupancy.customStatus || '',
      occupancyName: occupancy.occupancyName || '',
      occupancyPhone: occupancy.occupancyPhone || '',
      memo: occupancy.memo || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      await layoutService.saveOccupancy({
        naverDanjiCode: selectedDanji.danjiCode,
        dongNo: selectedUnit.dongNo,
        hoNumber: selectedUnit.ho.hoNumber,
        floor: selectedUnit.ho.floor,
        ...formData
      });
      setShowModal(false);
      loadAllLayoutData();
    } catch (error) {
      console.error('점유현황 저장 실패:', error);
      alert('저장에 실패했습니다.');
    }
  };

  const renderAllBuildings = () => {
    if (selectedDongs.length === 0) return null;

    // 모든 층 정보 수집
    const allFloors = new Set();
    selectedDongs.forEach(dongNo => {
      const data = layoutData[dongNo];
      if (data && data.hoList) {
        data.hoList.forEach(ho => {
          if (ho.floor) allFloors.add(ho.floor);
        });
      }
    });

    // 층을 내림차순으로 정렬 (최상층부터)
    const sortedFloors = Array.from(allFloors).sort((a, b) => b - a);

    return (
      <div style={{ overflowX: 'auto', paddingBottom: '20px' }}>
        <table style={{ borderCollapse: 'collapse', width: 'auto' }}>
          <thead>
            <tr>
              <th style={{
                border: '1px solid #e0e0e0',
                padding: '8px 12px',
                textAlign: 'center',
                fontWeight: 'bold',
                backgroundColor: '#f5f5f5',
                minWidth: '60px',
                fontSize: '13px'
              }}>
                층
              </th>
              {selectedDongs.map(dongNo => {
                const dong = dongList.find(d => d.dongNo === dongNo);
                return (
                  <th key={dongNo} colSpan={10} style={{
                    border: '1px solid #e0e0e0',
                    padding: '8px 12px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    backgroundColor: '#f5f5f5',
                    fontSize: '13px'
                  }}>
                    {dong?.dongName || dongNo + '동'}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedFloors.map(floor => (
              <tr key={floor}>
                <td style={{
                  border: '1px solid #e0e0e0',
                  padding: '8px 12px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  backgroundColor: '#f9f9f9',
                  minWidth: '60px',
                  fontSize: '13px'
                }}>
                  {floor}층
                </td>
                {selectedDongs.map(dongNo => {
                  const data = layoutData[dongNo];
                  if (!data) {
                    return (
                      <td key={dongNo} colSpan={10} style={{
                        border: '1px solid #e0e0e0',
                        padding: '8px 12px',
                        textAlign: 'center',
                        backgroundColor: '#f9f9f9'
                      }}>
                      </td>
                    );
                  }

                  // 해당 층에 속한 호들을 필터링
                  const hosInFloor = data.hoList.filter(ho => ho.floor === floor);

                  if (hosInFloor.length === 0) {
                    return (
                      <td key={dongNo} colSpan={10} style={{
                        border: '1px solid #e0e0e0',
                        padding: '8px 12px',
                        textAlign: 'center',
                        backgroundColor: '#f9f9f9'
                      }}>
                      </td>
                    );
                  }

                  // 호들을 가로로 나열
                  return (
                    <td key={dongNo} colSpan={10} style={{
                      border: '1px solid #e0e0e0',
                      padding: '4px',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {hosInFloor.map(ho => {
                          const occupancy = data.occupancyMap[ho.hoNumber];
                          const status = occupancyStatuses.find(s => s.value === occupancy?.occupancyStatus);

                          return (
                            <div
                              key={ho.hoNumber}
                              onClick={() => handleUnitClick(dongNo, ho)}
                              style={{
                                border: '1px solid #ddd',
                                padding: '8px 12px',
                                cursor: 'pointer',
                                backgroundColor: status?.color || '#fff',
                                fontSize: '13px',
                                fontWeight: '500',
                                borderRadius: '4px',
                                minWidth: '60px'
                              }}
                            >
                              {ho.hoName || ho.hoNumber + '호'}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!selectedDanji) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ fontSize: '16px', color: '#666', marginBottom: '20px' }}>
          좌측 목록에서 단지를 선택해주세요.
        </div>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: '#fff', cursor: 'pointer' }}>
          시트로 보기
        </button>
      </div>
    );
  }

  if (!selectedDanji.danjiCode) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ fontSize: '16px', color: '#666', marginBottom: '20px' }}>
          배치도가 존재하지 않습니다.
        </div>
        <div style={{ fontSize: '14px', color: '#999', marginBottom: '20px' }}>
          비공동주택은 배치도를 지원하지 않습니다.
        </div>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: '#fff', cursor: 'pointer' }}>
          시트로 보기
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '400px' }}>
        <div
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}
        >
          <span>
            {dongList.length === 0
              ? '동 정보 없음'
              : selectedDongs.length === dongList.length
                ? '전체 동'
                : selectedDongs.length === 0
                  ? '동을 선택하세요'
                  : selectedDongs.length + '개 동 선택됨'}
          </span>
          {dropdownOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>

        {dropdownOpen && dongList.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', marginTop: '4px', zIndex: 1000, maxHeight: '300px', overflowY: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', gap: '10px' }}>
              <button onClick={handleSelectAll} style={{ padding: '5px 10px', fontSize: '13px', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f0f0f0' }}>
                전체 선택
              </button>
              <button onClick={handleDeselectAll} style={{ padding: '5px 10px', fontSize: '13px', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f0f0f0' }}>
                선택 해제
              </button>
            </div>
            {dongList.map(dong => (
              <div key={dong.dongNo} onClick={() => handleDongToggle(dong.dongNo)} style={{ padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f0f0f0' }}>
                <input type="checkbox" checked={selectedDongs.includes(dong.dongNo)} onChange={() => {}} style={{ cursor: 'pointer' }} />
                <span>{dong.dongName || dong.dongNo + '동'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {renderAllBuildings()}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', minWidth: '400px', maxWidth: '500px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>
              점유현황 기록 - {selectedUnit?.ho.hoName || selectedUnit?.ho.hoNumber + '호'}
            </h3>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>점유상태</label>
              <select
                value={formData.occupancyStatus}
                onChange={(e) => setFormData({ ...formData, occupancyStatus: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                {occupancyStatuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            {formData.occupancyStatus === 'CUSTOM' && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>직접입력 상태</label>
                <input
                  type="text"
                  value={formData.customStatus}
                  onChange={(e) => setFormData({ ...formData, customStatus: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  placeholder="상태를 입력하세요"
                />
              </div>
            )}

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>점유자명</label>
              <input
                type="text"
                value={formData.occupancyName}
                onChange={(e) => setFormData({ ...formData, occupancyName: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>연락처</label>
              <input
                type="text"
                value={formData.occupancyPhone}
                onChange={(e) => setFormData({ ...formData, occupancyPhone: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>메모</label>
              <textarea
                value={formData.memo}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: '#fff', cursor: 'pointer' }}>
                취소
              </button>
              <button onClick={handleSave} style={{ padding: '10px 20px', borderRadius: '4px', border: 'none', backgroundColor: '#007bff', color: '#fff', cursor: 'pointer' }}>
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayoutView;
