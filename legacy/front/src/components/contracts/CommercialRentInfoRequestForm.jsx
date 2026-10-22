import { useState } from 'react';
import { X, Printer } from 'lucide-react';

/**
 * (상가건물) 임대차 정보제공 요청서 (상가건물 임대차계약서상의 확정일자 부여 및 임대차 정보제공에 관한 규칙 [별지 제4호서식], 개정 2026. 6. 10.)
 *  - 2쪽(앞쪽 요청서 / 뒤쪽 위임·임대인동의·비고·첨부서류·유의사항). 신청인 작성칸만 입력. 새 창 렌더 → 인쇄(window.print). 저장 백엔드는 추후.
 */
const BLANK = {
  요청인구분: '이해', 이해사유: '',
  요청인_성명: '', 요청인_등록번호: '', 요청인_사업자번호: '', 요청인_주소: '', 요청인_휴대: '', 요청인_주소지전화: '', 요청인_사업장전화: '',
  목적물: '', 특정표지: '', 요청기간: '',
  정보_일반: true, 정보_특정: false, 특정_임차인: '', 정보_임대임차: false, 임대임차_임차인: '',
  열람: true, 출력물: '',
  세무서명: '', 요청인성명하단: '',
  위임_년: '', 위임_월: '', 위임_일: '', 위임자: '',
  수임_성명: '', 수임_주민번호: '', 수임_관계: '', 수임_전화: '',
  동의_년: '', 동의_월: '', 동의_일: '', 임대인동의서명: '',
  임대인_성명: '', 임대인_등록번호: '', 임대인_전화: '',
  계약자_성명: '', 계약자_등록번호: '', 계약자_전화: '',
};

