import React, { useState } from 'react';

/**
 * 공과금 등 정산서 — 편집 가능한 팝업(모달) + 미리보기/인쇄
 *  - 서식자료실 > 정산서 클릭 시 열림
 *  - 관리비/가스/전기/수도/장기수선충당금/기타 항목별 가감(+/-)·금액·검침/납입 정보 입력
 *  - 정산 총액은 각 항목(가감 반영) 자동 합산, 직접 수정도 가능
 */

// 항목 정의: kind = 'simple'(적요·비고) | 'meter'(검침수치·정산사용량·정산기간) | 'longterm'(납입기간·개월수·월납입액)
const ITEMS = [
  { key: 'maintenance', label: '관리비', kind: 'simple' },
  { key: 'gas', label: '가스', kind: 'meter' },
  { key: 'electricity', label: '전기', kind: 'meter' },
  { key: 'water', label: '수도', kind: 'meter' },
  { key: 'longTerm', label: '장기수선충당금', kind: 'longterm' },
  { key: 'etc', label: '기타', kind: 'simple', nameEditable: true },
  { key: 'etc2', label: '기타', kind: 'simple', nameEditable: true },
];

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
};
const comma = (v) => (v === '' || v == null ? '' : num(v).toLocaleString());
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const emptyDoc = () => {
  const d = { platPlc: '', etcValue: '', issuerName: '', issuerContact: '', issueDate: '' };
  ITEMS.forEach((it) => {
    d[it.key] = { name: it.nameEditable ? '' : it.label, sign: '+', price: '', desc: '', reading: '', usage: '', period: '', payPeriod: '', payMonths: '', monthly: '' };
  });
  return d;
};

