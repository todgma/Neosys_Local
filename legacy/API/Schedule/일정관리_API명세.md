# 일정관리 API 명세

## 1. 일정 목록 조회

### Endpoint
```
GET /api/Schedule
```

### 설명
기간과 필터 조건에 따라 일정 목록을 조회합니다.

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| StartDate | string | Y | 조회 시작일 (예: 2025-01-01) |
| EndDate | string | Y | 조회 종료일 (예: 2025-12-31) |
| ScheduleId | long? | N | 일정 ID (특정 일정 조회) |
| ScopeDiv | string? | N | 범위 구분 (개인/그룹 등) |
| OwnerUserId | string? | N | 일정 소유자 사용자 ID |
| OfficeId | long? | N | 오피스 ID |
| Page | int | Y | 페이지 번호 (기본값: 1) |
| PageSize | int | Y | 페이지 크기 (기본값: 20) |

### Request Example
```
GET /api/Schedule?StartDate=2025-01-01&EndDate=2025-12-31&Page=1&PageSize=20
```

### Response
```json
{
  "success": true,
  "data": {
    "schedules": [
      {
        "scheduleId": 1,
        "scopeDiv": "PERSONAL",
        "ownerUserId": "user123",
        "officeId": 1,
        "title": "고객 미팅",
        "content": "아파트 매매 상담",
        "phone": "010-1234-5678",
        "location": "강남구 역삼동",
        "startAt": "2025-02-21T14:00:00",
        "endAt": "2025-02-21T15:00:00",
        "allDay": false,
        "useYn": "Y",
        "isShared": false,
        "isPrivate": false,
        "regId": "admin",
        "regDt": "2025-02-21T10:00:00",
        "updId": null,
        "updDt": null,
        "links": [
          {
            "linkId": 1,
            "scheduleId": 1,
            "linkType": "PROPERTY",
            "linkKey": "600000001",
            "meta": "{\"propertyName\":\"강동힐스테이트\"}",
            "regId": "admin",
            "regDt": "2025-02-21T10:00:00"
          }
        ]
      }
    ]
  },
  "message": "일정 목록 조회 성공"
}
```

### Response Fields

#### ScheduleModel
| Field | Type | Description |
|-------|------|-------------|
| scheduleId | long | 일정 ID |
| scopeDiv | string | 범위 구분 (PERSONAL, GROUP 등) |
| ownerUserId | string | 일정 소유자 사용자 ID |
| officeId | long? | 오피스 ID |
| title | string? | 일정 제목 |
| content | string? | 일정 내용 |
| phone | string? | 연락처 |
| location | string? | 장소 |
| startAt | DateTime | 시작 일시 |
| endAt | DateTime? | 종료 일시 |
| allDay | bool | 종일 일정 여부 |
| useYn | string | 사용 여부 (Y/N) |
| isShared | bool | 공유 여부 |
| isPrivate | bool | 비공개 여부 |
| regId | string? | 등록자 ID |
| regDt | DateTime? | 등록 일시 |
| updId | string? | 수정자 ID |
| updDt | DateTime? | 수정 일시 |
| links | List&lt;ScheduleLinkModel&gt;? | 연동 정보 목록 |

#### ScheduleLinkModel (연동 정보)
| Field | Type | Description |
|-------|------|-------------|
| linkId | long | 연동 ID |
| scheduleId | long | 일정 ID |
| linkType | string | 연동 타입 (PROPERTY, CUSTOMER, CONTRACT 등) |
| linkKey | string? | 연동 키 (매물번호, 고객번호 등) |
| meta | string? | 메타 정보 (JSON 형태) |
| regId | string? | 등록자 ID |
| regDt | DateTime? | 등록 일시 |
| updId | string? | 수정자 ID |
| updDt | DateTime? | 수정 일시 |

---

## 2. 일정 등록

### Endpoint
```
POST /api/Schedule
```

### 설명
새로운 일정을 등록합니다.

