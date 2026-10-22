import { useState } from 'react';
import { X, Printer } from 'lucide-react';

/**
 * 전입세대확인서 열람 또는 교부 신청서 (주민등록법 시행규칙 [별지 제15호서식], 개정 2023. 12. 22.) — 2쪽(앞쪽 신청서 / 뒤쪽 위임장·유의사항)
 *  - 신청인 작성칸만 입력. 새 창 렌더 → 인쇄(window.print). 저장 백엔드는 추후.
 */
const BLANK = {
  신청_열람: true, 신청_교부: false,
  개인_성명: '', 개인_주민번호: '', 개인_주소: '', 개인_연락처: '',
  법인_명칭: '', 법인_사업자번호: '', 법인_대표자: '', 법인_연락처: '', 법인_소재지: '',
  방문자_성명: '', 방문자_주민번호: '', 방문자_연락처: '',
  대상소재지: '', 말소표시: '표시안됨', 용도목적: '',
  신청_년: '', 신청_월: '', 신청_일: '', 동의신청인: '',
  위임_년: '', 위임_월: '', 위임_일: '',
  위임개인_성명: '', 위임개인_주민번호: '', 위임개인_주소: '', 위임개인_연락처: '',
  위임법인_명칭: '', 위임법인_사업자번호: '', 위임법인_대표자: '', 위임법인_연락처: '', 위임법인_소재지: '',
};

