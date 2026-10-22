import { Fragment, useEffect, useMemo, useState } from 'react';
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { worklogHistoryService } from '../../services/worklogHistoryService';
import { realestaterService } from '../../services/realestaterService';

const pick = (o, ...keys) => { for (const k of keys) { if (o && o[k] != null && o[k] !== '') return o[k]; } return ''; };

// 컬럼 한글 라벨(부분) — 없으면 원컬럼명 노출
const LABELS = {
  OffNm: '사무소명', Addr: '주소', RpsNm: '대표', RpsPhone: '대표연락처', OffTel: '전화', OffFax: '팩스',
  RegNo: '등록번호', BizNo: '사업자번호', AllowIp: '허용IP', RtNm: '성명', RtTel: '연락처', RtRegNo: '등록번호',
  Grade: '등급', RtType: '유형', Email: '이메일', JoinDate: '입사일', LeaveDate: '퇴사일', Note: '비고',
  pt_no: '물건번호', addr: '주소', pt_nm: '물건명', memo_content: '메모', memo_date: '메모일',
  cust_no: '고객번호', cust_name: '고객명', cust_tel: '연락처',
  cn_no: '계약번호', cn_sts: '상태', sell_amt: '매매가', spcl_desc: '특약',
  schedule_id: '일정ID', title: '제목', content: '내용',
};
const lbl = (c) => LABELS[c] || c;

const ACT = {
  I: { t: '등록', bg: '#dcfce7', c: '#16a34a' },
  U: { t: '수정', bg: '#dbeafe', c: '#2563eb' },
  D: { t: '삭제', bg: '#fee2e2', c: '#dc2626' },
};

