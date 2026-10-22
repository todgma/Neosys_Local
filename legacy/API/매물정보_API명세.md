# 물건 정보 API 명세서

## 개요
물건 정보를 관리하는 API입니다. 물건의 조회, 등록, 수정, 삭제 기능을 제공합니다.

**Base URL:** `/api/property`

---

## 1. 물건 정보 목록 조회

### Endpoint
```
GET /api/property/GetPropertyList
```

### Request Parameters (Query String)
| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|---------|------|------|------|--------|
| ptNo | int | ❌ | 물건번호 | - |
| ptName | string | ❌ | 물건명 (부분 검색) | - |
| offNo | long | ❌ | 중개사무소번호 | - |
| rtNo | string | ❌ | 중개인번호 | - |
| danjiCode | string | ❌ | 단지코드 (단지별 필터링) | - |
| Page | int | ✅ | 페이지 번호 | 1 |
| PageSize | int | ✅ | 페이지당 항목 수 | 20 |

### Response
```json
{
  "success": true,
  "message": "물건정보 목록 조회 성공",
  "data": {
    "ptSales": [
      {
        "ptNo": 600000001,
        "ptName": "강남 아파트",
        "prgSts": "진행중",
        "ptSts": "매물등록",
        "ptType": "아파트",
        "saleDiv": "매매",
        "addr1": "서울특별시",
        "addr2": "강남구",
        "addr3": "역삼동",
        "addr4": "123-45",
        "danjiCode": "2548860844",
        "dong": "101",
        "ho": "1001",
        "floor": 10,
        "supArea": 84.5,
        "excArea": 59.9,
        "roomCnt": 3,
        "bathCnt": 2,
        "saleAmt": 1500000000,
        "mvnPsbYn": "Y",
        "houseRental": "N",
        "petYn": "Y",
        "top": "N",
        "regDt": "2024-01-15T10:30:00",
        "regId": "admin"
      }
    ],
    "userDanjis": [
      {
        "danjiCode": "2548860844",
        "danjiName": "강남래미안아파트",
        "propertyCount": 15
      },
      {
        "danjiCode": "2548123456",
        "danjiName": "서초푸르지오",
        "propertyCount": 8
      }
    ]
  }
}
```

### Response 구조
- **ptSales**: 물건 목록 배열
- **userDanjis**: 사용자가 등록한 단지 목록 배열 (offNo 또는 rtNo 파라미터가 있을 때만 포함)
  - danjiCode: 단지코드
  - danjiName: 단지명
  - propertyCount: 해당 단지의 물건 수

### Error Response
```json
{
  "success": false,
  "message": "물건정보 없음",
  "errorCode": "NOT_FOUND"
}
```

---

## 2. 물건 정보 상세 조회

### Endpoint
```
GET /api/property/detail/{ptNo}
```

### Request Parameters
**Path Parameter:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| ptNo | long | ✅ | 물건번호 |

