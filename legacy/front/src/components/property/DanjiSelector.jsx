import React, { useState, useEffect } from 'react';
import addressService from '../../services/common/addressService';
import { toast } from 'react-hot-toast';

const DanjiSelector = ({
  formData,
  onChange,
  danjiList,
  ptType,
  onAreaListChange, // 타입(면적) 목록을 상위로 전달 (면적 row에서 타입 드롭박스 렌더)
}) => {
  const [dongList, setDongList] = useState([]);
  const [hoList, setHoList] = useState([]);
  const [areaList, setAreaList] = useState([]);
  const [selectedDanji, setSelectedDanji] = useState('');
  const [selectedDong, setSelectedDong] = useState('');
  const [selectedPtpNo, setSelectedPtpNo] = useState('');
  const [isDongLoading, setIsDongLoading] = useState(false);
  const [isHoLoading, setIsHoLoading] = useState(false);
  const [isAreaLoading, setIsAreaLoading] = useState(false);
  const [showHoDropdown, setShowHoDropdown] = useState(false);
  const [isManualDanji, setIsManualDanji] = useState(false); // 단지명 직접입력 모드
  const [dummyDanji, setDummyDanji] = useState(false); // '--단지'(단지명 미상 임시 · 동/호 직접입력)

  // 아파트 계열 + 재개발/재건축(SYCA104/120)도 단지명 드롭다운 사용
  const isApartmentType = ['SYCA101', 'SYCA102', 'SYCA103', 'SYCA104', 'SYCA105', 'SYCA106', 'SYCA107', 'SYCA120'].includes(ptType);

  // 동/호 오름차순 정렬(숫자 기준)
  const numOf = (s) => parseInt(String(s ?? '').replace(/[^0-9]/g, ''), 10) || 0;
  const sortDong = (arr) => [...(arr || [])].sort((a, b) => numOf(a.dong_name) - numOf(b.dong_name));
  const sortHo = (arr) => [...(arr || [])].sort((a, b) => numOf(a.ho_name) - numOf(b.ho_name));

  // 수정 진입 시: 단지코드 없이 단지명(addr4)만 있으면 직접입력 모드로 표시
  useEffect(() => {
    setIsManualDanji(!formData.danjiCode && !!formData.addr4);
    setDummyDanji(false);
  }, [formData.ptNo]);

  const initializedRef = React.useRef(false);

  useEffect(() => {
    const initializeFormData = async () => {
      if (initializedRef.current || !formData.danjiCode) {
        return;
      }

      try {
        if (isApartmentType && formData.danjiCode) {
          setSelectedDanji(formData.danjiCode);

          const [dongData, areaData] = await Promise.all([
            addressService.getDongListByDanji(formData.danjiCode),
            addressService.getAreaListByDanji(formData.danjiCode)
          ]);

          setDongList(sortDong(dongData));
          setAreaList(areaData || []);

          if (formData.dong && dongData && dongData.length > 0) {
            const selectedDongItem = dongData.find(d => d.dong_name === formData.dong);
            if (selectedDongItem) {
              setSelectedDong(selectedDongItem.dong_no);
              const hoData = await addressService.getHoListByDong(formData.danjiCode, selectedDongItem.dong_no);
              if (hoData && hoData.length > 0) {
                setHoList(sortHo(hoData));
                setShowHoDropdown(true);
              }
            }
          }

          if (formData.aptTyp && areaData && areaData.length > 0) {
            const selectedAreaItem = areaData.find(a => a.plan_type_name === formData.aptTyp);
            if (selectedAreaItem) {
              setSelectedPtpNo(String(selectedAreaItem.ptp_no));
            }
          }
        }

        initializedRef.current = true;
      } catch (error) {
        console.error('단지 정보 초기화 실패:', error);
      }
    };

    initializeFormData();
  }, [formData.danjiCode, isApartmentType]);

  useEffect(() => {
    initializedRef.current = false;
  }, [formData.ptNo]);

  // 타입(면적) 목록이 바뀌면 상위로 전달
  useEffect(() => {
    if (onAreaListChange) onAreaListChange(areaList);
  }, [areaList]);

  const handleDanjiChange = async (naverDanjiCode, buildingName, addressBunji) => {
    setSelectedDanji(naverDanjiCode);
    onChange('danjiCode', naverDanjiCode);
    onChange('addr4', buildingName);
    onChange('jibun', addressBunji || ''); // 단지 선택 시 지번 자동입력
    onChange('dong', '');
    onChange('ho', '');
    onChange('aptTyp', '');
    onChange('supArea', '');
    onChange('excArea', '');
    setDongList([]);
    setHoList([]);
    setAreaList([]);
    setSelectedDong('');
    setSelectedPtpNo('');
    setShowHoDropdown(false);

    if (naverDanjiCode) {
      setIsDongLoading(true);
      try {
        const dongData = await addressService.getDongListByDanji(naverDanjiCode);
        setDongList(sortDong(dongData));
      } catch (error) {
        console.error('동 목록 조회 실패:', error);
        toast.error('동 목록을 불러오지 못했습니다.');
      } finally {
        setIsDongLoading(false);
      }

      setIsAreaLoading(true);
      try {
        const areaData = await addressService.getAreaListByDanji(naverDanjiCode);
        setAreaList(areaData || []);
      } catch (error) {
        console.error('타입(면적) 목록 조회 실패:', error);
        toast.error('타입(면적) 목록을 불러오지 못했습니다.');
      } finally {
        setIsAreaLoading(false);
      }
    }
  };

  const handleDongChange = async (dongNo, dongName) => {
    setSelectedDong(dongNo);
    onChange('dong', dongName);
    onChange('ho', '');
    setHoList([]);
    setShowHoDropdown(false);

    if (dongNo && selectedDanji) {
      setIsHoLoading(true);
      try {
        const hoData = await addressService.getHoListByDong(selectedDanji, dongNo);
        if (hoData && hoData.length > 0) {
          setHoList(sortHo(hoData));
          setShowHoDropdown(true);
        } else {
          setShowHoDropdown(false);
        }
      } catch (error) {
        console.error('호 목록 조회 실패:', error);
        setShowHoDropdown(false);
      } finally {
        setIsHoLoading(false);
      }
    }
  };

  const handleAreaChange = (ptpNo) => {
    setSelectedPtpNo(ptpNo);
    const selectedArea = areaList.find(area => area.ptp_no === parseInt(ptpNo));
    if (selectedArea) {
      onChange('aptTyp', selectedArea.plan_type_name);
      onChange('supArea', selectedArea.sply_spc ? parseFloat(selectedArea.sply_spc).toFixed(2) : '');
      onChange('excArea', selectedArea.excls_spc ? parseFloat(selectedArea.excls_spc).toFixed(2) : '');
    } else if (!ptpNo) {
      onChange('aptTyp', '');
      onChange('supArea', '');
      onChange('excArea', '');
    }
  };

  if (!isApartmentType) {
    return null;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      {/* 단지명 (0번째: 직접입력) */}
      <select
        value={dummyDanji ? '__dummy__' : (isManualDanji ? '__manual__' : (formData.danjiCode || ''))}
        onChange={(e) => {
          const val = e.target.value;
          setDummyDanji(val === '__dummy__');
          if (val === '__dummy__') {
            // --단지: 단지명 미상 임시 · 동/호 직접입력
            setIsManualDanji(false);
            onChange('danjiCode', ''); onChange('addr4', ''); onChange('dong', ''); onChange('ho', '');
            onChange('aptTyp', ''); onChange('supArea', ''); onChange('excArea', '');
            setDongList([]); setHoList([]); setAreaList([]);
            setSelectedDanji(''); setSelectedDong(''); setSelectedPtpNo(''); setShowHoDropdown(false);
          } else if (val === '__manual__') {
            // 직접입력 모드: 단지코드/동/호/타입/면적 초기화, 단지명(addr4)은 직접 입력
            setIsManualDanji(true);
            onChange('danjiCode', '');
            onChange('dong', '');
            onChange('ho', '');
            onChange('aptTyp', '');
            onChange('supArea', '');
            onChange('excArea', '');
            setDongList([]); setHoList([]); setAreaList([]);
            setSelectedDanji(''); setSelectedDong(''); setSelectedPtpNo(''); setShowHoDropdown(false);
          } else if (val === '') {
            setIsManualDanji(false);
            onChange('danjiCode', '');
            onChange('addr4', '');
          } else {
            setIsManualDanji(false);
            const selected = danjiList.find(item => item.naverDanjiCode === val);
            if (selected) {
              handleDanjiChange(selected.naverDanjiCode, selected.buildingName, selected.addressBunji);
            }
          }
        }}
        style={{ width: '150px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1', height: '24px', boxSizing: 'border-box' }}
      >
        <option value="__dummy__">--단지</option>
        <option value="__manual__">직접입력</option>
        <option value="">단지 선택</option>
        {danjiList && danjiList.map((danji) => (
          <option key={danji.buildingCode} value={danji.naverDanjiCode}>
            {danji.buildingName}
          </option>
        ))}
      </select>

      {/* 단지명 직접입력 */}
      {isManualDanji && (
        <input
          type="text"
          value={formData.addr4 || ''}
          onChange={(e) => onChange('addr4', e.target.value)}
          placeholder="단지명 직접입력"
          style={{ width: '120px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1', height: '24px', boxSizing: 'border-box' }}
        />
      )}

      {/* 동 (드롭다운 + 직접입력) */}
      {dongList.length > 0 ? (
        <>
          <select
            value={dongList.find(d => d.dong_name === formData.dong) ? String(selectedDong) : '__manual__'}
            onChange={(e) => {
              if (e.target.value === '__manual__') {
                onChange('dong', ''); onChange('ho', '');
                setSelectedDong(''); setHoList([]); setShowHoDropdown(false);
              } else {
                const selected = dongList.find(item => String(item.dong_no) === e.target.value);
                if (selected) handleDongChange(selected.dong_no, selected.dong_name);
              }
            }}
            disabled={isDongLoading}
            style={{ width: '60px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1', height: '24px', boxSizing: 'border-box' }}
          >
            <option value="__manual__">직접입력</option>
            {dongList.map((dong) => (
              <option key={dong.dong_no} value={String(dong.dong_no)}>
                {dong.dong_name}
              </option>
            ))}
          </select>
          {(!formData.dong || !dongList.find(d => d.dong_name === formData.dong)) && (
            <input
              type="text"
              value={formData.dong || ''}
              onChange={(e) => onChange('dong', e.target.value)}
              placeholder="동 입력"
              style={{ width: '60px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1', height: '24px', boxSizing: 'border-box' }}
            />
          )}
        </>
      ) : (
        <input
          type="text"
          value={formData.dong || ''}
          onChange={(e) => onChange('dong', e.target.value)}
          placeholder="동"
          style={{ width: '60px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1', height: '24px', boxSizing: 'border-box' }}
        />
      )}

      {/* 호 */}
      {showHoDropdown ? (
        <>
          <select
            value={formData.ho && hoList.find(h => h.ho_name === formData.ho) ? formData.ho : '__manual__'}
            onChange={(e) => {
              if (e.target.value === '__manual__') {
                onChange('ho', '');
              } else {
                onChange('ho', e.target.value);
              }
            }}
            disabled={isHoLoading}
            style={{ width: '60px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1', height: '24px', boxSizing: 'border-box' }}
          >
            <option value="__manual__">직접입력</option>
            {hoList.map((ho, idx) => (
              <option key={idx} value={ho.ho_name}>
                {ho.ho_name}
              </option>
            ))}
          </select>
          {(!formData.ho || !hoList.find(h => h.ho_name === formData.ho)) && (
            <input
              type="text"
              value={formData.ho || ''}
              onChange={(e) => onChange('ho', e.target.value)}
              placeholder="호 입력"
              style={{ width: '60px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1', height: '24px', boxSizing: 'border-box' }}
            />
          )}
        </>
      ) : (
        <input
          type="text"
          value={formData.ho || ''}
          onChange={(e) => onChange('ho', e.target.value)}
          placeholder="호"
          style={{ width: '60px', padding: '0px 2px', fontSize: '13px', border: '1px solid #cbd5e1', height: '24px', boxSizing: 'border-box' }}
        />
      )}
      {/* 타입(아파트타입) 드롭박스는 면적 row 로 이동됨 */}
    </div>
  );
};

export default DanjiSelector;
