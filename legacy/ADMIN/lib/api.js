// 관리자 웹 → RealestateAPI 호출 래퍼
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5073';

async function req(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const json = await res.json().catch(() => null);
  // ResponseHelper.Success → { success, data, message } 형태 가정. data 우선 반환.
  return json?.data ?? json;
}

export const api = {
  get: (p) => req(p),
  post: (p, body) => req(p, { method: 'POST', body }),
  put: (p, body) => req(p, { method: 'PUT', body }),
  del: (p) => req(p, { method: 'DELETE' }),
};
