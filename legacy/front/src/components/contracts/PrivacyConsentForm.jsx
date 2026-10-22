import { useState, useEffect } from 'react';
import { X, Printer, Plus } from 'lucide-react';

/**
 * 개인정보 수집 및 이용 동의서 (네오시스)
 *  - 거래관련서식과 동일하게 필드 직접 입력 가능(성명/보존기간/수집일시 등). 회사명/제공받는자는 '네오시스' 고정.
 *  - 우상단 '개인정보 제공자 추가'로 제공자 행(①,②,③…) 무제한 추가·삭제.
 *  - 새 창(모달)에서 렌더 → 인쇄(window.print). 저장값 백엔드 연동은 추후.
 */
const ORG = '네오시스'; // 회사명/제공받는자 명칭(고정)
const BLANK = {
  보존기간: '5년',
  providers: [{ 성명: '', 동의: '동의' }, { 성명: '', 동의: '동의' }],
  수집_년: '', 수집_월: '', 수집_일: '', 수집자: '',
};
const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮';
const circled = (n) => CIRCLED[n] || `${n + 1}.`;

export default function PrivacyConsentForm({ onClose, initial = null, onSave = null, onChange = null, inline = false }) {
  const [f, setF] = useState(() => {
    const d = new Date();
    const today = { 수집_년: String(d.getFullYear()), 수집_월: String(d.getMonth() + 1), 수집_일: String(d.getDate()) };
    const base = { ...BLANK, ...today };
    return initial && typeof initial === 'object' ? { ...base, ...initial } : base;
  });
  // 입력값을 부모로 통지 — 계약서 화면 '저장' 시 계약서·확인설명서·개인정보동의서 일괄 저장용
  useEffect(() => { onChange?.(f); }, [f]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const addProvider = () => setF((p) => ({ ...p, providers: [...p.providers, { 성명: '', 동의: '동의' }] }));
  const removeProvider = (i) => setF((p) => ({ ...p, providers: p.providers.length > 1 ? p.providers.filter((_, j) => j !== i) : p.providers }));
  const setProvider = (i, k, v) => setF((p) => ({ ...p, providers: p.providers.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));

  const In = (k, w) => <input value={f[k] ?? ''} onChange={set(k)} className="pcf-in" style={w ? { width: w } : undefined} />;

  return (
    <div className={`pcf-root${inline ? ' pcf-inline' : ''}`}>
      <style>{`
        .pcf-root { position: fixed; inset: 0; background: #eef1f5; overflow: auto; display: flex; flex-direction: column; }
        /* 인라인(탭) 모드: 전체화면 오버레이 대신 부모 영역(탭 본문)을 채움 */
        .pcf-root.pcf-inline { position: relative; inset: auto; height: 100%; flex: 1; min-height: 0; }
        .pcf-bar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 14px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
        .pcf-bar h2 { font-size: 14px; font-weight: 700; color: #111827; margin: 0; }
        .pcf-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 13px; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 4px; background: white; color: #374151; cursor: pointer; white-space: nowrap; }
        .pcf-btn.primary { background: #4f46e5; border-color: #4f46e5; color: white; }
        .pcf-btn.accent { background: #0891b2; border-color: #0891b2; color: white; }
        /* 화면에서는 9px A4가 너무 작게 보여 확대(zoom)해서 표시 — 인쇄는 실제 1:1(아래 @media print에서 zoom 해제) */
        .pcf-page { width: 210mm; min-height: 297mm; margin: 10px auto; background: white; padding: 2mm 12mm 12mm; box-sizing: border-box; box-shadow: 0 2px 14px rgba(0,0,0,.15); font-family: '굴림','Gulim','돋움','Dotum','Malgun Gothic',sans-serif; color: #111; font-size: 10px; line-height: 1.2; zoom: 1.4; }
        .pcf-title { text-align: center; font-size: 20px; font-weight: 800; letter-spacing: 2px; background: #eef5ff; border: 1px solid #94a3b8; padding: 7px; margin: 0 0 6px; }
        .pcf-lead { font-weight: 700; font-size: 10px; margin: 0 0 2px; }
        .pcf-sec { font-weight: 700; font-size: 10px; margin: 4px 0 0; }
        .pcf-p { margin: 0; font-size: 10px; }
        .pcf-page th { font-size: 10px; }
        .pcf-in { border: none; background: #eef7ff; padding: 0 5px; font-size: 10px; font-family: inherit; outline: none; box-sizing: border-box; }
        .pcf-in.num { width: 54px; text-align: center; }
        .pcf-sign { display: flex; align-items: center; gap: 10px; margin-top: 4px; flex-wrap: wrap; }
        .pcf-opt { cursor: pointer; user-select: none; white-space: nowrap; }
        .pcf-del { border: 1px solid #fca5a5; color: #dc2626; background: white; border-radius: 6px; width: 24px; height: 24px; cursor: pointer; font-size: 14px; line-height: 1; }
        .pcf-foot { border-top: 1px solid #cbd5e1; margin-top: 6px; padding-top: 6px; }
        .pcf-kar { text-align: right; font-weight: 800; color: #1d4ed8; margin-top: 8px; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: white !important; }
          .pcf-root { position: static; background: white; overflow: visible; }
          .pcf-page { margin: 0; box-shadow: none; width: auto; min-height: auto; padding: 0; zoom: 1; }
          .pcf-in { background: transparent; }
          @page { size: A4; margin: 20mm 20mm 10mm 20mm; }
        }
      `}</style>

      {/* 상단 툴바 (인쇄 시 숨김) */}
      <div className="pcf-bar no-print">
        <h2>개인정보 수집 및 이용 동의서</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="pcf-btn accent" onClick={addProvider}><Plus className="w-4 h-4" /> 개인정보 제공자 추가</button>
          {onSave && <button className="pcf-btn" style={{ background: '#059669', borderColor: '#059669', color: 'white' }} onClick={async () => { const ok = await onSave(f); if (ok) onClose?.(); }}>저장</button>}
          <button className="pcf-btn primary" onClick={() => window.print()}><Printer className="w-4 h-4" /> 인쇄 / 미리보기</button>
          {onClose && !inline && <button className="pcf-btn" onClick={onClose}><X className="w-4 h-4" /> 닫기</button>}
        </div>
      </div>

      {/* A4 서식 */}
      <div className="pcf-page">
        <div className="pcf-title">개인정보 수집 및 이용 동의서</div>

        <div className="pcf-lead">[ 개인정보 수집 및 이용 동의 ]</div>

        <div className="pcf-sec">1. 개인정보의 수집 및 이용목적</div>
        <p className="pcf-p">- 부동산 거래를 위한 매물 관리 및 계약서 작성<br />- 지속가능한 서비스 제공을 위한 고객관리<br /></p>
        <p className="pcf-p">단, 고유식별번호(주민등록번호)는 공인중개사법 제26조(거래계약서의 작성 등) 및 부동산거래신고에 관한 법률 제3조(부동산거래의 신고)의 목적 이외에는 사용되지 않습니다.</p>

        <div className="pcf-sec">2. 수집하는 개인정보의 항목</div>
        <p className="pcf-p">수집항목 : 이름, 주소, 휴대폰번호, 전화번호, 생년월일, 성별, 계약정보</p>

        <div className="pcf-sec">3. 개인정보 수집방법</div>
        <p className="pcf-p">네오시스 시스템 사용이 허가된 개업공인중개사의 직접 입력을 통한 시스템 등록</p>

        <div className="pcf-sec">4. 개인정보의 보유 및 이용기간</div>
        <p className="pcf-p">저장된 개인정보는 이용목적이 달성되면 지체 없이 파기합니다. 단, 공인중개사법 및 공인중개사법 시행령에 따라 계약서는 {In('보존기간', '54px')} 간 보존합니다.</p>

        <div className="pcf-sec">5. 개인정보의 제3자 제공</div>
        <p className="pcf-p">
          {ORG}는(은) 다음과 같이 위에서 수집한 개인정보를 제3자에게 제공하고 있습니다.<br />
          - 제공받는자 : {ORG}<br />
          - 이용목적 및 업무내용 :<br />
          &nbsp;&nbsp;가. 네오시스 서비스 제공<br />
          &nbsp;&nbsp;&nbsp;- 매물등록, 고객등록, 계약서 작성 등에 필요한 개인정보 저장시스템의 관리업무<br />
          &nbsp;&nbsp;나. 개인정보보호법 제28조의 2(가명정보의 처리 등)에 의거하여 각종 부동산 통계작성을 위해 가명정보를 활용합니다.<br />
          - 보유 및 이용기간 : 공인중개사의 네오시스 계약서 데이터 삭제 처리 시 까지
        </p>

        <p className="pcf-p" style={{ marginTop: '8px' }}>정보 제공시 개인정보보호의 안전을 기하기 위하여 개인정보보호 관련 법규의 준수 및 사고시의 책임부담 등을 명확히 규정하고 당해 계약 내용을 서면으로 보관하고 있습니다.</p>
        <p className="pcf-p" style={{ marginTop: '6px' }}>※ 동의를 거부할 수 있으며, 동의 거부 시 제공되는 중개서비스가 제한될 수 있으나 그에 대한 불이익은 없습니다.</p>

        {/* 개인정보 제공자 (동적 추가·삭제) */}
        {f.providers.map((pr, i) => (
          <div key={i} className="pcf-sign">
            <span style={{ whiteSpace: 'nowrap' }}>{circled(i)}개인정보 제공자 : &nbsp; 성 명</span>
            <input value={pr.성명} onChange={(e) => setProvider(i, '성명', e.target.value)} className="pcf-in" style={{ width: '200px' }} />
            <span style={{ whiteSpace: 'nowrap' }}>(서 명)</span>
            <span style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ whiteSpace: 'nowrap' }}>☐ 동의</span>
              <span style={{ whiteSpace: 'nowrap' }}>☐ 동의거부</span>
            </span>
            {f.providers.length > 1 && (
              <button type="button" className="pcf-del no-print" title="제공자 삭제" onClick={() => removeProvider(i)}>×</button>
            )}
          </div>
        ))}

        <div className="pcf-foot">
          <div className="pcf-sign" style={{ marginTop: 0 }}>
            <span style={{ whiteSpace: 'nowrap' }}>수집일시 :</span>
            <input value={f.수집_년} onChange={set('수집_년')} className="pcf-in num" />년
            <input value={f.수집_월} onChange={set('수집_월')} className="pcf-in num" />월
            <input value={f.수집_일} onChange={set('수집_일')} className="pcf-in num" />일
          </div>
          <div className="pcf-sign">
            <span style={{ whiteSpace: 'nowrap' }}>개인정보 수집자 : &nbsp; 성 명</span>
            <input value={f.수집자} onChange={set('수집자')} className="pcf-in" style={{ width: '200px' }} />
            <span style={{ whiteSpace: 'nowrap' }}>(서 명)</span>
          </div>
        </div>

        <p className="pcf-p" style={{ marginTop: '8px' }}>※ 공동중개망에 고객의 정보를 등록할 경우 개인정보 수집 및 이용 동의를 받아야 합니다.</p>

      </div>
    </div>
  );
}
