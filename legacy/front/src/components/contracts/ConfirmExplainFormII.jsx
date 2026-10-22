import { useState, useEffect } from 'react';
import { X, Printer } from 'lucide-react';

/**
 * 중개대상물 확인ㆍ설명서[Ⅱ] (비주거용 건축물) — 공인중개사법 시행규칙 [별지 제20호의2서식]
 *  · 4쪽 구성(작성방법 쪽 제외). 주거용[Ⅰ] 폼(ConfirmExplainForm.jsx)의 형제 컴포넌트.
 *  · props: { onClose, initial, onSave, onPrint, inline }
 */
const BLANK = {
  비주_유형: '', 비주_거래: '',
  근거: {}, 근거기타: '',
  자료요구: '',
  // ① 대상물건의 표시
  토지_소재지: '', 토지_면적: '', 토지_공부지목: '', 토지_실제지목: '',
  건물_전용면적: '', 건물_대지지분: '', 건물_준공년도: '', 건물_대장용도: '', 건물_실제용도: '',
  건물_구조: '', 건물_방향: '', 건물_방향기준: '', 건물_내진설계: '', 건물_내진능력: '',
  건물_위반여부: '', 건물_위반내용: '',
  // ② 권리관계
  등기_소유권_토지: '', 등기_소유권_건축물: '', 등기_소유권외_토지: '', 등기_소유권외_건축물: '',
  민간_장기일반: false, 민간_공공지원: false, 민간_그밖에: false, 민간_그밖에텍스트: '', 민간_미등록: false,
  임대의무기간: '', 임대개시일: '',
  갱신_확인: false, 갱신_미확인: false, 갱신_해당없음: false,
  // ③ 토지이용계획·공법상 이용제한·거래규제
  용도지역: '', 용도지구: '', 용도구역: '', 건폐율: '', 용적률: '',
  도시군계획시설: '', 허가_토지거래: false,
  투기_토지: false, 투기_주택: false, 투기_과열: false,
  지구단위계획: '', 그밖의이용제한: '',
  // ④ 입지조건
  도로_가로: '', 도로_세로: '', 도로_포장: false, 도로_비포장: false, 접근_용이: false, 접근_불편: false,
  버스_정류장: '', 버스_도보: false, 버스_차량: false, 버스_시간: '',
  지하철_역: '', 지하철_도보: false, 지하철_차량: false, 지하철_시간: '',
  주차_없음: false, 주차_전용: false, 주차_공동: false, 주차_그밖에: false, 주차_그밖에텍스트: '',
  // ⑤ 관리에 관한 사항
  경비_있음: false, 경비_없음: false, 관리주체_위탁: false, 관리주체_자체: false, 관리주체_그밖에: false,
  // ⑥ 거래예정금액 등
  거래예정금액: '', 개별공시지가: '', 건물공시가격: '',
  // ⑦ 취득 시 부담할 조세
  취득세: '', 농특세: '', 지방교육세: '',
  // ⑧ 실제 권리관계 또는 공시되지 않은 물건의 권리 사항
  실제권리_내용: '',
  // ⑨ 내부ㆍ외부 시설물의 상태(건축물)
  수도_파손: '', 수도_파손위치: '', 수도_용수량: '', 수도_용수량위치: '',
  전기_공급: '', 전기_교체부분: '',
  가스_공급방식: '', 가스_그밖에: '',
  소방_소화전: '', 소방_소화전위치: '', 소방_비상벨: '', 소방_비상벨위치: '',
  난방_공급방식: '', 난방_시설작동: '', 난방_수선내용: '', 난방_사용연한: '', 난방_확인불가: false,
  난방_종류: '', 난방_종류그밖에: '',
  승강기: '', 승강기_상태: '', 배수: '', 배수_내용: '', 그밖의시설물: '',
  // ⑩ 벽면 및 바닥면
  벽면_균열: '', 벽면_균열위치: '', 벽면_누수: '', 벽면_누수위치: '',
  바닥면: '', 바닥면_위치: '',
  // ⑪ 중개보수 등
  중개보수_금액: '', 실비_금액: '', 계_금액: '', 지급시기: '', 산출_중개보수: '', 산출_실비: '',
  작성_년: '', 작성_월: '', 작성_일: '',
  매도인_주소: '', 매도인_성명: '', 매도인_생년월일: '', 매도인_전화: '',
  매수인_주소: '', 매수인_성명: '', 매수인_생년월일: '', 매수인_전화: '',
  중개사1_등록번호: '', 중개사1_대표자: '', 중개사1_명칭: '', 중개사1_소속: '', 중개사1_소재지: '', 중개사1_전화: '',
  중개사2_등록번호: '', 중개사2_대표자: '', 중개사2_명칭: '', 중개사2_소속: '', 중개사2_소재지: '', 중개사2_전화: '',
};

const 근거목록 = ['등기권리증', '등기사항증명서', '토지대장', '건축물대장', '지적도', '임야도', '토지이용계획확인서'];