export default function SettlementForm({ onClose }) {
  const [doc, setDoc] = useState(emptyDoc);
  const setTop = (k) => (e) => setDoc((p) => ({ ...p, [k]: e.target.value }));
  const setRow = (key, f) => (e) => {
    const val = e && e.target ? e.target.value : e;
    setDoc((p) => ({ ...p, [key]: { ...p[key], [f]: val } }));
  };

  // 정산 총액(가감 반영 자동 합산)
  const autoTotal = ITEMS.reduce((sum, it) => {
    const r = doc[it.key];
    return sum + num(r.price) * (r.sign === '-' ? -1 : 1);
  }, 0);

  // 스타일
  const inp = { border: 'none', borderBottom: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', padding: '2px 4px', background: 'transparent', fontFamily: 'inherit', boxSizing: 'border-box', width: '100%' };
  const th = { border: '1px solid #475569', background: '#f1f5f9', padding: '6px', fontSize: '13px', fontWeight: 700, textAlign: 'center', color: '#111827', whiteSpace: 'nowrap' };
  const td = { border: '1px solid #475569', padding: '4px 6px', fontSize: '13px', verticalAlign: 'middle' };
  const signBtn = (key, s) => ({
    padding: '2px 8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: '1px solid #94a3b8',
    borderRadius: '4px', marginRight: '3px', background: doc[key].sign === s ? '#4f46e5' : 'white', color: doc[key].sign === s ? '#fff' : '#334155',
  });

  const SignCell = (key) => (
    <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>
      <button type="button" style={signBtn(key, '-')} onClick={() => setRow(key, 'sign')('-')}>-</button>
      <button type="button" style={signBtn(key, '+')} onClick={() => setRow(key, 'sign')('+')}>+</button>
    </td>
  );
  const PriceCell = (key) => (
    <td style={{ ...td, textAlign: 'right' }}>
      <input type="text" value={doc[key].price} onChange={setRow(key, 'price')} placeholder="0" style={{ ...inp, textAlign: 'right' }} />
    </td>
  );

  // ---- 미리보기/인쇄 HTML 생성 ----
  const buildHtml = () => {
    const signTxt = (r) => (r.sign === '-' ? '-' : '+');
    const rowsHtml = ITEMS.map((it) => {
      const r = doc[it.key];
      let bigo = '';
      if (it.kind === 'meter') {
        bigo = `검침 수치 : ${esc(r.reading)}<br>정산 사용량 : ${esc(r.usage)}<br>정산 기간 : ${esc(r.period)}`;
      } else if (it.kind === 'longterm') {
        bigo = `납입 기간 : ${esc(r.payPeriod)}<br>납입 개월수 : ${esc(r.payMonths)}<br>월 납입액 : ${esc(comma(r.monthly))}`;
      } else {
        bigo = esc(r.desc);
      }
      const nm = it.nameEditable ? esc(r.name) || '기타' : it.label;
      return `<tr>
        <td style="border:1px solid #000;padding:6px 8px;text-align:center;">${nm}</td>
        <td style="border:1px solid #000;padding:6px 8px;text-align:center;">${signTxt(r)}</td>
        <td style="border:1px solid #000;padding:6px 8px;text-align:right;">${comma(r.price)}</td>
        <td style="border:1px solid #000;padding:6px 8px;font-size:12px;line-height:1.5;">${bigo}</td>
      </tr>`;
    }).join('');

    const totalVal = comma(autoTotal);
    return `
      <div style="text-align:center;font-size:26px;font-weight:800;letter-spacing:8px;margin-bottom:18px;">공과금 등 정산서</div>
      <div style="font-size:13px;font-weight:700;margin:6px 0 4px;">[물건 소재지]</div>
      <div style="border-bottom:1px solid #000;padding:4px 2px;font-size:13px;min-height:20px;">${esc(doc.platPlc)}</div>
      <div style="font-size:13px;font-weight:700;margin:16px 0 4px;">[정산 내역]</div>
      <table style="width:100%;border-collapse:collapse;border:2px solid #000;"><tbody>
        <tr>
          <th style="border:1px solid #000;background:#f1f5f9;padding:6px;width:150px;">적요</th>
          <th style="border:1px solid #000;background:#f1f5f9;padding:6px;width:50px;">가감</th>
          <th style="border:1px solid #000;background:#f1f5f9;padding:6px;width:130px;">정산금액(원)</th>
          <th style="border:1px solid #000;background:#f1f5f9;padding:6px;">비고</th>
        </tr>
        ${rowsHtml}
        <tr>
          <td colspan="2" style="border:1px solid #000;padding:8px;text-align:center;font-weight:700;background:#f8fafc;">정산 총액</td>
          <td style="border:1px solid #000;padding:8px;text-align:right;font-weight:700;">${totalVal}</td>
          <td style="border:1px solid #000;padding:8px;">${esc(doc.totalDesc || '')}</td>
        </tr>
      </tbody></table>
      <div style="font-size:13px;font-weight:700;margin:16px 0 4px;">[기타 사항]</div>
      <div style="border:1px solid #000;min-height:80px;padding:8px;font-size:13px;white-space:pre-wrap;line-height:1.5;">${esc(doc.etcValue)}</div>
      <div style="margin-top:40px;font-size:14px;line-height:2.4;">
        <div>${esc(doc.issuerName) || '______________________________'} &nbsp;&nbsp; 연락처 : ${esc(doc.issuerContact) || '________________________'}</div>
        <div style="margin-top:8px;">발행일 : ${esc(doc.issueDate) || '_____ 년 ___ 월 ___ 일'}</div>
      </div>`;
  };

  const openPreview = () => {
    const w = window.open('', '_blank', 'width=900,height=1040');
    if (!w) { alert('팝업이 차단되었습니다. 팝업을 허용해 주세요.'); return; }
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>공과금 등 정산서</title>'
      + '<style>@page{size:A4;margin:20mm 20mm 10mm 20mm;}body{margin:0;background:#e2e8f0;display:flex;justify-content:center;padding:20px;font-family:"Malgun Gothic",sans-serif;color:#000;}'
      + '.pg{width:210mm;min-height:297mm;background:#fff;padding:16mm 15mm;box-sizing:border-box;box-shadow:0 2px 12px rgba(0,0,0,.15);}'
      + '@media print{body{background:#fff;padding:0;}.pg{box-shadow:none;}.pv-bar{display:none;}}'
      + '.pv-bar{position:fixed;top:10px;right:14px;}.pv-bar button{padding:6px 14px;font-size:13px;font-weight:600;color:#fff;background:#4f46e5;border:none;border-radius:4px;cursor:pointer;}</style></head><body>'
      + '<div class="pv-bar"><button onclick="window.print()">인쇄</button></div><div class="pg">' + buildHtml() + '</div></body></html>');
    w.document.close();
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '760px', maxWidth: '96vw', background: 'white', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>공과금 등 정산서</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={openPreview} style={{ padding: '7px 16px', fontSize: '13px', fontWeight: 600, color: '#fff', background: '#4f46e5', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>미리보기 · 인쇄</button>
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#111827' }}>×</button>
          </div>
        </div>

        {/* 본문(편집) */}
        <div style={{ padding: '18px 20px', maxHeight: '78vh', overflowY: 'auto' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '2px 0 4px' }}>[물건 소재지]</div>
          <input type="text" value={doc.platPlc} onChange={setTop('platPlc')} placeholder="물건 소재지를 입력하세요" style={{ ...inp, borderBottom: '1px solid #94a3b8' }} />

          <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '16px 0 5px' }}>[정산 내역]</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
            <tr>
              <td style={{ ...th, width: '130px' }}>적요</td>
              <td style={{ ...th, width: '80px' }}>가감</td>
              <td style={{ ...th, width: '150px' }}>정산금액(원)</td>
              <td style={th}>비고</td>
            </tr>
            {ITEMS.map((it) => {
              const key = it.key;
              return (
                <tr key={key}>
                  <td style={td}>
                    {it.nameEditable
                      ? <input type="text" value={doc[key].name} onChange={setRow(key, 'name')} placeholder="항목명" style={inp} />
                      : <span style={{ fontWeight: 600 }}>{it.label}</span>}
                  </td>
                  {SignCell(key)}
                  {PriceCell(key)}
                  <td style={td}>
                    {it.kind === 'simple' && (
                      <input type="text" value={doc[key].desc} onChange={setRow(key, 'desc')} placeholder="비고" style={inp} />
                    )}
                    {it.kind === 'meter' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '2px 6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#111827' }}>검침 수치</span><input type="text" value={doc[key].reading} onChange={setRow(key, 'reading')} style={inp} />
                        <span style={{ fontSize: '11px', color: '#111827' }}>정산 사용량</span><input type="text" value={doc[key].usage} onChange={setRow(key, 'usage')} style={inp} />
                        <span style={{ fontSize: '11px', color: '#111827' }}>정산 기간</span><input type="text" value={doc[key].period} onChange={setRow(key, 'period')} style={inp} />
                      </div>
                    )}
                    {it.kind === 'longterm' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '2px 6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#111827' }}>납입 기간</span><input type="text" value={doc[key].payPeriod} onChange={setRow(key, 'payPeriod')} style={inp} />
                        <span style={{ fontSize: '11px', color: '#111827' }}>납입 개월수</span><input type="text" value={doc[key].payMonths} onChange={setRow(key, 'payMonths')} style={inp} />
                        <span style={{ fontSize: '11px', color: '#111827' }}>월 납입액</span><input type="text" value={doc[key].monthly} onChange={setRow(key, 'monthly')} style={{ ...inp, textAlign: 'right' }} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={2} style={{ ...td, textAlign: 'center', fontWeight: 700, background: '#f8fafc' }}>정산 총액</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{autoTotal.toLocaleString()}</td>
              <td style={td}><input type="text" value={doc.totalDesc || ''} onChange={setTop('totalDesc')} placeholder="비고" style={inp} /></td>
            </tr>
          </tbody></table>
          <div style={{ fontSize: '11px', color: '#111827', marginTop: '4px' }}>※ 정산 총액은 각 항목의 가감(+/-)을 반영해 자동 합산됩니다.</div>

          <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '16px 0 5px' }}>[기타 사항]</div>
          <textarea value={doc.etcValue} onChange={setTop('etcValue')} rows={4} placeholder="기타 사항을 입력하세요" style={{ ...inp, border: '1px solid #cbd5e1', borderRadius: '4px', resize: 'vertical', padding: '6px 8px' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
            <label style={{ fontSize: '13px', color: '#111827' }}>성명
              <input type="text" value={doc.issuerName} onChange={setTop('issuerName')} placeholder="성명" style={{ ...inp, borderBottom: '1px solid #94a3b8', marginTop: '2px' }} />
            </label>
            <label style={{ fontSize: '13px', color: '#111827' }}>연락처
              <input type="text" value={doc.issuerContact} onChange={setTop('issuerContact')} placeholder="연락처" style={{ ...inp, borderBottom: '1px solid #94a3b8', marginTop: '2px' }} />
            </label>
            <label style={{ fontSize: '13px', color: '#111827' }}>발행일
              <input type="date" value={doc.issueDate} onChange={setTop('issueDate')} style={{ ...inp, borderBottom: '1px solid #94a3b8', marginTop: '2px' }} />
            </label>
          </div>
        </div>

        {/* 푸터 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 18px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: '#111827', background: 'white', border: '1px solid #cbd5e1', borderRadius: '5px', cursor: 'pointer' }}>닫기</button>
          <button onClick={openPreview} style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600, color: '#fff', background: '#4f46e5', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>미리보기 · 인쇄</button>
        </div>
      </div>
    </div>
  );
}
