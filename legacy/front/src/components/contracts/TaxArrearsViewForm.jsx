import { useState } from 'react';
import { X, Printer } from 'lucide-react';

/**
 * 미납지방세 등 열람신청서 (지방세징수법 시행규칙 [별지 제2호서식], 개정 2023. 3. 31.)
 *  - 신청인 작성칸만 입력 가능(어두운 칸=접수번호/접수일/처리기간은 미입력)
 *  - 새 창(모달)에서 렌더 → 인쇄(window.print) 지원. 저장값 백엔드 연동은 추후.
 */
const BLANK = {
  임차구분: '주택', // 주택 | 상가
  임차인_성명: '', 임차인_등록번호: '', 임차인_주소: '', 임차인_전화: '', 임차인_휴대: '', 임차인_이메일: '',
  임대인_성명: '', 임대인_등록번호: '', 임대인_주소: '', 임대인_전화: '', 임대인_휴대: '', 임대인_이메일: '',
  건물소재지: '',
  신청_년: '', 신청_월: '', 신청_일: '', 신청인: '',
  동의_년: '', 동의_월: '', 동의_일: '', 동의_임대인: '',
};

export default function TaxArrearsViewForm({ onClose, initial = null, onSave = null }) {
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

  return (
    <div className="taf-root">
      <style>{`
        .taf-root { position: fixed; inset: 0; background: #eef1f5; overflow: auto; display: flex; flex-direction: column; }
        .taf-bar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 14px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
        .taf-bar h2 { font-size: 14px; font-weight: 700; color: #111827; margin: 0; }
        .taf-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 13px; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 4px; background: white; color: #374151; cursor: pointer; }
        .taf-btn.primary { background: #4f46e5; border-color: #4f46e5; color: white; }
        .taf-page { width: 210mm; min-height: 297mm; margin: 14px auto; background: white; padding: 12mm 14mm; box-sizing: border-box; box-shadow: 0 2px 14px rgba(0,0,0,.15); font-family: 'Malgun Gothic','맑은 고딕',sans-serif; color: #111; font-size: 13px; line-height: 1.5; }
        .taf-code { font-size: 10.5px; color: #222; margin-bottom: 2px; }
        .taf-title { display: flex; align-items: center; justify-content: center; gap: 14px; margin: 6px 0 8px; }
        .taf-title h1 { font-size: 20px; font-weight: 800; letter-spacing: 2px; margin: 0; }
        .taf-chk { font-size: 13px; font-weight: 700; line-height: 1.7; cursor: pointer; white-space: nowrap; }
        .taf-note { font-size: 10.5px; color: #222; margin: 2px 0 6px; }
        .taf-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .taf-tbl td { border: 1px solid #333; padding: 3px 5px; vertical-align: top; }
        .taf-l { text-align: center; font-weight: 700; background: #fff; vertical-align: middle; }
        .taf-lab { font-size: 10.5px; color: #333; display: block; margin-bottom: 2px; }
        .taf-dark { background: #cfcfcf; text-align: center; font-weight: 700; }
        .taf-in { width: 100%; border: none; background: #eaf7ef; padding: 3px 4px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
        .taf-in.taf-num { width: 44px; text-align: center; margin: 0 2px; }
        .taf-sec { text-align: center; font-size: 15px; font-weight: 800; margin: 14px 0 6px; letter-spacing: 2px; }
        .taf-p { font-size: 11.5px; margin: 4px 0; }
        .taf-right { text-align: right; }
        .taf-sign { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin: 6px 0; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: white !important; }
          .taf-root { position: static; background: white; overflow: visible; }
          .taf-page { margin: 0; box-shadow: none; width: auto; min-height: auto; padding: 0; }
          @page { size: A4; margin: 20mm 20mm 10mm 20mm; }
        }
      `}</style>

      {/* 상단 툴바 (인쇄 시 숨김) */}
      <div className="taf-bar no-print">
        <h2>미납지방세 등 열람신청서</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onSave && <button className="taf-btn" style={{ background: '#059669', borderColor: '#059669', color: 'white' }} onClick={async () => { const ok = await onSave(f); if (ok) onClose?.(); }}>저장</button>}
          <button className="taf-btn primary" onClick={() => window.print()}><Printer className="w-4 h-4" /> 인쇄 / 미리보기</button>
          {onClose && <button className="taf-btn" onClick={onClose}><X className="w-4 h-4" /> 닫기</button>}
        </div>
      </div>

      {/* A4 서식 */}
      <div className="taf-page">
        <div className="taf-code">■ 지방세징수법 시행규칙 [별지 제2호서식] &lt;개정 2023. 3. 31.&gt;</div>

        <div className="taf-title">
          <h1>미납지방세 등 열람신청서</h1>
          <div>
            <div className="taf-chk" onClick={() => setF((p) => ({ ...p, 임차구분: '주택' }))}>[ {f.임차구분 === '주택' ? '√' : ' '} ]주택임차</div>
            <div className="taf-chk" onClick={() => setF((p) => ({ ...p, 임차구분: '상가' }))}>[ {f.임차구분 === '상가' ? '√' : ' '} ]상가임차</div>
          </div>
        </div>

        <div className="taf-note">※ 색상이 어두운 칸은 신청인이 작성하지 않으며, [ ]에는 해당되는 곳에 √표를 합니다.</div>

        {/* 접수 정보 (어두운 칸 = 미작성) */}
        <table className="taf-tbl" style={{ marginBottom: '6px' }}>
          <tbody>
            <tr style={{ height: '28px' }}>
              <td className="taf-dark" style={{ width: '33.33%' }}>접수번호</td>
              <td className="taf-dark" style={{ width: '33.33%' }}>접수일</td>
              <td className="taf-dark" style={{ width: '33.34%' }}>처리기간&nbsp;&nbsp;즉시</td>
            </tr>
          </tbody>
        </table>

        {/* 임차인 / 임대인 */}
        <table className="taf-tbl">
          <colgroup><col style={{ width: '17%' }} /><col style={{ width: '49.5%' }} /><col style={{ width: '33.5%' }} /></colgroup>
          <tbody>
            {[['임차인', '임차인'], ['임대인', '임대인']].map(([label, pfx]) => (
              <PartyRows key={pfx} label={label} pfx={pfx} f={f} In={In} />
            ))}
            <tr>
              <td className="taf-l">임차할 건물<br />소재지<br /><span style={{ fontSize: '10px', fontWeight: 400, color: '#333' }}>(건물의 종류ㆍ명칭 및 동ㆍ열ㆍ층ㆍ호 등을 구체적으로 기재합니다)</span></td>
              <td colSpan={2}>
                <textarea value={f.건물소재지} onChange={set('건물소재지')} rows={4} className="taf-in" style={{ resize: 'none', height: '80px' }} />
              </td>
            </tr>
          </tbody>
        </table>

        <p className="taf-p" style={{ marginTop: '8px' }}>「지방세징수법」 제 6조 및 같은 법 시행령 제8조에 따라 위와 같이 미납지방세 등의 열람을 신청합니다.</p>
        <div className="taf-sign" style={{ marginTop: '2px' }}>{Ymd('신청_년', '신청_월', '신청_일')}</div>
        <div className="taf-sign">
          <span style={{ fontWeight: 700 }}>신청인</span>
          {In('신청인', '', { width: '160px' })}
          <span style={{ whiteSpace: 'nowrap' }}>(서명 또는 인)</span>
        </div>
        <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '6px' }}>지방자치단체의 장&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ fontSize: '13px', fontWeight: 500 }}>귀하</span></div>

        {/* 첨부서류 / 수수료 */}
        <table className="taf-tbl" style={{ marginTop: '8px' }}>
          <colgroup><col style={{ width: '12%' }} /><col style={{ width: '78%' }} /><col style={{ width: '10%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l">첨부서류</td>
              <td style={{ fontSize: '10.5px', lineHeight: 1.6 }}>
                1. 임대인의 동의를 증명할 수 있는 서류(아래의 임대인 동의서로 갈음할 수 있으며, 「지방세징수법」 제6조제1항 전단에 따라 임대인의 동의를 받아 미납지방세 등 열람을 신청하는 경우에만 제출합니다)<br />
                2. 임대차계약 사실을 증명할 수 있는 서류 1부(「지방세징수법」 제6조제3항 전단에 따라 임대인의 동의 없이 미납지방세 등 열람을 신청하는 경우에만 제출합니다)<br />
                3. 임차인의 신분을 증명하는 서류 1부
              </td>
              <td className="taf-l" style={{ fontSize: '11px' }}>수수료<br />없음</td>
            </tr>
          </tbody>
        </table>

        {/* 임대인 동의서 */}
        <div className="taf-sec">임대인 동의서</div>
        <p className="taf-p">「지방세징수법」 제6조제1항에 따라 위 임차인이 본인의 미납지방세 등을 열람하는 것에 동의합니다.</p>
        <div className="taf-sign">{Ymd('동의_년', '동의_월', '동의_일')}</div>
        <div className="taf-sign">
          <span style={{ fontWeight: 700 }}>임대인</span>
          {In('동의_임대인', '', { width: '160px' })}
          <span style={{ whiteSpace: 'nowrap' }}>(서명 또는 인)</span>
        </div>
        <p className="taf-p" style={{ fontSize: '10.5px', color: '#333' }}>※ 이 동의서는 「지방세징수법」 제6조제1항에 따라 임대인의 미납지방세 등의 열람을 신청하는 경우에만 작성합니다.</p>

        {/* 유의사항 */}
        <div style={{ background: '#5b5b5b', color: 'white', textAlign: 'center', fontWeight: 700, fontSize: '13px', padding: '3px 0', marginTop: '10px' }}>유의사항</div>
        <div style={{ border: '1px solid #333', borderTop: 'none', padding: '6px 8px', fontSize: '10.5px', lineHeight: 1.6 }}>
          1. 임차인이 임대인의 동의를 받아 임대인의 미납지방세 등의 열람을 신청할 수 있는 기한은 건물에 대한 임대차계약을 하기 전까지 또는 임대차계약을 체결하고 임대차기간이 시작되는 날까지입니다.<br />
          2. 임차인이 임대인의 동의 없이 임대인의 미납지방세 등의 열람을 신청할 수 있는 기한은 임대차계약을 체결하고 임대차기간이 시작되는 날까지입니다.
        </div>

        <div style={{ textAlign: 'right', fontSize: '10px', color: '#333', marginTop: '6px' }}>210mm×297mm[백상지 (80g/㎡) 또는 중질지(80g/㎡)]</div>
      </div>
    </div>
  );
}

// 임차인/임대인 3행(성명·등록번호 / 주소 / 전화·이메일)
function PartyRows({ label, pfx, f, In }) {
  return (
    <>
      <tr>
        <td className="taf-l" rowSpan={3}>{label}</td>
        <td><span className="taf-lab">성명(법인명)</span>{In(`${pfx}_성명`)}</td>
        <td><span className="taf-lab">주민(법인ㆍ외국인)등록번호</span>{In(`${pfx}_등록번호`)}</td>
      </tr>
      <tr>
        <td colSpan={2}><span className="taf-lab">주소(영업소)</span>{In(`${pfx}_주소`)}</td>
      </tr>
      <tr>
        <td>
          <span className="taf-lab">전화번호</span>{In(`${pfx}_전화`)}
          <span className="taf-lab" style={{ marginTop: '2px' }}>(휴대전화: {In(`${pfx}_휴대`, '', { display: 'inline-block', width: '60%' })} )</span>
        </td>
        <td><span className="taf-lab">전자우편주소</span>{In(`${pfx}_이메일`)}</td>
      </tr>
    </>
  );
}
