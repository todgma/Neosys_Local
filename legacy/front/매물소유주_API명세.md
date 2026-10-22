# 물건 소유주 정보 API 명세서

## 개요
물건별 소유주 이력을 관리하는 API입니다. 소유주 정보의 조회, 등록, 수정, 삭제 기능을 제공합니다.

**Base URL:** `/api/holder`

---

## 1. 소유주 정보 조회

### Endpoint
```
GET /api/holder/GetPropertyList
```

### Request Parameters (Query String)
| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|---------|------|------|------|--------|
| ptNo | int | ❌ | 물건번호 | - |
| HolderName | string | ❌ | 소유주명 | - |
| HolderPhone | string | ❌ | 소유주 연락처 | - |
| Page | int | ✅ | 페이지 번호 | 1 |
| PageSize | int | ✅ | 페이지당 항목 수 | 20 |

### Response
```json
{
  "success": true,
  "message": "소유자정보 목록 조회 성공",
  "data": {
    "ptHolders": [
      {
        "ptNo": 12345,
        "holderIdx": 1,
        "holderRegDate": "2024-01-15",
        "holderName": "홍길동",
        "holderPhone": "010-1234-5678",
        "custNo": 100,
        "holderRelation": "본인",
        "holderMemo": "매도 희망",
        "regDt": "2024-01-15T10:30:00",
        "regId": "admin",
        "updDt": "2024-01-20T14:20:00",
        "updId": "admin"
      }
    ]
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "소유자정보 없음",
  "errorCode": "NOT_FOUND"
}
```

---

## 2. 소유주 정보 등록

### Endpoint
```
POST /api/holder
```

### Request Parameters
**Query String:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| PtNo | int | ✅ | 물건번호 |
| UserId | string | ✅ | 등록자 ID |

**Request Body:**
```json
{
  "holderRegDate": "2024-01-15",
  "holderName": "홍길동",
  "holderPhone": "010-1234-5678",
  "custNo": 100,
  "holderRelation": "본인",
  "holderMemo": "매도 희망"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| holderRegDate | string | ✅ | 소유주 등록일자 (YYYY-MM-DD) |
| holderName | string | ✅ | 소유주명 |
| holderPhone | string | ❌ | 소유주 연락처 |
| custNo | long | ❌ | 고객번호 |
| holderRelation | string | ❌ | 소유자와의 관계 (예: 본인, 배우자, 자녀, 부모, 기타) |
| holderMemo | string | ❌ | 비고(메모) |

### Response
```json
{
  "success": true,
  "message": "소유자정보 등록 성공",
  "data": true
}
```

### Error Response
```json
{
  "success": false,
  "message": "소유자정보 등록 실패",
  "errorCode": "INSERT_FAILED"
}
```

---

## 3. 소유주 정보 수정

### Endpoint
```
PUT /api/holder/{PtNo}
```

### Request Parameters
**Path Parameter:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| PtNo | int | ✅ | 물건번호 |

**Query String:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| Idx | int | ✅ | 소유주 인덱스 |
| UserId | string | ✅ | 수정자 ID |

**Request Body:**
```json
{
  "holderRegDate": "2024-01-20",
  "holderName": "홍길동",
  "holderPhone": "010-9876-5432",
  "custNo": 100,
  "holderRelation": "배우자",
  "holderMemo": "계약 진행 중"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| holderRegDate | string | ❌ | 소유주 등록일자 (YYYY-MM-DD) |
| holderName | string | ❌ | 소유주명 |
| holderPhone | string | ❌ | 소유주 연락처 |
| custNo | long | ❌ | 고객번호 |
| holderRelation | string | ❌ | 소유자와의 관계 (예: 본인, 배우자, 자녀, 부모, 기타) |
| holderMemo | string | ❌ | 비고(메모) |

### Response
```json
{
  "success": true,
  "message": "소유자정보 수정 성공",
  "data": true
}
```

### Error Response
```json
{
  "success": false,
  "message": "소유자정보 수정 실패",
  "errorCode": "INSERT_FAILED"
}
```

---

## 4. 소유주 정보 삭제

### Endpoint
```
DELETE /api/holder/{PtNo}
```

### Request Parameters
**Path Parameter:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| PtNo | int | ✅ | 물건번호 |

**Query String:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| Idx | int | ✅ | 소유주 인덱스 |
| UserId | string | ❌ | 삭제자 ID |

### Response
```json
{
  "success": true,
  "message": "소유자정보 삭제 성공",
  "data": true
}
```

### Error Response
```json
{
  "success": false,
  "message": "소유자정보 삭제 실패",
  "errorCode": "INSERT_FAILED"
}
```

---

## 데이터 모델

### PtHolder (소유주 정보)
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| ptNo | long | ✅ | 물건번호 |
| holderIdx | long | ✅ | 소유주 인덱스 |
| holderRegDate | string | ✅ | 소유주 등록일자 |
| holderName | string | ✅ | 소유주명 |
| holderPhone | string | ❌ | 소유주 연락처 |
| custNo | long | ❌ | 고객번호 |
| holderRelation | string | ❌ | 소유자와의 관계 |
| holderMemo | string | ❌ | 비고(메모) |
| regDt | DateTime | ❌ | 등록일시 |
| regId | string | ❌ | 등록자 ID |
| updDt | DateTime | ❌ | 수정일시 |
| updId | string | ❌ | 수정자 ID |

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
2. **이력 관리**: 물건별로 소유주 이력이 누적 관리됩니다.
3. **인덱스**: 각 소유주는 `holderIdx`로 구분되며, 수정/삭제 시 필수입니다.
4. **날짜 형식**: `holderRegDate`는 "YYYY-MM-DD" 형식의 문자열입니다.
5. **UserId**: 등록/수정/삭제 시 작업자 ID를 추적합니다.
6. **관계 구분**: `holderRelation` 필드는 소유자와의 관계를 나타냅니다 (예: 본인, 배우자, 자녀, 부모, 기타 등).
7. **메모**: `holderMemo` 필드는 비고사항을 자유롭게 기록할 수 있습니다.
