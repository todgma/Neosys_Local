/**
 * 계약서 로컬 저장소 (백엔드 연동 전 localStorage) — 목록/에디터/모달창 공용
 */
const STORAGE_KEY = 'erp_contracts_v1';

export const loadContracts = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};

const persist = (list) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* noop */ }
};

// 신규/수정 upsert. 저장된 id 반환
export const saveContract = (data) => {
  const list = loadContracts();
  let savedId = data.id;
  let next;
  if (data.id) {
    next = list.map((c) => (c.id === data.id ? { ...c, ...data, savedAt: new Date().toISOString() } : c));
  } else {
    savedId = `ct_${Date.now()}`;
    next = [{ ...data, id: savedId, status: '작성', savedAt: new Date().toISOString() }, ...list];
  }
  persist(next);
  return savedId;
};

export const deleteContracts = (ids) => {
  const del = new Set(ids);
  const next = loadContracts().filter((c) => !del.has(c.id));
  persist(next);
  return next;
};
