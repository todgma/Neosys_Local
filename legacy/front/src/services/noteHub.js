import * as signalR from '@microsoft/signalr';
import API_ENDPOINTS from '../config/apiEndpoints';

// REST 베이스에서 SignalR 허브 URL 유도: {BASE}/api/Hub → {BASE}/hubs/note
// ※ SignalR은 멀티서버 LB에서 커넥션 핸드셰이크가 깨지므로, 전용 단일서버 호스트(hub.neosis.kr)로 고정.
//    (api.neosis.kr 는 LB 2대 → negotiate/연결이 서버 갈려 404. hub.neosis.kr 는 서버 1대 직결)
const HUB_URL = API_ENDPOINTS.hub.list
  .replace(/\/api\/Hub$/i, '/hubs/note')
  .replace('://api.neosis.kr', '://hub.neosis.kr');

let connection = null;
// 세대 토큰: start/stop 경쟁(특히 StrictMode 이중 마운트)에서 최신 요청만 유효
let token = 0;

/**
 * 쪽지 실시간 허브 연결 시작.
 * @param {string} userId 현재 사용자 ID (연결 그룹 키)
 * @param {(payload:any)=>void} onNoteReceived 새 쪽지 수신 콜백
 */
export async function startNoteHub(userId, onNoteReceived) {
  if (!userId) return null;
  const myToken = ++token;

  // 이미 살아있는 연결이 있으면 정리
  if (connection) {
    const prev = connection;
    connection = null;
    try { await prev.stop(); } catch { /* noop */ }
  }
  if (myToken !== token) return null; // 그 사이 더 최신 start/stop 발생 → 중단

  const conn = new signalR.HubConnectionBuilder()
    // withCredentials:false → 쿠키 미사용(userId는 쿼리로 전달). 서버 CORS 와일드카드('*') 허용.
    .withUrl(`${HUB_URL}?userId=${encodeURIComponent(userId)}`, { withCredentials: false })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  conn.on('noteReceived', (payload) => {
    try { onNoteReceived?.(payload); } catch { /* noop */ }
  });

  try {
    await conn.start();
    if (myToken !== token) {
      // 연결되는 사이 더 최신 start/stop이 들어옴 → 이 연결 폐기
      try { await conn.stop(); } catch { /* noop */ }
      return null;
    }
    connection = conn;
  } catch (e) {
    // 최신 요청일 때만 경고 (오래된/중단된 연결의 협상 취소는 무시)
    if (myToken === token) console.warn('[NoteHub] 연결 실패:', e);
  }
  return connection;
}

export async function stopNoteHub() {
  token++; // 진행 중인 start 무효화
  if (connection) {
    const c = connection;
    connection = null;
    try { await c.stop(); } catch { /* noop */ }
  }
}
