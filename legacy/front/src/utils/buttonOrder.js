// 필터 버튼 순서 저장/로드 (드래그 재정렬 + localStorage 자동저장)
// base: [{ label, value }], key: localStorage 키

export const loadOrderedButtons = (base, key) => {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (Array.isArray(saved)) {
      const byVal = new Map(base.map((b) => [b.value, b]));
      const ordered = saved.map((v) => byVal.get(v)).filter(Boolean);
      // 저장된 순서에 없는(새로 추가된) 버튼은 뒤에 이어붙임
      base.forEach((b) => { if (!saved.includes(b.value)) ordered.push(b); });
      return ordered;
    }
  } catch (e) { /* ignore */ }
  return [...base];
};

export const saveButtonOrder = (list, key) => {
  try { localStorage.setItem(key, JSON.stringify(list.map((b) => b.value))); } catch (e) { /* ignore */ }
};

// 배열에서 from → to 로 항목 이동한 새 배열 반환
export const moveItem = (list, from, to) => {
  if (from == null || to == null || from === to) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};
