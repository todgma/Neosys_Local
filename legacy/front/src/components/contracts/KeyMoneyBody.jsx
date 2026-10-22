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
 * 상가건물 임대차 권리금계약서 전용 본문 (1.상가건물 표시 / 2.임대차계약 현황 / 3.계약내용)
 *  - doc/set/setDoc은 부모(ContractDocumentEditor)에서 전달. 값은 doc에 저장 → 미리보기/인쇄/저장 공유
 *  - 조항(제1~4조)은 편집 시 숨김, 미리보기/인쇄(readOnly·조항표시)에서만 노출(부모가 처리)
 */
const addMonths = (dateStr, months) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + months);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function KeyMoneyBody({ doc, set, setDoc, readOnly, onAddrSearch }) {
  // 소재지 라벨(밑줄) 클릭 시 주소검색 모달 — 부동산계약서와 동일
  const addrLabel = (key, text = '소재지') => (
    <button type="button" onClick={() => { if (!readOnly && onAddrSearch) onAddrSearch(key); }} title="주소 검색"
      style={{ border: 'none', background: 'transparent', font: 'inherit', color: readOnly ? 'inherit' : '#4f46e5', textDecoration: readOnly ? 'none' : 'underline', cursor: readOnly ? 'default' : 'pointer', padding: 0 }}>{text}</button>
  );
  const th = { border: '1px solid #334155', background: '#f1f5f9', padding: '5px 6px', fontSize: '13px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap', color: '#111827' };
  const td = { border: '1px solid #334155', padding: '4px 6px', fontSize: '13px', verticalAlign: 'middle' };
  const secTitle = { fontSize: '13px', fontWeight: 700, marginTop: '14px', marginBottom: '4px' };
  const inp = { border: 'none', outline: 'none', fontSize: '13px', padding: '1px 4px', background: 'transparent', fontFamily: 'inherit', boxSizing: 'border-box' };
  const sel = { ...inp, cursor: 'pointer', width: '100%' };
  const smallBtn = { padding: '3px 10px', fontSize: '13px', fontWeight: 600, border: '1px solid #334155', borderRadius: '4px', background: 'white', color: '#111827', cursor: 'pointer', whiteSpace: 'nowrap' };
  const T = (k, ph, w) => <input type="text" value={doc[k] ?? ''} onChange={set(k)} readOnly={readOnly} placeholder={ph || ''} style={{ ...inp, width: w || '100%' }} />;
  const Nr = (k, w) => <input type="number" value={doc[k] ?? ''} onChange={set(k)} readOnly={readOnly} style={{ ...inp, width: w || '130px', textAlign: 'right' }} />;
  const D = (k, w, ph) => <input type="date" value={doc[k] || ''} onChange={set(k)} readOnly={readOnly} placeholder={ph} style={{ ...inp, width: w || '150px' }} />;
  const R = (name, val, label) => (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '13px', marginRight: '12px', cursor: 'pointer' }}>
      <input type="radio" name={name} checked={doc[name] === val} onChange={() => !readOnly && setDoc((p) => ({ ...p, [name]: val }))} /> {label}
    </label>
  );
  // 입력금액단위: 표 우상단 드롭다운(_금액단위)로 결정 — 글로벌 만단위(doc.man) 무시
  const unit = doc._금액단위 || (doc.man === false ? '원' : '만원');
  const man = unit !== '원';
  const box = { border: '1px solid #94a3b8', borderRadius: '3px', outline: 'none', fontSize: '13px', padding: '2px 4px', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' };
  const hanStyle = { fontSize: '13px', fontWeight: 700, color: '#4f46e5' };
  // 금액: [일금] [숫자입력(포커스 해제 시 한글)] — 부동산 계약서와 동일 rule
  const amtLead = (k, ph) => {
    if (readOnly) {
      const n = Number(String(doc[k] ?? '').replace(/[^0-9.]/g, '')) || 0; const w = man ? n * 10000 : n;
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ fontWeight: 600 }}>일금</span><span style={hanStyle}>{w ? hangulAmount(w) : ''}</span></span>;
    }
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ fontWeight: 600, color: '#111827' }}>일금</span><AmountInput value={doc[k]} onChange={set(k)} man={man} placeholder={ph} style={{ ...box, width: '160px', textAlign: 'right' }} /></span>;
  };
  const money = (k, ph) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>{amtLead(k, ph)}<span>원정</span></span>;
  // 입력금액단위 변경 시 이미 입력된 금액 환산(만원↔원)
  const changeUnit = (newUnit) => setDoc((p) => {
    const oldUnit = p._금액단위 || (p.man === false ? '원' : '만원');
    if (newUnit === oldUnit) return { ...p, _금액단위: newUnit };
    const factor = (oldUnit === '만원' && newUnit === '원') ? 10000 : (oldUnit === '원' && newUnit === '만원') ? 1 / 10000 : 1;
    const conv = (v) => { const d = String(v ?? '').replace(/[^0-9.]/g, ''); if (!d) return v; const n = Number(d); if (isNaN(n)) return v; const r = n * factor; return String(Number.isInteger(r) ? r : Number(r.toFixed(6))); };
    const keys = ['임차보증금', '권리월차임', '권리관리비', '총권리금', '권리계약금', '권리중도금', '권리잔금'];
    const next = { ...p, _금액단위: newUnit };
    keys.forEach((k) => { if (next[k] != null && next[k] !== '') next[k] = conv(next[k]); });
    return next;
  });
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

  return (
    <div>
      <div style={{ fontSize: '13px', color: '#374151', marginTop: '6px' }}>임차인({T('임차인_성명', '', '100px')})과(와) 신규임차인({T('신규임차인_성명', '', '100px')})는(은) 아래와 같이 권리금 계약을 체결한다.</div>
      <div style={{ fontSize: '13px', color: '#111827' }}>※ 임차인은 권리금을 지급받는 사람을, 신규임차인은 권리금을 지급하는 사람을 의미한다.</div>

      {/* 1. 상가건물의 표시 */}
      <div style={secTitle}>1. 임대차목적물인 상가건물의 표시</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
        <tr>
          <td style={{ ...th, width: '80px' }}>{addrLabel('소재지')}</td>
          <td style={td} colSpan={5}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" value={doc.소재지 ?? ''} onChange={set('소재지')} readOnly={readOnly} placeholder="소재지" style={{ ...inp, flex: 1 }} />
              <input type="text" value={doc.소재지도로명 ?? ''} onChange={set('소재지도로명')} readOnly={readOnly} placeholder="소재지 상세주소" style={{ ...inp, flex: 1 }} />
            </div>
          </td>
        </tr>
        <tr>
          <td style={{ ...th, width: '80px' }}>상호</td>
          <td style={td}>{T('권리상호', '상호')}</td>
          <td style={{ ...th, width: '80px' }}>임대면적</td>
          <td style={td}>{Nr('권리임대면적', '90px')} ㎡</td>
          <td style={{ ...th, width: '80px' }}>전용면적</td>
          <td style={td}>{Nr('권리전용면적', '90px')} ㎡</td>
        </tr>
        <tr>
          <td style={th}>업종</td>
          <td style={td}>{T('권리업종', '업종')}</td>
          <td style={th}>허가(등록)번호</td>
          <td style={td} colSpan={3}>{T('권리허가번호', '허가(등록)번호')}</td>
        </tr>
      </tbody></table>

      {/* 2. 임차인의 임대차계약 현황 */}
      <div style={{ ...secTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>2. 임차인의 임대차계약 현황</span>
        {unitSelect}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
        <tr>
          <td style={{ ...th, width: '80px' }}>임차보증금</td>
          <td style={td}>{money('임차보증금', '임차보증금')}</td>
          <td style={{ ...th, width: '80px' }}>월차임</td>
          <td style={td}>{money('권리월차임', '월차임')}</td>
        </tr>
        <tr>
          <td style={th}>관리비</td>
          <td style={td}>{money('권리관리비', '관리비')}</td>
          <td style={th}>부가가치세</td>
          <td style={td}>{R('권리부가세', '별도', '별도')}{R('권리부가세', '포함', '포함')}</td>
        </tr>
        <tr>
          <td style={th}>계약기간</td>
          <td style={td} colSpan={3}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {D('권리계약시작', '150px', '날짜를 선택하세요')}<span>-</span>{D('권리계약종료', '150px', '날짜를 선택하세요')}
              {!readOnly && <button type="button" onClick={() => setDoc((p) => ({ ...p, 권리계약종료: addMonths(p.권리계약시작, 12) }))} style={smallBtn}>12개월</button>}
              {!readOnly && <button type="button" onClick={() => setDoc((p) => ({ ...p, 권리계약종료: addMonths(p.권리계약시작, 24) }))} style={smallBtn}>24개월</button>}
            </div>
          </td>
        </tr>
      </tbody></table>

      {/* 3. 계약내용 */}
      <div style={{ ...secTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>3. 계약내용</span>
        {/* 만단위 적용: 툴바 저장 버튼 좌측 공통 위치로 이동 */}
      </div>
      <div style={{ fontSize: '13px', color: '#1f2937', margin: '2px 0' }}><b>제1조 [권리금의 지급]</b> 신규임차인은 임차인에게 다음과 같이 권리금을 지급한다.</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
        <tr>
          <td style={{ ...th, width: '80px' }}>총 권리금</td>
          <td style={td}>{money('총권리금', '총 권리금')}</td>
          <td style={{ ...th, width: '96px' }}>부가가치세 표시</td>
          <td style={td}>{R('권리금부가세', '별도', '부가세 별도')}{R('권리금부가세', '포함', '부가세 포함')}{R('권리금부가세', '포괄양수도', '포괄양수도 계약')}</td>
        </tr>
        <tr>
          <td style={th}>계약금</td>
          <td style={td}>{money('권리계약금', '계약금')}</td>
          <td style={th}>영수자</td>
          <td style={td}>{T('권리영수자', '계약금 영수자')}</td>
        </tr>
        <tr>
          <td style={th}>중도금</td>
          <td style={td}>{money('권리중도금', '중도금')}</td>
          <td style={th}>중도금 지급일</td>
          <td style={td}>{D('권리중도금일자', '150px', '중도금 지급일')}</td>
        </tr>
        <tr>
          <td style={th}>잔금</td>
          <td style={td} colSpan={3}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {amtLead('권리잔금', '잔금')}<span>원정은</span>{D('권리잔금일자', '150px', '잔금 지급일')}<span>일에 지급한다.</span>
            </span>
          </td>
        </tr>
      </tbody></table>
      <div style={{ fontSize: '13px', color: '#dc2626', marginTop: '3px' }}>※ 잔금지급일까지 임대인과 신규임차인 사이에 임대차계약이 체결되지 않는 경우 임대차계약체결일을 잔금지급일로 본다.</div>

      {/* 재산적 가치 */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}><tbody>
        <tr>
          <td style={{ ...th, width: '120px' }}>유형의 재산적 가치</td>
          <td style={td}><textarea value={doc.유형재산 ?? ''} onChange={set('유형재산')} readOnly={readOnly} rows={2} placeholder="영업시설·비품 등" style={{ ...inp, width: '100%', borderBottom: 'none', resize: 'vertical' }} /></td>
        </tr>
        <tr>
          <td style={th}>무형의 재산적 가치</td>
          <td style={td}><textarea value={doc.무형재산 ?? ''} onChange={set('무형재산')} readOnly={readOnly} rows={2} placeholder="거래처, 신용, 영업상의 노하우, 위치에 따른 이점 등" style={{ ...inp, width: '100%', borderBottom: 'none', resize: 'vertical' }} /></td>
        </tr>
      </tbody></table>
    </div>
  );
}
