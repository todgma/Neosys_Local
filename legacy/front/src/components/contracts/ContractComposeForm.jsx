import React from 'react';
import { toast } from 'react-hot-toast';
import { buildContractTemplate } from '../../constants/contractTemplates';

/**
 * 계약서 간단 편집폼(가계약 편집용)
 *  - 기본 계약서 틀(부동산 표시 / 계약 내용 금액표 / 계약일)은 유지, 긴 조항은 생략
 *  - 만단위 적용 · 중도금 추가/삭제 · 지급일 데이트피커 등 편의기능
 *  - 값(data)은 미리보기(ContractDocumentEditor)로 그대로 투영되어 템플릿에 반영
 */

const th = { border: '1px solid #334155', background: '#f1f5f9', padding: '6px', fontSize: '13px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' };
const labelTd = { ...th, width: '90px' };
const td = { border: '1px solid #334155', padding: '6px', fontSize: '13px', verticalAlign: 'middle' };
const numInput = { width: '120px', padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '3px', textAlign: 'right', boxSizing: 'border-box' };
const textInput = { flex: 1, minWidth: 0, padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '3px', boxSizing: 'border-box' };
const dateInput = { padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '3px', boxSizing: 'border-box' };
const toolBtn = { padding: '5px 10px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' };
const smallDel = { padding: '3px 8px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', color: '#dc2626', cursor: 'pointer', whiteSpace: 'nowrap' };

const commas = (v) => (v === '' || v == null || isNaN(Number(v))) ? '' : Number(v).toLocaleString();

