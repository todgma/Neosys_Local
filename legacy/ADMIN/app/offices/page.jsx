'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const pick = (o, ...keys) => { for (const k of keys) { if (o && o[k] != null && o[k] !== '') return o[k]; } return ''; };

export default function OfficesPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null); // 작업 중인 offNo
  const [staffPanel, setStaffPanel] = useState(null); // 소속직원 슬라이드 패널 { office, rows, loading }
  const [payPanel, setPayPanel] = useState(null); // 결제내역 슬라이드 패널 { office, rows, loading }

  // 소속직원 슬라이드 패널 — 사용자관리(members)에서 사무소명 검색 후 offNo 매칭 직원만
  const openStaffPanel = async (r) => {
    const offNo = pick(r, 'OffNo', 'offNo', 'off_no');
    const offNm = pick(r, 'OffNm', 'offNm', 'off_nm');
    setStaffPanel({ office: r, rows: [], loading: true });
    try {
      const d = await api.get(`/api/admin/members?q=${encodeURIComponent(offNm || '')}`);
      const items = d?.items || d?.Items || [];
      const staff = items.filter((m) => String(pick(m, 'OffNo', 'offNo', 'off_no')) === String(offNo));
      setStaffPanel({ office: r, rows: staff, loading: false });
    } catch (e) { console.error(e); setStaffPanel({ office: r, rows: [], loading: false }); }
  };

  // 결제내역 슬라이드 패널 — 해당 사무소의 결제 이력
  const openPayPanel = async (r) => {
    const offNo = pick(r, 'OffNo', 'offNo', 'off_no');
    setPayPanel({ office: r, rows: [], loading: true });
    try {
      const d = await api.get(`/api/payments?offNo=${encodeURIComponent(offNo)}`);
      const items = d?.items || d?.Items || [];
      setPayPanel({ office: r, rows: items, loading: false });
    } catch (e) { console.error(e); setPayPanel({ office: r, rows: [], loading: false }); }
  };

  const load = async () => {
    setLoading(true);
    try { const d = await api.get(`/api/admin/offices?q=${encodeURIComponent(q)}`); setRows(d?.items || []); }
    catch (e) { console.error(e); setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const offNoOf = (r) => pick(r, 'OffNo', 'offNo', 'off_no');

  // 첨부(개설등록증 SYFDV04 / 사업자등록증 SYFDV03) — ref_key=사무소번호. 클릭 시 새 창으로 바로 열기
  const openStoredFile = async (offNo, fileDiv, label) => {
    if (!offNo) { alert('사무소 정보가 없습니다.'); return; }
    try {
      const d = await api.get(`/api/files?fileTyp=SYFTY05&fileDiv=${fileDiv}&refKey=${encodeURIComponent(offNo)}`);
      const items = d?.items || d?.Items || [];
      const file = items[0];
      if (!file) { alert(`${label}이(가) 없습니다.`); return; }
      let url = pick(file, 'url', 'Url');
      if (!url) {
        const u = await api.get(`/api/files/url?objectKey=${encodeURIComponent(pick(file, 'objectKey', 'ObjectKey'))}`);
        url = pick(u, 'url', 'Url') || (typeof u === 'string' ? u : '');
      }
      if (url) window.open(url, '_blank', 'noopener');
      else alert('파일 URL을 가져올 수 없습니다.');
    } catch (e) { console.error(e); alert('파일 열기 실패'); }
  };
  const FileCell = ({ offNo, fileDiv, label }) => (
    <button className="btn" style={{ fontSize: '14px', fontWeight: 600, padding: '2px 8px' }} onClick={() => openStoredFile(offNo, fileDiv, label)}>보기</button>
  );

  // 허용 IP 직접 입력/수정
  const setIp = async (r) => {
    const offNo = offNoOf(r);
    const cur = pick(r, 'AllowIp', 'allowIp', 'allow_ip');
    const input = window.prompt(`허용 IP 입력 (사무소 #${offNo})\n예) 121.135.20.10  또는  대역: 121.135.20`, cur || '');
    if (input == null) return; // 취소
    setBusy(offNo);
    try {
      await api.put(`/api/admin/offices/${offNo}/allow-ip`, { allowIp: input.trim() });
      await load();
    } catch (e) { console.error(e); alert('설정 실패'); }
    finally { setBusy(null); }
  };

  // 허용 IP 초기화(NULL) → 다음 로그인 시 재캡처
  const resetIp = async (r) => {
    const offNo = offNoOf(r);
    if (!window.confirm(`사무소 #${offNo} 의 허용 IP를 초기화할까요?\n초기화하면 다음 로그인 시 접속 IP가 새로 저장됩니다.`)) return;
    setBusy(offNo);
    try {
      await api.put(`/api/admin/offices/${offNo}/allow-ip`, { allowIp: '' });
      await load();
    } catch (e) { console.error(e); alert('초기화 실패'); }
    finally { setBusy(null); }
  };

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginTop: 0 }}>중개사무소관리 <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>(대표 사무소 단위)</span></h1>
      <div style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} placeholder="사무소명·대표·등록번호 검색" style={{ width: '280px' }} />
        <button className="btn primary" style={{ fontSize: '14px', fontWeight: 600 }} onClick={load}>검색</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>추천인코드</th><th>사무소명</th><th>사무소주소</th><th>대표</th><th>등록번호</th><th>연락처</th>
              <th>소속직원수</th><th>멤버십 상품</th><th>가입비</th><th>결제내역</th><th>개설등록증</th><th>사업자등록증</th><th>허용 IP</th><th>IP 관리</th><th>가입일</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={15} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>불러오는 중…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={15} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>사무소가 없습니다.</td></tr>
                : rows.map((r, i) => {
                  const offNo = offNoOf(r);
                  const ip = pick(r, 'AllowIp', 'allowIp', 'allow_ip');
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 800, color: '#4f46e5', whiteSpace: 'nowrap' }}>{pick(r, 'ReferralCode', 'referralCode', 'referral_code') || '-'}</td>
                      <td>{pick(r, 'OffNm', 'offNm', 'off_nm')}</td>
                      <td>{pick(r, 'Addr', 'addr', 'OffAddr', 'offAddr') || '-'}</td>
                      <td>{pick(r, 'RpsNm', 'rpsNm', 'rps_nm', 'RtNm')}</td>
                      <td>{pick(r, 'RegNo', 'regNo', 'reg_no')}</td>
                      <td>{pick(r, 'OffTel', 'offTel', 'off_tel', 'RpsPhone')}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {pick(r, 'MemberCnt', 'memberCnt') || 0}
                          <button className="btn" style={{ padding: '1px 7px' }} title="소속 직원 보기" onClick={() => openStaffPanel(r)}>🔍</button>
                        </span>
                      </td>
                      <td>{pick(r, 'MembershipName', 'membershipName') || <span style={{ color: '#dc2626', fontWeight: 700 }}>미가입</span>}</td>
                      <td>{(pick(r, 'EntryFeePaid', 'entryFeePaid') === true) ? <span style={{ color: '#0f766e', fontWeight: 800 }}>결제완료</span> : <span style={{ color: '#dc2626', fontWeight: 700 }}>미결제</span>}</td>
                      <td><button className="btn" style={{ fontSize: '14px', fontWeight: 600, padding: '2px 8px' }} onClick={() => openPayPanel(r)}>결제내역</button></td>
                      <td><FileCell offNo={offNo} fileDiv="SYFDV04" label="개설등록증" /></td>
                      <td><FileCell offNo={offNo} fileDiv="SYFDV03" label="사업자등록증" /></td>
                      <td>
                        {ip
                          ? <span style={{ fontWeight: 800, color: '#0f172a' }}>{ip}</span>
                          : <span style={{ fontWeight: 600, color: '#94a3b8' }}>미설정</span>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn" style={{ fontSize: '14px', fontWeight: 600, marginRight: '6px' }}
                          disabled={busy === offNo} onClick={() => setIp(r)}>직접입력</button>
                        <button className="btn" style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}
                          disabled={busy === offNo || !ip} onClick={() => resetIp(r)}>초기화</button>
                      </td>
                      <td>{String(pick(r, 'RegDt', 'regDt', 'CrtDt')).slice(0, 10)}</td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>* 허용 IP는 사무소 소속 중개사가 <b>최초 로그인</b>할 때 접속 IP로 자동 저장됩니다. 관리자가 <b>직접입력</b>으로 수정하거나 <b>초기화</b>하면 다음 로그인 시 재저장됩니다.</p>
      <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>* 소속직원 IP대역 제한 로그인은 추후 적용 예정입니다.</p>

      {/* 소속 직원 슬라이드 패널 (우측) */}
      {staffPanel && (
        <>
          <div onClick={() => setStaffPanel(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 900 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '460px', maxWidth: '94vw', background: 'white', boxShadow: '-8px 0 24px rgba(0,0,0,0.18)', zIndex: 901, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>소속 직원 <span style={{ fontSize: '14px', color: '#4f46e5' }}>{pick(staffPanel.office, 'OffNm', 'offNm', 'off_nm')}</span></span>
              <button className="btn" style={{ padding: '2px 10px' }} onClick={() => setStaffPanel(null)}>닫기</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              {staffPanel.loading ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px', fontSize: '14px', fontWeight: 600 }}>불러오는 중…</div>
              ) : staffPanel.rows.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px', fontSize: '14px', fontWeight: 600 }}>소속 직원이 없습니다.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ fontSize: '14px', fontWeight: 800, padding: '8px', borderBottom: '2px solid #cbd5e1', textAlign: 'left', background: '#f1f5f9' }}>아이디</th>
                      <th style={{ fontSize: '14px', fontWeight: 800, padding: '8px', borderBottom: '2px solid #cbd5e1', textAlign: 'left', background: '#f1f5f9' }}>이름</th>
                      <th style={{ fontSize: '14px', fontWeight: 800, padding: '8px', borderBottom: '2px solid #cbd5e1', textAlign: 'center', background: '#f1f5f9' }}>대표/소속</th>
                      <th style={{ fontSize: '14px', fontWeight: 800, padding: '8px', borderBottom: '2px solid #cbd5e1', textAlign: 'left', background: '#f1f5f9' }}>연락처</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffPanel.rows.map((m, i) => {
                      const t = pick(m, 'RtType', 'rtType');
                      return (
                        <tr key={i}>
                          <td style={{ fontSize: '14px', fontWeight: 600, padding: '8px', borderBottom: '1px solid #eef1f5' }}>{pick(m, 'Id', 'id')}</td>
                          <td style={{ fontSize: '14px', fontWeight: 700, padding: '8px', borderBottom: '1px solid #eef1f5' }}>{pick(m, 'RtNm', 'rtNm')}</td>
                          <td style={{ fontSize: '14px', fontWeight: 700, padding: '8px', borderBottom: '1px solid #eef1f5', textAlign: 'center', color: t === 'RTTYP01' ? '#4f46e5' : '#0f766e' }}>{t === 'RTTYP01' ? '대표' : t === 'RTTYP02' ? '소속' : '-'}</td>
                          <td style={{ fontSize: '14px', fontWeight: 600, padding: '8px', borderBottom: '1px solid #eef1f5' }}>{pick(m, 'RtTel', 'rtTel') || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* 결제내역 슬라이드 패널 (우측) */}
      {payPanel && (
        <>
          <div onClick={() => setPayPanel(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 900 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '620px', maxWidth: '96vw', background: 'white', boxShadow: '-8px 0 24px rgba(0,0,0,0.18)', zIndex: 901, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>결제내역 <span style={{ fontSize: '14px', color: '#4f46e5' }}>{pick(payPanel.office, 'OffNm', 'offNm', 'off_nm')}</span></span>
              <button className="btn" style={{ padding: '2px 10px' }} onClick={() => setPayPanel(null)}>닫기</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              {payPanel.loading ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px', fontSize: '14px', fontWeight: 600 }}>불러오는 중…</div>
              ) : payPanel.rows.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px', fontSize: '14px', fontWeight: 600 }}>결제내역이 없습니다.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['결제일시', '상품', '사용자', '금액', '상태', '영수증'].map((h, i) => (
                        <th key={h} style={{ fontSize: '14px', fontWeight: 800, padding: '8px', borderBottom: '2px solid #cbd5e1', textAlign: i === 3 ? 'right' : 'left', background: '#f1f5f9', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payPanel.rows.map((p, i) => {
                      const st = pick(p, 'Status', 'status');
                      const receipt = pick(p, 'ReceiptUrl', 'receiptUrl');
                      const stLabel = ({ DONE: '결제완료', CANCELED: '취소', PARTIAL_CANCELED: '부분취소', ABORTED: '승인실패', FAILED: '실패', EXPIRED: '만료' })[st] || st || '-';
                      return (
                        <tr key={i}>
                          <td style={{ fontSize: '14px', fontWeight: 600, padding: '8px', borderBottom: '1px solid #eef1f5', whiteSpace: 'nowrap' }}>{String(pick(p, 'ApprovedAt', 'approvedAt') || pick(p, 'RegDt', 'regDt')).replace('T', ' ').slice(0, 16)}</td>
                          <td style={{ fontSize: '14px', fontWeight: 700, padding: '8px', borderBottom: '1px solid #eef1f5' }}>{pick(p, 'OrderName', 'orderName') || pick(p, 'ProdName', 'prodName') || '-'}</td>
                          <td style={{ fontSize: '14px', fontWeight: 600, padding: '8px', borderBottom: '1px solid #eef1f5' }}>{pick(p, 'UserId', 'userId') || '-'}</td>
                          <td style={{ fontSize: '14px', fontWeight: 800, padding: '8px', borderBottom: '1px solid #eef1f5', textAlign: 'right', whiteSpace: 'nowrap' }}>{(Number(pick(p, 'Amount', 'amount')) || 0).toLocaleString()}원</td>
                          <td style={{ fontSize: '14px', fontWeight: 700, padding: '8px', borderBottom: '1px solid #eef1f5', color: st === 'DONE' ? '#0f766e' : '#dc2626' }}>{stLabel}</td>
                          <td style={{ fontSize: '14px', padding: '8px', borderBottom: '1px solid #eef1f5' }}>{receipt ? <a href={receipt} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', fontWeight: 700 }}>보기</a> : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
