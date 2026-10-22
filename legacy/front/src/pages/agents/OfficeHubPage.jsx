import { useState } from 'react';
import OfficeManagementPage from './OfficeManagementPage';
import StaffAccountManagementPage from './StaffAccountManagementPage';
import MembershipSubscribeModal from '../../components/dashboard/MembershipSubscribeModal';
import EntryFeePanel from '../../components/dashboard/EntryFeePanel';
import { useAuthStore } from '../../stores/authStore';

// 사무실관리 허브 — 비밀번호 통과 후 한 창에서 "가입비 결제 / 사무실정보 수정 / 직원관리 / (대표)상품가입" 탭으로 이용
export default function OfficeHubPage() {
  const { user, updateUser } = useAuthStore();
  const isRep = (user?.rtType || user?.RtType) === 'RTTYP01'; // 대표(개업공인중개사)만 가입비/상품가입 노출
  const hasMembership = (user?.hasMembership ?? user?.HasMembership) === true;
  const hasEntryFee = (user?.hasEntryFee ?? user?.HasEntryFee) === true;

  // 탭 순서(대표): 사무실정보/직원관리 → [가입비 결제] → 상품가입 (가입비는 상품가입 바로 좌측)
  //  · 기본 활성: 가입비 미결제면 '가입비 결제', 가입비 OK·상품 미가입이면 '상품가입', 그 외 사무실정보
  const tabs = ['office', 'staff'];
  if (isRep) tabs.push('entryfee', 'subscribe');
  const defaultTab = isRep ? (!hasEntryFee ? 'entryfee' : (!hasMembership ? 'subscribe' : 'office')) : 'office';
  const [tab, setTab] = useState(defaultTab);

  const LABEL = { entryfee: '가입비 결제', office: '사무실정보 수정', staff: '직원관리', subscribe: '상품가입' };

  const tabBtn = (active) => ({
    padding: '9px 18px',
    fontSize: '14px',
    fontWeight: active ? 800 : 600,
    color: active ? '#4f46e5' : '#334155',
    background: active ? 'white' : 'transparent',
    border: '1px solid #e5e7eb',
    borderBottom: active ? '2px solid #4f46e5' : '1px solid #e5e7eb',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
    marginBottom: '-1px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f9fafb' }}>
      {/* 탭 바 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', padding: '10px 16px 0', borderBottom: '1px solid #e5e7eb', background: '#f8fafc', flexShrink: 0 }}>
        {tabs.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} style={tabBtn(tab === t)}>{LABEL[t]}</button>
        ))}
      </div>
      {/* 탭 내용 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {tab === 'entryfee' && isRep && <EntryFeePanel />}
        {tab === 'office' && <OfficeManagementPage />}
        {tab === 'staff' && <StaffAccountManagementPage />}
        {tab === 'subscribe' && isRep && (
          // 가입비 결제 여부와 무관하게 상품가입 허용(제한 해제)
          <MembershipSubscribeModal
            page
            offNo={user?.offNo}
            userId={user?.userId || user?.id}
            onSubscribed={() => {
              try { localStorage.setItem('membershipSubscribed', '1'); } catch { /* noop */ }
              updateUser({ hasMembership: true }); // 이 창(허브)도 즉시 반영
            }}
          />
        )}
      </div>
    </div>
  );
}