export default function ContractComposeForm({ docType, data, onChange }) {
  const tpl = buildContractTemplate(docType);
  const heading = (tpl.docType || '').replace('(단독)', '').trim();
  const man = data.man !== false; // 만단위 적용(기본 on)
  const mids = (data.midList && data.midList.length) ? data.midList : [{ amt: '', date: '' }];
  const set = (k, v) => onChange({ ...data, [k]: v });
  const setMids = (list) => onChange({ ...data, midList: list });

  // 만원/원 환산 표시: 입력값(만단위면 만원) → 원 표기
  const wonText = (v) => {
    if (v === '' || v == null || isNaN(Number(v))) return '0';
    return (man ? Number(v) * 10000 : Number(v)).toLocaleString();
  };

  // 금액 셀(만원 입력 + 원 환산)
  const AmountCell = ({ value, onChangeValue, disabled }) => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <input type="number" value={value ?? ''} disabled={disabled} onChange={(e) => onChangeValue(e.target.value)}
          style={{ ...numInput, background: disabled ? '#f1f5f9' : 'white' }} placeholder="0" />
        <span style={{ fontSize: '13px', color: '#475569' }}>{man ? '만원' : '원'}</span>
      </div>
      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>원 {wonText(value)}</div>
    </div>
  );

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '18px 22px', background: 'white', color: '#111827' }}>
      {/* 제목 */}
      <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>{heading} <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 700 }}>[가계약 편집용]</span></div>
      <div style={{ fontSize: '13px', color: '#475569', marginBottom: '10px' }}>{tpl.intro}</div>

      {/* 상단 도구: 불러오기 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button type="button" style={toolBtn} onClick={() => toast('물건/고객 정보 불러오기는 준비 중입니다.')}>＋ 물건정보 불러오기</button>
      </div>

      {/* 1. 부동산 표시 */}
      <div style={{ fontSize: '14px', fontWeight: 700, margin: '6px 0 4px' }}>1. 부동산 표시</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <th style={th} colSpan={2}>부동산</th>
            <th style={{ ...th, width: '110px' }}>거래면적</th>
          </tr>
          <tr>
            <td style={labelTd}>소재지</td>
            <td style={td}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input type="text" value={data.소재지 ?? ''} onChange={(e) => set('소재지', e.target.value)} placeholder="소재지 (지번)" style={textInput} />
                <input type="text" value={data.소재지도로명 ?? ''} onChange={(e) => set('소재지도로명', e.target.value)} placeholder="소재지 (도로명)" style={textInput} />
              </div>
            </td>
            <td style={td}><input type="text" value={data.거래면적 ?? ''} onChange={(e) => set('거래면적', e.target.value)} placeholder="㎡" style={{ ...textInput, textAlign: 'right' }} /></td>
          </tr>
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
        <button type="button" style={toolBtn} onClick={() => toast('부속 필지 편집은 준비 중입니다.')}>부속필지 편집 (0)</button>
      </div>

      {/* 2. 계약 내용 */}
      <div style={{ fontSize: '14px', fontWeight: 700, margin: '14px 0 4px' }}>2. 계약 내용</div>
      <div style={{ fontSize: '13px', color: '#374151', marginBottom: '6px' }}>{tpl.objective}</div>

      {/* 도구 모음 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: '6px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
          <input type="checkbox" checked={man} onChange={(e) => set('man', e.target.checked)} /> 만단위 적용
        </label>
        <button type="button" style={toolBtn} onClick={() => toast('권리 인수 항목은 준비 중입니다.')}>권리 인수 추가</button>
        <button type="button" style={toolBtn} onClick={() => toast('계약금 항목은 기본 포함되어 있습니다.')}>계약금 추가</button>
        <button type="button" style={toolBtn} onClick={() => setMids([...mids, { amt: '', date: '' }])}>중도금 추가</button>
        <button type="button" style={toolBtn} onClick={() => toast('잔금 항목은 기본 포함되어 있습니다.')}>잔금 추가</button>
      </div>

      {/* 금액표 */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {/* 매매대금(=거래금액) */}
          <tr>
            <td style={labelTd}>{tpl.amountRows?.[0]?.label || '매매대금'}</td>
            <td style={td} colSpan={3}><AmountCell value={data.매매대금} onChangeValue={(v) => set('매매대금', v)} /></td>
          </tr>
          {/* 계약금 */}
          <tr>
            <td style={labelTd}>계약금</td>
            <td style={{ ...td, width: '200px' }}><AmountCell value={data.계약금} onChangeValue={(v) => set('계약금', v)} /></td>
            <td style={{ ...labelTd, width: '84px' }}>계약금 지급</td>
            <td style={td}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <select value={data.계약금지급 ?? '계약 시 지급'} onChange={(e) => set('계약금지급', e.target.value)} style={{ ...dateInput, cursor: 'pointer' }}>
                  <option value="계약 시 지급">계약 시 지급</option>
                  <option value="가계약 시 지급">가계약 시 지급</option>
                  <option value="별도 협의">별도 협의</option>
                </select>
                <input type="text" value={data.계약금영수자 ?? ''} onChange={(e) => set('계약금영수자', e.target.value)} placeholder="영수자 이름" style={textInput} />
              </div>
            </td>
          </tr>
          {/* 중도금(동적) */}
          {mids.map((m, i) => (
            <tr key={i}>
              <td style={labelTd}>중도금{mids.length > 1 ? ` ${i + 1}` : ''}</td>
              <td style={td}><AmountCell value={m.amt} onChangeValue={(v) => setMids(mids.map((x, j) => (j === i ? { ...x, amt: v } : x)))} /></td>
              <td style={{ ...labelTd, width: '84px' }}>중도금 지급일</td>
              <td style={td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="date" value={m.date || ''} onChange={(e) => setMids(mids.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} style={dateInput} />
                  {i > 0 && (<button type="button" style={smallDel} onClick={() => setMids(mids.filter((_, j) => j !== i))}>삭제</button>)}
                </div>
              </td>
            </tr>
          ))}
          {/* 잔금 */}
          <tr>
            <td style={labelTd}>잔금</td>
            <td style={td}><AmountCell value={data.잔금} onChangeValue={(v) => set('잔금', v)} /></td>
            <td style={{ ...labelTd, width: '84px' }}>잔금 지급일</td>
            <td style={td}><input type="date" value={data.잔금일자 || ''} onChange={(e) => set('잔금일자', e.target.value)} style={dateInput} /></td>
          </tr>
        </tbody>
      </table>

      {/* 특약사항 */}
      <div style={{ fontSize: '14px', fontWeight: 700, margin: '14px 0 4px' }}>특약사항</div>
      <textarea value={data.특약사항 ?? ''} onChange={(e) => set('특약사항', e.target.value)} rows={3}
        style={{ width: '100%', border: '1px solid #334155', borderRadius: '3px', outline: 'none', fontSize: '13px', padding: '6px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />

      {/* 계약일 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '14px', fontSize: '13px' }}>
        <span>본 계약을 증명하기 위하여 계약 당사자가 이의 없음을 확인하고 각자 서명 또는 날인한다.</span>
        <span style={{ color: '#dc2626', fontWeight: 700 }}>계약일</span>
        <input type="date" value={data.계약일자 || ''} onChange={(e) => set('계약일자', e.target.value)} style={dateInput} />
      </div>
    </div>
  );
}
