import React, { useState, useEffect } from 'react';
import addressService from '../../services/common/addressService';
import { toast } from 'react-hot-toast';

const AddressSelectorSimple = ({
  formData,
  onChange,
  onDanjiListChange,
  ptType,
}) => {
  const [sidoList, setSidoList] = useState([]);
  const [sigunguList, setSigunguList] = useState([]);
  const [eupMyeonDongList, setEupMyeonDongList] = useState([]);
  const [riList, setRiList] = useState([]);
  const [danjiList, setDanjiList] = useState([]);
  const [selectedSido, setSelectedSido] = useState('');
  const [selectedSigungu, setSelectedSigungu] = useState('');
  const [selectedEupMyeonDong, setSelectedEupMyeonDong] = useState('');
  const [selectedRi, setSelectedRi] = useState('');
  const [isDanjiLoading, setIsDanjiLoading] = useState(false);
  const [isRiLoading, setIsRiLoading] = useState(false);

  const isApartmentType = ['SYCA101', 'SYCA102', 'SYCA103', 'SYCA104', 'SYCA105', 'SYCA106', 'SYCA107', 'SYCA120'].includes(ptType);

  useEffect(() => {
    loadSidoList();
  }, []);

  const initializedRef = React.useRef(false);

  useEffect(() => {
    const initializeFormData = async () => {
      if (initializedRef.current || !formData.bjdCode || sidoList.length === 0) {
        return;
      }

      try {
        const bjdCode = formData.bjdCode;
        const sidoCode = bjdCode.substring(0, 2) + '00000000';
        const sigunguCode = bjdCode.substring(0, 5) + '00000';

        setSelectedSido(sidoCode);
        const sigunguData = await addressService.getSigunguList(sidoCode);
        setSigunguList(sigunguData || []);

        setSelectedSigungu(sigunguCode);
        const eupMyeonDongData = await addressService.getEupMyeonDongList(sigunguCode);
        setEupMyeonDongList(eupMyeonDongData || []);

        setSelectedEupMyeonDong(bjdCode);

        if (isApartmentType) {
          const danjiData = await addressService.getDanjiListByBjd(bjdCode, ptType);
          setDanjiList(danjiData || []);
          if (onDanjiListChange) onDanjiListChange(danjiData || []);
        }

        initializedRef.current = true;
      } catch (error) {
        console.error('주소 초기화 실패:', error);
      }
    };

    initializeFormData();
  }, [formData.bjdCode, sidoList.length, isApartmentType]);

  useEffect(() => {
    initializedRef.current = false;
  }, [formData.ptNo]);

  const loadSidoList = async () => {
    try {
      const data = await addressService.getSidoList();
      setSidoList(data || []);
    } catch (error) {
      console.error('시도 목록 조회 실패:', error);
      toast.error('시도 목록을 불러오지 못했습니다.');
    }
  };

  const handleSidoChange = async (sidoCode) => {
    setSelectedSido(sidoCode);
    setSelectedSigungu('');
    setSelectedEupMyeonDong('');
    setSigunguList([]);
    setEupMyeonDongList([]);
    setDanjiList([]);
    if (onDanjiListChange) onDanjiListChange([]);

    if (sidoCode) {
      const selected = sidoList.find(item => item.bjdCode === sidoCode);
      if (selected) {
        onChange('addr1', selected.bjdName);
      }

      try {
        const data = await addressService.getSigunguList(sidoCode);
        setSigunguList(data || []);
      } catch (error) {
        console.error('시군구 목록 조회 실패:', error);
        toast.error('시군구 목록을 불러오지 못했습니다.');
      }
    } else {
      onChange('addr1', '');
    }
  };

  const handleSigunguChange = async (sigunguCode) => {
    setSelectedSigungu(sigunguCode);
    setSelectedEupMyeonDong('');
    setSelectedRi('');
    setEupMyeonDongList([]);
    setRiList([]);
    setDanjiList([]);
    if (onDanjiListChange) onDanjiListChange([]);

    if (sigunguCode) {
      const selected = sigunguList.find(item => item.bjdCode === sigunguCode);
      if (selected) {
        onChange('addr2', selected.bjdName);
      }

      try {
        const data = await addressService.getEupMyeonDongList(sigunguCode);
        setEupMyeonDongList(data || []);
      } catch (error) {
        console.error('읍면동 목록 조회 실패:', error);
        toast.error('읍면동 목록을 불러오지 못했습니다.');
      }
    } else {
      onChange('addr2', '');
    }
  };

  const handleEupMyeonDongChange = async (bjdCode, bjdName) => {
    setSelectedEupMyeonDong(bjdCode);
    setSelectedRi('');
    onChange('bjdCode', bjdCode);
    onChange('addr3', bjdName);
    onChange('danjiCode', '');
    onChange('addr4', '');
    setRiList([]);
    setDanjiList([]);

    if (bjdCode) {
      // 리 목록 조회 시도
      setIsRiLoading(true);
      try {
        const riData = await addressService.getRiList(bjdCode);
        setRiList(riData || []);
      } catch (error) {
        console.error('리 목록 조회 실패:', error);
        // 리 목록이 없는 경우는 에러로 표시하지 않음 (정상적인 케이스)
        setRiList([]);
      } finally {
        setIsRiLoading(false);
      }

      // 단지 목록 조회 (단지유형 일치분만)
      setIsDanjiLoading(true);
      try {
        const data = await addressService.getDanjiListByBjd(bjdCode, ptType);
        setDanjiList(data || []);
        if (onDanjiListChange) onDanjiListChange(data || []);
      } catch (error) {
        console.error('단지 목록 조회 실패:', error);
        toast.error('단지 목록을 불러오지 못했습니다.');
      } finally {
        setIsDanjiLoading(false);
      }
    }
  };

  const handleRiChange = (riCode, riName) => {
    setSelectedRi(riCode);
    // 리가 선택되면 addr3에 "읍면동명 + 리명" 형태로 저장
    if (riName) {
      const eupMyeonDongName = eupMyeonDongList.find(item => item.bjdCode === selectedEupMyeonDong)?.bjdName || '';
      onChange('addr3', `${eupMyeonDongName} ${riName}`);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {/* 시/도 */}
      <select
        value={selectedSido}
        onChange={(e) => {
          const selected = sidoList.find(item => item.bjdCode === e.target.value);
          if (selected) {
            onChange('addr1', selected.bjdName);
          } else {
            onChange('addr1', '');
          }
          handleSidoChange(e.target.value);
        }}
        style={{ width: '120px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}
      >
        <option value="">시/도</option>
        {sidoList.map((sido) => (
          <option key={sido.bjdCode} value={sido.bjdCode}>
            {sido.bjdName}
          </option>
        ))}
      </select>

      {/* 시/군/구 */}
      <select
        value={selectedSigungu}
        onChange={(e) => {
          const selected = sigunguList.find(item => item.bjdCode === e.target.value);
          if (selected) {
            onChange('addr2', selected.bjdName);
          } else {
            onChange('addr2', '');
          }
          handleSigunguChange(e.target.value);
        }}
        disabled={!selectedSido}
        style={{ width: '120px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}
      >
        <option value="">시/군/구</option>
        {sigunguList.map((sigungu) => (
          <option key={sigungu.bjdCode} value={sigungu.bjdCode}>
            {sigungu.bjdName}
          </option>
        ))}
      </select>

      {/* 읍/면/동 */}
      <select
        value={selectedEupMyeonDong}
        onChange={(e) => {
          const selected = eupMyeonDongList.find(item => item.bjdCode === e.target.value);
          if (selected) {
            handleEupMyeonDongChange(selected.bjdCode, selected.bjdName);
          }
        }}
        disabled={!selectedSigungu}
        style={{ width: '80px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}
      >
        <option value="">읍/면/동</option>
        {eupMyeonDongList.map((emd) => (
          <option key={emd.bjdCode} value={emd.bjdCode}>
            {emd.bjdName}
          </option>
        ))}
      </select>

      {/* 리 (리 목록이 있는 경우에만 표시) */}
      {riList.length > 0 && (
        <select
          value={selectedRi}
          onChange={(e) => {
            const selected = riList.find(item => item.bjdCode === e.target.value);
            if (selected) {
              handleRiChange(selected.bjdCode, selected.bjdName);
            } else {
              setSelectedRi('');
              // 리 선택 해제 시 읍면동명만 저장
              const eupMyeonDongName = eupMyeonDongList.find(item => item.bjdCode === selectedEupMyeonDong)?.bjdName || '';
              onChange('addr3', eupMyeonDongName);
            }
          }}
          disabled={!selectedEupMyeonDong || isRiLoading}
          style={{ width: '120px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1' }}
        >
          <option value="">{isRiLoading ? '로딩 중...' : '리'}</option>
          {riList.map((ri) => (
            <option key={ri.bjdCode} value={ri.bjdCode}>
              {ri.bjdName}
            </option>
          ))}
        </select>
      )}

      {/* 지번/건물명/동호는 부모(소재지 영역)에서 단지목록 뒤에 렌더링 */}
    </div>
  );
};

export default AddressSelectorSimple;
