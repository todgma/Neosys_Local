'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

const g = (o, ...keys) => { for (const k of keys) { if (o && o[k] != null && o[k] !== '') return o[k]; } return ''; };
const EMPTY = { catCd: '', midCd: '', subCd: '', subNm: '', etc1: '', etc2: '', sort: '', useYn: 'Y' };
const numOrNull = (v) => { if (v === '' || v == null) return null; const n = Number(v); return isNaN(n) ? null : n; };

// 코드→한글 기본 라벨(데이터에 분류명/중분류명이 비어있을 때 대비). 실제 이름은 etc1(분류명)/etc2(중분류명)에서 읽음.
const FALLBACK = {
  cat: { FIL: '파일' },
  mid: { TYP: '파일유형', DIV: '파일구분' },
};

/**
 * 공통코드관리 — 분류 › 중분류 트리를 "한글"로 표기하고 코드 추가/수정/삭제.
 *   · 분류명 = etc1(한글), 중분류명 = etc2(한글)  → 비개발자가 폼에서 직접 편집
 *   · 조회 GET /api/syscode/GetSubCodeList
 *   · 등록 POST /api/syscode?UserId=admin  { CreateSubCodes:[{CatCd,MidCd,SubCd,SubNm,Etc1,Etc2,UseYn,Sort}] }
 *   · 수정 PUT  /api/syscode?UserId=admin
 *   · 삭제 DEL  /api/syscode?CatCd=&MidCd=&SubCd=
 */
