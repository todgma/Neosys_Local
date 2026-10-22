'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

// ── 토큰(입력칸) ↔ 편집텍스트 변환 ──
//  화면 편집은 일반 텍스트로. 입력칸은 【이름】 형태로 표시하고, 저장 시 원래 속성(w/ph)을 복원.
const TK_OPEN = '【', TK_CLOSE = '】';
const toEditable = (clause) => {
  if (typeof clause === 'string') return clause;
  if (Array.isArray(clause)) return clause.map((s) => (typeof s === 'string' ? s : `${TK_OPEN}${s.k || s.ph || '입력'}${TK_CLOSE}`)).join('');
  return String(clause ?? '');
};
const fromEditable = (text, orig) => {
  // 원본이 문자열이면 그대로 문자열 유지(사용자가 【】를 넣지 않은 한)
  if (!Array.isArray(orig)) {
    if (!text.includes(TK_OPEN)) return text;
  }
  const tokenByKey = {};
  (Array.isArray(orig) ? orig : []).forEach((s) => { if (s && typeof s === 'object') tokenByKey[s.k || s.ph] = s; });
  const parts = []; const re = /【([^】]*)】/g; let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(tokenByKey[m[1]] || { k: m[1] });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length <= 1 && typeof parts[0] === 'string' ? parts[0] : parts;
};
// 편집텍스트 → 미리보기 세그먼트(텍스트/박스)
const segments = (text) => {
  const out = []; const re = /【([^】]*)】/g; let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: 's', v: text.slice(last, m.index) });
    out.push({ t: 'box', k: m[1] });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ t: 's', v: text.slice(last) });
  return out;
};

// 미리보기 빈 입력박스
const Box = ({ label }) => (
  <span style={{ display: 'inline-block', minWidth: '96px', padding: '0 6px', minHeight: '20px', margin: '0 3px',
    border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: '3px', verticalAlign: 'middle', color: '#94a3b8', fontSize: '12px' }}>
    {label ? '' : ''}
  </span>
);
const renderSegs = (text) => segments(text).map((s, i) => (s.t === 's' ? <span key={i}>{s.v}</span> : <Box key={i} label={s.k} />));

