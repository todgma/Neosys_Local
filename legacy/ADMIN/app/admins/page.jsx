'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAdminStore } from '../../stores/adminStore';

const pick = (o, ...keys) => { for (const k of keys) { if (o && o[k] != null && o[k] !== '') return o[k]; } return ''; };
const fmtDt = (v) => String(v || '').replace('T', ' ').slice(0, 16);
const EMPTY = { adminId: '', pw: '', name: '', role: 'NORMAL' };

export default function AdminsPage() {
  const admin = useAdminStore((s) => s.admin);
  const meId = admin?.adminId || null;
  const allowed = admin?.role === 'SUPER';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState(null); // {adminId?, pw, name, role, isNew}
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const d = await api.get('/api/admin/accounts'); setRows(d?.items || d?.Items || []); }
    catch (e) { console.error(e); setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const openNew = () => setEdit({ ...EMPTY, isNew: true });
  const openEdit = (r) => setEdit({ adminId: pick(r, 'adminId', 'AdminId'), pw: '', name: pick(r, 'name', 'Name'), role: pick(r, 'role', 'Role') || 'NORMAL', isNew: false });

  const save = async () => {
    if (!edit) return;
    if (edit.isNew && (!edit.adminId.trim() || !edit.pw.trim())) { alert('아이디와 비밀번호를 입력하세요.'); return; }
    setSaving(true);
    try {
      const actorId = meId;
      if (edit.isNew) {
        const d = await api.post('/api/admin/accounts', { AdminId: edit.adminId.trim(), Pw: edit.pw, Name: edit.name, Role: edit.role, ActorId: actorId });
        if (d?.adminId) { setEdit(null); await load(); }
        else alert(d?.error?.message || d?.message || '추가 실패');
      } else {
        const d = await api.put(`/api/admin/accounts/${encodeURIComponent(edit.adminId)}`, { Name: edit.name, Role: edit.role, Pw: edit.pw || null, ActorId: actorId });
        if (d?.updated ?? d?.Updated) { setEdit(null); await load(); }
        else alert('수정 실패');
      }
    } catch (e) { console.error(e); alert('저장에 실패했습니다.'); }
    finally { setSaving(false); }
  };

  const remove = async (r) => {
    const aid = pick(r, 'adminId', 'AdminId');
    if (aid === meId) { alert('본인 계정은 삭제할 수 없습니다.'); return; }
    if (!window.confirm(`관리자 '${aid}' 계정을 삭제할까요?`)) return;
    try {
      const d = await api.del(`/api/admin/accounts/${encodeURIComponent(aid)}?actorId=${encodeURIComponent(meId || '')}`);
      if (d?.deleted ?? d?.Deleted) await load();
      else alert(d?.error?.message || d?.message || '삭제 실패');
    } catch (e) { console.error(e); alert('삭제에 실패했습니다.'); }
  };

  const th = { fontSize: '14px', fontWeight: 800, color: '#111827', padding: '9px 10px', borderBottom: '2px solid #cbd5e1', background: '#f1f5f9', textAlign: 'left', whiteSpace: 'nowrap' };
  const td = { fontSize: '14px', fontWeight: 600, color: '#111827', padding: '8px 10px', borderBottom: '1px solid #eef1f5' };
  const inp = { width: '100%', boxSizing: 'border-box', fontSize: '14px', fontWeight: 600, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' };
  const lbl = { fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '4px' };

  if (!allowed) {
    return <div><h1 style={{ fontSize: '22px', fontWeight: 800 }}>관리자관리</h1><p style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>슈퍼관리자만 접근할 수 있습니다.</p></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginTop: 0 }}>관리자관리 <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>(슈퍼관리자 전용)</span></h1>
        <button onClick={openNew} style={{ fontSize: '14px', fontWeight: 800, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '8px', padding: '9px 16px', cursor: 'pointer' }}>+ 관리자 추가</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto', marginTop: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>아이디</th><th style={th}>이름</th><th style={{ ...th, width: '130px' }}>권한</th>
              <th style={{ ...th, width: '150px' }}>등록일</th><th style={{ ...th, width: '150px' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: '30px' }}>불러오는 중…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: '30px' }}>관리자가 없습니다.</td></tr>
                : rows.map((r, i) => {
                  const role = pick(r, 'role', 'Role');
                  return (
                    <tr key={i}>
                      <td style={{ ...td, fontWeight: 800 }}>{pick(r, 'adminId', 'AdminId')}</td>
                      <td style={td}>{pick(r, 'name', 'Name') || '-'}</td>
                      <td style={td}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: role === 'SUPER' ? '#b45309' : '#2563eb', background: role === 'SUPER' ? '#fef3c7' : '#dbeafe', borderRadius: '999px', padding: '2px 10px' }}>
                          {role === 'SUPER' ? '슈퍼관리자' : '일반관리자'}
                        </span>
                      </td>
                      <td style={td}>{fmtDt(pick(r, 'regDt', 'RegDt'))}</td>
                      <td style={td}>
                        <button onClick={() => openEdit(r)} style={{ fontSize: '14px', fontWeight: 700, color: '#4f46e5', background: 'white', border: '1px solid #c7d2fe', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', marginRight: '6px' }}>수정</button>
                        <button onClick={() => remove(r)} style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626', background: 'white', border: '1px solid #fecaca', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }}>삭제</button>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {edit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setEdit(null)}>
          <div style={{ width: '420px', maxWidth: '94%', background: 'white', borderRadius: '12px', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#4f46e5', fontSize: '16px', fontWeight: 800, color: 'white' }}>
              {edit.isNew ? '관리자 추가' : `관리자 수정 (${edit.adminId})`}
            </div>
            <div style={{ padding: '16px' }}>
              {edit.isNew && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={lbl}>아이디</div>
                  <input value={edit.adminId} onChange={(e) => setEdit({ ...edit, adminId: e.target.value })} style={inp} placeholder="로그인 아이디" />
                </div>
              )}
              <div style={{ marginBottom: '12px' }}>
                <div style={lbl}>이름</div>
                <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} style={inp} placeholder="관리자 이름" />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <div style={lbl}>비밀번호 {edit.isNew ? '' : '(변경 시에만 입력)'}</div>
                <input value={edit.pw} onChange={(e) => setEdit({ ...edit, pw: e.target.value })} type="password" style={inp} placeholder={edit.isNew ? '비밀번호' : '변경하지 않으면 비워두세요'} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={lbl}>권한</div>
                <select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })} style={inp}>
                  <option value="NORMAL">일반관리자</option>
                  <option value="SUPER">슈퍼관리자</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button onClick={() => setEdit(null)} style={{ fontSize: '14px', fontWeight: 600, color: '#334155', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '9px 16px', cursor: 'pointer' }}>취소</button>
                <button onClick={save} disabled={saving} style={{ fontSize: '14px', fontWeight: 800, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '6px', padding: '9px 18px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? '저장 중…' : '저장'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
