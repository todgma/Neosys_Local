/**
 * 매물 소재지 표기 유틸 함수
 */

/**
 * 매물 타입에 따라 소재지를 포맷팅
 * @param {Object} property - 매물 정보 객체
 * @returns {Object} { fullAddress: string, detailAddress: string }
 */
export const formatPropertyAddress = (property) => {
  if (!property) return { fullAddress: '', detailAddress: '' };

  // 단지형 매물 (아파트, 오피스텔, 분양권, 지식산업센터, 상가/업무용 건물)
  const isDanjiProperty = property.danjiCode && property.danjiCode.trim() !== '';

  // 기본 주소 (시도 시군구 읍면동)
  const baseAddress = [property.addr1, property.addr2, property.addr3]
    .filter(Boolean)
    .join(' ');

  let detailAddress = '';

  if (isDanjiProperty) {
    // 단지형: 단지명 + 동 + 호
    const parts = [];
    if (property.addr4) parts.push(property.addr4); // 단지명
    if (property.dong) parts.push(`${property.dong}동`);
    if (property.ho) parts.push(`${property.ho}호`);
    detailAddress = parts.join(' ');
  } else {
    // 비단지형: 지번(addr4) + 건물명(addr5)
    const parts = [];
    if (property.addr4) parts.push(property.addr4); // 지번
    if (property.addr5) parts.push(property.addr5); // 건물명/기타주소
    detailAddress = parts.join(' ');
  }

  return {
    fullAddress: [baseAddress, detailAddress].filter(Boolean).join(' '),
    baseAddress,
    detailAddress,
  };
};

/**
 * 매물 소재지를 한 줄로 표기 (브리핑 썸네일용)
 * @param {Object} property - 매물 정보 객체
 * @returns {string} 전체 주소
 */
export const getPropertyAddressOneLine = (property) => {
  const { fullAddress } = formatPropertyAddress(property);
  return fullAddress;
};

/**
 * 매물 소재지를 두 줄로 표기 (매물 목록용)
 * @param {Object} property - 매물 정보 객체
 * @returns {Object} { line1: string, line2: string }
 */
export const getPropertyAddressTwoLines = (property) => {
  const { baseAddress, detailAddress } = formatPropertyAddress(property);
  return {
    line1: baseAddress,
    line2: detailAddress,
  };
};

/**
 * 금액을 한글로 포맷팅 (만원 단위 고려)
 * @param {number} amount - 금액 (만원 단위)
 * @returns {string} 포맷팅된 금액 (예: "12,000만", "5,000만")
 */
export const formatKoreanAmount = (amount) => {
  if (!amount || amount === 0) return '-';
  return `${amount.toLocaleString()}만`;
};
