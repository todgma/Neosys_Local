import { useState } from 'react';
import { X, Printer } from 'lucide-react';

/**
 * 임대보증금 일부보증에 대한 임차인 동의서 (민간임대주택에 관한 특별법 시행규칙 [별지 제25호서식], 신설 2022. 1. 14.)
 *  - 신청인(임차인) 작성칸만 입력. 새 창(모달)에서 렌더 → 인쇄(window.print) 지원. 저장 백엔드 연동은 추후.
 */
const BLANK = {
  사업자구분: '개인', // 개인 | 법인
  개인_성명: '', 개인_생년월일: '', 법인_법인명: '', 법인_법인등록번호: '',
  사업자_주소: '', 사업자_전화: '', 사업자_휴대: '',
  주택소재지: '', 계약시작: '', 계약종료: '', 임대보증금: '',
  담보권a: '', 임대보증b: '', 주택60c: '',
  동의자_성명: '', 동의자_생년월일: '', 동의자_연락처: '',
  확인1: '', // 예 | 아니오
  확인2: '', // 예 | 아니오 | 미가입
  확인3: '', // 예 | 아니오 | 미가입
  동의_년: '', 동의_월: '', 동의_일: '', 동의인: '',
};

export default function RentDepositPartialConsentForm({ onClose, initial = null, onSave = null }) {
  const [f, setF] = useState(initial && typeof initial === 'object' ? { ...BLANK, ...initial } : BLANK);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const pick = (k, v) => setF((p) => ({ ...p, [k]: p[k] === v ? '' : v }));
  const num = (v) => Number(String(v ?? '').replace(/[^0-9-]/g, '')) || 0;
  const 보증대상 = num(f.담보권a) + num(f.임대보증b) - num(f.주택60c);

  const In = (k, ph, style) => <input value={f[k] ?? ''} onChange={set(k)} placeholder={ph || ''} className="taf-in" style={style} />;
  const Chk = (k, v, label, extra) => <span className="taf-chk" style={{ marginRight: '12px', ...extra }} onClick={() => pick(k, v)}>[ {f[k] === v ? '√' : ' '} ] {label}</span>;

  return (
    <div className="taf-root">
      <style>{`
        .taf-root { position: fixed; inset: 0; background: #eef1f5; overflow: auto; display: flex; flex-direction: column; }
        .taf-bar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 14px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
        .taf-bar h2 { font-size: 14px; font-weight: 700; color: #111827; margin: 0; }
        .taf-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 13px; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 4px; background: white; color: #374151; cursor: pointer; }
        .taf-btn.primary { background: #4f46e5; border-color: #4f46e5; color: white; }
        .taf-page { width: 210mm; min-height: 297mm; margin: 14px auto; background: white; padding: 10mm 12mm; box-sizing: border-box; box-shadow: 0 2px 14px rgba(0,0,0,.15); font-family: 'Malgun Gothic','맑은 고딕',sans-serif; color: #111; font-size: 13px; line-height: 1.45; }
        .taf-code { font-size: 10.5px; color: #222; margin-bottom: 2px; }
        .taf-title { text-align: center; font-size: 19px; font-weight: 800; letter-spacing: 1px; margin: 4px 0 10px; }
        .taf-chk { font-weight: 700; cursor: pointer; white-space: nowrap; }
        .taf-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .taf-tbl td { border: 1px solid #333; padding: 3px 5px; vertical-align: top; }
        .taf-l { text-align: center; font-weight: 700; background: #fff; vertical-align: middle; }
        .taf-lab { font-size: 10.5px; color: #333; display: block; margin-bottom: 2px; }
        .taf-in { width: 100%; border: none; background: #eaf7ef; padding: 3px 4px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
        .taf-in.taf-num { width: 44px; text-align: center; margin: 0 2px; }
        .taf-gray { background: #d0d0d0; text-align: center; font-weight: 800; font-size: 12.5px; padding: 4px 0; border: 1px solid #333; }
        .taf-box { border: 1px solid #333; border-top: none; padding: 6px 8px; font-size: 11px; line-height: 1.6; }
        .taf-sub { border: 1px dashed #333; padding: 5px 8px; margin: 5px 0; font-size: 10.5px; line-height: 1.6; }
        .taf-sign { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin: 6px 0; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: white !important; }
          .taf-root { position: static; background: white; overflow: visible; }
          .taf-page { margin: 0; box-shadow: none; width: auto; min-height: auto; padding: 0; }
          @page { size: A4; margin: 20mm 20mm 10mm 20mm; }
        }
      `}</style>

      <div className="taf-bar no-print">
        <h2>임대보증금 일부보증에 대한 임차인 동의서</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onSave && <button className="taf-btn" style={{ background: '#059669', borderColor: '#059669', color: 'white' }} onClick={async () => { const ok = await onSave(f); if (ok) onClose?.(); }}>저장</button>}
          <button className="taf-btn primary" onClick={() => window.print()}><Printer className="w-4 h-4" /> 인쇄 / 미리보기</button>
          {onClose && <button className="taf-btn" onClick={onClose}><X className="w-4 h-4" /> 닫기</button>}
        </div>
      </div>

      <div className="taf-page">
        <div className="taf-code">■ 민간임대주택에 관한 특별법 시행규칙 [별지 제25호서식] &lt;신설 2022. 1. 14.&gt;</div>
        <div className="taf-title">임대보증금 일부보증에 대한 임차인 동의서</div>

        {/* 임대사업자 */}
        <table className="taf-tbl">
          <colgroup><col style={{ width: '13%' }} /><col style={{ width: '22%' }} /><col style={{ width: '32.5%' }} /><col style={{ width: '32.5%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" rowSpan={4}>임대<br />사업자</td>
              <td className="taf-chk" style={{ verticalAlign: 'middle' }} onClick={() => pick('사업자구분', '개인')}>[ {f.사업자구분 === '개인' ? '√' : ' '} ] 개인사업자</td>
              <td><span className="taf-lab">성명</span>{In('개인_성명')}</td>
              <td><span className="taf-lab">생년월일</span>{In('개인_생년월일')}</td>
            </tr>
            <tr>
              <td className="taf-chk" style={{ verticalAlign: 'middle' }} onClick={() => pick('사업자구분', '법인')}>[ {f.사업자구분 === '법인' ? '√' : ' '} ] 법인사업자</td>
              <td><span className="taf-lab">법인명(상호)</span>{In('법인_법인명')}</td>
              <td><span className="taf-lab">법인등록번호</span>{In('법인_법인등록번호')}</td>
            </tr>
            <tr>
              <td colSpan={3}><span className="taf-lab">주소(법인인 경우 대표 사무소 소재지)</span>{In('사업자_주소')}</td>
            </tr>
            <tr>
              <td colSpan={2}><span className="taf-lab">전화번호</span>{In('사업자_전화')}</td>
              <td><span className="taf-lab">휴대전화번호</span>{In('사업자_휴대')}</td>
            </tr>
          </tbody>
        </table>

        {/* 민간임대주택 */}
        <table className="taf-tbl" style={{ marginTop: '4px' }}>
          <colgroup><col style={{ width: '13%' }} /><col style={{ width: '44%' }} /><col style={{ width: '43%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" rowSpan={2}>민간<br />임대<br />주택</td>
              <td colSpan={2}><span className="taf-lab">민간임대주택의 소재지</span>{In('주택소재지')}</td>
            </tr>
            <tr>
              <td>
                <span className="taf-lab">임대차 계약기간</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{In('계약시작', '', { width: '45%' })}<span>~</span>{In('계약종료', '', { width: '45%' })}</span>
              </td>
              <td><span className="taf-lab">임대보증금(원)</span>{In('임대보증금')}</td>
            </tr>
          </tbody>
        </table>

        {/* 보증대상 금액 */}
        <table className="taf-tbl" style={{ marginTop: '4px' }}>
          <colgroup><col style={{ width: '13%' }} /><col style={{ width: '21.75%' }} /><col style={{ width: '21.75%' }} /><col style={{ width: '21.75%' }} /><col style={{ width: '21.75%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" rowSpan={2}>보증대상<br />금액(원)</td>
              <td className="taf-l" style={{ fontWeight: 600, fontSize: '11px' }}>담보권 설정금액(a)</td>
              <td className="taf-l" style={{ fontWeight: 600, fontSize: '11px' }}>임대보증금(b)</td>
              <td className="taf-l" style={{ fontWeight: 600, fontSize: '11px' }}>주택가격의 60%(c)</td>
              <td className="taf-l" style={{ fontWeight: 600, fontSize: '11px' }}>보증대상금액(a+b-c)</td>
            </tr>
            <tr>
              <td>{In('담보권a')}</td>
              <td>{In('임대보증b')}</td>
              <td>{In('주택60c')}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, paddingTop: '5px' }}>{보증대상.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        {/* 동의자(임차인) */}
        <table className="taf-tbl" style={{ marginTop: '4px' }}>
          <colgroup><col style={{ width: '13%' }} /><col style={{ width: '29%' }} /><col style={{ width: '29%' }} /><col style={{ width: '29%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l">동의자<br />(임차인)</td>
              <td><span className="taf-lab">성명</span>{In('동의자_성명')}</td>
              <td><span className="taf-lab">생년월일</span>{In('동의자_생년월일')}</td>
              <td><span className="taf-lab">연락처</span>{In('동의자_연락처')}</td>
            </tr>
          </tbody>
        </table>

        {/* 임대사업자 보증가입 의무 */}
        <div className="taf-gray" style={{ marginTop: '10px' }}>임대사업자 보증가입 의무</div>
        <div className="taf-box">
          1. 주택임대사업자로 등록된 임대주택은 「민간임대주택에 관한 특별법」 제49조제1항에 따라 임대보증금 전액을 보증대상으로 하는 보증에 의무적으로 가입해야 합니다.<br />
          2. 다만, 같은 법 제49조제3항에 따라 다음 각 목에 모두 해당하는 경우에는 임대주택의 담보권 설정금액과 임대보증금을 합한 금액에서 주택가격의 60%에 해당하는 금액을 뺀 금액을 보증대상으로 하여 가입할 수 있으며, 보증대상 금액이 0원 이하인 경우 보증에 가입하지 않을 수 있습니다.
          <div className="taf-sub">
            가. 근저당권이 세대별로 분리된 경우<br />
            나. 임대사업자가 임대보증금보다 선순위인 제한물권, 압류ㆍ가압류ㆍ가처분 등을 해소한 경우<br />
            다. 전세권이 설정된 경우 또는 임차인이 「주택임대차보호법」 제3조의2제2항에 따른 대항요건과 확정일자를 갖춘 경우<br />
            라. 임차인이 일부보증에 동의한 경우
          </div>
          3. 임대보증금 일부 보증에 가입한 경우, 추후 임대사업자가 임대보증금을 반환하지 않으면 임차인은 일부 보증의 보증대상 금액으로만 보증금 청구가 가능합니다.
        </div>

        {/* 임차인 확인·동의 사항 */}
        <div className="taf-gray" style={{ marginTop: '10px' }}>임차인 확인ㆍ동의 사항</div>
        <table className="taf-tbl" style={{ borderTop: 'none' }}>
          <colgroup><col style={{ width: '75%' }} /><col style={{ width: '25%' }} /></colgroup>
          <tbody>
            <tr>
              <td style={{ fontSize: '11px', lineHeight: 1.55 }}>1. 위 임대사업자의 임대보증금 보증가입 의무 관련 내용을 확인했으며, 임대주택에 전세권을 설정하였거나, 「주택임대차보호법」에 따른 대항 요건(주택의 인도와 전입신고) 및 확정일자를 갖추었습니까(예정 포함), 그러지 않을 경우 보증이 이행되지 않을 수 있음을 확인했습니까?</td>
              <td style={{ verticalAlign: 'middle' }}>{Chk('확인1', '예', '예')}{Chk('확인1', '아니오', '아니오')}</td>
            </tr>
            <tr>
              <td style={{ fontSize: '11px', lineHeight: 1.55 }}>2. 임대보증금의 전액이 아닌 일부 금액<sup>＊</sup>만 보증에 가입한다는 사실에 동의하십니까?<br /><span style={{ color: '#333' }}>＊ 일부 가입 금액: (담보권 설정금액 + 임대보증금) – 주택가격의 60%</span></td>
              <td style={{ verticalAlign: 'middle' }}>{Chk('확인2', '예', '예')}{Chk('확인2', '아니오', '아니오')}<div style={{ marginTop: '3px' }}>{Chk('확인2', '미가입', '미가입 동의(보증대상 금액이 0원 이하)', { whiteSpace: 'normal', marginRight: 0, display: 'inline-block' })}</div></td>
            </tr>
            <tr>
              <td style={{ fontSize: '11px', lineHeight: 1.55 }}>3. 추후 임대사업자로부터 임대보증금을 돌려받지 못할 경우 보증에 가입된 일부 금액만 보증회사에서 지급이 가능하다는 점에 동의하십니까?</td>
              <td style={{ verticalAlign: 'middle' }}>{Chk('확인3', '예', '예')}{Chk('확인3', '아니오', '아니오')}<div style={{ marginTop: '3px' }}>{Chk('확인3', '미가입', '미가입 동의(보증대상 금액이 0원 이하)', { whiteSpace: 'normal', marginRight: 0, display: 'inline-block' })}</div></td>
            </tr>
          </tbody>
        </table>

        <div className="taf-sign" style={{ marginTop: '8px' }}>
          <span style={{ whiteSpace: 'nowrap' }}>
            <input value={f.동의_년} onChange={set('동의_년')} className="taf-in taf-num" />년&nbsp;
            <input value={f.동의_월} onChange={set('동의_월')} className="taf-in taf-num" />월&nbsp;
            <input value={f.동의_일} onChange={set('동의_일')} className="taf-in taf-num" />일
          </span>
        </div>
        <div className="taf-sign">
          <span style={{ fontWeight: 700 }}>동의인(임차인)</span>{In('동의인', '', { width: '160px' })}<span style={{ whiteSpace: 'nowrap' }}>(서명 또는 인)</span>
        </div>

        <div style={{ textAlign: 'right', fontSize: '10px', color: '#333', marginTop: '8px' }}>210mm×297mm[백상지(80g/㎡) 또는 중질지(80g/㎡)]</div>
      </div>
    </div>
  );
}
