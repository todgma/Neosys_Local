import React from 'react';
import { hangulAmount } from '../../utils/hangulAmount';

// 세자리 콤마(소수점 허용)
const fmtCommaStr = (s) => {
  if (!s) return '';
  const [ip, dp] = s.split('.');
  const i = ip ? Number(ip).toLocaleString('en-US') : '0';
  return s.includes('.') ? `${i}.${dp ?? ''}` : i;
};
// 금액 입력창 — 포커스 시 숫자(세자리 콤마), 포커스 해제 시 입력창 안에 한글 금액으로 표기
//  (한글은 '원' 없이, 뒤의 '원정/원정은'이 '원'을 완성)
const AmountInput = ({ value, onChange, man, style, placeholder }) => {
  const [focused, setFocused] = React.useState(false);
  const raw = String(value ?? '').replace(/[^0-9.]/g, '');
  const num = raw ? Number(raw) : 0;
  const won = (!raw || isNaN(num)) ? 0 : (man ? num * 10000 : num);
  const showHan = !focused && raw !== '' && won > 0;
  const handleChange = (e) => {
    let v = e.target.value.replace(/[^0-9.]/g, '');
    const dot = v.indexOf('.');
    if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '');
    onChange({ target: { value: v } });
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
      <input
        type="text"
        inputMode="decimal"
        value={showHan ? hangulAmount(won) : fmtCommaStr(raw)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={handleChange}
        placeholder={placeholder || '숫자 입력'}
        style={style}
        readOnly={showHan}
      />
      {focused && man && <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>만</span>}
    </span>
  );
};

/**
 * 분양권 매매 계약서 전용 본문 (1.부동산 표시 / 2.계약 내용: 분양계약내용·총매매/정산·지급표)
 *  - 값은 doc에 저장 → 미리보기/인쇄/저장 공유. 조항(제2~7조)은 편집 시 숨김, 미리보기/인쇄에서 노출(부모 처리)
 */
