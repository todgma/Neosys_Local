import { useState, useEffect } from 'react';
import { X, Trash2, Pencil, Check } from 'lucide-react';
import { PROPERTY_TYPE_OPTIONS } from '../../constants/propertyTypes';
import { searchPersonsByCondition } from '../../services/unifiedSearchService';
import { useAuthStore } from '../../stores/authStore';
import AddressSelectorSimple from '../property/AddressSelectorSimple';
import addressService from '../../services/common/addressService';
import * as smsApi from '../../services/sms/smsService';

// 단지형(아파트 계열) 물건유형 — 등록폼과 동일. 이 유형일 때만 단지명 드롭다운 노출
const APT_TYPES = ['SYCA101', 'SYCA102', 'SYCA103', 'SYCA104', 'SYCA105', 'SYCA106', 'SYCA107', 'SYCA120'];

// 고객 구입물건유형 카테고리(저장값 '업무용' 유지, 표시만 '상업용')
const WANT_CATEGORIES = [
  { value: '주거용', label: '주거용' },
  { value: '업무용', label: '상업용(상가/공장/숙박)' },
  { value: '토지', label: '토지' },
];
// 물건 거래유형(SALEDIV) / 고객 거래유형(TRDTYP)
const PT_TRADE_OPTIONS = [{ v: 'SALEDIV01', l: '매매' }, { v: 'SALEDIV02', l: '전세' }, { v: 'SALEDIV03', l: '월세' }, { v: 'SALEDIV04', l: '기타임대' }];
const CUST_TRADE_OPTIONS = [{ v: 'TRDTYP01', l: '매매' }, { v: 'TRDTYP02', l: '전세' }, { v: 'TRDTYP03', l: '월세' }, { v: 'TRDTYP04', l: '기타임대' }];

const NG_INIT = { name: '', source: 'property', ptType: '', tradeType: '', holderKind: '', wantType: '', custTradeType: '', addr1: '', addr2: '', addr3: '', bjdCode: '', danjiCode: '' };
const personKey = (p) => (p.phone || '').replace(/[^0-9]/g, '') || `nm:${p.name}`;

/**
 * 대량문자관리 > 주소록 관리 > 신규 등록 (새창 팝업 / 웹 폴백 임베드).
 * 그룹을 DB에 저장(createGroup) 후 onCreated/onClose 호출.
 */