export default function CodesPage() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(null);         // { cat, mid }
  const [expanded, setExpanded] = useState({});
  const [form, setForm] = useState(null);
  const [isNew, setIsNew] = useState(true);

  const reload = async () => {
    setLoading(true);
    try { const d = await api.get('/api/syscode/GetSubCodeList'); setAll(d?.sysCodeSubs || d?.items || []); }
    catch (e) { console.error(e); setAll([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  // 분류 › 중분류 › [코드] 트리
  const tree = useMemo(() => {
    const m = {};
    all.forEach((r) => {
      const cat = g(r, 'catCd', 'CatCd') || '(미분류)';
      const mid = g(r, 'midCd', 'MidCd') || '(미분류)';
      (m[cat] = m[cat] || {});
      (m[cat][mid] = m[cat][mid] || []).push(r);
    });
    Object.values(m).forEach((mids) => Object.values(mids).forEach((arr) =>
      arr.sort((a, b) => (Number(g(a, 'sort', 'Sort')) || 0) - (Number(g(b, 'sort', 'Sort')) || 0) || String(g(a, 'subCd', 'SubCd')).localeCompare(String(g(b, 'subCd', 'SubCd'))))));
    return m;
  }, [all]);

  // 분류명(한글): etc1 우선 → FALLBACK → 코드
  const catNm = (cat) => {
    const mids = tree[cat];
    if (mids) { for (const arr of Object.values(mids)) { const e = arr.find((r) => g(r, 'etc1', 'Etc1')); if (e) return g(e, 'etc1', 'Etc1'); } }
    return FALLBACK.cat[cat] || cat;
  };
  // 중분류명(한글): etc2 우선 → FALLBACK → 코드
  const midNm = (cat, mid) => {
    const arr = tree[cat]?.[mid];
    if (arr) { const e = arr.find((r) => g(r, 'etc2', 'Etc2')); if (e) return g(e, 'etc2', 'Etc2'); }
    return FALLBACK.mid[mid] || mid;
  };

  const rows = sel ? (tree[sel.cat]?.[sel.mid] || []) : [];

  const addCode = () => {
    setIsNew(true);
    setForm({
      ...EMPTY,
      catCd: sel?.cat && sel.cat !== '(미분류)' ? sel.cat : '',
      midCd: sel?.mid && sel.mid !== '(미분류)' ? sel.mid : '',
      etc1: sel ? (FALLBACK.cat[sel.cat] || catNm(sel.cat) === sel.cat ? '' : catNm(sel.cat)) : '',
      etc2: sel ? (midNm(sel.cat, sel.mid) === sel.mid ? '' : midNm(sel.cat, sel.mid)) : '',
    });
  };
  const editCode = (r) => {
    setIsNew(false);
    setForm({
      catCd: g(r, 'catCd', 'CatCd'), midCd: g(r, 'midCd', 'MidCd'), subCd: g(r, 'subCd', 'SubCd'), subNm: g(r, 'subNm', 'SubNm'),
      etc1: g(r, 'etc1', 'Etc1'), etc2: g(r, 'etc2', 'Etc2'), sort: g(r, 'sort', 'Sort'), useYn: g(r, 'useYn', 'UseYn') || 'Y',
    });
  };
  const saveCode = async () => {
    if (!form.catCd || !form.midCd || !form.subCd) { alert('분류/중분류/코드는 필수입니다.'); return; }
    const body = { CreateSubCodes: [{ CatCd: form.catCd.trim(), MidCd: form.midCd.trim(), SubCd: form.subCd.trim(), SubNm: form.subNm, Etc1: form.etc1, Etc2: form.etc2, UseYn: form.useYn || 'Y', Sort: numOrNull(form.sort) }] };
    try {
      if (isNew) await api.post('/api/syscode?UserId=admin', body);
      else await api.put('/api/syscode?UserId=admin', body);
      setForm(null); await reload();
      setSel({ cat: form.catCd.trim(), mid: form.midCd.trim() });
      setExpanded((s) => ({ ...s, [form.catCd.trim()]: true }));
    } catch (e) { alert('저장 실패: ' + (e?.message || '')); }
  };
  const delCode = async (r) => {
    if (!confirm(`[${g(r, 'subCd', 'SubCd')}] ${g(r, 'subNm', 'SubNm')} 코드를 삭제할까요?`)) return;
    try {
      await api.del(`/api/syscode?CatCd=${encodeURIComponent(g(r, 'catCd', 'CatCd'))}&MidCd=${encodeURIComponent(g(r, 'midCd', 'MidCd'))}&SubCd=${encodeURIComponent(g(r, 'subCd', 'SubCd'))}`);
      await reload();
    } catch (e) { alert('삭제 실패: ' + (e?.message || '')); }
  };

  const fRow = { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' };
  const fLbl = { width: '82px', flexShrink: 0, fontSize: '13px', fontWeight: 700, color: '#334155', textAlign: 'right' };
  const codeChip = { fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginLeft: '6px' };

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px' }}>공통코드관리</h1>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* 좌: 한글 분류 트리 */}
        <div className="card" style={{ flex: '0 0 340px', padding: '10px 8px', maxHeight: '76vh', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px 8px' }}>
            <b style={{ fontSize: '15px' }}>분류 트리</b>
            <button className="btn primary" style={{ padding: '3px 10px' }} onClick={addCode}>＋ 코드 추가</button>
          </div>
          {loading ? <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>불러오는 중…</div>
            : Object.keys(tree).length === 0 ? <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>코드 없음</div>
              : Object.keys(tree).sort().map((cat) => (
                <div key={cat}>
                  <div onClick={() => setExpanded((s) => ({ ...s, [cat]: !s[cat] }))}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 8px', cursor: 'pointer', fontWeight: 800, fontSize: '15px', color: '#111827' }}>
                    <span style={{ width: '12px', display: 'inline-block' }}>{expanded[cat] ? '▾' : '▸'}</span>
                    {catNm(cat)}<span style={codeChip}>{cat}</span>
                  </div>
                  {expanded[cat] && Object.keys(tree[cat]).sort().map((mid) => {
                    const active = sel && sel.cat === cat && sel.mid === mid;
                    return (
                      <div key={mid} onClick={() => { setSel({ cat, mid }); setForm(null); }}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px 5px 26px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, borderRadius: '4px', background: active ? '#eef2ff' : 'transparent', color: active ? '#4f46e5' : '#334155' }}>
                        <span>{midNm(cat, mid)}<span style={codeChip}>{mid}</span></span>
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>{tree[cat][mid].length}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
        </div>

        {/* 우: 코드 목록 + 추가/수정 폼 */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {form && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <b style={{ fontSize: '15px' }}>{isNew ? '코드 추가' : '코드 수정'}</b>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '4px 20px', marginTop: '10px' }}>
                <label style={fRow}><span style={fLbl}>분류명</span><input style={{ flex: 1 }} value={form.etc1} onChange={(e) => setForm({ ...form, etc1: e.target.value })} placeholder="한글 (예: 파일)" /></label>
                <label style={fRow}><span style={fLbl}>분류코드</span><input style={{ flex: 1 }} value={form.catCd} onChange={(e) => setForm({ ...form, catCd: e.target.value })} disabled={!isNew} placeholder="예: FIL (3자)" /></label>
                <label style={fRow}><span style={fLbl}>중분류명</span><input style={{ flex: 1 }} value={form.etc2} onChange={(e) => setForm({ ...form, etc2: e.target.value })} placeholder="한글 (예: 파일유형)" /></label>
                <label style={fRow}><span style={fLbl}>중분류코드</span><input style={{ flex: 1 }} value={form.midCd} onChange={(e) => setForm({ ...form, midCd: e.target.value })} disabled={!isNew} placeholder="예: TYP (3자)" /></label>
                <label style={fRow}><span style={fLbl}>코드명</span><input style={{ flex: 1 }} value={form.subNm} onChange={(e) => setForm({ ...form, subNm: e.target.value })} placeholder="한글 (예: 증빙)" /></label>
                <label style={fRow}><span style={fLbl}>코드값</span><input style={{ flex: 1 }} value={form.subCd} onChange={(e) => setForm({ ...form, subCd: e.target.value })} disabled={!isNew} placeholder="예: SYFTY05" /></label>
                <label style={fRow}><span style={fLbl}>정렬</span><input style={{ flex: 1 }} value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })} /></label>
                <label style={fRow}><span style={fLbl}>사용</span><select style={{ flex: 1 }} value={form.useYn} onChange={(e) => setForm({ ...form, useYn: e.target.value })}><option value="Y">사용</option><option value="N">미사용</option></select></label>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 8px' }}>※ 분류명/중분류명(한글)은 트리 표기에 사용됩니다. 같은 분류의 코드에는 동일하게 입력하세요.</p>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setForm(null)}>취소</button>
                <button className="btn primary" onClick={saveCode}>저장</button>
              </div>
            </div>
          )}

          <div className="card" style={{ padding: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>
              <b style={{ fontSize: '15px' }}>{sel ? `${catNm(sel.cat)} › ${midNm(sel.cat, sel.mid)}` : '좌측에서 분류를 선택하세요'}</b>
              {sel && <button className="btn primary" style={{ padding: '4px 10px' }} onClick={addCode}>＋ 이 분류에 코드 추가</button>}
            </div>
            <table>
              <thead><tr><th>코드명</th><th>코드값</th><th>정렬</th><th>사용</th><th style={{ width: '120px' }}>관리</th></tr></thead>
              <tbody>
                {!sel ? <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>좌측 트리에서 분류를 선택하세요.</td></tr>
                  : rows.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>코드 없음</td></tr>
                    : rows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{g(r, 'subNm', 'SubNm')}</td>
                        <td style={{ color: '#64748b' }}>{g(r, 'subCd', 'SubCd')}</td>
                        <td>{g(r, 'sort', 'Sort')}</td>
                        <td>{g(r, 'useYn', 'UseYn') || 'Y'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn" style={{ padding: '2px 8px' }} onClick={() => editCode(r)}>수정</button>{' '}
                          <button className="btn danger" style={{ padding: '2px 8px' }} onClick={() => delCode(r)}>삭제</button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
