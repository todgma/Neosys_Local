import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import DaumAddressModal from '../common/DaumAddressModal';
import FileUploadForm from '../common/FileUploadForm';

// 금액 콤마 표시(원 단위) — 저장은 숫자만
const comma = (v) => { const n = String(v ?? '').replace(/[^0-9]/g, ''); return n ? Number(n).toLocaleString() : ''; };
const digits = (v) => String(v ?? '').replace(/[^0-9]/g, '');

// 계약 직접등록 첨부 — 파일구분 공통코드(SYFDV07) / 최대 10개 / 개당 5MB
const CONTRACT_FILE_DIV = 'SYFDV07';
const MAX_FILES = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * 계약 등록 폼 — 계약목록 > 등록 클릭 시 표형식 입력 모달
 *  - 물건정보 / 거래대금(금액·날짜) / 의뢰인 / 공인중개사 / 첨부파일(계약서·확인설명서 등)
 *  - 저장 시 목록 표시용 flat 필드 + 구조화 데이터(reg) 함께 저장
 */
// 물건유형: 계약서작성과 동일한 계약서종류×물건유형 → "(계약서종류)물건유형" 형태
const CONTRACT_KINDS = ['부동산', '분양권', '입주권', '권리금'];
const PT_TYPES_BY_KIND = {
  부동산: ['아파트', '오피스텔', '단독주택', '다가구주택', '다세대주택', '상가', '사무실', '공장', '창고', '지식산업센터', '건물', '토지', '표준임대차계약서', '주택임대차표준계약서'],
  분양권: ['아파트', '오피스텔', '상가'],
  입주권: ['관리처분인가후 이주전', '이주후 멸실전', '멸실후 동호수추첨전', '동호수 추첨 및 분양계약 완료'],
  권리금: ['상가건물 임대차 권리금 계약서', '권리(시설) 양수 양도 계약서'],
};
const PT_TYPES = CONTRACT_KINDS.flatMap((kind) => PT_TYPES_BY_KIND[kind].map((t) => `(${kind})${t}`));
const TRADE_TYPES = ['매매', '전세', '월세', '단기임대', '기타'];
const MONEY_COLS = ['거래금액', '가계약', '계약', '중도금1차', '중도금2차', '잔금'];
const emptyClient = () => ({ 성함: '', 전화번호: '', 주민번호: '', 주소: '' });
const emptyAgent = () => ({ 상호: '', 대표자: '', 전화번호: '', 주소: '' });
// 거래유형 → 당사자 라벨(매매: 매도인/매수인, 임대: 임대인/임차인)
const roleLabels = (trd) => (['전세', '월세', '단기임대'].includes(trd) ? { seller: '임대인', buyer: '임차인' } : { seller: '매도인', buyer: '매수인' });

