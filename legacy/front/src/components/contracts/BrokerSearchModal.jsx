import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, X } from 'lucide-react';
import { API_BASE_URL } from '../../config/apiEndpoints';
import addressService from '../../services/common/addressService';

/**
 * 중개사 조회 공통 팝업(모달)
 *  - 지역선택(시·도/시·군·구/읍·면·동) : 법정동 API(addressService) 연계
 *  - 상세검색 : svcCode(117 중개업사무소 / 118 중개법인) + 상호 + 등록번호
 *  - 조회 : 서버 프록시(/api/broker/search) → vworld HTML 반환 → DOMParser 파싱
 *  props: onClose(), onSelect(row)
 */
const g = (o, ...keys) => { for (const k of keys) { if (o && o[k] != null && o[k] !== '') return o[k]; } return ''; };
const unwrap = (res) => (res?.data?.data ?? res?.data ?? res);

// vworld 결과 HTML 파싱 — svcCode(117/118)마다 컬럼이 달라 thead를 읽어 동적 매핑.
//  · 링크 onclick fn_goView(sggCd, 등록번호, sysRegno) 에서 코드 추출
function parseVworld(html) {
  let total = 0;
  const tm = html.match(/총[\s\S]{0,30}?([\d,]+)\s*건/);
  if (tm) total = parseInt(tm[1].replace(/,/g, ''), 10) || 0;

  let columns = [];
  const rows = [];
  try {
    const docp = new DOMParser().parseFromString(html, 'text/html');
    const tables = Array.from(docp.querySelectorAll('table'));
    const target = tables.find((t) => ((t.querySelector('caption')?.textContent) || '').includes('조회결과'))
      || tables.find((t) => (t.textContent || '').includes('상호'));
    if (target) {
      columns = Array.from(target.querySelectorAll('thead th')).map((th) => (th.textContent || '').trim());
      const trs = Array.from(target.querySelectorAll('tbody tr'));
      for (const tr of trs) {
        const tds = Array.from(tr.querySelectorAll('td'));
        if (tds.length < 2) continue;
        const values = tds.map((t) => (t.textContent || '').trim().replace(/\s+/g, ' '));
        // 링크에서 코드 추출
        let codes = { sggCd: '', regNo: '', sysRegno: '' };
        const a = tr.querySelector('a[href*="fn_goView"]');
        const mm = a && a.getAttribute('href') && a.getAttribute('href').match(/fn_goView\(([^)]*)\)/);
        if (mm) {
          const parts = mm[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
          codes = { sggCd: parts[0] || '', regNo: parts[1] || '', sysRegno: parts[2] || '' };
        }
        const cell = {};
        columns.forEach((label, i) => { cell[label] = values[i] ?? ''; });
        rows.push({ values, cell, codes });
      }
    }
  } catch (e) { console.error('중개사 결과 파싱 실패:', e); }
  return { columns, rows, total };
}

