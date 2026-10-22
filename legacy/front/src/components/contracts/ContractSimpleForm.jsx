import React from 'react';
import { extractContractFields } from '../../constants/contractTemplates';

/**
 * 계약서 간단 입력폼
 *  - 템플릿(docType)에서 필요한 항목을 그룹별 입력창으로 렌더
 *  - 입력값(data)은 ContractDocumentEditor(미리보기)에 그대로 전달되어 자동 반영
 */
const inputStyle = { width: '100%', padding: '5px 8px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#111827' };

export default function ContractSimpleForm({ docType, data, onChange }) {
  const f = extractContractFields(docType);
  const set = (k) => (e) => onChange({ ...data, [k]: e.target.value });

  const Group = ({ title, children }) => (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', background: '#eef2ff', padding: '6px 8px', borderLeft: '3px solid #4f46e5', marginBottom: '8px' }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>{children}</div>
    </div>
  );
  const F = ({ k, label, full, textarea }) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', gridColumn: full ? '1 / -1' : 'auto' }}>
      <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>{label}</span>
      {textarea
        ? <textarea value={data[k] ?? ''} onChange={set(k)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        : <input type="text" value={data[k] ?? ''} onChange={set(k)} style={inputStyle} />}
    </label>
  );

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '14px', background: 'white' }}>
      <Group title="부동산의 표시">
        {f.property.map((x) => <F key={x.k} k={x.k} label={x.label} full={x.full} />)}
      </Group>
      <Group title="계약내용 (금액 · 일자)">
        {f.amounts.map((x) => <F key={x.k} k={x.k} label={x.label} />)}
      </Group>
      {f.parties.map((p) => (
        <Group key={p.role} title={p.label}>
          {p.fields.map((x) => <F key={x.k} k={x.k} label={x.label} full={x.full} />)}
        </Group>
      ))}
      {f.brokers.map((b, i) => (
        <Group key={i} title={b.label}>
          {b.fields.map((x) => <F key={x.k} k={x.k} label={x.label} full={x.full} />)}
        </Group>
      ))}
      <Group title="특약 · 계약일자">
        {f.etc.map((x) => <F key={x.k} k={x.k} label={x.label} full={x.full} textarea={x.textarea} />)}
      </Group>
    </div>
  );
}
