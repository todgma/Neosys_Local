import { useState } from 'react';
import { X, Printer } from 'lucide-react';

/**
 * 임대보증금 보증 미가입에 대한 임차인 동의서 (보증금이 우선변제금 이하인 경우)
 *  민간임대주택에 관한 특별법 시행규칙 [별지 제25호의2서식], 개정 2023. 11. 20. — 2쪽(앞쪽 동의서·작성방법 / 뒤쪽 우선변제금표·유의사항)
 *  - 신청인(임차인) 작성칸만 입력. 새 창(모달) 렌더 → 인쇄(window.print) 지원. 저장 백엔드 연동은 추후.
 */
const BLANK = {
  사업자_성명: '', 사업자_등록번호: '', 사업자_생년월일: '', 사업자_전화: '',
  주택소재지: '', 계약기간: '',
  지역구분: '', 적용시점: '', 적용금액: '',
  동의1_보증금액: '', 동의1_성명: '', 동의1_생년월일: '', 동의1_연락처: '',
  동의2_보증금액: '', 동의2_성명: '', 동의2_생년월일: '', 동의2_연락처: '',
  동의_년: '', 동의_월: '', 동의_일: '', 동의인: '',
};

// 뒤쪽: 지역·시점별 우선변제금(주택임대차보호법)
const 우선변제 = [
  ['1984. 6. 14. ~ 1987. 11. 30.', ['특별시ㆍ직할시: 300만원,   기타 지역: 200만원']],
  ['1987. 12. 1. ~ 1990. 2. 18.', ['특별시ㆍ직할시: 500만원,   기타 지역: 400만원']],
  ['1990. 2. 19. ~ 1995. 10. 18.', ['특별시ㆍ직할시: 700만원,   기타 지역: 500만원']],
  ['1995. 10. 19. ~ 2001. 9. 14.', ['특별시ㆍ직할시: 1,200만원,   기타 지역: 800만원']],
  ['2001. 9. 15. ~ 2008. 8. 20.', ['수도권 과밀억제권역: 1,600만원   광역시(인천광역시 제외): 1,400만원', '그 밖의 지역: 1,200만원']],
  ['2008. 8. 21. ~ 2010. 7. 25.', ['수도권 과밀억제권역: 2,000만원   광역시(인천광역시 제외): 1,700만원', '그 밖의 지역: 1,400만원']],
  ['2010. 7. 26. ~ 2013. 12. 31.', ['서울특별시: 2,500만원   수도권 과밀억제권역: 2,200만원', '광역시 및 안산시ㆍ용인시ㆍ김포시ㆍ광주시: 1,900만원   그 밖의 지역: 1,400만원']],
  ['2014. 1. 1. ~ 2016. 3. 30.', ['서울특별시: 3,200만원   수도권 과밀억제권역: 2,700만원', '광역시 및 안산시ㆍ용인시ㆍ김포시ㆍ광주시: 2,000만원   그 밖의 지역: 1,500만원']],
  ['2016. 3. 31. ~ 2018. 9. 17.', ['서울특별시: 3,400만원   수도권 과밀억제권역: 2,700만원', '광역시, 세종특별자치시 및 안산시ㆍ용인시ㆍ김포시ㆍ광주시: 2,000만원   그 밖의 지역: 1,700만원']],
  ['2018. 9. 18. ~ 2021. 5. 10.', ['서울특별시: 3,700만원   수도권 과밀억제권역, 세종특별자치시 및 용인시ㆍ화성시: 3,400만원', '광역시 및 안산시ㆍ김포시ㆍ광주시ㆍ파주시: 2,000만원   그 밖의 지역: 1,700만원']],
  ['2021. 5. 11. ~ 2023. 2. 20.', ['서울특별시: 5,000만원   수도권 과밀억제권역, 세종특별자치시 및 용인시ㆍ화성시ㆍ김포시: 4,300만원', '광역시 및 안산시ㆍ광주시ㆍ파주시ㆍ이천시ㆍ평택시: 2,300만원   그 밖의 지역: 2,000만원']],
  ['2023. 2. 21. ~ 현재', ['서울특별시: 5,500만원,   수도권 과밀억제권역, 세종특별자치시 및 용인시ㆍ화성시ㆍ김포시: 4,800만원', '광역시 및 안산시ㆍ광주시ㆍ파주시ㆍ이천시ㆍ평택시: 2,800만원   그 밖의 지역: 2,500만원']],
];

