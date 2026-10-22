import { useState, useEffect } from 'react';
import { X, Printer } from 'lucide-react';

/**
 * 중개대상물 확인ㆍ설명서[Ⅳ] (입목ㆍ광업재단ㆍ공장재단) — 공인중개사법 시행규칙 [별지 제20호의4서식]
 *  · 3쪽 구성(작성방법 쪽 포함). 토지[Ⅲ] 폼(ConfirmExplainFormIII.jsx)의 형제 컴포넌트.
 *  · props: { onClose, initial, onSave, onPrint, inline }
 */
const BLANK = {
  입목_거래: '',
  근거: {}, 근거기타: '',
  자료요구: '',
  // ① 대상물건의 표시
  입목_종별: '', 토지_소재지: '',
  // ② 권리관계
  소유권_성명: '', 소유권_주소: '', 소유권외_권리: '',
  // ③ 재단목록 또는 입목의 생육상태
  재단목록: '',
  // ④ 그 밖의 참고사항
  그밖의참고: '',
  // ⑤ 거래예정금액 등
  거래예정금액: '', 개별공시지가: '', 건물공시가격: '',
  // ⑥ 취득 시 부담할 조세
  취득세: '', 농특세: '', 지방교육세: '',
  // ⑦ 실제 권리관계 또는 공시되지 않은 물건의 권리 사항
  실제권리_내용: '',
  // ⑧ 중개보수 등
  중개보수_금액: '', 실비_금액: '', 계_금액: '', 지급시기: '', 산출_중개보수: '', 산출_실비: '',
  작성_년: '', 작성_월: '', 작성_일: '',
  매도인_주소: '', 매도인_성명: '', 매도인_생년월일: '', 매도인_전화: '',
  매수인_주소: '', 매수인_성명: '', 매수인_생년월일: '', 매수인_전화: '',
  중개사1_등록번호: '', 중개사1_대표자: '', 중개사1_명칭: '', 중개사1_소속: '', 중개사1_소재지: '', 중개사1_전화: '',
  중개사2_등록번호: '', 중개사2_대표자: '', 중개사2_명칭: '', 중개사2_소속: '', 중개사2_소재지: '', 중개사2_전화: '',
};

const 근거목록 = ['등기권리증', '등기사항증명서', '토지대장', '건축물대장', '지적도', '임야도', '토지이용계획확인서'];

