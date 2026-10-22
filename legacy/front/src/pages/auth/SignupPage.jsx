import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import { authService } from '../../services/authService';
import BrokerSearchModal from '../../components/contracts/BrokerSearchModal';
import FileUploadForm from '../../components/common/FileUploadForm';
import DaumAddressModal from '../../components/common/DaumAddressModal';

/**
 * 회원가입 페이지 (flat 스타일, 새 창 팝업)
 *  - 진입 시 '중개사 조회' 팝업 자동 오픈 → 선택하면 가능한 필드(이름/등록번호) 자동입력
 *  - 중개사무소 대표자 가입(RTTYP01)
 */
const BLANK = {
  rtType: 'RTTYP01', rtNm: '', id: '', pw: '', confirmPassword: '',
  rtTel: '', rtRegNo: '', offNo: '', grade: 'user', referralCode: '',
  // 사무소 정보(ofc_realter_office 로 함께 등록)
  offNm: '', offAddr: '', offTel: '', offFax: '', offRegNo: '', bizNo: '',
};

export default function SignupPage({ onClose = null }) {
  const [f, setF] = useState(BLANK);
  const [showAddr, setShowAddr] = useState(false); // 주소검색 모달
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isIdChecked, setIsIdChecked] = useState(false);
  const [isCheckingId, setIsCheckingId] = useState(false);
  const [brokerOpen, setBrokerOpen] = useState(true); // 진입 시 자동 오픈
  const [bizFiles, setBizFiles] = useState([]); // 사업자등록증(업로드 완료 메타)
  const [openFiles, setOpenFiles] = useState([]); // 개설등록증(업로드 완료 메타)
  const [refOpt, setRefOpt] = useState('none'); // 추천인: 'none'(없음, 기본) | 'yes'(있음)
  const [isRefChecked, setIsRefChecked] = useState(false); // 추천인 코드 확인 완료 여부
  const [isCheckingRef, setIsCheckingRef] = useState(false);
  const [refConfirm, setRefConfirm] = useState(null); // 확인 모달 { rtNm, offNm }
  const [showDone, setShowDone] = useState(false); // 가입완료 모달

  useEffect(() => { document.title = '회원가입'; }, []);

  const set = (k) => (e) => { setF((p) => ({ ...p, [k]: e.target.value })); if (errors[k]) setErrors((p) => ({ ...p, [k]: '' })); if (k === 'id') setIsIdChecked(false); if (k === 'referralCode') setIsRefChecked(false); };

  // 중개사 조회 선택 → 가능한 필드 자동입력
  const onSelectBroker = (row) => {
    const cell = (row && row.cell) || {};
    const reg = (row && row.codes && row.codes.regNo) || cell['등록번호'] || '';
    setF((p) => ({
      ...p,
      rtNm: cell['성명'] || cell['대표자'] || p.rtNm,
      rtRegNo: reg || p.rtRegNo,
      // 사무소 정보 자동입력
      offNm: cell['상호'] || p.offNm,
      offAddr: cell['소재지'] || p.offAddr,
      offRegNo: reg || p.offRegNo,
    }));
    setBrokerOpen(false);
  };

  const checkId = async () => {
    if (!f.id.trim()) { toast.error('아이디를 입력해주세요.'); return; }
    if (f.id.length < 4) { toast.error('아이디는 최소 4자 이상이어야 합니다.'); return; }
    setIsCheckingId(true);
    try {
      const res = await authService.checkDuplicateId(f.id);
      if (res.available) { setIsIdChecked(true); toast.success(res.message); }
      else { setIsIdChecked(false); toast.error(res.message); }
    } catch (e) { setIsIdChecked(false); toast.error('중복확인 중 오류가 발생했습니다.'); }
    finally { setIsCheckingId(false); }
  };

  // 추천인 옵션 변경(없음/있음)
  const changeRefOpt = (opt) => {
    setRefOpt(opt);
    setIsRefChecked(false);
    if (opt === 'none') setF((p) => ({ ...p, referralCode: '' }));
  };
  // 추천인 코드 확인 → 성명·사무소명 확인 모달
  const checkReferral = async () => {
    const code = (f.referralCode || '').trim();
    if (!code) { toast.error('추천인 코드를 입력해주세요.'); return; }
    setIsCheckingRef(true);
    try {
      const res = await authService.getReferralInfo(code);
      if (res.success) setRefConfirm({ rtNm: res.rtNm, offNm: res.offNm });
      else { setIsRefChecked(false); toast.error('확인되지 않는 추천인코드입니다.'); }
    } catch (e) { setIsRefChecked(false); toast.error('확인되지 않는 추천인코드입니다.'); }
    finally { setIsCheckingRef(false); }
  };

  const validate = () => {
    const er = {};
    if (!f.rtNm.trim()) er.rtNm = '이름을 입력해주세요';
    if (!f.id.trim()) er.id = '아이디를 입력해주세요';
    else if (f.id.length < 4) er.id = '아이디는 최소 4자 이상이어야 합니다';
    else if (!isIdChecked) er.id = '아이디 중복확인을 해주세요';
    if (!f.pw) er.pw = '비밀번호를 입력해주세요';
    else if (f.pw.length < 6) er.pw = '비밀번호는 최소 6자 이상이어야 합니다';
    if (!f.confirmPassword) er.confirmPassword = '비밀번호 확인을 입력해주세요';
    else if (f.pw !== f.confirmPassword) er.confirmPassword = '비밀번호가 일치하지 않습니다';
    if (!(f.rtTel || '').trim()) er.rtTel = '휴대폰번호를 입력해주세요';
    else if (!/^[0-9-]+$/.test(f.rtTel)) er.rtTel = '올바른 전화번호 형식이 아닙니다';
    // 사무소 정보 — 전부 필수
    if (!(f.offNm || '').trim()) er.offNm = '사무소명을 입력해주세요';
    if (!(f.offTel || '').trim()) er.offTel = '사무소 전화를 입력해주세요';
    if (!(f.offAddr || '').trim()) er.offAddr = '사무소 소재지를 입력해주세요';
    if (!(f.offRegNo || '').trim()) er.offRegNo = '개설등록번호를 입력해주세요';
    if (!(f.bizNo || '').trim()) er.bizNo = '사업자등록번호를 입력해주세요';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    // 추천인 '있음' 선택 시 반드시 확인(검증) 선행 — 아이디 중복확인과 동일 규칙
    if (refOpt === 'yes') {
      if (!(f.referralCode || '').trim()) { toast.error('추천인 코드를 입력하거나 [없음]을 선택하세요.'); return; }
      if (!isRefChecked) { toast.error('추천인 코드 [확인]을 먼저 눌러주세요.'); return; }
    }
    // 개설등록증·사업자등록증 첨부 필수
    if (!openFiles[0]) { toast.error('개설등록증을 첨부해주세요.'); return; }
    if (!bizFiles[0]) { toast.error('사업자등록증을 첨부해주세요.'); return; }
    setIsLoading(true);
    try {
      await authService.register({
        // 개설등록번호 하나로 중개사/사무소 등록번호 통합(중복 제거)
        rtType: f.rtType, rtNm: f.rtNm, rtTel: f.rtTel || null, rtRegNo: f.offRegNo || null,
        offNo: null, grade: f.grade || null,
        id: f.id, pw: f.pw, userId: f.id, referralCode: (refOpt === 'yes' && isRefChecked) ? (f.referralCode || null) : null,
        // 사무소 정보
        offNm: f.offNm || null, offAddr: f.offAddr || null, offTel: f.offTel || null,
        offFax: null, offRegNo: f.offRegNo || null, bizNo: f.bizNo || null,
        // 사업자등록증(업로드 완료된 파일 메타)
        ...(bizFiles[0] ? {
          bizObjectKey: bizFiles[0].objectKey, bizOrigName: bizFiles[0].origName,
          bizContentType: bizFiles[0].contentType, bizFileSize: bizFiles[0].fileSize, bizExt: bizFiles[0].ext,
        } : {}),
        // 개설등록증(업로드 완료된 파일 메타)
        ...(openFiles[0] ? {
          openObjectKey: openFiles[0].objectKey, openOrigName: openFiles[0].origName,
          openContentType: openFiles[0].contentType, openFileSize: openFiles[0].fileSize, openExt: openFiles[0].ext,
        } : {}),
      });
      toast.success('회원가입이 완료되었습니다.');
      setShowDone(true);
    } catch (err) { toast.error(err?.message || '회원가입에 실패했습니다.'); }
    finally { setIsLoading(false); }
  };

  const close = () => {
    if (onClose) { onClose(); return; }
    try { window.electronAPI?.modal ? window.close() : window.close(); } catch { /* noop */ }
  };

  // 가입완료 → 로그인 화면에 아이디 자동입력용으로 저장 후 창 닫기
  const goLogin = () => {
    try { localStorage.setItem('prefillLoginId', f.id || ''); } catch { /* noop */ }
    close();
  };

  // 스타일 (flat, 컴팩트) — 라벨 | 입력창(가로) 형식으로 높이 최소화
  const inp = { width: '100%', height: '34px', padding: '0 10px', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', color: '#111827', outline: 'none' };
  const err = { marginTop: '2px', fontSize: '13px', fontWeight: 600, color: '#dc2626' };
  const secHead = { gridColumn: '1 / -1', fontSize: '15px', fontWeight: 800, color: '#111827', borderBottom: '2px solid #e5e7eb', paddingBottom: '6px' };
  // 라벨 | 입력창 한 줄 배치. opts.full=전체폭, opts.align='flex-start'(에러/복합노드)
  const row = (labelText, node, e = null, opts = {}) => {
    const req = /\*\s*$/.test(labelText);
    const base = labelText.replace(/\s*\*\s*$/, '');
    return (
      <div style={{ display: 'flex', alignItems: opts.align || 'center', gap: '8px', ...(opts.full ? { gridColumn: '1 / -1' } : {}) }}>
        <label style={{ flexShrink: 0, width: '106px', fontSize: '14px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', ...(opts.align === 'flex-start' ? { paddingTop: '8px' } : {}) }}>
          {base}{req && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}
        </label>
        <div style={{ flex: 1, minWidth: 0 }}>{node}{e && <div style={err}>{e}</div>}</div>
      </div>
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'white', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 40px', borderBottom: '1px solid #e5e7eb' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>회원가입</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>중개사무소 대표자만 가입 가능합니다. 직원은 로그인 후 등록 가능합니다.</div>
        </div>
        <button type="button" onClick={() => setBrokerOpen(true)}
          style={{ height: '34px', padding: '0 14px', fontSize: '14px', fontWeight: 700, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Search className="w-4 h-4" /> 중개사 조회
        </button>
      </div>

      {/* 폼 — 라벨 | 입력창(가로) 형식 */}
      <form onSubmit={submit} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 40px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 16px', alignContent: 'start' }}>
        <div style={secHead}>대표 정보</div>
        {/* 이름 | 휴대폰번호 (한 줄) */}
        {row('이름 *', <input style={inp} value={f.rtNm} onChange={set('rtNm')} placeholder="이름" />, errors.rtNm, { align: errors.rtNm ? 'flex-start' : 'center' })}
        {row('휴대폰번호 *', <input style={inp} value={f.rtTel} onChange={set('rtTel')} placeholder="010-1234-5678" />, errors.rtTel, { align: errors.rtTel ? 'flex-start' : 'center' })}
        {/* 아이디 (한 줄 전체폭) */}
        {row('아이디 *', (
          <div style={{ display: 'flex', gap: '6px' }}>
            <input style={{ ...inp, flex: 1 }} value={f.id} onChange={set('id')} placeholder="아이디 (최소 4자)" />
            <button type="button" onClick={checkId} disabled={isCheckingId || !f.id.trim()}
              style={{ height: '34px', padding: '0 12px', fontSize: '14px', fontWeight: 700, color: 'white', background: isIdChecked ? '#16a34a' : '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap', opacity: (isCheckingId || !f.id.trim()) ? 0.5 : 1 }}>
              {isCheckingId ? '확인중…' : (isIdChecked ? '확인완료' : '중복확인')}
            </button>
          </div>
        ), errors.id, { full: true, align: errors.id ? 'flex-start' : 'center' })}
        {/* 비밀번호 | 비밀번호 확인 (한 줄) */}
        {row('비밀번호 *', <input type="password" style={inp} value={f.pw} onChange={set('pw')} placeholder="비밀번호 (최소 6자)" />, errors.pw, { align: errors.pw ? 'flex-start' : 'center' })}
        {row('비밀번호 확인 *', <input type="password" style={inp} value={f.confirmPassword} onChange={set('confirmPassword')} placeholder="비밀번호 확인" />, errors.confirmPassword, { align: errors.confirmPassword ? 'flex-start' : 'center' })}
        {row('추천인 코드', (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', height: '34px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '14px', fontWeight: 600, color: '#111827', cursor: 'pointer' }}>
                <input type="radio" name="refOpt" checked={refOpt === 'none'} onChange={() => changeRefOpt('none')} /> 없음
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '14px', fontWeight: 600, color: '#111827', cursor: 'pointer' }}>
                <input type="radio" name="refOpt" checked={refOpt === 'yes'} onChange={() => changeRefOpt('yes')} /> 있음
              </label>
              {refOpt === 'none' && (
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', whiteSpace: 'nowrap' }}>
                  (추천인 코드는 회원가입 후 수정 불가합니다)
                </span>
              )}
            </div>
            {refOpt === 'yes' && (
              <>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <input style={{ ...inp, flex: 1, background: isRefChecked ? '#f0fdf4' : 'white' }} value={f.referralCode} onChange={set('referralCode')} placeholder="추천인 코드 (예: RF000123)" />
                  <button type="button" onClick={checkReferral} disabled={isCheckingRef || !(f.referralCode || '').trim()}
                    style={{ height: '34px', padding: '0 14px', fontSize: '14px', fontWeight: 700, color: 'white', background: isRefChecked ? '#16a34a' : '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap', opacity: (isCheckingRef || !(f.referralCode || '').trim()) ? 0.5 : 1 }}>
                    {isCheckingRef ? '확인중…' : (isRefChecked ? '확인완료' : '확인')}
                  </button>
                </div>
                <div style={{ marginTop: '4px', fontSize: '13px', fontWeight: 600, color: isRefChecked ? '#16a34a' : '#334155' }}>
                  {isRefChecked ? '추천인 확인 완료' : '추천인 코드 입력 후 [확인]을 눌러 검증해야 가입할 수 있습니다.'}
                </div>
              </>
            )}
          </>
        ), null, { full: true, align: 'flex-start' })}

        {/* 사무소 정보 — 중개사 조회 선택 시 상호/소재지/등록번호 자동입력 */}
        <div style={{ ...secHead, marginTop: '6px' }}>사무소 정보</div>
        {/* 사무소명 | 사무소 전화 (한 줄) */}
        {row('사무소명 *', <input style={inp} value={f.offNm} onChange={set('offNm')} placeholder="사무소명" />, errors.offNm, { align: errors.offNm ? 'flex-start' : 'center' })}
        {row('사무소 전화 *', <input style={inp} value={f.offTel} onChange={set('offTel')} placeholder="사무소 전화" />, errors.offTel, { align: errors.offTel ? 'flex-start' : 'center' })}
        {row('사무소 소재지 *', (
          <div style={{ display: 'flex', gap: '6px' }}>
            <input style={{ ...inp, flex: 1 }} value={f.offAddr} onChange={set('offAddr')} placeholder="주소 검색을 눌러 사업장 소재지를 입력하세요" />
            <button type="button" onClick={() => setShowAddr(true)}
              style={{ flexShrink: 0, padding: '0 14px', fontSize: '14px', fontWeight: 700, color: 'white', background: '#4f46e5', border: '1px solid #4f46e5', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>주소 검색</button>
          </div>
        ), errors.offAddr, { full: true, align: 'flex-start' })}
        {/* 개설등록번호 | 사업자등록번호 (한 줄) — 개설등록번호 하나만(중개사/사무소 등록번호 중복 제거) */}
        {row('개설등록번호 *', <input style={inp} value={f.offRegNo} onChange={set('offRegNo')} placeholder="개설등록번호" />, errors.offRegNo, { align: errors.offRegNo ? 'flex-start' : 'center' })}
        {row('사업자등록번호 *', <input style={inp} value={f.bizNo} onChange={set('bizNo')} placeholder="사업자등록번호" />, errors.bizNo, { align: errors.bizNo ? 'flex-start' : 'center' })}
        {/* 첨부 — 한 줄에 개설등록증 + 사업자등록증 (2개) */}
        <div style={{ marginTop: '4px', minWidth: 0 }}>
          <FileUploadForm
            label={<>개설등록증 첨부 <span style={{ color: '#dc2626' }}>*</span></>}
            accept=".pdf,.jpg,.jpeg,.png"
            fileTyp="SYFTY05"
            fileDiv="SYFDV04"
            multiple={false}
            value={openFiles}
            onChange={setOpenFiles}
          />
        </div>
        <div style={{ marginTop: '4px', minWidth: 0 }}>
          <FileUploadForm
            label={<>사업자등록증 첨부 <span style={{ color: '#dc2626' }}>*</span></>}
            accept=".pdf,.jpg,.jpeg,.png"
            fileTyp="SYFTY05"
            fileDiv="SYFDV03"
            multiple={false}
            value={bizFiles}
            onChange={setBizFiles}
          />
        </div>
      </form>

      {/* 하단 버튼 */}
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '10px 40px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
        <button type="button" onClick={close} style={{ height: '38px', padding: '0 22px', fontSize: '14px', fontWeight: 700, color: '#334155', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>취소</button>
        <button type="button" onClick={submit} disabled={isLoading} style={{ height: '38px', padding: '0 28px', fontSize: '14px', fontWeight: 800, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: isLoading ? 0.5 : 1 }}>{isLoading ? '가입 중…' : '회원가입'}</button>
      </div>

      {/* 추천인 확인 모달 — 코드로 조회된 중개사무소명/대표자명이 맞는지 확인 */}
      {refConfirm && (
        <div onClick={() => setRefConfirm(null)} style={{ position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '360px', maxWidth: '92vw', background: 'white', borderRadius: '10px', boxShadow: '0 12px 34px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>추천인 확인</div>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '12px' }}>아래 추천인이 맞습니까?</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}><tbody>
                <tr>
                  <th style={{ textAlign: 'left', width: '110px', padding: '8px 6px', color: '#64748b', fontWeight: 700 }}>중개사무소명</th>
                  <td style={{ padding: '8px 6px', color: '#111827', fontWeight: 800 }}>{refConfirm.offNm || '-'}</td>
                </tr>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 6px', color: '#64748b', fontWeight: 700 }}>대표자명</th>
                  <td style={{ padding: '8px 6px', color: '#111827', fontWeight: 800 }}>{refConfirm.rtNm || '-'}</td>
                </tr>
              </tbody></table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 18px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <button type="button" onClick={() => setRefConfirm(null)}
                style={{ height: '36px', padding: '0 18px', fontSize: '14px', fontWeight: 700, color: '#334155', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>아니오</button>
              <button type="button" onClick={() => { setIsRefChecked(true); setRefConfirm(null); toast.success('추천인 확인 완료'); }}
                style={{ height: '36px', padding: '0 20px', fontSize: '14px', fontWeight: 800, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>예, 맞습니다</button>
            </div>
          </div>
        </div>
      )}

      {/* 가입완료 모달 — 로그인하러 가기 */}
      {showDone && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1600, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '380px', maxWidth: '92vw', background: 'white', borderRadius: '12px', boxShadow: '0 16px 44px rgba(0,0,0,0.32)', overflow: 'hidden' }}>
            <div style={{ padding: '24px 20px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>회원가입 완료</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#334155', lineHeight: 1.5 }}>회원가입이 완료되었습니다.<br />로그인 후 이용해 주세요.</div>
            </div>
            <div style={{ padding: '14px 20px 20px', display: 'flex', justifyContent: 'center' }}>
              <button type="button" onClick={goLogin}
                style={{ height: '42px', padding: '0 28px', fontSize: '14px', fontWeight: 800, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                로그인하러 가기
              </button>
            </div>
          </div>
        </div>
      )}

      {brokerOpen && <BrokerSearchModal onClose={() => setBrokerOpen(false)} onSelect={onSelectBroker} />}
      {showAddr && (
        <DaumAddressModal
          onClose={() => setShowAddr(false)}
          onComplete={(d) => setF((prev) => ({ ...prev, offAddr: d.roadAddress || d.jibunAddress || prev.offAddr }))}
        />
      )}
    </div>
  );
}
