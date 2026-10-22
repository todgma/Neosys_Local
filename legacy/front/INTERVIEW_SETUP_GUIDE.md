# 상담관리 페이지 연동 가이드

## 현재 상태

✅ **완료된 작업:**
1. InterviewPage 컴포넌트 생성 (`src/pages/interview/InterviewPage.jsx`)
2. interviewService API 서비스 생성 (`src/services/interviewService.js`)
3. API endpoints 추가 (`src/config/apiEndpoints.js`)
4. Router에 라우트 추가 (`/interview`)
5. menuStore에 경로 매핑 추가 (`'상담관리': '/interview'`)
6. Sidebar에 아이콘 추가 (`Headphones`)

## 메뉴가 표시되지 않는 이유

사용자에게 **"상담관리" 메뉴 권한이 없기 때문**입니다.

## 해결 방법

### 방법 1: 직원권한관리에서 권한 부여

1. **직원권한관리** 메뉴로 이동
2. 해당 직원 선택
3. **상담관리** 메뉴에 대한 권한 체크
   - 조회(R): Y
   - 등록(C): Y (필요시)
   - 수정(U): Y (필요시)
   - 삭제(D): Y (필요시)
4. **저장** 버튼 클릭

### 방법 2: 직접 URL 접속으로 테스트

메뉴 권한이 없어도 라우트는 작동하므로, 브라우저 주소창에 직접 입력하여 테스트할 수 있습니다:

```
http://localhost:5173/interview
```

### 방법 3: 백엔드에서 직접 권한 추가

백엔드 API를 통해 메뉴 권한을 직접 추가:

**API Endpoint:**
```
POST /api/menu/InsertMenuListRt?userId={userId}
```

**Request Body:**
```json
{
  "createMenusRt": [
    {
      "rtNo": 300000003,
      "id": 1013,
      "cYn": "Y",
      "rYn": "Y",
      "uYn": "Y",
      "dYn": "Y",
      "useYn": "Y"
    }
  ]
}
```

## 메뉴 ID 참고

menu.md 파일에서 확인한 메뉴 ID:
- `1013`: 상담관리 (lvl: 1, parentId: null)

## 확인 방법

### 1. 개발자 도구로 확인
브라우저 개발자 도구(F12) → Console에서:

```javascript
// 현재 로드된 메뉴 확인
const menuStore = window.__ZUSTAND_DEVTOOLS_STORE__.menuStore;
console.log(menuStore.getState().menuItems);
```

### 2. React DevTools로 확인
React DevTools → Zustand → menuStore → menuItems 확인

### 3. 네트워크 탭 확인
개발자 도구 → Network → XHR → `GetMenuListRt?rtNo=...` 응답 확인

## 예상 응답 (권한이 있는 경우)

```json
{
  "success": true,
  "data": {
    "menusRt": [
      {
        "id": 1013,
        "mnuNm": "상담관리",
        "lvl": 1,
        "parentId": null,
        "cYn": "Y",
        "rYn": "Y",
        "uYn": "Y",
        "dYn": "Y",
        "useYn": "Y",
        "sort": 4
      }
    ]
  }
}
```

## 문제 해결

### 메뉴는 보이지만 클릭해도 이동 안 됨
- Router 설정 확인: `src/Router.jsx`의 84줄 확인
- 경로 확인: `/interview` 경로가 정확한지 확인

### 페이지는 열리지만 데이터가 안 나옴
- API 엔드포인트 확인: `https://localhost:7146/api/Interview`
- 브라우저 콘솔에서 에러 확인
- 네트워크 탭에서 API 응답 확인

## 테스트 데이터

백엔드에 테스트 데이터가 없다면, 먼저 면담 데이터를 등록해야 합니다.

**등록 API:**
```
POST /api/Interview
```

**Request Body 예시:**
```json
{
  "ItvType": "ITVTYP01",
  "ItvDate": "2025-01-05",
  "CustName": "홍길동",
  "CustPhone": "010-1234-5678",
  "ItvContent": "아파트 매매 상담",
  "ItvMemo": "강남구 아파트 관심",
  "RtNo": 300000003,
  "UserId": "admin"
}
```
