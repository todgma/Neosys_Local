const { app, BrowserWindow, Menu, ipcMain, dialog, shell, screen, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const http = require('http');
const { spawn } = require('child_process');
const ktBridge = require('./ktPhoneBridge.cjs');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
// 개발 모드에서도 자동 업데이트 흐름을 테스트하기 위한 토글
//   FORCE_UPDATE=1        → 개발 모드에서도 스플래시 + 업데이트 체크 실행
//   UPDATE_DRY_RUN=1      → 다운로드까지만 하고 실제 설치(관리자 실행/앱 종료)는 건너뜀 (개발 안전)
const truthy = (v) => v === '1' || v === 'true' || v === 'yes';
const forceUpdate = truthy(process.env.FORCE_UPDATE);
const updateDryRun = truthy(process.env.UPDATE_DRY_RUN);

// 버전 조회 API 베이스 URL (실제 배포 서버). UPDATE_API_BASE 환경변수로 오버라이드 가능
const VERSION_API_BASE = process.env.UPDATE_API_BASE || 'https://api.neosis.kr';

// ── 전역 우클릭 컨텍스트 메뉴 ──
//  모든 창/모든 메뉴에서 공통 적용: 텍스트를 드래그 선택 후 우클릭 → '복사'.
//  입력 가능한 필드(input/textarea/contentEditable)에서는 잘라내기/붙여넣기/전체선택도 제공.
//  (렌더러 컴포넌트에 개별로 붙이지 않고 메인 프로세스에서 일괄 처리)
app.on('web-contents-created', (_e, contents) => {
  contents.on('context-menu', (_ev, params) => {
    const hasText = (params.selectionText || '').trim().length > 0;
    const f = params.editFlags || {};
    const template = [];
    if (params.isEditable) {
      template.push({ role: 'cut', label: '잘라내기', enabled: !!f.canCut });
      template.push({ role: 'copy', label: '복사', enabled: !!f.canCopy });
      template.push({ role: 'paste', label: '붙여넣기', enabled: !!f.canPaste });
      template.push({ type: 'separator' });
      template.push({ role: 'selectAll', label: '전체 선택' });
    } else if (hasText) {
      template.push({ role: 'copy', label: '복사' });
      template.push({ role: 'selectAll', label: '전체 선택' });
    }
    if (template.length === 0) return;
    try {
      const win = BrowserWindow.fromWebContents(contents);
      Menu.buildFromTemplate(template).popup(win ? { window: win } : {});
    } catch (_) { /* noop */ }
  });
});

// ── 새 창(등록/수정 팝업 등) 공통 배치 헬퍼 ──
//  커서가 있는 모니터의 작업영역(작업표시줄 제외) '중앙'에 배치하되,
//  창 전체(특히 우측)가 화면을 벗어나지 않도록 경계 안으로 클램프한다.
//  (기존: 커서 기준 x = pt.x - w/2 + 좌측만 클램프 → 우측 화면 밖으로 잘림)
function placeWindowOnActiveDisplay(winW, winH) {
  try {
    const pt = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(pt);
    const wa = display.workArea; // { x, y, width, height }
    // 기본 중앙 정렬
    let x = Math.round(wa.x + (wa.width - winW) / 2);
    let y = Math.round(wa.y + (wa.height - winH) / 2);
    // 작업영역을 벗어나지 않도록 클램프(창이 화면보다 크면 좌상단 정렬)
    x = Math.max(wa.x, Math.min(x, wa.x + wa.width - winW));
    y = Math.max(wa.y, Math.min(y, wa.y + wa.height - winH));
    return { x, y };
  } catch {
    return {};
  }
}

// 메인 윈도우 참조
let mainWindow;
let childWindows = new Map();
const detachedTabs = new Map(); // tabId -> BrowserWindow

// 자동 업데이트 상태
let splashWindow = null;
let isUpdating = false; // 업데이트 진행 중이면 메인창 생성 금지

// 메뉴 템플릿
const menuTemplate = [
  {
    label: '파일',
    submenu: [
      {
        label: '새 창',
        accelerator: 'CmdOrCtrl+N',
        click: () => createChildWindow('dashboard', '새 창'),
      },
      {
        type: 'separator',
      },
      {
        label: '종료',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => app.quit(),
      },
    ],
  },
  {
    label: '편집',
    submenu: [
      { role: 'undo', label: '실행 취소' },
      { role: 'redo', label: '다시 실행' },
      { type: 'separator' },
      { role: 'cut', label: '잘라내기' },
      { role: 'copy', label: '복사' },
      { role: 'paste', label: '붙여넣기' },
    ],
  },
  {
    label: '보기',
    submenu: [
      { role: 'reload', label: '새로고침' },
      { role: 'forceReload', label: '강제 새로고침' },
      { role: 'toggleDevTools', label: '개발자 도구' },
      { type: 'separator' },
      { role: 'resetZoom', label: '실제 크기' },
      { role: 'zoomIn', label: '확대' },
      { role: 'zoomOut', label: '축소' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: '전체 화면' },
    ],
  },
  {
    label: '창',
    submenu: [
      { role: 'minimize', label: '최소화' },
      { role: 'close', label: '닫기' },
    ],
  },
];

function createMainWindow() {
  // 대시보드(메인) 창 — 모니터 우상단에 붙여 고정
  const mainWA = screen.getPrimaryDisplay().workArea;
  const MAIN_W = 420, MAIN_H = Math.min(920, mainWA.height); // 대시보드 세로 확대(작업영역 넘지 않게 클램프)
  const mainX = mainWA.x + mainWA.width - MAIN_W;
  const mainY = mainWA.y;
  mainWindow = new BrowserWindow({
    width: MAIN_W,
    height: MAIN_H,
    x: mainX,
    y: mainY,
    minWidth: 420,
    minHeight: MAIN_H,
    maxWidth: 420,
    maxHeight: MAIN_H,
    resizable: false,
    movable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false,
    titleBarStyle: 'default',
  });

  // 네이티브 메뉴바(File/Edit/View/…) 제거 — 대신 앱 내부 커스텀 상단바(TopInfoBar)로 대체
  Menu.setApplicationMenu(null);

  // 개발 모드에서는 localhost, 프로덕션에서는 빌드된 파일
  const startUrl = isDev
    ? 'http://localhost:1420'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  // 윈도우가 준비되면 표시
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
    // 저장된 KT 계정이 있으면 자동 로그인 시도
    tryPhoneAutoLogin();
  });

  // 윈도우가 닫힐 때 — 대시보드를 닫으면 열려있는 모든 창을 닫는다
  mainWindow.on('closed', () => {
    mainWindow = null;
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        try { window.destroy(); } catch (e) { try { window.close(); } catch (_) {} }
      }
    });
    childWindows.clear();
  });

  // 외부 링크는 기본 브라우저에서 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // localhost나 내부 앱 링크가 아닌 경우에만 외부 브라우저에서 열기
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

