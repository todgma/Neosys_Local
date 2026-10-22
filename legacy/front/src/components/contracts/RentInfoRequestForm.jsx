import { useState } from 'react';
import { X, Printer } from 'lucide-react';

/**
 * 임대차 정보제공 요청서 (주택임대차계약증서상의 확정일자 부여 및 임대차 정보제공에 관한 규칙 [별지 제3호서식], 개정 2020. 9. 29.)
 *  - 2쪽(앞쪽 요청서 / 뒤쪽 위임장·비고·첨부서류·유의사항). 신청인 작성칸만 입력. 새 창 렌더 → 인쇄(window.print). 저장 백엔드는 추후.
 */
const BLANK = {
  요청인구분: '이해', // 이해 | 계약
  이해사유: '',
  요청인_성명: '', 요청인_등록번호: '', 요청인_주소: '', 요청인_휴대: '', 요청인_주소지전화: '',
  목적물: '', 요청기간: '',
  정보_일반: true, 정보_특정: false, 특정_임차인: '', 정보_임대임차: false, 임대임차_임차인: '', 정보_갱신거절: false,
  열람: true, 출력물: '',
  신청_년: '', 신청_월: '', 신청_일: '', 신청인_성명: '', 신청인_주민번호: '',
  위임_년: '', 위임_월: '', 위임_일: '', 위임자: '',
  수임_성명: '', 수임_주민번호: '', 수임_관계: '', 수임_전화: '',
};

