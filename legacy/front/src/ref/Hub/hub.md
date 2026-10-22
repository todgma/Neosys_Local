# 공동중개망 (Hub) API 명세서

## 개요
공동중개망은 고객(CUST) 또는 물건(PT) 정보를 통합 관리하는 시스템입니다.
- 하나의 테이블에서 고객/물건 정보를 구분하여 저장
- 실제 고객테이블(ct_cust), 물건테이블(pt_sale)과 연동 가능
- UPDATE/DELETE 자동 로그 기록

---

## API 엔드포인트

### 1. 공동중개망 목록 조회 (페이징)

**Endpoint:** `GET /api/Hub`

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| TradeId | long | ❌ | - | 공동중개망 ID |
| TradeDiv | string | ❌ | - | 등록유형 (`CUST`: 고객, `PT`: 물건) |
| OffNo | string | ❌ | - | 사무소번호 |
| TradeState | string | ❌ | - | 거래상태 (`active`, `matching`, `completed` 등) |
| CustNo | string | ❌ | - | 고객번호 |
| PtNo | string | ❌ | - | 물건번호 |
| RegDtFr | datetime | ❌ | - | 등록일 시작 (YYYY-MM-DD) |
| RegDtTo | datetime | ❌ | - | 등록일 종료 (YYYY-MM-DD) |
| Page | int | ✅ | 1 | 페이지 번호 |
| PageSize | int | ✅ | 20 | 페이지 크기 |

**Response:**
```json
{
  "success": true,
  "message": "공동중개망 목록 조회 성공",
  "data": {
    "items": [
      {
        "tradeId": 1,
        "tradeDiv": "CUST",
        "custNo": "C001",
        "ptNo": null,
        "regUserId": "user01",
        "offNo": "1001",
        "regDt": "2025-01-15T10:00:00Z",
        "updDt": null,
        "isCustRegistered": false,
        "isPtRegistered": false,
        "tradeState": "active",
        "tradeStateDesc": "신규 등록",

        // 고객정보 필드 (TradeDiv='CUST'일 때)
        "custType": "buyer",
        "custName": "홍길동",
        "custAlias": "홍사장",
        "custTel": "010-1234-5678",
        "custAddr": "서울시 강남구",
        "custMemo": "급매 원함",
        "custRentBsnYn": "N",
        "custTrdPrg": "searching",
        "custWantType": "아파트",
        "custExcAreaFr": 84.0,
        "custExcAreaTo": 120.0,
        "custRegion1": "서울특별시",
        "custRegion2": "강남구",
        "custRegion3": "역삼동",
        "custTrdType": "매매",
        "custTrdTypeDetail": "매매,전세",
        "custSaleAmtFr": 500000000,
        "custSaleAmtTo": 800000000,
        "custLesAmtFr": null,
        "custLesAmtTo": null,
        "custProtAmtFr": null,
        "custProtAmtTo": null,
        "custMonAmtFr": null,
        "custMonAmtTo": null,
        "custEtcProtAmtFr": null,
        "custEtcProtAmtTo": null,
        "custEtcMonAmtFr": null,
        "custEtcMonAmtTo": null,
        "custEtcType": null,
        "custMoveinYn": "Y",
        "custMoveDateFr": "2025-03-01",
        "custMoveDateTo": "2025-06-01",
        "custCashAblt": 300000000,
        "custRmk": "빠른 진행 희망",

        // 물건정보 필드 (TradeDiv='PT'일 때)
        "pPtName": null,
        "pPtType": null,
        "pSaleDiv": null,
        "pSaleAmt": null,
        "pNowDepAmt": null,
        "pNowMonAmt": null,
        "pExcArea": null,
        "pSupArea": null,
        "pAddrFull": null,
        "pDong": null,
        "pHo": null,
        "pFloor1": null,
        "pFloor2": null,
        "pFloorDesc": null,
        "pDirStd": null,
        "pBalcExt": null,
        "pRoomCnt": null,
        "pBathCnt": null,
        "pPkCnt": null,
        "pMaintCost": null,
        "pHeatMethod": null,
        "pHeatFuel": null,
        "pHeatSystem": null,
        "pBuidStruct": null,
        "immediateMoveinYn": null,
        "pExptDate": null,
        "pPrgSts": null,
        "pOpt": null,
        "pPtExpl": null,
        "pCompYear": null,
        "ownerRentBsnYn": null,
        "tradeStatus": "Y"
      }
    ],
    "totalCount": 156
  }
}
```

