import React from 'react';

/**
 * 숫자 입력 — 화면에는 천단위 콤마로 표시, onChange는 콤마 없는 값(문자열)을 넘김.
 *  - value: 저장값(숫자 또는 콤마 없는 숫자문자열)
 *  - onChange: (raw: string) => void
 *  - decimal: true면 소수점 허용(면적 등). false면 정수만(금액-만원 등, 기본)
 *  - unit: true면 우측에 '만원' 표기(폼에 단위 라벨이 따로 없는 단독 필드용)
 */
export default function AmountInput({ value, onChange, style, placeholder, name, unit = false, decimal = false, ...rest }) {
  // 입력 정리: 숫자(및 decimal이면 소수점 하나)만 남김
  const clean = (s) => {
    if (!decimal) return String(s).replace(/[^0-9]/g, '');
    let t = String(s).replace(/[^0-9.]/g, '');
    const dot = t.indexOf('.');
    if (dot !== -1) t = t.slice(0, dot + 1) + t.slice(dot + 1).replace(/\./g, '');
    return t;
  };
  // 표시: 정수부에만 콤마(로케일 비의존, 명시적 3자리 그룹핑), 소수부는 그대로
  const group = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const format = (raw) => {
    if (raw === '') return '';
    const [intPart, decPart = ''] = raw.split('.');
    const intFmt = group(intPart);
    if (!decimal) return intFmt;
    return raw.includes('.') ? `${intFmt}.${decPart}` : intFmt;
  };

  const raw = value === null || value === undefined ? '' : clean(value);
  const display = format(raw);
  const handle = (e) => onChange(clean(e.target.value));

  const input = (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={display}
      onChange={handle}
      placeholder={placeholder}
      name={name}
      style={{ textAlign: 'right', ...style }}
      {...rest}
    />
  );
  if (!unit) return input;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
      {input}
      <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>만원</span>
    </span>
  );
}