### Request Body
```json
{
  "scopeDiv": "PERSONAL",
  "ownerUserId": "user123",
  "officeId": 1,
  "title": "고객 미팅",
  "content": "아파트 매매 상담",
  "phone": "010-1234-5678",
  "location": "강남구 역삼동",
  "startAt": "2025-02-21T14:00:00",
  "endAt": "2025-02-21T15:00:00",
  "allDay": false,
  "isShared": false,
  "isPrivate": false,
  "userId": "admin",
  "links": [
    {
      "linkType": "PROPERTY",
      "linkKey": "600000001",
      "meta": "{\"propertyName\":\"강동힐스테이트\"}"
    }
  ]
}
```

### Request Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| scopeDiv | string | Y | 범위 구분 (PERSONAL, GROUP 등) |
| ownerUserId | string | Y | 일정 소유자 사용자 ID |
| officeId | long? | N | 오피스 ID |
| title | string? | N | 일정 제목 |
| content | string? | N | 일정 내용 |
| phone | string? | N | 연락처 |
| location | string? | N | 장소 |
| startAt | string | Y | 시작 일시 (ISO 8601 형식) |
| endAt | string? | N | 종료 일시 (ISO 8601 형식) |
| allDay | bool | N | 종일 일정 여부 (기본값: false) |
| isShared | bool | N | 공유 여부 (기본값: false) |
| isPrivate | bool | N | 비공개 여부 (기본값: false) |
| userId | string? | N | 등록자 사용자 ID |
| links | List&lt;ScheduleLinkDto&gt;? | N | 연동 정보 목록 |

#### ScheduleLinkDto
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| linkType | string | Y | 연동 타입 (PROPERTY, CUSTOMER, CONTRACT 등) |
| linkKey | string? | N | 연동 키 |
| meta | string? | N | 메타 정보 (JSON 형태) |

### Response
```json
{
  "success": true,
  "data": true,
  "message": "일정 등록 성공"
}
```

---

## 3. 일정 수정

### Endpoint
```
PUT /api/Schedule/{scheduleId}
```

### 설명
기존 일정 정보를 수정합니다.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| scheduleId | long | Y | 일정 ID |

### Request Body
```json
{
  "scopeDiv": "GROUP",
  "title": "팀 미팅",
  "content": "주간 업무 회의",
  "startAt": "2025-02-22T10:00:00",
  "endAt": "2025-02-22T11:00:00",
  "isShared": true,
  "userId": "admin",
  "links": [
    {
      "linkType": "PROJECT",
      "linkKey": "PRJ001",
      "meta": "{\"projectName\":\"신규 단지 프로젝트\"}"
    }
  ]
}
```

### Request Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| scopeDiv | string? | N | 범위 구분 |
| ownerUserId | string? | N | 일정 소유자 사용자 ID |
| officeId | long? | N | 오피스 ID |
| title | string? | N | 일정 제목 |
| content | string? | N | 일정 내용 |
| phone | string? | N | 연락처 |
| location | string? | N | 장소 |
| startAt | string? | N | 시작 일시 |
| endAt | string? | N | 종료 일시 |
| allDay | bool? | N | 종일 일정 여부 |
| isShared | bool? | N | 공유 여부 |
| isPrivate | bool? | N | 비공개 여부 |
| userId | string? | N | 수정자 사용자 ID |
| links | List&lt;ScheduleLinkDto&gt;? | N | 연동 정보 목록 |

### Response
```json
{
  "success": true,
  "data": true,
  "message": "일정 수정 성공"
}
```

---

## 4. 일정 삭제

### Endpoint
```
DELETE /api/Schedule/{scheduleId}
```

### 설명
일정을 삭제합니다.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| scheduleId | long | Y | 일정 ID |

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string? | N | 삭제 수행자 사용자 ID |

### Request Example
```
DELETE /api/Schedule/1?userId=admin
```