**사용 예시:**
```javascript
// 고객 정보만 조회
GET /api/Hub?TradeDiv=CUST&Page=1&PageSize=20

// 물건 정보만 조회
GET /api/Hub?TradeDiv=PT&Page=1&PageSize=20

// 특정 사무소의 활성 거래 조회
GET /api/Hub?OffNo=1001&TradeState=active&Page=1&PageSize=20

// 날짜 범위로 조회
GET /api/Hub?RegDtFr=2025-01-01&RegDtTo=2025-01-31&Page=1&PageSize=20
```

---

### 2. 최근 N개 공동중개망 조회

**Endpoint:** `GET /api/Hub/recent`

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| TradeDiv | string | ❌ | - | 등록유형 (`CUST`, `PT`) |
| OffNo | string | ❌ | - | 사무소번호 |
| TradeState | string | ❌ | - | 거래상태 |
| RecentCnt | int | ❌ | 10 | 조회할 개수 |

**Response:**
```json
{
  "success": true,
  "message": "최근 공동중개망 조회 성공",
  "data": {
    "items": [ /* TradeInfo 객체 배열 */ ],
    "totalCount": 10
  }
}
```

**사용 예시:**
```javascript
// 최근 고객 10건
GET /api/Hub/recent?TradeDiv=CUST&RecentCnt=10

// 특정 사무소의 최근 물건 5건
GET /api/Hub/recent?TradeDiv=PT&OffNo=1001&RecentCnt=5
```

---

### 3. 공동중개망 신규 등록

**Endpoint:** `POST /api/Hub`

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| UserId | string | ✅ | - | 등록자 ID |
| AutoRegisterCustomer | bool | ❌ | false | 고객 테이블 자동 등록 여부 |
| AutoRegisterProperty | bool | ❌ | false | 물건 테이블 자동 등록 여부 |

**Request Body (고객 등록 예시):**
```json
{
  "tradeDiv": "CUST",
  "offNo": "1001",
  "custNo": null,
  "ptNo": null,
  "isCustRegistered": false,
  "isPtRegistered": false,
  "tradeState": "active",
  "tradeStateDesc": "신규 고객 접수",

  // 고객정보 필드
  "custType": "buyer",
  "custName": "홍길동",
  "custAlias": "홍사장",
  "custTel": "010-1234-5678",
  "custAddr": "서울시 강남구 역삼동",
  "custMemo": "급매 원함",
  "custRentBsnYn": "N",
  "custTrdPrg": "searching",
  "custWantType": "아파트",
  "custExcAreaFr": 84.0,
  "custExcAreaTo": 120.0,
  "custRegion1": "서울특별시",
  "custRegion2": "강남구",
  "custRegion3": "역삼동",
  "custTrdType": "매매",
  "custTrdTypeDetail": "매매,전세",
  "custSaleAmtFr": 500000000,
  "custSaleAmtTo": 800000000,
  "custMoveinYn": "Y",
  "custMoveDateFr": "2025-03-01",
  "custMoveDateTo": "2025-06-01",
  "custCashAblt": 300000000,
  "custRmk": "빠른 진행 희망",
  "tradeStatus": "Y"
}
```