export default function RentInfoRequestForm({ onClose, initial = null, onSave = null }) {
  const [f, setF] = useState(initial && typeof initial === 'object' ? { ...BLANK, ...initial } : BLANK);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const tog = (k) => setF((p) => ({ ...p, [k]: !p[k] }));
  const In = (k, ph, style) => <input value={f[k] ?? ''} onChange={set(k)} placeholder={ph || ''} className="taf-in" style={style} />;
  const Ck = (k, label) => <span className="taf-chk" onClick={() => tog(k)}>[ {f[k] ? '√' : ' '} ] {label}</span>;

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
        .taf-title { text-align: center; font-size: 19px; font-weight: 800; letter-spacing: 1px; margin: 4px 0 8px; }
        .taf-chk { font-weight: 700; cursor: pointer; white-space: nowrap; }
        .taf-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .taf-tbl td { border: 1px solid #333; padding: 3px 5px; vertical-align: top; }
        .taf-l { text-align: center; font-weight: 700; background: #fff; vertical-align: middle; }
        .taf-lab { font-size: 10.5px; color: #333; display: block; margin-bottom: 2px; }
        .taf-dark { background: #cfcfcf; text-align: center; font-weight: 700; }
        .taf-in { width: 100%; border: none; background: #eaf7ef; padding: 3px 4px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
        .taf-in.taf-inl { display: inline-block; width: 130px; }
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
        <h2>임대차 정보제공 요청서</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onSave && <button className="taf-btn" style={{ background: '#059669', borderColor: '#059669', color: 'white' }} onClick={async () => { const ok = await onSave(f); if (ok) onClose?.(); }}>저장</button>}
          <button className="taf-btn primary" onClick={() => window.print()}><Printer className="w-4 h-4" /> 인쇄 / 미리보기</button>
          {onClose && <button className="taf-btn" onClick={onClose}><X className="w-4 h-4" /> 닫기</button>}
        </div>
      </div>

      {/* ===== 1쪽: 요청서(앞쪽) ===== */}
      <div className="taf-page">
        <div className="taf-code">■ 주택임대차계약증서상의 확정일자 부여 및 임대차 정보제공에 관한 규칙[별지 제3호서식] &lt;개정 2020. 9. 29.&gt;</div>
        <div className="taf-title">임대차 정보제공 요청서</div>
        <div className="taf-apx">(앞쪽)</div>

        {/* 접수 (어두운 칸) */}
        <table className="taf-tbl" style={{ marginBottom: '4px' }}>
          <tbody><tr style={{ height: '24px' }}>
            <td className="taf-dark" style={{ width: '18%' }}>접수번호</td>
            <td className="taf-dark" style={{ width: '22%' }}>접수일자</td>
            <td className="taf-dark" style={{ width: '30%' }}>발급일</td>
            <td className="taf-dark" style={{ width: '18%' }}>처리기간</td>
            <td className="taf-dark" style={{ width: '12%' }}>즉시</td>
          </tr></tbody>
        </table>

        {/* 요청인 */}
        <table className="taf-tbl">
          <colgroup><col style={{ width: '13%' }} /><col style={{ width: '47%' }} /><col style={{ width: '40%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" rowSpan={3}>요청인</td>
              <td><span className="taf-lab">성명(법인명)</span>{In('요청인_성명')}</td>
              <td><span className="taf-lab">주민등록번호(법인등록번호)</span>{In('요청인_등록번호')}</td>
            </tr>
            <tr>
              <td><span className="taf-lab">주소(본점 소재지)</span>{In('요청인_주소')}</td>
              <td>
                <span className="taf-lab">휴대전화번호</span>{In('요청인_휴대')}
                <span className="taf-lab" style={{ marginTop: '3px' }}>주소지 전화번호</span>{In('요청인_주소지전화')}
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ fontSize: '11px', lineHeight: 1.7 }}>
                <div><span className="taf-chk" onClick={() => setF((p) => ({ ...p, 요청인구분: '이해' }))}>[ {f.요청인구분 === '이해' ? '√' : ' '} ] 이해관계인</span>(해당사유: {In('이해사유', '', { display: 'inline-block', width: '60px' })} )</div>
                <div style={{ paddingLeft: '16px' }}>1. 해당 주택의 임대인ㆍ임차인</div>
                <div style={{ paddingLeft: '16px' }}>2. 해당 주택의 소유자</div>
                <div style={{ paddingLeft: '16px' }}>3. 해당 주택 또는 그 대지의 등기기록에 기록된 권리자</div>
                <div style={{ paddingLeft: '16px' }}>4. 「주택임대차보호법」 제3조의2제7항에 따라 우선변제권을 승계한 금융기관</div>
                <div style={{ paddingLeft: '16px' }}>5. 「주택임대차보호법」 제6조의3제1항제8호의 사유로 계약의 갱신이 거절된 임대차계약의 임차인이었던 자</div>
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
              <td className="taf-l" rowSpan={5}>요청내용</td>
              <td colSpan={2}><span className="taf-lab">주택소재지ㆍ임대차목적물(건물명, 동, 열, 층, 호수까지 구체적으로 기재합니다)</span>{In('목적물')}</td>
            </tr>
            <tr>
              <td className="taf-l">요청기간</td>
              <td>{In('요청기간', '        년      월      일  ~        년      월      일')}</td>
            </tr>
            <tr><td colSpan={2} className="taf-l">요청정보</td></tr>
            <tr>
              <td colSpan={2} style={{ fontSize: '11px', lineHeight: 1.9 }}>
                <div>{Ck('정보_일반', '확정일자 부여현황(일반)')}</div>
                <div>{Ck('정보_특정', '확정일자 부여현황(임차인 특정)')} &nbsp;(임차인 성명: {In('특정_임차인', '', { display: 'inline-block', width: '110px' })})</div>
                <div>{Ck('정보_임대임차', '확정일자 부여현황(임대인ㆍ임차인용)')} &nbsp;(임차인 성명: {In('임대임차_임차인', '', { display: 'inline-block', width: '110px' })})</div>
                <div>{Ck('정보_갱신거절', '확정일자 부여현황(계약 갱신이 거절된 임대차계약의 임차인용)')}</div>
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ fontSize: '11px' }}>
                구분 &nbsp;&nbsp;
                <span className="taf-chk" onClick={() => tog('열람')}>1. 열람 ( {f.열람 ? '√' : ' '} )</span> &nbsp;&nbsp;&nbsp;
                2. 출력물 교부 ( {In('출력물', '', { display: 'inline-block', width: '60px' })} )
              </td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontSize: '11.5px', margin: '10px 0 4px' }}>「주택임대차보호법」 제3조의6에 따라 위 주택의 임대차 정보제공을 요청합니다.</p>
        <div className="taf-sign">
          <span style={{ whiteSpace: 'nowrap' }}>
            <input value={f.신청_년} onChange={set('신청_년')} className="taf-in" style={{ display: 'inline-block', width: '44px', textAlign: 'center' }} />년&nbsp;
            <input value={f.신청_월} onChange={set('신청_월')} className="taf-in" style={{ display: 'inline-block', width: '40px', textAlign: 'center' }} />월&nbsp;
            <input value={f.신청_일} onChange={set('신청_일')} className="taf-in" style={{ display: 'inline-block', width: '40px', textAlign: 'center' }} />일
          </span>
        </div>
        <div className="taf-sign" style={{ justifyContent: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ fontWeight: 700 }}>신청인 성명:</span>{In('신청인_성명', '', { width: '130px' })}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ fontWeight: 700 }}>주민등록번호:</span>{In('신청인_주민번호', '', { width: '150px' })}</span>
          <span style={{ whiteSpace: 'nowrap', marginLeft: 'auto' }}>(서명 또는 인)</span>
        </div>
        <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '8px' }}>읍ㆍ면ㆍ동장 또는 시ㆍ군ㆍ구 출장소의 장 / 공증인 ΟΟΟ&nbsp;&nbsp;&nbsp;<span style={{ fontSize: '13px', fontWeight: 500 }}>귀하</span></div>
        <div style={{ textAlign: 'right', fontSize: '10px', color: '#333', marginTop: '10px' }}>210mm×297mm[백상지 80g/㎡]</div>
      </div>

      {/* ===== 2쪽: 위임장·비고·첨부서류·유의사항(뒤쪽) ===== */}
      <div className="taf-page">
        <div className="taf-apx">(뒤쪽)</div>
        <p style={{ fontSize: '11.5px', margin: '6px 0', lineHeight: 1.6 }}>
          신청인은 아래 위임받은 자에게 「주택임대차보호법」 제3조의6에 따른 임대차 정보제공 요청 및 출력물 수령에 관한 일체의 권리와 의무를 위임합니다.
        </p>
        <div className="taf-sign">
          <span style={{ whiteSpace: 'nowrap' }}>
            <input value={f.위임_년} onChange={set('위임_년')} className="taf-in" style={{ display: 'inline-block', width: '44px', textAlign: 'center' }} />년&nbsp;
            <input value={f.위임_월} onChange={set('위임_월')} className="taf-in" style={{ display: 'inline-block', width: '40px', textAlign: 'center' }} />월&nbsp;
            <input value={f.위임_일} onChange={set('위임_일')} className="taf-in" style={{ display: 'inline-block', width: '40px', textAlign: 'center' }} />일
          </span>
        </div>
        <div className="taf-sign"><span style={{ fontWeight: 700 }}>위임자</span>{In('위임자', '', { width: '160px' })}<span style={{ whiteSpace: 'nowrap' }}>(서명 또는 인)</span></div>

        {/* 위임받은 자 */}
        <table className="taf-tbl" style={{ marginTop: '4px' }}>
          <colgroup><col style={{ width: '15%' }} /><col style={{ width: '35%' }} /><col style={{ width: '50%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" rowSpan={2}>위임<br />받은 자</td>
              <td><span className="taf-lab">성명</span>{In('수임_성명')}</td>
              <td><span className="taf-lab">주민등록번호</span>{In('수임_주민번호')}</td>
            </tr>
            <tr>
              <td><span className="taf-lab">신청인과의 관계</span>{In('수임_관계')}</td>
              <td><span className="taf-lab">전화번호</span>{In('수임_전화')}</td>
            </tr>
          </tbody>
        </table>

        {/* 비고 */}
        <div className="taf-gray" style={{ marginTop: '8px' }}>비고</div>
        <div style={{ border: '1px solid #333', borderTop: 'none', padding: '6px 8px', fontSize: '10px', lineHeight: 1.6 }}>
          1. "확정일자 부여현황"이란 임대차목적물, 임대인ㆍ임차인의 인적사항(요청인에 따라 요청할 수 있는 범위가 다릅니다), 확정일자 부여일, 차임ㆍ보증금 및 임대차기간을 말합니다.<br />
          2. "확정일자 부여현황(임차인 특정)"은 특정한 임차인의 확정일자 부여현황을 요청하는 것으로서, 반드시 임차인 성명을 적어야 합니다.<br />
          3. "확정일자 부여현황(임대인ㆍ임차인용)"은 임대인ㆍ임차인의 인적사항을 포함한 확정일자 부여현황을 요청하는 것으로서, 임대차계약서상의 계약당사자(임대인ㆍ임차인)만 요청할 수 있으며, 반드시 임차인 성명을 적어야 합니다.<br />
          4. "확정일자 부여현황(계약 갱신이 거절된 임대차계약의 임차인용)"은 「주택임대차보호법」 제6조의3제1항제8호의 사유로 계약의 갱신이 거절된 임대차계약의 임차인이었던 자가 그 갱신요구가 거절되지 않았더라면 갱신되었을 기간 중 해당 주택에 존속하는 임대차계약의 확정일자 부여현황을 요청하는 것으로서, 인적사항은 임대인ㆍ임차인의 성명, 법인명 또는 단체명만 요청할 수 있습니다.
        </div>

        {/* 첨부서류 */}
        <div className="taf-gray" style={{ marginTop: '8px' }}>첨부서류</div>
        <table className="taf-tbl" style={{ borderTop: 'none' }}>
          <colgroup><col style={{ width: '15%' }} /><col style={{ width: '73%' }} /><col style={{ width: '12%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" style={{ fontSize: '11px' }}>신청인의 신분증<br />제출서류</td>
              <td className="taf-note">
                1. 신청인의 신분을 확인할 수 있는 서류 1부(주민등록증 등 신분증의 제시로 갈음할 수 있습니다)<br />
                2. 요청인의 대리인이 요청하는 경우에는 대리인의 신분을 확인할 수 있는 서류 1부(주민등록증 등 신분증의 제시로 갈음할 수 있습니다)<br />
                3. 이해관계인임을 입증할 수 있는 서류
              </td>
              <td className="taf-l" rowSpan={3} style={{ fontSize: '11px' }}>수수료<br /><br />600원</td>
            </tr>
            <tr>
              <td className="taf-l" style={{ fontSize: '11px' }}>이해관계인</td>
              <td className="taf-note">
                1. 임대인 또는 임차인의 경우 임대차계약증서 등 해당 주택의 계약당사자임을 증명하는 서류<br />
                2. 주택 소유자의 경우 등기사항증명서 등 소유자임을 증명하는 서류<br />
                3. 해당 주택 또는 그 대지의 등기기록에 기재된 권리자의 경우 등기사항증명서 등 권리자임을 증명하는 서류<br />
                4. 우선변제권을 승계한 금융기관의 경우 채권양도증서 등 우선변제권을 승계하였음을 증명하는 서류<br />
                5. 「주택임대차보호법」 제6조의3제1항제8호의 사유로 계약의 갱신이 거절된 임대차계약의 임차인이었던 자의 경우 임대차계약증서 등 해당 주택의 임차인이었던 자임을 증명하는 서류
              </td>
            </tr>
            <tr>
              <td className="taf-l" style={{ fontSize: '11px' }}>임대차계약을<br />체결하려는 자</td>
              <td className="taf-note">
                1. 임대인의 동의서<br />
                2. 인감증명서, 본인서명사실 확인서 또는 신분증명서 사본
              </td>
            </tr>
          </tbody>
        </table>

        {/* 유의사항 */}
        <div className="taf-gray" style={{ marginTop: '8px' }}>유의사항</div>
        <div style={{ border: '1px solid #333', borderTop: 'none', padding: '6px 8px', fontSize: '10px', lineHeight: 1.6 }}>
          임대차 정보제공은 「주택임대차보호법」 제3조의6에 따라 신청자가 임대차계약을 체결하고자 하는 자로서 임대인의 동의를 받은 경우이거나 이해관계인인 경우에만 허용됩니다.
        </div>
      </div>
    </div>
  );
}