export default function CommercialRentInfoRequestForm({ onClose, initial = null, onSave = null }) {
  const [f, setF] = useState(initial && typeof initial === 'object' ? { ...BLANK, ...initial } : BLANK);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const tog = (k) => setF((p) => ({ ...p, [k]: !p[k] }));
  const In = (k, ph, style) => <input value={f[k] ?? ''} onChange={set(k)} placeholder={ph || ''} className="taf-in" style={style} />;
  const Ck = (k, label) => <span className="taf-chk" onClick={() => tog(k)}>[ {f[k] ? '√' : ' '} ] {label}</span>;
  const Ymd = (yk, mk, dk) => (
    <span style={{ whiteSpace: 'nowrap' }}>
      <input value={f[yk] ?? ''} onChange={set(yk)} className="taf-in" style={{ display: 'inline-block', width: '44px', textAlign: 'center' }} />년&nbsp;
      <input value={f[mk] ?? ''} onChange={set(mk)} className="taf-in" style={{ display: 'inline-block', width: '40px', textAlign: 'center' }} />월&nbsp;
      <input value={f[dk] ?? ''} onChange={set(dk)} className="taf-in" style={{ display: 'inline-block', width: '40px', textAlign: 'center' }} />일
    </span>
  );

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
        .taf-title { text-align: center; font-size: 19px; font-weight: 800; letter-spacing: 1px; margin: 4px 0 2px; }
        .taf-note0 { font-size: 10.5px; color: #222; margin-bottom: 6px; }
        .taf-chk { font-weight: 700; cursor: pointer; white-space: nowrap; }
        .taf-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .taf-tbl td { border: 1px solid #333; padding: 3px 5px; vertical-align: top; }
        .taf-l { text-align: center; font-weight: 700; background: #fff; vertical-align: middle; }
        .taf-lab { font-size: 10.5px; color: #333; display: block; margin-bottom: 2px; }
        .taf-hint { font-size: 10px; color: #111827; display: block; margin: 1px 0 2px; }
        .taf-dark { background: #cfcfcf; text-align: center; font-weight: 700; }
        .taf-in { width: 100%; border: none; background: #eaf7ef; padding: 3px 4px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
        .taf-gray { background: #cfcfcf; text-align: center; font-weight: 800; font-size: 12.5px; padding: 4px 0; border: 1px solid #333; }
        .taf-sign { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin: 6px 0; }
        .taf-note { font-size: 10px; line-height: 1.6; }
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
        <h2>임대차 정보제공 요청서 (상가건물)</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onSave && <button className="taf-btn" style={{ background: '#059669', borderColor: '#059669', color: 'white' }} onClick={async () => { const ok = await onSave(f); if (ok) onClose?.(); }}>저장</button>}
          <button className="taf-btn primary" onClick={() => window.print()}><Printer className="w-4 h-4" /> 인쇄 / 미리보기</button>
          {onClose && <button className="taf-btn" onClick={onClose}><X className="w-4 h-4" /> 닫기</button>}
        </div>
      </div>

      {/* ===== 1쪽: 요청서(앞쪽) ===== */}
      <div className="taf-page">
        <div className="taf-code">■ 상가건물 임대차계약서상의 확정일자 부여 및 임대차 정보제공에 관한 규칙 [별지 제4호서식] &lt;개정 2026. 6. 10.&gt;</div>
        <div className="taf-title">임대차 정보제공 요청서</div>
        <div className="taf-note0">※ 색상이 어두운 난은 요청인이 적지 않습니다.</div>
        <div className="taf-apx">(앞쪽)</div>

        {/* 접수 (어두운 칸) */}
        <table className="taf-tbl" style={{ marginBottom: '4px' }}>
          <tbody><tr style={{ height: '24px' }}>
            <td className="taf-dark" style={{ width: '16%' }}>접수번호</td>
            <td className="taf-dark" style={{ width: '22%' }}>접수일자</td>
            <td className="taf-dark" style={{ width: '30%' }}>발급일</td>
            <td className="taf-dark" style={{ width: '20%' }}>처리기간</td>
            <td className="taf-dark" style={{ width: '12%' }}>즉시</td>
          </tr></tbody>
        </table>

        {/* 요청인 */}
        <table className="taf-tbl">
          <colgroup><col style={{ width: '13%' }} /><col style={{ width: '29%' }} /><col style={{ width: '29%' }} /><col style={{ width: '29%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" rowSpan={3}>요청인</td>
              <td><span className="taf-lab">성명(법인명)</span>{In('요청인_성명')}</td>
              <td><span className="taf-lab">주민(법인)등록번호</span>{In('요청인_등록번호')}</td>
              <td><span className="taf-lab">사업자등록번호</span>{In('요청인_사업자번호')}</td>
            </tr>
            <tr>
              <td colSpan={2}><span className="taf-lab">주소 또는 본점(주사무소) 소재지</span>{In('요청인_주소')}</td>
              <td>
                <span className="taf-lab">휴대전화번호</span>{In('요청인_휴대')}
                <span className="taf-lab" style={{ marginTop: '2px' }}>주소지 전화번호</span>{In('요청인_주소지전화')}
                <span className="taf-lab" style={{ marginTop: '2px' }}>사업장 전화번호</span>{In('요청인_사업장전화')}
              </td>
            </tr>
            <tr>
              <td colSpan={3} style={{ fontSize: '11px', lineHeight: 1.7 }}>
                <div><span className="taf-chk" onClick={() => setF((p) => ({ ...p, 요청인구분: '이해' }))}>[ {f.요청인구분 === '이해' ? '√' : ' '} ] 이해관계인</span>(해당사유: {In('이해사유', '', { display: 'inline-block', width: '60px' })} )</div>
                <div style={{ paddingLeft: '16px' }}>1. 해당 상가건물 임대차계약의 임대인ㆍ임차인</div>
                <div style={{ paddingLeft: '16px' }}>2. 해당 상가건물의 소유자</div>
                <div style={{ paddingLeft: '16px' }}>3. 해당 상가건물 또는 그 대지의 등기부에 기록된 권리자</div>
                <div style={{ paddingLeft: '16px' }}>4. 「상가건물 임대차보호법」 제5조제7항에 따라 우선변제권을 승계한 금융기관</div>
                <div style={{ paddingLeft: '16px' }}>5. 임대차 정보의 제공에 관하여 법원의 판결을 받은 자</div>
                <div style={{ marginTop: '4px' }}><span className="taf-chk" onClick={() => setF((p) => ({ ...p, 요청인구분: '계약' }))}>[ {f.요청인구분 === '계약' ? '√' : ' '} ] 임대차계약을 체결하려는 자</span></div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* 요청내용 */}
        <table className="taf-tbl" style={{ marginTop: '4px' }}>
          <colgroup><col style={{ width: '13%' }} /><col style={{ width: '30%' }} /><col style={{ width: '57%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" rowSpan={6}>요청내용</td>
              <td colSpan={2}>
                <span className="taf-lab">상가건물 소재지(임대차 목적물)</span>
                <span className="taf-hint">상가건물명, 동, 층, 호수 등 임대차계약의 대상이 되는 상가의 범위를 구체적으로 적습니다.</span>
                {In('목적물')}
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <span className="taf-lab">상가건물 중 해당 임대차 대상 부분을 특정할 수 있는 표지</span>
                <span className="taf-hint">'출입문에서 오른쪽 ○m²' 등 임대차 대상을 특정할 수 있도록 구체적으로 적습니다.</span>
                {In('특정표지')}
              </td>
            </tr>
            <tr>
              <td className="taf-l">요청기간</td>
              <td>{In('요청기간', '        년      월      일  ~        년      월      일')}</td>
            </tr>
            <tr><td colSpan={2} className="taf-l">요청정보</td></tr>
            <tr>
              <td colSpan={2} style={{ fontSize: '11px', lineHeight: 1.9 }}>
                <div>{Ck('정보_일반', '확정일자 부여현황(일반)')}</div>
                <div>{Ck('정보_특정', '확정일자 부여현황(임차인 특정)')} &nbsp;(임차인 성명(법인명): {In('특정_임차인', '', { display: 'inline-block', width: '120px' })})</div>
                <div>{Ck('정보_임대임차', '확정일자 부여현황(임대인ㆍ임차인)')} &nbsp;(임차인 성명(법인명): {In('임대임차_임차인', '', { display: 'inline-block', width: '120px' })})</div>
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ fontSize: '11px' }}>
                <span style={{ fontWeight: 700 }}>제공방법</span> &nbsp;&nbsp;
                <span className="taf-chk" onClick={() => tog('열람')}>1. 열람 ( {f.열람 ? '√' : ' '} )</span> &nbsp;&nbsp;&nbsp;
                2. 출력물 교부 ( {In('출력물', '', { display: 'inline-block', width: '60px' })} )
              </td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontSize: '11.5px', margin: '10px 0 4px' }}>「상가건물 임대차보호법」 제4조에 따라 위 상가건물 임대차에 대한 정보제공을 요청합니다.</p>
        <div className="taf-sign">{Ymd('신청_년', '신청_월', '신청_일')}</div>
        <div className="taf-sign">
          <span style={{ fontWeight: 700 }}>요청인 성명(법인명)</span>{In('요청인성명하단', '', { width: '150px' })}<span style={{ whiteSpace: 'nowrap' }}>(서명 또는 인)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
          {In('세무서명', '', { width: '120px' })}<span style={{ fontSize: '14px', fontWeight: 800 }}>세무서의 장</span><span style={{ fontSize: '13px', fontWeight: 500 }}>귀하</span>
        </div>
        <div style={{ textAlign: 'right', fontSize: '10px', color: '#333', marginTop: '10px' }}>210mm×297mm[백상지 80g/㎡]</div>
      </div>

      {/* ===== 2쪽: 위임·임대인동의·비고·첨부서류·유의사항(뒤쪽) ===== */}
      <div className="taf-page">
        <div className="taf-apx">(뒤쪽)</div>

        {/* 위임 */}
        <div style={{ fontSize: '10.5px', color: '#555', margin: '2px 0' }}>다음 난은 대리인에게 임대차 정보제공 요청을 위임하는 경우 적습니다.</div>
        <p style={{ fontSize: '11.5px', margin: '4px 0', lineHeight: 1.6 }}>요청인은 다음 위임받은 자에게 「상가건물 임대차보호법」 제4조에 따른 임대차 정보제공 요청 및 열람, 출력물 수령에 관한 일체의 권리와 의무를 위임합니다.</p>
        <div className="taf-sign">{Ymd('위임_년', '위임_월', '위임_일')}</div>
        <div className="taf-sign"><span style={{ fontWeight: 700 }}>요청인(위임자)</span>{In('위임자', '', { width: '160px' })}<span style={{ whiteSpace: 'nowrap' }}>(서명 또는 인)</span></div>
        <table className="taf-tbl" style={{ marginTop: '2px' }}>
          <colgroup><col style={{ width: '15%' }} /><col style={{ width: '35%' }} /><col style={{ width: '50%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" rowSpan={2}>위임<br />받은 자</td>
              <td><span className="taf-lab">성명</span>{In('수임_성명')}</td>
              <td><span className="taf-lab">주민등록번호</span>{In('수임_주민번호')}</td>
            </tr>
            <tr>
              <td><span className="taf-lab">요청인과의 관계</span>{In('수임_관계')}</td>
              <td><span className="taf-lab">전화번호</span>{In('수임_전화')}</td>
            </tr>
          </tbody>
        </table>

        {/* 임대인 동의 */}
        <div style={{ fontSize: '10.5px', color: '#555', margin: '10px 0 2px' }}>다음 난은 '임대차계약을 체결하려는 자'가 임대차 정보제공을 요청할 경우 임대인이 동의해 주었음을 확인하는 난입니다(별도 서식으로도 가능합니다).</div>
        <p style={{ fontSize: '11.5px', margin: '4px 0', lineHeight: 1.6 }}>임대인은 다음 임대차계약을 체결하려는 자의 「상가건물 임대차보호법」 제4조에 따른 임대차 정보제공 요청 및 열람, 출력물 수령에 관하여 동의합니다.</p>
        <div className="taf-sign">{Ymd('동의_년', '동의_월', '동의_일')}</div>
        <div className="taf-sign"><span style={{ fontWeight: 700 }}>임대인</span>{In('임대인동의서명', '', { width: '160px' })}<span style={{ whiteSpace: 'nowrap' }}>(서명 또는 인)</span></div>
        <table className="taf-tbl" style={{ marginTop: '2px' }}>
          <colgroup><col style={{ width: '19%' }} /><col style={{ width: '39%' }} /><col style={{ width: '42%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" rowSpan={2}>임대인</td>
              <td><span className="taf-lab">성명(법인명)</span>{In('임대인_성명')}</td>
              <td><span className="taf-lab">주민(법인)등록번호</span>{In('임대인_등록번호')}</td>
            </tr>
            <tr>
              <td colSpan={2}><span className="taf-lab">전화번호</span>{In('임대인_전화')}</td>
            </tr>
            <tr>
              <td className="taf-l" rowSpan={2}>임대차계약을<br />체결하려는 자</td>
              <td><span className="taf-lab">성명(법인명)</span>{In('계약자_성명')}</td>
              <td><span className="taf-lab">주민(법인)등록번호</span>{In('계약자_등록번호')}</td>
            </tr>
            <tr>
              <td colSpan={2}><span className="taf-lab">전화번호</span>{In('계약자_전화')}</td>
            </tr>
          </tbody>
        </table>

        {/* 비고 */}
        <div className="taf-gray" style={{ marginTop: '8px' }}>비고</div>
        <div style={{ border: '1px solid #333', borderTop: 'none', padding: '6px 8px', fontSize: '10px', lineHeight: 1.6 }}>
          1. "확정일자 부여현황"이란 임대차 목적물, 임대인ㆍ임차인의 인적사항(요청인에 따라 요청할 수 있는 범위가 다릅니다), 확정일자 부여일, 차임ㆍ보증금 및 임대차기간을 말합니다.<br />
          2. "확정일자 부여현황(일반)"이란 이해관계인 또는 임대차계약을 체결하려는 자가 임대인ㆍ임차인의 인적사항을 제외한 확정일자 부여현황을 요청하는 것을 말합니다.<br />
          3. "확정일자 부여현황(임차인 특정)"이란 특정한 임차인의 확정일자 부여현황을 요청하는 것으로서, 반드시 임차인 성명을 적어야 합니다.<br />
          4. "확정일자 부여현황(임대인ㆍ임차인)"은 임대인ㆍ임차인의 인적사항을 포함한 확정일자 부여현황을 요청하는 것으로서, 임대차계약서상의 계약당사자(임대인ㆍ임차인)만 요청할 수 있으며, 반드시 임차인 성명을 적어야 합니다.
        </div>

        {/* 첨부서류 */}
        <div className="taf-gray" style={{ marginTop: '8px' }}>첨부서류</div>
        <div style={{ border: '1px solid #333', borderTop: 'none', padding: '6px 8px', fontSize: '10px', lineHeight: 1.6 }}>
          1. 주민등록증, 운전면허증, 여권 또는 외국인등록증 등 요청인(대리인 포함)의 신분을 확인할 수 있는 서류<br />
          2. 이해관계인임을 증명할 수 있는 서류<br />
          3. 임대차계약을 체결하려는 자의 경우 임대인의 동의서 및 임대인의 신분을 확인할 수 있는 신분증 사본 등
        </div>

        {/* 유의사항 */}
        <div className="taf-gray" style={{ marginTop: '8px' }}>유의사항</div>
        <div style={{ border: '1px solid #333', borderTop: 'none', padding: '6px 8px', fontSize: '10px', lineHeight: 1.6 }}>
          1. 임대차 정보제공은 「상가건물 임대차보호법」 제4조에 따라 요청인이 이해관계인이거나 임대인의 동의를 받은 임대차계약을 체결하려는 자만 허용됩니다.<br />
          2. 관할 세무서가 아닌 세무서에 임대차 정보제공 요청서를 제출하더라도 관할 세무서의 장으로부터 임대차정보를 제공받을 수 있습니다.<br />
          3. 정보제공 요청은 「상가건물 임대차보호법」 제2조제1항 단서에 따른 보증금액을 초과하지 않는 임대차의 경우에 가능합니다.
        </div>
      </div>
    </div>
  );
}