**Request Body (물건 등록 예시):**
```json
{
  "tradeDiv": "PT",
  "offNo": "1001",
  "custNo": null,
  "ptNo": null,
  "isCustRegistered": false,
  "isPtRegistered": false,
  "tradeState": "active",
  "tradeStateDesc": "신규 물건 등록",

  // 물건정보 필드
  "pPtName": "래미안강남아파트",
  "pPtType": "아파트",
  "pSaleDiv": "매매",
  "pSaleAmt": 1200000000,
  "pNowDepAmt": null,
  "pNowMonAmt": null,
  "pExcArea": 84.5,
  "pSupArea": 112.3,
  "pAddrFull": "서울특별시 강남구 역삼동 123-45",
  "pDong": "101",
  "pHo": "1501",
  "pFloor1": 15,
  "pFloor2": 25,
  "pFloorDesc": "중층",
  "pDirStd": "남향",
  "pBalcExt": "Y",
  "pRoomCnt": 3,
  "pBathCnt": 2,
  "pPkCnt": 1.5,
  "pMaintCost": 250000,
  "pHeatMethod": "지역난방",
  "pHeatFuel": "도시가스",
  "pHeatSystem": "열병합",
  "pBuidStruct": "계단식",
  "immediateMoveinYn": "Y",
  "pExptDate": null,
  "pPrgSts": "available",
  "pOpt": "빌트인냉장고,식기세척기,에어컨3대",
  "pPtExpl": "역세권 역삼역 5분거리, 학군우수",
  "pCompYear": "2020",
  "ownerRentBsnYn": "N",
  "tradeStatus": "Y"
}
```

**Response:**
```json
{
  "success": true,
  "message": "공동중개망 등록 성공",
  "data": {
    "tradeId": 157,
    "tradeDiv": "CUST",
    // ... (등록된 전체 데이터)
  }
}
```

---

### 4. 공동중개망 수정

**Endpoint:** `PUT /api/Hub/{TradeId}`

**Path Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| TradeId | long | ✅ | 공동중개망 ID |

**Request Body:**
```json
{
  "tradeState": "matching",
  "tradeStateDesc": "매칭 진행중",
  "custName": "홍길동(수정)",
  "custTel": "010-9999-8888",
  "custSaleAmtFr": 600000000,
  "custSaleAmtTo": 900000000
  // ... 수정할 필드만 포함 (null 제외)
}
```

**Response:**
```json
{
  "success": true,
  "message": "공동중개망 수정 성공",
  "data": {
    "tradeId": 157,
    "updDt": "2025-01-15T15:30:00Z",
    // ... (수정된 전체 데이터)
  }
}
```

**참고:**
- 수정 시 자동으로 `rt_trade_info_log` 테이블에 이전 데이터가 로깅됩니다.
- NULL이 아닌 필드만 수정됩니다 (COALESCE 처리).

---

### 5. 공동중개망 삭제

**Endpoint:** `DELETE /api/Hub/{TradeId}`

**Path Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| TradeId | long | ✅ | 공동중개망 ID |

**Response:**
```json
{
  "success": true,
  "message": "공동중개망 삭제 성공",
  "data": true
}
```

**참고:**
- **논리 삭제** 방식: `trade_status`를 `'N'`으로 변경
- 실제 데이터는 삭제되지 않음
- 삭제 전 데이터는 `rt_trade_info_log` 테이블에 자동 로깅됨

---

## 데이터 구조

### TradeInfo 주요 필드

#### 공통 필드
| 필드명 | 타입 | 설명 |
|-------|------|------|
| tradeId | long | 공동중개망 고유 ID (PK, Auto Increment) |
| tradeDiv | string | 등록유형 (`CUST`: 고객, `PT`: 물건) |
| custNo | string | 고객번호 (ct_cust 연동용) |
| ptNo | string | 물건번호 (pt_sale 연동용) |
| regUserId | string | 등록자 ID |
| offNo | string | 사무소번호 |
| regDt | datetime | 등록일시 |
| updDt | datetime | 수정일시 |
| isCustRegistered | bool | 고객테이블 실제 등록 여부 |
| isPtRegistered | bool | 물건테이블 실제 등록 여부 |
| tradeState | string | 거래상태 (`active`, `matching`, `completed` 등) |
| tradeStateDesc | string | 상태 설명 메모 |
| tradeStatus | string | 사용여부 (`Y`, `N`) |