export default function BrokerSearchModal({ onClose, onSelect = null }) {
  const [sidos, setSidos] = useState([]);
  const [sigungus, setSigungus] = useState([]);
  const [dongs, setDongs] = useState([]);
  const [sido, setSido] = useState('');
  const [sigungu, setSigungu] = useState('');
  const [dong, setDong] = useState('');

  const [svcCode, setSvcCode] = useState('117');
  const [bizName, setBizName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [pageSize, setPageSize] = useState('10');

  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => { (async () => {
    try { setSidos(unwrap(await addressService.getSidoList()) || []); } catch { setSidos([]); }
  })(); }, []);

  const onSido = async (code) => {
    setSido(code); setSigungu(''); setDong(''); setSigungus([]); setDongs([]);
    if (!code) return;
    try { setSigungus(unwrap(await addressService.getSigunguList(code)) || []); } catch { setSigungus([]); }
  };
  const onSigungu = async (code) => {
    setSigungu(code); setDong(''); setDongs([]);
    if (!code) return;
    try { setDongs(unwrap(await addressService.getBeopjeongDongList(code)) || []); } catch { setDongs([]); }
  };

  const bjdForQuery = dong || sigungu; // 동 우선, 없으면 시군구 단위

  const doSearch = async (pg = 1) => {
    if (!sido || !sigungu) { alert('시·도 / 시·군·구 선택은 필수입니다.'); return; }
    setLoading(true); setSearched(true); setPage(pg);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/broker/search`, {
        BjdCode: bjdForQuery,
        SvcCode: svcCode,
        CmpNm: bizName.trim(),
        RaRegno: regNo.trim(),
        PageIndex: pg,
        RecordCountPerPage: parseInt(pageSize, 10) || 10,
      });
      const payload = unwrap(res);
      const html = payload?.html || '';
      const { columns: cols, rows: parsed, total: t } = parseVworld(html);
      setColumns(cols); setRows(parsed); setTotal(t || parsed.length);
    } catch (e) {
      console.error('중개사 조회 실패:', e); setColumns([]); setRows([]); setTotal(0);
    } finally { setLoading(false); }
  };

  const totalPages = Math.max(1, Math.ceil(total / (parseInt(pageSize, 10) || 10)));

  // 스타일
  const label = { fontSize: '15px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' };
  const sel = { height: '34px', padding: '0 10px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', color: '#111827', cursor: 'pointer', minWidth: '150px' };
  const inp = { height: '34px', padding: '0 10px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', color: '#111827' };
  const th = { padding: '8px 8px', fontSize: '13px', fontWeight: 700, color: '#111827', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', whiteSpace: 'nowrap', textAlign: 'center' };
  const td = { padding: '8px 8px', fontSize: '13px', fontWeight: 600, color: '#111827', borderBottom: '1px solid #e5e7eb', textAlign: 'center', whiteSpace: 'nowrap' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1400, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '30px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '940px', maxWidth: '94vw', background: 'white', borderRadius: '8px', boxShadow: '0 12px 34px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>중개사 조회</div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#334155', display: 'flex' }}><X className="w-5 h-5" /></button>
        </div>

        {/* 검색 영역 */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', marginBottom: '10px' }}>* 시·도/시·군·구 선택은 필수입니다.</div>

          {/* 지역선택 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span style={{ ...label, width: '78px' }}>• 지역선택 <span style={{ color: '#dc2626' }}>*</span></span>
            <select value={sido} onChange={(e) => onSido(e.target.value)} style={sel}>
              <option value="">시·도</option>
              {sidos.map((s, i) => <option key={i} value={g(s, 'BjdCode', 'bjdCode')}>{g(s, 'SidoName', 'sidoName')}</option>)}
            </select>
            <select value={sigungu} onChange={(e) => onSigungu(e.target.value)} disabled={!sido} style={sel}>
              <option value="">시·군·구</option>
              {sigungus.map((s, i) => <option key={i} value={g(s, 'BjdCode', 'bjdCode')}>{g(s, 'SigunguName', 'sigunguName')} {g(s, 'SigunguName2', 'sigunguName2')}</option>)}
            </select>
            <select value={dong} onChange={(e) => setDong(e.target.value)} disabled={!sigungu} style={sel}>
              <option value="">읍·면·동</option>
              {dongs.map((s, i) => <option key={i} value={g(s, 'BjdCode', 'bjdCode')}>{g(s, 'BjdName', 'bjdName')}</option>)}
            </select>
          </div>

          {/* 상세검색 — 라벨+입력창을 그룹으로 묶어 좁은 화면에서 함께 줄바꿈. 중개사/보조원은 등록번호 숨김 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ ...label, width: '78px' }}>• 상세검색</span>
            <select value={svcCode} onChange={(e) => { setSvcCode(e.target.value); if (e.target.value === '118') setRegNo(''); }} style={sel}>
              <option value="117">중개사무소</option>
              <option value="118">중개사/보조원</option>
            </select>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flex: '1 1 240px', minWidth: '200px' }}>
              <span style={label}>• {svcCode === '118' ? '성명' : '상호'}</span>
              <input value={bizName} onChange={(e) => setBizName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch(1)} style={{ ...inp, flex: 1, minWidth: '110px' }} />
            </div>
            {svcCode !== '118' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flex: '1 1 240px', minWidth: '200px' }}>
                <span style={label}>• 등록번호</span>
                <input value={regNo} onChange={(e) => setRegNo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch(1)} style={{ ...inp, flex: 1, minWidth: '110px' }} />
              </div>
            )}
            <button onClick={() => doSearch(1)} style={{ height: '34px', padding: '0 18px', fontSize: '14px', fontWeight: 700, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Search className="w-4 h-4" /> 검색
            </button>
          </div>
        </div>

        {/* 결과 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
            총 <span style={{ color: '#4f46e5', fontWeight: 800 }}>{total}</span> 건 <span style={{ color: '#64748b', fontWeight: 600 }}>( {page} / {totalPages} page )</span>
          </div>
          <select value={pageSize} onChange={(e) => { setPageSize(e.target.value); if (searched) doSearch(1); }} style={{ ...sel, minWidth: '110px' }}>
            <option value="10">10개출력</option>
            <option value="30">30개출력</option>
            <option value="50">50개출력</option>
          </select>
        </div>

        {/* 결과 테이블 — thead를 vworld 응답에서 읽어 동적 렌더(117/118 컬럼 상이) */}
        <div style={{ maxHeight: '46vh', overflow: 'auto', margin: '0 18px', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0 }}>
              <tr>
                {(columns.length ? columns : ['No', '등록번호', '상호', '소재지', '대표자', '등록일', '상태', '시작일자', '종료일자']).map((label, i) => (
                  <th key={i} style={{ ...th, textAlign: (label === '상호' || label === '소재지') ? 'left' : 'center' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length || 9} style={{ ...td, padding: '40px', color: '#94a3b8' }}>조회 중…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={columns.length || 9} style={{ ...td, padding: '40px', color: '#94a3b8' }}>{searched ? '검색 결과가 없습니다.' : '지역을 선택하고 검색하세요.'}</td></tr>
              ) : rows.map((r, i) => (
                <tr key={i}
                  onClick={() => onSelect && onSelect(r)}
                  style={{ cursor: onSelect ? 'pointer' : 'default' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#eef2ff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}>
                  {(columns.length ? columns : []).map((label, ci) => {
                    const val = r.cell[label] ?? r.values[ci] ?? '';
                    const isName = label === '상호' || label === '소재지' || label === '성명';
                    const isState = label === '상태';
                    return (
                      <td key={ci} style={{ ...td, textAlign: (label === '상호' || label === '소재지') ? 'left' : 'center', whiteSpace: (label === '상호' || label === '소재지') ? 'normal' : 'nowrap', fontWeight: isName ? 700 : 600 }}>
                        {isState ? <span style={{ color: '#16a34a', fontWeight: 700 }}>{val}</span> : (val || (label.includes('일자') ? '-' : ''))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이징 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '14px' }}>
          <button disabled={page <= 1 || loading} onClick={() => doSearch(page - 1)} style={pgBtn(page <= 1 || loading)}>이전</button>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827', padding: '0 8px' }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages || loading} onClick={() => doSearch(page + 1)} style={pgBtn(page >= totalPages || loading)}>다음</button>
        </div>
      </div>
    </div>
  );
}

function pgBtn(disabled) {
  return { height: '32px', padding: '0 14px', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', color: disabled ? '#cbd5e1' : '#111827', cursor: disabled ? 'default' : 'pointer' };
}
