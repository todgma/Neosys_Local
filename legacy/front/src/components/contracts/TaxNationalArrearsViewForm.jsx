import { useState } from 'react';
import { X, Printer } from 'lucide-react';

/**
 * 미납국세 등 열람신청서 (국세징수법 시행규칙 [별지 제95호서식], 개정 2024. 3. 22.) — 2쪽(앞쪽 신청서 / 뒤쪽 처리절차)
 *  - 신청인 작성칸만 입력 가능(어두운 칸=접수번호/접수일/처리기간은 미입력)
 *  - 새 창(모달)에서 렌더 → 인쇄(window.print) 지원. 저장값 백엔드 연동은 추후.
 */
const BLANK = {
  임차구분: '주택',   // 주택 | 상가
  동의구분: '필요',   // 필요 | 불필요 (임대인 동의)
  임차인_성명: '', 임차인_등록번호: '', 임차인_주소: '', 임차인_전화: '',
  임대인_성명: '', 임대인_등록번호: '', 임대인_주소: '', 임대인_전화: '',
  건물소재지: '',
  동의_년: '', 동의_월: '', 동의_일: '', 동의_임대인: '',
  신청_년: '', 신청_월: '', 신청_일: '', 신청인: '',
};

export default function TaxNationalArrearsViewForm({ onClose, initial = null, onSave = null }) {
  const [f, setF] = useState(initial && typeof initial === 'object' ? { ...BLANK, ...initial } : BLANK);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const In = (k, ph, style) => <input value={f[k] ?? ''} onChange={set(k)} placeholder={ph || ''} className="taf-in" style={style} />;
  const Ymd = (yk, mk, dk) => (
    <span style={{ whiteSpace: 'nowrap' }}>
      <input value={f[yk] ?? ''} onChange={set(yk)} className="taf-in taf-num" />년&nbsp;
      <input value={f[mk] ?? ''} onChange={set(mk)} className="taf-in taf-num" />월&nbsp;
      <input value={f[dk] ?? ''} onChange={set(dk)} className="taf-in taf-num" />일
    </span>
  );
  const Party = (label, sub, pfx) => (
    <>
      <tr>
        <td className="taf-l" rowSpan={2}>{label}{sub && <><br /><span style={{ fontSize: '10px', fontWeight: 400 }}>{sub}</span></>}</td>
        <td><span className="taf-lab">성명(상호)</span>{In(`${pfx}_성명`)}</td>
        <td><span className="taf-lab">주민등록번호(사업자등록번호)</span>{In(`${pfx}_등록번호`)}</td>
      </tr>
      <tr>
        <td><span className="taf-lab">주소(사업장)</span>{In(`${pfx}_주소`)}</td>
        <td><span className="taf-lab">전화번호</span>{In(`${pfx}_전화`)}</td>
      </tr>
    </>
  );

  return (
    <div className="taf-root">
      <style>{`
        .taf-root { position: fixed; inset: 0; background: #eef1f5; overflow: auto; display: flex; flex-direction: column; }
        .taf-bar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 14px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
        .taf-bar h2 { font-size: 14px; font-weight: 700; color: #111827; margin: 0; }
        .taf-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 13px; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 4px; background: white; color: #374151; cursor: pointer; }
        .taf-btn.primary { background: #4f46e5; border-color: #4f46e5; color: white; }
        .taf-page { width: 210mm; min-height: 297mm; margin: 14px auto; background: white; padding: 12mm 14mm; box-sizing: border-box; box-shadow: 0 2px 14px rgba(0,0,0,.15); font-family: 'Malgun Gothic','맑은 고딕',sans-serif; color: #111; font-size: 13px; line-height: 1.5; }
        .taf-page + .taf-page { margin-top: 20px; }
        .taf-code { font-size: 10.5px; color: #222; margin-bottom: 2px; }
        .taf-apx { text-align: right; font-size: 10.5px; color: #222; }
        .taf-title { display: flex; align-items: center; justify-content: center; gap: 14px; margin: 4px 0 8px; }
        .taf-title h1 { font-size: 20px; font-weight: 800; letter-spacing: 2px; margin: 0; }
        .taf-chk { font-size: 13px; font-weight: 700; line-height: 1.7; cursor: pointer; white-space: nowrap; }
        .taf-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .taf-tbl td { border: 1px solid #333; padding: 3px 5px; vertical-align: top; }
        .taf-l { text-align: center; font-weight: 700; background: #fff; vertical-align: middle; }
        .taf-lab { font-size: 10.5px; color: #333; display: block; margin-bottom: 2px; }
        .taf-dark { background: #cfcfcf; text-align: center; font-weight: 700; }
        .taf-in { width: 100%; border: none; background: #eaf7ef; padding: 3px 4px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
        .taf-in.taf-num { width: 44px; text-align: center; margin: 0 2px; }
        .taf-p { font-size: 11.5px; margin: 4px 0; }
        .taf-sign { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin: 6px 0; }
        /* 처리절차(뒤쪽) */
        .taf-proc-head { background: #b7b7b7; color: #111; text-align: center; font-weight: 800; font-size: 14px; padding: 5px 0; border: 1px solid #333; }
        .taf-proc-sub { border: 1px solid #333; border-top: none; padding: 5px 8px; font-size: 13px; }
        .taf-flow td { border: 1px solid #333; text-align: center; vertical-align: middle; padding: 6px 4px; font-size: 13px; }
        .taf-box { border: 1px solid #333; padding: 10px 6px; font-weight: 700; background: white; }
        .taf-arrow { font-size: 18px; font-weight: 700; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: white !important; }
          .taf-root { position: static; background: white; overflow: visible; }
          .taf-page { margin: 0; box-shadow: none; width: auto; min-height: auto; padding: 0; }
          .taf-page + .taf-page { page-break-before: always; margin-top: 0; }
          @page { size: A4; margin: 20mm 20mm 10mm 20mm; }
        }
      `}</style>

      {/* 상단 툴바 (인쇄 시 숨김) */}
      <div className="taf-bar no-print">
        <h2>미납국세 등 열람신청서</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onSave && <button className="taf-btn" style={{ background: '#059669', borderColor: '#059669', color: 'white' }} onClick={async () => { const ok = await onSave(f); if (ok) onClose?.(); }}>저장</button>}
          <button className="taf-btn primary" onClick={() => window.print()}><Printer className="w-4 h-4" /> 인쇄 / 미리보기</button>
          {onClose && <button className="taf-btn" onClick={onClose}><X className="w-4 h-4" /> 닫기</button>}
        </div>
      </div>

      {/* ===== 1쪽: 신청서(앞쪽) ===== */}
      <div className="taf-page">
        <div className="taf-code">■ [별지 제95호서식] &lt;개정 2024. 3. 22.&gt;</div>
        <div className="taf-title">
          <h1>미납국세 등 열람신청서</h1>
          <div>
            <div className="taf-chk" onClick={() => setF((p) => ({ ...p, 임차구분: '주택' }))}>[ {f.임차구분 === '주택' ? '√' : ' '} ]주택임차</div>
            <div className="taf-chk" onClick={() => setF((p) => ({ ...p, 임차구분: '상가' }))}>[ {f.임차구분 === '상가' ? '√' : ' '} ]상가임차</div>
          </div>
        </div>
        <div className="taf-apx">(앞쪽)</div>

        {/* 접수 정보 (어두운 칸 = 미작성) */}
        <table className="taf-tbl" style={{ marginBottom: '6px' }}>
          <tbody>
            <tr style={{ height: '26px' }}>
              <td className="taf-dark" style={{ width: '33.33%' }}>접수번호</td>
              <td className="taf-dark" style={{ width: '33.33%' }}>접수일</td>
              <td className="taf-dark" style={{ width: '33.34%' }}>처리기간&nbsp;&nbsp;즉시</td>
            </tr>
          </tbody>
        </table>

        {/* 임차인 / 임대인 */}
        <table className="taf-tbl">
          <colgroup><col style={{ width: '17%' }} /><col style={{ width: '53%' }} /><col style={{ width: '30%' }} /></colgroup>
          <tbody>
            {Party('임차인', '(임차하여 사용하려는 자 포함)', '임차인')}
            {Party('임대인', '', '임대인')}
            <tr>
              <td colSpan={3} style={{ borderBottom: 'none' }}>
                <span style={{ fontWeight: 700 }}>임차 건물 소재지</span>
                <span style={{ fontSize: '10px', color: '#333' }}>(건물의 종류ㆍ명칭 및 동ㆍ열ㆍ층ㆍ호 등 구체적으로 기재)</span>
                <textarea value={f.건물소재지} onChange={set('건물소재지')} rows={3} className="taf-in" style={{ resize: 'none', height: '58px', marginTop: '3px' }} />
              </td>
            </tr>
          </tbody>
        </table>

        {/* 임대인 동의 구분 */}
        <table className="taf-tbl" style={{ marginTop: '6px' }}>
          <colgroup><col style={{ width: '30%' }} /><col style={{ width: '70%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l taf-chk" style={{ fontSize: '11px', whiteSpace: 'normal', lineHeight: 1.4 }} onClick={() => setF((p) => ({ ...p, 동의구분: '필요' }))}>[ {f.동의구분 === '필요' ? '√' : ' '} ] 임대인의 동의가 필요한 경우</td>
              <td>
                <div className="taf-p">「국세징수법」 제109조제1항에 따라 위 임차인(임차하여 사용하려는 자 포함)에게 본인의 미납국세 등에 대한 열람을 동의합니다.</div>
                <div className="taf-sign">{Ymd('동의_년', '동의_월', '동의_일')}</div>
                <div className="taf-sign"><span style={{ fontWeight: 700 }}>임대인</span>{In('동의_임대인', '', { width: '150px' })}<span style={{ whiteSpace: 'nowrap' }}>(서명 또는 인)</span></div>
              </td>
            </tr>
            <tr>
              <td className="taf-l taf-chk" style={{ fontSize: '11px', whiteSpace: 'normal', lineHeight: 1.4 }} onClick={() => setF((p) => ({ ...p, 동의구분: '불필요' }))}>[ {f.동의구분 === '불필요' ? '√' : ' '} ] 임대인의 동의가 필요하지 않은 경우</td>
              <td style={{ fontSize: '10.5px', color: '#333' }}>※ 「국세징수법」 제109조제2항 전단 및 같은 법 시행령 제97조제2항에 따라 임대차계약에 따른 보증금이 1천만원 초과인 경우를 말합니다.</td>
            </tr>
          </tbody>
        </table>

        <p className="taf-p" style={{ marginTop: '8px' }}>「국세징수법」 제109조에 따라 위 임대인의 미납국세 등에 대한 열람을 신청합니다.</p>
        <div className="taf-sign">{Ymd('신청_년', '신청_월', '신청_일')}</div>
        <div className="taf-sign"><span style={{ fontWeight: 700 }}>신청인</span>{In('신청인', '', { width: '150px' })}<span style={{ whiteSpace: 'nowrap' }}>(서명 또는 인)</span></div>
        <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '6px' }}>세무서장&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ fontSize: '13px', fontWeight: 500 }}>귀하</span></div>

        {/* 첨부서류 / 수수료 */}
        <table className="taf-tbl" style={{ marginTop: '8px' }}>
          <colgroup><col style={{ width: '12%' }} /><col style={{ width: '74%' }} /><col style={{ width: '14%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l">첨부서류</td>
              <td style={{ fontSize: '10.5px', lineHeight: 1.6 }}>
                1. 임대인 및 신청인의 신분을 증명하는 서류(주민등록증 또는 운전면허증 사본 등) 1부<br />
                2. 임대차계약 체결 사실을 증명하는 서류(임대차계약서 사본) 1부<br />
                <span style={{ paddingLeft: '10px' }}>(「국세징수법」 제109조제2항 전단에 따라 임대인의 동의 없이 신청하는 경우만 제출합니다)</span>
              </td>
              <td className="taf-l" style={{ fontSize: '11px' }}>수수료<br />없음</td>
            </tr>
          </tbody>
        </table>

        {/* 유의사항 */}
        <div style={{ background: '#5b5b5b', color: 'white', textAlign: 'center', fontWeight: 700, fontSize: '13px', padding: '3px 0', marginTop: '10px' }}>유의사항</div>
        <div style={{ border: '1px solid #333', borderTop: 'none', padding: '6px 8px', fontSize: '10.5px', lineHeight: 1.6 }}>
          1. 「국세징수법」 제109조에 따른 미납국세 등의 열람 신청은 임대차 기간이 시작하는 날까지 할 수 있습니다.<br />
          2. 각 세법에 따른 과세표준 및 세액의 신고기한까지 임대인이 신고한 국세 중 납부하지 않은 국세에 대해서는 신고기한부터 30일(종합소득세의 경우 60일)이 경과한 때부터 열람이 가능하며, 납부하지 않은 각 국세별 금액이 50만원 이하인 소액국세의 경우 열람 시점과 미납부 세액 검증 및 전산 입력 시점 간 시차로 인하여 조회 내역서에 일부 표시되지 않을 수도 있습니다.<br />
          3. 「국세징수법」 제109조제2항 전단에 따라 임대인의 동의 없이 미납국세 등의 열람을 신청한 경우에는 같은 항 후단에 따라 그 열람 내역이 임대인에게 통지됩니다.
        </div>
        <div style={{ textAlign: 'right', fontSize: '10px', color: '#333', marginTop: '6px' }}>210㎜×297㎜[백상지 80g/㎡ 또는 중질지 80g/㎡]</div>
      </div>

      {/* ===== 2쪽: 처리절차(뒤쪽) ===== */}
      <div className="taf-page">
        <div className="taf-proc-head">처리절차</div>
        <div className="taf-proc-sub">이 신청서는 아래와 같이 처리됩니다.</div>
        <table className="taf-flow" style={{ width: '100%', borderCollapse: 'collapse', borderTop: 'none' }}>
          <colgroup><col style={{ width: '38%' }} /><col style={{ width: '10%' }} /><col style={{ width: '52%' }} /></colgroup>
          <tbody>
            <tr>
              <td style={{ fontWeight: 800, fontSize: '13px' }}>신 청 인</td>
              <td className="taf-arrow" style={{ border: 'none' }} />
              <td style={{ fontWeight: 800, fontSize: '13px' }}>처 리 기 관<br /><span style={{ fontWeight: 500, fontSize: '11px' }}>(담당부서)</span></td>
            </tr>
            <tr>
              <td><div className="taf-box">신청서 작성</div></td>
              <td className="taf-arrow" style={{ border: 'none' }}>→</td>
              <td><div className="taf-box">접 수<br /><span style={{ fontWeight: 500, fontSize: '11px' }}>(민원봉사실)</span></div></td>
            </tr>
            <tr>
              <td style={{ border: 'none' }} />
              <td style={{ border: 'none' }} />
              <td className="taf-arrow" style={{ border: 'none' }}>↓</td>
            </tr>
            <tr>
              <td style={{ border: 'none' }} />
              <td style={{ border: 'none' }} />
              <td><div className="taf-box">조 사 ㆍ 확 인<br /><span style={{ fontWeight: 500, fontSize: '11px' }}>(담당부서)</span></div></td>
            </tr>
            <tr>
              <td style={{ border: 'none' }} />
              <td style={{ border: 'none' }} />
              <td className="taf-arrow" style={{ border: 'none' }}>↓</td>
            </tr>
            <tr>
              <td><div className="taf-box">미납국세 등 열람</div></td>
              <td className="taf-arrow" style={{ border: 'none' }}>←</td>
              <td><div className="taf-box">결 재<br /><span style={{ fontWeight: 500, fontSize: '11px' }}>(서장)</span></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
