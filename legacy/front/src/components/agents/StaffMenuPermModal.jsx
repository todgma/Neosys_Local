import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { MENU_PERM_ITEMS } from '../../constants/menuPerm';
import { staffPermService } from '../../services/staffPermService';

/**
 * 직원 메뉴 권한 설정 모달 — 대시보드 메뉴 체크박스. 저장 시 rt_menu_perm 전체 교체.
 *  props: rtNo, name, userId, onClose
 */
export default function StaffMenuPermModal({ rtNo, name, userId, onClose }) {
  const [checked, setChecked] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { const keys = await staffPermService.get(rtNo); setChecked(new Set(keys)); }
      finally { setLoading(false); }
    })();
  }, [rtNo]);

  const toggle = (key) => setChecked((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const allKeys = MENU_PERM_ITEMS.map((m) => m.key);
  const allChecked = allKeys.every((k) => checked.has(k));
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(allKeys));

  const save = async () => {
    setSaving(true);
    try {
      await staffPermService.set(rtNo, Array.from(checked), userId);
      toast.success('메뉴 권한이 저장되었습니다.');
      onClose?.();
    } catch (e) { toast.error('저장에 실패했습니다.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">메뉴 권한 설정 {name ? <span className="text-sm font-semibold text-gray-500">— {name}</span> : null}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">접근 허용 메뉴 선택</span>
            <button type="button" onClick={toggleAll} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
              {allChecked ? '전체 해제' : '전체 선택'}
            </button>
          </div>
          {loading ? (
            <div className="py-10 text-center text-gray-400 text-sm">불러오는 중…</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {MENU_PERM_ITEMS.map((m) => (
                <label key={m.key} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={checked.has(m.key)} onChange={() => toggle(m.key)} />
                  <span className="text-sm font-medium text-gray-800">{m.label}</span>
                </label>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs font-semibold text-gray-500">* 체크 해제된 메뉴는 해당 직원 로그인 시 <b>권한없음</b>으로 표시됩니다. (대표중개사는 항상 전체 이용)</p>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-200">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200">취소</button>
          <button type="button" onClick={save} disabled={saving || loading} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">{saving ? '저장 중…' : '저장'}</button>
        </div>
      </div>
    </div>
  );
}