export default function BunyangBody({ doc, set, setDoc, readOnly, onAddrSearch }) {
  // 소재지 라벨(밑줄) 클릭 시 주소검색 모달 — 부동산계약서와 동일
  const addrLabel = (key, text = '소재지') => (
    <button type="button" onClick={() => { if (!readOnly && onAddrSearch) onAddrSearch(key); }} title="주소 검색"
      style={{ border: 'none', background: 'transparent', font: 'inherit', color: readOnly ? 'inherit' : '#4f46e5', textDecoration: readOnly ? 'none' : 'underline', cursor: readOnly ? 'default' : 'pointer', padding: 0 }}>{text}</button>
  );
  const th = { border: '1px solid #334155', background: '#f1f5f9', padding: '5px 6px', fontSize: '13px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap', color: '#111827' };
  const td = { border: '1px solid #334155', padding: '4px 6px', fontSize: '13px', verticalAlign: 'middle' };
  // 분양계약내용: 헤더/값 가운데 구분선은 가는 연한선(#94a3b8), 각 블록 하단 줄은 좌측 테두리처럼 진하게(#334155)
  const tdB = { ...td, borderTop: '1px solid #94a3b8', borderBottom: '1px solid #334155' };
  // 분양계약내용 헤더 셀: 아래 구분선을 연하게(값 행 상단선과 동일 #94a3b8)
  const thB = { ...th, borderBottom: '1px solid #94a3b8' };
  const secTitle = { fontSize: '13px', fontWeight: 700, marginTop: '14px', marginBottom: '4px' };
  const subTitle = { fontSize: '13px', fontWeight: 700, margin: '8px 0 3px' };
  const inp = { border: 'none', outline: 'none', fontSize: '13px', padding: '1px 4px', background: 'transparent', fontFamily: 'inherit', boxSizing: 'border-box' };
  // 테두리 있는 입력칸(면적·대지권비율 — 아파트 계약서 landBox와 동일)
  const box = { border: '1px solid #94a3b8', borderRadius: '3px', outline: 'none', fontSize: '13px', padding: '2px 4px', fontFamily: 'inherit', boxSizing: 'border-box', background: 'white' };
  const gray = { fontSize: '13px', color: '#111827' };
  const hanStyle = { fontSize: '13px', fontWeight: 700, color: '#4f46e5', whiteSpace: 'nowrap' }; // 원+한글(약간 보라)
  const T = (k, ph, w) => <input type="text" value={doc[k] ?? ''} onChange={set(k)} readOnly={readOnly} placeholder={ph || ''} style={{ ...inp, width: w || '100%' }} />;
  const Nr = (k, w) => <input type="number" value={doc[k] ?? ''} onChange={set(k)} readOnly={readOnly} style={{ ...inp, width: w || '120px', textAlign: 'right' }} />;
  // 테두리 있는 면적/비율 입력(60px)
  const NB = (k, w) => <input type="number" value={doc[k] ?? ''} onChange={set(k)} readOnly={readOnly} style={{ ...box, width: w || '60px', textAlign: 'right' }} />;
  const D = (k, w, ph) => <input type="date" value={doc[k] || ''} onChange={set(k)} readOnly={readOnly} placeholder={ph} style={{ ...inp, width: w || '150px' }} />;

  // 입력금액단위: 표 우상단 드롭다운(_금액단위)로 결정 — 글로벌 만단위(doc.man) 무시
  const unit = doc._금액단위 || (doc.man === false ? '원' : '만원');
  const man = unit !== '원';
  const num = (k) => Number(doc[k]) || 0;
  const fmt = (v) => (v || 0).toLocaleString();
  const won = (v) => ((man ? v * 10000 : v) || 0).toLocaleString();
  // 집계 — 분양계약내용 표(분양/옵션/발코니 금액 · 현금납부 · 납부할 · 대출)
  const 분양금액 = num('분양금액');
  const 옵션비 = num('옵션비');           // 옵션금액
  const 발코니확장비 = num('발코니확장비'); // 발코니확장금액
  const 분양현금 = num('분양현금납부');
  const 옵션현금 = num('옵션현금납부');
  const 발코니현금 = num('발코니현금납부');
  const 분양납부할 = 분양금액 - 분양현금;
  const 옵션납부할 = 옵션비 - 옵션현금;
  const 발코니납부할 = 발코니확장비 - 발코니현금;
  const 분양대출 = num('분양대출금액');    // 대출 금액(납부할 금액중 대출)
  const 옵션대출 = num('옵션대출금액');
  const 발코니대출 = num('발코니대출금액');
  // 합계행(각 열 합계)
  const 분양합계 = 분양금액 + 옵션비 + 발코니확장비;         // 분양 합계 금액 = 실분양금액
  const 현금합계 = 분양현금 + 옵션현금 + 발코니현금;         // 현금 납부한 합계 금액
  const 납부할합계 = 분양납부할 + 옵션납부할 + 발코니납부할; // 납부할 합계 금액
  const 대출합계 = 분양대출 + 옵션대출 + 발코니대출;         // (합계) 대출금액
  const 실분양금액 = 분양합계;
  const 납부한금액 = 현금합계;
  const 프리미엄 = num('프리미엄') * (doc.마이너스프리미엄 ? -1 : 1);
  const 총매매금액 = 실분양금액 + 프리미엄;
  const 정산금액 = 납부한금액 + 프리미엄; // 매수인이 실제 지불하는 정산금액

  const M = (k, ph) => {
    const wStr = won(num(k)); const h = hangulAmount(man ? num(k) * 10000 : num(k));
    // 미리보기·인쇄: 무조건 원단위
    if (readOnly) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ fontWeight: 600 }}>{wStr}원</span>{h && <span style={hanStyle}>{h}원</span>}</span>;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><input type="number" value={doc[k] ?? ''} onChange={set(k)} placeholder={ph} style={{ ...inp, width: '120px', textAlign: 'right' }} /><span>{man ? '만원' : '원'}</span><span style={hanStyle}>({wStr}원){h ? ` · ${h}원` : ''}</span></span>;
  };
  const calc = (v) => {
    const wonV = man ? v * 10000 : v;
    if (readOnly) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ minWidth: '120px', textAlign: 'right', fontWeight: 700 }}>{fmt(wonV)}</span><span>원</span></span>;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ minWidth: '120px', textAlign: 'right', fontWeight: 700 }}>{fmt(v)}</span><span>{man ? '만원' : '원'}</span><span style={gray}>({fmt(wonV)}원)</span></span>;
  };
  // 좁은 칸용 금액 입력 셀 / 합계 셀 — '일금 …… 원정' 형식 (만단위면 만 금액만, 원단위면 원 금액만 표기)
  const cell = (k) => (readOnly
    ? <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span>일금</span><div style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>{fmt(num(k))}</div><span>{man ? '만' : '원정'}</span></div>
    : <div style={{ display: 'flex', alignItems: 'center', gap: '2px', width: '100%' }}>
        <span>일금</span><input type="number" value={doc[k] ?? ''} onChange={set(k)} style={{ ...inp, flex: 1, minWidth: 0, textAlign: 'right' }} /><span>{man ? '만' : '원정'}</span>
      </div>);
  const sumCell = (v) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, width: '100%' }}><span>일금</span><span style={{ flex: 1, textAlign: 'right' }}>{fmt(v)}</span><span>{man ? '만' : '원정'}</span></div>);
  // 값 기반 금액 입력(동적 리스트용) — M()과 동일 표시
  const moneyInput = (val, onChange, ph) => {
    const n = Number(val) || 0; const wStr = won(n); const h = hangulAmount(man ? n * 10000 : n);
    if (readOnly) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ fontWeight: 600 }}>{wStr}원</span>{h && <span style={hanStyle}>{h}원</span>}</span>;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><input type="number" value={val ?? ''} onChange={onChange} placeholder={ph} style={{ ...inp, width: '120px', textAlign: 'right' }} /><span>{man ? '만원' : '원'}</span><span style={hanStyle}>({wStr}원){h ? ` · ${h}원` : ''}</span></span>;
  };
  // 좌측 여백(A4 밖) 행 삭제 버튼 · 표 좌상단 추가 버튼(매도자 추가와 통일)
  const delBtnL = { padding: '3px 12px', fontSize: '13px', fontWeight: 600, border: '1px solid #fca5a5', borderRadius: '4px', background: 'white', color: '#dc2626', cursor: 'pointer', whiteSpace: 'nowrap' };
  const pill = { padding: '3px 10px', fontSize: '13px', fontWeight: 600, border: '1px solid #6366f1', borderRadius: '999px', background: 'white', color: '#4f46e5', cursor: 'pointer', whiteSpace: 'nowrap' };
  const gutterBtns = (children) => <span className="contract-actions" style={{ position: 'absolute', left: '-56px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '3px' }}>{children}</span>;
  // 계약금/중도금 동적 리스트(추가/삭제 자유). 기본 각 1줄 — 기존 단일 값 승계
  const deposits = Array.isArray(doc.계약금목록) && doc.계약금목록.length ? doc.계약금목록 : [{ amt: doc.계약금 ?? '', 지급: doc.계약금지급 ?? '계약 시 지급', 영수자: doc.계약금영수자 ?? '' }];
  const mids = Array.isArray(doc.중도금목록) && doc.중도금목록.length ? doc.중도금목록 : [{ amt: doc.중도금 ?? '', date: doc.중도금일자 ?? '' }];
  const setDeposits = (arr) => setDoc((p) => ({ ...p, 계약금목록: arr }));
  const setMids = (arr) => setDoc((p) => ({ ...p, 중도금목록: arr }));

  // 입력금액단위 변경 시 이미 입력된 금액도 실제 원화가 유지되도록 환산(만원↔원)
  const changeUnit = (newUnit) => setDoc((p) => {
    const oldUnit = p._금액단위 || (p.man === false ? '원' : '만원');
    if (newUnit === oldUnit) return { ...p, _금액단위: newUnit };
    const factor = (oldUnit === '만원' && newUnit === '원') ? 10000 : (oldUnit === '원' && newUnit === '만원') ? 1 / 10000 : 1;
    const conv = (v) => { const d = String(v ?? '').replace(/[^0-9.]/g, ''); if (!d) return v; const n = Number(d); if (isNaN(n)) return v; const r = n * factor; return String(Number.isInteger(r) ? r : Number(r.toFixed(6))); };
    const keys = ['분양금액', '옵션비', '발코니확장비', '분양현금납부', '옵션현금납부', '발코니현금납부', '분양대출금액', '옵션대출금액', '발코니대출금액', '프리미엄', '잔금'];
    const next = { ...p, _금액단위: newUnit };
    keys.forEach((k) => { if (next[k] != null && next[k] !== '') next[k] = conv(next[k]); });
    if (Array.isArray(p.계약금목록)) next.계약금목록 = p.계약금목록.map((d) => ({ ...d, amt: conv(d.amt) }));
    if (Array.isArray(p.중도금목록)) next.중도금목록 = p.중도금목록.map((m) => ({ ...m, amt: conv(m.amt) }));
    return next;
  });

  // 입력금액단위 드롭다운(표 우상단)
  const unitSelect = !readOnly && (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
      (입력금액단위 :
      <select value={unit} onChange={(e) => changeUnit(e.target.value)} style={{ fontSize: '13px', fontWeight: 700, padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: '3px', fontFamily: 'inherit', cursor: 'pointer', color: '#111827' }}>
        <option value="만원">만원</option>
        <option value="원">원</option>
      </select>
      )
    </span>
  );
  // 금액 입력: [일금] [AmountInput] — 뒤에 각 행별 '원정/원정은…' 문구가 붙음. 미리보기·인쇄는 정적 한글 표기
  const amtLead = (val, onChange, ph) => {
    if (readOnly) {
      const n = Number(String(val ?? '').replace(/[^0-9.]/g, '')) || 0;
      const w = man ? n * 10000 : n;
      return <><span style={{ fontWeight: 600 }}>일금</span> <span style={hanStyle}>{w ? hangulAmount(w) : ''}</span></>;
    }
    return (
      <>
        <span style={{ fontWeight: 600, color: '#111827' }}>일금</span>
        <AmountInput value={val} onChange={onChange} man={man} placeholder={ph} style={{ ...box, width: '200px', textAlign: 'right' }} />
      </>
    );
  };
  // 계산 금액 표시: [일금] [자동표기 입력창(readOnly)] 원정 (₩ 원단위) — 입력행과 수직 정렬
  const calcLead = (v) => {
    const wonV = man ? v * 10000 : v;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, color: readOnly ? '#111' : '#475569' }}>일금</span>
        {readOnly
          ? <span style={hanStyle}>{wonV ? hangulAmount(wonV) : ''}</span>
          : <input type="text" readOnly value={wonV ? hangulAmount(wonV) : ''} style={{ ...box, width: '200px', textAlign: 'right', background: '#f8fafc', fontWeight: 700, color: '#4f46e5' }} />}
        <span>원정</span>
        <span style={hanStyle}>(₩ {wonV ? `${fmt(wonV)}원` : '-'})</span>
      </span>
    );
  };

  return (
    <div>
      {/* 1. 부동산 표시 — 소재지+TYPE(1행) / 분양·전용·대지권(2행), 면적·비율 입력창 테두리 (아파트 계약서 참고) */}
      <div style={secTitle}>1. 부동산 표시</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
        <tr>
          <td style={{ ...th, width: '80px' }}>{addrLabel('소재지')}</td>
          <td style={td} colSpan={5}><div style={{ display: 'flex', gap: '8px' }}>{T('소재지', '소재지')}{T('소재지도로명', '소재지 상세')}</div></td>
          <td style={{ ...th, width: '56px' }}>TYPE</td>
          <td style={td}>{T('분양TYPE', 'type', '80px')}</td>
        </tr>
        <tr>
          <td style={{ ...th, width: '80px' }}>분양면적</td>
          <td style={td}>{NB('분양면적')} ㎡</td>
          <td style={th}>전용면적</td>
          <td style={td}>{NB('전용면적')} ㎡</td>
          <td style={{ ...th, whiteSpace: 'normal', lineHeight: 1.2 }}>대지권의 목적인 토지의 면적</td>
          <td style={td}>{NB('대지권토지면적')} ㎡</td>
          <td style={th}>대지권비율</td>
          <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{NB('대지권분모')}<span style={{ fontSize: '13px' }}>분의</span>{NB('대지권분자')}</div></td>
        </tr>
      </tbody></table>

      {/* 2. 계약 내용 */}
      <div style={{ ...secTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>2. 계약 내용</span>
        {/* 만단위 적용: 툴바 저장 버튼 좌측 공통 위치로 이동 */}
      </div>
      <div style={{ fontSize: '13px', color: '#1f2937', margin: '2px 0' }}>제1조 [목적] 매도인과 매수인은 위 부동산(분양권)에 대하여 계약당사자의 합의에 따라 매수인은 매도인에게 아래와 같이 매매대금을 지급하기로 한다.</div>

      {/* 분양계약내용 — 분양/옵션/발코니 금액 · 현금 납부한 금액 · 납부할 금액 · 대출금액 (맨 아래 행=각 열 합계) */}
      <div style={subTitle}>분양계약내용</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup><col style={{ width: '25%' }} /><col style={{ width: '25%' }} /><col style={{ width: '25%' }} /><col style={{ width: '25%' }} /></colgroup>
        <tbody>
          {/* 분양금액 */}
          <tr><td style={thB}>분양금액</td><td style={thB}>현금 납부한 금액</td><td style={thB}>융자금</td><td style={thB}>납부할 금액</td></tr>
          <tr><td style={tdB}>{cell('분양금액')}</td><td style={tdB}>{cell('분양현금납부')}</td><td style={tdB}>{cell('분양대출금액')}</td><td style={tdB}>{sumCell(분양납부할)}</td></tr>
          <tr><td colSpan={4} style={{ border: 'none', height: '6px', padding: 0 }} /></tr>
          {/* 옵션금액 */}
          <tr><td style={thB}>옵션금액</td><td style={thB}>현금 납부한 금액</td><td style={thB}>융자금</td><td style={thB}>납부할 금액</td></tr>
          <tr><td style={tdB}>{cell('옵션비')}</td><td style={tdB}>{cell('옵션현금납부')}</td><td style={tdB}>{cell('옵션대출금액')}</td><td style={tdB}>{sumCell(옵션납부할)}</td></tr>
          <tr><td colSpan={4} style={{ border: 'none', height: '6px', padding: 0 }} /></tr>
          {/* 발코니확장금액 */}
          <tr><td style={thB}>발코니확장금액</td><td style={thB}>현금 납부한 금액</td><td style={thB}>융자금</td><td style={thB}>납부할 금액</td></tr>
          <tr><td style={tdB}>{cell('발코니확장비')}</td><td style={tdB}>{cell('발코니현금납부')}</td><td style={tdB}>{cell('발코니대출금액')}</td><td style={tdB}>{sumCell(발코니납부할)}</td></tr>
          <tr><td colSpan={4} style={{ border: 'none', height: '6px', padding: 0 }} /></tr>
          {/* 합계 */}
          <tr><td style={thB}>(합계) 분양 금액</td><td style={thB}>(합계) 현금 납부한 금액</td><td style={thB}>(합계) 융자금</td><td style={thB}>(합계) 납부할 금액</td></tr>
          <tr><td style={{ ...tdB, background: '#f8fafc' }}>{sumCell(분양합계)}</td><td style={{ ...tdB, background: '#f8fafc' }}>{sumCell(현금합계)}</td><td style={{ ...tdB, background: '#f8fafc' }}>{sumCell(대출합계)}</td><td style={{ ...tdB, background: '#f8fafc' }}>{sumCell(납부할합계)}</td></tr>
        </tbody>
      </table>

      {/* 매매금액 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ ...subTitle, margin: '8px 0 3px' }}>매매금액 <span style={gray}>(분양합계금액+프리미엄)</span></div>
        {unitSelect}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
        <tr>
          <td style={{ ...th, width: '80px' }}>프리미엄</td>
          <td style={td} colSpan={3}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {amtLead(doc.프리미엄, (e) => setDoc((p) => ({ ...p, 프리미엄: e.target.value })))}
              <span>원정</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer', marginLeft: '6px' }}><input type="checkbox" checked={doc.마이너스프리미엄 === true} onChange={(e) => setDoc((p) => ({ ...p, 마이너스프리미엄: e.target.checked }))} /> 마이너스프리미엄</label>
            </span>
          </td>
        </tr>
        <tr><td style={{ ...th, width: '80px' }}>매매 금액</td><td style={td} colSpan={3}>{calcLead(총매매금액)}</td></tr>
      </tbody></table>

      {/* 지급 표(정산금액/계약금/중도금/잔금) — 타이틀 + 추가 버튼 한 줄, 행 삭제는 좌측 여백 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '8px' }}>
        <div style={{ ...subTitle, margin: 0 }}>정산금액 <span style={gray}>(현금 납부한 합계금액 + 프리미엄)</span></div>
        {!readOnly && (
          <div className="contract-actions" style={{ display: 'flex', gap: '6px' }}>
            <button type="button" onClick={() => setDeposits([...deposits, { amt: '', 지급: '계약 시 지급', 영수자: '' }])} style={pill}>＋ 계약금 추가</button>
            <button type="button" onClick={() => setMids([...mids, { amt: '', date: '' }])} style={pill}>＋ 중도금 추가</button>
          </div>
        )}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: readOnly ? '8px' : '0' }}><tbody>
        <tr><td style={{ ...th, width: '80px' }}>정산금액</td><td style={td} colSpan={3}>{calcLead(정산금액)}</td></tr>
        {deposits.map((d, i) => (
          <tr key={`dep${i}`}>
            <td style={{ ...th, width: '80px', position: 'relative' }}>계약금
              {!readOnly && i > 0 && gutterBtns(<button type="button" onClick={() => setDeposits(deposits.filter((_, j) => j !== i))} style={delBtnL}>삭제</button>)}
            </td>
            <td style={td} colSpan={3}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {amtLead(d.amt, (e) => setDeposits(deposits.map((x, j) => (j === i ? { ...x, amt: e.target.value } : x))))}
                <span>원정은 계약시에 지급하고 영수함. 영수자</span>
                <input type="text" value={d.영수자 ?? ''} onChange={(e) => setDeposits(deposits.map((x, j) => (j === i ? { ...x, 영수자: e.target.value } : x)))} readOnly={readOnly} placeholder="영수자 자필서명" style={{ ...inp, width: '130px' }} />
                <span>(인)</span>
              </span>
            </td>
          </tr>
        ))}
        {mids.map((m, i) => (
          <tr key={`mid${i}`}>
            <td style={{ ...th, width: '80px', position: 'relative' }}>중도금
              {!readOnly && i > 0 && gutterBtns(<button type="button" onClick={() => setMids(mids.filter((_, j) => j !== i))} style={delBtnL}>삭제</button>)}
            </td>
            <td style={td} colSpan={3}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {amtLead(m.amt, (e) => setMids(mids.map((x, j) => (j === i ? { ...x, amt: e.target.value } : x))))}
                <span>원정은</span>
                <input type="date" value={m.date || ''} onChange={(e) => setMids(mids.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} readOnly={readOnly} style={{ ...inp, width: '150px' }} />
                <span>에 지급한다.</span>
              </span>
            </td>
          </tr>
        ))}
        <tr>
          <td style={{ ...th, width: '80px' }}>잔금</td>
          <td style={td} colSpan={3}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {amtLead(doc.잔금, (e) => setDoc((p) => ({ ...p, 잔금: e.target.value })))}<span>원정은</span>{D('잔금일자', '150px', '잔금 지급일')}<span>에 지급한다.</span>
            </span>
          </td>
        </tr>
      </tbody></table>

      {/* 대출금액 (분양·옵션·발코니 대출 합계 — 현상태에서 매수인 승계) */}
      <div style={subTitle}>대출금액</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
        <tr><td style={{ ...th, width: '110px' }}>대출금액</td><td style={td} colSpan={3}>{calc(대출합계)} <span style={gray}>(분양·옵션·발코니 대출 합계, 현상태에서 승계)</span></td></tr>
      </tbody></table>
    </div>
  );
}
