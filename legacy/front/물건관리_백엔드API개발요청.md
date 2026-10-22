# 물건관리 백엔드 API 개발 요청서

## 개요
물건관리 페이지의 물건 유형별 조회 및 단지 그룹핑 기능을 위한 API 개발이 필요합니다.

---

## 1. 물건 유형별 조회 API 개선

### 현재 상태
- 기존 `/api/property/GetPropertyList` API는 물건명(`ptName`)으로만 검색 가능
- 물건 유형(`ptType`) 필터링 기능 없음

### 요청사항
기존 API의 Query Parameter에 물건 유형 필터 추가

#### Endpoint
```
GET /api/property/GetPropertyList
```

#### Request Parameters (추가 필요)
| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|---------|------|------|------|--------|
| ptType | string | ❌ | 물건종류 필터 | - |

**ptType 값:**
- `apartment` - 아파트·분양권
- `officetel` - 오피스텔·분양권
- `store` - 상가
- `office` - 사무실
- `building` - 건물
- `land` - 토지
- `knowledge-industry` - 지식산업센터

#### 사용 예시
```
GET /api/property/GetPropertyList?ptType=apartment&Page=1&PageSize=20
```

---

## 2. 단지별 물건 그룹핑 API

### 요구사항
아파트와 오피스텔의 경우, 단지별로 물건을 그룹핑하여 표시해야 함

### 2-1. 단지 목록 조회 API

#### Endpoint
```
GET /api/property/GetComplexList
```

#### Request Parameters
| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|---------|------|------|------|--------|
| ptType | string | ✅ | 물건종류 (apartment, officetel만 가능) | - |
| Page | int | ❌ | 페이지 번호 | 1 |
| PageSize | int | ❌ | 페이지당 항목 수 | 100 |

#### Response
```json
{
  "success": true,
  "message": "단지 목록 조회 성공",
  "data": {
    "complexes": [
      {
        "danjiCode": "11680",
        "danjiName": "래미안아파트",
        "ptType": "apartment",
        "propertyCount": 15,
        "addr1": "서울특별시",
        "addr2": "강남구",
        "addr3": "역삼동"
      },
      {
        "danjiCode": "11681",
        "danjiName": "푸르지오아파트",
        "ptType": "apartment",
        "propertyCount": 8,
        "addr1": "서울특별시",
        "addr2": "강남구",
        "addr3": "대치동"
      }
    ],
    "totalCount": 2
  }
}
```

### 2-2. 단지별 물건 조회 API

#### 요청사항
기존 `/api/property/GetPropertyList` API에 단지코드 필터 추가

#### Request Parameters (추가 필요)
| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|---------|------|------|------|--------|
| danjiCode | string | ❌ | 단지코드 | - |

#### 사용 예시
```
GET /api/property/GetPropertyList?ptType=apartment&danjiCode=11680&Page=1&PageSize=20
```

---

## 3. 물건 조회 API 응답 데이터 보완

### 현재 문제점
- 응답 데이터에 `totalCount` 누락
- 페이징 처리를 위한 전체 개수 정보 필요

### 요청사항
응답 데이터에 전체 개수 추가

#### Response (수정 필요)
```json
{
  "success": true,
  "message": "물건정보 목록 조회 성공",
  "data": {
    "ptSales": [
      { /* 물건 데이터 */ }
    ],
    "totalCount": 150,
    "currentPage": 1,
    "pageSize": 20,
    "totalPages": 8
  }
}
```

---

## 4. 물건 등록/수정 시 필드 검증

### 요청사항
다음 필드들의 유효성 검증 추가

#### 필수 필드
- `ptName` (물건명) - 필수
- `prgSts` (진행상태) - 필수
- `ptSts` (물건상태) - 필수
- `ptType` (물건종류) - 필수

#### 조건부 필수 필드
**아파트/오피스텔인 경우:**
- `danjiCode` (단지코드) - 필수
- `dong` (동) - 권장
- `ho` (호) - 권장

**계약 관련 정보 입력 시:**
- `cnNo` (계약번호)가 있으면 다음 필드 필수:
  - `cnDt` (계약일)
  - `cnType` (거래종류)
  - `tradeAmt` (매매금액)

---

## 5. 단지 정보 등록/수정 API

### 배경
단지코드(`danjiCode`)가 물건에 필수이므로, 단지 정보를 먼저 등록할 수 있어야 함

### 5-1. 단지 정보 등록

#### Endpoint
```
POST /api/complex
```