### Response
```json
{
  "success": true,
  "data": true,
  "message": "일정 삭제 성공"
}
```

---

## 데이터베이스 함수

### fn_rt_schedule
```sql
CREATE OR REPLACE FUNCTION public.fn_rt_schedule(
    pr_mode character varying,
    pr_schedule_id bigint DEFAULT NULL,
    pr_scope_div character varying DEFAULT NULL,
    pr_owner_user_id character varying DEFAULT NULL,
    pr_office_id bigint DEFAULT NULL,
    pr_title character varying DEFAULT NULL,
    pr_content text DEFAULT NULL,
    pr_phone character varying DEFAULT NULL,
    pr_location character varying DEFAULT NULL,
    pr_start_at character varying DEFAULT NULL,
    pr_end_at character varying DEFAULT NULL,
    pr_all_day boolean DEFAULT NULL,
    pr_is_shared boolean DEFAULT NULL,
    pr_is_private boolean DEFAULT NULL,
    pr_start_date character varying DEFAULT NULL,
    pr_end_date character varying DEFAULT NULL,
    pr_user_id character varying DEFAULT NULL,
    pr_links_json text DEFAULT NULL,
    pr_page integer DEFAULT 1,
    pr_page_size integer DEFAULT 20
)
```

**모드별 동작:**
- `SEL`: 일정 목록 조회 (기간 및 필터 조건)
- `INS`: 일정 등록 (연동 정보 포함)
- `UPD`: 일정 수정 (연동 정보 포함)
- `DEL`: 일정 삭제

---

## 주요 기능

### 1. 기간별 일정 조회
- 시작일/종료일 범위로 일정 검색
- 페이징 지원

### 2. 필터링
- 범위 구분별 조회 (개인/그룹)
- 소유자별 조회
- 오피스별 조회

### 3. 연동 정보 관리
- 일정과 매물, 고객, 계약 등 다른 엔티티 연결
- JSON 형태의 메타 정보 저장
- 다중 연동 지원

### 4. 일정 속성
- 종일 일정 설정
- 공유 여부 설정
- 비공개 설정

---

## 에러 응답

### 조회 실패
```json
{
  "success": false,
  "message": "일정 정보 없음"
}
```

### 등록 실패
```json
{
  "success": false,
  "message": "일정 등록 실패"
}
```

### 수정 실패
```json
{
  "success": false,
  "message": "일정 수정 실패"
}
```

### 삭제 실패
```json
{
  "success": false,
  "message": "일정 삭제 실패"
}
```

### 유효성 검사 실패
```json
{
  "success": false,
  "message": "요청 형식이 올바르지 않습니다."
}
```

---

## 사용 예시

### 개인 일정 등록
```bash
POST /api/Schedule
Content-Type: application/json

{
  "scopeDiv": "PERSONAL",
  "ownerUserId": "john.doe",
  "title": "부동산 투자 세미나",
  "startAt": "2025-03-15T13:00:00",
  "endAt": "2025-03-15T17:00:00",
  "allDay": false,
  "isShared": false,
  "isPrivate": true,
  "userId": "john.doe"
}
```

### 매물 연동 일정 등록
```bash
POST /api/Schedule
Content-Type: application/json

{
  "scopeDiv": "PERSONAL",
  "ownerUserId": "agent01",
  "title": "매물 현장 방문",
  "location": "서울시 강동구 둔촌동 170-1",
  "startAt": "2025-02-25T10:00:00",
  "endAt": "2025-02-25T11:00:00",
  "userId": "agent01",
  "links": [
    {
      "linkType": "PROPERTY",
      "linkKey": "600000002",
      "meta": "{\"propertyName\":\"둔촌주공아파트\",\"floor\":\"15층\"}"
    }
  ]
}
```

### 월별 일정 조회
```bash
GET /api/Schedule?StartDate=2025-03-01&EndDate=2025-03-31&ownerUserId=agent01&Page=1&PageSize=50
```