export default function ConfirmExplainFormII({ onClose, initial = null, onSave = null, onChange = null, onPrint = null, inline = false }) {
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
        <h2>중개대상물 확인ㆍ설명서[Ⅱ] (비주거용 건축물) · 1/4쪽</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onSave && <button className="ce-btn" style={{ background: '#059669', borderColor: '#059669', color: 'white' }} onClick={async () => { const ok = await onSave(f); if (ok && !inline) onClose?.(); }}>저장</button>}
          <button className="ce-btn primary" onClick={() => (onPrint ? onPrint() : window.print())}><Printer className="w-4 h-4" /> 미리보기 및 인쇄</button>
          {onClose && !inline && <button className="ce-btn" onClick={onClose}><X className="w-4 h-4" /> 닫기</button>}
        </div>
      </div>

      {/* A4 서식 — 제1쪽 */}
      <div className="ce-page">
        <div className="ce-head">
          <span className="ce-rule">■ 공인중개사법 시행규칙 [별지 제20호의2서식] &lt;개정 2021. 12. 31.&gt;</span>
          <span>(4쪽 중 제1쪽)</span>
        </div>

        <div className="ce-title">중개대상물 확인ㆍ설명서[Ⅱ] (비주거용 건축물)</div>

        <div className="ce-type">
          (&nbsp;&nbsp;
          {Chk(f.비주_유형 === '업무용', () => setR('비주_유형', '업무용'), '업무용')}
          {Chk(f.비주_유형 === '상업용', () => setR('비주_유형', '상업용'), '상업용')}
          {Chk(f.비주_유형 === '공업용', () => setR('비주_유형', '공업용'), '공업용')}
          {Chk(f.비주_거래 === '매매교환', () => setR('비주_거래', '매매교환'), '매매ㆍ교환')}
          {Chk(f.비주_거래 === '임대', () => setR('비주_거래', '임대'), '임대')}
          {Chk(f.비주_거래 === '그밖에', () => setR('비주_거래', '그밖에'), '그 밖의 경우')}
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
              <td style={{ textAlign: 'left' }}>개업공인중개사는 중개대상물에 관한 권리를 취득하려는 중개의뢰인에게 성실ㆍ정확하게 설명하고, 토지대장 등본, 등기사항증명서 등 설명의 근거자료를 제시해야 합니다.</td>
            </tr>
            <tr>
              <td className="ce-lh">실제 거래가격<br />신고</td>
              <td style={{ textAlign: 'left' }}>「부동산 거래신고 등에 관한 법률」 제3조 및 같은 법 시행령 별표 1 제1호마목에 따른 실제 거래가격은 매수인이 매수한 부동산을 양도하는 경우 「소득세법」 제97조제1항 및 제7항과 같은 법 시행령 제163조제11항제2호에 따라 취득 당시의 실제 거래가액으로 보아 양도차익이 계산될 수 있음을 유의하시기 바랍니다.</td>
            </tr>
          </tbody>
        </table>

        <div className="ce-sec">Ⅰ. 개업공인중개사 기본 확인사항</div>

        {/* ① 대상물건의 표시 */}
        <table className="ce-tbl">
          <colgroup>
            <col style={{ width: '10%' }} /><col style={{ width: '8%' }} /><col style={{ width: '14%' }} />
            <col style={{ width: '20%' }} /><col style={{ width: '6%' }} /><col style={{ width: '18%' }} /><col style={{ width: '24%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="ce-lh ce-nw ce-num" rowSpan={9}>① 대상물건<br />의 표시</td>
              <td className="ce-lh" rowSpan={3}>토지</td>
              <td className="ce-lh">소재지</td>
              <td colSpan={4}>{In('토지_소재지')}</td>
            </tr>
            <tr>
              <td className="ce-lh" rowSpan={2}>면적(㎡)</td>
              <td rowSpan={2}>{In('토지_면적')}</td>
              <td className="ce-lh" rowSpan={2}>지목</td>
              <td className="ce-lh ce-nw">공부(公簿)상 지목</td>
              <td>{In('토지_공부지목')}</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw">실제 이용 상태</td>
              <td>{In('토지_실제지목')}</td>
            </tr>

            <tr>
              <td className="ce-lh" rowSpan={6}>건축물</td>
              <td className="ce-lh ce-nw">전용면적(㎡)</td>
              <td>{In('건물_전용면적')}</td>
              <td className="ce-lh ce-nw" colSpan={2}>대지지분(㎡)</td>
              <td>{In('건물_대지지분')}</td>
            </tr>
            <tr>
              <td className="ce-lh" rowSpan={2}>준공년도<br />(증개축년도)</td>
              <td rowSpan={2}>{In('건물_준공년도')}</td>
              <td className="ce-lh" rowSpan={2}>용도</td>
              <td className="ce-lh ce-nw">건축물대장상 용도</td>
              <td>{In('건물_대장용도')}</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw">실제 용도</td>
              <td>{In('건물_실제용도')}</td>
            </tr>
            <tr>
              <td className="ce-lh">구조</td>
              <td>{In('건물_구조')}</td>
              <td className="ce-lh" colSpan={2}>방향</td>
              <td>
                {In('건물_방향', '40%')} <span style={{ fontSize: '10px' }}>(기준: </span>{In('건물_방향기준', '26%')})
              </td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw">내진설계 적용여부</td>
              <td>{In('건물_내진설계')}</td>
              <td className="ce-lh" colSpan={2}>내진능력</td>
              <td>{In('건물_내진능력')}</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw">건축물대장상<br />위반건축물 여부</td>
              <td>
                {Chk(f.건물_위반여부 === '위반', () => setR('건물_위반여부', '위반'), '위반')}
                {Chk(f.건물_위반여부 === '적법', () => setR('건물_위반여부', '적법'), '적법')}
              </td>
              <td className="ce-lh">위반내용</td>
              <td colSpan={2}>{In('건물_위반내용')}</td>
            </tr>
          </tbody>
        </table>

        {/* ② 권리관계 */}
        <table className="ce-tbl">
          <colgroup>
            <col style={{ width: '10%' }} /><col style={{ width: '12%' }} /><col style={{ width: '7%' }} />
            <col style={{ width: '33%' }} /><col style={{ width: '7%' }} /><col style={{ width: '31%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="ce-lh ce-nw ce-num" rowSpan={7}>② 권리관계</td>
              <td className="ce-lh" rowSpan={3}>등기부<br />기재사항</td>
              <td className="ce-lh" colSpan={2}>소유권에 관한 사항</td>
              <td className="ce-lh" colSpan={2}>소유권 외의 권리사항</td>
            </tr>
            <tr>
              <td className="ce-lh">토지</td>
              <td>{In('등기_소유권_토지')}</td>
              <td className="ce-lh">토지</td>
              <td>{In('등기_소유권외_토지')}</td>
            </tr>
            <tr>
              <td className="ce-lh">건축물</td>
              <td>{In('등기_소유권_건축물')}</td>
              <td className="ce-lh">건축물</td>
              <td>{In('등기_소유권외_건축물')}</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw" rowSpan={2}>민간임대<br />등록여부</td>
              <td className="ce-lh">등록</td>
              <td colSpan={3} style={{ textAlign: 'left' }}>
                {Chk(f.민간_장기일반, () => tgl('민간_장기일반'), '장기일반민간임대주택')}{Chk(f.민간_공공지원, () => tgl('민간_공공지원'), '공공지원민간임대주택')}<br />
                {Chk(f.민간_그밖에, () => tgl('민간_그밖에'), '그 밖의 유형(')}{In('민간_그밖에텍스트', '150px')})
                <span style={{ marginLeft: '8px' }}>임대의무기간 {In('임대의무기간', '70px')}&nbsp;&nbsp;임대개시일 {In('임대개시일', '90px')}</span>
              </td>
            </tr>
            <tr>
              <td className="ce-lh">미등록</td>
              <td colSpan={3} style={{ textAlign: 'left' }}>{Chk(f.민간_미등록, () => tgl('민간_미등록'), '해당사항 없음')}</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw" colSpan={2}>계약갱신요구권<br />행사여부</td>
              <td colSpan={3} style={{ textAlign: 'left' }}>
                {Chk(f.갱신_확인, () => tgl('갱신_확인'), '확인(확인서류 첨부)')}
                {Chk(f.갱신_미확인, () => tgl('갱신_미확인'), '미확인')}
                {Chk(f.갱신_해당없음, () => tgl('갱신_해당없음'), '해당 없음')}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ③ 토지이용계획, 공법상 이용제한 및 거래규제 */}
        <table className="ce-tbl">
          <colgroup>
            <col style={{ width: '13%' }} /><col style={{ width: '13%' }} /><col style={{ width: '12%' }} />
            <col style={{ width: '18%' }} /><col style={{ width: '20%' }} /><col style={{ width: '24%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="ce-lh ce-num" rowSpan={6}>③ 토지이용<br />계획, 공법상<br />이용제한 및<br />거래규제에<br />관한 사항<br />(토지)</td>
              <td className="ce-lh ce-nw" rowSpan={3}>지역ㆍ지구</td>
              <td className="ce-lh">용도지역</td>
              <td>{In('용도지역')}</td>
              <td className="ce-lh">건폐율 상한</td>
              <td className="ce-lh">용적률 상한</td>
            </tr>
            <tr>
              <td className="ce-lh">용도지구</td>
              <td>{In('용도지구')}</td>
              <td rowSpan={2}>{In('건폐율', '68%')} %</td>
              <td rowSpan={2}>{In('용적률', '68%')} %</td>
            </tr>
            <tr>
              <td className="ce-lh">용도구역</td>
              <td>{In('용도구역')}</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw" rowSpan={2}>도시ㆍ군<br />계획 시설</td>
              <td rowSpan={2}>{In('도시군계획시설')}</td>
              <td className="ce-lh ce-nw">허가·신고<br />구역 여부</td>
              <td colSpan={2} style={{ textAlign: 'left' }}>{Chk(f.허가_토지거래, () => tgl('허가_토지거래'), '토지거래허가구역')}</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw">투기지역 여부</td>
              <td colSpan={2} className="ce-tugi" style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
                {Chk(f.투기_토지, () => tgl('투기_토지'), '토지투기지역')}
                {Chk(f.투기_주택, () => tgl('투기_주택'), '주택투기지역')}
                {Chk(f.투기_과열, () => tgl('투기_과열'), '투기과열지구')}
              </td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw" colSpan={2}>지구단위계획구역,<br />그 밖의 도시ㆍ군관리계획</td>
              <td>{In('지구단위계획')}</td>
              <td className="ce-lh ce-nw">그 밖의 이용제한<br />및 거래규제사항</td>
              <td>{In('그밖의이용제한')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== 제2쪽 ===== */}
      <div className="ce-page">
        <div className="ce-head"><span /><span>(4쪽 중 제2쪽)</span></div>

        {/* ④ 입지조건 */}
        <table className="ce-tbl">
          <colgroup>
            <col style={{ width: '10%' }} /><col style={{ width: '9%' }} /><col style={{ width: '9%' }} />
            <col style={{ width: '44%' }} /><col style={{ width: '8%' }} /><col style={{ width: '20%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="ce-lh ce-nw ce-num" rowSpan={4}>④ 입지조건</td>
              <td className="ce-lh ce-nw" colSpan={2}>도로와의 관계</td>
              <td style={{ textAlign: 'left' }}>( {In('도로_가로', '40px')} m × {In('도로_세로', '40px')} m )도로에 접함&nbsp;&nbsp;{Chk(f.도로_포장, () => tgl('도로_포장'), '포장')}{Chk(f.도로_비포장, () => tgl('도로_비포장'), '비포장')}</td>
              <td className="ce-lh ce-nw">접근성</td>
              <td style={{ textAlign: 'left' }}>{Chk(f.접근_용이, () => tgl('접근_용이'), '용이함')}{Chk(f.접근_불편, () => tgl('접근_불편'), '불편함')}</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw" rowSpan={2}>대중교통</td>
              <td className="ce-lh">버스</td>
              <td colSpan={3} style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>( {In('버스_정류장', '110px')} ) 정류장, 소요시간: ({Chk(f.버스_도보, () => tgl('버스_도보'), '도보')}{Chk(f.버스_차량, () => tgl('버스_차량'), '차량')}) 약 {In('버스_시간', '40px')} 분</td>
            </tr>
            <tr>
              <td className="ce-lh">지하철</td>
              <td colSpan={3} style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>( {In('지하철_역', '110px')} ) 역, 소요시간: ({Chk(f.지하철_도보, () => tgl('지하철_도보'), '도보')}{Chk(f.지하철_차량, () => tgl('지하철_차량'), '차량')}) 약 {In('지하철_시간', '40px')} 분</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw" colSpan={2}>주차장</td>
              <td colSpan={3} style={{ textAlign: 'left' }}>{Chk(f.주차_없음, () => tgl('주차_없음'), '없음')}{Chk(f.주차_전용, () => tgl('주차_전용'), '전용주차시설')}{Chk(f.주차_공동, () => tgl('주차_공동'), '공동주차시설')}{Chk(f.주차_그밖에, () => tgl('주차_그밖에'), '그 밖의 주차시설(')}{In('주차_그밖에텍스트', '150px')})</td>
            </tr>
          </tbody>
        </table>

        {/* ⑤ 관리에 관한 사항 */}
        <table className="ce-tbl">
          <colgroup>
            <col style={{ width: '10%' }} /><col style={{ width: '9%' }} /><col style={{ width: '32%' }} />
            <col style={{ width: '12%' }} /><col style={{ width: '37%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="ce-lh ce-nw ce-num">⑤ 관리에<br />관한사항</td>
              <td className="ce-lh">경비실</td>
              <td style={{ textAlign: 'left' }}>{Chk(f.경비_있음, () => tgl('경비_있음'), '있음')}{Chk(f.경비_없음, () => tgl('경비_없음'), '없음')}</td>
              <td className="ce-lh">관리주체</td>
              <td style={{ textAlign: 'left' }}>{Chk(f.관리주체_위탁, () => tgl('관리주체_위탁'), '위탁관리')}{Chk(f.관리주체_자체, () => tgl('관리주체_자체'), '자체관리')}{Chk(f.관리주체_그밖에, () => tgl('관리주체_그밖에'), '그 밖의 유형')}</td>
            </tr>
          </tbody>
        </table>

        {/* ⑥ 거래예정금액 등 */}
        <table className="ce-tbl">
          <colgroup>
            <col style={{ width: '20%' }} /><col style={{ width: '16%' }} /><col style={{ width: '28%' }} />
            <col style={{ width: '17%' }} /><col style={{ width: '19%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="ce-lh ce-nw ce-num" rowSpan={2}>⑥ 거래예정 금액 등</td>
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

        {/* ⑦ 취득 시 부담할 조세 */}
        <table className="ce-tbl">
          <colgroup>
            <col style={{ width: '20%' }} /><col style={{ width: '11%' }} /><col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} /><col style={{ width: '13%' }} /><col style={{ width: '12%' }} /><col style={{ width: '18%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="ce-lh ce-nw ce-num" rowSpan={2}>⑦ 취득 시 부담할<br />조세의 종류 및 세율</td>
              <td className="ce-lh">취득세</td>
              <td>{In('취득세', '60%')} %</td>
              <td className="ce-lh ce-nw">농어촌특별세</td>
              <td>{In('농특세', '60%')} %</td>
              <td className="ce-lh ce-nw">지방교육세</td>
              <td>{In('지방교육세', '55%')} %</td>
            </tr>
            <tr>
              <td colSpan={6} style={{ textAlign: 'left', fontSize: '9px' }}>※ 재산세와 종합부동산세는 6월 1일 기준 대상물건 소유자가 납세의무를 부담</td>
            </tr>
          </tbody>
        </table>

        <div className="ce-sec">Ⅱ. 개업공인중개사 세부 확인사항</div>

        {/* ⑧ 실제 권리관계 */}
        <table className="ce-tbl">
          <tbody>
            <tr><td className="ce-lh ce-num" style={{ textAlign: 'left' }}>⑧ 실제 권리관계 또는 공시되지 않은 물건의 권리 사항</td></tr>
            <tr><td style={{ padding: '2px' }}><textarea value={f.실제권리_내용 ?? ''} onChange={set('실제권리_내용')} className="ce-ta" style={{ minHeight: '120px' }} /></td></tr>
          </tbody>
        </table>

        {/* ⑨ 내부ㆍ외부 시설물의 상태(건축물) */}
        <table className="ce-tbl">
          <colgroup>
            <col style={{ width: '11%' }} /><col style={{ width: '12%' }} /><col style={{ width: '12%' }} />
            <col style={{ width: '30%' }} /><col style={{ width: '10%' }} /><col style={{ width: '25%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="ce-lh ce-nw ce-num" rowSpan={11}>⑨ 내부ㆍ<br />외부 시설<br />물의 상태<br />(건축물)</td>
              <td className="ce-lh" rowSpan={2}>수도</td>
              <td className="ce-lh ce-nw">파손 여부</td>
              <td colSpan={3} style={{ textAlign: 'left' }}>{Chk(f.수도_파손 === '없음', () => setR('수도_파손', '없음'), '없음')}{Chk(f.수도_파손 === '있음', () => setR('수도_파손', '있음'), '있음 (위치:')}{In('수도_파손위치', '150px')})</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw">용수량</td>
              <td colSpan={3} style={{ textAlign: 'left' }}>{Chk(f.수도_용수량 === '정상', () => setR('수도_용수량', '정상'), '정상')}{Chk(f.수도_용수량 === '부족함', () => setR('수도_용수량', '부족함'), '부족함 (위치:')}{In('수도_용수량위치', '150px')})</td>
            </tr>
            <tr>
              <td className="ce-lh">전기</td>
              <td className="ce-lh ce-nw">공급상태</td>
              <td colSpan={3} style={{ textAlign: 'left' }}>{Chk(f.전기_공급 === '정상', () => setR('전기_공급', '정상'), '정상')}{Chk(f.전기_공급 === '교체필요', () => setR('전기_공급', '교체필요'), '교체 필요 (교체할 부분:')}{In('전기_교체부분', '150px')})</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw">가스(취사용)</td>
              <td className="ce-lh ce-nw">공급방식</td>
              <td colSpan={3} style={{ textAlign: 'left' }}>{Chk(f.가스_공급방식 === '도시가스', () => setR('가스_공급방식', '도시가스'), '도시가스')}{Chk(f.가스_공급방식 === '그밖에', () => setR('가스_공급방식', '그밖에'), '그 밖의 방식 (')}{In('가스_그밖에', '180px')})</td>
            </tr>
            <tr>
              <td className="ce-lh" rowSpan={2}>소방</td>
              <td className="ce-lh ce-nw">소화전</td>
              <td colSpan={3} style={{ textAlign: 'left' }}>{Chk(f.소방_소화전 === '없음', () => setR('소방_소화전', '없음'), '없음')}{Chk(f.소방_소화전 === '있음', () => setR('소방_소화전', '있음'), '있음 (위치:')}{In('소방_소화전위치', '150px')})</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw">비상벨</td>
              <td colSpan={3} style={{ textAlign: 'left' }}>{Chk(f.소방_비상벨 === '없음', () => setR('소방_비상벨', '없음'), '없음')}{Chk(f.소방_비상벨 === '있음', () => setR('소방_비상벨', '있음'), '있음 (위치:')}{In('소방_비상벨위치', '150px')})</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw" rowSpan={2}>난방방식 및<br />연료공급</td>
              <td className="ce-lh ce-nw">공급방식</td>
              <td style={{ textAlign: 'left' }}>{Chk(f.난방_공급방식 === '중앙공급', () => setR('난방_공급방식', '중앙공급'), '중앙공급')}{Chk(f.난방_공급방식 === '개별공급', () => setR('난방_공급방식', '개별공급'), '개별공급')}</td>
              <td className="ce-lh ce-nw">시설작동</td>
              <td style={{ textAlign: 'left' }}>{Chk(f.난방_시설작동 === '정상', () => setR('난방_시설작동', '정상'), '정상')}{Chk(f.난방_시설작동 === '수선필요', () => setR('난방_시설작동', '수선필요'), '수선 필요 (')}{In('난방_수선내용', '70px')})<br /><span style={{ fontSize: '9px' }}>※ 개별공급인 경우 사용연한 ({In('난방_사용연한', '46px')}) {Chk(f.난방_확인불가, () => tgl('난방_확인불가'), '확인불가')}</span></td>
            </tr>
            <tr>
              <td className="ce-lh">종류</td>
              <td colSpan={3} style={{ textAlign: 'left' }}>{Chk(f.난방_종류 === '도시가스', () => setR('난방_종류', '도시가스'), '도시가스')}{Chk(f.난방_종류 === '기름', () => setR('난방_종류', '기름'), '기름')}{Chk(f.난방_종류 === '프로판가스', () => setR('난방_종류', '프로판가스'), '프로판가스')}{Chk(f.난방_종류 === '연탄', () => setR('난방_종류', '연탄'), '연탄')}{Chk(f.난방_종류 === '그밖에', () => setR('난방_종류', '그밖에'), '그 밖의 종류 (')}{In('난방_종류그밖에', '120px')})</td>
            </tr>
            <tr>
              <td className="ce-lh">승강기</td>
              <td colSpan={4} style={{ textAlign: 'left' }}>{Chk(f.승강기 === '있음', () => setR('승강기', '있음'), '있음')} ({Chk(f.승강기_상태 === '양호', () => setR('승강기_상태', '양호'), '양호')}{Chk(f.승강기_상태 === '불량', () => setR('승강기_상태', '불량'), '불량')}) &nbsp;&nbsp;{Chk(f.승강기 === '없음', () => setR('승강기', '없음'), '없음')}</td>
            </tr>
            <tr>
              <td className="ce-lh">배수</td>
              <td colSpan={4} style={{ textAlign: 'left' }}>{Chk(f.배수 === '정상', () => setR('배수', '정상'), '정상')}{Chk(f.배수 === '수선필요', () => setR('배수', '수선필요'), '수선 필요 (')}{In('배수_내용', '260px')})</td>
            </tr>
            <tr>
              <td className="ce-lh ce-nw">그 밖의<br />시설물</td>
              <td colSpan={4}>{In('그밖의시설물')}</td>
            </tr>
          </tbody>
        </table>

        {/* ⑩ 벽면 및 바닥면 */}
        <table className="ce-tbl">
          <colgroup><col style={{ width: '11%' }} /><col style={{ width: '12%' }} /><col style={{ width: '12%' }} /><col style={{ width: '65%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="ce-lh ce-nw ce-num" rowSpan={3}>⑩ 벽면 및<br />바닥면</td>
              <td className="ce-lh" rowSpan={2}>벽면</td>
              <td className="ce-lh">균열</td>
              <td style={{ textAlign: 'left' }}>{Chk(f.벽면_균열 === '없음', () => setR('벽면_균열', '없음'), '없음')}{Chk(f.벽면_균열 === '있음', () => setR('벽면_균열', '있음'), '있음 (위치:')}{In('벽면_균열위치', '260px')})</td>
            </tr>
            <tr>
              <td className="ce-lh">누수</td>
              <td style={{ textAlign: 'left' }}>{Chk(f.벽면_누수 === '없음', () => setR('벽면_누수', '없음'), '없음')}{Chk(f.벽면_누수 === '있음', () => setR('벽면_누수', '있음'), '있음 (위치:')}{In('벽면_누수위치', '260px')})</td>
            </tr>
            <tr>
              <td className="ce-lh" colSpan={2}>바닥면</td>
              <td style={{ textAlign: 'left' }}>{Chk(f.바닥면 === '깨끗함', () => setR('바닥면', '깨끗함'), '깨끗함')}{Chk(f.바닥면 === '보통임', () => setR('바닥면', '보통임'), '보통임')}{Chk(f.바닥면 === '수리필요', () => setR('바닥면', '수리필요'), '수리 필요 (위치:')}{In('바닥면_위치', '220px')})</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== 제3쪽 ===== */}
      <div className="ce-page">
        <div className="ce-head"><span /><span>(4쪽 중 제3쪽)</span></div>
        <div className="ce-sec">Ⅲ. 중개보수 등에 관한 사항</div>

        {/* ⑪ 중개보수 및 실비의 금액과 산출내역 */}
        <table className="ce-tbl ce-sign">
          <colgroup><col style={{ width: '14%' }} /><col style={{ width: '14%' }} /><col style={{ width: '32%' }} /><col style={{ width: '40%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="ce-lh ce-nw ce-num" rowSpan={4}>⑪ 중개보수<br />및 실비의<br />금액과<br />산출내역</td>
              <td className="ce-lh">중개보수</td>
              <td>{In('중개보수_금액')}</td>
              <td rowSpan={4} style={{ textAlign: 'left', verticalAlign: 'top', fontSize: '9px', lineHeight: 1.5 }}>
                {'<산출내역>'}<br />
                중개보수: {In('산출_중개보수', '65%')}<br />
                실　　비: {In('산출_실비', '65%')}<br />
                ※ 중개보수는 시ㆍ도 조례로 정한 요율한도에서 중개의뢰인과 개업공인중개사가 서로 협의하여 결정하며 부가가치세는 별도로 부과될 수 있습니다.
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

      {/* ===== 제4쪽 — 작성방법 ===== */}
      <div className="ce-page">
        <div className="ce-head"><span /><span>(4쪽 중 제4쪽)</span></div>
        <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '13px', background: '#f3f4f6', border: '1px solid #000', padding: '5px', margin: '4px 0 8px' }}>작성방법(비주거용 건축물)</div>
        <div style={{ fontSize: '10px', lineHeight: 1.6 }}>
          <p style={{ fontWeight: 800, margin: '4px 0' }}>&lt;작성일반&gt;</p>
          <p style={{ margin: '4px 0' }}>1. "[ ]"있는 항목은 해당하는 "[ ]"안에 √로 표시합니다.</p>
          <p style={{ margin: '4px 0' }}>2. 세부항목 작성 시 해당 내용을 작성란에 모두 작성할 수 없는 경우에는 별지로 작성하여 첨부하고, 해당란에는 "별지 참고"라고 적습니다.</p>

          <p style={{ fontWeight: 800, margin: '8px 0 4px' }}>&lt;세부항목&gt;</p>
          <p style={{ margin: '4px 0' }}>1. 「확인ㆍ설명자료」 항목의 "확인ㆍ설명 근거자료 등"에는 개업공인중개사가 확인ㆍ설명 과정에서 제시한 자료를 적으며, "대상물건의 상태에 관한 자료요구 사항"에는 매도(임대)의뢰인에게 요구한 사항 및 그 관련 자료의 제출 여부와 ⑧ 실제 권리관계 또는 공시되지 않은 물건의 권리 사항부터 ⑩ 벽면까지의 항목을 확인하기 위한 자료의 요구 및 그 불응 여부를 적습니다.</p>
          <p style={{ margin: '4px 0' }}>2. ① 대상물건의 표시부터 ⑦ 취득 시 부담할 조세의 종류 및 세율까지는 개업공인중개사가 확인한 사항을 적어야 합니다.</p>
          <p style={{ margin: '4px 0' }}>3. ① 대상물건의 표시는 토지대장 및 건축물대장 등을 확인하여 적습니다.</p>
          <p style={{ margin: '4px 0' }}>4. ② 권리관계의 "등기부 기재사항"은 등기사항증명서를 확인하여 적습니다.</p>
          <p style={{ margin: '4px 0' }}>5. ② 권리관계의 "민간임대 등록여부"는 대상물건이 「민간임대주택에 관한 특별법」에 따라 등록된 민간임대주택인지 여부를 같은 법 제60조에 따른 임대주택정보체계에 접속하여 확인하거나 임대인에게 확인하여 "[ ]"안에 √로 표시하고, 민간임대주택인 경우 「민간임대주택에 관한 특별법」에 따른 권리ㆍ의무사항을 임차인에게 설명해야 합니다.</p>
          <div style={{ border: '1px solid #000', padding: '6px 8px', margin: '4px 0' }}>
            <p style={{ margin: '0 0 4px' }}>* 민간임대주택은 「민간임대주택에 관한 특별법」 제5조에 따른 임대사업자가 등록한 주택으로서, 임대인과 임차인간 임대차 계약(재계약 포함)시 다음과 같은 사항이 적용됩니다.</p>
            <p style={{ margin: '2px 0', paddingLeft: '10px' }}>① 같은 법 제44조에 따라 임대의무기간 중 임대료 증액청구는 5퍼센트의 범위에서 주거비 물가지수, 인근 지역의 임대료 변동률 등을 고려하여 같은 법 시행령으로 정하는 증액비율을 초과하여 청구할 수 없으며, 임대차계약 또는 임대료 증액이 있은 후 1년 이내에는 그 임대료를 증액할 수 없습니다.</p>
            <p style={{ margin: '2px 0', paddingLeft: '10px' }}>② 같은 법 제45조에 따라 임대사업자는 임차인이 의무를 위반하거나 임대차를 계속하기 어려운 경우 등에 해당하지 않으면 임대의무기간 동안 임차인과의 계약을 해제ㆍ해지하거나 재계약을 거절할 수 없습니다.</p>
          </div>
          <p style={{ margin: '4px 0' }}>6. ② 권리관계의 "계약갱신요구권 행사여부"는 대상물건이 「주택임대차보호법」 및 「상가건물 임대차보호법」의 적용을 받는 임차인이 있는 경우 매도인(임대인)으로부터 계약갱신요구권 행사 여부에 관한 사항을 확인할 수 있는 서류를 받으면 "확인"에 √로 표시하여 해당 서류를 첨부하고, 서류를 받지 못한 경우 "미확인"에 √로 표시합니다. 이 경우 「주택임대차보호법」 및 「상가건물 임대차보호법」에 따른 임대인과 임차인의 권리ㆍ의무사항을 매수인에게 설명해야 합니다.</p>
          <p style={{ margin: '4px 0' }}>7. ③ 토지이용계획, 공법상 이용제한 및 거래규제에 관한 사항(토지)의 "건폐율 상한 및 용적률 상한"은 시ㆍ군의 조례에 따라 적고, "도시ㆍ군계획시설", "지구단위계획구역, 그 밖의 도시ㆍ군관리계획"은 개업공인중개사가 확인하여 적으며, "그 밖의 이용제한 및 거래규제사항"은 토지이용계획확인서의 내용을 확인하고, 공부에서 확인할 수 없는 사항은 부동산종합공부시스템 등에서 확인하여 적습니다(임대차의 경우에는 생략할 수 있습니다).</p>
          <p style={{ margin: '4px 0' }}>8. ⑥ 거래예정금액 등의 "거래예정금액"은 중개가 완성되기 전 거래예정금액을, "개별공시지가(㎡당)" 및 "건물(주택)공시가격"은 중개가 완성되기 전 공시된 공시지가 또는 공시가격을 적습니다[임대차의 경우에는 "개별공시지가(㎡당)" 및 "건물(주택)공시가격"을 생략할 수 있습니다].</p>
          <p style={{ margin: '4px 0' }}>9. ⑦ 취득 시 부담할 조세의 종류 및 세율은 중개가 완성되기 전 「지방세법」의 내용을 확인하여 적습니다(임대차의 경우에는 제외합니다).</p>
          <p style={{ margin: '4px 0' }}>10. ⑧ 실제 권리관계 또는 공시되지 않은 물건의 권리 사항은 매도(임대)의뢰인이 고지한 사항(법정지상권, 유치권, 「상가건물 임대차보호법」에 따른 임대차, 토지에 부착된 조각물 및 정원수, 계약 전 소유권 변동여부, 도로의 점용허가 여부 및 권리ㆍ의무 승계 대상여부 등)을 적습니다.</p>
          <p style={{ margin: '2px 0 4px', paddingLeft: '16px' }}>※ 임대차계약의 경우 임대보증금, 월 단위의 차임액, 계약기간, 장기수선충당금의 처리 등을 확인하고, 근저당 등이 설정된 경우 채권최고액을 확인하여 적습니다. 그 밖에 경매 및 공매 등의 특이사항이 있는 경우 이를 확인하여 적습니다.</p>
          <p style={{ margin: '4px 0' }}>11. ⑨ 내부ㆍ외부 시설물의 상태(건축물), ⑩ 벽면 및 바닥면은 중개대상물에 대해 개업공인중개사가 매도(임대)의뢰인에게 자료를 요구하여 확인한 사항을 적고, ⑨ 내부ㆍ외부 시설물의 상태(건축물)의 "그 밖의 시설물"에는 건축물이 상업용인 경우에는 오수정화시설용량, 공업용인 경우에는 전기용량, 오수정화시설용량 및 용수시설의 내용에 대하여 개업공인중개사가 매도(임대)의뢰인에게 자료를 요구하여 확인한 사항을 적습니다.</p>
          <p style={{ margin: '4px 0' }}>12. ⑪ 중개보수 및 실비의 금액과 산출내역은 "중개보수"는 거래예정금액을 기준으로 계산하고, "산출내역(중개보수)"은 "거래예정금액(임대차의 경우에는 임대보증금 + 월 단위의 차임액 × 100) × 중개보수 요율"과 같이 적습니다. 다만, 임대차로서 거래예정금액이 5천만원 미만인 경우에는 "임대보증금 + 월 단위의 차임액 × 70"을 거래예정금액으로 합니다.</p>
          <p style={{ margin: '4px 0' }}>13. 공동중개 시 참여한 개업공인중개사(소속공인중개사를 포함합니다)는 모두 서명ㆍ날인해야 하며, 2명을 넘는 경우에는 별지로 작성하여 첨부합니다.</p>
        </div>
      </div>
    </div>
  );
}
