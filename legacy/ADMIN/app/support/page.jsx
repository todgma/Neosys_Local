'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const pick = (o, ...keys) => { for (const k of keys) { if (o && o[k] != null && o[k] !== '') return o[k]; } return ''; };

export default function SupportPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const d = await api.get('/api/admin/inquiries'); setRows(d?.items || d?.inquiries || (Array.isArray(d) ? d : [])); }
    catch (e) { console.error(e); setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginTop: 0 }}>고객센터 <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>(1:1 문의)</span></h1>
      <div className="card" style={{ padding: 0, overflow: 'auto', marginTop: '12px' }}>
        <table>
          <thead>
            <tr><th>번호</th><th>제목</th><th>작성자</th><th>상태</th><th>등록일</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>불러오는 중…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>문의가 없습니다.</td></tr>
                : rows.map((r, i) => (
                  <tr key={i}>
                    <td>{pick(r, 'InquiryId', 'inquiryId', 'id')}</td>
                    <td>{pick(r, 'Title', 'title')}</td>
                    <td>{pick(r, 'RegId', 'regId', 'author', 'writer')}</td>
                    <td>{pick(r, 'AnswerYn', 'answerYn', 'status') || '대기'}</td>
                    <td>{String(pick(r, 'RegDt', 'regDt', 'CrtDt')).slice(0, 10)}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