#### 고객정보 필드 (TradeDiv='CUST'일 때 사용)
| 필드명 | 타입 | 설명 |
|-------|------|------|
| custType | string | 고객유형 (소유주/구매자/임차인) |
| custName | string | 고객 이름 |
| custAlias | string | 고객 별칭 |
| custTel | string | 전화번호 |
| custAddr | string | 주소 |
| custMemo | string | 메모 |
| custRentBsnYn | char | 주택임대사업자 여부 (Y/N) |
| custTrdPrg | string | 고객 진행상태 |
| custWantType | string | 희망 물건 종류 (아파트/오피스텔 등) |
| custExcAreaFr | decimal | 전용면적 From (㎡) |
| custExcAreaTo | decimal | 전용면적 To (㎡) |
| custRegion1 | string | 지역1 (시/도) |
| custRegion2 | string | 지역2 (시/군/구) |
| custRegion3 | string | 지역3 (동/읍/면) |
| custTrdType | string | 거래구분 (매매/전세/월세/기타) |
| custTrdTypeDetail | string | 거래유형 상세 (다중 선택) |
| custSaleAmtFr | decimal | 희망 매매가 From |
| custSaleAmtTo | decimal | 희망 매매가 To |
| custLesAmtFr | decimal | 희망 전세가 From |
| custLesAmtTo | decimal | 희望 전세가 To |
| custProtAmtFr | decimal | 희망 보증금 From |
| custProtAmtTo | decimal | 희망 보증금 To |
| custMonAmtFr | decimal | 희망 월차임 From |
| custMonAmtTo | decimal | 희망 월차임 To |
| custEtcProtAmtFr | decimal | 기타 보증금 From |
| custEtcProtAmtTo | decimal | 기타 보증금 To |
| custEtcMonAmtFr | decimal | 기타 차임 From |
| custEtcMonAmtTo | decimal | 기타 차임 To |
| custEtcType | string | 기타 임차 형태 |
| custMoveinYn | char | 매매 시 입주 여부 (Y/N) |
| custMoveDateFr | date | 이사예정일 From |
| custMoveDateTo | date | 이사예정일 To |
| custCashAblt | decimal | 고객 현금여력 |
| custRmk | string | 기타사항 |

#### 물건정보 필드 (TradeDiv='PT'일 때 사용)
| 필드명 | 타입 | 설명 |
|-------|------|------|
| pPtName | string | 물건명 |
| pPtType | string | 물건종류 (아파트/오피스텔 등) |
| pSaleDiv | string | 거래구분 (매매/전세/월세) |
| pSaleAmt | decimal | 매매가 |
| pNowDepAmt | decimal | 현보증금 |
| pNowMonAmt | decimal | 현월차임 |
| pExcArea | decimal | 전용면적 (㎡) |
| pSupArea | decimal | 공급면적 (㎡) |
| pAddrFull | string | 전체 주소 |
| pDong | string | 동 |
| pHo | string | 호수 |
| pFloor1 | int | 해당층 |
| pFloor2 | int | 탑층 |
| pFloorDesc | string | 층 설명 (중층/저층) |
| pDirStd | string | 방향 (남향/거실창) |
| pBalcExt | string | 발코니확장 여부 |
| pRoomCnt | int | 방 수 |
| pBathCnt | int | 욕실 수 |
| pPkCnt | decimal | 가구당 주차대수 |
| pMaintCost | decimal | 관리비 |
| pHeatMethod | string | 난방방식 (지역/중앙/개별) |
| pHeatFuel | string | 난방연료 (도시가스 등) |
| pHeatSystem | string | 열원 (열병합/지역난방) |
| pBuidStruct | string | 건물구조 (계단식 등) |
| immediateMoveinYn | char | 즉시입주 여부 (Y/N) |
| pExptDate | date | 입주예정일 |
| pPrgSts | string | 물건 진행상태 |
| pOpt | string | 옵션사항 |
| pPtExpl | string | 물건설명 |
| pCompYear | string | 준공년도 (YYYY) |
| ownerRentBsnYn | char | 소유자 임대사업자 여부 (Y/N) |

