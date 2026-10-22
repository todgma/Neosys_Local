import React, { useState, useEffect } from 'react';
import addressService from '../../services/common/addressService';
import { toast } from 'react-hot-toast';
import { PROPERTY_TYPES } from '../../constants/propertyTypes';

const AddressSelector = ({
  formData,
  onChange,
  onDanjiListChange,
  ptType, // 매물유형
  aptType, // 아파트타입
  showPtTypeInSameLine = false, // 매물유형을 같은 줄에 표시할지 여부
  ptTypeValue = '', // 매물유형 값
  onPtTypeChange = null // 매물유형 변경 핸들러
}) => {
  const [sidoList, setSidoList] = useState([]);
  const [sigunguList, setSigunguList] = useState([]);
  const [eupMyeonDongList, setEupMyeonDongList] = useState([]);
  const [danjiList, setDanjiList] = useState([]);
  const [dongList, setDongList] = useState([]);
  const [hoList, setHoList] = useState([]);
  const [areaList, setAreaList] = useState([]);
  const [selectedSido, setSelectedSido] = useState('');
  const [selectedSigungu, setSelectedSigungu] = useState('');
  const [selectedEupMyeonDong, setSelectedEupMyeonDong] = useState('');
  const [selectedDanji, setSelectedDanji] = useState('');
  const [selectedDong, setSelectedDong] = useState('');
  const [selectedPtpNo, setSelectedPtpNo] = useState(''); // 선택된 타입의 ptp_no
  const [isDanjiLoading, setIsDanjiLoading] = useState(false);
  const [isDongLoading, setIsDongLoading] = useState(false);
  const [isHoLoading, setIsHoLoading] = useState(false);
  const [isAreaLoading, setIsAreaLoading] = useState(false);
  const [showHoDropdown, setShowHoDropdown] = useState(false);

  // 아파트/오피스텔/주상복합/분양권 여부 확인
  const isApartmentType = ['SYCA101', 'SYCA102', 'SYCA103', 'SYCA105', 'SYCA106', 'SYCA107'].includes(ptType);

  useEffect(() => {
    loadSidoList();
  }, []);

  // 매물유형 변경 시 단지/지번 관련 필드 초기화
  const prevPtTypeRef = React.useRef(ptType);

  useEffect(() => {
    const prevType = prevPtTypeRef.current;

    // 최초 마운트 시에는 초기화하지 않음
    if (prevType === ptType) {
      return;
    }

    const wasApartmentType = ['SYCA101', 'SYCA102', 'SYCA103', 'SYCA105', 'SYCA106', 'SYCA107'].includes(prevType);

    // prevPtTypeRef 업데이트
    prevPtTypeRef.current = ptType;

    // 매물 타입이 실제로 바뀐 경우에만 초기화
    if (wasApartmentType !== isApartmentType) {
      if (isApartmentType) {
        // 기타 -> 아파트형: 지번 초기화
        onChange('addr4', '');
      } else {
        // 아파트형 -> 기타: 단지코드, 동, 호 초기화
        onChange('danjiCode', '');
        onChange('dong', '');
        onChange('ho', '');
      }
    }
  }, [ptType, isApartmentType, onChange]);

  // 수정 모드: formData 기반으로 주소 계층 구조 초기화
  const initializedRef = React.useRef(false);

  useEffect(() => {
    const initializeFormData = async () => {
      // 이미 초기화했거나 bjdCode가 없거나 sidoList가 로드되지 않았으면 스킵
      if (initializedRef.current || !formData.bjdCode || sidoList.length === 0) {
        return;
      }

      try {
        const bjdCode = formData.bjdCode;
        const sidoCode = bjdCode.substring(0, 2) + '00000000';
        const sigunguCode = bjdCode.substring(0, 5) + '00000';

        // 1. 시도 선택
        setSelectedSido(sidoCode);
        const sigunguData = await addressService.getSigunguList(sidoCode);
        setSigunguList(sigunguData || []);

        // 2. 시군구 선택
        setSelectedSigungu(sigunguCode);
        const eupMyeonDongData = await addressService.getEupMyeonDongList(sigunguCode);
        setEupMyeonDongList(eupMyeonDongData || []);

        // 3. 읍면동 선택
        setSelectedEupMyeonDong(bjdCode);

        // 4. 단지 목록 로드 (아파트 타입인 경우)
        if (isApartmentType && formData.danjiCode) {
          const danjiData = await addressService.getDanjiListByBjd(bjdCode);
          setDanjiList(danjiData || []);
          if (onDanjiListChange) onDanjiListChange(danjiData || []);

          // 5. 단지 선택
          setSelectedDanji(formData.danjiCode);

          // 6. 동 목록 및 타입(면적) 목록 로드
          const [dongData, areaData] = await Promise.all([
            addressService.getDongListByDanji(formData.danjiCode),
            addressService.getAreaListByDanji(formData.danjiCode)
          ]);

          setDongList(dongData || []);
          setAreaList(areaData || []);

          // 7. 동 선택 및 호 목록 로드
          if (formData.dong && dongData && dongData.length > 0) {
            const selectedDongItem = dongData.find(d => d.dong_name === formData.dong);
            if (selectedDongItem) {
              setSelectedDong(selectedDongItem.dong_no);
              const hoData = await addressService.getHoListByDong(formData.danjiCode, selectedDongItem.dong_no);
              if (hoData && hoData.length > 0) {
                setHoList(hoData);
                setShowHoDropdown(true);
              }
            }
          }

          // 8. 타입(면적) 선택
          if (formData.aptTyp && areaData && areaData.length > 0) {
            const selectedAreaItem = areaData.find(a => a.plan_type_name === formData.aptTyp);
            if (selectedAreaItem) {
              setSelectedPtpNo(String(selectedAreaItem.ptp_no));
            }
          }
        }

        // 초기화 완료 표시
        initializedRef.current = true;
      } catch (error) {
        console.error('주소 초기화 실패:', error);
      }
    };

    initializeFormData();
  }, [formData.bjdCode, sidoList.length, isApartmentType]);

  // formData가 변경되면 초기화 플래그 리셋 (새로운 데이터 로드 시)
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
      // addr1 설정 (시/도명)
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
    setEupMyeonDongList([]);
    setDanjiList([]);
    if (onDanjiListChange) onDanjiListChange([]);

    if (sigunguCode) {
      // addr2 설정 (시/군/구명)
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
    onChange('bjdCode', bjdCode);
    onChange('addr3', bjdName);
    onChange('danjiCode', '');
    onChange('addr4', '');
    setDanjiList([]);

    if (bjdCode) {
      setIsDanjiLoading(true);
      try {
        const data = await addressService.getDanjiListByBjd(bjdCode);
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

  const handleDanjiChange = async (buildingCode, buildingName, naverDanjiCode) => {
    setSelectedDanji(naverDanjiCode); // 네이버 단지 코드 저장
    onChange('danjiCode', naverDanjiCode); // 네이버 단지 코드를 저장
    onChange('addr4', buildingName);
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
      // 동 목록 조회
      setIsDongLoading(true);
      try {
        const dongData = await addressService.getDongListByDanji(naverDanjiCode);
        setDongList(dongData || []);
      } catch (error) {
        console.error('동 목록 조회 실패:', error);
        toast.error('동 목록을 불러오지 못했습니다.');
      } finally {
        setIsDongLoading(false);
      }

      // 타입(면적) 목록 조회
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
          setHoList(hoData);
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
      // 면적 값을 숫자로 변환하여 저장 (소수점 2자리까지)
      onChange('supArea', selectedArea.sply_spc ? parseFloat(selectedArea.sply_spc).toFixed(2) : '');
      onChange('excArea', selectedArea.excls_spc ? parseFloat(selectedArea.excls_spc).toFixed(2) : '');
    } else if (!ptpNo) {
      // 선택 해제 시
      onChange('aptTyp', '');
      onChange('supArea', '');
      onChange('excArea', '');
    }
  };

  return (
    <>
      {/* 매물유형 & 소재지 - 한 줄로 모두 표시 */}
      <tr>
        {showPtTypeInSameLine && (
          <>
            <td style={{ padding: '4px 6px', width: '80px', fontWeight: '600', color: '#92400e', border: '1px solid #fbbf24', background: '#fef3c7' }}>매물유형</td>
            <td style={{ padding: '4px 6px', border: '1px solid #fbbf24' }}>
              <select
                value={ptTypeValue}
                onChange={onPtTypeChange}
                style={{ padding: '4px 6px', border: '1px solid #fbbf24', fontSize: '13px', background: 'white', minWidth: '120px' }}
              >
                {PROPERTY_TYPES.map((type) => (
                  <option key={type.code} value={type.code}>{type.label}</option>
                ))}
              </select>
            </td>
          </>
        )}
        <td style={{ padding: '4px 6px', width: '80px', fontWeight: '600', color: '#92400e', border: '1px solid #fbbf24', background: '#fef3c7' }}>소재지</td>
        <td style={{ padding: '4px 6px', border: '1px solid #fbbf24' }} colSpan={showPtTypeInSameLine ? "1" : "3"}>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap' }}>
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
              style={{ minWidth: '100px', padding: '4px 6px', fontSize: '13px', border: '1px solid #fbbf24' }}
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
              style={{ minWidth: '100px', padding: '4px 6px', fontSize: '13px', border: '1px solid #fbbf24' }}
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
              style={{ minWidth: '100px', padding: '4px 6px', fontSize: '13px', border: '1px solid #fbbf24' }}
            >
              <option value="">읍/면/동</option>
              {eupMyeonDongList.map((emd) => (
                <option key={emd.bjdCode} value={emd.bjdCode}>
                  {emd.bjdName}
                </option>
              ))}
            </select>

            {/* 아파트/오피스텔: 단지명, 기타: 지번 */}
            {isApartmentType ? (
              <>
                {/* 단지명 */}
                <select
                  value={formData.danjiCode || ''}
                  onChange={(e) => {
                    const selected = danjiList.find(item => item.naverDanjiCode === e.target.value);
                    if (selected) {
                      handleDanjiChange(selected.buildingCode, selected.buildingName, selected.naverDanjiCode);
                    }
                  }}
                  disabled={!selectedEupMyeonDong || isDanjiLoading}
                  style={{ minWidth: '150px', padding: '4px 6px', fontSize: '13px', border: '1px solid #fbbf24' }}
                >
                  <option value="">{isDanjiLoading ? '로딩 중...' : '단지명'}</option>
                  {danjiList.map((danji) => (
                    <option key={danji.buildingCode} value={danji.naverDanjiCode}>
                      {danji.buildingName}
                    </option>
                  ))}
                </select>

                {/* 동 */}
                {dongList.length > 0 ? (
                  <select
                    value={selectedDong}
                    onChange={(e) => {
                      const selected = dongList.find(item => item.dong_no === parseInt(e.target.value));
                      if (selected) {
                        handleDongChange(selected.dong_no, selected.dong_name);
                      }
                    }}
                    disabled={!selectedDanji || isDongLoading}
                    style={{ width: '100px', padding: '4px 6px', fontSize: '13px', border: '1px solid #fbbf24' }}
                  >
                    <option value="">{isDongLoading ? '로딩 중...' : '동'}</option>
                    {dongList.map((dong) => (
                      <option key={dong.dong_no} value={dong.dong_no}>
                        {dong.dong_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.dong || ''}
                    onChange={(e) => onChange('dong', e.target.value)}
                    placeholder="동"
                    style={{ width: '60px', padding: '4px 6px', fontSize: '13px', border: '1px solid #fbbf24' }}
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
                      style={{ width: '100px', padding: '4px 6px', fontSize: '13px', border: '1px solid #fbbf24' }}
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
                        style={{ width: '80px', padding: '4px 6px', fontSize: '13px', border: '1px solid #fbbf24', marginLeft: '4px' }}
                      />
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    value={formData.ho || ''}
                    onChange={(e) => onChange('ho', e.target.value)}
                    placeholder="호"
                    style={{ width: '80px', padding: '4px 6px', fontSize: '13px', border: '1px solid #fbbf24' }}
                  />
                )}

                {/* 아파트타입 */}
                {areaList.length > 0 ? (
                  <select
                    value={selectedPtpNo}
                    onChange={(e) => {
                      handleAreaChange(e.target.value);
                    }}
                    disabled={isAreaLoading}
                    style={{ minWidth: '120px', padding: '4px 6px', fontSize: '13px', border: '1px solid #fbbf24' }}
                  >
                    <option value="">{isAreaLoading ? '로딩 중...' : '타입'}</option>
                    {areaList.map((area) => (
                      <option key={area.ptp_no} value={area.ptp_no}>
                        {area.plan_type_name} ({area.excls_spc}㎡)
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={aptType || ''}
                    onChange={(e) => onChange('aptTyp', e.target.value)}
                    style={{ minWidth: '90px', padding: '4px 6px', fontSize: '13px', border: '1px solid #fbbf24' }}
                  >
                    <option value="">타입</option>
                    <option value="59A">59A</option>
                    <option value="59B">59B</option>
                    <option value="59C">59C</option>
                    <option value="74A">74A</option>
                    <option value="74B">74B</option>
                    <option value="84A">84A</option>
                    <option value="84B">84B</option>
                    <option value="84C">84C</option>
                    <option value="99A">99A</option>
                    <option value="99B">99B</option>
                    <option value="114A">114A</option>
                    <option value="114B">114B</option>
                    <option value="129A">129A</option>
                    <option value="129B">129B</option>
                    <option value="144A">144A</option>
                    <option value="144B">144B</option>
                    <option value="159A">159A</option>
                    <option value="174A">174A</option>
                    <option value="194A">194A</option>
                  </select>
                )}
              </>
            ) : (
              <>
                {/* 지번 */}
                <input
                  type="text"
                  value={formData.addr4 || ''}
                  onChange={(e) => onChange('addr4', e.target.value)}
                  placeholder="지번 (예: 123-45)"
                  style={{ minWidth: '120px', padding: '4px 6px', fontSize: '13px', border: '1px solid #fbbf24' }}
                />

                {/* 건물명/층수 등 */}
                <input
                  type="text"
                  value={formData.addr5 || ''}
                  onChange={(e) => onChange('addr5', e.target.value)}
                  placeholder="건물명, 층수 등 (예: OO빌딩 2층)"
                  style={{ flex: 1, minWidth: '180px', padding: '4px 6px', fontSize: '13px', border: '1px solid #fbbf24' }}
                />
              </>
            )}
          </div>
        </td>
      </tr>
    </>
  );
};

export default AddressSelector;
