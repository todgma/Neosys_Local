# System 공지사항 조회 API 명세

## 개요
System API에서 공개된 공지사항을 조회하는 엔드포인트입니다.
관리자 권한 없이 일반 사용자가 공개된 공지사항만 조회할 수 있습니다.

---

## 1. 공지사항 목록 조회

### Endpoint
```
GET /api/system/notices
```

### 설명
공개된 공지사항 목록을 페이징하여 조회합니다. (`isPublic = 'Y'` 인 공지사항만)

### Request Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| category | string | No | - | 카테고리 필터 |
| pageNumber | int | No | 1 | 페이지 번호 |
| rowsPerPage | int | No | 10 | 페이지당 행 수 |

### Response Example

#### 성공 (200 OK)
```json
{
  "success": true,
  "data": {
    "notices": [
      {
        "noticeId": 1,
        "title": "서비스 점검 안내",
        "content": "2024년 1월 1일 00:00~02:00 서비스 점검이 있을 예정입니다.",
        "category": "공지",
        "viewCount": 150,
        "isTop": "Y",
        "isPublic": "Y",
        "attachFile": null,
        "startDate": "2024-01-01",
        "endDate": "2024-01-31",
        "sortOrder": 1,
        "regId": "admin",
        "regDt": "2024-01-01T10:00:00",
        "modId": null,
        "modDt": null
      },
      {
        "noticeId": 2,
        "title": "신규 기능 출시",
        "content": "새로운 매물 검색 기능이 추가되었습니다.",
        "category": "업데이트",
        "viewCount": 85,
        "isTop": "N",
        "isPublic": "Y",
        "attachFile": null,
        "startDate": "2024-01-05",
        "endDate": null,
        "sortOrder": 2,
        "regId": "admin",
        "regDt": "2024-01-05T14:30:00",
        "modId": "admin",
        "modDt": "2024-01-06T09:15:00"
      }
    ],
    "totalCount": 2
  },
  "message": "공지사항 목록 조회 성공"
}
```

#### 공지사항이 없는 경우 (200 OK)
```json
{
  "success": true,
  "data": {
    "notices": [],
    "totalCount": 0
  },
  "message": "공지사항이 없습니다."
}
```

#### 서버 오류 (500 Internal Server Error)
```json
{
  "success": false,
  "code": "SERVER_ERROR",
  "message": "오류 메시지",
  "timestamp": "2024-01-01T10:00:00"
}
```

### Request Example
```bash
# 기본 조회 (1페이지, 10개)
GET /api/system/notices

# 카테고리 필터
GET /api/system/notices?category=공지

# 페이징
GET /api/system/notices?pageNumber=2&rowsPerPage=20

# 카테고리 + 페이징
GET /api/system/notices?category=업데이트&pageNumber=1&rowsPerPage=5
```

---

## 2. 공지사항 상세 조회

### Endpoint
```
GET /api/system/notices/{noticeId}
```

### 설명
특정 공지사항의 상세 정보를 조회합니다. (공개된 공지사항만)

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| noticeId | long | Yes | 공지사항 ID |

### Response Example

#### 성공 (200 OK)
```json
{
  "success": true,
  "data": {
    "noticeId": 1,
    "title": "서비스 점검 안내",
    "content": "2024년 1월 1일 00:00~02:00 서비스 점검이 있을 예정입니다.\n\n점검 내용:\n1. 서버 업그레이드\n2. 보안 패치 적용\n3. 성능 개선\n\n이용에 불편을 드려 죄송합니다.",
    "category": "공지",
    "viewCount": 150,
    "isTop": "Y",
    "isPublic": "Y",
    "attachFile": "https://example.com/files/notice_1.pdf",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "sortOrder": 1,
    "regId": "admin",
    "regDt": "2024-01-01T10:00:00",
    "modId": null,
    "modDt": null
  },
  "message": "공지사항 조회 성공"
}
```

#### 공지사항을 찾을 수 없는 경우 (404 Not Found)
```json
{
  "success": false,
  "code": "NOT_FOUND",
  "message": "공지사항을 찾을 수 없습니다."
}
```