#### Request Body
```json
{
  "danjiCode": "11680",
  "danjiName": "래미안아파트",
  "ptType": "apartment",
  "addr1": "서울특별시",
  "addr2": "강남구",
  "addr3": "역삼동",
  "addr4": "123-45",
  "addrPost": "06234",
  "bjdCode": "1168010100",
  "houseCnt": 500,
  "compYear": "2020",
  "userId": "admin"
}
```

#### Response
```json
{
  "success": true,
  "message": "단지 정보 등록 성공",
  "data": {
    "danjiCode": "11680"
  }
}
```

### 5-2. 단지 정보 조회 (상세)

#### Endpoint
```
GET /api/complex/{danjiCode}
```

#### Response
```json
{
  "success": true,
  "message": "단지 정보 조회 성공",
  "data": {
    "danjiCode": "11680",
    "danjiName": "래미안아파트",
    "ptType": "apartment",
    "addr1": "서울특별시",
    "addr2": "강남구",
    "addr3": "역삼동",
    "addr4": "123-45",
    "addrPost": "06234",
    "bjdCode": "1168010100",
    "houseCnt": 500,
    "compYear": "2020",
    "propertyCount": 15,
    "regDt": "2024-01-15T10:30:00",
    "regId": "admin"
  }
}
```

---

## 6. 기타 요청사항

### 6-1. 물건 조회 시 정렬 옵션
```
GET /api/property/GetPropertyList?sortBy=regDt&sortOrder=desc
```

**sortBy 옵션:**
- `regDt` - 등록일
- `updDt` - 수정일
- `saleAmt` - 매매가
- `ptName` - 물건명

**sortOrder:**
- `asc` - 오름차순
- `desc` - 내림차순 (기본값)

### 6-2. 다중 검색 조건
현재 `ptName`만 검색 가능한데, 다음 조건 추가:
- `addr1`, `addr2`, `addr3` - 주소 검색
- `saleAmtMin`, `saleAmtMax` - 가격 범위
- `supAreaMin`, `supAreaMax` - 면적 범위

---

## 우선순위

### 🔴 긴급 (이번 주 내)
1. ✅ 물건 유형별 조회 (`ptType` 파라미터 추가)
2. ✅ 단지코드 필터링 (`danjiCode` 파라미터 추가)
3. ✅ 응답 데이터에 `totalCount` 추가

### 🟡 중요 (다음 주)
4. 단지 목록 조회 API (`GET /api/property/GetComplexList`)
5. 단지 정보 등록/조회 API (`POST/GET /api/complex`)

### 🟢 보통 (추후)
6. 정렬 옵션 추가
7. 다중 검색 조건 추가

---

## 테스트 시나리오

### 시나리오 1: 아파트 물건 조회
```
1. GET /api/property/GetPropertyList?ptType=apartment
   → 모든 아파트 물건 조회

2. GET /api/property/GetComplexList?ptType=apartment
   → 아파트 단지 목록 조회

3. GET /api/property/GetPropertyList?ptType=apartment&danjiCode=11680
   → 특정 단지의 물건 조회
```

### 시나리오 2: 물건 등록 (아파트)
```
1. GET /api/complex/11680
   → 단지 정보 확인 (없으면 먼저 등록)

2. POST /api/complex (단지 없을 경우)
   → 단지 정보 등록

3. POST /api/property
   → 물건 등록 (danjiCode=11680 포함)
```

---

## 참고사항

### DB 스키마 확인 필요
- `ptSales` 테이블에 `danjiCode` 컬럼 존재 여부
- `complex` 테이블 존재 여부 (없으면 생성 필요)
- 인덱스: `ptType`, `danjiCode` 컬럼에 인덱스 추가 권장

### 프론트엔드 화면 구성
```
┌─────────────────────────────────────────┐
│ [전체] [아파트] [오피스텔] [상가] ...   │ ← 탭
├───────────┬─────────────────────────────┤
│ 단지 목록  │  물건 테이블                 │
│ (좌측)    │  (우측)                     │
│           │                             │
│ 래미안     │  ┌─────┬─────┬─────┐      │
│ (15건)    │  │ 동   │ 호   │ 가격 │      │
│           │  ├─────┼─────┼─────┤      │
│ 푸르지오   │  │ 101 │ 1001│ 15억 │      │
│ (8건)     │  └─────┴─────┴─────┘      │
│           │                             │
└───────────┴─────────────────────────────┘
```

아파트/오피스텔 탭에서만 좌측 단지 목록 표시, 다른 유형은 전체 화면 사용

---

## 문의사항
- 단지코드(`danjiCode`)는 어떤 규칙으로 생성하나요?
- 기존 DB에 단지 정보가 있나요? 있다면 마이그레이션 필요
- 물건 등록 시 단지가 없으면 자동 생성? 아니면 에러?

---

작성일: 2025-12-13
작성자: 프론트엔드팀
