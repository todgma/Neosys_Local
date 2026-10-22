# 매물 소유주/매도·임대인/매수·임차인 API 명세

## 개요
매물에 대한 소유주, 매도/임대인, 매수/임차인 정보를 관리하는 API입니다.

---

## 1. Property API (매물정보)에 Holder 정보 포함

### 1.1 매물정보 상세 조회
- **URL**: `GET /api/property/detail/{ptNo}`
- **설명**: 특정 매물의 상세 정보를 조회하며, Holder 정보를 함께 반환합니다.

#### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ptNo | long | Yes | 물건번호 |

#### Response Example
```json
{
  "success": true,
  "message": "물건정보 상세 조회 성공",
  "data": {
    "ptNo": 1,
    "ptName": "강남아파트 101호",
    "prgSts": "진행중",
    "ptSts": "매매",
    "holders": [
      {
        "ptNo": 1,
        "holderIdx": 1,
        "holderType": "OWNER",
        "holderRegDate": "2024-01-01",
        "holderName": "홍길동",
        "holderPhone": "010-1234-5678",
        "custNo": 100,
        "holderRelation": "본인",
        "holderMemo": "소유자 메모"
      },
      {
        "ptNo": 1,
        "holderIdx": 2,
        "holderType": "SELLER",
        "holderRegDate": "2024-01-01",
        "holderName": "김철수",
        "holderPhone": "010-9876-5432",
        "holderMemo": "매도인"
      }
    ]
  }
}
```

### 1.2 매물정보 등록
- **URL**: `POST /api/property`
- **설명**: 새로운 매물 정보를 등록하며, Holder 정보를 함께 등록할 수 있습니다.

#### Request Body Example
```json
{
  "ptName": "강남아파트 101호",
  "prgSts": "진행중",
  "ptSts": "매매",
  "userId": "admin",
  "holders": [
    {
      "holderType": "OWNER",
      "holderRegDate": "2024-01-01",
      "holderName": "홍길동",
      "holderPhone": "010-1234-5678",
      "custNo": 100,
      "holderRelation": "본인",
      "holderMemo": "소유자 메모"
    }
  ]
}
```

### 1.3 매물정보 수정
- **URL**: `PUT /api/property/{ptNo}`
- **설명**: 매물 정보를 수정하며, Holder 정보를 함께 수정합니다.
  - Holder 배열에 포함된 항목: 수정 또는 신규 등록
  - HolderIdx가 있는 경우: 기존 데이터 수정
  - HolderIdx가 없는 경우: 신규 데이터 등록
  - Holder 배열에 없지만 DB에 존재하는 항목: 삭제

#### Request Body Example
```json
{
  "ptName": "강남아파트 102호",
  "userId": "admin",
  "holders": [
    {
      "holderIdx": 1,
      "holderType": "OWNER",
      "holderName": "홍길동",
      "holderMemo": "수정된 메모"
    },
    {
      "holderType": "BUYER",
      "holderRegDate": "2024-02-01",
      "holderName": "이영희",
      "holderPhone": "010-5555-6666"
    }
  ]
}
```

---

## 2. Holder API (독립적인 Holder 관리)

### 2.1 소유주정보 목록 조회
- **URL**: `GET /api/holder/GetPropertyList`

#### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ptNo | int | No | 물건번호 |
| HolderName | string | No | 소유주 이름 |
| HolderPhone | string | No | 연락처 |
| Page | int | Yes | 페이지 번호 (기본값: 1) |
| PageSize | int | Yes | 페이지 크기 (기본값: 20) |

### 2.2 소유주정보 등록
- **URL**: `POST /api/holder?PtNo={ptNo}`

#### Request Body
```json
{
  "holderType": "OWNER",
  "holderRegDate": "2024-01-01",
  "holderName": "홍길동",
  "holderPhone": "010-1234-5678",
  "holderRelation": "본인"
}
```

### 2.3 소유주정보 수정
- **URL**: `PUT /api/holder/{ptNo}?Idx={idx}`

### 2.4 소유주정보 삭제
- **URL**: `DELETE /api/holder/{ptNo}?Idx={idx}`

---

## 3. 데이터 모델

### 3.1 PropertyHolderDto
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| holderIdx | int | No | 소유주 인덱스 (수정 시 필수) |
| holderType | string | No | OWNER/SELLER/BUYER |
| holderRegDate | string | No | 등록일자 |
| holderName | string | No | 이름 |
| holderPhone | string | No | 연락처 |
| custNo | long | No | 고객번호 |
| holderRelation | string | No | 소유자와의 관계 |
| holderMemo | string | No | 메모 |

### 3.2 HolderType 코드값
| Code | Description |
|------|-------------|
| OWNER | 소유자 |
| SELLER | 매도인/임대인 |
| BUYER | 매수인/임차인 |

---

## 4. 데이터베이스

### 4.1 테이블 수정
```sql
-- holder_type 컬럼 추가
ALTER TABLE pt_sale_holder
ADD COLUMN holder_type VARCHAR(10);

COMMENT ON COLUMN pt_sale_holder.holder_type IS '소유주 구분: OWNER(소유자), SELLER(매도/임대인), BUYER(매수/임차인)';
```

### 4.2 함수: fn_pt_sale_holder
- **프로시저**: SEL, INS, UPD, DEL, DELALL
- **파일**: [fn_pt_sale_holder.sql](Property/fn_pt_sale_holder.sql)

---

## 5. 비즈니스 로직

### 5.1 Holder 동기화 (SyncPropertyHolders)
1. **삭제**: 요청에 없는 기존 Holder는 자동 삭제
2. **수정**: HolderIdx가 있으면 기존 데이터 업데이트
3. **등록**: HolderIdx가 없으면 신규 등록 (자동 채번)

### 5.2 예시 시나리오
```json
// 매물 등록 시 여러 유형의 Holder 함께 등록
POST /api/property
{
  "holders": [
    { "holderType": "OWNER", "holderName": "홍길동" },
    { "holderType": "SELLER", "holderName": "김철수" },
    { "holderType": "BUYER", "holderName": "이영희" }
  ]
}
```