export default function RentDepositNonSubscriptionConsentForm({ onClose, initial = null, onSave = null }) {
  const [f, setF] = useState(initial && typeof initial === 'object' ? { ...BLANK, ...initial } : BLANK);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const In = (k, ph, style) => <input value={f[k] ?? ''} onChange={set(k)} placeholder={ph || ''} className="taf-in" style={style} />;

  return (
    <div className="taf-root">
      <style>{`
        .taf-root { position: fixed; inset: 0; background: #eef1f5; overflow: auto; display: flex; flex-direction: column; }
        .taf-bar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 14px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
        .taf-bar h2 { font-size: 14px; font-weight: 700; color: #111827; margin: 0; }
        .taf-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 13px; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 4px; background: white; color: #374151; cursor: pointer; }
        .taf-btn.primary { background: #4f46e5; border-color: #4f46e5; color: white; }
        .taf-page { width: 210mm; min-height: 297mm; margin: 14px auto; background: white; padding: 10mm 12mm; box-sizing: border-box; box-shadow: 0 2px 14px rgba(0,0,0,.15); font-family: 'Malgun Gothic','맑은 고딕',sans-serif; color: #111; font-size: 13px; line-height: 1.45; }
        .taf-page + .taf-page { margin-top: 20px; }
        .taf-code { font-size: 10.5px; color: #222; margin-bottom: 2px; }
        .taf-apx { text-align: right; font-size: 10.5px; color: #222; }
        .taf-title { text-align: center; font-size: 18px; font-weight: 800; margin: 4px 0 2px; }
        .taf-title2 { text-align: center; font-size: 14px; font-weight: 700; margin-bottom: 8px; }
        .taf-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .taf-tbl td { border: 1px solid #333; padding: 3px 5px; vertical-align: top; }
        .taf-l { text-align: center; font-weight: 700; background: #fff; vertical-align: middle; }
        .taf-lab { font-size: 10px; color: #333; display: block; margin-bottom: 2px; }
        .taf-in { width: 100%; border: none; background: #eaf7ef; padding: 3px 4px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
        .taf-in.taf-num { width: 40px; text-align: center; margin: 0 2px; }
        .taf-gray { background: #cfcfcf; text-align: center; font-weight: 800; font-size: 12.5px; padding: 4px 0; border: 1px solid #333; }
        .taf-note { font-size: 10px; line-height: 1.6; padding: 6px 4px; }
        .taf-sign { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin: 6px 0; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: white !important; }
          .taf-root { position: static; background: white; overflow: visible; }
          .taf-page { margin: 0; box-shadow: none; width: auto; min-height: auto; padding: 0; }
          .taf-page + .taf-page { page-break-before: always; margin-top: 0; }
          @page { size: A4; margin: 20mm 20mm 10mm 20mm; }
        }
      `}</style>

      <div className="taf-bar no-print">
        <h2>임대보증금 보증 미가입에 대한 임차인 동의서</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onSave && <button className="taf-btn" style={{ background: '#059669', borderColor: '#059669', color: 'white' }} onClick={async () => { const ok = await onSave(f); if (ok) onClose?.(); }}>저장</button>}
          <button className="taf-btn primary" onClick={() => window.print()}><Printer className="w-4 h-4" /> 인쇄 / 미리보기</button>
          {onClose && <button className="taf-btn" onClick={onClose}><X className="w-4 h-4" /> 닫기</button>}
        </div>
      </div>

      {/* ===== 1쪽: 동의서(앞쪽) ===== */}
      <div className="taf-page">
        <div className="taf-code">■ 민간임대주택에 관한 특별법 시행규칙 [별지 제25호의2서식] &lt;개정 2023. 11. 20.&gt;</div>
        <div className="taf-title">임대보증금 보증 미가입에 대한 임차인 동의서</div>
        <div className="taf-title2">(보증금이 우선변제금 이하인 경우)</div>
        <div className="taf-apx">(앞쪽)</div>

        {/* 임대사업자 */}
        <table className="taf-tbl">
          <colgroup><col style={{ width: '18%' }} /><col style={{ width: '16.5%' }} /><col style={{ width: '17.5%' }} /><col style={{ width: '17.5%' }} /><col style={{ width: '30.5%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" rowSpan={2}>임대사업자</td>
              <td className="taf-l" style={{ fontWeight: 600, fontSize: '10.5px' }}>성명<br />(법인명)</td>
              <td className="taf-l" style={{ fontWeight: 600, fontSize: '10.5px' }}>임대사업자<br />등록번호</td>
              <td className="taf-l" style={{ fontWeight: 600, fontSize: '10.5px' }}>생년월일<br />(법인등록번호)</td>
              <td className="taf-l" style={{ fontWeight: 600, fontSize: '10.5px' }}>전화번호</td>
            </tr>
            <tr>
              <td>{In('사업자_성명')}</td>
              <td>{In('사업자_등록번호')}</td>
              <td>{In('사업자_생년월일')}</td>
              <td><span className="taf-lab">(유선전화번호) / (휴대전화번호)</span>{In('사업자_전화')}</td>
            </tr>
          </tbody>
        </table>

        {/* 임대주택 소재지 */}
        <table className="taf-tbl" style={{ marginTop: '4px' }}>
          <colgroup><col style={{ width: '18%' }} /><col style={{ width: '82%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l">임대주택<br />소재지</td>
              <td>{In('주택소재지')}</td>
            </tr>
            <tr>
              <td className="taf-l">임대차계약기간</td>
              <td>{In('계약기간', '        년      월      일  ~        년      월      일')}</td>
            </tr>
          </tbody>
        </table>

        {/* 우선변제금 */}
        <table className="taf-tbl" style={{ marginTop: '4px' }}>
          <colgroup><col style={{ width: '18%' }} /><col style={{ width: '16.5%' }} /><col style={{ width: '34.5%' }} /><col style={{ width: '31%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" rowSpan={2}>우선변제금</td>
              <td className="taf-l" style={{ fontWeight: 600, fontSize: '11px' }}>지역구분</td>
              <td className="taf-l" style={{ fontWeight: 600, fontSize: '11px' }}>적용시점(담보물권 설정 시점)</td>
              <td className="taf-l" style={{ fontWeight: 600, fontSize: '11px' }}>적용금액(원)</td>
            </tr>
            <tr>
              <td>{In('지역구분')}</td>
              <td>{In('적용시점')}</td>
              <td>{In('적용금액')}</td>
            </tr>
          </tbody>
        </table>

        {/* 동의자(임차인) — 2줄 */}
        <table className="taf-tbl" style={{ marginTop: '4px' }}>
          <colgroup><col style={{ width: '18%' }} /><col style={{ width: '16.5%' }} /><col style={{ width: '17.5%' }} /><col style={{ width: '17.5%' }} /><col style={{ width: '30.5%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" rowSpan={3}>동의자<br />(임차인)</td>
              <td className="taf-l" style={{ fontWeight: 600, fontSize: '10.5px' }}>보증금액(원)</td>
              <td className="taf-l" style={{ fontWeight: 600, fontSize: '10.5px' }}>성명</td>
              <td className="taf-l" style={{ fontWeight: 600, fontSize: '10.5px' }}>생년월일</td>
              <td className="taf-l" style={{ fontWeight: 600, fontSize: '10.5px' }}>연락처</td>
            </tr>
            <tr>
              <td>{In('동의1_보증금액')}</td><td>{In('동의1_성명')}</td><td>{In('동의1_생년월일')}</td><td>{In('동의1_연락처')}</td>
            </tr>
            <tr>
              <td>{In('동의2_보증금액')}</td><td>{In('동의2_성명')}</td><td>{In('동의2_생년월일')}</td><td>{In('동의2_연락처')}</td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontSize: '11.5px', margin: '12px 0', lineHeight: 1.6 }}>
          본인은 「민간임대주택에 관한 특별법」 제49조제7항제1호에 따라 위 임대주택의 임대사업자가 임대차계약기간 동안 임대보증금 보증에 가입하지 않는 것에 동의합니다.
        </p>
        <div className="taf-sign">
          <span style={{ whiteSpace: 'nowrap' }}>
            <input value={f.동의_년} onChange={set('동의_년')} className="taf-in taf-num" />년&nbsp;
            <input value={f.동의_월} onChange={set('동의_월')} className="taf-in taf-num" />월&nbsp;
            <input value={f.동의_일} onChange={set('동의_일')} className="taf-in taf-num" />일
          </span>
        </div>
        <div className="taf-sign">
          <span style={{ fontWeight: 700 }}>동의인(임차인)</span>{In('동의인', '', { width: '160px' })}<span style={{ whiteSpace: 'nowrap' }}>(서명 또는 인)</span>
        </div>

        {/* 작성방법 */}
        <div className="taf-gray" style={{ marginTop: '10px' }}>작성방법</div>
        <div style={{ border: '1px solid #333', borderTop: 'none', padding: '6px 8px', fontSize: '10px', lineHeight: 1.6 }}>
          1. “지역구분”란에는 등록임대주택이 소재한 지역명을 적고, “적용시점”란에는 등기사항증명서상 담보물권(근저당 등) 설정 신청 접수일을 적으며, 설정된 담보물권이 없는 경우에는 빈칸으로 둡니다(설정된 담보물권이 여러 건인 경우 가장 오래 전에 설정된 것을 기입하며 말소된 담보물권에 관한 내용은 적지 않습니다).<br />
          <span style={{ paddingLeft: '10px' }}>* 주택임대차보호법 시행령 일부개정령(대통령령 제31673호, 2021. 5. 11. 공포ㆍ시행) 부칙 제2조에 따라 우선변제금 개정규정은 개정규정 시행 당시 존속 중인 임대차계약에 대해서도 적용하되, 개정규정 시행 전에 임차주택에 대하여 담보물권을 취득한 자에 대해서는 종전의 규정에 따름</span><br />
          2. “적용금액”란에는 지역 및 적용시점에 따른 우선변제금액을 적용합니다.<br />
          <span style={{ paddingLeft: '10px' }}>(우선변제금액은 추후 주택임대차보호법령 개정에 따라 변경될 수 있음)</span>
        </div>
      </div>

      {/* ===== 2쪽: 우선변제금표(뒤쪽) ===== */}
      <div className="taf-page">
        <div className="taf-apx">(뒤쪽)</div>
        <table className="taf-tbl" style={{ marginTop: '2px' }}>
          <colgroup><col style={{ width: '18%' }} /><col style={{ width: '82%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-gray" style={{ border: '1px solid #333' }}>적용기간</td>
              <td className="taf-gray" style={{ border: '1px solid #333' }}>우선변제금</td>
            </tr>
            {우선변제.map(([period, lines]) => (
              <tr key={period}>
                <td style={{ fontSize: '10px', verticalAlign: 'middle' }}>{period}</td>
                <td style={{ fontSize: '10px', lineHeight: 1.6 }}>{lines.map((l, i) => <div key={i}>- {l}</div>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: '10px', color: '#333', margin: '3px 0 8px' }}>＊ 수도권 과밀억제권역 : 「수도권정비계획법 시행령」 별표 1에 따른 과밀억제권역 참조</div>

        {/* 유의사항 */}
        <div className="taf-gray">유의사항</div>
        <div style={{ border: '1px solid #333', borderTop: 'none', padding: '6px 8px', fontSize: '10px', lineHeight: 1.6 }}>
          1. 「주택임대차보호법」 제8조제3항에 따라 우선변제금액은 주택가액의 2분의1을 넘지 못하는 점을 유의하시기 바랍니다.
          <div style={{ border: '1px dashed #333', padding: '5px 8px', margin: '5px 0' }}>
            &lt;사례&gt;<br />
            ○ (가정) A 다가구주택에 보증금이 각 1천만원인 10개 가구 존재[보증금 총액은 1억원(=1천만원×10가구)]<br />
            ○ (보정금액) A 다가구주택이 경매에서 1억원에 낙찰되었을 경우 각 가구는 5백만원만 배당 받음(낙찰금액 1억원의 2분의 1까지만 우선변제금 충당 가능)
          </div>
          2. 임차인은 「주택임대차보호법」 제3조제1항에 따른 주택의 인도(引渡)와 주민등록을 마쳐야 우선변제를 받을 수 있습니다.<br />
          3. 법인인 임차인의 경우 「주택임대차보호법」 제3조 및 제8조와 같은 법 시행령 제2조에 따라 「한국토지주택공사법」에 따른 한국토지주택공사(LH), 「지방공기업법」 제49조에 따라 주택사업을 목적으로 설립된 지방공사와 「중소기업기본법」 제2조에 따른 중소기업으로서 「주택임대차보호법」 제3조에 따른 조치 등을 한 경우에만 우선변제금을 받을 수 있습니다.
        </div>
        <div style={{ textAlign: 'right', fontSize: '10px', color: '#333', marginTop: '8px' }}>210mm×297mm[백상지(80g/㎡) 또는 중질지(80g/㎡)]</div>
      </div>
    </div>
  );
}
