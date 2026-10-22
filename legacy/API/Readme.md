# 코드 규격서 (REST API 전송 규격 요약)

## 1) 공통 규칙

* **네이밍 규칙**: JSON 필드, DTO 속성, 쿼리 파라미터 모두 **camelCase** 준수.
* **문자셋**: UTF-8.
* **시간 포맷**: ISO 8601 (`2025-10-10T03:00:00Z`) – 서버 UTC 기준.
* **인증 방식**: JWT Bearer (`Authorization: Bearer {token}`)
* **컨텐츠 타입**: 요청/응답 `application/json` 고정.

---

## 2) HTTP 메서드별 전송 규격

### ✅ GET (조회)

* **사용 목적**: 데이터 조회.
* **전송 위치**: 쿼리스트링만 사용(Body 금지).
* **예시**: `/api/realestaters?page=0&size=20&sort=rtNo,DESC&rtNm=홍길동`

### ✅ POST (등록)

* **사용 목적**: 신규 데이터 등록.
* **전송 위치**: JSON Body (DTO 사용 필수)
* **예시 Body**:

```json
{
  "name": "홍길동",
  "phone": "01012345678"
}
```

### ✅ PUT (수정)

* **사용 목적**: 기존 데이터 전체 또는 주요 필드 수정.
* **전송 위치**: Path Param + JSON Body (DTO)
* **예시**: `/api/realestaters/100`

```json
{
  "phone": "01099998888",
  "grade": "A"
}
```

### ✅ PATCH (부분 수정, 선택사항)

* **사용 목적**: 특정 필드 일부 수정.
* **전송 위치**: JSON Body (DTO)
* **비고**: 부분 수정 필요 시에만 사용.

### ✅ DELETE (삭제)

* **사용 목적**: 데이터 삭제.
* **전송 위치**: Path Param 사용, Body 금지.
* **예시**: `/api/realestaters/123?hardDelete=false`

---

## 3) 페이징 / 정렬 / 검색 규칙

* `page`: 0-base index (기본값 0)
* `size`: 페이지 크기 (기본 20, 최대 100)
* `sort`: `field,ASC|DESC` (복수 지정 가능)
* 검색 키: 명시적 필드명 사용(`rtNm`, `offNo`, `grade` 등)

---

## 4) 응답 포맷 (통일 규격)

### ▶ 성공 응답

```json
{
  "success": true,
  "data": { /* 리소스 객체 or 배열 */ },
  "message": "성공 메시지 (선택)"
}
```

### ▶ 실패 응답

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "필수 값 누락",
    "details": [ { "field": "name", "reason": "Required" } ]
  },
  "traceId": "abc123..."
}
```

---

## 5) 상태 코드 정의

| 상태                        | 의미        | 비고                |
| ------------------------- | --------- | ----------------- |
| 200 OK                    | 성공        | 조회 / 수정 / 삭제      |
| 201 Created               | 생성 성공     | Location 헤더 포함 가능 |
| 204 No Content            | 성공, 본문 없음 | 삭제 등              |
| 400 Bad Request           | 유효성 오류    | DTO 검증 실패         |
| 401 Unauthorized          | 인증 실패     | 토큰 누락/만료          |
| 403 Forbidden             | 권한 부족     | 접근 제한             |
| 404 Not Found             | 리소스 없음    | ID 미존재            |
| 409 Conflict              | 상태 충돌     | 중복 또는 비즈니스 충돌     |
| 500 Internal Server Error | 서버 오류     | 미처리 예외            |

---

## 6) 개발 체크리스트

* [ ] HTTP 메서드 규칙 준수 (GET=Query / POST·PUT·PATCH=Body)
* [ ] DTO 기반 요청(JSON Body) 구조 유지
* [ ] camelCase 필드명 일관성 확인
* [ ] 응답 포맷(success/error) 통일 적용
* [ ] 상태 코드 및 메시지 적정성 확인
* [ ] 시간 포맷 ISO 8601, 서버 UTC 유지


## 7) 서비스,인터페이스,클래스 등의 이름은 복수형X 단수형 사용.

## 8)