### Response
```json
{
  "success": true,
  "message": "물건정보 상세 조회 성공",
  "data": {
    "ptNo": 600000001,
    "ptName": "강남 아파트",
    "prgSts": "진행중",
    "ptSts": "매물등록",
    "ptType": "아파트",
    "ptExpl": "역삼역 도보 5분 거리",
    "saleDiv": "매매",
    "addr1": "서울특별시",
    "addr2": "강남구",
    "addr3": "역삼동",
    "addr4": "123-45",
    "addr5": "101동 1001호",
    "addrPost": "06234",
    "bjdCode": "1168010100",
    "danjiCode": "2548860844",
    "dong": "101",
    "ho": "1001",
    "floor": 10,
    "opt": "풀옵션",
    "houseCnt": 500,
    "aptTyp": "84A",
    "supArea": 84.5,
    "excArea": 59.9,
    "landShare": 45.2,
    "roomCnt": 3,
    "bathCnt": 2,
    "dirStd": "남향",
    "heatMethod": "개별난방",
    "heatFuel": "도시가스",
    "entrStruct": "계단식",
    "buidStruct": "철근콘크리트",
    "balcExt": "Y",
    "floor1": 10,
    "floor2": 20,
    "pkCnt": 1.5,
    "maintCost": 150000,
    "maintDtl": "관리비, 주차비 포함",
    "saleAmt": 1500000000,
    "lesAmt": 800000000,
    "protAmt": 100000000,
    "monAmt": 2000000,
    "etcAmt": 0,
    "layAmt": 0,
    "nowDepAmt": 90000000,
    "nowMonAmt": 1800000,
    "loanAmt": 500000000,
    "loanAmtAft": 300000000,
    "mtryDate": "2025-12-31",
    "exptMovDate": "2025-01-15",
    "exptDate": "2025-02-01",
    "exptComDate": "2024-12-20",
    "compYear": "2020",
    "shaYn": "N",
    "custNo": 100001,
    "offNo": 50001,
    "rtNo": "R001",
    "cnNo": 1001,
    "mvnPsbYn": "Y",
    "houseRental": "N",
    "petYn": "Y",
    "top": "N",
    "ptMemo": "급매물, 협의 가능",
    "regDt": "2024-01-15T10:30:00",
    "regId": "admin",
    "updDt": "2024-01-20T14:20:00",
    "updId": "admin",
    "holders": [
      {
        "holderIdx": 1,
        "holderType": "소유주",
        "holderRegDate": "2024-01-10",
        "holderName": "홍길동",
        "holderPhone": "010-1234-5678",
        "custNo": 100001,
        "holderRelation": "본인",
        "holderMemo": "직접 통화 가능"
      },
      {
        "holderIdx": 2,
        "holderType": "임차인",
        "holderRegDate": "2024-01-12",
        "holderName": "김철수",
        "holderPhone": "010-9876-5432",
        "custNo": null,
        "holderRelation": "세입자",
        "holderMemo": "2025년 6월까지 계약"
      }
    ]
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "물건정보 없음",
  "errorCode": "NOT_FOUND"
}
```

---

## 3. 물건 정보 등록

### Endpoint
```
POST /api/property
```

### Request Body
```json
{
  "ptName": "강남 아파트",
  "prgSts": "진행중",
  "ptSts": "매물등록",
  "ptType": "아파트",
  "ptExpl": "역삼역 도보 5분 거리",
  "saleDiv": "매매",
  "addr1": "서울특별시",
  "addr2": "강남구",
  "addr3": "역삼동",
  "addr4": "123-45",
  "addr5": "101동 1001호",
  "addrPost": "06234",
  "bjdCode": "1168010100",
  "danjiCode": "2548860844",
  "dong": "101",
  "ho": "1001",
  "floor": 10,
  "opt": "풀옵션",
  "houseCnt": 500,
  "aptTyp": "84A",
  "supArea": 84.5,
  "excArea": 59.9,
  "landShare": 45.2,
  "roomCnt": 3,
  "bathCnt": 2,
  "dirStd": "남향",
  "heatMethod": "개별난방",
  "heatFuel": "도시가스",
  "entrStruct": "계단식",
  "buidStruct": "철근콘크리트",
  "balcExt": "Y",
  "floor1": 10,
  "floor2": 20,
  "pkCnt": 1.5,
  "maintCost": 150000,
  "maintDtl": "관리비, 주차비 포함",
  "saleAmt": 1500000000,
  "lesAmt": 800000000,
  "protAmt": 100000000,
  "monAmt": 2000000,
  "etcAmt": 0,
  "layAmt": 0,
  "nowDepAmt": 90000000,
  "nowMonAmt": 1800000,
  "loanAmt": 500000000,
  "loanAmtAft": 300000000,
  "mtryDate": "2025-12-31",
  "exptMovDate": "2025-01-15",
  "exptDate": "2025-02-01",
  "exptComDate": "2024-12-20",
  "compYear": "2020",
  "shaYn": "N",
  "custNo": 100001,
  "offNo": 50001,
  "rtNo": "R001",
  "cnNo": 1001,
  "mvnPsbYn": "Y",
  "houseRental": "N",
  "petYn": "Y",
  "top": "N",
  "ptMemo": "급매물, 협의 가능",
  "userId": "admin",
  "holders": [
    {
      "holderType": "소유주",
      "holderRegDate": "2024-01-10",
      "holderName": "홍길동",
      "holderPhone": "010-1234-5678",
      "custNo": 100001,
      "holderRelation": "본인",
      "holderMemo": "직접 통화 가능"
    }
  ]
}
```

