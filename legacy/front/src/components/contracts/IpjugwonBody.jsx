import React from 'react';
import { hangulAmount } from '../../utils/hangulAmount';
import { LAND_CATEGORIES } from '../../constants/landCategories';

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

// 건물 용도 드롭다운 옵션 (다른 계약서와 동일)
const BUILDING_USE_OPTS = ['아파트', '업무시설', '공동주택', '연립주택', '다세대주택', '단독주택', '다가구주택', '다중주택', '근린생활시설 및 주택', '근린생활시설', '공장', '창고시설', '없음', '직접입력'];

/**
 * 조합원 입주권 매매 계약서 전용 본문 (1.부동산 표시 / 2.계약 내용: 종전자산평가·총매매/정산·지급표)
 *  - 값은 doc에 저장 → 미리보기/인쇄/저장 공유. 조항(제2~11조)은 부모(에디터)가 렌더
 */
export default function IpjugwonBody({ doc, set, setDoc, readOnly, onAddrSearch }) {
  // 소재지 라벨(밑줄) 클릭 시 주소검색 모달 — 부동산계약서와 동일
  const addrLabel = (key, text = '소재지') => (
    <button type="button" onClick={() => { if (!readOnly && onAddrSearch) onAddrSearch(key); }} title="주소 검색"
      style={{ border: 'none', background: 'transparent', font: 'inherit', color: readOnly ? 'inherit' : '#4f46e5', textDecoration: readOnly ? 'none' : 'underline', cursor: readOnly ? 'default' : 'pointer', padding: 0 }}>{text}</button>
  );
  const th = { border: '1px solid #334155', background: '#f1f5f9', padding: '5px 6px', fontSize: '13px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap', color: '#111827' };
  const td = { border: '1px solid #334155', padding: '4px 6px', fontSize: '13px', verticalAlign: 'middle' };
  // 분양계약내용: 각 블록 하단 줄만 연하게 (분양권과 동일)
  const tdB = { ...td, borderBottom: '1px solid #cbd5e1' };
  const secTitle = { fontSize: '13px', fontWeight: 700, marginTop: '14px', marginBottom: '4px' };
  const subTitle = { fontSize: '13px', fontWeight: 700, margin: '10px 0 3px' };
  const inp = { border: 'none', outline: 'none', fontSize: '13px', padding: '1px 4px', background: 'transparent', fontFamily: 'inherit', boxSizing: 'border-box' };
  const box = { border: '1px solid #94a3b8', borderRadius: '3px', outline: 'none', fontSize: '13px', padding: '2px 4px', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' };
  const gray = { fontSize: '13px', color: '#111827' };
  const hanStyle = { fontSize: '13px', fontWeight: 700, color: '#4f46e5', whiteSpace: 'nowrap' };
  const T = (k, ph, w) => <input type="text" value={doc[k] ?? ''} onChange={set(k)} readOnly={readOnly} placeholder={ph || ''} style={{ ...inp, width: w || '100%' }} />;
  const Nr = (k, w) => <input type="number" value={doc[k] ?? ''} onChange={set(k)} readOnly={readOnly} style={{ ...inp, width: w || '90px', textAlign: 'right' }} />;
  const D = (k, w, ph) => <input type="date" value={doc[k] || ''} onChange={set(k)} readOnly={readOnly} placeholder={ph} style={{ ...inp, width: w || '150px' }} />;

  // 입력금액단위: 표 우상단 드롭다운(_금액단위)로 결정 — 글로벌 만단위(doc.man) 무시
  const unit = doc._금액단위 || (doc.man === false ? '원' : '만원');
  const man = unit !== '원';
  const num = (k) => Number(doc[k]) || 0;
  const fmt = (v) => (v || 0).toLocaleString();
  const won = (v) => ((man ? v * 10000 : v) || 0).toLocaleString();
  const pct = (k) => Number(doc[k]) || 0;
  // 물건유형(입주권 단계)에 따라 종전자산평가·정산지불금 산식이 달라짐
  //  관리처분인가후 이주전(기본) / 이주후 멸실전(isAfter) / 멸실후 동호수추첨전·동호수추첨후(isDone)
  const stage = doc.입주권단계 || doc.docType || '';
  const isDone = stage.includes('동호수추첨후') || stage.includes('분양계약 완료'); // 동호수 추첨 및 분양계약 완료(구: 동호수추첨후)
  const isAfter = !isDone && stage.includes('멸실'); // 이주후 멸실전 · 멸실후 동호수추첨전(우선 멸실전과 동일)
  const isChuchumJeon = stage.includes('동호수추첨전'); // 멸실후 동호수추첨전(건물 멸실 상태)
  const useLoan = isAfter || isDone; // 이주비 등 대출합계 방식 종전자산평가
  // 공통 집계
  const 프리미엄 = num('프리미엄') * (doc.마이너스프리미엄 ? -1 : 1);
  const 이주비등대출합계 = num('무이자이주비대출') + num('유이자이주비대출') + num('이사비대출');
  // ── 분양계약내용(분양계약 완료 후) 집계 ──
  const 조합원분양가 = num('조합원분양가');
  const 권리가액 = doc.권리가액직접 ? num('권리가액') : Math.round(num('감정가') * pct('비례율') / 100);
  const 추가부담금 = 조합원분양가 - 권리가액;
  const 분양계약금 = doc.분양계약금직접 ? num('분양계약금') : Math.round(조합원분양가 * pct('분양계약금비율') / 100);
  const 중도금대출금액 = Math.round(조합원분양가 * pct('중도금대출비율') / 100);
  const 중도금자납금액 = Math.round(조합원분양가 * pct('중도금자납비율') / 100);
  const 잔여금액중잔 = 조합원분양가 - 분양계약금 - 중도금대출금액 - 중도금자납금액;
  const 잔금비율 = 조합원분양가 ? Math.round(잔여금액중잔 / 조합원분양가 * 100) : 0;
  const 옵션비 = num('옵션비');
  const 옵션납부금액 = doc.옵션납부직접 ? num('옵션납부금액') : Math.round(옵션비 * pct('옵션납부비율') / 100);
  const 옵션잔금 = 옵션비 - 옵션납부금액;
  const 옵션잔금비율 = 옵션비 ? Math.round(옵션잔금 / 옵션비 * 100) : 0;
  const 발코니확장비 = num('발코니확장비');
  const 발코니납부금액 = doc.발코니납부직접 ? num('발코니납부금액') : Math.round(발코니확장비 * pct('발코니납부비율') / 100);
  const 발코니잔금 = 발코니확장비 - 발코니납부금액;
  const 발코니잔금비율 = 발코니확장비 ? Math.round(발코니잔금 / 발코니확장비 * 100) : 0;
  const 실분양금액 = 조합원분양가 + 옵션비 + 발코니확장비; // = 분양 합계 금액
  // 분양계약내용 표(분양권 계약서와 동일 형식): 현금 납부/납부할/대출 열
  const 분양현금 = num('분양현금납부');
  const 옵션현금 = num('옵션현금납부');
  const 발코니현금 = num('발코니현금납부');
  const 분양납부할 = 조합원분양가 - 분양현금;
  const 옵션납부할행 = 옵션비 - 옵션현금;
  const 발코니납부할 = 발코니확장비 - 발코니현금;
  const 분양대출 = num('분양대출금액');
  const 옵션대출 = num('옵션대출금액');
  const 발코니대출 = num('발코니대출금액');
  const 대출합계 = 분양대출 + 옵션대출 + 발코니대출;
  const 현금합계 = 분양현금 + 옵션현금 + 발코니현금;
  const 납부할합계 = 분양납부할 + 옵션납부할행 + 발코니납부할;
  const 납부한금액 = 현금합계; // 현금 납부한 합계
  // 총 매매금액·정산금액 (단계별 산식)
  const 총매매금액 = isDone ? (실분양금액 + 프리미엄) : (num('감정가') + 프리미엄);
  const 납부할금액 = 실분양금액 - 납부한금액;
  const 정산지불금 = isDone ? (총매매금액 - 이주비등대출합계 - 납부할금액)
    : isAfter ? (총매매금액 - 이주비등대출합계)
      : (num('보증금') + num('근저당실채무액'));

  // 금액 입력: [일금] [AmountInput(포커스=콤마숫자 / 해제=한글)] 원정 — 부동산 계약서와 동일 rule
  const amtField = (val, onChange, ph) => {
    if (readOnly) {
      const n = Number(String(val ?? '').replace(/[^0-9.]/g, '')) || 0;
      const w = man ? n * 10000 : n;
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ fontWeight: 600 }}>일금</span><span style={hanStyle}>{w ? hangulAmount(w) : ''}</span><span>원정</span></span>;
    }
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ fontWeight: 600, color: '#111827' }}>일금</span><AmountInput value={val} onChange={onChange} man={man} placeholder={ph} style={{ ...box, width: '200px', textAlign: 'right' }} /><span>원정</span></span>;
  };
  // 계산 금액: [일금] [자동표기 입력창(readOnly)] 원정 (₩ 원단위) — 입력행과 수직 정렬
  const calcField = (v) => {
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
  const M = (k, ph) => amtField(doc[k], set(k), ph);
  const moneyInput = (val, onChange, ph) => amtField(val, onChange, ph);
  const calc = (v) => calcField(v);
  const sumM = (v) => calcField(v);
  // 좁은 칸용 금액 입력 셀(입력값=만단위) / 합계 셀(계산값) — 분양계약내용 표(분양권과 동일)
  const cell = (k) => (readOnly
    ? <div style={{ textAlign: 'right', fontWeight: 600 }}>{won(num(k))}원</div>
    : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', width: '100%' }}>
          <input type="number" value={doc[k] ?? ''} onChange={set(k)} style={{ ...inp, flex: 1, minWidth: 0, textAlign: 'right' }} /><span style={{ fontSize: '13px' }}>{man ? '만' : '원'}</span>
        </div>
        {num(k) > 0 && <span style={gray}>{won(num(k))}원</span>}
      </div>);
  const sumCell = (v) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <div style={{ fontWeight: 700 }}>{fmt(v)} {man ? '만' : '원'}</div>
      {v !== 0 && <span style={gray}>{won(v)}원</span>}
    </div>);
  // 비율(%) 입력 / 회차(회) 입력
  const R = (k, unit) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><input type="number" value={doc[k] ?? ''} onChange={set(k)} readOnly={readOnly} style={{ ...box, width: '54px', textAlign: 'right' }} /><span style={{ fontSize: '13px' }}>{unit}</span></span>;
  // 직접입력 체크박스
  const Direct = (k, label) => <label style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '13px', cursor: 'pointer', marginLeft: '6px' }}><input type="checkbox" checked={doc[k] === true} onChange={(e) => setDoc((p) => ({ ...p, [k]: e.target.checked }))} disabled={readOnly} /> {label || '직접입력'}</label>;

  // 좌측 여백(A4 밖) 행 삭제 버튼 (당사자·금액 삭제 버튼과 통일) — 추가 버튼은 표 우상단 버튼행으로 이동
  const delBtnL = { padding: '3px 12px', fontSize: '13px', fontWeight: 600, border: '1px solid #fca5a5', borderRadius: '4px', background: 'white', color: '#dc2626', cursor: 'pointer', whiteSpace: 'nowrap' };
  // 표 우상단 추가 버튼(알약형)
  const pill = { padding: '3px 10px', fontSize: '13px', fontWeight: 600, border: '1px solid #6366f1', borderRadius: '999px', background: 'white', color: '#4f46e5', cursor: 'pointer', whiteSpace: 'nowrap' };
  const gutterBtns = (children) => <span className="contract-actions" style={{ position: 'absolute', left: '-56px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '3px' }}>{children}</span>;
  // 계약금/중도금 동적 리스트(추가/삭제 자유). 기본 각 1줄
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
    const keys = ['무이자이주비대출', '유이자이주비대출', '이사비대출', '권리가액', '감정가', '프리미엄', '조합원분양가', '옵션비', '발코니확장비', '분양현금납부', '옵션현금납부', '발코니현금납부', '분양대출금액', '옵션대출금액', '발코니대출금액', '분양계약금', '옵션납부금액', '발코니납부금액', '보증금', '근저당실채무액', '잔금', '융자금'];
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

  return (
    <div>
      {/* 1. 부동산 표시 */}
      <div style={secTitle}>1. 부동산 표시</div>
      {isDone && (<>
        {/* 분양 부동산 = 분양권 매매계약서 상단표와 동일(소재지/TYPE · 분양·전용면적·대지권) */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}><tbody>
          <tr>
            <td style={{ ...th, width: '80px' }}>{addrLabel('분양소재지')}</td>
            <td style={td} colSpan={5}><div style={{ display: 'flex', gap: '8px' }}>{T('분양소재지', '소재지')}{T('분양소재지도로명', '소재지 상세')}</div></td>
            <td style={{ ...th, width: '56px' }}>TYPE</td>
            <td style={td}>{T('분양TYPE', 'type', '80px')}</td>
          </tr>
          <tr>
            <td style={{ ...th, width: '80px' }}>분양면적</td>
            <td style={td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><input type="number" value={doc.분양공급면적 ?? ''} onChange={set('분양공급면적')} readOnly={readOnly} style={{ ...box, width: '60px', textAlign: 'right' }} /> ㎡</span></td>
            <td style={th}>전용면적</td>
            <td style={td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><input type="number" value={doc.분양전용면적 ?? ''} onChange={set('분양전용면적')} readOnly={readOnly} style={{ ...box, width: '60px', textAlign: 'right' }} /> ㎡</span></td>
            <td style={{ ...th, whiteSpace: 'normal', lineHeight: 1.2 }}>대지권의 목적인 토지의 면적</td>
            <td style={td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><input type="number" value={doc.분양대지권토지면적 ?? ''} onChange={set('분양대지권토지면적')} readOnly={readOnly} style={{ ...box, width: '60px', textAlign: 'right' }} /> ㎡</span></td>
            <td style={th}>대지권비율</td>
            <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><input type="number" value={doc.분양대지권분모 ?? ''} onChange={set('분양대지권분모')} readOnly={readOnly} style={{ ...box, width: '60px', textAlign: 'right' }} /><span style={{ fontSize: '13px' }}>분의</span><input type="number" value={doc.분양대지권분자 ?? ''} onChange={set('분양대지권분자')} readOnly={readOnly} style={{ ...box, width: '60px', textAlign: 'right' }} /></div></td>
          </tr>
        </tbody></table>
        <div style={secTitle}>2. 종전토지</div>
      </>)}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
        <tr>
          <td style={{ ...th, width: '80px' }}>{addrLabel('소재지')}</td>
          <td style={td} colSpan={6}>{T('소재지', '소재지')}</td>
        </tr>
        <tr>
          <td style={{ ...th, width: '80px' }}>토지</td>
          <td style={{ ...th, width: '52px' }}>면적</td>
          <td style={td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><input type="number" value={doc.토지면적 ?? ''} onChange={set('토지면적')} readOnly={readOnly} style={{ ...box, width: '60px', textAlign: 'right' }} /> ㎡</span></td>
          <td style={{ ...th, width: '52px' }}>지목</td>
          <td style={td}>
            <select value={doc.토지지목 ?? ''} onChange={set('토지지목')} disabled={readOnly} style={{ ...box, width: '110px', cursor: readOnly ? 'default' : 'pointer' }}>
              <option value="">선택</option>
              {LAND_CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
            </select>
          </td>
          <td style={th}>대지권비율</td>
          <td style={td}>
            {readOnly
              ? <span style={{ fontSize: '13px' }}>{(doc.대지권분모 || doc.대지권분자) ? `${doc.대지권분모 || ''}분의 ${doc.대지권분자 || ''}` : ''}</span>
              : <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><input type="text" value={doc.대지권분모 ?? ''} onChange={set('대지권분모')} placeholder="분모" style={{ ...box, width: '56px', textAlign: 'center' }} /><span style={{ fontSize: '13px' }}>분의</span><input type="text" value={doc.대지권분자 ?? ''} onChange={set('대지권분자')} placeholder="분자" style={{ ...box, width: '56px', textAlign: 'center' }} /></div>}
          </td>
        </tr>
        {/* 종전토지(동호수추첨후)는 건물 행 없음 */}
        {!isDone && (isChuchumJeon ? (
          <tr>
            <td style={{ ...th, width: '80px' }}>건물</td>
            <td style={td} colSpan={6}>건축물대장 멸실완료. 현 나대지상태.</td>
          </tr>
        ) : (
          <tr>
            <td style={{ ...th, width: '80px' }}>건물</td>
            <td style={{ ...th, width: '52px' }}>면적</td>
            <td style={td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><input type="number" value={doc.건물면적 ?? ''} onChange={set('건물면적')} readOnly={readOnly} style={{ ...box, width: '60px', textAlign: 'right' }} /> ㎡</span></td>
            <td style={th}>용도</td>
            <td style={td} colSpan={3}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <select value={doc.건물용도 ?? ''} onChange={set('건물용도')} disabled={readOnly} style={{ ...box, width: '150px', cursor: readOnly ? 'default' : 'pointer' }}>
                  <option value="">선택</option>
                  {BUILDING_USE_OPTS.map((u) => (<option key={u} value={u}>{u}</option>))}
                </select>
                {doc.건물용도 === '직접입력' && <input type="text" value={doc.건물용도직접 ?? ''} onChange={set('건물용도직접')} readOnly={readOnly} placeholder="직접입력" style={{ ...box, flex: 1 }} />}
              </div>
            </td>
          </tr>
        ))}
      </tbody></table>
      <div style={{ ...gray, marginTop: '3px' }}>* 건물이 멸실된 경우 종전 토지 및 건물 면적을 기재함</div>

      {/* 2. 계약 내용 */}
      <div style={{ ...secTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{isDone ? '3. 계약 내용' : '2. 계약 내용'}</span>
        {unitSelect}
      </div>
      <div style={{ fontSize: '13px', color: '#1f2937', margin: '2px 0' }}>제1조 [목적] 매도인과 매수인은 위 조합원 입주권의 매매계약을 체결하고 아래와 같이 매매대금을 지급하기로 한다.</div>

      {/* 이주후 멸실전·멸실후 동호수추첨전(이주비 등) / 동호수추첨후(이주비 대출 등) — 동일 표 */}
      {useLoan && (<>
        <div style={subTitle}>{isDone ? '이주비 대출 등' : '이주비 등'}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          <tr><td style={{ ...th, width: '80px', whiteSpace: 'normal', lineHeight: 1.2 }}>무이자 이주비 대출</td><td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>{M('무이자이주비대출')}<span style={gray}>(이주비는 매수자가 입주시 반환)</span></div></td></tr>
          <tr><td style={{ ...th, width: '80px', whiteSpace: 'normal', lineHeight: 1.2 }}>유이자 이주비 대출</td><td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>{M('유이자이주비대출')}<span style={gray}>(이주비는 매수자가 입주시 반환하며 이자는 매매잔금일 기준 정산)</span></div></td></tr>
          <tr><td style={{ ...th, width: '80px', whiteSpace: 'normal', lineHeight: 1.2 }}>이사비 대출</td><td style={td}>{M('이사비대출')}</td></tr>
          <tr><td style={{ ...th, width: '80px', whiteSpace: 'normal', lineHeight: 1.2 }}>이주비 등 대출합계</td><td style={{ ...td, background: '#f8fafc' }}>{sumM(이주비등대출합계)}</td></tr>
        </tbody></table>
      </>)}

      {/* 분양계약내용 (분양계약 완료 후) */}
      {isDone && (<>
        <div style={subTitle}>분양계약내용</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup><col style={{ width: '25%' }} /><col style={{ width: '25%' }} /><col style={{ width: '25%' }} /><col style={{ width: '25%' }} /></colgroup>
          <tbody>
            <tr><td style={th}>분양금액</td><td style={th}>현금 납부한 금액</td><td style={th}>대출 금액</td><td style={th}>납부할 금액</td></tr>
            <tr><td style={tdB}>{cell('조합원분양가')}</td><td style={tdB}>{cell('분양현금납부')}</td><td style={tdB}>{cell('분양대출금액')}</td><td style={tdB}>{sumCell(분양납부할)}</td></tr>
            <tr><td colSpan={4} style={{ border: 'none', height: '6px', padding: 0 }} /></tr>
            <tr><td style={th}>옵션금액</td><td style={th}>현금 납부한 금액</td><td style={th}>대출 금액</td><td style={th}>납부할 금액</td></tr>
            <tr><td style={tdB}>{cell('옵션비')}</td><td style={tdB}>{cell('옵션현금납부')}</td><td style={tdB}>{cell('옵션대출금액')}</td><td style={tdB}>{sumCell(옵션납부할행)}</td></tr>
            <tr><td colSpan={4} style={{ border: 'none', height: '6px', padding: 0 }} /></tr>
            <tr><td style={th}>발코니확장금액</td><td style={th}>현금 납부한 금액</td><td style={th}>대출 금액</td><td style={th}>납부할 금액</td></tr>
            <tr><td style={tdB}>{cell('발코니확장비')}</td><td style={tdB}>{cell('발코니현금납부')}</td><td style={tdB}>{cell('발코니대출금액')}</td><td style={tdB}>{sumCell(발코니납부할)}</td></tr>
            <tr><td colSpan={4} style={{ border: 'none', height: '6px', padding: 0 }} /></tr>
            <tr><td style={th}>(합계) 분양 금액</td><td style={th}>(합계) 현금 납부한 금액</td><td style={th}>(합계) 대출금액</td><td style={th}>(합계) 납부할 금액</td></tr>
            <tr><td style={{ ...tdB, background: '#f8fafc' }}>{sumCell(실분양금액)}</td><td style={{ ...tdB, background: '#f8fafc' }}>{sumCell(현금합계)}</td><td style={{ ...tdB, background: '#f8fafc' }}>{sumCell(대출합계)}</td><td style={{ ...tdB, background: '#f8fafc' }}>{sumCell(납부할합계)}</td></tr>
          </tbody>
        </table>
      </>)}

      {/* 매매금액 / 총 매매금액 및 정산금액 (관리처분인가후 이주전은 매매금액만) */}
      <div style={subTitle}>매매금액{isDone && <span style={gray}> (분양합계금액+프리미엄)</span>}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
        {!isDone && (
          <tr><td style={{ ...th, width: '80px' }}>권리가액</td><td style={td} colSpan={3}>{M('권리가액')}</td></tr>
        )}
        <tr>
          <td style={{ ...th, width: '80px' }}>프리미엄</td>
          <td style={td} colSpan={3}><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>{M('프리미엄')}<label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}><input type="checkbox" checked={doc.마이너스프리미엄 === true} onChange={(e) => setDoc((p) => ({ ...p, 마이너스프리미엄: e.target.checked }))} /> 마이너스프리미엄</label></div></td>
        </tr>
        {isDone && <tr><td style={{ ...th, width: '80px' }}>매매 금액</td><td style={td} colSpan={3}>{calc(총매매금액)} <span style={gray}>(합계분양금액+프리미엄)</span></td></tr>}
      </tbody></table>

      {/* 정산금액 타이틀 + 추가 버튼(우측) — 동호수추첨후는 정산금액을 지급 표 첫 행에 붙임(융자금 추가 없음) */}
      {isDone ? (
        <div style={{ ...subTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span>정산금액 <span style={gray}>(프리미엄+합계현금납부한금액)</span></span>
          {!readOnly && (
            <span className="contract-actions" style={{ display: 'flex', gap: '6px' }}>
              <button type="button" onClick={() => setDeposits([...deposits, { amt: '', 지급: '계약 시 지급', 영수자: '' }])} style={pill}>＋ 계약금 추가</button>
              <button type="button" onClick={() => setMids([...mids, { amt: '', date: '' }])} style={pill}>＋ 중도금 추가</button>
            </span>
          )}
        </div>
      ) : (!readOnly && (
        <div className="contract-actions" style={{ display: 'flex', gap: '6px', marginTop: '8px', marginBottom: '2px' }}>
          {!isAfter && !isChuchumJeon && !doc._융자금표시 && <button type="button" onClick={() => setDoc((p) => ({ ...p, _융자금표시: true }))} style={pill}>＋ 융자금 추가</button>}
          <button type="button" onClick={() => setDeposits([...deposits, { amt: '', 지급: '계약 시 지급', 영수자: '' }])} style={pill}>＋ 계약금 추가</button>
          <button type="button" onClick={() => setMids([...mids, { amt: '', date: '' }])} style={pill}>＋ 중도금 추가</button>
        </div>
      ))}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: isDone ? '0' : (readOnly ? '10px' : '0') }}><tbody>
        {isDone
          ? <tr><td style={{ ...th, width: '80px' }}>정산금액</td><td style={td} colSpan={3}>{sumM(현금합계 + 프리미엄)}</td></tr>
          : <tr><td style={{ ...th, width: '80px' }}>매매금액</td><td style={td} colSpan={3}>{sumM(num('권리가액') + 프리미엄)} <span style={gray}>(권리가액+프리미엄)</span></td></tr>}
        {doc._융자금표시 && (
          <tr>
            <td style={{ ...th, width: '80px', position: 'relative' }}>{readOnly ? (doc.융자금라벨 || '융자금') : <select value={doc.융자금라벨 || '융자금'} onChange={(e) => setDoc((p) => ({ ...p, 융자금라벨: e.target.value }))} style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: '13px', color: '#111827', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', width: '68px', maxWidth: '68px', boxSizing: 'border-box' }}><option value="융자금">융자금</option><option value="현임대보증금">현임대보증금</option></select>}
              {!readOnly && gutterBtns(<button type="button" onClick={() => setDoc((p) => ({ ...p, _융자금표시: false }))} style={delBtnL}>삭제</button>)}
            </td>
            <td style={td} colSpan={3}>{M('융자금')} <span style={gray}>현상태에서 승계</span></td>
          </tr>
        )}
        {isAfter && (
          <tr><td style={{ ...th, width: '80px' }}>이주비 등</td><td style={td} colSpan={3}>{sumM(이주비등대출합계)} <span style={gray}>현상태에서 승계</span></td></tr>
        )}
        {deposits.map((d, i) => (
          <tr key={`dep${i}`}>
            <td style={{ ...th, width: '80px', position: 'relative' }}>계약금
              {!readOnly && i > 0 && gutterBtns(<button type="button" onClick={() => setDeposits(deposits.filter((_, j) => j !== i))} style={delBtnL}>삭제</button>)}
            </td>
            <td style={td} colSpan={3}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {moneyInput(d.amt, (e) => setDeposits(deposits.map((x, j) => (j === i ? { ...x, amt: e.target.value } : x))))}
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={gray}>계약금 지급</span>
                  <select value={d.지급 ?? '계약 시 지급'} onChange={(e) => setDeposits(deposits.map((x, j) => (j === i ? { ...x, 지급: e.target.value } : x)))} disabled={readOnly} style={{ ...box, cursor: readOnly ? 'default' : 'pointer', width: '120px' }}>
                    <option value="계약 시 지급">계약 시 지급</option><option value="가계약 시 지급">가계약 시 지급</option><option value="별도 협의">별도 협의</option>
                  </select>
                  <input type="text" value={d.영수자 ?? ''} onChange={(e) => setDeposits(deposits.map((x, j) => (j === i ? { ...x, 영수자: e.target.value } : x)))} readOnly={readOnly} placeholder="영수자 이름" style={{ ...inp, width: '120px' }} />
                </span>
              </div>
            </td>
          </tr>
        ))}
        {mids.map((m, i) => (
          <tr key={`mid${i}`}>
            <td style={{ ...th, width: '80px', position: 'relative' }}>중도금
              {!readOnly && i > 0 && gutterBtns(<button type="button" onClick={() => setMids(mids.filter((_, j) => j !== i))} style={delBtnL}>삭제</button>)}
            </td>
            <td style={td} colSpan={3}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {moneyInput(m.amt, (e) => setMids(mids.map((x, j) => (j === i ? { ...x, amt: e.target.value } : x))))}
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={gray}>중도금 지급일</span>
                  <input type="date" value={m.date || ''} onChange={(e) => setMids(mids.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} readOnly={readOnly} style={{ ...inp, width: '150px' }} />
                </span>
              </div>
            </td>
          </tr>
        ))}
        <tr><td style={{ ...th, width: '80px' }}>잔금</td><td style={td} colSpan={3}><div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>{M('잔금')}<span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}><span style={gray}>잔금 지급일</span>{D('잔금일자', '150px', '잔금 지급일')}</span></div></td></tr>
      </tbody></table>

      {/* 합계융자금 — 잔금 표 아래 분리 표(동호수추첨후) */}
      {isDone && (<>
        <div style={subTitle}>합계융자금</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          <tr><td style={{ ...th, width: '80px' }}>합계융자금</td><td style={td} colSpan={3}>{calc(대출합계)} <span style={gray}>(분양·옵션·발코니 대출 합계)</span></td></tr>
        </tbody></table>
      </>)}
    </div>
  );
}
