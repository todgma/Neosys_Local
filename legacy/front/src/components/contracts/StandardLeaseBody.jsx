import React from 'react';
import { hangulAmount } from '../../utils/hangulAmount';
import { LAND_CATEGORIES } from '../../constants/landCategories';
import { BUILDING_USES } from '../../constants/buildingUses';

/**
 * 표준임대차계약서 전용 본문 (1.부동산표시 / 2.민간임대주택 표시 / 3.계약내용)
 *  - doc/set/setDoc은 부모(ContractDocumentEditor)에서 전달. 값은 그대로 doc에 저장 → 미리보기/인쇄/저장 공유
 */
const STRUCT_OPTIONS = ['철근콘크리트', '철골', '철골콘크리트', '벽돌', '기타'];
const LANDRIGHT_OPTIONS = ['소유권', '지상권', '전세권', '임차권', '기타'];

const addMonths = (dateStr, months) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + months);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function StandardLeaseBody({ doc, set, setDoc, readOnly, pre }) {
  pre = false; // 표준임대차는 가계약이어도 전체 표시(1·2·3)
  const th = { border: '1px solid #334155', background: '#f1f5f9', padding: '5px 6px', fontSize: '13px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap', color: '#111827' };
  const td = { border: '1px solid #334155', padding: '4px 6px', fontSize: '13px', verticalAlign: 'middle' };
  const secTitle = { fontSize: '13px', fontWeight: 700, marginTop: '14px', marginBottom: '4px' };
  const inp = { border: 'none', outline: 'none', fontSize: '13px', padding: '1px 4px', background: 'transparent', fontFamily: 'inherit', boxSizing: 'border-box' };
  const sel = { ...inp, cursor: 'pointer', width: '100%' };
  // 다른 계약서(매매)와 동일한 테두리 드롭다운/입력박스
  const bsel = { border: '1px solid #94a3b8', borderRadius: '3px', outline: 'none', fontSize: '13px', padding: '2px 4px', background: 'white', fontFamily: 'inherit', cursor: 'pointer', color: '#111827' };
  const bbox = { border: '1px solid #94a3b8', borderRadius: '3px', outline: 'none', fontSize: '13px', padding: '2px 4px', fontFamily: 'inherit', boxSizing: 'border-box', background: 'white', textAlign: 'center' };
  const smallBtn = { padding: '3px 10px', fontSize: '13px', fontWeight: 600, border: '1px solid #334155', borderRadius: '4px', background: 'white', color: '#111827', cursor: 'pointer', whiteSpace: 'nowrap' };
  const T = (k, ph, w) => <input type="text" value={doc[k] ?? ''} onChange={set(k)} readOnly={readOnly} placeholder={ph || ''} style={{ ...inp, width: w || '100%' }} />;
  const N = (k, w) => <input type="number" value={doc[k] ?? ''} onChange={set(k)} readOnly={readOnly} placeholder="면적" style={{ ...inp, width: w || '60px', textAlign: 'left' }} />;
  const Nr = (k, w) => <input type="number" value={doc[k] ?? ''} onChange={set(k)} readOnly={readOnly} style={{ ...inp, width: w || '120px', textAlign: 'right' }} />;
  const D = (k, w, ph) => <input type="date" value={doc[k] || ''} onChange={set(k)} readOnly={readOnly} placeholder={ph} style={{ ...inp, width: w || '150px' }} />;
  const R = (name, val, label) => (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '13px', marginRight: '10px', cursor: 'pointer' }}>
      <input type="radio" name={name} checked={doc[name] === val} onChange={() => !readOnly && setDoc((p) => ({ ...p, [name]: val }))} /> {label}
    </label>
  );
  const man = doc.man !== false;
  const won = (v) => (v === '' || v == null || isNaN(Number(v))) ? '0' : (man ? Number(v) * 10000 : Number(v)).toLocaleString();
  // 금액 셀: 편집=만/원 입력+원+한글 / 미리보기·인쇄=무조건 원단위
  const hanStyle = { fontSize: '13px', fontWeight: 700, color: '#4f46e5' }; // 원+한글(약간 보라)
  const moneyCell = (input, val) => {
    const wStr = won(val); const h = hangulAmount(man ? Number(val) * 10000 : Number(val));
    if (readOnly) return <div style={{ display: 'flex', flexDirection: 'column' }}><div style={{ fontWeight: 600 }}>{wStr === '0' ? '' : `${wStr}원`}</div>{h && <div style={hanStyle}>{h}원</div>}</div>;
    return <div style={{ display: 'flex', flexDirection: 'column' }}><div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{input}<span>{man ? '만원' : '원'}</span></div><div style={hanStyle}>{wStr}원{h ? ` · ${h}원` : ''}</div></div>;
  };
  const nnum = (x) => Number(doc[x]) || 0;
  // 중도금 / 잔금 동적 리스트
  const mids = doc._slMids ?? [{ amt: '', date: '' }];
  const balances = doc._slBalances ?? [{ amt: '', date: '' }];
  const setMids = (arr) => setDoc((p) => ({ ...p, _slMids: arr }));
  const setBalances = (arr) => setDoc((p) => ({ ...p, _slBalances: arr }));
  const addBtn = { padding: '2px 9px', fontSize: '13px', fontWeight: 600, border: '1px solid #6366f1', borderRadius: '4px', background: 'white', color: '#4f46e5', cursor: 'pointer', whiteSpace: 'nowrap' };
  const delBtn = { padding: '2px 9px', fontSize: '13px', fontWeight: 600, border: '1px solid #fca5a5', borderRadius: '4px', background: 'white', color: '#dc2626', cursor: 'pointer', whiteSpace: 'nowrap' };

  return (
    <div>
      {/* 1. 부동산 표시 */}
      <div style={secTitle}>1. 부동산 표시</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
        <tr>
          <td style={{ ...th, width: '70px' }} rowSpan={pre ? 1 : 3}>부동산</td>
          <td style={{ ...th, width: '64px' }}>소재지</td>
          <td style={td} colSpan={5}><div style={{ display: 'flex', gap: '8px' }}>{T('소재지', '소재지(지번)')}{T('소재지도로명', '소재지(도로명)')}</div></td>
          <td style={{ ...th, width: '110px' }}>거래면적</td>
          <td style={{ ...td, width: '90px' }}>{Nr('거래면적', '60px')}㎡</td>
        </tr>
        {!pre && (
          <tr>
            <td style={th}>토지</td>
            <td style={{ ...th, width: '44px' }}>지목</td>
            <td style={{ ...td, width: '110px' }}>
              <select value={doc.토지지목 ?? ''} onChange={set('토지지목')} disabled={readOnly} style={{ ...bsel, width: '100%' }}>
                <option value="">지목</option>
                {LAND_CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
            </td>
            <td style={{ ...th, width: '56px', whiteSpace: 'nowrap' }}>면적</td>
            <td style={td}>{Nr('토지면적', '60px')}㎡</td>
            <td style={{ ...th, width: '86px', whiteSpace: 'nowrap' }}>대지권종류</td>
            <td style={td} colSpan={2}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                <select value={doc.대지권종류 ?? ''} onChange={set('대지권종류')} disabled={readOnly} style={{ ...bsel, width: '88px', flex: 'none' }}>
                  <option value="">종류</option>
                  {LANDRIGHT_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
                </select>
                <input type="number" value={doc.대지권분모 ?? ''} onChange={set('대지권분모')} readOnly={readOnly} placeholder="분모" style={{ ...bbox, width: '50px', flex: 'none' }} />
                <span style={{ fontSize: '13px' }}>분의</span>
                <input type="number" value={doc.대지권분자 ?? ''} onChange={set('대지권분자')} readOnly={readOnly} placeholder="분자" style={{ ...bbox, width: '50px', flex: 'none' }} />
              </div>
            </td>
          </tr>
        )}
        {!pre && (
          <tr>
            <td style={th}>건축물</td>
            <td style={th}>구조</td>
            <td style={td}>
              <select value={doc.건물구조 ?? ''} onChange={set('건물구조')} disabled={readOnly} style={{ ...bsel, width: '100%' }}>
                <option value="">구조</option>
                {STRUCT_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
              </select>
            </td>
            <td style={th}>용도</td>
            <td style={td}>
              <select value={doc.건물용도 ?? ''} onChange={set('건물용도')} disabled={readOnly} style={{ ...bsel, width: '100%' }}>
                <option value="">용도</option>
                {BUILDING_USES.map((u) => (<option key={u.code} value={u.code}>{u.label}</option>))}
              </select>
            </td>
            <td style={{ ...th, width: '72px' }}>임대할<br />부분</td>
            <td style={td}>{T('임대할부분')}</td>
            <td style={td}>{Nr('임대면적', '60px')}㎡</td>
          </tr>
        )}
      </tbody></table>

      {!pre && (
        <>
          {/* 2. 민간임대주택의 표시 */}
          <div style={secTitle}>2. 민간임대주택의 표시</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
            <tr>
              <td style={{ ...th, width: '148px' }}>주택 유형</td>
              <td style={td}>{['아파트', '연립주택', '다세대주택', '다가구주택', '그 밖의 주택'].map((v) => R('주택유형', v, v))}</td>
            </tr>
            {/* 면적 (중첩 헤더) */}
            <tr>
              <td style={th}>민간임대<br />주택면적(㎡)</td>
              <td style={{ ...td, padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
                  <tr>
                    <td style={{ ...th, border: 'none', borderBottom: '1px solid #334155', width: '30%' }} rowSpan={2}>주거전용면적</td>
                    <td style={{ ...th, border: 'none', borderBottom: '1px solid #334155', borderLeft: '1px solid #334155' }} colSpan={2}>공용면적</td>
                    <td style={{ ...th, border: 'none', borderBottom: '1px solid #334155', borderLeft: '1px solid #334155', width: '20%' }} rowSpan={2}>합계</td>
                  </tr>
                  <tr>
                    <td style={{ ...th, border: 'none', borderBottom: '1px solid #334155', borderLeft: '1px solid #334155' }}>주거공용면적</td>
                    <td style={{ ...th, border: 'none', borderBottom: '1px solid #334155', borderLeft: '1px solid #334155', whiteSpace: 'normal', lineHeight: 1.2 }}>그 밖의 공용면적<br />(지하주차장 면적 포함)</td>
                  </tr>
                  <tr>
                    <td style={{ ...td, border: 'none', textAlign: 'center' }}>{N('주거전용면적', '60px')}㎡</td>
                    <td style={{ ...td, border: 'none', borderLeft: '1px solid #334155', textAlign: 'center' }}>{N('주거공용면적', '60px')}㎡</td>
                    <td style={{ ...td, border: 'none', borderLeft: '1px solid #334155', textAlign: 'center' }}>{N('그밖공용면적', '60px')}㎡</td>
                    <td style={{ ...td, border: 'none', borderLeft: '1px solid #334155', textAlign: 'center', fontWeight: 700 }}>{(nnum('주거전용면적') + nnum('주거공용면적') + nnum('그밖공용면적')).toLocaleString()}㎡</td>
                  </tr>
                </tbody></table>
              </td>
            </tr>
            {/* 종류 + 임대의무기간 개시일 */}
            <tr>
              <td style={th}>민간임대<br />주택의 종류</td>
              <td style={{ ...td, padding: 0 }}>
                <div style={{ display: 'flex' }}>
                  <div style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div>{R('임대주택종류', '공공지원_10년', '공공지원민간임대주택')} ( {R('임대주택종류', '공공지원_10년', '10년')}{R('임대주택종류', '공공지원_8년', '8년')} )</div>
                    <div>{R('임대주택종류', '장기일반_10년', '장기일반민간임대주택')} ( {R('임대주택종류', '장기일반_10년', '10년')}{R('임대주택종류', '장기일반_8년', '8년')} )</div>
                    <div>{R('임대주택종류', '단기_6년', '단기민간임대주택')} ( {R('임대주택종류', '단기_6년', '6년')}{R('임대주택종류', '단기_4년', '4년')} )</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{R('임대주택종류', '그밖', '그밖의유형')}{T('임대주택종류기타', '그 밖의 유형을 입력해주세요', '220px')}</div>
                  </div>
                  <div style={{ width: '260px', borderLeft: '1px solid #334155', display: 'flex' }}>
                    <div style={{ ...th, width: '92px', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'normal', lineHeight: 1.3 }}>임대의무기간<br />개시일</div>
                    <div style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div>{R('임대건설매입', '건설', '건설')}{R('임대건설매입', '매입', '매입')}</div>
                      {D('임대개시일', '150px', '임대의무기간 개시일')}
                    </div>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style={th}>100세대 이상 민간임대<br />주택단지 해당 여부</td>
              <td style={td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {R('백세대여부', '예', '예')}{R('백세대여부', '아니오', '아니오')}
                  <span style={{ fontSize: '13px', color: '#111827' }}>* 임대료 증액 시 「민간임대주택에 관한 특별법 시행령」 제34조의2제1호에 따른 기준 적용</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style={th}>민간임대주택에 딸린<br />부대시설·복리시설의 종류</td>
              <td style={td}><textarea value={doc.부대시설 ?? ''} onChange={set('부대시설')} readOnly={readOnly} rows={2} placeholder="민간임대주택에 딸린 부대시설·복리시설의 종류" style={{ ...inp, width: '100%', borderBottom: 'none', resize: 'vertical' }} /></td>
            </tr>
            <tr>
              <td style={th}>선순위 담보권 등<br />권리관계 설정 여부</td>
              <td style={td}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div>{R('선순위여부', '없음', '없음')}{R('선순위여부', '있음', '있음')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: '13px' }}>선순위 담보권 등 권리관계의 종류:</span>{T('선순위종류', '', '160px')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: '13px' }}>설정 금액:</span>{Nr('선순위금액', '140px')}<span>원</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: '13px' }}>설정 일자:</span>{D('선순위일자', '150px', '설정 일자')}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style={th}>국세·지방세 체납사실</td>
              <td style={td}>{R('체납여부', '없음', '없음')}{R('체납여부', '있음', '있음')}</td>
            </tr>
            {/* 보증가입 + 미가입 사유 */}
            <tr>
              <td style={th}>임대보증금 보증<br />가입 여부</td>
              <td style={{ ...td, padding: 0 }}>
                <div style={{ display: 'flex' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div>{R('보증가입', '가입', '가입')}</div>
                      <div>{R('보증가입', '일부가입', '일부가입')}</div>
                      <div>{R('보증가입', '미가입', '미가입')}</div>
                    </div>
                    <div style={{ borderTop: '1px solid #334155', display: 'flex', alignItems: 'center' }}>
                      <div style={{ ...th, borderLeft: 'none', borderTop: 'none', borderBottom: 'none', width: '96px' }}>보증대상금액</div>
                      <div style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>{Nr('보증대상금액', '110px')}<span>만원</span></div>
                    </div>
                  </div>
                  <div style={{ width: '92px', borderLeft: '1px solid #334155', ...th, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>미가입<br />사유</div>
                  <div style={{ flex: 1.1, borderLeft: '1px solid #334155', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[['0', '가입대상 금액이 0원 이하 (법 제49조제3항)'], ['1', '임대보증금이 우선변제금 이하 (법 제49조제7항제1호)'], ['2', '공공주택사업자와 임대차계약 체결 (법 제49조제7항제2호)'], ['3', '임차인이 전세보증금반환보증에 가입 (법 제49조제7항제3호)']].map(([v, l]) => (
                      <label key={v} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', fontSize: '13px', lineHeight: 1.3, cursor: 'pointer' }}>
                        <input type="radio" name="미가입사유" checked={doc.미가입사유 === v} onChange={() => !readOnly && setDoc((p) => ({ ...p, 미가입사유: v }))} style={{ marginTop: '2px' }} /> {l}
                      </label>
                    ))}
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style={th}>임대사업자 등록번호</td>
              <td style={td}>{T('임대사업자등록번호', '', '260px')}</td>
            </tr>
          </tbody></table>
        </>
      )}

      {/* 3. 계약 내용 */}
      <div style={{ ...secTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>3. 계약 내용</span>
      </div>
      {/* 추가 버튼: 표 바로 좌측 위 */}
      {!readOnly && (
        <div className="contract-actions" style={{ display: 'flex', gap: '6px', margin: '4px 0' }}>
          <button type="button" onClick={() => setMids([...mids, { amt: '', date: '' }])} style={addBtn}>＋ 중도금 추가</button>
          <button type="button" onClick={() => setBalances([...balances, { amt: '', date: '' }])} style={addBtn}>＋ 잔금 추가</button>
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
        <tr>
          <td style={{ ...th, width: '80px' }}>보증금</td>
          <td style={td}>{moneyCell(Nr('보증금', '130px'), doc.보증금)}</td>
          <td style={{ ...th, width: '80px' }}>월 차임</td>
          <td style={td}>{moneyCell(Nr('월차임', '130px'), doc.월차임)}</td>
        </tr>
        <tr>
          <td style={th}>임대차<br />계약기간</td>
          <td style={td} colSpan={3}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {D('계약시작', '150px', '날짜를 선택하세요')}<span>~</span>{D('계약종료', '150px', '날짜를 선택하세요')}
              <span style={{ fontSize: '13px' }}>*종료일 계산:</span>
              <select value={doc.종료일계산 ?? ''} onChange={(e) => { const m = Number(e.target.value); setDoc((p) => ({ ...p, 종료일계산: e.target.value, 계약종료: m ? addMonths(p.계약시작, m) : p.계약종료 })); }} disabled={readOnly} style={{ ...sel, width: '90px' }}>
                <option value="">선택</option>
                <option value="12">12개월</option>
                <option value="24">24개월</option>
                <option value="36">36개월</option>
              </select>
              {!readOnly && <button type="button" onClick={() => setDoc((p) => ({ ...p, 계약종료: addMonths(p.계약시작, 12) }))} style={smallBtn}>12개월</button>}
              {!readOnly && <button type="button" onClick={() => setDoc((p) => ({ ...p, 계약종료: addMonths(p.계약시작, 24) }))} style={smallBtn}>24개월</button>}
            </div>
          </td>
        </tr>
        <tr>
          <td style={th}>계약금</td>
          <td style={td}>{moneyCell(Nr('계약금', '130px'), doc.계약금)}</td>
          <td style={th}>계약금 지급</td>
          <td style={td}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select value={doc.계약금지급 ?? '계약 시 지급'} onChange={set('계약금지급')} disabled={readOnly} style={{ ...sel, width: '110px' }}>
                <option value="계약 시 지급">계약 시 지급</option>
                <option value="가계약 시 지급">가계약 시 지급</option>
                <option value="별도 협의">별도 협의</option>
              </select>
              {T('계약금영수자', '영수자 이름', '130px')}
            </div>
          </td>
        </tr>
        {mids.map((m, i) => (
          <tr key={`mid${i}`}>
            <td style={th}>중도금{mids.length > 1 ? ` ${i + 1}` : ''}</td>
            <td style={td}>{moneyCell(<input type="number" value={m.amt} onChange={(e) => setMids(mids.map((x, j) => (j === i ? { ...x, amt: e.target.value } : x)))} style={{ ...inp, width: '130px', textAlign: 'right' }} />, m.amt)}</td>
            <td style={th}>중도금 지급일</td>
            <td style={td}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="date" value={m.date || ''} onChange={(e) => setMids(mids.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} readOnly={readOnly} style={{ ...inp, width: '150px' }} />
                {!readOnly && i > 0 && (
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    <button type="button" onClick={() => setMids(mids.filter((_, j) => j !== i))} style={delBtn}>삭제</button>
                  </span>
                )}
              </div>
            </td>
          </tr>
        ))}
        {balances.map((b, i) => (
          <tr key={`bal${i}`}>
            <td style={th}>잔금{balances.length > 1 ? ` ${i + 1}` : ''}</td>
            <td style={td}>{moneyCell(<input type="number" value={b.amt} onChange={(e) => setBalances(balances.map((x, j) => (j === i ? { ...x, amt: e.target.value } : x)))} style={{ ...inp, width: '130px', textAlign: 'right' }} />, b.amt)}</td>
            <td style={th}>잔금 지급일</td>
            <td style={td}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="date" value={b.date || ''} onChange={(e) => setBalances(balances.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} readOnly={readOnly} style={{ ...inp, width: '150px' }} />
                {!readOnly && i > 0 && (
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    <button type="button" onClick={() => setBalances(balances.filter((_, j) => j !== i))} style={delBtn}>삭제</button>
                  </span>
                )}
              </div>
            </td>
          </tr>
        ))}
        <tr>
          <td style={th}>계좌번호</td>
          <td style={td}>{T('계좌번호', '계좌번호')}</td>
          <td style={th}>은행 / 예금주</td>
          <td style={td}><div style={{ display: 'flex', gap: '8px' }}>{T('은행', '은행')}{T('예금주', '예금주')}</div></td>
        </tr>
        <tr>
          <td style={th}>연체이율</td>
          <td style={td} colSpan={3}><div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{Nr('연체이율', '120px')}<span>%</span></div></td>
        </tr>
        <tr>
          <td style={th}>입주일</td>
          <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{D('입주시작', '140px', '날짜를 선택하세요')}<span>~</span>{D('입주종료', '140px', '날짜를 선택하세요')}</div></td>
          <td style={th}>계약일</td>
          <td style={td}>{D('계약일자', '150px')}</td>
        </tr>
      </tbody></table>
    </div>
  );
}
