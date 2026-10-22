import addressService from '../services/common/addressService';

/**
 * BjdCode로 주소 select를 자동 설정하는 유틸리티
 * @param {string} bjdCode - 법정동 코드
 * @param {function} setSidoList - 시도 목록 설정 함수
 * @param {function} setSigunguList - 시군구 목록 설정 함수
 * @param {function} setEupMyeonDongList - 읍면동 목록 설정 함수
 * @param {function} setSelectedSido - 선택된 시도 설정 함수
 * @param {function} setSelectedSigungu - 선택된 시군구 설정 함수
 * @param {function} setSelectedEupMyeonDong - 선택된 읍면동 설정 함수
 */
export const loadAddressFromBjdCode = async (
  bjdCode,
  setSidoList,
  setSigunguList,
  setEupMyeonDongList,
  setSelectedSido,
  setSelectedSigungu,
  setSelectedEupMyeonDong
) => {
  const normalizeAddressList = (response) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    return [];
  };

  try {
    if (!bjdCode || bjdCode.length < 2) {
      console.log('❌ bjdCode가 없거나 너무 짧음:', bjdCode);
      return;
    }

    console.log('🔍 주소 자동 설정 시작 - bjdCode:', bjdCode);

    // 1. 시도 목록 로드
    const sidoResponse = await addressService.getSidoList();
    const sidoList = normalizeAddressList(sidoResponse);
    if (sidoList.length === 0) {
      console.log('❌ 시도 목록이 비어있음');
      return;
    }

    setSidoList(sidoList);

    // 시도 코드 (앞 2자리)
    const sidoCode = bjdCode.substring(0, 2);
    const foundSido = sidoList.find((sido) => sido.bjdCode?.startsWith(sidoCode));
    if (!foundSido) {
      console.log('❌ 시도를 찾을 수 없음 - sidoCode:', sidoCode);
      return;
    }

    console.log('✅ 시도 찾음:', foundSido);
    setSelectedSido(foundSido.bjdCode);

    // 2. 시군구 목록 로드 (bjdCode 길이가 5 이상인 경우)
    if (bjdCode.length < 5) {
      console.log('ℹ️ bjdCode 길이가 5 미만이므로 시군구 로드 생략');
      return;
    }

    const sigunguResponse = await addressService.getSigunguList(foundSido.bjdCode);
    const sigunguList = normalizeAddressList(sigunguResponse);
    if (sigunguList.length === 0) {
      console.log('❌ 시군구 목록이 비어있음');
      return;
    }

    setSigunguList(sigunguList);
    console.log('📋 시군구 목록:', sigunguList);

    const sigunguCode = bjdCode.substring(0, 5);
    console.log('🔍 찾을 시군구 코드:', sigunguCode);

    // 시군구 코드 매칭: 정확히 일치하거나 시작하는 것으로 찾기
    const foundSigungu = sigunguList.find((sigungu) =>
      sigungu.bjdCode === sigunguCode || sigungu.bjdCode?.startsWith(sigunguCode)
    );

    if (!foundSigungu) {
      console.log('❌ 시군구를 찾을 수 없음 - sigunguCode:', sigunguCode);
      console.log('사용 가능한 시군구:', sigunguList.map(s => s.bjdCode));
      return;
    }

    console.log('✅ 시군구 찾음:', foundSigungu);
    setSelectedSigungu(foundSigungu.bjdCode);

    // 3. 읍면동 목록 로드 (bjdCode 길이가 10인 경우)
    if (bjdCode.length < 10) {
      console.log('ℹ️ bjdCode 길이가 10 미만이므로 읍면동 로드 생략');
      return;
    }

    const emdResponse = await addressService.getEupMyeonDongList(foundSigungu.bjdCode);
    const emdList = normalizeAddressList(emdResponse);
    if (emdList.length === 0) {
      console.log('❌ 읍면동 목록이 비어있음');
      return;
    }

    setEupMyeonDongList(emdList);
    console.log('📋 읍면동 목록:', emdList);

    const foundEmd = emdList.find((emd) => emd.bjdCode === bjdCode);
    if (foundEmd) {
      console.log('✅ 읍면동 찾음:', foundEmd);
      setSelectedEupMyeonDong(foundEmd.bjdCode);
    } else {
      console.log('❌ 읍면동을 찾을 수 없음 - bjdCode:', bjdCode);
      console.log('사용 가능한 읍면동:', emdList.map(e => e.bjdCode));
    }
  } catch (error) {
    console.error('❌ 주소 자동 설정 실패:', error);
  }
};