### Request Body Fields
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| ptName | string | ✅ | 물건명 |
| prgSts | string | ✅ | 진행상태 |
| ptSts | string | ✅ | 물건상태 |
| ptType | string | ❌ | 물건종류 (아파트, 오피스텔, 빌라 등) |
| ptExpl | string | ❌ | 물건설명 |
| saleDiv | string | ❌ | 거래구분 (매매, 전세, 월세 등) |
| addr1 | string | ❌ | 도시/도 |
| addr2 | string | ❌ | 구/시 |
| addr3 | string | ❌ | 동/로 |
| addr4 | string | ❌ | 번지/도로명 |
| addr5 | string | ❌ | 상세주소 |
| addrPost | string | ❌ | 우편번호 |
| bjdCode | string | ❌ | 법정동코드 |
| danjiCode | string | ❌ | 단지코드 (네이버 단지코드) |
| dong | string | ❌ | 동 |
| ho | string | ❌ | 호 |
| floor | int | ❌ | 층 |
| opt | string | ❌ | 옵션 |
| houseCnt | int | ❌ | 세대수 |
| aptTyp | string | ❌ | 타입 (84A, 59B 등) |
| supArea | decimal | ❌ | 공급면적 (㎡) |
| excArea | decimal | ❌ | 전용면적 (㎡) |
| landShare | decimal | ❌ | 대지지분 (㎡) |
| roomCnt | int | ❌ | 방수 |
| bathCnt | int | ❌ | 욕실수 |
| dirStd | string | ❌ | 방향/기준 (남향, 동향 등) |
| heatMethod | string | ❌ | 난방방식 (개별난방, 중앙난방 등) |
| heatFuel | string | ❌ | 난방연료 (도시가스, 기름 등) |
| entrStruct | string | ❌ | 현관구조 (계단식, 복도식 등) |
| buidStruct | string | ❌ | 건물구조 (철근콘크리트 등) |
| balcExt | string | ❌ | 발코니확장 (Y/N) |
| floor1 | int | ❌ | 해당층 |
| floor2 | int | ❌ | 탑층 |
| pkCnt | decimal | ❌ | 가구당 주차대수 |
| maintCost | int | ❌ | 관리비 (원) |
| maintDtl | string | ❌ | 관리비 내역 |
| saleAmt | int | ❌ | 매매가 (원) |
| lesAmt | int | ❌ | 전세가 (원) |
| protAmt | int | ❌ | 보증금 (원) |
| monAmt | int | ❌ | 월세 (원) |
| etcAmt | int | ❌ | 기타임대 (원) |
| layAmt | int | ❌ | 깔세 (원) |
| nowDepAmt | int | ❌ | 현보증금 (원) |
| nowMonAmt | int | ❌ | 현월차임 (원) |
| loanAmt | int | ❌ | 융자금 (원) |
| loanAmtAft | int | ❌ | 잔금후융자금 (원) |
| mtryDate | string | ❌ | 만기일 (YYYY-MM-DD) |
| exptMovDate | string | ❌ | 이사예정일 (YYYY-MM-DD) |
| exptDate | string | ❌ | 입주예정일 (YYYY-MM-DD) |
| exptComDate | string | ❌ | 준공예정일 (YYYY-MM-DD) |
| compYear | string | ❌ | 준공년도 (YYYY) |
| shaYn | string | ❌ | 공유 여부 (Y/N) |
| custNo | long | ❌ | 고객번호(소유자) |
| offNo | long | ❌ | 중개사무소번호 |
| rtNo | string | ❌ | 중개인번호 |
| cnNo | int | ❌ | 계약번호 |
| **mvnPsbYn** | string | ❌ | **즉시입주 가능여부 (Y/N)** |
| **houseRental** | string | ❌ | **전세자금대출/임대주택 여부 (Y/N)** |
| **petYn** | string | ❌ | **반려동물 허용여부 (Y/N)** |
| **top** | string | ❌ | **탑층여부 (Y/N)** |
| **ptMemo** | string | ❌ | **물건 메모** |
| userId | string | ❌ | 등록자 ID |
| **holders** | array | ❌ | **소유주/임차인 정보 배열** |

