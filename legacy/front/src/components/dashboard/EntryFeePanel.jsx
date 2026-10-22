import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../../config/apiEndpoints';
import { useAuthStore } from '../../stores/authStore';

// 가입비 결제 패널 — 중개사무소 단위. 웹 상품결제 페이지를 자동로그인 토큰과 함께 열어 결제.
const WEB_BASE = 'https://neosis.kr';
const AMOUNT = 165000;
const ORIG_AMOUNT = 350000; // 정가(할인 전) — 표시용
const won = (n) => (Number(n) || 0).toLocaleString();
const PAY_OPEN_DATE = new Date('2026-11-01T00:00:00+09:00'); // 이 날짜 이후에만 가입비 결제 허용

export default function EntryFeePanel() {
  const { user, updateUser } = useAuthStore();
  const [status, setStatus] = useState(null); // { paid, paidDt, amount }
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);

  const load = async () => {
    if (user?.offNo == null) { setStatus({ paid: false }); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/payments/entry-fee`, { params: { offNo: user.offNo } });
      const d = res?.data?.data ?? res?.data ?? {};
      const paid = d.paid ?? d.Paid ?? false;
      setStatus({ paid, paidDt: d.paidDt ?? d.PaidDt, amount: d.amount ?? d.Amount });
      if (paid && user?.hasEntryFee !== true) updateUser({ hasEntryFee: true });
    } catch (e) { console.error('가입비 상태 조회 실패:', e); setStatus({ paid: false }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  // 웹 결제 후 프로그램 창 복귀 시 자동 재확인
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line
  }, [user?.offNo]);

  const pay = async () => {
    setIssuing(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/realestaters/payment-token`, { RtNo: user?.rtNo });
      const d = res?.data?.data ?? res?.data ?? {};
      const token = d.token ?? d.Token;
      const base = token ? `${WEB_BASE}/payment?autologin=${encodeURIComponent(token)}` : `${WEB_BASE}/payment`;
      // 앱 내 전용 결제창(토스)에서 바로 진행 → 완료 감지 후 상태 갱신
      if (window.electronAPI?.payment?.open) {
        const r = await window.electronAPI.payment.open({ url: `${base}&auto=1`, width: 520, height: 800 });
        if (r?.status === 'success') { toast.success('가입비 결제가 완료되었습니다.'); await load(); }
        else if (r?.status === 'fail') toast.error('결제가 취소되었거나 실패했습니다.');
        else await load(); // closed 등 — 혹시 모를 상태 재확인
      } else if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(base);
        toast('결제 완료 후 "결제 확인"을 눌러주세요.', { duration: 5000 });
      } else {
        window.open(base, '_blank', 'noopener');
      }
    } catch (e) { console.error(e); toast.error('결제창을 여는 데 실패했습니다.'); }
    finally { setIssuing(false); }
  };

  const paid = status?.paid === true;
  const payOpen = new Date() >= PAY_OPEN_DATE; // 11/01 이후에만 결제 가능

  return (
    <div style={{ padding: '24px', maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '24px 26px' }}>
        <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', marginBottom: '6px' }}>네오시스 가입비</div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155', marginBottom: '16px' }}>중개사무소 단위로 1회 결제하는 가입비입니다. 가입비 결제 후 상품가입 및 전체 메뉴 이용이 가능합니다.</div>

        {/* 상태 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '10px', background: paid ? '#ecfdf5' : '#fef2f2', border: `1px solid ${paid ? '#a7f3d0' : '#fecaca'}`, marginBottom: '16px' }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: paid ? '#0f766e' : '#dc2626' }}>{loading ? '상태 확인 중…' : (paid ? '가입비 결제 완료' : '가입비 미결제')}</span>
          {paid && status?.paidDt && <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>({String(status.paidDt).slice(0, 10)})</span>}
        </div>

        {/* 금액 */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>가입비</span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#94a3b8', textDecoration: 'line-through' }}>{won(ORIG_AMOUNT)}원</span>
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#94a3b8' }}>→</span>
          <span style={{ fontSize: '26px', fontWeight: 800, color: '#4f46e5' }}>{won(AMOUNT)}원</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '2px 8px' }}>할인가</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>(부가세 포함)</span>
        </div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', lineHeight: 1.7, marginBottom: '18px' }}>
          · 결제 즉시 멤버십 활성화 및 프로그램 다운로드 가능<br />
          · 결제는 브라우저(웹 결제창)에서 안전하게 진행됩니다 (자동 로그인)
        </div>

        {/* 결제 오픈 전 안내 */}
        {!paid && !payOpen && (
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#4f46e5', textAlign: 'right', marginBottom: '10px' }}>
            11/01 이후 가입비 결제가 가능합니다.(선택)
          </div>
        )}

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={load} disabled={loading}
            style={{ padding: '11px 20px', fontSize: '14px', fontWeight: 700, color: '#4f46e5', background: 'white', border: '1px solid #c7d2fe', borderRadius: '10px', cursor: 'pointer' }}>
            결제 확인
          </button>
          {!paid && (
            <button type="button" onClick={payOpen ? pay : undefined} disabled={issuing || !payOpen}
              title={!payOpen ? '11/01 이후 가입비 결제가 가능합니다.' : undefined}
              style={{ padding: '11px 28px', fontSize: '14px', fontWeight: 800, color: 'white', border: 'none', borderRadius: '10px', background: (!payOpen || issuing) ? '#a5b4fc' : '#4f46e5', cursor: (!payOpen || issuing) ? 'not-allowed' : 'pointer' }}>
              {issuing ? '결제창 여는 중…' : '가입비 결제하기'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
