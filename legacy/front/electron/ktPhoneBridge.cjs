// ─────────────────────────────────────────────────────────────────────────
// KT 통화 브리지 — Electron main ↔ C# 헬퍼(KTBridge.exe) stdin/stdout JSON
//
//  KT 통화매니저 API는 COM/ActiveX(KTPCBizX Class, EventV2CID 커넥션포인트)라
//  Node FFI(koffi)로는 못 붙는다. 대신 COM을 다루는 초경량 C# 콘솔(KTBridge.exe)을
//  spawn 하고, 줄단위 JSON으로 명령/이벤트를 주고받는다.
//
//  프로토콜(모두 한 줄당 하나의 JSON):
//   Electron → KTBridge (stdin):
//     {"cmd":"login","reqId":"..","id":"..","pw":"..","dev":true,"phone":".."}
//     {"cmd":"sendSms","reqId":"..","to":"..","msg":".."}
//     {"cmd":"getAddressGroups","reqId":".."}
//     {"cmd":"getAddressData","reqId":"..","pdbid":".."}
//     {"cmd":"quit"}
//   KTBridge → Electron (stdout):
//     {"type":"ready"}
//     {"type":"incomingCall","caller":"010..","callee":"..","result":"201","dbid":"..","callerInfo":".."}
//     {"reqId":"..","type":"login","success":true,"code":200}
//     {"reqId":"..","type":"sms","success":true,"code":0}
//     {"reqId":"..","type":"address","groups":[...]} / {"type":"addressData","data":[...]}
//     {"type":"loginStatus","code":200} / {"type":"connect","connected":true} / {"type":"log","message":".."}
//
//  KTBridge.exe 가 없어도(미빌드) 앱은 죽지 않고 구조화된 실패를 반환한다.
// ─────────────────────────────────────────────────────────────────────────

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let proc = null;
let ready = false;
let buf = '';
let disabledReason = 'not-started';
let onIncomingCall = null;
let onEvent = null;
const pending = new Map(); // reqId -> { resolve, timer }
let reqSeq = 0;

function resolveExePath() {
  if (process.env.KT_BRIDGE_EXE && fs.existsSync(process.env.KT_BRIDGE_EXE)) {
    return process.env.KT_BRIDGE_EXE;
  }
  const tfm = 'net8.0-windows';
  const root = path.join(__dirname, '..', '..'); // 저장소 루트
  // 빌드 산출물(옆에 .dll/.json/의존DLL이 모두 있는 폴더)을 먼저 찾는다.
  // .exe만 복사하면 KTBridge.dll을 못 찾아 실행 실패하므로 산출물 폴더 우선.
  const candidates = [
    path.join(process.resourcesPath || '', 'ktbridge', 'KTBridge.exe'),
    path.join(root, 'native', 'KTBridge', 'bin', 'Release', tfm, 'win-x86', 'KTBridge.exe'),
    path.join(root, 'native', 'KTBridge', 'bin', 'Release', tfm, 'KTBridge.exe'),
    path.join(root, 'native', 'KTBridge', 'bin', 'x86', 'Release', tfm, 'win-x86', 'KTBridge.exe'),
    path.join(root, 'native', 'KTBridge', 'bin', 'x86', 'Release', tfm, 'KTBridge.exe'),
    path.join(root, 'native', 'KTBridge', 'bin', 'Debug', tfm, 'win-x86', 'KTBridge.exe'),
    path.join(root, 'native', 'KTBridge', 'bin', 'Debug', tfm, 'KTBridge.exe'),
    // 폴더째 복사한 경우(.dll/.json 동반)
    path.join(root, 'native', 'KTBridge', 'KTBridge.exe'),
    path.join(__dirname, '..', 'native', 'KTBridge', 'KTBridge.exe'),
  ];
  for (const c of candidates) {
    try { if (c && fs.existsSync(c)) return c; } catch (_) { /* skip */ }
  }
  return null;
}

function handleMessage(msg) {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'ready') { ready = true; disabledReason = null; return; }
  if (msg.type === 'incomingCall') { try { onIncomingCall && onIncomingCall(msg); } catch (e) { console.error(e); } return; }
  if (msg.reqId && pending.has(msg.reqId)) {
    const p = pending.get(msg.reqId);
    clearTimeout(p.timer);
    pending.delete(msg.reqId);
    p.resolve(msg);
    return;
  }
  // loginStatus / connect / log 등 상태 이벤트
  try { onEvent && onEvent(msg); } catch (e) { console.error(e); }
}

function onStdout(chunk) {
  buf += chunk.toString('utf8');
  let idx;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch (e) { console.log('[KTBridge]', line); continue; }
    handleMessage(msg);
  }
}

function start() {
  if (proc) return true;
  const exe = resolveExePath();
  if (!exe) { disabledReason = 'exe-not-found'; console.warn('[KTBridge] 실행파일 없음 — 브리지 비활성'); return false; }
  try {
    proc = spawn(exe, [], { cwd: path.dirname(exe), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    proc.stdout.on('data', onStdout);
    proc.stderr.on('data', (d) => console.error('[KTBridge stderr]', String(d || '').trim()));
    proc.on('exit', (code) => { console.warn('[KTBridge] 종료 code=', code); proc = null; ready = false; disabledReason = 'exited'; });
    proc.on('error', (e) => { console.error('[KTBridge] spawn 오류:', e); proc = null; ready = false; disabledReason = 'spawn-error'; });
    console.log('[KTBridge] 실행:', exe);
    return true;
  } catch (e) {
    console.error('[KTBridge] 실행 실패:', e);
    proc = null; disabledReason = 'spawn-error';
    return false;
  }
}

function send(cmdObj, { expectReply = true, timeoutMs = 15000 } = {}) {
  if (!proc && !start()) {
    return Promise.resolve({ success: false, reason: disabledReason, message: `KT 브리지 실행 불가 (${disabledReason})` });
  }
  const reqId = `r${++reqSeq}`;
  let line;
  try { line = JSON.stringify({ ...cmdObj, reqId }) + '\n'; proc.stdin.write(line); }
  catch (e) { return Promise.resolve({ success: false, message: e.message }); }
  if (!expectReply) return Promise.resolve({ success: true });
  return new Promise((resolve) => {
    const timer = setTimeout(() => { pending.delete(reqId); resolve({ success: false, reason: 'timeout', message: 'KT 브리지 응답 시간 초과' }); }, timeoutMs);
    pending.set(reqId, { resolve, timer });
  });
}

module.exports = {
  start,
  isReady: () => ready,
  getStatus: () => ({ ready, running: !!proc, reason: disabledReason }),
  setOnIncomingCall: (cb) => { onIncomingCall = cb; },
  setOnEvent: (cb) => { onEvent = cb; },
  login: (acc) => send({ cmd: 'login', id: acc?.KtUserId, pw: acc?.KtPassword, dev: !!acc?.IsDevelopmentMode, phone: acc?.PhoneNumber }),
  sendSms: (to, msg) => send({ cmd: 'sendSms', to, msg }),
  getAddressGroups: () => send({ cmd: 'getAddressGroups' }),
  getAddressData: (pdbid) => send({ cmd: 'getAddressData', pdbid }),
  stop: () => {
    if (proc) {
      try { proc.stdin.write(JSON.stringify({ cmd: 'quit' }) + '\n'); } catch (_) { /* skip */ }
      try { proc.kill(); } catch (_) { /* skip */ }
      proc = null; ready = false;
    }
  },
};