export default function ResidentTransferConfirmForm({ onClose, initial = null, onSave = null }) {
  const [f, setF] = useState(initial && typeof initial === 'object' ? { ...BLANK, ...initial } : BLANK);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const tog = (k) => setF((p) => ({ ...p, [k]: !p[k] }));
  const In = (k, ph, style) => <input value={f[k] ?? ''} onChange={set(k)} placeholder={ph || ''} className="taf-in" style={style} />;
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
        .taf-code { font-size: 10.5px; color: #222; }
        .taf-apx { text-align: right; font-size: 10.5px; color: #222; }
        .taf-title { text-align: center; font-size: 19px; font-weight: 800; letter-spacing: 1px; margin: 4px 0 6px; }
        .taf-note0 { font-size: 10.5px; color: #222; margin-bottom: 6px; }
        .taf-chk { font-weight: 700; cursor: pointer; white-space: nowrap; }
        .taf-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .taf-tbl td { border: 1px solid #333; padding: 3px 5px; vertical-align: top; }
        .taf-l { text-align: center; font-weight: 700; background: #fff; vertical-align: middle; }
        .taf-lab { font-size: 10.5px; color: #333; display: block; margin-bottom: 2px; }
        .taf-dark { background: #cfcfcf; text-align: center; font-weight: 700; }
        .taf-in { width: 100%; border: none; background: #eaf7ef; padding: 3px 4px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
        .taf-gray { background: #cfcfcf; text-align: center; font-weight: 800; font-size: 12.5px; padding: 4px 0; border: 1px solid #333; }
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
        <h2>전입세대확인서 열람 또는 교부 신청서</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onSave && <button className="taf-btn" style={{ background: '#059669', borderColor: '#059669', color: 'white' }} onClick={async () => { const ok = await onSave(f); if (ok) onClose?.(); }}>저장</button>}
          <button className="taf-btn primary" onClick={() => window.print()}><Printer className="w-4 h-4" /> 인쇄 / 미리보기</button>
          {onClose && <button className="taf-btn" onClick={onClose}><X className="w-4 h-4" /> 닫기</button>}
        </div>
      </div>

      {/* ===== 1쪽: 신청서(앞쪽) ===== */}
      <div className="taf-page">
        <div className="taf-code">■ 주민등록법 시행규칙 [별지 제15호서식] &lt;개정 2023. 12. 22.&gt;</div>
        <div className="taf-title">전입세대확인서 열람 또는 교부 신청서</div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div className="taf-note0">※ 뒤쪽의 유의사항을 읽고 작성하시기 바라며, 색상이 어두운 란은 신청인이 작성하지 않습니다.</div>
          <div className="taf-apx">(앞쪽)</div>
        </div>

        {/* 접수 (어두운 칸) */}
        <table className="taf-tbl" style={{ marginBottom: '4px' }}>
          <tbody><tr style={{ height: '22px' }}>
            <td className="taf-dark" style={{ width: '33%' }}>접수번호</td>
            <td className="taf-dark" style={{ width: '34%' }}>접수일자</td>
            <td className="taf-dark" style={{ width: '33%' }}>처리기간&nbsp;&nbsp;즉시</td>
          </tr></tbody>
        </table>

        {/* 신청 내용 */}
        <table className="taf-tbl">
          <colgroup><col style={{ width: '13%' }} /><col style={{ width: '43.5%' }} /><col style={{ width: '43.5%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l">신청 내용</td>
              <td style={{ verticalAlign: 'middle' }}><span className="taf-chk" onClick={() => tog('신청_열람')}>전입세대확인서 열람 &nbsp;[ {f.신청_열람 ? '√' : ' '} ]</span></td>
              <td style={{ verticalAlign: 'middle' }}><span className="taf-chk" onClick={() => tog('신청_교부')}>전입세대확인서 교부 &nbsp;[ {f.신청_교부 ? '√' : ' '} ]</span></td>
            </tr>
          </tbody>
        </table>

        {/* 개인 신청인 */}
        <table className="taf-tbl" style={{ marginTop: '4px' }}>
          <colgroup><col style={{ width: '13%' }} /><col style={{ width: '52%' }} /><col style={{ width: '35%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" rowSpan={2}>개인 신청인</td>
              <td><span className="taf-lab">성명 <span style={{ color: '#888' }}>(서명 또는 인)</span></span>{In('개인_성명')}</td>
              <td><span className="taf-lab">주민등록번호</span>{In('개인_주민번호')}</td>
            </tr>
            <tr>
              <td><span className="taf-lab">주소 (시ㆍ도) &nbsp;&nbsp;(시ㆍ군ㆍ구)</span>{In('개인_주소')}</td>
              <td><span className="taf-lab">연락처</span>{In('개인_연락처')}</td>
            </tr>
          </tbody>
        </table>

        {/* 법인·단체 신청인 */}
        <table className="taf-tbl" style={{ marginTop: '4px' }}>
          <colgroup><col style={{ width: '13%' }} /><col style={{ width: '28%' }} /><col style={{ width: '24%' }} /><col style={{ width: '35%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" rowSpan={4}>법인ㆍ단체<br />신청인</td>
              <td colSpan={2}><span className="taf-lab">명칭</span>{In('법인_명칭')}</td>
              <td><span className="taf-lab">사업자등록번호</span>{In('법인_사업자번호')}</td>
            </tr>
            <tr>
              <td colSpan={2}><span className="taf-lab">대표자 <span style={{ color: '#888' }}>(서명 또는 인)</span></span>{In('법인_대표자')}</td>
              <td><span className="taf-lab">연락처</span>{In('법인_연락처')}</td>
            </tr>
            <tr>
              <td colSpan={3}><span className="taf-lab">소재지</span>{In('법인_소재지')}</td>
            </tr>
            <tr>
              <td><span className="taf-lab">방문자 성명</span>{In('방문자_성명')}</td>
              <td><span className="taf-lab">주민등록번호</span>{In('방문자_주민번호')}</td>
              <td><span className="taf-lab">연락처</span>{In('방문자_연락처')}</td>
            </tr>
          </tbody>
        </table>

        {/* 대상 소재지 / 표시 여부 / 용도 */}
        <table className="taf-tbl" style={{ marginTop: '4px' }}>
          <tbody>
            <tr>
              <td colSpan={2}><span className="taf-lab">열람 또는 교부 대상 건물 또는 시설의 소재지</span>{In('대상소재지')}</td>
            </tr>
            <tr>
              <td style={{ width: '62%', verticalAlign: 'middle', fontSize: '11px' }}>말소 또는 거주불명 등록된 사람의 성명과 전입일자 표시 여부</td>
              <td style={{ width: '38%', verticalAlign: 'middle' }}>
                <span className="taf-chk" onClick={() => setF((p) => ({ ...p, 말소표시: '표시됨' }))}>표시됨 {f.말소표시 === '표시됨' ? '☑' : '□'}</span> &nbsp;/&nbsp;
                <span className="taf-chk" onClick={() => setF((p) => ({ ...p, 말소표시: '표시안됨' }))}>표시되지 않음 {f.말소표시 === '표시안됨' ? '☑' : '□'}</span>
              </td>
            </tr>
            <tr>
              <td colSpan={2}><span className="taf-lab">용도 및 목적</span>{In('용도목적')}</td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontSize: '11px', margin: '8px 0 2px', lineHeight: 1.6 }}>「주민등록법」 제29조의2제1항, 같은 법 시행령 제49조의2제1항 및 같은 법 시행규칙 제14조제2항에 따라 위와 같이 전입세대확인서의 열람 또는 교부를 신청합니다.</p>
        <div className="taf-sign">{Ymd('신청_년', '신청_월', '신청_일')}</div>
        <div style={{ fontSize: '13px', fontWeight: 800, margin: '4px 0 8px' }}>시장ㆍ군수ㆍ구청장 또는 읍ㆍ면ㆍ동장 및 출장소장&nbsp;<span style={{ fontSize: '13px', fontWeight: 500 }}>귀하</span></div>

        {/* 제출서류 / 수수료 / 담당공무원 확인서류 */}
        <table className="taf-tbl">
          <colgroup><col style={{ width: '13%' }} /><col style={{ width: '57%' }} /><col style={{ width: '30%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" style={{ fontSize: '11px' }}>제출 서류</td>
              <td style={{ fontSize: '10px', lineHeight: 1.6 }}>신청인의 신분증명서<br /><span style={{ color: '#333' }}>※ 법인ㆍ단체의 경우에는 대표자의 신분증명서, 법인인감증명서 또는 사용인감계를 제출합니다.</span></td>
              <td rowSpan={2} style={{ fontSize: '10px', lineHeight: 1.6, verticalAlign: 'top' }}>
                <div style={{ fontWeight: 700, textAlign: 'center' }}>수수료</div>
                - 열람: 1건 1회 300원<br />
                - 교부: 1통 400원<br />
                <span style={{ color: '#333' }}>※ 「주민등록법」 제29조의2제2항제3호에 해당하는 경우에는 500원</span>
              </td>
            </tr>
            <tr>
              <td className="taf-l" style={{ fontSize: '11px' }}>담당 공무원<br />확인 서류</td>
              <td style={{ fontSize: '10px', lineHeight: 1.6 }}>신청인이 전입세대확인서의 열람 또는 교부 신청을 할 수 있는 자임을 입증하는 「주민등록법 시행규칙」 별표 2에 따른 서류</td>
            </tr>
          </tbody>
        </table>

        {/* 행정정보 공동이용 동의서 */}
        <div className="taf-gray" style={{ marginTop: '8px', textAlign: 'left', paddingLeft: '8px' }}>행정정보 공동이용 동의서</div>
        <div style={{ border: '1px solid #333', borderTop: 'none', padding: '6px 8px', fontSize: '10px', lineHeight: 1.6 }}>
          본인은 이 건 업무 처리를 위해 담당 공무원이 「전자정부법」 제36조제1항에 따른 행정정보의 공동이용(「주택임대차보호법」 제3조의6제2항 후단에 따른 전산처리정보조직의 이용을 포함합니다)을 통해 위의 담당 공무원 확인 서류를 확인하는 것에 동의합니다.<br />
          <span style={{ color: '#333' }}>※ 신청인이 행정정보의 공동이용에 동의하지 않거나 행정정보의 공동이용을 통해 확인할 수 있는 서류가 아닌 경우에는 신청인이 직접 해당 서류를 제출해야 합니다.</span>
          <div className="taf-sign" style={{ marginTop: '4px' }}><span style={{ fontWeight: 700 }}>신청인</span>{In('동의신청인', '', { width: '150px' })}<span style={{ whiteSpace: 'nowrap' }}>(서명 또는 인)</span></div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '10px', color: '#333', marginTop: '6px' }}>210㎜×297㎜[백상지(80g/㎡) 또는 중질지(80g/㎡)]</div>
      </div>

      {/* ===== 2쪽: 위임장·유의사항(뒤쪽) ===== */}
      <div className="taf-page">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div className="taf-note0">※ 위임장은 위임하여 신청하는 경우에만 작성합니다.</div>
          <div className="taf-apx">(뒤쪽)</div>
        </div>

        <div className="taf-gray" style={{ textAlign: 'left', paddingLeft: '8px' }}>위임장</div>
        <p style={{ fontSize: '11px', margin: '6px 0', lineHeight: 1.6 }}>「주민등록법」 제29조의2제2항제2호에 따라 위 신청인에게 전입세대확인서의 열람 또는 교부 신청을 위임합니다.</p>
        <div className="taf-sign">{Ymd('위임_년', '위임_월', '위임_일')}</div>

        {/* 위임한 자 (개인) */}
        <table className="taf-tbl" style={{ marginTop: '2px' }}>
          <colgroup><col style={{ width: '15%' }} /><col style={{ width: '50%' }} /><col style={{ width: '35%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" rowSpan={2}>위임한 자<br />(개인)</td>
              <td><span className="taf-lab">성명 <span style={{ color: '#888' }}>(서명 또는 인)</span></span>{In('위임개인_성명')}</td>
              <td><span className="taf-lab">주민등록번호</span>{In('위임개인_주민번호')}</td>
            </tr>
            <tr>
              <td><span className="taf-lab">주소</span>{In('위임개인_주소')}</td>
              <td><span className="taf-lab">연락처</span>{In('위임개인_연락처')}</td>
            </tr>
          </tbody>
        </table>

        {/* 위임한 자 (법인·단체) */}
        <table className="taf-tbl" style={{ marginTop: '4px' }}>
          <colgroup><col style={{ width: '15%' }} /><col style={{ width: '50%' }} /><col style={{ width: '35%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" rowSpan={3}>위임한 자<br />(법인ㆍ단체)</td>
              <td><span className="taf-lab">명칭</span>{In('위임법인_명칭')}</td>
              <td><span className="taf-lab">사업자등록번호</span>{In('위임법인_사업자번호')}</td>
            </tr>
            <tr>
              <td><span className="taf-lab">대표자 <span style={{ color: '#888' }}>(서명 또는 인)</span></span>{In('위임법인_대표자')}</td>
              <td><span className="taf-lab">연락처</span>{In('위임법인_연락처')}</td>
            </tr>
            <tr>
              <td colSpan={2}><span className="taf-lab">소재지</span>{In('위임법인_소재지')}</td>
            </tr>
          </tbody>
        </table>

        {/* 유의사항 */}
        <div className="taf-gray" style={{ marginTop: '14px' }}>유의 사항</div>
        <div style={{ border: '1px solid #333', borderTop: 'none', padding: '6px 8px', fontSize: '10px', lineHeight: 1.7 }}>
          1. '서명 또는 인'란에는 서명을 하거나 도장을 찍어야 하며 지문은 사용할 수 없습니다. 이 경우 서명을 할 때에는 자필로 한글 성명을 써야 합니다.<br />
          2. 법인ㆍ단체 신청인의 경우에는 '대표자'란에 대표자가 서명하거나 법인 인감(사용 인감을 포함합니다)을 찍습니다.<br />
          3. 동일 신청자가 동일 증명자료에 따라 동일 목적으로 여러 건물 또는 시설의 소재지에 대해 전입세대확인서의 열람 또는 교부를 신청하는 경우에는 「주민등록법 시행규칙」 별지 제15호서식 및 별지 제16호서식에 따라 일괄 신청할 수 있습니다. 이 경우 해당 별지 제15호서식과 별지 제16호서식 사이에는 신청인의 확인(간인)이 있어야 합니다.<br />
          4. 전입세대확인서의 열람 또는 교부 신청의 위임은 해당 건물 또는 시설의 소유자, 임차인, 임대차계약자 또는 매매계약자 본인만이 할 수 있습니다. 이 경우 위임받아 신청하는 자는 위임장과 본인 및 위임한 자의 신분증명서(법인ㆍ단체의 경우에는 대표자의 신분증명서, 법인인감증명서 또는 사용인감계를 말합니다)를 함께 제출해야 합니다.<br />
          5. 다른 사람의 서명 또는 도장 등을 위조하거나 부정하게 사용하는 등의 방법으로 신청서 또는 위임장을 거짓으로 작성하는 경우에는 「형법」에 따라 처벌을 받게 됩니다.<br />
          6. 확인하려는 전입세대의 주소가 사실과 다르게 기재된 경우에는 전입세대확인서를 통해 해당 전입세대를 확인할 수 없습니다.<br />
          7. 외국인 및 외국국적동포는 세대주 또는 주민등록표 상의 동거인이 될 수 없으므로, 외국인 및 외국국적동포의 세대주 및 동거인 여부는 전입세대확인서를 통해 확인할 수 없습니다.
        </div>
        <div style={{ textAlign: 'right', fontSize: '10px', color: '#333', marginTop: '8px' }}>210㎜×297㎜[백상지(80g/㎡) 또는 중질지(80g/㎡)]</div>
      </div>
    </div>
  );
}