#### 서버 오류 (500 Internal Server Error)
```json
{
  "success": false,
  "code": "SERVER_ERROR",
  "message": "오류 메시지",
  "timestamp": "2024-01-01T10:00:00"
}
```

### Request Example
```bash
GET /api/system/notices/1
GET /api/system/notices/123
```

---

## 3. 데이터 모델

### Notice
| Field | Type | Description |
|-------|------|-------------|
| noticeId | long | 공지사항 ID (PK) |
| title | string | 제목 |
| content | string | 내용 |
| category | string | 카테고리 (공지, 업데이트, 이벤트 등) |
| viewCount | int | 조회수 |
| isTop | string | 상단 고정 여부 (Y/N) |
| isPublic | string | 공개 여부 (Y/N) |
| attachFile | string | 첨부파일 URL |
| startDate | date | 게시 시작일 |
| endDate | date | 게시 종료일 |
| sortOrder | int | 정렬 순서 |
| regId | string | 등록자 ID |
| regDt | datetime | 등록일시 |
| modId | string | 수정자 ID |
| modDt | datetime | 수정일시 |

### NoticeList
| Field | Type | Description |
|-------|------|-------------|
| notices | Notice[] | 공지사항 배열 |
| totalCount | int | 전체 개수 |

---

## 4. 특징

### Admin API vs System API 차이점

| 구분 | Admin API | System API |
|------|-----------|------------|
| 경로 | `/api/admin/notices` | `/api/system/notices` |
| 권한 | 관리자 전용 | 일반 사용자 |
| 조회 범위 | 모든 공지사항 (isPublic 무관) | 공개된 공지사항만 (isPublic='Y') |
| 기능 | CRUD (등록/수정/삭제) | 조회만 (Read Only) |

### 정렬 순서
공지사항은 다음 우선순위로 정렬됩니다:
1. `isTop` (상단 고정: Y → N)
2. `sortOrder` (정렬 순서: 오름차순)
3. `noticeId` (공지사항 ID: 내림차순)

### 페이징
- 기본 페이지 크기: 10개
- 페이지 번호: 1부터 시작
- `totalCount`를 통해 전체 개수 확인 가능

---

## 5. 사용 예시

### 메인 페이지에 상단 고정 공지사항 표시
```bash
GET /api/system/notices?pageNumber=1&rowsPerPage=3
```
→ 상단 고정 공지사항 3개를 먼저 조회

### 카테고리별 필터링
```bash
# 이벤트 공지만 조회
GET /api/system/notices?category=이벤트

# 시스템 점검 공지만 조회
GET /api/system/notices?category=점검
```

### 공지사항 상세 페이지
```bash
# 특정 공지사항 상세 조회
GET /api/system/notices/123
```

---

## 6. 주의사항

1. **공개 여부**: System API는 항상 `isPublic='Y'`인 공지사항만 반환합니다.
2. **비공개 공지사항**: `isPublic='N'`인 공지사항은 관리자 API에서만 조회 가능합니다.
3. **삭제된 공지사항**: 존재하지 않는 `noticeId`로 조회 시 404 오류가 반환됩니다.
4. **날짜 범위**: `startDate`, `endDate`는 게시 기간을 의미하지만, 현재 API는 자동으로 필터링하지 않습니다. 필요 시 클라이언트에서 처리하세요.

---

## 7. 데이터베이스 함수

### fn_nt_notice
공지사항 CRUD를 처리하는 PostgreSQL 함수

#### 파라미터 (System API 사용)
- `p_mode`: 'SEL' (조회 모드 고정)
- `p_notice_id`: 공지사항 ID (상세 조회 시)
- `p_category`: 카테고리 필터
- `p_is_public`: 'Y' (공개된 공지사항만 고정)
- `p_page_number`: 페이지 번호
- `p_rows_per_page`: 페이지당 행 수

---

## 8. 관련 파일

- **Controller**: [System/Controllers/SystemController.cs](System/Controllers/SystemController.cs)
- **Service**: [System/Services/SystemService.cs](System/Services/SystemService.cs)
- **Model**: [Admin/Models/NoticeModels.cs](Admin/Models/NoticeModels.cs)
- **Database Function**: [공지사항함수.sql](공지사항함수.sql)
