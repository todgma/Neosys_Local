import { useState } from 'react';
import { X, Printer } from 'lucide-react';

/**
 * 주택 임대차 계약 신고서 — 「부동산 거래신고 등에 관한 법률 시행규칙」 별지 제5호의2서식 (개정 2023.12.29.)
 *  · 거래관련서식과 동일하게 ContractDocModal(DocModalShell 상단바)로 렌더 + masterId/docKind로 계약 테이블 저장.
 *  · taf-root / taf-bar(저장) / taf-page 구조 — 쉘이 상단바로 저장/인쇄 위임.
 */
const KINDS = ['아파트', '연립', '다세대', '단독', '다가구', '오피스텔', '고시원', '그 밖의 주거용'];

const BLANK = {
  // 접수(관청 작성) — 보통 공란
  // ① 임대인
  lessorNm: '', lessorRrn: '', lessorAddr: '', lessorTel: '', lessorMobile: '',
  // ② 임차인
  lesseeNm: '', lesseeRrn: '', lesseeAddr: '', lesseeTel: '', lesseeMobile: '',
  // ③ 임대 목적물
  objKind: '', objAddr: '', objBldg: '', objDong: '', objFloor: '', objHo: '', objArea: '', objRooms: '',
  // 임대 계약내용 — 신규/갱신 택1
  kind: '', // 'new' | 'renew'
  // ⑥ 신규계약
  newDeposit: '', newRent: '', newStart: '', newEnd: '', newSigned: '',
  // ⑦ 갱신계약
  prevDeposit: '', prevRent: '', renewDeposit: '', renewRent: '', renewStart: '', renewEnd: '', renewSigned: '',
  // ⑧ 계약갱신요구권 행사 여부
  renewalRight: '', // '행사' | '미행사'
  // 개업공인중개사 2(공동중개)
  agA_nm: '', agA_addr: '', agA_rep: '', agA_reg: '', agA_tel: '', agA_assoc: '',
  agB_nm: '', agB_addr: '', agB_rep: '', agB_reg: '', agB_tel: '', agB_assoc: '',
  // 신고일 + 신고인 서명
  reportY: '', reportM: '', reportD: '',
  signLessor: '', signLessee: '', signSubmit: '',
};

