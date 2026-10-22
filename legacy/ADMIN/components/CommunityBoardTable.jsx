'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const pick = (o, ...keys) => { for (const k of keys) { if (o && o[k] != null && o[k] !== '') return o[k]; } return ''; };
const parseFields = (v) => { try { return typeof v === 'string' ? JSON.parse(v || '{}') : (v || {}); } catch { return {}; } };
const dt = (v) => (v || '').toString().slice(0, 10).replace(/-/g, '.');

// board: { label, type:'post'|'job', tab?, kind? }
export default function CommunityBoardTable({ board }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const url = board.type === 'job'
        ? `/api/community/job/list?kind=${encodeURIComponent(board.kind)}`
        : `/api/community/list?tab=${encodeURIComponent(board.tab)}`;
      const d = await api.get(url);
      setRows(d?.items || d?.Items || (Array.isArray(d) ? d : []));
    } catch (e) { console.error(e); setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [board.label]);

  const remove = async (postId) => {
    if (!window.confirm('이 게시글을 삭제(숨김)할까요?')) return; // 서버: use_yn=N (soft delete)
    try {
      await api.del(board.type === 'job' ? `/api/community/job/${postId}` : `/api/community/${postId}`);
      await load();
    } catch (e) { alert('삭제 실패'); }
  };

  const pf = (p) => parseFields(pick(p, 'fields', 'Fields'));
  const kind = board.kind; // 구인 | 구직 | undefined
  const isOffice = board.type === 'post';
  // 게시판별 칼럼 (프로그램 목록과 동일) — 관리자에는 "아이디(RegId)" 칼럼 추가
  const cols = isOffice ? [
    { h: '지역', w: '150px', c: (p) => pf(p).소재지 || '-' },
    { h: '제목', c: (p) => pick(p, 'title', 'Title') },
    { h: '글쓴이', w: '110px', ctr: true, c: (p) => pick(p, 'author', 'Author') || '익명' },
    { h: '등록일', w: '110px', ctr: true, c: (p) => dt(pf(p).등록일 || pick(p, 'regDt', 'RegDt')) },
    { h: '조회', w: '64px', ctr: true, c: (p) => pick(p, 'viewCnt', 'ViewCnt') || 0 },
  ] : kind === '구인' ? [
    { h: '사무소', c: (p) => pf(p).사무소명칭 || '-' },
    { h: '모집구분', w: '110px', ctr: true, c: (p) => pf(p).모집대상 || '-' },
    { h: '모집인원', w: '90px', ctr: true, c: (p) => pf(p).모집인원 || '-' },
    { h: '성별', w: '90px', ctr: true, c: (p) => pf(p).성별 || '-' },
    { h: '마감일', w: '110px', ctr: true, c: (p) => dt(pf(p).마감일 || pick(p, 'regDt', 'RegDt')) },
  ] : [
    { h: '성명', w: '110px', ctr: true, c: (p) => pick(p, 'author', 'Author') || '-' },
    { h: '제목', c: (p) => pick(p, 'title', 'Title') },
    { h: '성별', w: '90px', ctr: true, c: (p) => pf(p).성별 || '-' },
    { h: '경력', w: '120px', ctr: true, c: (p) => pf(p).경력사항 || '-' },
    { h: '학력', w: '120px', ctr: true, c: (p) => pf(p).최종학력 || '-' },
  ];
  const colSpanAll = cols.length + 3; // 번호 + cols + 아이디 + 관리

  const th = { fontSize: '14px', fontWeight: 800, color: '#111827', padding: '9px 10px', borderBottom: '2px solid #cbd5e1', background: '#f1f5f9', textAlign: 'left', whiteSpace: 'nowrap' };
  const td = { fontSize: '14px', fontWeight: 600, color: '#111827', padding: '8px 10px', borderBottom: '1px solid #eef1f5' };

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginTop: 0 }}>커뮤니티 · {board.label}</h1>
      <div className="card" style={{ padding: 0, overflow: 'auto', marginTop: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <td style={{ ...th, width: '60px', textAlign: 'center' }}>번호</td>
              {cols.map((col) => <td key={col.h} style={{ ...th, ...(col.w ? { width: col.w } : {}), ...(col.ctr ? { textAlign: 'center' } : {}) }}>{col.h}</td>)}
              <td style={{ ...th, width: '130px' }}>아이디</td>
              <td style={{ ...th, width: '80px', textAlign: 'center' }}>관리</td>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={colSpanAll} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: '30px' }}>불러오는 중…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={colSpanAll} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: '30px' }}>게시글이 없습니다.</td></tr>
                : rows.map((p, i) => {
                  const id = pick(p, 'PostId', 'postId', 'id');
                  return (
                    <tr key={id || i}>
                      <td style={{ ...td, textAlign: 'center', color: '#64748b' }}>{id}</td>
                      {cols.map((col) => <td key={col.h} style={{ ...td, ...(col.ctr ? { textAlign: 'center' } : {}), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{col.c(p)}</td>)}
                      <td style={td}>{pick(p, 'RegId', 'regId') || '-'}</td>
                      <td style={{ ...td, textAlign: 'center' }}><button onClick={() => remove(id)} style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', background: 'white', border: '1px solid #fca5a5', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer' }}>삭제</button></td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
