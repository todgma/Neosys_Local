'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { currentAdminId } from '../../lib/adminAuth';

const pick = (o, ...keys) => { for (const k of keys) { if (o && o[k] != null && o[k] !== '') return o[k]; } return ''; };

export default function MembersPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [detail, setDetail] = useState(null);   // 상세보기 모달 데이터
  const [editForm, setEditForm] = useState(null); // 수정 모달 {rtNo, ...}
  const [pwTarget, setPwTarget] = useState(null); // 비번초기화 대상 {rtNo, name}
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [products, setProducts] = useState([]);   // 멤버십 상품 목록
  const [memTarget, setMemTarget] = useState(null); // 상품가입 대상 {offNo, name, curProdId}
  const [selProd, setSelProd] = useState('');
  const [extTarget, setExtTarget] = useState(null); // 기간연장 대상 {offNo, name}
  const [extForm, setExtForm] = useState({ kind: 'EVENT', title: '', qty: '', unit: 'DAY', memo: '' });
  const [memMemo, setMemMemo] = useState('');       // 상품가입 메모
  const [histTarget, setHistTarget] = useState(null); // 멤버십 이력 대상 {offNo, name}
  const [histRows, setHistRows] = useState([]);
  const [officePanel, setOfficePanel] = useState(null); // 사무소 정보 슬라이드 패널

  // 사무소 정보 슬라이드 패널 열기 — offices 목록에서 offNm 검색 후 offNo 매칭(없으면 행 정보 폴백)
  const openOfficePanel = async (r) => {
    const offNo = offNoOf(r);
    const offNm = pick(r, 'OffNm', 'offNm');
    const fallback = { OffNo: offNo, OffNm: offNm, OffTel: pick(r, 'OffTel', 'offTel'), RpsNm: pick(r, 'RtNm', 'rtNm') };
    setOfficePanel(fallback);
    try {
      const d = await api.get(`/api/admin/offices?q=${encodeURIComponent(offNm || '')}`);
      const items = d?.items || d?.Items || [];
      const found = items.find((o) => String(pick(o, 'OffNo', 'offNo', 'off_no')) === String(offNo));
      if (found) setOfficePanel(found);
    } catch (e) { console.error(e); }
  };

  const load = async () => {
    setLoading(true);
    try { const d = await api.get(`/api/admin/members?q=${encodeURIComponent(q)}`); setRows(d?.items || []); }
    catch (e) { console.error(e); setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { (async () => {
    try { const d = await api.get('/api/admin/memberships'); setProducts(d?.items || d?.Items || []); } catch { setProducts([]); }
  })(); }, []);

  const rtNoOf = (r) => pick(r, 'RtNo', 'rtNo');
  const offNoOf = (r) => pick(r, 'OffNo', 'offNo', 'off_no');
  const isRep = (r) => pick(r, 'RtType', 'rtType') === 'RTTYP01';

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
    <button className="btn" style={{ padding: '2px 8px' }} onClick={() => openStoredFile(offNo, fileDiv, label)}>보기</button>
  );

  const openMembership = (r) => {
    const off = offNoOf(r);
    if (!off) { alert('사무소 정보가 없어 상품을 가입할 수 없습니다.'); return; }
    setMemTarget({ offNo: off, name: pick(r, 'RtNm', 'rtNm') });
    setSelProd(''); setMemMemo('');
  };
  const assignMembership = async () => {
    if (!selProd) { alert('가입할 상품을 선택하세요.'); return; }
    try {
      await api.put(`/api/admin/memberships/office/${memTarget.offNo}`, { ProdId: Number(selProd), Memo: memMemo, UserId: currentAdminId() });
      alert('상품이 가입되었습니다.');
      setMemTarget(null); load();
    } catch { alert('상품 가입에 실패했습니다.'); }
  };

  // 멤버십 이력(가입/연장 각 건 + 메모) 조회
  const openHistory = async (r) => {
    const off = offNoOf(r);
    if (!off) { alert('사무소 정보가 없습니다.'); return; }
    setHistTarget({ offNo: off, name: pick(r, 'RtNm', 'rtNm') });
    setHistRows([]);
    try { const d = await api.get(`/api/admin/memberships/office/${off}/history`); setHistRows(d?.items || d?.Items || []); }
    catch { setHistRows([]); }
  };

  const hasMembership = (r) => !!pick(r, 'MembershipName', 'membershipName');
  const openExtend = (r) => {
    const off = offNoOf(r);
    if (!off) { alert('사무소 정보가 없습니다.'); return; }
    setExtTarget({ offNo: off, name: pick(r, 'RtNm', 'rtNm') });
    setExtForm({ kind: 'EVENT', title: '', qty: '', unit: 'DAY', memo: '' });
  };
  const submitExtend = async () => {
    const qty = parseInt(extForm.qty, 10);
    if (!qty || qty <= 0) { alert('기간(수량)을 입력하세요.'); return; }
    if (!extForm.title.trim()) { alert(extForm.kind === 'EVENT' ? '이벤트명을 입력하세요.' : '보상명을 입력하세요.'); return; }
    try {
      await api.post(`/api/admin/memberships/office/${extTarget.offNo}/extend`, {
        Kind: extForm.kind, Title: extForm.title.trim(), Qty: qty, Unit: extForm.unit,
        Memo: extForm.memo, UserId: currentAdminId(),
      });
      alert('기간이 연장되었습니다.');
      setExtTarget(null); load();
    } catch { alert('기간연장에 실패했습니다.'); }
  };

  const openDetail = async (r) => {
    // 상세는 rt_realtor_info만 반환하므로, 목록 행(r)의 사무소명(OffNm) 등을 병합해 유지
    try { const d = await api.get(`/api/admin/members/${rtNoOf(r)}`); setDetail({ ...r, ...(d?.item || {}) }); }
    catch { setDetail(r); }
  };
  const openEdit = async (r) => {
    let src = r;
    try { const d = await api.get(`/api/admin/members/${rtNoOf(r)}`); if (d?.item) src = d.item; } catch { /* keep row */ }
    setEditForm({
      rtNo: rtNoOf(r),
      RtNm: pick(src, 'RtNm', 'rtNm'), RtTel: pick(src, 'RtTel', 'rtTel'), RtRegNo: pick(src, 'RtRegNo', 'rtRegNo'),
      OffNo: pick(src, 'OffNo', 'offNo', 'off_no'), Grade: pick(src, 'Grade', 'grade'), RtType: pick(src, 'RtType', 'rtType'),
      Id: pick(src, 'Id', 'id'),
    });
  };
  const saveEdit = async () => {
    try {
      await api.put(`/api/admin/members/${editForm.rtNo}`, {
        RtNm: editForm.RtNm, RtTel: editForm.RtTel, RtRegNo: editForm.RtRegNo,
        OffNo: editForm.OffNo === '' ? null : Number(editForm.OffNo), Grade: editForm.Grade, RtType: editForm.RtType,
      });
      setEditForm(null); load();
    } catch { alert('수정 실패'); }
  };
  const openPw = (r) => { setPwTarget({ rtNo: rtNoOf(r), name: pick(r, 'RtNm', 'rtNm') }); setPw1(''); setPw2(''); };
  const resetPw = async () => {
    if (!pw1 || pw1.length < 4) { alert('비밀번호는 4자 이상 입력하세요.'); return; }
    if (pw1 !== pw2) { alert('비밀번호가 일치하지 않습니다.'); return; }
    try { await api.put(`/api/admin/members/${pwTarget.rtNo}/password`, { NewPw: pw1 }); alert('비밀번호가 초기화되었습니다.'); setPwTarget(null); }
    catch { alert('초기화 실패'); }
  };

  const gradeLabel = (t) => (t === 'RTTYP01' ? '대표' : t === 'RTTYP02' ? '소속' : (t || '-'));

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginTop: 0 }}>사용자관리 <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>(대표/소속 직원 계정 전부)</span></h1>
      <div style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} placeholder="사무소명·이름·아이디 검색" style={{ width: '260px' }} />
        <button className="btn primary" onClick={load}>검색</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead>
            <tr><th>아이디</th><th>이름</th><th>사무소</th><th>대표/소속</th><th>멤버십 상품</th><th>가입일</th><th>관리</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>불러오는 중…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>회원이 없습니다.</td></tr>
                : rows.map((r, i) => (
                  <tr key={i}>
                    <td>{pick(r, 'Id', 'id')}</td>
                    <td>{pick(r, 'RtNm', 'rtNm')}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {pick(r, 'OffNm', 'offNm') || pick(r, 'OffNo', 'off_no') || '-'}
                        {!!offNoOf(r) && <button className="btn" style={{ padding: '1px 7px' }} title="사무소 정보 보기" onClick={() => openOfficePanel(r)}>🔍</button>}
                      </span>
                    </td>
                    <td>{gradeLabel(pick(r, 'RtType', 'rtType')) }</td>
                    <td>{pick(r, 'MembershipName', 'membershipName') || <span style={{ color: '#dc2626', fontWeight: 700 }}>미가입</span>}</td>
                    <td>{String(pick(r, 'RegDt', 'regDt', 'CrtDt')).slice(0, 10)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn" style={{ padding: '2px 8px' }} onClick={() => openDetail(r)}>상세</button>{' '}
                      <button className="btn" style={{ padding: '2px 8px' }} onClick={() => openEdit(r)}>수정</button>{' '}
                      <button className="btn danger" style={{ padding: '2px 8px' }} onClick={() => openPw(r)}>비번초기화</button>{' '}
                      {isRep(r) && <button className="btn primary" style={{ padding: '2px 8px' }} onClick={() => openMembership(r)}>상품가입</button>}{' '}
                      {isRep(r) && hasMembership(r) && <button className="btn" style={{ padding: '2px 8px' }} onClick={() => openExtend(r)}>기간연장</button>}{' '}
                      {isRep(r) && <button className="btn" style={{ padding: '2px 8px' }} onClick={() => openHistory(r)}>이력</button>}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '13px', color: '#64748b' }}>* 멤버십 상품은 <b>멤버십 상품관리</b>에서 사무소에 배정합니다.</p>

      {/* 사무소 정보 슬라이드 패널 (우측) */}
      {officePanel && (
        <>
          <div onClick={() => setOfficePanel(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 900 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px', maxWidth: '92vw', background: 'white', boxShadow: '-8px 0 24px rgba(0,0,0,0.18)', zIndex: 901, display: 'flex', flexDirection: 'column', animation: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>사무소 정보</span>
              <button className="btn" style={{ padding: '2px 10px' }} onClick={() => setOfficePanel(null)}>닫기</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
              {[
                ['사무소명', pick(officePanel, 'OffNm', 'offNm', 'off_nm')],
                ['대표자', pick(officePanel, 'RpsNm', 'rpsNm', 'RtNm')],
                ['사무소번호', pick(officePanel, 'OffTel', 'offTel', 'off_tel')],
                ['대표번호', pick(officePanel, 'RpsPhone', 'rpsPhone', 'OffRpsPhone')],
                ['등록번호', pick(officePanel, 'RegNo', 'regNo', 'reg_no')],
                ['주소', pick(officePanel, 'Addr', 'addr', 'OffAddr', 'offAddr')],
                ['소속직원수', pick(officePanel, 'MemberCnt', 'memberCnt')],
                ['멤버십', pick(officePanel, 'MembershipName', 'membershipName') || '미가입'],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', gap: '10px', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: '96px', flexShrink: 0, fontSize: '14px', fontWeight: 700, color: '#475569' }}>{label}</div>
                  <div style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: '#111827', wordBreak: 'break-all' }}>{val || '-'}</div>
                </div>
              ))}
              {/* 첨부 서류 */}
              <div style={{ display: 'flex', gap: '10px', padding: '12px 0 0', alignItems: 'center' }}>
                <div style={{ width: '96px', flexShrink: 0, fontSize: '14px', fontWeight: 700, color: '#475569' }}>첨부서류</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <FileCell offNo={pick(officePanel, 'OffNo', 'offNo', 'off_no')} fileDiv="SYFDV04" label="개설등록증" />
                  <FileCell offNo={pick(officePanel, 'OffNo', 'offNo', 'off_no')} fileDiv="SYFDV03" label="사업자등록증" />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 상세보기 모달 */}
      {detail && (
        <Modal title="회원 상세" onClose={() => setDetail(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px 16px', fontSize: '14px' }}>
            <div><b>아이디</b> {pick(detail, 'Id', 'id')}</div>
            <div><b>이름</b> {pick(detail, 'RtNm', 'rtNm')}</div>
            <div><b>연락처</b> {pick(detail, 'RtTel', 'rtTel')}</div>
            <div><b>등록번호</b> {pick(detail, 'RtRegNo', 'rtRegNo')}</div>
            <div><b>사무소</b> {pick(detail, 'OffNm', 'offNm') || '-'}</div>
            <div><b>대표/소속</b> {gradeLabel(pick(detail, 'RtType', 'rtType'))}</div>
            <div><b>등급</b> {pick(detail, 'Grade', 'grade')}</div>
            <div><b>가입일</b> {String(pick(detail, 'RegDt', 'regDt')).slice(0, 10)}</div>
            <div><b>수정일</b> {String(pick(detail, 'UpdDt', 'updDt')).slice(0, 10)}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
            <button className="btn" onClick={() => setDetail(null)}>닫기</button>
          </div>
        </Modal>
      )}

      {/* 수정 모달 */}
      {editForm && (
        <Modal title={`회원 수정 — ${editForm.Id}`} onClose={() => setEditForm(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px' }}>
            <label>이름<input style={{ width: '100%' }} value={editForm.RtNm} onChange={(e) => setEditForm({ ...editForm, RtNm: e.target.value })} /></label>
            <label>연락처<input style={{ width: '100%' }} value={editForm.RtTel} onChange={(e) => setEditForm({ ...editForm, RtTel: e.target.value })} /></label>
            <label>등록번호<input style={{ width: '100%' }} value={editForm.RtRegNo} onChange={(e) => setEditForm({ ...editForm, RtRegNo: e.target.value })} /></label>
            <label>사무소(OffNo)<input style={{ width: '100%' }} value={editForm.OffNo} onChange={(e) => setEditForm({ ...editForm, OffNo: e.target.value })} /></label>
            <label>대표/소속
              <select style={{ width: '100%' }} value={editForm.RtType} onChange={(e) => setEditForm({ ...editForm, RtType: e.target.value })}>
                <option value="RTTYP01">대표</option>
                <option value="RTTYP02">소속</option>
              </select>
            </label>
            <label>등급<input style={{ width: '100%' }} value={editForm.Grade} onChange={(e) => setEditForm({ ...editForm, Grade: e.target.value })} /></label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '14px' }}>
            <button className="btn" onClick={() => setEditForm(null)}>취소</button>
            <button className="btn primary" onClick={saveEdit}>저장</button>
          </div>
        </Modal>
      )}

      {/* 비밀번호 초기화 모달 */}
      {pwTarget && (
        <Modal title={`비밀번호 초기화 — ${pwTarget.name}`} onClose={() => setPwTarget(null)}>
          <p style={{ fontSize: '14px', color: '#374151', marginTop: 0 }}>새 비밀번호를 입력하세요. 사용자에게 전달 후 로그인 시 변경하도록 안내하세요.</p>
          <div style={{ display: 'grid', gap: '10px' }}>
            <label>새 비밀번호<input type="password" style={{ width: '100%' }} value={pw1} onChange={(e) => setPw1(e.target.value)} /></label>
            <label>새 비밀번호 확인<input type="password" style={{ width: '100%' }} value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '14px' }}>
            <button className="btn" onClick={() => setPwTarget(null)}>취소</button>
            <button className="btn danger" onClick={resetPw}>초기화</button>
          </div>
        </Modal>
      )}

      {/* 상품가입 모달 (대표중개사 전용) */}
      {memTarget && (
        <Modal title={`상품 가입 — ${memTarget.name} (사무소 ${memTarget.offNo})`} onClose={() => setMemTarget(null)}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginTop: 0 }}>대표중개사 사무소에 멤버십 상품을 가입시킵니다. 소속중개사는 대표 설정을 그대로 따릅니다.</p>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>멤버십 상품</label>
          <select value={selProd} onChange={(e) => setSelProd(e.target.value)} style={{ width: '100%', height: '38px' }}>
            <option value="">상품 선택</option>
            {products.map((p, i) => {
              const id = pick(p, 'prodId', 'ProdId');
              const nm = pick(p, 'prodName', 'ProdName');
              const acct = pick(p, 'acctCnt', 'AcctCnt');
              const pc = pick(p, 'pcCnt', 'PcCnt');
              const mob = pick(p, 'mobCnt', 'MobCnt');
              return <option key={i} value={id}>{nm} (계정 {acct} / PC {pc} / MOBILE {mob})</option>;
            })}
          </select>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, margin: '12px 0 6px' }}>메모 <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>(가입 건별 기록·히스토리 관리)</span></label>
          <textarea value={memMemo} onChange={(e) => setMemMemo(e.target.value)} rows={3} placeholder="예) 신규 가입 / 담당자 통화 후 결제 확인 등" style={{ width: '100%', boxSizing: 'border-box', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', resize: 'vertical' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '16px' }}>
            <button className="btn" onClick={() => setMemTarget(null)}>취소</button>
            <button className="btn primary" onClick={assignMembership}>가입</button>
          </div>
        </Modal>
      )}

      {/* 기간연장 모달 (이벤트/보상) */}
      {extTarget && (
        <Modal title={`기간연장 — ${extTarget.name} (사무소 ${extTarget.offNo})`} onClose={() => setExtTarget(null)}>
          <div style={{ display: 'grid', gap: '10px' }}>
            <label>구분
              <select style={{ width: '100%', height: '38px' }} value={extForm.kind} onChange={(e) => setExtForm({ ...extForm, kind: e.target.value })}>
                <option value="EVENT">이벤트</option>
                <option value="REWARD">보상</option>
              </select>
            </label>
            <label>{extForm.kind === 'EVENT' ? '이벤트명' : '보상명'}
              <input style={{ width: '100%' }} value={extForm.title} onChange={(e) => setExtForm({ ...extForm, title: e.target.value })} placeholder={extForm.kind === 'EVENT' ? '이벤트명' : '보상명'} />
            </label>
            <label>기간
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" min="1" style={{ flex: 1 }} value={extForm.qty} onChange={(e) => setExtForm({ ...extForm, qty: e.target.value })} placeholder="수량" />
                <select style={{ width: '100px', height: '38px' }} value={extForm.unit} onChange={(e) => setExtForm({ ...extForm, unit: e.target.value })}>
                  <option value="DAY">일</option>
                  <option value="WEEK">주</option>
                  <option value="MONTH">월</option>
                </select>
              </div>
            </label>
            <label>메모 <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>(연장 건별 기록·히스토리 관리)</span>
              <textarea value={extForm.memo} onChange={(e) => setExtForm({ ...extForm, memo: e.target.value })} rows={3} placeholder="예) 이벤트 보상 30일 연장 / 사유 등" style={{ width: '100%', boxSizing: 'border-box', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', resize: 'vertical' }} />
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '16px' }}>
            <button className="btn" onClick={() => setExtTarget(null)}>취소</button>
            <button className="btn primary" onClick={submitExtend}>연장</button>
          </div>
        </Modal>
      )}

      {/* 멤버십 이력(가입/연장 건별 + 메모) */}
      {histTarget && (
        <Modal title={`멤버십 이력 — ${histTarget.name} (사무소 ${histTarget.offNo})`} onClose={() => setHistTarget(null)}>
          {histRows.length === 0 ? (
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', textAlign: 'center', padding: '20px' }}>이력이 없습니다.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {histRows.map((h, i) => {
                const kind = pick(h, 'kind', 'Kind');
                const kindLabel = kind === 'JOIN' ? '가입' : kind === 'EVENT' ? '이벤트' : kind === 'REWARD' ? '보상' : (kind || '-');
                const kindColor = kind === 'JOIN' ? { c: '#2563eb', bg: '#dbeafe' } : kind === 'REWARD' ? { c: '#7c3aed', bg: '#ede9fe' } : { c: '#b45309', bg: '#fef3c7' };
                const qty = pick(h, 'qty', 'Qty'); const unit = pick(h, 'unit', 'Unit');
                const unitLabel = { DAY: '일', WEEK: '주', MONTH: '월' }[unit] || unit || '';
                const memo = pick(h, 'memo', 'Memo');
                return (
                  <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', background: '#fbfcfe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: kindColor.c, background: kindColor.bg, borderRadius: '999px', padding: '2px 10px' }}>{kindLabel}</span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{pick(h, 'title', 'Title') || '-'}</span>
                      {qty ? <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{qty}{unitLabel}</span> : null}
                      <span style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                        {String(pick(h, 'regDt', 'RegDt')).replace('T', ' ').slice(0, 16)} · {pick(h, 'regId', 'RegId') || '-'}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: memo ? '#111827' : '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {memo || '(메모 없음)'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
            <button className="btn" onClick={() => setHistTarget(null)}>닫기</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: '560px', maxWidth: '92vw', maxHeight: '86vh', overflow: 'auto', padding: '16px 18px' }}>
        <h3 style={{ marginTop: 0, fontSize: '18px', fontWeight: 800 }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}