export default function SmsNewGroupForm({ onClose, onCreated, page = false }) {
  const { user } = useAuthStore();
  const offNo = user?.offNo;
  const rtNo = user?.rtNo;
  const userId = user?.userId;

  const [ng, setNg] = useState(NG_INIT);
  const [found, setFound] = useState([]); // [{...person, checked}]
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editIdx, setEditIdx] = useState(null); // 수정 중 행 index
  const [danjiList, setDanjiList] = useState([]); // 단지명 목록(물건유형·소재지 기준)
  const [notice, setNotice] = useState(null); // 안내 모달(네이티브 alert/confirm 대체)
  const notify = (text) => setNotice(text);

  const isCust = ng.source === 'customer';
  const isAptType = APT_TYPES.includes(ng.ptType);
  // 단지형 + 소재지 선택 시 물건유형에 맞는 단지 목록 조회(아파트→아파트단지, 오피스텔→오피스텔단지)
  useEffect(() => {
    let alive = true;
    if (!isCust && isAptType && ng.bjdCode) {
      addressService.getDanjiListByBjd(ng.bjdCode, ng.ptType)
        .then((d) => { if (alive) setDanjiList(d || []); })
        .catch(() => { if (alive) setDanjiList([]); });
    } else {
      setDanjiList([]);
    }
    return () => { alive = false; };
  }, [isCust, isAptType, ng.ptType, ng.bjdCode]);
  const ngRegion = () => (ng.addr3 || ng.addr2 || ng.addr1 || '').trim();
  const ptLabel = (code) => PROPERTY_TYPE_OPTIONS.find((t) => t.code === code)?.label || '';
  const setNgField = (k, v) => setNg((p) => ({ ...p, [k]: v }));
  const setNgAddr = (k, v) => setNg((p) => ({ ...p, [k]: v }));
  const checkedCount = found.filter((p) => p.checked).length;

  const doSearch = async () => {
    setSearching(true);
    try {
      const persons = await searchPersonsByCondition({
        source: ng.source, ptType: ng.ptType, tradeType: ng.tradeType, holderType: ng.holderKind,
        wantType: ng.wantType, trdType: ng.custTradeType, region: ngRegion(),
        bjdCode: ng.bjdCode, danjiCode: ng.danjiCode, user,
      });
      setFound((prev) => {
        const seen = new Set(prev.map(personKey));
        const add = persons.filter((p) => { const k = personKey(p); if (!k || seen.has(k)) return false; seen.add(k); return true; }).map((p) => ({ ...p, checked: true }));
        return [...prev, ...add];
      });
      setSearched(true);
    } catch (e) {
      console.error('대상 검색 실패:', e);
      notify('대상 검색에 실패했습니다.');
    } finally { setSearching(false); }
  };

  const toggleRow = (i) => setFound((prev) => prev.map((p, idx) => (idx === i ? { ...p, checked: !p.checked } : p)));
  const setRowField = (i, k, v) => setFound((prev) => prev.map((p, idx) => (idx === i ? { ...p, [k]: v } : p)));
  // 삭제 — 체크된 행 제거
  const deleteChecked = () => {
    if (checkedCount === 0) { notify('삭제할 대상을 선택하세요.'); return; }
    setFound((prev) => prev.filter((p) => !p.checked));
    setEditIdx(null);
  };
  // 수정 — 체크된 1명의 성함/전화번호 인라인 편집 토글
  const editChecked = () => {
    if (editIdx != null) { setEditIdx(null); return; } // 완료
    const idxs = found.map((p, i) => (p.checked ? i : -1)).filter((i) => i >= 0);
    if (idxs.length !== 1) { notify('수정할 대상 1명만 선택하세요.'); return; }
    setEditIdx(idxs[0]);
  };

  const createGroup = async () => {
    if (rtNo == null) { notify('로그인 정보가 없어 그룹을 저장할 수 없습니다.'); return; }
    const name = ng.name.trim();
    if (!name) { notify('그룹명을 입력하세요.'); return; }
    const picked = found.filter((p) => p.checked);
    if (found.length > 0 && picked.length === 0) { notify('추가할 대상을 1명 이상 선택하세요.'); return; }
    const memo = ng.source === 'property'
      ? ['물건', ptLabel(ng.ptType), (PT_TRADE_OPTIONS.find((t) => t.v === ng.tradeType)?.l)].filter(Boolean).join(' · ')
      : ['고객', (WANT_CATEGORIES.find((c) => c.value === ng.wantType)?.label) || ng.wantType, (CUST_TRADE_OPTIONS.find((t) => t.v === ng.custTradeType)?.l), ngRegion()].filter(Boolean).join(' · ');
    const members = picked.map((p) => ({ name: p.name || '', phone: p.phone || '', memo: p.role || '' }));
    setSaving(true);
    try {
      await smsApi.createGroup({ offNo, rtNo, groupName: name, groupMemo: memo, members, regId: userId });
      onCreated?.();
      onClose?.();
    } catch (e) {
      console.error('그룹 등록 실패:', e);
      notify('그룹 등록에 실패했습니다.');
    } finally { setSaving(false); }
  };

  // ── 스타일 ──
  const btn = { padding: '7px 14px', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' };
  const primary = { ...btn, background: '#4f46e5', borderColor: '#4f46e5', color: 'white' };
  const label = { fontSize: '15px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' };
  const field = { width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '7px 10px', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', outline: 'none', color: '#111827' };
  const th = { padding: '6px 6px', fontSize: '14px', fontWeight: 700, color: '#111827', border: '1px solid #cbd5e1', background: '#f1f5f9', textAlign: 'center', whiteSpace: 'nowrap', position: 'sticky', top: 0 };
  const td = { padding: '5px 7px', fontSize: '13px', fontWeight: 600, color: '#111827', border: '1px solid #e5e7eb', verticalAlign: 'middle' };
  const cellInput = { width: '100%', boxSizing: 'border-box', border: '1px solid #94a3b8', borderRadius: '4px', padding: '3px 6px', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', outline: 'none' };

  // 컬럼 정의
  const columns = isCust
    ? [{ k: 'name', l: '성함', w: '92px' }, { k: 'phone', l: '전화번호', w: '120px' }, { k: 'wantLabel', l: '구입유형', w: '96px' }, { k: 'tradeLabel', l: '거래유형', w: '96px' }, { k: 'region', l: '희망지역', w: null }]
    : [{ k: 'name', l: '성함', w: '92px' }, { k: 'phone', l: '전화번호', w: '120px' }, { k: 'ptTypeLabel', l: '물건유형', w: '96px' }, { k: 'tradeLabel', l: '거래유형', w: '80px' }, { k: 'ptName', l: '물건명', w: '150px' }, { k: 'detailAddr', l: '상세주소', w: '160px' }];

  return (
    <div style={{ position: 'relative', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'white' }}>

      {/* 본문 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column' }}>
        {/* 1) 연락처 불러오기 기준 (상단) */}
        <label style={label}>연락처 불러오기 기준 <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>(물건=소유자·임차인 / 고객=구입자)</span></label>
        <div style={{ display: 'inline-flex', alignSelf: 'flex-start', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', marginBottom: '14px' }}>
          {[['property', '물건 기준'], ['customer', '고객 기준']].map(([v, l], idx) => (
            <button key={v} type="button" onClick={() => setNg((p) => ({ ...p, source: v, addr1: '', addr2: '', addr3: '', bjdCode: '', danjiCode: '' }))}
              style={{ padding: '8px 20px', fontSize: '14px', fontWeight: 700, lineHeight: 1, boxSizing: 'border-box', flexShrink: 0, whiteSpace: 'nowrap', border: 'none', borderLeft: idx ? '1px solid #cbd5e1' : 'none', outline: 'none', cursor: 'pointer', background: ng.source === v ? '#4f46e5' : 'white', color: ng.source === v ? 'white' : '#4f46e5' }}>{l}</button>
          ))}
        </div>

        {/* 2) 그룹명 (하단) */}
        <label style={label}>그룹명 *</label>
        <input value={ng.name} onChange={(e) => setNgField('name', e.target.value)} placeholder="예: 매수 원하는 그룹 / 매도 원하는 그룹 / 물건 찾는 그룹" style={{ ...field, marginBottom: '14px' }} />

        {/* 3) 조건 */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {ng.source === 'property' ? (
            <>
              <div style={{ flex: 1, minWidth: '140px' }}>
                <label style={label}>물건유형</label>
                <select value={ng.ptType} onChange={(e) => setNg((p) => ({ ...p, ptType: e.target.value, danjiCode: '' }))} style={{ ...field, cursor: 'pointer' }}>
                  <option value="">전체</option>
                  {PROPERTY_TYPE_OPTIONS.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={label}>거래유형</label>
                <select value={ng.tradeType} onChange={(e) => setNgField('tradeType', e.target.value)} style={{ ...field, cursor: 'pointer' }}>
                  <option value="">전체</option>
                  {PT_TRADE_OPTIONS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '110px' }}>
                <label style={label}>소유구분</label>
                <select value={ng.holderKind} onChange={(e) => setNgField('holderKind', e.target.value)} style={{ ...field, cursor: 'pointer' }}>
                  <option value="">전체</option>
                  <option value="OWNER">소유자</option>
                  <option value="BUYER">임차인</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div style={{ flex: 1, minWidth: '140px' }}>
                <label style={label}>구입물건유형</label>
                <select value={ng.wantType} onChange={(e) => setNgField('wantType', e.target.value)} style={{ ...field, cursor: 'pointer' }}>
                  <option value="">전체</option>
                  {WANT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={label}>거래유형</label>
                <select value={ng.custTradeType} onChange={(e) => setNgField('custTradeType', e.target.value)} style={{ ...field, cursor: 'pointer' }}>
                  <option value="">전체</option>
                  {CUST_TRADE_OPTIONS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </div>
            </>
          )}
        </div>

        {/* 물건 기준: 소재지 드롭다운 + (단지형) 단지명 + 검색 */}
        {!isCust && (
          <div style={{ marginTop: '10px' }}>
            <label style={label}>소재지</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <AddressSelectorSimple formData={{ bjdCode: ng.bjdCode, addr1: ng.addr1, addr2: ng.addr2, addr3: ng.addr3 }} onChange={setNgAddr} ptType={ng.ptType} />
              {isAptType && (
                <select value={ng.danjiCode} onChange={(e) => setNgField('danjiCode', e.target.value)} disabled={!ng.bjdCode} style={{ width: '200px', padding: '4px 6px', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: ng.bjdCode ? 'pointer' : 'default', color: '#111827' }}>
                  <option value="">{ng.bjdCode ? '단지명 전체' : '소재지 먼저 선택'}</option>
                  {danjiList.map((d) => <option key={d.naverDanjiCode} value={d.naverDanjiCode}>{d.buildingName}{d.addressBunji ? ` (${d.addressBunji})` : ''}</option>)}
                </select>
              )}
              <button type="button" style={{ ...primary, whiteSpace: 'nowrap' }} disabled={searching} onClick={doSearch}>{searching ? '검색 중…' : '검색'}</button>
            </div>
          </div>
        )}

        {/* 고객 기준: 구입희망지역 + 검색 */}
        {isCust && (
          <div style={{ marginTop: '10px' }}>
            <label style={label}>구입희망지역</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <AddressSelectorSimple formData={{ bjdCode: ng.bjdCode, addr1: ng.addr1, addr2: ng.addr2, addr3: ng.addr3 }} onChange={setNgAddr} ptType="" />
              <button type="button" style={{ ...primary, whiteSpace: 'nowrap' }} disabled={searching} onClick={doSearch}>{searching ? '검색 중…' : '검색'}</button>
            </div>
          </div>
        )}

        {/* 4) 검색결과 테이블 */}
        <div style={{ marginTop: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>검색결과 {found.length}명 · 선택 <span style={{ color: '#4f46e5' }}>{checkedCount}</span></span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
              <button type="button" style={{ ...btn, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: editIdx != null ? '#15803d' : '#4f46e5', borderColor: editIdx != null ? '#86efac' : '#c7d2fe' }} onClick={editChecked}>
                {editIdx != null ? <><Check size={13} /> 완료</> : <><Pencil size={13} /> 수정</>}
              </button>
              <button type="button" style={{ ...btn, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626', borderColor: '#fca5a5' }} onClick={deleteChecked}><Trash2 size={13} /> 삭제</button>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: '46px' }}>선택</th>
                  {columns.map((c) => <th key={c.k} style={{ ...th, ...(c.w ? { width: c.w } : {}) }}>{c.l}</th>)}
                </tr>
              </thead>
              <tbody>
                {found.length === 0 ? (
                  <tr><td colSpan={columns.length + 1} style={{ padding: '22px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#94a3b8', border: '1px solid #e5e7eb', whiteSpace: 'pre-line' }}>{searched ? '조건에 맞는 대상이 없습니다.' : '기준·조건을 선택하고 [검색]하면 대상이 여기에 누적됩니다.\n물건·고객 양쪽에서 불러와 한 그룹으로 만들 수 있습니다.'}</td></tr>
                ) : found.map((p, i) => (
                  <tr key={personKey(p) + i} style={{ background: p.checked ? '#eef2ff' : 'white' }}>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <input type="checkbox" checked={!!p.checked} onChange={() => toggleRow(i)} style={{ width: '15px', height: '15px' }} />
                    </td>
                    {columns.map((c) => {
                      if (editIdx === i && (c.k === 'name' || c.k === 'phone')) {
                        return <td key={c.k} style={td}><input value={p[c.k] || ''} onChange={(e) => setRowField(i, c.k, e.target.value)} style={cellInput} /></td>;
                      }
                      return <td key={c.k} style={{ ...td, textAlign: (c.k === 'name' || c.k === 'phone') ? 'left' : 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p[c.k] || ''}>{p[c.k] || '-'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 하단 액션 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 16px', borderTop: '1px solid #e5e7eb', background: '#fafafa', flexShrink: 0 }}>
        <button type="button" style={btn} onClick={onClose}>취소</button>
        <button type="button" style={primary} disabled={saving} onClick={createGroup}>
          {saving ? '저장 중…' : (found.length ? `그룹 만들기 (${checkedCount}명)` : '그룹 만들기')}
        </button>
      </div>

      {/* 안내 모달 (네이티브 alert/confirm 미사용) */}
      {notice != null && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setNotice(null)}>
          <div style={{ width: '340px', maxWidth: '92%', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,.22)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '22px 20px', fontSize: '15px', fontWeight: 700, color: '#111827', lineHeight: 1.5, whiteSpace: 'pre-line', textAlign: 'center' }}>{notice}</div>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0 20px 18px' }}>
              <button type="button" style={{ ...primary, minWidth: '96px', justifyContent: 'center' }} onClick={() => setNotice(null)}>확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
