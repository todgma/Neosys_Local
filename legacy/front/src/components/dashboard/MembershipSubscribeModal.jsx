import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/apiEndpoints';
import { X, Plus, Minus, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';

const won = (n) => (Number(n) || 0).toLocaleString();
const vat = (n) => Math.round((Number(n) || 0) * 0.1); // 부가세 10%(공급가액 기준)

/**
 * 상품 가입 모달 — 멤버십 미가입 사무소가 대시보드에서 상품을 선택해 즉시 가입(결제 없음).
 *  · 상품카드: 기기합계만 표기(PC/모바일은 '-', 가입 시 사용자가 +/-로 분배)
 *  · 선택 후 PC/모바일을 기기합계 내에서 분배, 초과분은 '추가요금'(1대당) 가산
 *  · 가입하기 → 기존 office 멤버십 적용 API 재사용
 */
export default function MembershipSubscribeModal({ offNo, userId, onClose, onSubscribed, page = false }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState(null);
  const [pc, setPc] = useState(0);
  const [mob, setMob] = useState(0);
  const [saving, setSaving] = useState(false);
  const [cfgPlan, setCfgPlan] = useState(null); // 기기 대수 설정 모달(상품 선택 시 표시)
  const [cfgPc, setCfgPc] = useState(0);
  const [cfgMob, setCfgMob] = useState(0);
  const { user } = useAuthStore();
  const alreadyMember = (user?.hasMembership ?? user?.HasMembership) === true; // 이미 상품가입 여부

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/memberships`);
        const body = res.data;
        const items = body?.data?.items || body?.data?.Items || body?.items || [];
        setProducts(items);
      } catch (e) { console.error('상품 조회 실패:', e); setProducts([]); }
      finally { setLoading(false); }
    })();
  }, []);

  const norm = (p) => ({
    prodId: p.prodId ?? p.ProdId,
    prodName: p.prodName ?? p.ProdName ?? '',
    pcCnt: Number(p.pcCnt ?? p.PcCnt) || 0,
    mobCnt: Number(p.mobCnt ?? p.MobCnt) || 0,
    price: Number(p.price ?? p.Price) || 0,
    descr: p.descr ?? p.Descr ?? '',
  });

  const { plans, addFee } = useMemo(() => {
    const all = products.map(norm);
    const addProd = all.find((p) => p.prodName.replace(/\s/g, '') === '추가요금');
    return {
      // '추가요금'은 단가로만 사용, '기본요금'은 목록에서 숨김
      plans: all.filter((p) => p !== addProd && p.prodName.replace(/\s/g, '') !== '기본요금'),
      addFee: addProd ? addProd.price : 0,
    };
  }, [products]);

  const sel = plans.find((p) => p.prodId === selId) || null;
  const baseTotal = sel ? sel.pcCnt + sel.mobCnt : 0;
  const total = pc + mob;
  const extra = Math.max(0, total - baseTotal);
  const extraFee = extra * addFee;
  const grand = (sel ? sel.price : 0) + extraFee;

  // 상품 선택 → 기기 대수 설정 모달 오픈(기본값=상품 기본 PC/모바일). 확인해야 실제 선택 확정
  const pickPlan = (p) => { setCfgPlan(p); setCfgPc(p.pcCnt); setCfgMob(p.mobCnt); };
  const confirmCfg = () => { if (!cfgPlan) return; setSelId(cfgPlan.prodId); setPc(cfgPc); setMob(cfgMob); setCfgPlan(null); };

  const subscribe = async () => {
    if (alreadyMember) { toast.error('이미 가입되어있습니다.'); return; }
    if (!sel) { toast.error('상품을 선택하세요.'); return; }
    if (!offNo) { toast.error('사무소 정보가 없어 가입할 수 없습니다.'); return; }
    if (total <= 0) { toast.error('기기 수를 1대 이상 설정하세요.'); return; }
    setSaving(true);
    try {
      const memo = `PC${pc}/Mobile${mob}${extra > 0 ? ` 추가${extra}대` : ''} · 합계 ${won(grand)}원`;
      await axios.put(`${API_BASE_URL}/api/admin/memberships/office/${offNo}`, { ProdId: sel.prodId, Memo: memo, UserId: userId });
      toast.success('상품에 가입되었습니다.');
      onSubscribed?.();
      onClose?.();
    } catch (e) { console.error('가입 실패:', e); toast.error('가입에 실패했습니다.'); }
    finally { setSaving(false); }
  };

  const stepBtn = { width: '30px', height: '30px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', color: '#334155', cursor: 'pointer' };
  const Stepper = ({ label, value, set }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '15px', fontWeight: 700, color: '#334155', width: '56px' }}>{label}</span>
      <button type="button" style={stepBtn} onClick={() => set(Math.max(0, value - 1))} title="감소"><Minus className="w-4 h-4" /></button>
      <span style={{ minWidth: '34px', textAlign: 'center', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{value}</span>
      <button type="button" style={stepBtn} onClick={() => set(value + 1)} title="증가"><Plus className="w-4 h-4" /></button>
      <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>대</span>
    </div>
  );

  const overlayStyle = page
    ? { position: 'relative', width: '100%', height: '100%', background: '#eef2f7', display: 'flex', alignItems: 'stretch', justifyContent: 'center' }
    : { position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' };
  const cardStyle = page
    ? { width: '100%', maxWidth: 'none', height: '100%', maxHeight: 'none', background: 'white', borderRadius: 0, boxShadow: 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column' }
    : { width: '760px', maxWidth: '96vw', maxHeight: '90vh', background: 'white', borderRadius: '12px', boxShadow: '0 16px 44px rgba(0,0,0,0.32)', overflow: 'hidden', display: 'flex', flexDirection: 'column' };

  return (
    <div onClick={page ? undefined : onClose} style={overlayStyle}>
      <div onClick={page ? undefined : (e) => e.stopPropagation()} style={cardStyle}>
        {/* 본문 */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 20px' }}>
          {loading ? (
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#334155', textAlign: 'center', padding: '30px 0' }}>상품을 불러오는 중...</p>
          ) : plans.length === 0 ? (
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#334155', textAlign: 'center', padding: '30px 0' }}>가입 가능한 상품이 없습니다.</p>
          ) : (
            <>
              {/* 안내 — 요금제 선택 시 기기 대수 설정 */}
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#64748b', marginBottom: '10px' }}>
                요금제를 선택하면 PC·모바일 대수 설정 창이 열립니다.
              </div>
              {/* 요금제 목록 — 한 줄(요금제명 · 특징 · 금액/월) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {plans.map((p) => {
                  const on = p.prodId === selId;
                  const devices = p.pcCnt + p.mobCnt;
                  return (
                    <button key={p.prodId} type="button" onClick={() => pickPlan(p)}
                      style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer',
                        border: on ? '2px solid #4f46e5' : '1px solid #e5e7eb', background: on ? '#eef2ff' : 'white' }}>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#111827', flexShrink: 0, minWidth: '96px' }}>{p.prodName}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: '14px', fontWeight: 600, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        기기 {devices}대 (PC {p.pcCnt} + 모바일 {p.mobCnt}){p.descr ? ` · ${p.descr}` : ''}
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                          {won(p.price)}원/월 + VAT({won(vat(p.price))}원)
                        </span>
                        <span style={{ fontSize: '17px', fontWeight: 800, color: '#4f46e5' }}>
                          총금액 {won(p.price + vat(p.price))}원<span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}> (부가세포함)</span>
                        </span>
                      </span>
                      {on && <Check className="w-5 h-5" style={{ color: '#4f46e5', flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>

              {/* 선택 후 기기 분배 — 강조 박스(보라 테두리) */}
              {sel && (
                <div style={{ marginTop: '16px', padding: '16px 18px', borderRadius: '12px', border: '2px solid #4f46e5', background: '#eef2ff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#4f46e5' }}>기기 분배 — {sel.prodName}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>선택 합계 <b style={{ color: '#4f46e5' }}>{total}대</b> <span style={{ fontWeight: 600, color: '#64748b' }}>/ 기본 {baseTotal}대</span></span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: '28px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Stepper label="PC" value={pc} set={setPc} />
                    <Stepper label="모바일" value={mob} set={setMob} />
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                    기본 {baseTotal}대 초과 시 1대당 <b style={{ color: '#dc2626' }}>{won(addFee)}원</b>(추가요금)
                  </div>
                  {extra > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '15px', fontWeight: 800, color: '#dc2626' }}>
                      추가요금 {extra}대 × {won(addFee)}원 = {won(extraFee)}원
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* 하단: 상품금액 합계 + 가입하기 */}
        <div style={{ borderTop: '1px solid #e5e7eb', background: '#f8fafc', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>상품금액 합계</span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#4f46e5' }}>{won(grand + vat(grand))}원<span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}> (부가세포함)</span></span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={onClose} disabled={saving}
              style={{ padding: '9px 18px', fontSize: '14px', fontWeight: 600, color: '#334155', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>닫기</button>
            <button type="button" onClick={subscribe} disabled={saving || !sel || alreadyMember} readOnly={alreadyMember}
              style={{ padding: '9px 24px', fontSize: '14px', fontWeight: 800, color: 'white', background: alreadyMember ? '#059669' : ((!sel || saving) ? '#a5b4fc' : '#4f46e5'), border: 'none', borderRadius: '8px', cursor: (alreadyMember || !sel || saving) ? 'default' : 'pointer' }}>
              {alreadyMember ? '이미 가입되어있습니다' : (saving ? '가입 중...' : '가입하기')}
            </button>
          </div>
        </div>
      </div>

      {/* 상품 선택 시 — PC/모바일 대수 설정 모달(확인해야 가입 가능, 이후 하단에서 재조정 가능) */}
      {cfgPlan && (
        <div onClick={(e) => { e.stopPropagation(); setCfgPlan(null); }}
          style={{ position: 'fixed', inset: 0, zIndex: 1600, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '440px', maxWidth: '94vw', background: 'white', borderRadius: '12px', boxShadow: '0 16px 44px rgba(0,0,0,0.32)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', fontSize: '17px', fontWeight: 800, color: '#111827' }}>기기 대수 설정 — {cfgPlan.prodName}</div>
            <div style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '14px' }}>PC와 모바일 대수를 각각 설정하세요. <span style={{ fontWeight: 700 }}>(기본 PC,모바일 합계 {cfgPlan.pcCnt + cfgPlan.mobCnt}대)</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Stepper label="PC" value={cfgPc} set={setCfgPc} />
                <Stepper label="모바일" value={cfgMob} set={setCfgMob} />
              </div>
              <div style={{ marginTop: '14px', fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                선택 합계 {cfgPc + cfgMob}대
                {Math.max(0, (cfgPc + cfgMob) - (cfgPlan.pcCnt + cfgPlan.mobCnt)) > 0 && (
                  <span style={{ color: '#dc2626', marginLeft: '8px' }}>· 기본 {cfgPlan.pcCnt + cfgPlan.mobCnt}대 초과 {(cfgPc + cfgMob) - (cfgPlan.pcCnt + cfgPlan.mobCnt)}대(추가요금)</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <button type="button" onClick={() => setCfgPlan(null)}
                style={{ padding: '9px 18px', fontSize: '14px', fontWeight: 600, color: '#334155', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>취소</button>
              <button type="button" onClick={confirmCfg} disabled={(cfgPc + cfgMob) <= 0}
                style={{ padding: '9px 24px', fontSize: '14px', fontWeight: 800, color: 'white', background: (cfgPc + cfgMob) <= 0 ? '#a5b4fc' : '#4f46e5', border: 'none', borderRadius: '8px', cursor: (cfgPc + cfgMob) <= 0 ? 'default' : 'pointer' }}>확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
