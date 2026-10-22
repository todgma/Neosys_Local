# 공인중개사 ERP 시스템

Electron + React 기반의 현대적인 부동산 중개업무 관리 시스템입니다.

## 🚀 기술 스택

- **Frontend**: React 18 + JavaScript + Tailwind CSS
- **Desktop Framework**: Electron
- **Data Grid**: AG Grid Community, RevoGrid
- **State Management**: Zustand
- **Build Tool**: Vite
- **UI Components**: Custom components with Lucide React icons
- **Calendar**: React Big Calendar
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast

## 📋 주요 기능

### ✅ 구현된 기능
1. **인증 시스템** - 로그인/로그아웃, 세션 관리
2. **대시보드** - 전체 현황 및 통계 정보
3. **고객 관리** - 고객 정보 등록, 조회, 수정, 삭제
4. **물건 관리** - 물건 정보 관리 (아파트, 오피스텔, 상가 등)
5. **협력업체 관리** - 협력업체 등록 및 영업지역 관리
6. **공동중개망** - 공동중개 물건/고객 정보 관리
7. **상담 관리** - 상담 이력 등록 및 조회
8. **일정 관리** - 캘린더 기반 일정 관리
9. **메뉴 시스템** - 3depth 계층형 메뉴 구조
10. **탭 시스템** - 멀티 탭 작업 환경 (분할 뷰 지원)
11. **커스터마이징** - 테이블 컬럼 표시/숨김, 순서 변경

## 🛠️ 설치 및 실행

### 사전 요구사항
- Node.js 18 이상
- npm 또는 yarn

### 1. 프로젝트 클론 및 의존성 설치

```bash
# 프로젝트 클론 (또는 다운로드)
git clone <repository-url>
cd REALESTATE

# 의존성 설치
npm install
```

### 2. 개발 환경 실행

**방법 1: 동시 실행 (권장)**
```bash
npm run electron:dev
```
이 명령어는 Vite 개발 서버와 Electron을 자동으로 함께 실행합니다.

**방법 2: 수동 실행**
```bash
# 첫 번째 터미널
npm run dev

# 두 번째 터미널 (5초 후)
npx electron .
```

개발 서버가 `http://localhost:1420`에서 실행됩니다.

### 3. 프로덕션 빌드

**Windows 설치 파일 생성**
```bash
# 빌드 및 배포 파일 생성
npm run dist

# 또는
npm run electron:build
```

빌드된 파일은 `dist-electron` 폴더에 생성됩니다.
- Windows: `dist-electron/공인중개사 ERP Setup 1.0.0.exe`

## 📜 사용 가능한 스크립트

```bash
# Vite 개발 서버만 실행 (브라우저 테스트용)
npm run dev

# Vite 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview

# Electron 앱 실행 (dev 서버 필요)
npm run electron

# 개발 환경 실행 (Vite + Electron 동시)
npm run electron:dev

# 프로덕션 빌드 및 설치 파일 생성
npm run electron:build

# 프로덕션 빌드 (배포 안함)
npm run dist
```

## 📁 프로젝트 구조

```
REALESTATE/
├── src/
│   ├── components/          # UI 컴포넌트
│   │   ├── ui/             # 기본 UI 컴포넌트 (Card, Table 등)
│   │   ├── layout/         # 레이아웃 컴포넌트 (MainLayout, Sidebar 등)
│   │   ├── modals/         # 모달 컴포넌트
│   │   ├── customers/      # 고객 관련 컴포넌트
│   │   ├── properties/     # 물건 관련 컴포넌트
│   │   ├── partners/       # 협력업체 관련 컴포넌트
│   │   ├── consultation/   # 상담 관련 컴포넌트
│   │   └── TabSystem/      # 탭 시스템 컴포넌트
│   ├── pages/              # 페이지 컴포넌트
│   │   ├── auth/          # 인증 페이지
│   │   ├── customers/     # 고객 관리
│   │   ├── properties/    # 물건 관리
│   │   ├── partners/      # 협력업체 관리
│   │   ├── transaction-network/ # 공동중개망
│   │   ├── schedule/      # 일정 관리
│   │   └── ...
│   ├── stores/             # Zustand 상태 관리
│   │   ├── authStore.js   # 인증 상태
│   │   ├── menuStore.js   # 메뉴 상태
│   │   └── ...
│   ├── services/           # API 서비스
│   │   ├── authService.js
│   │   ├── customerService.js
│   │   ├── propertyService.js
│   │   └── ...
│   ├── utils/              # 유틸리티 함수
│   │   ├── apiClient.js   # API 클라이언트
│   │   └── apiHandler.js  # API 에러 핸들링
│   ├── config/             # 설정 파일
│   │   └── apiEndpoints.js # API 엔드포인트 정의
│   ├── Router.jsx          # 라우팅 설정
│   ├── App.jsx             # 메인 앱 컴포넌트
│   └── main.jsx            # 진입점
├── electron/
│   └── main.cjs            # Electron 메인 프로세스
├── public/                 # 정적 파일
├── dist/                   # Vite 빌드 결과
├── dist-electron/          # Electron 빌드 결과
├── package.json
├── vite.config.js
└── README.md
```

## 🔧 개발 정보

### API 설정

API 엔드포인트는 `src/config/apiEndpoints.js`에서 관리됩니다.

```javascript
// 개발 서버
export const API_BASE_URL = 'http://localhost:3000/api';

// 프로덕션 서버 (필요 시 변경)
// export const API_BASE_URL = 'https://api.yourdomain.com';
```

### 상태 관리

Zustand를 사용하여 전역 상태를 관리합니다:
- `authStore`: 인증 및 사용자 정보
- `menuStore`: 메뉴 및 탭 상태
- `hubModalStore`: 공동중개망 모달 상태
- `notificationStore`: 알림 상태

### 스타일링

Tailwind CSS를 사용하여 스타일링합니다:
```bash
# Tailwind 설정 파일
tailwind.config.js
postcss.config.js
```

## 🎯 빌드 설정

### Electron Builder 설정 (package.json)

```json
{
  "build": {
    "appId": "com.realestate.erp",
    "productName": "공인중개사 ERP",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "node_modules/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

### Windows 빌드 요구사항
- Windows 10 이상
- .NET Framework 4.5 이상

## 🐛 트러블슈팅

### 포트 충돌
Vite 개발 서버가 1420 포트를 사용합니다. 포트가 사용 중이면:
```bash
# vite.config.js에서 포트 변경
server: {
  port: 3000  // 원하는 포트로 변경
}
```

### Electron 실행 오류
```bash
# node_modules 재설치
rm -rf node_modules package-lock.json
npm install
```

### 빌드 실패
```bash
# 캐시 정리 후 재빌드
npm run build
npm run dist
```

## 📄 라이선스

이 프로젝트는 개인/상업적 용도로 자유롭게 사용 가능합니다.

## 🤝 기여

프로젝트 개선을 위한 기여를 환영합니다.

---

© 2024 공인중개사 ERP 시스템. Electron + React로 구축된 현대적인 데스크톱 애플리케이션.





등록



<div id="ezHelpActivex"></div>
<script src="https://939.co.kr/runezhelp.js"></script>
<script>
     runezHelp({
         divid:'ezHelpActivex', //설치될 id
         userid:'neosis2026', //유저id
         width:'370', //가로길이
         height:'210', //세로 길이
         type:'1', //1:상담원 번호 표시만, 2:우측부분만, 3: 페이지전체
         lang: 'kr' // kr:한국어 , en:영어, jp:일본어 (환경설정->안내문구설정 의 언어설정 필요. 설정 없을 시 기본 한국어)
    })
</script>