### Holders 배열 필드 (PropertyHolderDto)
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| holderIdx | int | ❌ | 소유주 인덱스 (등록 시 null, 자동 채번) |
| holderType | string | ❌ | 소유주 유형 (소유주, 임차인 등) |
| holderRegDate | string | ❌ | 등록일 (YYYY-MM-DD) |
| holderName | string | ❌ | 이름 |
| holderPhone | string | ❌ | 연락처 |
| custNo | long | ❌ | 고객번호 (고객 테이블 연계) |
| holderRelation | string | ❌ | 관계 (본인, 배우자, 자녀 등) |
| holderMemo | string | ❌ | 메모 |

### Response
```json
{
  "success": true,
  "message": "물건정보 등록 성공",
  "data": true
}
```

### Error Response
```json
{
  "success": false,
  "message": "물건정보 등록 실패",
  "errorCode": "INSERT_FAILED"
}
```

---

## 4. 물건 정보 수정

### Endpoint
```
PUT /api/property/{PtNo}
```

### Request Parameters
**Path Parameter:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| PtNo | int | ✅ | 물건번호 |

### Request Body
```json
{
  "ptName": "강남 아파트",
  "prgSts": "계약완료",
  "ptSts": "거래완료",
  "saleAmt": 1550000000,
  "mvnPsbYn": "N",
  "ptMemo": "거래 완료됨",
  "userId": "admin",
  "holders": [
    {
      "holderIdx": 1,
      "holderName": "홍길동",
      "holderPhone": "010-1234-5678"
    }
  ]
}
```

### Request Body Fields
모든 필드는 선택사항이며, 등록 API와 동일한 필드를 사용합니다.
수정하고자 하는 필드만 포함하여 요청하면 됩니다.

**Holders 배열 처리 규칙:**
- `holderIdx`가 있으면 기존 데이터 수정
- `holderIdx`가 없으면 신규 데이터 추가
- 요청에 포함되지 않은 기존 Holder는 삭제됨
- `holders` 필드를 null 또는 빈 배열로 보내면 모든 Holder 삭제

### Response
```json
{
  "success": true,
  "message": "물건정보 수정 성공",
  "data": true
}
```

### Error Response
```json
{
  "success": false,
  "message": "물건정보 수정 실패",
  "errorCode": "INSERT_FAILED"
}
```

---

## 5. 물건 정보 삭제

### Endpoint
```
DELETE /api/property/{PtNo}
```

### Request Parameters
**Path Parameter:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| PtNo | int | ✅ | 물건번호 |

**Query String:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| UserId | string | ❌ | 삭제자 ID |

### Response
```json
{
  "success": true,
  "message": "물건정보 삭제 성공",
  "data": true
}
```

### Error Response
```json
{
  "success": false,
  "message": "물건정보 삭제 실패",
  "errorCode": "INSERT_FAILED"
}
```

---

## 공통 응답 형식

### 성공 응답
```json
{
  "success": true,
  "message": "성공 메시지",
  "data": { /* 응답 데이터 */ }
}
```

### 실패 응답
```json
{
  "success": false,
  "message": "에러 메시지",
  "errorCode": "ERROR_CODE"
}
```