const fmtDt = (s) => {
  if (!s) return '';
  const d = new Date(s);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const trunc = (v, n = 40) => { const s = v == null ? '' : String(v); return s.length > n ? s.slice(0, n) + '…' : s; };

export default function WorklogHistoryTab() {
  const { user, office } = useAuthStore();
  const offNo = pick(office, 'offNo', 'OffNo') || pick(user, 'offNo', 'OffNo');

  const [menus, setMenus] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null);
  const [staff, setStaff] = useState([]);
  const [selUser, setSelUser] = useState(''); // '' = 전체
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(null); // 펼친 histId

  // 메뉴 + 직원 목록
  useEffect(() => {
    (async () => {
      try {
        const d = await worklogHistoryService.getMenus();
        const items = d?.items || [];
        setMenus(items);
        if (items.length) setActiveMenu(items[0].key);
      } catch (e) { console.error(e); }
      try {
        const r = await realestaterService.getList(null, offNo || null);
        const raw = r?.data;
        const list = Array.isArray(raw) ? raw : (raw?.items || raw?.list || raw?.realestaters || []);
        setStaff(list);
      } catch (e) { console.error(e); }
    })();
    // eslint-disable-next-line
  }, []);

  const loadHistory = async () => {
    if (!activeMenu) return;
    setLoading(true); setOpen(null);
    try {
      const d = await worklogHistoryService.getHistory(activeMenu, { offNo: offNo || undefined, userId: selUser || undefined, size: 100 });
      setRows(d?.items || []);
    } catch (e) { console.error(e); setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadHistory(); /* eslint-disable-next-line */ }, [activeMenu, selUser]);

  // 메뉴를 group별로 묶기
  const grouped = useMemo(() => {
    const g = {};
    menus.forEach((m) => { (g[m.group] = g[m.group] || []).push(m); });
    return g;
  }, [menus]);

  const nameOf = (uid) => {
    const s = staff.find((x) => pick(x, 'Id', 'id', 'userId') === uid);
    return s ? pick(s, 'RtNm', 'rtNm', 'name') || uid : uid;
  };

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, background: '#fff' }}>
      {/* 좌: 메뉴(항목) 선택 */}
      <div style={{ width: '210px', flexShrink: 0, borderRight: '1px solid #e5e7eb', overflow: 'auto', padding: '10px 0' }}>
        {Object.entries(grouped).map(([grp, items]) => (
          <div key={grp} style={{ marginBottom: '8px' }}>
            <div style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 800, color: '#64748b' }}>{grp}</div>
            {items.map((m) => {
              const active = m.key === activeMenu;
              return (
                <div key={m.key} onClick={() => setActiveMenu(m.key)}
                  style={{ padding: '8px 14px 8px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: active ? 800 : 600, color: active ? '#4f46e5' : '#0f172a', background: active ? '#eef2ff' : 'transparent' }}>
                  {m.label}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 우: 이력 */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* 필터 바 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>직원</span>
          <select value={selUser} onChange={(e) => setSelUser(e.target.value)}
            style={{ fontSize: '14px', fontWeight: 600, padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', minWidth: '160px' }}>
            <option value="">전체</option>
            {staff.map((s, i) => {
              const id = pick(s, 'Id', 'id', 'userId');
              return <option key={i} value={id}>{pick(s, 'RtNm', 'rtNm', 'name') || id} {pick(s, 'RtType', 'rtType') === 'RTTYP01' ? '(대표)' : ''}</option>;
            })}
          </select>
          <button onClick={loadHistory}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, color: '#334155', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer' }}>
            <RefreshCw className="h-4 w-4" /> 새로고침
          </button>
          <span style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>{rows.length}건</span>
        </div>

        {/* 이력 테이블 */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th} width="40"></th>
                <th style={th}>일시</th>
                <th style={th}>작성자</th>
                <th style={th}>구분</th>
                <th style={th}>대상</th>
                <th style={th}>변경내용</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={6} style={empty}>불러오는 중…</td></tr>
                : rows.length === 0 ? <tr><td colSpan={6} style={empty}>이력이 없습니다.</td></tr>
                  : rows.map((r) => {
                    const act = ACT[r.logType] || { t: r.logType, bg: '#f1f5f9', c: '#334155' };
                    const isOpen = open === r.histId;
                    const summary = (r.diff || []).slice(0, 3).map((d) => lbl(d.col)).join(', ');
                    return (
                      <Fragment key={r.histId}>
                        <tr onClick={() => setOpen(isOpen ? null : r.histId)} style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                          <td style={td}>{r.diffCount > 0 ? (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : null}</td>
                          <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDt(r.loggedAt)}</td>
                          <td style={td}>{nameOf(r.changedBy)}</td>
                          <td style={td}><span style={{ fontSize: '13px', fontWeight: 700, color: act.c, background: act.bg, borderRadius: '999px', padding: '2px 10px' }}>{act.t}</span></td>
                          <td style={{ ...td, whiteSpace: 'nowrap', fontWeight: 700 }}>{r.pk}</td>
                          <td style={td}>{r.diffCount > 0 ? `${summary}${r.diffCount > 3 ? ` 외 ${r.diffCount - 3}건` : ''}` : <span style={{ color: '#94a3b8' }}>-</span>}</td>
                        </tr>
                        {isOpen && r.diff?.length > 0 && (
                          <tr>
                            <td></td>
                            <td colSpan={5} style={{ padding: '10px 14px 16px', background: '#fafbfc' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr>
                                    <th style={dTh} width="180">항목</th>
                                    <th style={dTh}>이전</th>
                                    <th style={dTh} width="30"></th>
                                    <th style={dTh}>이후</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.diff.map((d, i) => (
                                    <tr key={i}>
                                      <td style={dTd}><b>{lbl(d.col)}</b></td>
                                      <td style={{ ...dTd, color: '#94a3b8' }}>{trunc(d.oldVal)}</td>
                                      <td style={{ ...dTd, textAlign: 'center', color: '#94a3b8' }}>→</td>
                                      <td style={{ ...dTd, color: '#0f172a', fontWeight: 700 }}>{trunc(d.newVal)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const th = { position: 'sticky', top: 0, background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', padding: '10px 12px', fontSize: '13px', fontWeight: 700, color: '#0f172a', textAlign: 'left', whiteSpace: 'nowrap' };
const td = { padding: '9px 12px', fontSize: '14px', fontWeight: 600, color: '#0f172a', verticalAlign: 'middle' };
const empty = { textAlign: 'center', color: '#94a3b8', padding: '40px', fontSize: '14px', fontWeight: 600 };
const dTh = { borderBottom: '1px solid #e2e8f0', padding: '6px 10px', fontSize: '13px', fontWeight: 700, color: '#475569', textAlign: 'left' };
const dTd = { borderBottom: '1px solid #eef2f7', padding: '6px 10px', fontSize: '13px', fontWeight: 600, wordBreak: 'break-all' };
