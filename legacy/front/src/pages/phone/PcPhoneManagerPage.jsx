import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

/**
 * PC폰관리 (KT 통화) — 1단계: 계정 등록/저장 + 로그인(스텁)
 *  - 자격증명은 Electron main이 %ProgramData%\CallbackProAgent\appInfo.inf 에 저장(KT 참고 서비스와 동일 스키마)
 *  - 문자보내기/주소록 탭은 2단계(KT DLL 브리지) 연동 후 실제 동작
 */
const EMPTY = {
  KtUserId: '', KtPassword: '',
  PhoneNumber: '', IsDevelopmentMode: false,
};

export default function PcPhoneManagerPage() {
  const [tab, setTab] = useState('ACCOUNT'); // ACCOUNT | SMS | ADDRESS
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const hasPhoneApi = !!window.electronAPI?.phone;

  // 문자보내기
  const [smsTo, setSmsTo] = useState('');
  const [smsMsg, setSmsMsg] = useState('');
  const [sending, setSending] = useState(false);
  // 주소록
  const [addr, setAddr] = useState([]);
  const [addrLoading, setAddrLoading] = useState(false);
  // 착신 테스트
  const [testNo, setTestNo] = useState('01012345678');
  const [testing, setTesting] = useState(false);

  const handleSimulateCall = async () => {
    if (!hasPhoneApi || !window.electronAPI.phone.simulateIncomingCall) { toast.error('데스크톱 앱에서만 가능합니다.'); return; }
    const num = (testNo || '').trim();
    if (!num) { toast.error('테스트할 전화번호를 입력하세요.'); return; }
    setTesting(true);
    try {
      await window.electronAPI.phone.simulateIncomingCall(num);
      toast.success('착신 이벤트를 발생시켰습니다. (네오봇 창이 열립니다)');
    } catch (e) { console.error(e); toast.error('착신 테스트 실패'); }
    finally { setTesting(false); }
  };

  const handleSendSms = async () => {
    if (!hasPhoneApi) { toast.error('데스크톱 앱에서만 가능합니다.'); return; }
    if (!smsTo || !smsMsg) { toast.error('수신번호와 내용을 입력하세요.'); return; }
    setSending(true);
    try {
      const res = await window.electronAPI.phone.sendSms(smsTo, smsMsg);
      if (res?.success) { toast.success('문자를 전송했습니다.'); setSmsMsg(''); }
      else toast.error(res?.message || '문자 전송에 실패했습니다.');
    } catch (e) { console.error(e); toast.error('문자 전송 실패'); }
    finally { setSending(false); }
  };

  const handleLoadAddress = async () => {
    if (!hasPhoneApi) { toast.error('데스크톱 앱에서만 가능합니다.'); return; }
    setAddrLoading(true);
    try {
      const res = await window.electronAPI.phone.getAddressData('');
      if (res?.success) setAddr(res.data || []);
      else toast.error(res?.message || '주소록 조회에 실패했습니다.');
    } catch (e) { console.error(e); toast.error('주소록 조회 실패'); }
    finally { setAddrLoading(false); }
  };

  useEffect(() => {
    (async () => {
      try {
        if (hasPhoneApi) {
          const saved = await window.electronAPI.phone.getAccount();
          if (saved) setForm({ ...EMPTY, ...saved });
        }
      } catch (e) {
        console.error('계정 로드 실패:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [hasPhoneApi]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!hasPhoneApi) { toast.error('데스크톱(Electron) 환경에서만 저장할 수 있습니다.'); return; }
    if (!form.KtUserId || !form.KtPassword) { toast.error('KT 아이디(이메일)와 비밀번호를 입력하세요.'); return; }
    setSaving(true);
    try {
      const res = await window.electronAPI.phone.saveAccount(form);
      if (res?.success) toast.success('KT 계정이 저장되었습니다. (자동 로그인 대상)');
      else toast.error(res?.message || '계정 저장에 실패했습니다.');
    } catch (e) {
      console.error(e); toast.error('계정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleLoginTest = async () => {
    if (!hasPhoneApi) { toast.error('데스크톱(Electron) 환경에서만 가능합니다.'); return; }
    try {
      const res = await window.electronAPI.phone.login(form);
      if (res?.success) toast.success('로그인 성공');
      else toast(res?.message || '로그인 결과를 확인하세요.', { icon: 'ℹ️' });
    } catch (e) {
      console.error(e); toast.error('로그인 호출 실패');
    }
  };

  const tabBtn = (key, label) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      style={{
        padding: '8px 18px', fontSize: '13px', fontWeight: tab === key ? 700 : 500,
        border: 'none', borderBottom: tab === key ? '3px solid #4f46e5' : '3px solid transparent',
        background: 'transparent', color: tab === key ? '#4f46e5' : '#475569', cursor: 'pointer',
      }}
    >{label}</button>
  );

  const labelStyle = { width: '150px', fontSize: '13px', fontWeight: 600, color: '#334155' };
  const inputStyle = { flex: 1, maxWidth: '320px', padding: '6px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' };
  const rowStyle = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
        <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>PC폰관리 (KT 통화)</h1>
      </div>

      <div style={{ display: 'flex', gap: '4px', padding: '0 12px', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
        {tabBtn('ACCOUNT', 'KT 계정 설정')}
        {tabBtn('SMS', '문자보내기')}
        {tabBtn('ADDRESS', '주소록')}
        {tabBtn('TEST', '착신 테스트')}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {!hasPhoneApi && (
          <div style={{ marginBottom: '16px', padding: '10px 12px', fontSize: '13px', color: '#92400e', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '6px' }}>
            데스크톱(Electron) 환경이 아니어서 계정 저장/로그인이 비활성화됩니다.
          </div>
        )}

        {tab === 'ACCOUNT' && (
          <div style={{ maxWidth: '560px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
            {loading ? (
              <div style={{ color: '#94a3b8', fontSize: '13px' }}>불러오는 중…</div>
            ) : (
              <>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                  KT 통화매니저 계정을 등록하면 프로그램 시작 시 자동으로 로그인됩니다.
                </div>
                {/* 브라우저(Chromium) 자동완성 차단용 히든 필드 */}
                <input type="text" name="fakeuser" autoComplete="username" style={{ display: 'none' }} />
                <input type="password" name="fakepass" autoComplete="new-password" style={{ display: 'none' }} />
                <div style={rowStyle}>
                  <span style={labelStyle}>KT 아이디(이메일)</span>
                  <input style={inputStyle} value={form.KtUserId} onChange={(e) => set('KtUserId', e.target.value)} placeholder="xxx@kt.com" autoComplete="off" />
                </div>
                <div style={rowStyle}>
                  <span style={labelStyle}>KT 비밀번호</span>
                  <input type="password" style={inputStyle} value={form.KtPassword} onChange={(e) => set('KtPassword', e.target.value)} placeholder="비밀번호" autoComplete="new-password" />
                </div>
                <div style={rowStyle}>
                  <span style={labelStyle}>발신번호</span>
                  <input style={inputStyle} value={form.PhoneNumber} onChange={(e) => set('PhoneNumber', e.target.value)} placeholder="예: 0212345678" />
                </div>
                <div style={rowStyle}>
                  <span style={labelStyle}>개발 서버 사용</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!form.IsDevelopmentMode} onChange={(e) => set('IsDevelopmentMode', e.target.checked)} />
                    <span>개발(Dev) 서버로 접속</span>
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                  <button type="button" onClick={handleSave} disabled={saving || !hasPhoneApi}
                    style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 700, border: 'none', borderRadius: '5px', background: '#4f46e5', color: 'white', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                    {saving ? '저장 중…' : '계정 저장'}
                  </button>
                  <button type="button" onClick={handleLoginTest} disabled={!hasPhoneApi}
                    style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '5px', background: 'white', color: '#334155', cursor: 'pointer' }}>
                    로그인 테스트
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'SMS' && (
          <div style={{ maxWidth: '560px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
            <div style={rowStyle}>
              <span style={labelStyle}>수신번호</span>
              <input style={inputStyle} value={smsTo} onChange={(e) => setSmsTo(e.target.value)} placeholder="01012345678" />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <span style={{ ...labelStyle, paddingTop: '6px' }}>내용</span>
              <textarea value={smsMsg} onChange={(e) => setSmsMsg(e.target.value)} rows={4} placeholder="문자 내용"
                style={{ flex: 1, maxWidth: '320px', padding: '6px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', maxWidth: '480px' }}>
              <button type="button" onClick={handleSendSms} disabled={sending || !hasPhoneApi}
                style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 700, border: 'none', borderRadius: '5px', background: '#4f46e5', color: 'white', cursor: 'pointer', opacity: sending ? 0.6 : 1 }}>
                {sending ? '전송 중…' : '문자 전송'}
              </button>
            </div>
          </div>
        )}

        {tab === 'ADDRESS' && (
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>KT 주소록</span>
              <button type="button" onClick={handleLoadAddress} disabled={addrLoading || !hasPhoneApi}
                style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '5px', background: 'white', color: '#334155', cursor: 'pointer' }}>
                {addrLoading ? '조회 중…' : '조회'}
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['이름', '휴대폰', '회사', '직위', '메모'].map((h) => (
                    <th key={h} style={{ padding: '6px 8px', border: '1px solid #e2e8f0', borderTop: '2px solid #94a3b8', borderBottom: '1px solid #94a3b8', textAlign: 'left', fontWeight: 600, fontSize: '15px', color: '#374151' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {addr.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>조회된 주소록이 없습니다.</td></tr>
                ) : addr.map((a, i) => (
                  <tr key={a.dbid || i}>
                    <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{a.name}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{a.mobile}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{a.company}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{a.title}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{a.memo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'TEST' && (
          <div style={{ maxWidth: '560px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>전화 착신 테스트</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '16px' }}>
              번호를 입력하고 버튼을 누르면 실제 KT 착신과 동일하게 처리됩니다 — 착신 팝업이 뜨고, 번호가 정규화되어 <b>네오봇 창</b>이 새로 열리며 자동 검색·표기됩니다.
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>전화번호</span>
              <input style={inputStyle} value={testNo} onChange={(e) => setTestNo(e.target.value)} placeholder="예: 010-1234-5678 / +82 10 1234 5678" />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button type="button" onClick={handleSimulateCall} disabled={testing || !hasPhoneApi}
                style={{ padding: '9px 20px', fontSize: '14px', fontWeight: 700, border: 'none', borderRadius: '5px', background: '#dc2626', color: 'white', cursor: 'pointer', opacity: testing ? 0.6 : 1 }}>
                {testing ? '착신 발생 중…' : '📞 착신 테스트 (네오봇 열기)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