---

## 코드 값 (Code Values)

### TradeDiv (등록유형)
- `CUST`: 고객
- `PT`: 물건

### TradeState (거래상태) - 예시
- `active`: 활성
- `matching`: 매칭중
- `completed`: 완료
- `canceled`: 취소
- `hold`: 보류

### CustType (고객유형) - 예시
- `owner`: 소유주
- `buyer`: 구매자
- `tenant`: 임차인

### CustTrdType / PSaleDiv (거래구분)
- `매매`: 매매
- `전세`: 전세
- `월세`: 월세
- `기타`: 기타

### TradeStatus (사용여부)
- `Y`: 사용
- `N`: 미사용 (삭제됨)

---

## 데이터베이스 스키마

### 테이블
1. **rt_trade_info** - 공동중개망 메인 테이블
2. **rt_trade_info_log** - 공동중개망 로그 테이블 (UPDATE/DELETE 이력)

### 인덱스
- `idx_rt_trade_info_trade_div` - TradeDiv
- `idx_rt_trade_info_off_no` - OffNo
- `idx_rt_trade_info_cust_no` - CustNo (Partial)
- `idx_rt_trade_info_pt_no` - PtNo (Partial)
- `idx_rt_trade_info_trade_state` - TradeState
- `idx_rt_trade_info_reg_dt` - RegDt (DESC)

### 트리거
- **trg_rt_trade_info_log_before_ud** - UPDATE/DELETE 시 자동 로그 저장

---

## 주요 특징

### 1. 통합 관리
- 고객과 물건 정보를 하나의 테이블에서 관리
- `TradeDiv` 필드로 구분
- 향후 고객/물건 테이블로 자동 등록 가능 (TODO)

### 2. 페이징 지원
- Page, PageSize 기반 페이징
- TotalCount 자동 계산 및 반환

### 3. 최근 N개 조회
- 등록일시(RegDt) 기준 최신순 정렬
- 필터 조건과 함께 사용 가능

### 4. 자동 로그 기록
- UPDATE/DELETE 시 이전 데이터를 `rt_trade_info_log`에 자동 저장
- 데이터 변경 이력 추적 가능

### 5. 논리 삭제
- 실제 DELETE 대신 `trade_status='N'` 업데이트
- 데이터 복구 및 이력 관리 용이

### 6. 단일 함수 처리
- `fn_rt_trade_info` 함수가 모든 CRUD 작업 처리
- MODE 파라미터로 분기 (SEL/RECENT/INS/UPD/DEL)

---

## 에러 처리

### 에러 응답 형식
ResponseHelper를 통해 표준화된 에러 응답을 반환합니다.

```json
{
  "success": false,
  "message": "에러 메시지",
  "data": null
}
```

### 주요 에러 메시지
- `VALIDATION_ERROR`: 요청 형식이 올바르지 않습니다.
- `INSERT_FAILED`: 공동중개망 등록 실패
- `UPDATE_FAILED`: 공동중개망 수정 실패
- `DELETE_FAILED`: 공동중개망 삭제 실패

### 에러 처리 방식
컨트롤러에서 `ResponseHelper.Error()` 호출 시 ApiException이 발생하며, GlobalExceptionHandler에서 통일된 형식으로 변환하여 응답합니다.

**예시:**
```csharp
// Controller
if (result == null)
{
    ResponseHelper.Error("INSERT_FAILED", "공동중개망 등록 실패");
}

// 클라이언트 응답
{
  "success": false,
  "message": "공동중개망 등록 실패",
  "data": null
}
```