export default function ConfirmExplainFormIV({ onClose, initial = null, onSave = null, onChange = null, onPrint = null, inline = false }) {
  const [f, setF] = useState(() => (initial && typeof initial === 'object' ? { ...BLANK, ...initial, 근거: { ...(initial.근거 || {}) } } : { ...BLANK }));
  // 입력값을 부모로 통지 — 계약서 화면 '저장' 시 계약서·확인설명서·개인정보동의서 일괄 저장용
  useEffect(() => { onChange?.(f); }, [f]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const tgl = (k) => setF((p) => ({ ...p, [k]: !p[k] }));
  const setR = (k, v) => setF((p) => ({ ...p, [k]: p[k] === v ? '' : v })); // 라디오형 토글
  const tglGeun = (name) => setF((p) => ({ ...p, 근거: { ...p.근거, [name]: !p.근거?.[name] } }));
  const ChkO = (objKey, name, label) => (
    <span className="ce-chk" onClick={() => setF((p) => ({ ...p, [objKey]: { ...p[objKey], [name]: !p[objKey]?.[name] } }))}>[{f[objKey]?.[name] ? '√' : '  '}]{label ? ` ${label}` : ''}</span>
  );

  const In = (k, w) => <input value={f[k] ?? ''} onChange={set(k)} className="ce-in" style={w ? { width: w } : undefined} />;
  // 서명란 — 성명 입력창(가변) + '(서명 ...)' 문구를 항상 우측 끝에 고정(값이 비어도 미리보기·인쇄에서 우측 정렬)
  const Sign = (k, label = '(서명 또는 날인)') => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ flex: '1 1 auto', minWidth: 0 }}>{In(k)}</span>
      <span style={{ fontSize: '9px', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
  const Chk = (on, onClick, label) => (
    <span className="ce-chk" onClick={onClick}>[{on ? '√' : '  '}]{label ? ` ${label}` : ''}</span>
  );

  return (
    <div className={`ce-root${inline ? ' ce-inline' : ''}`}>
      <style>{`
        .ce-root { position: fixed; inset: 0; background: #eef1f5; overflow: auto; display: flex; flex-direction: column; }
        .ce-root.ce-inline { position: relative; inset: auto; height: 100%; flex: 1; min-height: 0; }
        .ce-bar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 14px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
        .ce-bar h2 { font-size: 14px; font-weight: 700; color: #111827; margin: 0; }
        .ce-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 13px; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 4px; background: white; color: #374151; cursor: pointer; white-space: nowrap; }
        .ce-btn.primary { background: #4f46e5; border-color: #4f46e5; color: white; }
        .ce-page { width: 210mm; min-height: 297mm; margin: 10px auto; background: white; padding: 20mm 20mm 10mm 20mm; box-sizing: border-box; box-shadow: 0 2px 14px rgba(0,0,0,.15); font-family: '굴림','Gulim','돋움','Dotum','Malgun Gothic',sans-serif; color: #000; font-size: 12px; line-height: 1.4; zoom: 1; }
        .ce-page input, .ce-page th, .ce-page td, .ce-page span, .ce-page div { font-family: '굴림','Gulim','돋움','Dotum','Malgun Gothic',sans-serif; color: #000; }
        .ce-head { display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px; }
        .ce-rule { font-weight: 400; }
        .ce-title { text-align: center; font-size: 15px; font-weight: 800; letter-spacing: 1px; margin: 8px 0 8px; }
        .ce-type { text-align: center; font-size: 13px; font-weight: 400; margin: 2px 0; }
        .ce-type .lab { font-weight: 600; }
        .ce-nw { word-break: keep-all !important; overflow-wrap: anywhere !important; }
        .ce-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 6px; }
        .ce-tbl th, .ce-tbl td { border: 1px solid #000; padding: 3px 5px; font-size: 11px; vertical-align: middle; word-break: break-all; }
        /* 서식 전체 — 젤 좌측·젤 우측(바깥쪽) 세로 테두리 제거 */
        .ce-tbl tr > td:first-child, .ce-tbl tr > th:first-child { border-left: none; }
        .ce-tbl tr > td:last-child, .ce-tbl tr > th:last-child { border-right: none; }
        .ce-num { font-size: 12px !important; font-weight: 400; }
        .ce-sign td { padding-top: 9px; padding-bottom: 9px; }
        .ce-lh { background: transparent; font-weight: 400; text-align: center; padding-left: 3px; padding-right: 3px; font-size: 10.5px; word-break: keep-all; overflow-wrap: anywhere; }
        .ce-tbl td[style*="left"] { padding-left: 5px; padding-right: 5px; }
        .ce-band { background: #f3f4f6; font-weight: 700; text-align: center; }
        /* 유의사항 — 안내 문구가 길어 글자크기 축소(밴드 '유의사항' 제외) */
        .ce-caution td, .ce-caution .ce-lh { font-size: 9px; line-height: 1.3; }
        .ce-caution .ce-band { font-size: 11px; }
        /* 투기지역 여부 — 체크박스 3개 가로 1줄 배치 */
        .ce-tugi .ce-chk { font-size: 9px; margin-right: 4px; }
        .ce-sec { font-size: 13px; font-weight: 800; margin: 4px 0 2px; }
        .ce-in { width: 100%; border: 1px solid #94a3b8; border-radius: 3px; background: #fff; padding: 1px 4px; font-size: 11px; font-family: inherit; color: #000; outline: none; box-sizing: border-box; }
        .ce-ta { width: 100%; min-height: 84px; border: 1px solid #94a3b8; border-radius: 3px; background: #fff; padding: 2px 4px; font-size: 11px; font-family: inherit; color: #000; outline: none; box-sizing: border-box; resize: vertical; display: block; }
        .ce-chk { cursor: pointer; user-select: none; white-space: nowrap; margin-right: 10px; display: inline-block; font-size: 11px; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: white !important; }
          .ce-root { position: static; background: white; overflow: visible; }
          .ce-page { margin: 0; box-shadow: none; width: auto; min-height: auto; padding: 0; zoom: 1; }
          .ce-in, .ce-ta { background: transparent; border: none; border-radius: 0; }
          @page { size: A4; margin: 20mm 20mm 10mm 20mm; }
        }
      `}</style>

      {/* 상단 툴바 (인쇄 시 숨김) */}
      <div className="ce-bar no-print">
        <h2>중개대상물 확인ㆍ설명서[Ⅳ] (입목ㆍ광업재단ㆍ공장재단) · 1/3쪽</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onSave && <button className="ce-btn" style={{ background: '#059669', borderColor: '#059669', color: 'white' }} onClick={async () => { const ok = await onSave(f); if (ok && !inline) onClose?.(); }}>저장</button>}
          <button className="ce-btn primary" onClick={() => (onPrint ? onPrint() : window.print())}><Printer className="w-4 h-4" /> 미리보기 및 인쇄</button>
          {onClose && !inline && <button className="ce-btn" onClick={onClose}><X className="w-4 h-4" /> 닫기</button>}
        </div>
      </div>

      {/* A4 서식 — 제1쪽 */}
      <div className="ce-page">
        <div className="ce-head">
          <span className="ce-rule">■ 공인중개사법 시행규칙 [별지 제20호의4서식] &lt;개정 2021. 12. 31.&gt;</span>
          <span>(3쪽 중 제1쪽)</span>
        </div>

        <div className="ce-title">중개대상물 확인ㆍ설명서[Ⅳ] (입목ㆍ광업재단ㆍ공장재단)</div>

        <div className="ce-type">
          (&nbsp;&nbsp;
          {Chk(f.입목_거래 === '매매교환', () => setR('입목_거래', '매매교환'), '매매ㆍ교환')}
          {Chk(f.입목_거래 === '임대', () => setR('입목_거래', '임대'), '임대')}
          &nbsp;)
        </div>

        {/* 확인ㆍ설명 자료 */}
        <table className="ce-tbl">
          <colgroup><col style={{ width: '13%' }} /><col style={{ width: '13%' }} /><col style={{ width: '74%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="ce-lh" rowSpan={2}>확인ㆍ설명<br />자료</td>
              <td className="ce-lh">확인ㆍ설명<br />근거자료 등</td>
              <td style={{ textAlign: 'left' }}>
                {근거목록.map((n) => Chk(!!f.근거?.[n], () => tglGeun(n), n))}
                <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}><span className="ce-chk" style={{ marginRight: 0 }} onClick={() => tglGeun('그밖의자료')}>[{f.근거?.['그밖의자료'] ? '√' : '  '}] 그 밖의 자료(</span>
                <input value={f.근거기타 ?? ''} onChange={set('근거기타')} className="ce-in" style={{ width: '200px', display: 'inline-block' }} />)</span>
              </td>
            </tr>
            <tr>
              <td className="ce-lh">대상물건의<br />상태에 관한<br />자료요구 사항</td>
              <td>{In('자료요구')}</td>
            </tr>
          </tbody>
        </table>

        {/* 유의사항 — 위(확인ㆍ설명 자료 표)와 붙임. 글자크기 축소 */}
        <table className="ce-tbl ce-caution" style={{ marginTop: '-1px' }}>
          <colgroup><col style={{ width: '20%' }} /><col style={{ width: '80%' }} /></colgroup>
          <tbody>
            <tr><td className="ce-band" colSpan={2}>유의사항</td></tr>
            <tr>
              <td className="ce-lh">개업공인중개사의<br />확인ㆍ설명 의무</td>
              <td style={{ textAlign: 'left' }}>개업공인중개사는 중개대상물에 관한 권리를 취득하려는 중개의뢰인에게 성실ㆍ정확하게 설명하고, 토지대장등본, 등기사항증명서 등 설명의 근거자료를 제시해야 합니다.</td>
            </tr>
            <tr>
              <td className="ce-lh">실제 거래가격<br />신고</td>
              <td style={{ textAlign: 'left' }}>「부동산 거래신고 등에 관한 법률」 제3조 및 같은 법 시행령 제3조제1항제5호에 따른 실제 거래가격은 매수인이 매수한 부동산을 양도하는 경우 「소득세법」 제97조제1항 및 제7항과 같은 법 시행령 제163조제11항제2호에 따라 취득 당시의 실제 거래가액으로 보아 양도차익이 계산될 수 있음을 유의하시기 바랍니다.</td>
            </tr>
          </tbody>
        </table>

        <div className="ce-sec">Ⅰ. 개업공인중개사 기본 확인사항</div>

        {/* ① 대상물건의 표시 */}
        <table className="ce-tbl">
          <colgroup>
            <col style={{ width: '12%' }} /><col style={{ width: '8%' }} /><col style={{ width: '18%' }} /><col style={{ width: '62%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="ce-lh ce-nw ce-num" rowSpan={2}>① 대상물건<br />의 표시</td>
              <td className="ce-lh" rowSpan={2}>토지</td>
              <td className="ce-lh ce-nw">대상물 종별</td>
              <td style={{ textAlign: 'left' }}>
                {Chk(f.입목_종별 === '입목', () => setR('입목_종별', '입목'), '입목')}
                {Chk(f.입목_종별 === '광업재단', () => setR('입목_종별', '광업재단'), '광업재단')}
                {Chk(f.입목_종별 === '공장재단', () => setR('입목_종별', '공장재단'), '공장재단')}
              </td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw">소재지<br />(등기ㆍ등록지)</td>
              <td>{In('토지_소재지')}</td>
            </tr>
          </tbody>
        </table>

        {/* ② 권리관계 */}
        <table className="ce-tbl">
          <colgroup>
            <col style={{ width: '12%' }} /><col style={{ width: '12%' }} /><col style={{ width: '16%' }} /><col style={{ width: '10%' }} /><col style={{ width: '50%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="ce-lh ce-nw ce-num" rowSpan={3}>② 권리관계</td>
              <td className="ce-lh" rowSpan={3}>등기부<br />기재사항</td>
              <td className="ce-lh ce-nw" rowSpan={2}>소유권에<br />관한 사항</td>
              <td className="ce-lh">성명</td>
              <td>{In('소유권_성명')}</td>
            </tr>
            <tr>
              <td className="ce-lh">주소</td>
              <td>{In('소유권_주소')}</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw" colSpan={2}>소유권 외의<br />권리사항</td>
              <td>{In('소유권외_권리')}</td>
            </tr>
          </tbody>
        </table>

        {/* ③ 재단목록 또는 입목의 생육상태 */}
        <table className="ce-tbl">
          <colgroup><col style={{ width: '22%' }} /><col style={{ width: '78%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="ce-lh ce-nw ce-num">③ 재단목록 또는<br />입목의 생육상태</td>
              <td style={{ padding: '2px' }}><textarea value={f.재단목록 ?? ''} onChange={set('재단목록')} className="ce-ta" style={{ minHeight: '90px' }} /></td>
            </tr>
          </tbody>
        </table>

        {/* ④ 그 밖의 참고사항 */}
        <table className="ce-tbl">
          <colgroup><col style={{ width: '22%' }} /><col style={{ width: '78%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="ce-lh ce-nw ce-num">④ 그 밖의<br />참고사항</td>
              <td style={{ padding: '2px' }}><textarea value={f.그밖의참고 ?? ''} onChange={set('그밖의참고')} className="ce-ta" style={{ minHeight: '90px' }} /></td>
            </tr>
          </tbody>
        </table>

        {/* ⑤ 거래예정금액 등 */}
        <table className="ce-tbl">
          <colgroup>
            <col style={{ width: '20%' }} /><col style={{ width: '16%' }} /><col style={{ width: '28%' }} />
            <col style={{ width: '17%' }} /><col style={{ width: '19%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="ce-lh ce-nw ce-num" rowSpan={2}>⑤ 거래예정 금액 등</td>
              <td className="ce-lh">거래예정금액</td>
              <td colSpan={3}>{In('거래예정금액')}</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw">개별공시지가<br />(㎡당)</td>
              <td>{In('개별공시지가')}</td>
              <td className="ce-lh ce-nw">건물(주택)<br />공시가격</td>
              <td>{In('건물공시가격')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== 제2쪽 ===== */}
      <div className="ce-page">
        <div className="ce-head"><span /><span>(3쪽 중 제2쪽)</span></div>

        {/* ⑥ 취득 시 부담할 조세 */}
        <table className="ce-tbl">
          <colgroup>
            <col style={{ width: '20%' }} /><col style={{ width: '11%' }} /><col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} /><col style={{ width: '13%' }} /><col style={{ width: '12%' }} /><col style={{ width: '18%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="ce-lh ce-nw ce-num" rowSpan={2}>⑥ 취득 시 부담할<br />조세의 종류 및 세율</td>
              <td className="ce-lh">취득세</td>
              <td>{In('취득세', '60%')} %</td>
              <td className="ce-lh ce-nw">농어촌특별세</td>
              <td>{In('농특세', '60%')} %</td>
              <td className="ce-lh ce-nw">지방교육세</td>
              <td>{In('지방교육세', '55%')} %</td>
            </tr>
            <tr>
              <td colSpan={6} style={{ textAlign: 'left', fontSize: '9px' }}>※ 재산세는 6월 1일 기준 대상물건 소유자가 납세의무를 부담</td>
            </tr>
          </tbody>
        </table>

        <div className="ce-sec">Ⅱ. 개업공인중개사 세부 확인사항</div>

        {/* ⑦ 실제 권리관계 */}
        <table className="ce-tbl">
          <tbody>
            <tr><td className="ce-lh ce-num" style={{ textAlign: 'left' }}>⑦ 실제 권리관계 또는 공시되지 않은 물건의 권리 사항</td></tr>
            <tr><td style={{ padding: '2px' }}><textarea value={f.실제권리_내용 ?? ''} onChange={set('실제권리_내용')} className="ce-ta" style={{ minHeight: '120px' }} /></td></tr>
          </tbody>
        </table>

        <div className="ce-sec">Ⅲ. 중개보수 등에 관한 사항</div>

        {/* ⑧ 중개보수 및 실비의 금액과 산출내역 */}
        <table className="ce-tbl ce-sign">
          <colgroup><col style={{ width: '14%' }} /><col style={{ width: '14%' }} /><col style={{ width: '32%' }} /><col style={{ width: '40%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="ce-lh ce-nw ce-num" rowSpan={4}>⑧ 중개보수<br />및 실비의<br />금액과<br />산출내역</td>
              <td className="ce-lh">중개보수</td>
              <td>{In('중개보수_금액')}</td>
              <td rowSpan={4} style={{ textAlign: 'left', verticalAlign: 'top', fontSize: '9px', lineHeight: 1.5 }}>
                {'<산출내역>'}<br />
                중개보수: {In('산출_중개보수', '65%')}<br />
                실　　비: {In('산출_실비', '65%')}<br />
                ※ 중개보수는 거래금액의 1천분의 9 이내에서 중개의뢰인과 개업공인중개사가 서로 협의하여 결정하며, 부가가치세는 별도로 부과될 수 있습니다.
              </td>
            </tr>
            <tr><td className="ce-lh">실비</td><td>{In('실비_금액')}</td></tr>
            <tr><td className="ce-lh">계</td><td>{In('계_금액')}</td></tr>
            <tr><td className="ce-lh">지급시기</td><td>{In('지급시기')}</td></tr>
          </tbody>
        </table>

        <div style={{ fontSize: '11px', lineHeight: 1.6, margin: '8px 2px 0' }}>
          「공인중개사법」 제25조제3항 및 제30조제5항에 따라 거래당사자는 개업공인중개사로부터 위 중개대상물에 관한 확인ㆍ설명 및 손해배상책임의 보장에 관한 설명을 듣고, 같은 법 시행령 제21조제3항에 따른 본 확인ㆍ설명서와 같은 법 시행령 제24조제2항에 따른 손해배상책임 보장 증명서류(사본 또는 전자문서)를 수령합니다.
          <div style={{ textAlign: 'right', marginTop: '12px', fontWeight: 700 }}>{In('작성_년', '54px')} 년 　 {In('작성_월', '44px')} 월 　 {In('작성_일', '44px')} 일</div>
        </div>

        {/* 서명란 */}
        <table className="ce-tbl ce-sign" style={{ marginTop: '6px' }}>
          <colgroup><col style={{ width: '15%' }} /><col style={{ width: '13%' }} /><col style={{ width: '26%' }} /><col style={{ width: '17%' }} /><col style={{ width: '29%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="ce-lh ce-nw" rowSpan={2}>매도인<br />(임대인)</td>
              <td className="ce-lh">주소</td>
              <td>{In('매도인_주소')}</td>
              <td className="ce-lh">성명</td>
              <td>{Sign('매도인_성명')}</td>
            </tr>
            <tr>
              <td className="ce-lh">생년월일</td><td>{In('매도인_생년월일')}</td>
              <td className="ce-lh">전화번호</td><td>{In('매도인_전화')}</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw" rowSpan={2}>매수인<br />(임차인)</td>
              <td className="ce-lh">주소</td>
              <td>{In('매수인_주소')}</td>
              <td className="ce-lh">성명</td>
              <td>{Sign('매수인_성명')}</td>
            </tr>
            <tr>
              <td className="ce-lh">생년월일</td><td>{In('매수인_생년월일')}</td>
              <td className="ce-lh">전화번호</td><td>{In('매수인_전화')}</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw" rowSpan={3}>개업<br />공인중개사</td>
              <td className="ce-lh">등록번호</td>
              <td>{In('중개사1_등록번호')}</td>
              <td className="ce-lh ce-nw">성명(대표자)</td>
              <td>{Sign('중개사1_대표자', '(서명 및 날인)')}</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw">사무소 명칭</td>
              <td>{In('중개사1_명칭')}</td>
              <td className="ce-lh ce-nw">소속공인중개사</td>
              <td>{Sign('중개사1_소속', '(서명 및 날인)')}</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw">사무소 소재지</td>
              <td>{In('중개사1_소재지')}</td>
              <td className="ce-lh">전화번호</td>
              <td>{In('중개사1_전화')}</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw" rowSpan={3}>개업<br />공인중개사</td>
              <td className="ce-lh">등록번호</td>
              <td>{In('중개사2_등록번호')}</td>
              <td className="ce-lh ce-nw">성명(대표자)</td>
              <td>{Sign('중개사2_대표자', '(서명 및 날인)')}</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw">사무소 명칭</td>
              <td>{In('중개사2_명칭')}</td>
              <td className="ce-lh ce-nw">소속공인중개사</td>
              <td>{Sign('중개사2_소속', '(서명 및 날인)')}</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw">사무소 소재지</td>
              <td>{In('중개사2_소재지')}</td>
              <td className="ce-lh">전화번호</td>
              <td>{In('중개사2_전화')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== 제3쪽 — 작성방법 ===== */}
      <div className="ce-page">
        <div className="ce-head"><span /><span>(3쪽 중 제3쪽)</span></div>
        <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '13px', background: '#f3f4f6', border: '1px solid #000', padding: '5px', margin: '4px 0 8px' }}>작성방법(입목ㆍ광업재단ㆍ공장재단)</div>
        <div style={{ fontSize: '10px', lineHeight: 1.6 }}>
          <p style={{ fontWeight: 800, margin: '4px 0' }}>&lt;작성일반&gt;</p>
          <p style={{ margin: '4px 0' }}>1. "[ ]"있는 항목은 해당하는 "[ ]"안에 √로 표시합니다.</p>
          <p style={{ margin: '4px 0' }}>2. 세부항목 작성 시 해당 내용을 작성란에 모두 작성할 수 없는 경우에는 별지로 작성하여 첨부하고, 해당란에는 "별지 참고"라고 적습니다.</p>

          <p style={{ fontWeight: 800, margin: '8px 0 4px' }}>&lt;세부항목&gt;</p>
          <p style={{ margin: '4px 0' }}>1. 「확인ㆍ설명 자료」 항목의 "확인ㆍ설명 근거자료 등"에는 개업공인중개사가 확인ㆍ설명 과정에서 제시한 자료를 적으며, "대상물건의 상태에 관한 자료요구 사항"에는 매도(임대)의뢰인에게 요구한 사항 및 그 관련 자료의 제출 여부와 ⑦ 실제 권리관계 또는 공시되지 않은 물건의 권리 사항의 항목을 확인하기 위한 자료요구 및 그 불응 여부를 적습니다.</p>
          <p style={{ margin: '4px 0' }}>2. ① 대상물건의 표시부터 ⑥ 취득 시 부담할 조세의 종류 및 세율까지는 개업공인중개사가 확인한 사항을 적어야 합니다.</p>
          <p style={{ margin: '4px 0' }}>3. ① 대상물건의 표시는 대상물건별 등기사항증명서 등을 확인하여 적습니다.</p>
          <p style={{ margin: '4px 0' }}>4. ② 권리관계의 "등기부 기재사항"은 등기사항증명서를 확인하여 적습니다.</p>
          <p style={{ margin: '4px 0' }}>5. ③ 재단목록 또는 입목의 생육상태는 공장재단의 경우에는 공장재단 목록과 공장재단 등기사항증명서를, 광업재단의 경우에는 광업재단 목록과 광업재단 등기사항증명서를, 입목의 경우에는 입목등록원부와 입목 등기사항증명서를 확인하여 적습니다.</p>
          <p style={{ margin: '4px 0' }}>6. ⑤ 거래예정금액 등의 "거래예정금액"은 중개가 완성되기 전의 거래예정금액을 적으며, "개별공시지가" 및 "건물(주택)공시가격"은 해당하는 경우에 중개가 완성되기 전 공시된 공시지가 또는 공시가격을 적습니다[임대차계약의 경우에는 "개별공시지가" 및 "건물(주택)공시가격"을 생략할 수 있습니다].</p>
          <p style={{ margin: '4px 0' }}>7. ⑥ 취득 시 부담할 조세의 종류 및 세율은 중개가 완성되기 전 「지방세법」의 내용을 확인하여 적습니다(임대차의 경우에는 제외합니다).</p>
          <p style={{ margin: '4px 0' }}>8. ⑦ 실제 권리관계 또는 공시되지 않은 물건의 권리 사항은 매도(임대)의뢰인이 고지한 사항(임대차, 법정지상권, 법정저당권, 유치권, 계약 전 소유권 변동여부 등)을 적습니다.</p>
          <p style={{ margin: '2px 0 4px', paddingLeft: '16px' }}>※ 임대차계약이 있는 경우 임대보증금, 월 단위의 차임액, 계약기간 등을 확인하고, 근저당 등이 설정된 경우 채권최고액을 확인하여 적습니다. 그 밖에 경매 및 공매 등의 특이사항이 있는 경우 이를 확인하여 적습니다.</p>
          <p style={{ margin: '4px 0' }}>9. ⑧ 중개보수 및 실비의 금액과 산출내역의 "중개보수"는 거래예정금액을 기준으로 계산하고, "산출내역(중개보수)"은 "거래예정금액(임대차의 경우에는 임대보증금 + 월 단위의 차임액 × 100) × 중개보수 요율"과 같이 적습니다. 다만, 임대차로서 거래예정금액이 5천만원 미만인 경우에는 "임대보증금 + 월 단위의 차임액 × 70"을 거래예정금액으로 합니다.</p>
          <p style={{ margin: '4px 0' }}>10. 공동중개 시 참여한 개업공인중개사(소속공인중개사를 포함합니다)는 모두 서명ㆍ날인해야 하며, 2명을 넘는 경우에는 별지로 작성하여 첨부합니다.</p>
        </div>
      </div>
    </div>
  );
}