export default function ContractTemplatesPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(null);
  const [meta, setMeta] = useState(null);        // 선택 템플릿 메타(저장 시 재사용)
  const [body, setBody] = useState(null);        // 원본 body(표/당사자 등 비편집 부분 보존)
  const [intro, setIntro] = useState('');
  const [objective, setObjective] = useState('');
  const [rows, setRows] = useState([]);          // [{ text, orig }]
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/contract-template?includeDisabled=true');
      setList(res?.items || res?.Items || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const pick = (t) => {
    let b = t.bodyJson ?? t.BodyJson;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
    b = b || {};
    setSel(t.tplCode);
    setMeta({ tplCode: t.tplCode, kindCd: t.kindCd, kindNm: t.kindNm, tradeCd: t.tradeCd, tradeNm: t.tradeNm, label: t.label, category: t.category, sort: t.sort, useYn: t.useYn || 'Y' });
    setBody(b);
    setIntro(typeof b.intro === 'string' ? b.intro : '');
    setObjective(typeof b.objective === 'string' ? b.objective : '');
    setRows((b.clauses || []).map((c) => ({ text: toEditable(c), orig: c })));
    setMsg('');
  };

  const setRow = (i, text) => setRows((r) => r.map((x, idx) => (idx === i ? { ...x, text } : x)));
  const delRow = (i) => setRows((r) => r.filter((_, idx) => idx !== i));
  const moveRow = (i, d) => setRows((r) => { const j = i + d; if (j < 0 || j >= r.length) return r; const n = [...r]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const addRow = () => setRows((r) => [...r, { text: '(새 조항) 내용을 입력하세요.', orig: null }]);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const newBody = { ...body };
      if (typeof body.intro === 'string') newBody.intro = intro;
      if (typeof body.objective === 'string') newBody.objective = objective;
      newBody.clauses = rows.map((r) => fromEditable(r.text, r.orig));
      const dto = { ...meta, sort: Number(meta.sort) || 0, bodyJson: JSON.stringify(newBody), userId: 'admin' };
      const res = await api.post('/api/contract-template', dto);
      if (res?.saved) { setMsg('저장되었습니다.'); await load(); }
      else setMsg('저장 실패');
    } catch (e) { setMsg('저장 중 오류: ' + (e?.message || '')); }
    finally { setSaving(false); }
  };

  const amountRows = body?.amountRows || [];
  const parties = body?.parties || [];

  const lbl = { fontSize: '15px', fontWeight: 800, color: '#111827', marginBottom: '4px' };
  const inp = { width: '100%', padding: '6px 10px', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' };
  const ta = { ...inp, minHeight: '64px', lineHeight: 1.5, resize: 'vertical' };
  const miniBtn = (bg) => ({ padding: '4px 9px', fontSize: '14px', fontWeight: 700, color: '#fff', background: bg, border: 'none', borderRadius: '6px', cursor: 'pointer' });

  return (
    <div style={{ padding: '20px', display: 'flex', gap: '16px', height: '100%', boxSizing: 'border-box' }}>
      {/* 목록 */}
      <div style={{ width: '240px', flexShrink: 0, overflow: 'auto' }}>
        <div style={{ fontSize: '22px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>계약서 서식</div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '12px' }}>계약서종류·거래유형별 조항 편집</div>
        {loading ? <div style={{ fontSize: '14px', color: '#334155' }}>불러오는 중…</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {list.map((t) => {
              const on = sel === t.tplCode;
              return (
                <button key={t.tplCode} onClick={() => pick(t)}
                  style={{ textAlign: 'left', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${on ? '#4f46e5' : '#e5e7eb'}`, background: on ? '#eef2ff' : '#fff' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: t.useYn === 'N' ? '#94a3b8' : '#111827' }}>{t.label}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>{t.kindNm} · {t.tradeNm || '-'}{t.useYn === 'N' ? ' · 미사용' : ''}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!meta ? (
        <div style={{ flex: 1, fontSize: '15px', fontWeight: 600, color: '#334155', padding: '40px 0' }}>왼쪽에서 서식을 선택하세요.</div>
      ) : (
        <>
          {/* 편집 */}
          <div style={{ flex: 1, minWidth: 0, overflow: 'auto', paddingRight: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>{meta.label} <span style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>편집</span></div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select value={meta.useYn} onChange={(e) => setMeta({ ...meta, useYn: e.target.value })} style={{ ...inp, width: 'auto' }}>
                  <option value="Y">사용</option><option value="N">미사용</option>
                </select>
                <button onClick={save} disabled={saving} style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 800, color: '#fff', background: '#4f46e5', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? '저장 중…' : '저장'}</button>
              </div>
            </div>
            {msg && <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', color: msg.includes('오류') || msg.includes('실패') ? '#dc2626' : '#059669' }}>{msg}</div>}
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#b45309', marginBottom: '12px' }}>※ 【인도일자】처럼 【 】로 감싼 부분은 계약서에서 입력칸(빈 박스)으로 나옵니다. 그대로 두세요.</div>

            {typeof body.intro === 'string' && (<div style={{ marginBottom: '12px' }}><div style={lbl}>서두문</div><textarea style={ta} value={intro} onChange={(e) => setIntro(e.target.value)} /></div>)}
            {typeof body.objective === 'string' && (<div style={{ marginBottom: '12px' }}><div style={lbl}>제1조 (목적)</div><textarea style={ta} value={objective} onChange={(e) => setObjective(e.target.value)} /></div>)}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={lbl}>조항 (제2조부터)</div>
              <button onClick={addRow} style={miniBtn('#16a34a')}>+ 조항 추가</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {rows.map((r, i) => (
                <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px', background: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#4f46e5' }}>제{i + 2}조</span>
                    <span style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => moveRow(i, -1)} style={miniBtn('#64748b')}>↑</button>
                      <button onClick={() => moveRow(i, 1)} style={miniBtn('#64748b')}>↓</button>
                      <button onClick={() => delRow(i)} style={miniBtn('#dc2626')}>삭제</button>
                    </span>
                  </div>
                  <textarea style={ta} value={r.text} onChange={(e) => setRow(i, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* 미리보기 */}
          <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
            <div style={lbl}>미리보기</div>
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', padding: '22px', fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
              <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 800, marginBottom: '14px' }}>{meta.label} 계약서</div>
              {intro && <div style={{ marginBottom: '12px' }}>{renderSegs(intro)}</div>}

              {/* 부동산의 표시 (빈 박스) */}
              <div style={{ fontWeight: 800, margin: '10px 0 4px' }}>{body.propertyTitle || '부동산의 표시'}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
                <tbody>
                  {['소재지', '지목/면적', '구조/용도'].map((h) => (
                    <tr key={h}>
                      <td style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: '6px', width: '90px', fontWeight: 700 }}>{h}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px', height: '22px' }} />
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 제1조 목적 + 금액표 */}
              {objective && <div style={{ marginBottom: '6px' }}><b>{objective.startsWith('제1조') ? '' : '제1조 '}</b>{renderSegs(objective)}</div>}
              {amountRows.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0 14px' }}>
                  <tbody>
                    {amountRows.map((row, i) => (
                      <tr key={i}>
                        <td style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: '6px', width: '90px', fontWeight: 700 }}>{row.label}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                          {(row.text || []).map((s, j) => (typeof s === 'string' ? <span key={j}>{s}</span> : <Box key={j} label={s.k} />))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* 조항 */}
              {rows.map((r, i) => (
                <div key={i} style={{ marginBottom: '8px', paddingLeft: '2.6em', textIndent: '-2.6em' }}>
                  <b>제{i + 2}조 </b>{renderSegs(r.text)}
                </div>
              ))}

              {/* 당사자(서명) 빈 박스 */}
              {parties.length > 0 && (
                <div style={{ marginTop: '18px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {parties.map((p, i) => (
                    <div key={i} style={{ flex: '1 1 200px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }}>
                      <div style={{ fontWeight: 800, marginBottom: '6px' }}>{p.label || p.role}</div>
                      {['성명', '주소', '연락처'].map((h) => (
                        <div key={h} style={{ display: 'flex', gap: '6px', margin: '3px 0' }}>
                          <span style={{ width: '48px', fontWeight: 700, color: '#334155' }}>{h}</span><Box />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