### 유효성 검증 실패
```json
{
  "success": false,
  "message": "요청 형식이 올바르지 않습니다."
}
```

---

## 참고사항

1. **페이징**: 조회 API는 페이징을 지원하며, `Page`와 `PageSize` 파라미터로 제어합니다.
2. **물건번호**: 물건번호는 600000000부터 시작합니다.
3. **날짜 형식**: 모든 날짜 필드는 "YYYY-MM-DD" 형식의 문자열입니다.
4. **금액 단위**: 모든 금액 필드는 원(KRW) 단위입니다.
5. **면적 단위**: 모든 면적 필드는 제곱미터(㎡) 단위입니다.
6. **부분 수정**: 수정 API는 요청 본문에 포함된 필드만 업데이트하며, null 값은 기존 값을 유지합니다.
7. **필수 필드**: 등록 시 `ptName`, `prgSts`, `ptSts`는 필수 입력 항목입니다.
8. **단지 필터링**: 목록 조회 시 `danjiCode`를 사용하여 특정 단지의 물건만 조회할 수 있습니다.
9. **사용자 단지 목록**: `offNo` 파라미터가 있을 때 해당 사용자가 등록한 단지 목록이 `userDanjis`에 포함됩니다.
10. **Holders 동기화**: 물건 등록/수정 시 Holders 배열을 함께 전송하면 자동으로 동기화됩니다.

---

## 주요 코드값

### 진행상태 (prgSts)
- 진행중
- 계약완료
- 거래완료
- 취소

### 물건상태 (ptSts)
- 매물등록
- 협의중
- 계약진행
- 거래완료

### 거래구분 (saleDiv)
- 매매
- 전세
- 월세
- 단기임대

### 물건종류 (ptType)
- 아파트
- 오피스텔
- 빌라
- 단독주택
- 다세대주택
- 상가
- 토지
- 분양권

### Y/N 필드
- Y: 예/허용/해당
- N: 아니오/불허/미해당

**적용 필드:**
- shaYn: 공유 여부
- balcExt: 발코니확장
- mvnPsbYn: 즉시입주 가능여부
- houseRental: 전세자금대출/임대주택 여부
- petYn: 반려동물 허용여부
- top: 탑층여부

---

## 프론트엔드 연동 가이드

### 물건 목록 조회 예시 (React)
```javascript
const fetchPropertyList = async (filters) => {
  const params = new URLSearchParams({
    Page: filters.page || 1,
    PageSize: filters.pageSize || 20,
  });

  if (filters.offNo) params.append('offNo', filters.offNo);
  if (filters.rtNo) params.append('rtNo', filters.rtNo);
  if (filters.danjiCode) params.append('danjiCode', filters.danjiCode);

  const response = await fetch(`/api/property/GetPropertyList?${params}`);
  const result = await response.json();

  if (result.success) {
    const { ptSales, userDanjis } = result.data;
    // ptSales: 물건 목록
    // userDanjis: 사용자 단지 목록 (필터링용)
    return result.data;
  }
};
```

### 물건 등록 예시 (React)
```javascript
const createProperty = async (propertyData) => {
  const response = await fetch('/api/property', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...propertyData,
      holders: [
        {
          holderType: '소유주',
          holderName: '홍길동',
          holderPhone: '010-1234-5678',
          holderRelation: '본인'
        }
      ]
    })
  });

  const result = await response.json();
  return result.success;
};
```

### Holders 수정 예시
```javascript
// 기존 Holder 수정
const updateHolders = {
  holders: [
    { holderIdx: 1, holderName: '홍길동 수정', holderPhone: '010-1111-2222' },
    { holderIdx: 2, holderMemo: '메모 업데이트' },
    { holderName: '신규 추가', holderPhone: '010-3333-4444' } // holderIdx 없음 = 신규
  ]
};

// 모든 Holder 삭제
const deleteAllHolders = { holders: [] };
```