export default function ContractRegisterForm({ onSave, onClose, editData = null }) {
  const [f, setF] = useState(() => {
    const base = {
      물건유형: '', 거래유형: '', 거래금액: '', 물건소재지: '',
      money: Object.fromEntries(MONEY_COLS.map((k) => [k, { 금액: '', 날짜: '' }])),
      sellers: [emptyClient()],
      buyers: [emptyClient()],
      agents: [emptyAgent()],
      files: [],
    };
    // 수정: 저장된 약식 폼(doc.reg) 복원
    if (editData?.reg) return { ...base, ...editData.reg, money: { ...base.money, ...(editData.reg.money || {}) } };
    return base;
  });
  const [showAddr, setShowAddr] = useState(false);
  const setTop = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const setMoney = (col, sub) => (e) => setF((p) => ({ ...p, money: { ...p.money, [col]: { ...p.money[col], [sub]: e.target.value } } }));
  // 동적 리스트(sellers/buyers/agents) 공용 핸들러
  const setList = (key, idx, sub) => (e) => setF((p) => ({ ...p, [key]: p[key].map((row, i) => (i === idx ? { ...row, [sub]: e.target.value } : row)) }));
  const addList = (key, tmpl) => () => setF((p) => ({ ...p, [key]: [...p[key], tmpl()] }));
  const delList = (key, idx) => () => setF((p) => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }));
  const { seller: sellerLabel, buyer: buyerLabel } = roleLabels(f.거래유형);

  const setFiles = (list) => setF((p) => ({ ...p, files: list }));

  const handleSave = () => {
    const m = f.money;
    const s0 = f.sellers[0] || {}, b0 = f.buyers[0] || {}, coAgent = f.agents[1] || {};
    const rec = {
      // 목록 표시용 flat 필드
      ptType: f.물건유형, 거래유형: f.거래유형, 거래금액: f.거래금액 || m['거래금액'].금액, 소재지: f.물건소재지,
      이전의뢰인: s0.성함, 이전의뢰인전화: s0.전화번호,
      취득의뢰인: b0.성함, 취득의뢰인전화: b0.전화번호,
      가계약일: m['가계약'].날짜, 계약일: m['계약'].날짜,
      중도금1: m['중도금1차'].금액, 중도금2: m['중도금2차'].금액, 잔금일: m['잔금'].날짜,
      공동중개사상호: coAgent.상호 || '', 공동중개사전화: coAgent.전화번호 || '',
      // 편집 복원용 구조화 데이터
      reg: f,
      files: f.files,
      docType: `${f.물건유형 || '계약'} ${f.거래유형 || ''}`.trim(),
      // 약식 등록 표식 + 수정 대상 masterId
      _simple: true,
      masterId: editData?.id || editData?.masterId || null,
    };
    onSave && onSave(rec);
    toast.success(editData ? '수정되었습니다.' : '등록되었습니다.');
    onClose && onClose();
  };

  // 스타일
  const tbl = { width: '100%', borderCollapse: 'collapse', marginBottom: '18px' };
  const th = { border: '1px solid #334155', background: '#f1f5f9', padding: '6px 8px', fontSize: '13px', fontWeight: 700, color: '#334155', textAlign: 'center', whiteSpace: 'nowrap' };
  const hd = { ...th, background: '#f8fafc', width: '110px' };
  const td = { border: '1px solid #334155', padding: '3px 6px', fontSize: '13px', verticalAlign: 'middle' };
  const inp = { border: 'none', outline: 'none', fontSize: '13px', padding: '3px 4px', background: 'transparent', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
  const pill = { padding: '5px 13px', fontSize: '13px', fontWeight: 600, border: '1px solid #6366f1', borderRadius: '5px', background: 'white', color: '#4f46e5', cursor: 'pointer', whiteSpace: 'nowrap' };
  const delMini = { marginLeft: '6px', padding: '0 6px', fontSize: '11px', fontWeight: 700, border: '1px solid #fca5a5', borderRadius: '4px', background: 'white', color: '#dc2626', cursor: 'pointer', lineHeight: 1.6 };
  const clientRow = (key, label, row, i, canDel) => (
    <tr key={`${key}${i}`}>
      <td style={hd}>{label}{canDel && <button type="button" onClick={delList(key, i)} style={delMini}>×</button>}</td>
      <td style={td}><input type="text" value={row.성함} onChange={setList(key, i, '성함')} style={inp} /></td>
      <td style={td}><input type="text" value={row.전화번호} onChange={setList(key, i, '전화번호')} style={inp} /></td>
      <td style={td}><input type="text" value={row.주민번호} onChange={setList(key, i, '주민번호')} style={inp} /></td>
      <td style={td}><input type="text" value={row.주소} onChange={setList(key, i, '주소')} style={inp} /></td>
    </tr>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '880px', maxWidth: '96vw', background: 'white', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{editData ? '계약 수정' : '계약 등록'}</div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>

        <div style={{ padding: '18px 20px', maxHeight: '78vh', overflowY: 'auto' }}>
          {/* 물건 정보 */}
          <table style={tbl}><tbody>
            <tr>
              <td style={hd}>물건유형</td>
              <td style={td}>
                <select value={f.물건유형} onChange={setTop('물건유형')} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="">선택</option>{PT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </td>
              <td style={hd}>거래유형</td>
              <td style={td}>
                <select value={f.거래유형} onChange={setTop('거래유형')} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="">선택</option>{TRADE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </td>
              <td style={hd}>거래금액</td>
              <td style={td}><input type="text" value={comma(f.거래금액)} onChange={(e) => setF((p) => ({ ...p, 거래금액: digits(e.target.value) }))} placeholder="거래금액" style={{ ...inp, textAlign: 'right' }} /></td>
            </tr>
            <tr>
              <td style={hd}>
                <button type="button" onClick={() => setShowAddr(true)} title="주소 검색"
                  style={{ border: 'none', background: 'transparent', font: 'inherit', fontWeight: 700, color: '#4f46e5', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>물건소재지</button>
              </td>
              <td style={td} colSpan={5}><input type="text" value={f.물건소재지} onChange={setTop('물건소재지')} placeholder="소재지 라벨을 눌러 주소 검색 또는 직접 입력" style={inp} /></td>
            </tr>
          </tbody></table>

          {/* 거래대금 */}
          <table style={tbl}><tbody>
            <tr>
              <td style={hd}></td>
              {MONEY_COLS.map((col) => <td key={col} style={th}>{col}</td>)}
            </tr>
            <tr>
              <td style={hd}>금액</td>
              {MONEY_COLS.map((col) => <td key={col} style={td}><input type="text" value={comma(f.money[col].금액)} onChange={(e) => setF((p) => ({ ...p, money: { ...p.money, [col]: { ...p.money[col], 금액: digits(e.target.value) } } }))} placeholder="0" style={{ ...inp, textAlign: 'right' }} /></td>)}
            </tr>
            <tr>
              <td style={hd}>날짜</td>
              {MONEY_COLS.map((col) => <td key={col} style={td}><input type="date" value={f.money[col].날짜} onChange={setMoney(col, '날짜')} style={inp} /></td>)}
            </tr>
          </tbody></table>

          {/* 의뢰인(당사자) — 좌상단 추가 버튼 + 거래유형별 라벨 */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
            <button type="button" onClick={addList('sellers', emptyClient)} style={pill}>＋ {sellerLabel} 추가</button>
            <button type="button" onClick={addList('buyers', emptyClient)} style={pill}>＋ {buyerLabel} 추가</button>
            <button type="button" onClick={addList('agents', emptyAgent)} style={pill}>＋ 공인중개사 추가</button>
          </div>
          <table style={tbl}><tbody>
            <tr>
              <td style={hd}></td>
              <td style={{ ...th, width: '120px' }}>성함</td>
              <td style={{ ...th, width: '130px' }}>전화번호</td>
              <td style={{ ...th, width: '140px' }}>주민번호</td>
              <td style={th}>주소</td>
            </tr>
            {f.sellers.map((row, i) => clientRow('sellers', sellerLabel, row, i, i > 0))}
            {f.buyers.map((row, i) => clientRow('buyers', buyerLabel, row, i, i > 0))}
          </tbody></table>

          {/* 공인중개사 (숫자 없음, 기본 1행 · 추가 가능) */}
          <table style={tbl}><tbody>
            <tr>
              <td style={hd}></td>
              <td style={{ ...th, width: '120px' }}>상호</td>
              <td style={{ ...th, width: '120px' }}>대표자</td>
              <td style={{ ...th, width: '130px' }}>전화번호</td>
              <td style={th}>주소</td>
            </tr>
            {f.agents.map((row, i) => (
              <tr key={`a${i}`}>
                <td style={hd}>공인중개사{i > 0 && <button type="button" onClick={delList('agents', i)} style={delMini}>×</button>}</td>
                <td style={td}><input type="text" value={row.상호} onChange={setList('agents', i, '상호')} style={inp} /></td>
                <td style={td}><input type="text" value={row.대표자} onChange={setList('agents', i, '대표자')} style={inp} /></td>
                <td style={td}><input type="text" value={row.전화번호} onChange={setList('agents', i, '전화번호')} style={inp} /></td>
                <td style={td}><input type="text" value={row.주소} onChange={setList('agents', i, '주소')} style={inp} /></td>
              </tr>
            ))}
          </tbody></table>

          {/* 첨부파일 */}
          <FileUploadForm
            label={`계약서·확인설명서 등 첨부 (최대 ${MAX_FILES}개 · 개당 5MB 이하)`}
            fileDiv={CONTRACT_FILE_DIV}
            multiple
            maxCount={MAX_FILES}
            maxBytes={MAX_FILE_BYTES}
            value={f.files}
            onChange={setFiles}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 18px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: '#334155', background: 'white', border: '1px solid #cbd5e1', borderRadius: '5px', cursor: 'pointer' }}>취소</button>
          <button onClick={handleSave} style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 600, color: '#fff', background: '#4f46e5', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>저장</button>
        </div>
      </div>

      {showAddr && (
        <DaumAddressModal
          onClose={() => setShowAddr(false)}
          onComplete={(d) => setF((p) => ({ ...p, 물건소재지: d.roadAddress || d.jibunAddress || p.물건소재지 }))}
        />
      )}
    </div>
  );
}