export default function HousingLeaseReportForm({ onClose, initial = null, onSave = null }) {
  const [f, setF] = useState(initial && typeof initial === 'object' ? { ...BLANK, ...initial } : BLANK);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const In = (k, style) => <input value={f[k] ?? ''} onChange={set(k)} className="hlr-in" style={style} />;
  // 라벨(위) + 입력창(아래) 같은 칸 — 접수번호 스타일
  const Fld = (label, k, colSpan = 1) => (
    <td className="fld" colSpan={colSpan}>
      <div className="fld-lb">{label}</div>
      {In(k, { width: '100%' })}
    </td>
  );
  // 라벨(좌) + 입력창(우) 가로 배치 — 행 높이 축소(주소/전화번호/휴대전화번호)
  const FldH = (label, k, colSpan = 1) => (
    <td className="fldh" colSpan={colSpan}>
      <div className="fldh-row">
        <span className="fldh-lb">{label}</span>
        {In(k, { flex: '1 1 auto', width: 'auto', minWidth: 0 })}
      </div>
    </td>
  );
  // 보증금/월차임 — 라벨(좌) + 입력창(가변) + '원'(우측 고정) → 모든 행의 '원' 수직 정렬
  const Won = (label, k) => (
    <div className="amt"><span className="amt-lb">{label}</span>{In(k, { flex: '1 1 auto', width: 'auto', minWidth: 0 })}<span className="amt-won">원</span></div>
  );
  const Chk = (checked, onClick) => (
    <span className="hlr-chk" onClick={onClick}>[{checked ? '√' : '  '}]</span>
  );

  return (
    <div className="taf-root">
      <style>{`
        /* 인쇄/PDF 여백 — 미리보기 .taf-page 패딩(5/12/10mm)과 동일하게 맞춰 1쪽에 수렴(기본 20mm 덮어씀) */
        @page { size: A4; margin: 5mm 12mm 10mm; }
        .taf-root { position: fixed; inset: 0; background: #eef1f5; overflow: auto; display: flex; flex-direction: column; }
        .taf-bar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 14px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
        .taf-bar h2 { font-size: 14px; font-weight: 700; color: #111827; margin: 0; }
        .taf-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 13px; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 4px; background: white; color: #374151; cursor: pointer; }
        .taf-btn.primary { background: #4f46e5; border-color: #4f46e5; color: white; }
        .taf-page { width: 210mm; min-height: 297mm; margin: 14px auto; background: white; padding: 5mm 12mm 10mm; box-sizing: border-box; box-shadow: 0 2px 14px rgba(0,0,0,.15); font-family: 'Malgun Gothic','맑은 고딕',sans-serif; color: #111; font-size: 12.5px; line-height: 1.45; }
        .taf-page + .taf-page { margin-top: 20px; }
        .hlr-head { font-size: 12px; font-weight: 700; }
        .hlr-sub { color: #1d4ed8; font-size: 11.5px; }
        .hlr-right { float: right; text-align: right; font-size: 11.5px; color: #1d4ed8; }
        .hlr-title { text-align: center; font-size: 22px; font-weight: 800; letter-spacing: 2px; margin: 8px 0 6px; clear: both; }
        .hlr-note { font-size: 11px; color: #222; margin-bottom: 4px; }
        .hlr-apx { text-align: right; font-size: 11px; color: #222; }
        .t { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .t td { border: 1px solid #333; padding: 0 6px; vertical-align: middle; }
        .lh { background: #e9e9e9; text-align: center; font-weight: 400; }
        .hlr-recv { background: #e9e9e9; font-weight: 400; vertical-align: top; padding: 4px 6px 18px; }
        .lv { background: #f5f5f5; text-align: center; font-weight: 400; width: 70px; }
        .lv2 { background: #fff; text-align: left; font-weight: 400; font-size: 11px; color: #111; }
        /* 접수번호처럼 — 라벨 위, 입력창 아래(같은 칸). 행높이 확보 */
        .fld { vertical-align: top; padding: 0 6px; }
        .fld-lb { font-size: 12.5px; font-weight: 400; color: #111; margin-bottom: 0; line-height: 1.2; min-height: 0; }
        /* 라벨(좌)+입력창(우) 가로 배치 — 행 높이 축소 */
        .fldh { vertical-align: middle; padding: 0 6px; }
        .fldh-row { display: flex; align-items: center; gap: 6px; }
        .amt { display: flex; align-items: center; gap: 6px; width: 100%; }
        .amt-lb { flex-shrink: 0; width: 52px; }
        .amt-won { flex-shrink: 0; }
        .fldh-lb { font-size: 12.5px; font-weight: 400; color: #111; line-height: 1.25; white-space: nowrap; flex-shrink: 0; }
        .sec { background: #f5f5f5; text-align: center; font-weight: 400; width: 70px; }
        .hlr-in { width: 100%; border: none; background: #eaf7ef; padding: 1px 4px; font-size: 12.5px; box-sizing: border-box; outline: none; font-family: inherit; }
        .hlr-chk { cursor: pointer; font-weight: 700; white-space: nowrap; user-select: none; margin: 0 2px; }
        .hlr-inline { display: inline-block; width: 46px; border: none; background: #eaf7ef; text-align: center; padding: 2px; font-size: 12.5px; font-family: inherit; outline: none; }
        .hlr-sign td { border: none; padding: 2px 6px; }
        .hlr-stext { font-size: 11px; color: #222; line-height: 1.5; }
        .hlr-stext p { margin: 3px 0; }
        .hlr-stitle { background: #e9e9e9; text-align: center; font-weight: 800; padding: 4px; border: 1px solid #333; margin: 10px 0 6px; }
        @media print {
          /* 라벨 등 회색 배경도 인쇄 시 그대로 출력 */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          html, body { background: white !important; }
          .taf-root { position: static; background: white; overflow: visible; }
          .taf-page { margin: 0; box-shadow: none; width: auto; min-height: auto; padding: 0; page-break-after: always; }
        }
      `}</style>

      {/* 상단바(쉘에서 숨기고 상단 다크바로 대체) — '저장' 버튼은 쉘 doSave가 프로그램적으로 클릭 */}
      <div className="taf-bar no-print">
        <h2>주택 임대차 계약 신고서</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onSave && <button className="taf-btn" style={{ background: '#059669', borderColor: '#059669', color: 'white' }} onClick={async () => { const ok = await onSave(f); if (ok) onClose?.(); }}>저장</button>}
          <button className="taf-btn primary" onClick={() => window.print()}><Printer className="w-4 h-4" /> 인쇄 / 미리보기</button>
          {onClose && <button className="taf-btn" onClick={onClose}><X className="w-4 h-4" /> 닫기</button>}
        </div>
      </div>

      {/* ===== 앞쪽 ===== */}
      <div className="taf-page">
        <div className="hlr-right">부동산거래관리시스템(rtms.molit.go.kr)<br />에서도 신청할 수 있습니다.</div>
        <div className="hlr-head">■ 부동산 거래신고 등에 관한 법률 시행규칙 [별지 제5호의2서식]</div>
        <div className="hlr-sub">&lt;개정 2023. 12. 29.&gt;</div>
        <div className="hlr-title">주택 임대차 계약 신고서</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
          <span className="hlr-note" style={{ marginBottom: 0 }}>※ 뒤쪽의 유의사항·작성방법을 읽고 작성하시기 바라며, [ ]에는 해당하는 곳에 √표를 합니다.</span>
          <span className="hlr-apx" style={{ whiteSpace: 'nowrap' }}>(앞쪽)</span>
        </div>

        {/* 접수(관청 기재) — 좌상단 라벨 + 아래 수기 공간 */}
        <table className="t"><colgroup><col style={{ width: '30%' }} /><col style={{ width: '40%' }} /><col /></colgroup><tbody>
          <tr><td className="hlr-recv">접수번호</td><td className="hlr-recv">접수일시</td><td className="hlr-recv">처리기간&nbsp;&nbsp;&nbsp;지체 없이</td></tr>
        </tbody></table>

        {/* ① 임대인 — 접수번호처럼 라벨 위 / 입력창 아래. 2열 균등(수직선 정렬) */}
        <table className="t" style={{ marginTop: '10px' }}><colgroup><col style={{ width: '64px' }} /><col /><col /></colgroup><tbody>
          <tr><td className="sec" rowSpan={3}>①임대인</td>{Fld('성명(법인·단체명)', 'lessorNm')}{Fld('주민등록번호(법인·외국인등록·고유번호)', 'lessorRrn')}</tr>
          <tr>{FldH('주소(법인·단체 소재지)', 'lessorAddr', 2)}</tr>
          <tr>{FldH('전화번호', 'lessorTel')}{FldH('휴대전화번호', 'lessorMobile')}</tr>
        </tbody></table>

        {/* ② 임차인 */}
        <table className="t" style={{ marginTop: '10px' }}><colgroup><col style={{ width: '64px' }} /><col /><col /></colgroup><tbody>
          <tr><td className="sec" rowSpan={3}>②임차인</td>{Fld('성명(법인·단체명)', 'lesseeNm')}{Fld('주민등록번호(법인·외국인등록·고유번호)', 'lesseeRrn')}</tr>
          <tr>{FldH('주소(법인·단체 소재지)', 'lesseeAddr', 2)}</tr>
          <tr>{FldH('전화번호', 'lesseeTel')}{FldH('휴대전화번호', 'lesseeMobile')}</tr>
        </tbody></table>

        {/* ③ 임대 목적물 현황 — 아래 임대계약내용 표와 열(64/84/70/auto) 정렬. 값 칸은 임대료 값 칸과 수직 일치 */}
        <table className="t" style={{ marginTop: '10px' }}><colgroup><col style={{ width: '64px' }} /><col style={{ width: '84px' }} /><col style={{ width: '70px' }} /><col /></colgroup><tbody>
          <tr>
            <td className="sec" rowSpan={4}>③임대<br />목적물<br />현황</td>
            <td className="lv">종류</td>
            <td colSpan={2} style={{ textAlign: 'left' }}>
              {KINDS.map((k) => (
                <span key={k} style={{ marginRight: '8px', whiteSpace: 'nowrap' }}>{k}{Chk(f.objKind === k, () => setF((p) => ({ ...p, objKind: p.objKind === k ? '' : k })))}</span>
              ))}
            </td>
          </tr>
          <tr><td className="lv" colSpan={2} style={{ whiteSpace: 'nowrap' }}>④소재지(주소)</td><td>{In('objAddr', { width: '100%' })}</td></tr>
          <tr><td colSpan={3} style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>건물명({In('objBldg', { width: '40%' })}) &nbsp;&nbsp;{In('objDong', { width: '12%' })}동 &nbsp;&nbsp;{In('objFloor', { width: '12%' })}층 &nbsp;&nbsp;{In('objHo', { width: '12%' })}호</td></tr>
          <tr><td className="lv" colSpan={2} style={{ whiteSpace: 'nowrap' }}>⑤임대 면적(㎡)</td><td style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>{In('objArea', { width: '40%' })}㎡ &nbsp;&nbsp; 방의 수(칸) {In('objRooms', { width: '26%' })}칸</td></tr>
        </tbody></table>

        {/* 임대 계약내용 — ⑧ 계약갱신요구권까지 한 표로 묶음 */}
        <table className="t" style={{ marginTop: '10px' }}><colgroup><col style={{ width: '64px' }} /><col style={{ width: '84px' }} /><col style={{ width: '70px' }} /><col /></colgroup><tbody>
          <tr><td className="sec" rowSpan={10}>임대<br />계약<br />내용</td>
            <td className="lv" rowSpan={4}>⑥신규<br />계약<br />{Chk(f.kind === 'new', () => setF((p) => ({ ...p, kind: p.kind === 'new' ? '' : 'new' })))}</td>
            <td className="lv" rowSpan={2}>임대료</td>
            <td style={{ textAlign: 'left' }}>{Won('보증금', 'newDeposit')}</td></tr>
          <tr><td style={{ textAlign: 'left' }}>{Won('월 차임', 'newRent')}</td></tr>
          <tr><td className="lv">계약 기간</td><td style={{ textAlign: 'left' }}>{In('newStart', { width: '40%' })} ~ {In('newEnd', { width: '40%' })}</td></tr>
          <tr><td className="lv">체결일</td><td style={{ textAlign: 'left' }}>{In('newSigned', { width: '50%' })}</td></tr>

          <tr><td className="lv" rowSpan={5}>⑦갱신<br />계약<br />{Chk(f.kind === 'renew', () => setF((p) => ({ ...p, kind: p.kind === 'renew' ? '' : 'renew' })))}</td>
            <td className="lv" rowSpan={2}>종전<br />임대료</td>
            <td style={{ textAlign: 'left' }}>{Won('보증금', 'prevDeposit')}</td></tr>
          <tr><td style={{ textAlign: 'left' }}>{Won('월 차임', 'prevRent')}</td></tr>
          <tr><td className="lv" rowSpan={2}>갱신<br />임대료</td><td style={{ textAlign: 'left' }}>{Won('보증금', 'renewDeposit')}</td></tr>
          <tr><td style={{ textAlign: 'left' }}>{Won('월 차임', 'renewRent')}</td></tr>
          <tr><td className="lv">계약 기간</td><td style={{ textAlign: 'left' }}>{In('renewStart', { width: '40%' })} ~ {In('renewEnd', { width: '40%' })}</td></tr>

          {/* ⑧ 계약갱신요구권 — 계약 기간 아래, 임대 계약내용에 묶음 */}
          <tr>
            <td className="lv" colSpan={2} style={{ fontSize: '11px', whiteSpace: 'normal', lineHeight: 1.3 }}>⑧「주택임대차보호법」 제6조의3에 따른 계약갱신요구권 행사 여부</td>
            <td style={{ textAlign: 'left' }}>
              <span style={{ marginRight: '20px' }}>{Chk(f.renewalRight === '행사', () => setF((p) => ({ ...p, renewalRight: p.renewalRight === '행사' ? '' : '행사' })))} 행사</span>
              <span>{Chk(f.renewalRight === '미행사', () => setF((p) => ({ ...p, renewalRight: p.renewalRight === '미행사' ? '' : '미행사' })))} 미행사</span>
            </td>
          </tr>
        </tbody></table>

        {/* 개업공인중개사 (공동중개 2) */}
        <table className="t" style={{ marginTop: '10px' }}><colgroup><col style={{ width: '64px' }} /><col style={{ width: '110px' }} /><col /><col style={{ width: '110px' }} /><col /></colgroup><tbody>
          <tr><td className="sec" rowSpan={6}>개업공인<br />중개사</td><td className="lv">사무소 명칭</td><td>{In('agA_nm')}</td><td className="lv">사무소 명칭</td><td>{In('agB_nm')}</td></tr>
          <tr><td className="lv">사무소 소재지</td><td>{In('agA_addr')}</td><td className="lv">사무소 소재지</td><td>{In('agB_addr')}</td></tr>
          <tr><td className="lv">대표자 성명</td><td>{In('agA_rep')}</td><td className="lv">대표자 성명</td><td>{In('agB_rep')}</td></tr>
          <tr><td className="lv">등록번호</td><td>{In('agA_reg')}</td><td className="lv">등록번호</td><td>{In('agB_reg')}</td></tr>
          <tr><td className="lv">전화번호</td><td>{In('agA_tel')}</td><td className="lv">전화번호</td><td>{In('agB_tel')}</td></tr>
          <tr><td className="lv">소속공인중개사 성명</td><td>{In('agA_assoc')}</td><td className="lv">소속공인중개사 성명</td><td>{In('agB_assoc')}</td></tr>
        </tbody></table>

        {/* 신고 문구 + 신고일 + 신고인 (이미지 레이아웃) */}
        <div style={{ marginTop: '14px', fontSize: '12.5px', lineHeight: 1.7 }}>
          「부동산 거래신고 등에 관한 법률」 제6조의2 및 같은 법 시행규칙 제6조의2에 따라 위와 같이 주택 임대차 계약 내용을 신고합니다.
        </div>
        <div style={{ textAlign: 'right', margin: '2px 0 4px', fontSize: '13px', whiteSpace: 'nowrap' }}>
          {In('reportY', { width: '54px', textAlign: 'center' })} 년 &nbsp;&nbsp;{In('reportM', { width: '44px', textAlign: 'center' })} 월 &nbsp;&nbsp;{In('reportD', { width: '44px', textAlign: 'center' })} 일
        </div>
        <table className="t hlr-sign" style={{ width: '100%' }}>
          <colgroup><col /><col style={{ width: '84px' }} /><col style={{ width: '42%' }} /><col style={{ width: '120px' }} /></colgroup>
          <tbody>
            <tr>
              <td rowSpan={3} style={{ textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, fontSize: '14px' }}>신고인</td>
              <td style={{ textAlign: 'right' }}>임대인 :</td><td style={{ fontWeight: 600, paddingLeft: '6px' }}>{f.lessorNm || ''}</td><td style={{ color: '#777', textAlign: 'right' }}>(서명 또는 인)</td>
            </tr>
            <tr><td style={{ textAlign: 'right' }}>임차인 :</td><td style={{ fontWeight: 600, paddingLeft: '6px' }}>{f.lesseeNm || ''}</td><td style={{ color: '#777', textAlign: 'right' }}>(서명 또는 인)</td></tr>
            <tr><td style={{ textAlign: 'right', verticalAlign: 'top' }}>제출인 :<div style={{ fontSize: '10.5px', color: '#555' }}>(제출 대행시)</div></td><td>{In('signSubmit', { width: '92%' })}</td><td style={{ color: '#777', textAlign: 'right' }}>(서명 또는 인)</td></tr>
          </tbody>
        </table>
        <div style={{ marginTop: '10px', fontSize: '16px', fontWeight: 800 }}>시장·군수·구청장 (읍·면·동장·출장소장) 귀하</div>
      </div>

      {/* ===== 뒤쪽 (첨부서류 · 유의사항 · 작성방법 · 처리절차) ===== */}
      <div className="taf-page hlr-stext">
        <div className="hlr-apx">(뒤쪽)</div>
        <table className="t"><colgroup><col style={{ width: '64px' }} /><col /></colgroup><tbody>
          <tr><td className="sec">첨부서류</td><td style={{ textAlign: 'left' }}>
            <p>1. 주택 임대차 계약서(확정일자를 부여받으려는 경우 및 시행규칙 제6조의2제3항·제5항·제9항에 따른 경우만 해당)</p>
            <p>2. 입금표·통장사본 등 주택 임대차 계약 체결 사실을 입증할 수 있는 서류 등(계약서를 작성하지 않은 경우만 해당) 및 계약갱신요구권 행사 여부를 확인할 수 있는 서류 등</p>
            <p>3. 단독신고사유서(시행규칙 제6조의2제5항에 따라 단독으로 신고서를 제출하는 경우만 해당)</p>
          </td></tr>
        </tbody></table>

        <div className="hlr-stitle">유의사항</div>
        <p>1. 주택 임대차 계약 당사자는 이 신고서에 공동으로 서명 또는 날인해 당사자 중 일방이 신고서를 제출해야 하며, 당사자 중 일방이 국가·지방자치단체·공공기관·지방직영기업·지방공사·지방공단인 경우(국가등)에는 국가등이 신고해야 합니다.</p>
        <p>2. 당사자가 다수의 임대인 또는 임차인인 경우 계약서에 서명·날인한 임대인 및 임차인 1명의 인적사항을 적어 제출할 수 있습니다.</p>
        <p>3. 당사자 일방이 계약서 또는 입금증·통장사본 등 체결 사실 입증서류(계약서 미작성 시만 해당), 계약갱신요구권 행사 여부 확인서류 등을 제출하는 경우 당사자가 공동으로 신고한 것으로 봅니다.</p>
        <p>4. 신고인이 제1항 각 호 사항이 모두 적힌 계약서를 신고관청에 제출하면 신고서를 제출하지 않아도 됩니다. 다만 계약서로 작성 항목 전부를 확인할 수 없으면 신고서 제출을 요구할 수 있습니다.</p>
        <p>5. 당사자로부터 신고서 작성·제출을 위임받은 자는 제출인란에 서명 또는 날인해 제출해야 합니다.</p>
        <p>6. 계약 체결일부터 30일 이내에 신고하지 않거나 거짓으로 신고하는 경우 100만원 이하의 과태료가 부과됩니다.</p>
        <p>7. 신고한 계약의 보증금·차임 등 가격이 변경되거나 계약이 해제된 경우에도 변경·해제가 확정된 날부터 30일 이내에 신고해야 합니다.</p>

        <div className="hlr-stitle">작성방법</div>
        <p>①·② 임대인·임차인의 성명·주민등록번호 등 인적사항을 적습니다(당사자가 다수인 경우 계약서에 서명·날인한 1명의 인적사항).</p>
        <p>③ 종류란에는 임대차 대상 주택의 종류에 √표시(모를 경우 건축물대장의 용도 참고).</p>
        <p>④ 소재지(주소)·건물명·동·층·호를 적습니다(구분등기 안 된 다가구·고시원 등 일부 임대도 동·층·호 기재).</p>
        <p>⑤ 임대 면적은 집합건축물은 전용면적, 그 밖의 건축물은 연면적. 일부 임대 시 임대 대상 면적만 적고, 모르면 방의 수(칸)를 적습니다.</p>
        <p>⑥·⑦ 신규/갱신 중 해당하는 곳에 √표시하고 보증금·월 차임, 계약 기간, 체결일을 각 란에 적습니다.</p>
        <p>⑧ 갱신 계약에 √표시한 경우 계약갱신요구권 행사 여부를 “행사/미행사”에 √표시합니다.</p>
        <p>※ 같은 당사자라도 소재지가 다른 다수 주택을 일괄 체결한 경우 임대 목적물별로 각각 신고서를 작성·제출해야 합니다.</p>

        <div className="hlr-stitle">처리절차</div>
        <p>신고서 작성(인터넷·방문) → 접수 → 신고처리 → 주택 임대차 계약 신고필증 발급</p>
        <p style={{ color: '#555' }}>처리기관: 시·군·구(읍·면·동장·출장소) 담당부서</p>
      </div>
    </div>
  );
}