function createChildWindow(route, title, options = {}) {
  const childWindow = new BrowserWindow({
    width: options.width || 1000,
    height: options.height || 700,
    parent: mainWindow,
    modal: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    title: title,
    show: false,
  });

  const startUrl = isDev
    ? `http://localhost:1420/${route}`
    : `file://${path.join(__dirname, '../dist/index.html')}#/${route}`;

  childWindow.loadURL(startUrl);

  childWindow.once('ready-to-show', () => {
    childWindow.show();
  });

  // 윈도우 ID 생성
  const windowId = Date.now().toString();
  childWindows.set(windowId, childWindow);

  // 윈도우가 닫힐 때 Map에서 제거
  childWindow.on('closed', () => {
    childWindows.delete(windowId);
  });

  return windowId;
}

// IPC 핸들러들
// 외부(시스템 기본) 브라우저로 URL 열기 — 모달/분리창에서도 전자앱 내부창이 아닌 실제 브라우저로 열림
ipcMain.handle('open-external', async (event, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

// HTML 문자열을 숨겨진 창에 로드 후 OS 인쇄 대화상자로 인쇄
//  - Electron 렌더러의 window.print()는 "미리보기 미지원" 오류가 나므로, 메인 프로세스의 webContents.print()로 처리
ipcMain.handle('print:html', async (event, payload = {}) => {
  const { html, landscape = false } = payload;
  if (!html || typeof html !== 'string') return { success: false, error: 'no-html' };

  // 임시 HTML 파일로 저장 후 file://로 로드.
  //  data:URL 방식은 브라우저 URL 길이 제한이 있어, react-to-print가 앱 전체 CSS를 인라인으로
  //  복사한 대용량 HTML을 인쇄할 때 내용이 잘려 흰 화면(빈 인쇄)이 되던 문제를 방지한다.
  let tmpFile = null;
  try {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rt-print-'));
    tmpFile = path.join(dir, 'print.html');
    fs.writeFileSync(tmpFile, html, 'utf8');
  } catch (e) {
    tmpFile = null; // 파일 생성 실패 시 data:URL 폴백
  }

  return await new Promise((resolve) => {
    let printWin = new BrowserWindow({
      show: false,
      parent: mainWindow || undefined,
      webPreferences: { sandbox: true, contextIsolation: true },
    });
    const done = (result) => {
      try { if (tmpFile) fs.rmSync(path.dirname(tmpFile), { recursive: true, force: true }); } catch (_) { /* noop */ }
      try { if (printWin && !printWin.isDestroyed()) printWin.close(); } catch (_) { /* noop */ }
      printWin = null;
      resolve(result);
    };
    printWin.webContents.once('did-finish-load', () => {
      // 렌더 완료 후 OS 인쇄 대화상자 표시(취소해도 정상 종료)
      printWin.webContents.print(
        { silent: false, printBackground: true, landscape },
        (success, failureReason) => done({ success, error: success ? null : failureReason })
      );
    });
    printWin.webContents.once('did-fail-load', (_e, _code, _desc, _url, isMainFrame) => {
      if (isMainFrame) done({ success: false, error: 'load-failed' });
    });
    if (tmpFile) printWin.loadFile(tmpFile);
    else printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  });
});

ipcMain.handle('create-window', async (event, route, title, options) => {
  return createChildWindow(route, title, options);
});

ipcMain.handle('close-window', async (event, windowId) => {
  const window = childWindows.get(windowId);
  if (window && !window.isDestroyed()) {
    window.close();
    return true;
  }
  return false;
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// 탭 분리 기능 IPC 핸들러
ipcMain.handle('window:openTab', async (event, { tabId, route, title, initState }) => {
  // 네오봇은 작은 창으로, 여러 개 열 수 있음
  const isNeobot = tabId === 'neobot';

  // 네오봇이 아닌 경우, 이미 분리되어 있다면 앞으로 가져오기
  //  (최소화 상태면 restore, 가려져 있으면 show 후 focus — Windows에서 focus()만으로는 복원/전면이 안 됨)
  if (!isNeobot && detachedTabs.has(tabId)) {
    const w = detachedTabs.get(tabId);
    if (w && !w.isDestroyed()) {
      if (w.isMinimized()) w.restore();
      w.show();
      w.focus();
      // 이미 열린 창에 새 초기상태(예: 쪽지 작성하기+수신자) 재전달
      if (initState && (initState.tab || (Array.isArray(initState.receivers) && initState.receivers.length))) {
        w.webContents.send('tab:init', { tabId, route, initState });
      }
    }
    return;
  }

  // 네오봇의 경우 유니크한 tabId 생성
  const actualTabId = isNeobot ? `neobot_${Date.now()}` : tabId;

  const isNoteManager = tabId === 'note-manager';
  const isPcPhone = tabId === 'pc-phone';
  const isMemo = tabId === 'memo';
  const windowConfig = isNeobot
    ? {
        width: 520,
        height: 825,
        minWidth: 520,
        minHeight: 825,
        maxWidth: 520,
        resizable: false,
      }
    : isMemo
    ? {
        width: 500,
        height: 800,
        minWidth: 500,
        maxWidth: 500,
        minHeight: 400,
      }
    : isNoteManager
    ? {
        width: 720,
        height: 800,
        minWidth: 560,
        minHeight: 600,
      }
    : isPcPhone
    ? {
        width: 1000,
        height: 680,
        minWidth: 800,
        minHeight: 560,
      }
    : {
        width: 1400,
        height: 700,
        minWidth: 1400,
        minHeight: 700,
      };

  const win = new BrowserWindow({
    ...windowConfig,
    ...placeWindowOnActiveDisplay(windowConfig.width, windowConfig.height),
    title: title || 'Detached Tab',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 라우트 기반 진입: #/tab?route=/erp/inventory&tabId=xxx (HashRouter 사용)
  const base = isDev ? 'http://localhost:1420' : `file://${path.join(__dirname, '../dist/index.html')}`;
  let url = `${base}#/tab?route=${encodeURIComponent(route)}&tabId=${encodeURIComponent(actualTabId)}`;
  // 초기상태(예: 쪽지 작성 수신자)를 URL에도 실어 첫 렌더에서 즉시 사용 (IPC 경쟁 방지)
  if (initState && typeof initState === 'object' && Object.keys(initState).length > 0) {
    url += `&initState=${encodeURIComponent(JSON.stringify(initState))}`;
  }
  await win.loadURL(url);

  // 초기 상태 전달
  win.webContents.once('did-finish-load', () => {
    win.webContents.send('tab:init', { tabId: actualTabId, route, initState });
  });

  // 쪽지관리 창: 작성 중이면 닫기 전 경고
  if (isNoteManager) {
    win.on('close', (e) => {
      if (noteComposing.get(win.id)) {
        const choice = dialog.showMessageBoxSync(win, {
          type: 'warning',
          buttons: ['닫기', '취소'],
          defaultId: 1,
          cancelId: 1,
          title: '쪽지 작성 중',
          message: '작성 중인 내용이 있습니다.',
          detail: '지금 닫으면 작성 중인 내용이 사라집니다. 창을 닫으시겠습니까?',
        });
        if (choice === 1) { e.preventDefault(); } // 취소 → 닫기 중단
      }
    });
  }

  // 창 닫힐 때 메인 창에 "reattach" 알림
  win.on('closed', () => {
    detachedTabs.delete(actualTabId);
    noteComposing.delete(win.id);
    // 네오봇이 아닌 경우에만 reattach 알림
    if (!isNeobot && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('tab:reattach', { tabId: actualTabId });
    }
  });

  detachedTabs.set(actualTabId, win);
});

// 쪽지 작성 중 상태(창별) — 닫기 경고 판단용
const noteComposing = new Map(); // BrowserWindow.id -> bool
ipcMain.handle('note:setComposing', (event, composing) => {
  const w = BrowserWindow.fromWebContents(event.sender);
  if (w) noteComposing.set(w.id, !!composing);
});

ipcMain.handle('window:focusTab', (event, { tabId }) => {
  const win = detachedTabs.get(tabId);
  if (win && !win.isDestroyed()) win.focus();
});

// 홈으로: 이미 열려있는 메인 창(대시보드)을 맨 앞으로 + 대시보드로 이동
ipcMain.handle('window:focusMain', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    try { mainWindow.webContents.executeJavaScript("window.location.hash = '#/dashboard';").catch(() => {}); } catch (e) { /* noop */ }
  }
});

// 로그아웃 시: 메인(대시보드) 창을 제외한 모든 창(모달/분리탭 등) 닫기
ipcMain.handle('window:closeAllExceptMain', () => {
  try {
    BrowserWindow.getAllWindows().forEach((w) => {
      if (!w || w.isDestroyed()) return;
      if (w === mainWindow) return;                 // 메인 대시보드 창은 유지
      if (splashWindow && w === splashWindow) return; // 스플래시(업데이트)도 제외
      try { w.close(); } catch { /* noop */ }
    });
  } catch (e) { console.error('closeAllExceptMain 실패:', e); }
  return true;
});

// 모달 창 관리
const modalWindows = new Map();
const modalOpeners = new Map(); // modalId -> opener window

// 결제 창 열기 — 앱 내 전용 BrowserWindow에서 웹 결제(토스) 진행.
//  · 웹이 https 이므로 토스 결제창이 브라우저와 동일하게 동작.
//  · 성공/실패는 웹 결제결과 페이지가 document.title 에 심는 센티넬(NEOSIS_PAYMENT_DONE/FAIL)로 감지(승인 완료 후).
ipcMain.handle('payment:open', async (event, { url, width, height } = {}) => {
  const winW = width || 520;
  const winH = height || 780;
  return await new Promise((resolve) => {
    let payWin;
    try {
      payWin = new BrowserWindow({
        width: winW, height: winH,
        ...placeWindowOnActiveDisplay(winW, winH),
        title: '가입비 결제',
        autoHideMenuBar: true,
        webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
      });
    } catch (e) { resolve({ status: 'error', message: String(e) }); return; }

    let done = false;
    const finish = (status) => {
      if (done) return; done = true;
      try { if (payWin && !payWin.isDestroyed()) payWin.close(); } catch { /* noop */ }
      resolve({ status });
    };
    const onTitle = (_e, title) => {
      const t = String(title || '');
      if (t.includes('NEOSIS_PAYMENT_DONE')) finish('success');
      else if (t.includes('NEOSIS_PAYMENT_FAIL')) finish('fail');
    };
    const onNav = (_e, navUrl) => {
      try { if (new URL(navUrl).pathname.endsWith('/payment/fail')) { /* 실패 페이지 — 제목 센티넬로 처리 */ } } catch { /* noop */ }
    };
    payWin.webContents.on('page-title-updated', onTitle);
    payWin.webContents.on('did-navigate', onNav);
    payWin.on('closed', () => { if (!done) { done = true; resolve({ status: 'closed' }); } });
    payWin.loadURL(url);
  });
});

// 원격지원(ezHelp) 창이 열려 있는 동안 exe 다운로드를 가로채 자동 저장 + 자동 실행
let remoteSupportOpen = 0;
let rsDownloadHooked = false;
function ensureRemoteSupportDownloadHook() {
  if (rsDownloadHooked) return;
  rsDownloadHooked = true;
  session.defaultSession.on('will-download', (e, item) => {
    try {
      if (remoteSupportOpen <= 0) return; // 원격지원 창이 열려 있을 때만
      const fname = item.getFilename() || `remote_${Date.now()}.exe`;
      if (!/\.exe$/i.test(fname)) return;  // exe만 자동 실행
      const savePath = path.join(app.getPath('downloads'), fname);
      item.setSavePath(savePath); // 저장 다이얼로그 생략 → 자동 저장
      item.once('done', (_e, state) => {
        if (state === 'completed') {
          shell.openPath(savePath).then((err) => { if (err) console.error('원격지원 exe 실행 실패:', err); });
        } else {
          console.error('원격지원 다운로드 상태:', state);
        }
      });
    } catch (err) { console.error('원격지원 다운로드 처리 실패:', err); }
  });
}

// 모달 창 열기
ipcMain.handle('modal:open', async (event, { type, data, width, height, resizable, maximizable, minWidth, maxWidth, maximized }) => {
  const modalId = `modal_${type}_${Date.now()}`;
  const openerWindow = BrowserWindow.fromWebContents(event.sender); // 모달을 연 창 추적

  // 가로 고정·리사이즈/최대화 불가 대상: 공동중개망 폼(hub-form) · 물건등록폼(property-form-v2/property-form)
  const isHub = type === 'hub-form';
  const isPropertyForm = type === 'property-form-v2' || type === 'property-form';
  const isCustomerForm = type === 'customer';
  const isFixed = isHub || isPropertyForm || isCustomerForm;
  const winW = isHub ? 832 : (isPropertyForm ? 1250 : (isCustomerForm ? 1250 : (width || 900)));
  const winH = height || 700;
  const winResizable = isFixed ? false : (resizable !== undefined ? resizable : true);
  const winMaximizable = isFixed ? false : (maximizable !== undefined ? maximizable : true);

  const modalWindow = new BrowserWindow({
    width: winW,
    height: winH,
    ...placeWindowOnActiveDisplay(winW, winH),
    minWidth: isFixed ? winW : (minWidth || 600),
    maxWidth: isFixed ? winW : maxWidth,
    minHeight: 500,
    resizable: winResizable,
    maximizable: winMaximizable,
    fullscreenable: !isFixed,
    title: data?.title || 'Modal',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // parent: mainWindow, // parent 제거하여 독립적인 창으로
    modal: false,
  });

  // 라우트 기반 진입 - URL 파라미터로 데이터 직접 전달
  const base = isDev ? 'http://localhost:1420' : `file://${path.join(__dirname, '../dist/index.html')}`;

  // 데이터를 URL 파라미터로 인코딩
  const encodedData = encodeURIComponent(JSON.stringify({ modalId, type, data }));
  const url = `${base}#/modal/${type}?modalId=${encodeURIComponent(modalId)}&initData=${encodedData}`;

  console.log('Loading modal URL with data');
  await modalWindow.loadURL(url);

  // 전체화면(최대화)으로 열기 요청 시
  if (maximized && !isFixed && !modalWindow.isDestroyed()) {
    try { modalWindow.maximize(); } catch (_) { /* noop */ }
  }

  // 원격지원: 이 창이 열려 있는 동안 exe 다운로드 자동 저장+실행
  if (type === 'remote-support') { ensureRemoteSupportDownloadHook(); remoteSupportOpen += 1; }

  // 창 닫힐 때 Map에서 제거
  modalWindow.on('closed', () => {
    modalWindows.delete(modalId);
    if (type === 'remote-support') remoteSupportOpen = Math.max(0, remoteSupportOpen - 1);

    // 모달을 연 창에 닫힘 알림
    if (openerWindow && !openerWindow.isDestroyed()) {
      openerWindow.webContents.send('modal:closed', { modalId, type });
    }

    modalOpeners.delete(modalId);
  });

  modalWindows.set(modalId, modalWindow);
  modalOpeners.set(modalId, openerWindow);
  return modalId;
});

// 모달 창 닫기
ipcMain.handle('modal:close', (event, { modalId }) => {
  const win = modalWindows.get(modalId);
  if (win && !win.isDestroyed()) {
    win.close();
    return true;
  }
  return false;
});

// 모달 데이터 업데이트 (창을 새로 열지 않고 기존 창의 내용만 변경)
ipcMain.handle('modal:updateData', (event, { modalId, data }) => {
  const win = modalWindows.get(modalId);
  if (win && !win.isDestroyed()) {
    // 모달 창에 데이터 업데이트 메시지 전송
    win.webContents.send('modal:dataUpdated', { data });
    return true;
  }
  return false;
});

// 모달 창 포커스
ipcMain.handle('modal:focus', (event, { modalId }) => {
  const win = modalWindows.get(modalId);
  if (win && !win.isDestroyed()) {
    win.focus();
    // 최소화되어 있다면 복원
    if (win.isMinimized()) {
      win.restore();
    }
    return true;
  }
  return false;
});

// 모달에서 메인으로 데이터 전송
ipcMain.handle('modal:sendToMain', (event, { modalId, type, eventName, data }) => {
  const payload = { modalId, type, data };
  const targets = new Set();
  // 모달을 연 창(분리된 탭 창 등)에도 전달해야 목록 새로고침 등이 동작함
  const opener = modalOpeners.get(modalId);
  if (opener && !opener.isDestroyed()) targets.add(opener);
  if (mainWindow && !mainWindow.isDestroyed()) targets.add(mainWindow);
  // isOpener: 모달을 연 창 여부 — 완료 알림(토스트)은 연 창에만 띄우도록 렌더러가 구분
  const openerWin = opener && !opener.isDestroyed() ? opener : mainWindow;
  targets.forEach((win) => win.webContents.send(`modal:${eventName}`, { ...payload, isOpener: win === openerWin }));
});

// =====================================================
// 자동 업데이트 (DB/API 기반)
// =====================================================

// 스플래시 윈도우 (업데이트 진행 상태 표시)
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  splashWindow.on('closed', () => {
    splashWindow = null;
    // 스플래시가 닫히면 메인 윈도우 생성 (업데이트 진행 중이 아닐 때만)
    if (!mainWindow && !isUpdating) {
      createMainWindow();
    }
  });

  const splashHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif;
          background: transparent; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
        .splash-container { width: 380px; background: white; border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3); padding: 40px; text-align: center; }
        h1 { font-size: 20px; font-weight: 600; color: #111; margin-bottom: 8px; }
        .status { font-size: 14px; color: #666; margin-bottom: 24px; min-height: 20px; }
        .progress-bar { width: 100%; height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden; margin-bottom: 12px; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #4f46e5); width: 0%; transition: width 0.3s ease; }
        .progress-text { font-size: 13px; color: #9ca3af; }
        .spinner { width: 40px; height: 40px; margin: 0 auto; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="splash-container">
        <h1>네오시스</h1>
        <div class="status" id="status">업데이트 확인 중...</div>
        <div class="spinner" id="spinner"></div>
        <div class="progress-bar" id="progressBar" style="display: none;">
          <div class="progress-fill" id="progressFill"></div>
        </div>
        <div class="progress-text" id="progressText"></div>
      </div>
      <script>
        const { ipcRenderer } = require('electron');
        ipcRenderer.on('splash:status', (e, msg) => { document.getElementById('status').textContent = msg; });
        ipcRenderer.on('splash:progress', (e, d) => {
          document.getElementById('spinner').style.display = 'none';
          document.getElementById('progressBar').style.display = 'block';
          document.getElementById('progressFill').style.width = d.percent + '%';
          document.getElementById('progressText').textContent =
            Math.round(d.percent) + '% (' + Math.round(d.transferred/1024/1024) + 'MB / ' + Math.round(d.total/1024/1024) + 'MB)';
        });
      </script>
    </body>
    </html>`;

  splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHtml));
}

function splashStatus(msg) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('splash:status', msg);
  }
}

// v1 > v2 → 1, v1 < v2 → -1, 같으면 0
function compareVersions(v1, v2) {
  const a = String(v1 || '0').split('.').map(Number);
  const b = String(v2 || '0').split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

// API에서 JSON GET (https 자체서명 인증서 허용 + 1회 리다이렉트)
function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { rejectUnauthorized: false, timeout: 8000 }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        httpGetJson(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('JSON 파싱 실패: ' + e.message)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('요청 시간 초과')); });
  });
}

// 최신 버전 조회 (백엔드 API) → { success, version, downloadUrl, mandatory }
async function getLatestVersion() {
  const platform = process.platform === 'darwin' ? 'mac' : 'win';
  const url = `${VERSION_API_BASE}/api/version/latest?platform=${platform}`;
  console.log('[Update] 버전 확인 요청:', url);
  try {
    const json = await httpGetJson(url);
    console.log('[Update] 응답 원문:', JSON.stringify(json));
    const data = json && json.data ? json.data : null;
    if (!data || !data.version) {
      console.log('[Update] 등록된 버전 정보 없음');
      return { success: false, error: '등록된 버전 정보 없음' };
    }
    console.log('[Update] 최신버전:', data.version, '· downloadUrl:', data.downloadUrl, '· mandatory:', !!data.mandatory);
    return { success: true, version: data.version, downloadUrl: data.downloadUrl, mandatory: !!data.mandatory };
  } catch (error) {
    console.error('[Update] 버전 확인 실패:', error.message);
    return { success: false, error: error.message };
  }
}

// 다운로드 저장 경로 (Downloads 폴더, ASCII 파일명)
function resolveInstallerDownloadPath(latestVersion) {
  const fileName = `realestate-erp-Setup-${latestVersion}.exe`;
  return path.join(app.getPath('downloads'), fileName);
}

// 파일 다운로드 (진행률 스플래시 전송, 최대 5회 리다이렉트)
function downloadFile(url, destPath, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) { reject(new Error('리다이렉트 횟수 초과')); return; }
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { rejectUnauthorized: false }, (response) => {
      if ((response.statusCode === 301 || response.statusCode === 302) && response.headers.location) {
        response.resume();
        downloadFile(response.headers.location, destPath, redirects + 1).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error('다운로드 실패 (HTTP ' + response.statusCode + ')'));
        return;
      }
      const file = fs.createWriteStream(destPath);
      const totalBytes = parseInt(response.headers['content-length'], 10) || 0;
      let downloaded = 0;
      response.pipe(file);
      response.on('data', (chunk) => {
        downloaded += chunk.length;
        const percent = totalBytes ? (downloaded / totalBytes) * 100 : 0;
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.webContents.send('splash:progress', { percent, transferred: downloaded, total: totalBytes });
        }
      });
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', (err) => { fs.unlink(destPath, () => {}); reject(err); });
    }).on('error', (err) => { fs.unlink(destPath, () => {}); reject(err); });
  });
}

// 다운로드 파일이 진짜 Windows 실행파일(MZ 헤더)인지 검증
function isValidExeFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const stats = fs.statSync(filePath);
    if (!stats || stats.size < 1024 * 100) return false;
    const fd = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(2);
    fs.readSync(fd, header, 0, 2, 0);
    fs.closeSync(fd);
    return header[0] === 0x4d && header[1] === 0x5a; // 'MZ'
  } catch (error) {
    console.error('[Update] EXE 검증 오류:', error);
    return false;
  }
}

// 무인(silent) 설치 실행 — per-user 설치라 관리자 권한/UAC 불필요.
//  NSIS /S = 완전 무인 설치. 단, silent 모드에서는 runAfterFinish가 무시되므로
//  --force-run 을 함께 넘겨야 설치 완료 후 새 버전이 자동 실행됨(electron-builder NSIS 지원 플래그).
//  detached+unref 로 현재 앱이 종료돼도 설치 프로세스는 계속 진행.
function runInstallerSilent(installerPath) {
  return new Promise((resolve, reject) => {
    try {
      const child = spawn(installerPath, ['/S', '--force-run'], { detached: true, stdio: 'ignore', windowsHide: true });
      child.on('error', reject);
      child.unref();
      resolve(true);
    } catch (e) {
      reject(e);
    }
  });
}

// 스플래시 닫고 메인 시작
function closeSplashAndStart(delay = 500) {
  splashStatus('앱 시작 중...');
  setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    splashWindow = null;
    if (!mainWindow) createMainWindow();
  }, delay);
}

// 설치 자동 실행 실패 시 폴더 열고 수동 실행 안내
async function openInstallerFolderAndNotify(installerPath) {
  await shell.openPath(path.dirname(installerPath));
  await dialog.showMessageBox({
    type: 'warning',
    title: '업데이트 수동 실행 필요',
    message: '업데이트 자동 실행에 실패했습니다.',
    detail: `열린 폴더에서 설치파일을 직접 실행해 주세요.\n파일: ${path.basename(installerPath)}`,
    buttons: ['확인'],
  });
  closeSplashAndStart(200);
}

// 메인 업데이트 로직
async function setupAutoUpdater() {
  try {
    splashStatus('업데이트 확인 중...');
    const currentVersion = app.getVersion();
    console.log('[Update] 현재 버전:', currentVersion);

    const result = await getLatestVersion();
    if (!result.success) {
      console.log('[Update] 버전 조회 실패/없음:', result.error);
      closeSplashAndStart();
      return;
    }

    const { version: latestVersion, downloadUrl } = result;
    if (compareVersions(latestVersion, currentVersion) <= 0 || !downloadUrl) {
      console.log('[Update] 업데이트 없음 (최신:', latestVersion, ')');
      closeSplashAndStart();
      return;
    }

    console.log('[Update] 새 버전 발견:', latestVersion);
    isUpdating = true;
    splashStatus('더 나은 경험을 위해 업데이트 중입니다…');

    const installerPath = resolveInstallerDownloadPath(latestVersion);
    await downloadFile(downloadUrl, installerPath);
    console.log('[Update] 다운로드 완료:', installerPath);

    splashStatus('거의 다 됐어요. 잠시만 기다려 주세요…');
    if (!isValidExeFile(installerPath)) {
      throw new Error('다운로드된 파일이 유효한 EXE가 아닙니다: ' + installerPath);
    }

    // 드라이런: 개발 테스트 시 실제 설치(앱 종료)는 하지 않고 다운로드 확인까지만
    if (updateDryRun) {
      console.log('[Update] DRY RUN — 설치 건너뜀. 설치파일:', installerPath);
      isUpdating = false;
      splashStatus('업데이트 확인 완료 (DRY RUN)');
      closeSplashAndStart(800);
      return;
    }

    // 무인 설치: UAC/마법사 없이 /S 로 조용히 설치 → 설치 완료 후 새 버전 자동 실행(oneClick+runAfterFinish)
    setTimeout(() => {
      runInstallerSilent(installerPath)
        .then(() => { console.log('[Update] 무인 설치 시작 — 앱 종료'); setTimeout(() => app.quit(), 1500); })
        .catch(async (error) => {
          console.error('[Update] 설치 실행 오류:', error);
          isUpdating = false;
          await openInstallerFolderAndNotify(installerPath); // 실패 시에만 수동 폴백
        });
    }, 800);
  } catch (error) {
    console.error('[Update] 업데이트 오류:', error);
    isUpdating = false;
    closeSplashAndStart(1000);
  }
}

// 렌더러용 수동 업데이트 확인
ipcMain.handle('update:checkForUpdates', async () => {
  try {
    const currentVersion = app.getVersion();
    const result = await getLatestVersion();
    if (!result.success) return { success: false, error: result.error };
    return {
      success: true,
      updateAvailable: compareVersions(result.version, currentVersion) > 0,
      currentVersion,
      latestVersion: result.version,
      downloadUrl: result.downloadUrl,
      mandatory: result.mandatory,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 앱 이벤트 핸들러
// F12 → 개발자도구 토글 (빌드/프로덕션 환경 포함, 모든 창에 적용)
app.on('web-contents-created', (_e, contents) => {
  contents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      event.preventDefault();
      try { contents.toggleDevTools(); } catch (_) { /* noop */ }
    }
  });
});

app.whenReady().then(() => {
  // 개발 모드: 자동 업데이트 건너뛰고 바로 메인창 (단, FORCE_UPDATE=1이면 개발에서도 업데이트 흐름 실행)
  if (isDev && !forceUpdate) {
    // 디버깅용: 설치는 하지 않고 버전 체크 결과만 로그로 출력
    console.log('[Update] === 개발 모드 버전체크(로그 전용, 설치 안 함) ===');
    console.log('[Update] 현재 버전:', app.getVersion());
    console.log('[Update] VERSION_API_BASE:', VERSION_API_BASE);
    getLatestVersion()
      .then((r) => {
        if (r.success) {
          const cmp = compareVersions(r.version, app.getVersion());
          console.log('[Update] 비교결과:', cmp > 0 ? '★ 업데이트 있음' : '최신(또는 서버가 더 낮음)',
            `(latest=${r.version}, current=${app.getVersion()}, cmp=${cmp})`);
        } else {
          console.log('[Update] 버전 확인 실패:', r.error);
        }
      })
      .catch((e) => console.error('[Update] 버전체크 예외:', e));
    createMainWindow();
  } else {
    if (isDev) console.log('[Update] 개발 모드 강제 업데이트 테스트 (FORCE_UPDATE)', updateDryRun ? '· DRY RUN' : '');
    // 배포 모드: 스플래시 → 업데이트 체크 → (없으면) 메인창
    createSplashWindow();
    setupAutoUpdater();

    // 안전장치: 최대 60초 후 강제로 메인창 생성 (업데이트 다운로드 중이 아닐 때만)
    setTimeout(() => {
      if (!isUpdating && (!mainWindow || mainWindow.isDestroyed())) {
        if (splashWindow && !splashWindow.isDestroyed()) { splashWindow.close(); splashWindow = null; }
        createMainWindow();
      }
    }, 60000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && !isUpdating) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ─────────────────────────────────────────────────────────────
// PC폰관리 (KT 통화) — 계정 저장/조회/로그인
//  - 자격증명 저장소: %ProgramData%\CallbackProAgent\appInfo.inf (JSON, KT 참고 서비스와 동일 스키마)
//  - phone:login 은 2단계(KT DLL 브리지) 연동 전까지 스텁
// ─────────────────────────────────────────────────────────────
const PHONE_ACCOUNT_DIR = path.join(process.env.ProgramData || 'C:\\ProgramData', 'CallbackProAgent');
const PHONE_ACCOUNT_FILE = path.join(PHONE_ACCOUNT_DIR, 'appInfo.inf');

function readPhoneAccount() {
  try {
    if (!fs.existsSync(PHONE_ACCOUNT_FILE)) return null;
    return JSON.parse(fs.readFileSync(PHONE_ACCOUNT_FILE, 'utf8'));
  } catch (e) {
    console.error('[phone] 계정 파일 읽기 실패:', e);
    return null;
  }
}

function writePhoneAccount(cfg) {
  fs.mkdirSync(PHONE_ACCOUNT_DIR, { recursive: true });
  const prev = readPhoneAccount() || {};
  const merged = { ...prev, ...(cfg || {}) };
  fs.writeFileSync(PHONE_ACCOUNT_FILE, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

ipcMain.handle('phone:getAccount', () => readPhoneAccount());

ipcMain.handle('phone:saveAccount', (event, cfg) => {
  try {
    const merged = writePhoneAccount(cfg);
    return { success: true, config: merged };
  } catch (e) {
    console.error('[phone] 계정 저장 실패:', e);
    return { success: false, message: e.message };
  }
});

// 착신 시 네오봇 새 창을 여기(메인 프로세스)에서 1회만 오픈 (렌더러 다중 마운트로 인한 중복 방지)
let lastNeobotCall = { caller: '', at: 0 };
function openNeobotWindow(initState) {
  const actualTabId = `neobot_${Date.now()}`;
  const win = new BrowserWindow({
    width: 520, height: 750, minWidth: 520, minHeight: 750, maxWidth: 520, resizable: false,
    ...placeWindowOnActiveDisplay(520, 750),
    title: '네오봇',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  });
  const base = isDev ? 'http://localhost:1420' : `file://${path.join(__dirname, '../dist/index.html')}`;
  let url = `${base}#/tab?route=${encodeURIComponent('/neobot')}&tabId=${encodeURIComponent(actualTabId)}`;
  if (initState && typeof initState === 'object' && Object.keys(initState).length > 0) {
    url += `&initState=${encodeURIComponent(JSON.stringify(initState))}`;
  }
  win.loadURL(url);
  win.webContents.once('did-finish-load', () => {
    win.webContents.send('tab:init', { tabId: actualTabId, route: '/neobot', initState });
  });
  win.on('closed', () => { detachedTabs.delete(actualTabId); });
  detachedTabs.set(actualTabId, win);
}

// 착신 이벤트 → 열려있는 모든 창으로 브로드캐스트 (렌더러의 PhoneCallHost가 팝업 표시) + 네오봇 자동 오픈
function broadcastIncomingCall(data) {
  console.log('[phone] 착신:', data);
  BrowserWindow.getAllWindows().forEach((w) => {
    if (!w.isDestroyed()) {
      try { w.webContents.send('phone:incomingCall', data); } catch (_) { /* skip */ }
    }
  });
  // 호처리중(201)이거나 상태값 없을 때만, 같은 번호 15초 이내 중복 오픈 방지
  if (!data?.result || data.result === '201') {
    const caller = data?.caller || '';
    const nowMs = Date.now();
    if (!(caller === lastNeobotCall.caller && nowMs - lastNeobotCall.at < 15000)) {
      lastNeobotCall = { caller, at: nowMs };
      try {
        openNeobotWindow({ phoneNumber: caller, incoming: true, callAt: new Date().toISOString(), callerInfo: data?.callerInfo || '' });
      } catch (e) { console.error('[phone] 네오봇 자동오픈 실패:', e); }
    }
  }
}
ktBridge.setOnIncomingCall(broadcastIncomingCall);

// 착신 테스트(시뮬레이션) — PC폰관리 화면에서 번호 넣고 호출
ipcMain.handle('phone:simulateIncomingCall', (event, phoneNumber) => {
  broadcastIncomingCall({ type: 'incomingCall', caller: String(phoneNumber || ''), callerInfo: '테스트 착신', result: '201' });
  return { success: true };
});

// KT 로그인 (koffi 브리지 경유)
ipcMain.handle('phone:login', async (event, cfg) => {
  const acc = cfg || readPhoneAccount();
  if (!acc || !acc.KtUserId) {
    return { success: false, reason: 'no-account', message: 'KT 계정이 등록되지 않았습니다.' };
  }
  return await ktBridge.login(acc);
});

// 문자 전송
ipcMain.handle('phone:sendSms', async (event, { to, message } = {}) => {
  if (!to || !message) return { success: false, message: '수신번호와 내용을 입력하세요.' };
  return await ktBridge.sendSms(to, message);
});

// 주소록 (KT COM 경유)
ipcMain.handle('phone:getAddressGroups', async () => await ktBridge.getAddressGroups());
ipcMain.handle('phone:getAddressData', async (event, { pdbid } = {}) => await ktBridge.getAddressData(pdbid));

// 브리지 상태 조회(디버그/상태표시용)
ipcMain.handle('phone:status', () => ktBridge.getStatus());

// 앱 종료 시 KT 브리지 프로세스 정리
app.on('before-quit', () => { try { ktBridge.stop(); } catch (_) { /* skip */ } });

// 프로그램 시작 시: 저장된 계정이 있으면 자동 로그인
async function tryPhoneAutoLogin() {
  const acc = readPhoneAccount();
  if (!acc || !acc.KtUserId) return;
  try {
    const res = await ktBridge.login(acc);
    console.log('[phone] 자동 로그인 결과:', res?.success ? '성공' : (res?.message || '실패'));
  } catch (e) {
    console.error('[phone] 자동 로그인 실패:', e);
  }
}

// 보안: 새 윈도우 생성 제한
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    // 원격지원 중 exe를 새 창으로 열려 하면 외부 브라우저 대신 앱 내에서 다운로드(→ will-download 훅이 자동 저장·실행)
    if (remoteSupportOpen > 0 && /\.exe(\?|$)/i.test(navigationUrl || '')) {
      try { contents.downloadURL(navigationUrl); return; }
      catch (e) { console.error('원격지원 다운로드 트리거 실패:', e); }
    }
    shell.openExternal(navigationUrl);
  });
});