---

## 사용 예시 (JavaScript/TypeScript)

### 1. 목록 조회
```javascript
const getTradeList = async (page = 1, pageSize = 20, filters = {}) => {
  const params = new URLSearchParams({
    Page: page,
    PageSize: pageSize,
    ...filters
  });

  const response = await fetch(`/api/Hub?${params}`);
  const result = await response.json();

  return result.data; // { items: [], totalCount: 0 }
};

// 사용
const data = await getTradeList(1, 20, {
  TradeDiv: 'CUST',
  OffNo: '1001',
  TradeState: 'active'
});
```

### 2. 최근 N개 조회
```javascript
const getRecentTrades = async (recentCnt = 10, tradeDiv = null) => {
  const params = new URLSearchParams({
    RecentCnt: recentCnt
  });

  if (tradeDiv) params.append('TradeDiv', tradeDiv);

  const response = await fetch(`/api/Hub/recent?${params}`);
  const result = await response.json();

  return result.data.items;
};

// 사용
const recentCustomers = await getRecentTrades(10, 'CUST');
```

### 3. 등록
```javascript
const createTrade = async (data, userId) => {
  const response = await fetch(`/api/Hub?UserId=${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await response.json();
  return result.data;
};

// 사용 (고객 등록)
const newCustomer = await createTrade({
  tradeDiv: 'CUST',
  offNo: '1001',
  custName: '홍길동',
  custTel: '010-1234-5678',
  custWantType: '아파트',
  custSaleAmtFr: 500000000,
  custSaleAmtTo: 800000000
}, 'user01');
```

### 4. 수정
```javascript
const updateTrade = async (tradeId, updateData) => {
  const response = await fetch(`/api/Hub/${tradeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  });

  const result = await response.json();
  return result.data;
};

// 사용
const updated = await updateTrade(157, {
  tradeState: 'matching',
  tradeStateDesc: '매칭 진행중',
  custSaleAmtFr: 600000000
});
```

### 5. 삭제
```javascript
const deleteTrade = async (tradeId) => {
  const response = await fetch(`/api/Hub/${tradeId}`, {
    method: 'DELETE'
  });

  const result = await response.json();
  return result.success;
};

// 사용
await deleteTrade(157);
```

---

## SQL 파일

### DDL/DML 파일 위치
```
Hub/sql/
├── 01_rt_trade_info_ddl.sql          - 메인 테이블 생성
├── 02_rt_trade_info_log_ddl.sql      - 로그 테이블 생성
├── 03_rt_trade_info_trigger.sql      - 트리거 생성
└── 04_fn_rt_trade_info.sql           - 통합 함수 생성
```

### 실행 순서
1. `01_rt_trade_info_ddl.sql` - 메인 테이블 및 인덱스 생성
2. `02_rt_trade_info_log_ddl.sql` - 로그 테이블 생성
3. `03_rt_trade_info_trigger.sql` - 트리거 생성
4. `04_fn_rt_trade_info.sql` - 통합 함수 생성

---

## 향후 개발 사항 (TODO)

1. **자동 등록 기능**
   - `AutoRegisterCustomer=true` 시 `ct_cust` 테이블에 자동 등록
   - `AutoRegisterProperty=true` 시 `pt_sale` 테이블에 자동 등록
   - 함수 내 주석 처리된 부분 구현 필요

2. **매칭 기능**
   - 고객(CUST)과 물건(PT) 자동 매칭 알고리즘
   - 조건 기반 매칭 (지역, 가격대, 면적 등)

3. **알림 기능**
   - 새로운 매칭 발생 시 알림
   - 거래 상태 변경 시 알림

4. **통계 API**
   - 사무소별/기간별 거래 통계
   - 매칭률, 성사율 등

---

## 문의 및 지원

프로젝트 관련 문의사항은 개발팀에 문의해주세요.

**버전:** 1.0
**최종 수정일:** 2025-01-15
