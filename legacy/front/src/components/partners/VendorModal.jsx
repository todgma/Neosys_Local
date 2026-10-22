import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import addressService from '../../services/common/addressService';
import MainRegionModal from '../hub/MainRegionModal';
import ScheduleModal from '../modals/ScheduleModal';
import { useAuthStore } from '../../stores/authStore';
import { PARTNER_CATEGORY_OPTIONS, categoryDisplay } from '../../constants/partnerCategories';
import { interviewService } from '../../services/interviewService';

/**
 * 협력업체 등록/수정 창.
 *  - 상단: 보라 라벨 그리드 폼(분류/상호/전화번호 · 대표자명/대표휴대폰/팩스번호 · 담당자명/담당휴대폰/홈페이지 · 사업장주소 · 영업지역)
 *  - 하단: 상품설명 / 상담내용 카드(물건등록폼 우측 카드 컨셉 — 좌측 보라 라벨 + 날짜/전화번호/특수문자 액션 + 입력영역)
 *  - 푸터: 일정관리(좌) / 저장 · 닫기(우)
 */
const EMPTY = {
  vendorName: '', category1: '', category2: '', category3: '',
  ceoName: '', managerName: '', ceoPhone: '', managerPhone: '', managerTel: '', managerFax: '',
  homepageUrl: '', productDesc: '', consultationNote: '', regType: '', businessRegionCode: '',
  addr1: '', addr2: '', addr3: '', detailAddress: '', businessRegion: '', sortOrder: 0, useYn: 'Y',
};

const SPECIAL_CHARS = ['★', '●', '■', '▶', '✓', '※', '→'];

const VendorModal = ({ isOpen, onClose, onSave, vendor, embedded = false }) => {
  const [formData, setFormData] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // 주소 관련 상태
  const [sidoList, setSidoList] = useState([]);
  const [sigunguList, setSigunguList] = useState([]);
  const [eupMyeonDongList, setEupMyeonDongList] = useState([]);
  const [selectedSido, setSelectedSido] = useState('');
  const [selectedSigungu, setSelectedSigungu] = useState('');
  const [selectedEupMyeonDong, setSelectedEupMyeonDong] = useState('');

  const productRef = useRef(null);
  const consultRef = useRef(null);

  // 영업지역 — 고객 구입희망지역과 동일 방식(지역추가 모달 + 태그)
  const [businessAreas, setBusinessAreas] = useState([]);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const { user, office } = useAuthStore();
  // 신규 저장 후 창을 닫지 않으므로, 재저장 시 중복 생성되지 않도록 생성된 vendorId를 추적
  const savedVendorIdRef = useRef(vendor?.vendorId || null);
  const addBusinessArea = (region) => setBusinessAreas((prev) => (
    region.bjdCode && prev.some((a) => a.bjdCode === region.bjdCode) ? prev : [...prev, region]
  ));
  const removeBusinessArea = (idx) => setBusinessAreas((prev) => prev.filter((_, i) => i !== idx));
  const areaLabel = (a) => a.regionName || [a.addr1, a.addr2, a.addr3, a.bldNm].filter(Boolean).join(' ') || '(지역)';

  // 상담이력(ct_interview, vendor_id 기준) — 물건등록폼과 동일하게 여러 건 관리
  const [consultations, setConsultations] = useState([]);   // [{ itvNo, itvDate, userId, content, _dirty }]
  const [deletedItvNos, setDeletedItvNos] = useState([]);   // 저장 시 삭제할 기존 상담 번호
  const [activeConsultIdx, setActiveConsultIdx] = useState(null);
  const [consultField, setConsultField] = useState('내용');  // 검색 기준(성함/전화번호/내용)
  const [consultFilter, setConsultFilter] = useState('');    // 검색어
  const consultRefs = useRef({});                            // idx → textarea element
  const blankConsult = () => ({ itvNo: null, itvDate: nowStamp(), userId: user?.userName || user?.userId || '담당자', content: '', _dirty: false });
  const nowStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const addConsult = () => setConsultations((prev) => {
    const next = [...prev, { itvNo: null, itvDate: nowStamp(), userId: user?.userName || user?.userId || '담당자', content: '', _dirty: true }];
    setActiveConsultIdx(next.length - 1);
    return next;
  });
  const removeConsult = (idx) => setConsultations((prev) => {
    const target = prev[idx];
    if (target?.itvNo) setDeletedItvNos((d) => [...d, target.itvNo]);
    return prev.filter((_, i) => i !== idx);
  });
  const setConsultContent = (idx, val) => setConsultations((prev) => prev.map((c, i) => (i === idx ? { ...c, content: val, _dirty: true } : c)));
  // 활성 상담칸 커서 위치에 텍스트 삽입(전화번호/특수문자)
  const insertConsult = (text) => {
    const idx = activeConsultIdx;
    if (idx == null) { toast('상담 내용 입력칸을 먼저 클릭하세요.'); return; }
    const el = consultRefs.current[idx];
    const cur = consultations[idx]?.content || '';
    if (!el) { setConsultContent(idx, cur + text); return; }
    const start = el.selectionStart ?? cur.length;
    const end = el.selectionEnd ?? cur.length;
    setConsultContent(idx, cur.slice(0, start) + text + cur.slice(end));
    requestAnimationFrame(() => { el.focus(); const pos = start + text.length; el.setSelectionRange(pos, pos); });
  };
  // 항상 기본 1행 유지(물건등록폼과 동일)
  useEffect(() => { if (isOpen && consultations.length === 0) setConsultations([blankConsult()]); }, [isOpen, consultations.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // 시도 목록 로드
  useEffect(() => {
    const loadSido = async () => {
      try {
        const response = await addressService.getSidoList();
        const sidoData = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
        setSidoList(sidoData);
      } catch (error) {
        console.error('시도 목록 조회 실패:', error);
      }
    };
    if (isOpen) loadSido();
  }, [isOpen]);

  const handleSidoChange = async (bjdCode, bjdName) => {
    setSelectedSido(bjdCode); setSelectedSigungu(''); setSelectedEupMyeonDong('');
    setSigunguList([]); setEupMyeonDongList([]);
    handleChange({ target: { name: 'addr1', value: bjdName } });
    if (bjdCode) {
      try {
        const response = await addressService.getSigunguList(bjdCode);
        setSigunguList(Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : []);
      } catch (error) { console.error('시군구 목록 조회 실패:', error); }
    }
  };

  const handleSigunguChange = async (bjdCode, bjdName) => {
    setSelectedSigungu(bjdCode); setSelectedEupMyeonDong(''); setEupMyeonDongList([]);
    handleChange({ target: { name: 'addr2', value: bjdName } });
    if (bjdCode) {
      try {
        const response = await addressService.getEupMyeonDongList(bjdCode);
        setEupMyeonDongList(Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : []);
      } catch (error) { console.error('읍면동 목록 조회 실패:', error); }
    }
  };

  const handleEupMyeonDongChange = (bjdCode, bjdName) => {
    setSelectedEupMyeonDong(bjdCode);
    handleChange({ target: { name: 'addr3', value: bjdName } });
    handleChange({ target: { name: 'businessRegionCode', value: bjdCode } });
  };

  useEffect(() => {
    if (vendor) setFormData({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, vendor[k] ?? EMPTY[k]])) });
    else setFormData(EMPTY);
    setBusinessAreas(Array.isArray(vendor?.businessAreas) ? vendor.businessAreas : []);
    setSelectedSido(''); setSelectedSigungu(''); setSelectedEupMyeonDong('');
    setDeletedItvNos([]);
    setActiveConsultIdx(null);
    // 상담이력 로드(수정 시) — vendor_id 기준
    if (vendor?.vendorId) {
      interviewService.getByVendor(vendor.vendorId)
        .then((res) => {
          const items = res?.data?.interviews || res?.data?.Interviews || [];
          setConsultations(items.map((it) => ({
            itvNo: it.itvNo ?? it.ItvNo,
            itvDate: it.itvDate ?? it.ItvDate ?? '',
            userId: it.regId ?? it.RegId ?? it.userId ?? '담당자',
            content: it.itvContent ?? it.ItvContent ?? '',
            _dirty: false,
          })));
        })
        .catch((e) => { console.error('상담이력 조회 실패:', e); setConsultations([]); });
    } else {
      setConsultations([]);
    }
  }, [vendor, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // 카드(상품설명/상담내용) 텍스트 커서 위치에 삽입
  const insertInto = (field, ref, text) => {
    const el = ref.current;
    const cur = formData[field] || '';
    if (!el) { setFormData((p) => ({ ...p, [field]: cur + text })); return; }
    const start = el.selectionStart ?? cur.length;
    const end = el.selectionEnd ?? cur.length;
    const next = cur.slice(0, start) + text + cur.slice(end);
    setFormData((p) => ({ ...p, [field]: next }));
    requestAnimationFrame(() => { el.focus(); const pos = start + text.length; el.setSelectionRange(pos, pos); });
  };
  const todayText = () => {
    const d = new Date();
    return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} `;
  };
  const phoneText = () => (formData.managerPhone || formData.managerTel || formData.ceoPhone || '전화번호 ');

  const validateForm = () => {
    const newErrors = {};
    if (!formData.vendorName.trim()) newErrors.vendorName = '상호를 입력해주세요';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 상담이력 저장(vendor 저장 후) — 삭제/신규/수정을 ct_interview(vendor_id)로 반영
  const persistConsultations = async (vendorId) => {
    for (const itvNo of deletedItvNos) {
      try { await interviewService.deleteInterview(itvNo, user?.userId); } catch (e) { console.error('상담 삭제 실패:', e); }
    }
    for (const c of consultations) {
      const content = (c.content || '').trim();
      try {
        if (!c.itvNo) {
          if (!content) continue; // 빈 신규 행은 저장하지 않음
          await interviewService.createInterview({
            itvType: 'VENDOR', itvDate: c.itvDate || nowStamp(), custName: formData.vendorName || '',
            itvContent: content, vendorId,
            offNo: office?.offNo ?? user?.offNo ?? null, rtNo: user?.rtNo ?? null, userId: user?.userId ?? null,
          });
        } else if (c._dirty) {
          await interviewService.updateInterview(c.itvNo, { itvContent: content, itvDate: c.itvDate, vendorId, userId: user?.userId ?? null });
        }
      } catch (e) { console.error('상담 저장 실패:', e); }
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const savedId = await onSave({
        ...formData, businessAreas, businessRegion: businessAreas.map(areaLabel).join(', '),
        vendorId: savedVendorIdRef.current,
        offNo: office?.offNo ?? user?.offNo ?? null, rtNo: user?.rtNo ?? null, userId: user?.userId ?? null,
      });
      const vendorId = savedId || savedVendorIdRef.current || vendor?.vendorId || null;
      savedVendorIdRef.current = vendorId;   // 재저장 시 update로 처리(중복 생성 방지)
      if (vendorId) await persistConsultations(vendorId);
      // 물건등록폼처럼 저장해도 창을 자동으로 닫지 않음. 목록은 success 이벤트로 갱신됨.
      toast.success('협력업체가 저장되었습니다.');
    }
    catch (error) { console.error('협력업체 저장 에러:', error); toast.error('저장 중 오류가 발생했습니다.'); }
    finally { setIsLoading(false); }
  };

  if (!isOpen) return null;

  // 스타일
  const LABEL = { width: '110px', flexShrink: 0, background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', fontWeight: 600, fontSize: '14px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', whiteSpace: 'nowrap', boxSizing: 'border-box' };
  const CELL = { border: '1px solid #cbd5e1', padding: '3px', verticalAlign: 'middle' };
  const IN = { width: '100%', padding: '5px 6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' };
  const labelTd = { ...LABEL, display: 'table-cell', width: '110px' };
  const linkBtn = { padding: '2px 2px', fontSize: '12px', fontWeight: 700, border: 'none', background: 'transparent', color: 'white', cursor: 'pointer', textDecoration: 'none' };
  const linkBox = { display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', border: '1px solid rgba(255,255,255,0.85)', borderRadius: '5px', padding: '6px 8px', marginTop: '10px' };
  const cardLabel = { width: '110px', flexShrink: 0, background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px', gap: '2px', fontSize: '14px', fontWeight: 600 };

  const actionBox = (field, ref) => (
    <div style={linkBox}>
      <button type="button" style={linkBtn} onClick={() => insertInto(field, ref, todayText())}>날짜입력</button>
      <button type="button" style={linkBtn} onClick={() => insertInto(field, ref, phoneText())}>전화번호입력</button>
      <select value="" onChange={(e) => { if (e.target.value) insertInto(field, ref, e.target.value); e.target.value = ''; }}
        style={{ ...linkBtn, cursor: 'pointer', background: 'transparent' }}>
        <option value="">특수문자</option>
        {SPECIAL_CHARS.map((c) => <option key={c} value={c} style={{ color: '#111827' }}>{c}</option>)}
      </select>
    </div>
  );

  // embedded=true(별도 창/ModalPage): 배경 오버레이 없이 창 전체를 채움 / false: 인페이지 중앙 오버레이
  const wrapStyle = embedded
    ? { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'white' }
    : undefined;
  const cardStyle = embedded
    ? { position: 'relative', background: 'white', width: '100%', height: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
    : { position: 'relative', background: 'white', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', width: '1040px', maxWidth: '96vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' };

  return (
    <div
      className={embedded ? '' : 'fixed inset-0 z-50 flex items-center justify-center overflow-y-auto'}
      style={wrapStyle}
      onClick={embedded ? undefined : onClose}
    >
      {!embedded && <div className="absolute inset-0 bg-black bg-opacity-50" />}
      <div onClick={(e) => e.stopPropagation()} style={cardStyle}>
        {/* 본문 */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px' }}>
          {/* 상단 그리드 폼 */}
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '110px' }} /><col /><col style={{ width: '110px' }} /><col /><col style={{ width: '110px' }} /><col />
            </colgroup>
            <tbody>
              <tr>
                <td style={labelTd}>분류</td>
                <td style={CELL}>
                  <select name="category1" value={formData.category1} onChange={handleChange} style={{ ...IN, cursor: 'pointer' }}>
                    <option value="">분류 선택</option>
                    {PARTNER_CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{categoryDisplay(c)}</option>)}
                  </select>
                </td>
                <td style={labelTd}>상호 <span style={{ color: '#fecaca' }}>*</span></td>
                <td style={CELL}><input name="vendorName" value={formData.vendorName} onChange={handleChange} style={{ ...IN, border: errors.vendorName ? '1px solid #ef4444' : IN.border }} /></td>
                <td style={labelTd}>전화번호</td>
                <td style={CELL}><input name="managerTel" value={formData.managerTel} onChange={handleChange} style={IN} /></td>
              </tr>
              <tr>
                <td style={labelTd}>대표자명</td>
                <td style={CELL}><input name="ceoName" value={formData.ceoName} onChange={handleChange} style={IN} /></td>
                <td style={labelTd}>대표휴대폰</td>
                <td style={CELL}><input name="ceoPhone" value={formData.ceoPhone} onChange={handleChange} style={IN} /></td>
                <td style={labelTd}>팩스번호</td>
                <td style={CELL}><input name="managerFax" value={formData.managerFax} onChange={handleChange} style={IN} /></td>
              </tr>
              <tr>
                <td style={labelTd}>담당자명</td>
                <td style={CELL}><input name="managerName" value={formData.managerName} onChange={handleChange} style={IN} /></td>
                <td style={labelTd}>담당휴대폰</td>
                <td style={CELL}><input name="managerPhone" value={formData.managerPhone} onChange={handleChange} style={IN} /></td>
                <td style={labelTd}>홈페이지</td>
                <td style={CELL}><input name="homepageUrl" value={formData.homepageUrl} onChange={handleChange} style={IN} /></td>
              </tr>
              <tr>
                <td style={labelTd}>사업장주소</td>
                <td style={CELL} colSpan={5}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select value={selectedSido} onChange={(e) => { const s = sidoList.find((i) => i.bjdCode === e.target.value); handleSidoChange(e.target.value, s?.bjdName || ''); }} style={{ ...IN, width: '130px' }}>
                      <option value="">시/도</option>
                      {sidoList.map((s) => <option key={s.bjdCode} value={s.bjdCode}>{s.bjdName}</option>)}
                    </select>
                    <select value={selectedSigungu} onChange={(e) => { const s = sigunguList.find((i) => i.bjdCode === e.target.value); handleSigunguChange(e.target.value, s?.bjdName || ''); }} disabled={!selectedSido} style={{ ...IN, width: '130px' }}>
                      <option value="">시/군/구</option>
                      {sigunguList.map((s) => <option key={s.bjdCode} value={s.bjdCode}>{s.bjdName}</option>)}
                    </select>
                    <select value={selectedEupMyeonDong} onChange={(e) => { const s = eupMyeonDongList.find((i) => i.bjdCode === e.target.value); handleEupMyeonDongChange(e.target.value, s?.bjdName || ''); }} disabled={!selectedSigungu} style={{ ...IN, width: '130px' }}>
                      <option value="">읍/면/동</option>
                      {eupMyeonDongList.map((emd) => <option key={emd.bjdCode} value={emd.bjdCode}>{emd.bjdName}</option>)}
                    </select>
                    <input name="detailAddress" value={formData.detailAddress} onChange={handleChange} placeholder="상세주소" style={{ ...IN, flex: 1, minWidth: '180px', width: 'auto' }} />
                    <button type="button" onClick={() => toast('주소검색은 준비 중입니다.')} style={{ padding: '5px 14px', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', background: 'white', color: '#374151', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>주소검색</button>
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ ...labelTd, verticalAlign: 'middle' }}>영업지역</td>
                <td style={CELL} colSpan={5}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minHeight: '40px' }}>
                    {businessAreas.map((a, idx) => (
                      <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', fontSize: '13px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '14px', color: '#3730a3' }}>
                        {areaLabel(a)}
                        <button type="button" onClick={() => removeBusinessArea(idx)} style={{ border: 'none', background: 'transparent', color: '#6366f1', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}>✕</button>
                      </span>
                    ))}
                    <button type="button" onClick={() => setShowRegionModal(true)} style={{ padding: '5px 12px', fontSize: '14px', fontWeight: 600, border: '1px solid #d97706', background: '#f59e0b', color: 'white', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ 지역추가</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 상품설명 카드 */}
          <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderTop: 'none', minHeight: '150px' }}>
            <div style={cardLabel}>
              <span>상품설명</span>
              {actionBox('productDesc', productRef)}
            </div>
            <div style={{ flex: 1, padding: '6px', display: 'flex' }}>
              <textarea ref={productRef} name="productDesc" value={formData.productDesc} onChange={handleChange} placeholder="상품설명 입력 (또는 좌측 날짜/전화번호/특수문자)"
                style={{ ...IN, height: '100%', minHeight: '138px', resize: 'none', lineHeight: 1.6, fontSize: '13px' }} />
            </div>
          </div>

          {/* 상담이력 카드 — 물건등록폼과 동일하게 여러 건 관리(날짜/담당자별). 저장 시 ct_interview(vendor_id)로 반영 */}
          <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderTop: 'none', minHeight: '170px' }}>
            <div style={cardLabel}>
              <span>상담이력</span>
              <div style={linkBox}>
                <button type="button" style={linkBtn} onClick={addConsult} title="상담내용 추가">날짜입력</button>
                <button type="button" style={linkBtn} onClick={() => insertConsult(phoneText())}>전화번호입력</button>
                <select value="" onChange={(e) => { if (e.target.value) insertConsult(e.target.value); e.target.value = ''; }}
                  style={{ ...linkBtn, cursor: 'pointer', background: 'transparent' }}>
                  <option value="">특수문자</option>
                  {SPECIAL_CHARS.map((c) => <option key={c} value={c} style={{ color: '#111827' }}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0, background: 'white', display: 'flex', flexDirection: 'column' }}>
              {/* 정렬/검색 헤더 — 물건등록폼과 동일(성함/전화번호/내용) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 6px', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', flexShrink: 0 }}>
                <select value={consultField} onChange={(e) => setConsultField(e.target.value)}
                  style={{ padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: '3px', background: 'white', color: '#374151', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                  <option value="성함">성함</option>
                  <option value="전화번호">전화번호</option>
                  <option value="내용">내용</option>
                </select>
                <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex' }}>
                  <input value={consultFilter} onChange={(e) => setConsultFilter(e.target.value)} placeholder={`${consultField} 검색`}
                    style={{ flex: 1, minWidth: 0, padding: '3px 24px 3px 6px', border: '1px solid #cbd5e1', borderRadius: '3px', fontSize: '13px', fontFamily: 'inherit' }} />
                  {consultFilter && (
                    <button type="button" onClick={() => setConsultFilter('')} title="검색 초기화"
                      style={{ position: 'absolute', right: '2px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '50%', background: '#e2e8f0', color: '#475569', cursor: 'pointer', fontSize: '12px', lineHeight: 1 }}>×</button>
                  )}
                </div>
              </div>
              {/* 상담이력 목록 */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 0, background: 'white' }}>
                {(() => {
                  const list = consultations
                    .map((entry, origIndex) => ({ entry, origIndex }))
                    .filter(({ entry }) => {
                      if (!consultFilter) return true;
                      const q = consultFilter.toLowerCase();
                      const content = (entry.content || '').toLowerCase();
                      const name = (entry.userId || '').toLowerCase();
                      if (consultField === '성함') return name.includes(q);
                      if (consultField === '전화번호') { const d = q.replace(/\D/g, ''); return d ? content.replace(/\D/g, '').includes(d) : content.includes(q); }
                      return content.includes(q);
                    });
                  if (list.length === 0) {
                    return <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontSize: '13px' }}>검색 결과 없음</div>;
                  }
                  return list.map(({ entry, origIndex }) => (
                    <div key={entry.itvNo ?? `new-${origIndex}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', padding: '4px 6px', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ flexShrink: 0, fontSize: '13px', lineHeight: '1.6', paddingTop: '2px' }}>
                        <span style={{ color: '#64748b' }}>[{entry.itvDate || '-'}]</span>{' '}
                        <span style={{ color: '#3b82f6', fontWeight: 600 }}>[{entry.userId || '담당자'}]</span>
                        <span> :&nbsp;</span>
                      </span>
                      <textarea
                        ref={(el) => { if (el) consultRefs.current[origIndex] = el; }}
                        value={entry.content}
                        onFocus={() => setActiveConsultIdx(origIndex)}
                        onChange={(e) => setConsultContent(origIndex, e.target.value)}
                        placeholder="내용 입력..."
                        rows={1}
                        style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', fontFamily: 'inherit', padding: '2px', lineHeight: '1.6', resize: 'vertical', minHeight: '24px' }}
                      />
                      <button type="button" onClick={() => removeConsult(origIndex)} title="삭제"
                        style={{ flexShrink: 0, border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: '14px', fontWeight: 700, padding: '0 2px' }}>✕</button>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* 푸터: 일정관리(좌) / 저장·닫기(우) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid #e5e7eb', background: '#f8fafc', flexShrink: 0 }}>
          <button type="button" onClick={() => setShowScheduleModal(true)} style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', background: 'white', color: '#374151', borderRadius: '5px', cursor: 'pointer' }}>일정관리</button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={handleSubmit} disabled={isLoading} style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 700, border: '1px solid #4f46e5', background: '#4f46e5', color: 'white', borderRadius: '5px', cursor: 'pointer', opacity: isLoading ? 0.5 : 1 }}>{isLoading ? '저장 중...' : '저장'}</button>
            <button type="button" onClick={onClose} style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', background: 'white', color: '#374151', borderRadius: '5px', cursor: 'pointer' }}>닫기</button>
          </div>
        </div>
      </div>

      {/* 영업지역 추가 모달 — 고객 구입희망지역과 동일 방식 */}
      <MainRegionModal
        isOpen={showRegionModal}
        onClose={() => setShowRegionModal(false)}
        mode="edit"
        title="영업지역"
        items={businessAreas}
        onAdd={addBusinessArea}
        onRemove={removeBusinessArea}
      />

      {/* 일정 등록 모달 (물건등록폼과 동일 — 사업장주소 자동입력) */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        defaultLocation={[formData.addr1, formData.addr2, formData.addr3, formData.detailAddress].filter(Boolean).join(' ')}
        onSuccess={() => { setShowScheduleModal(false); toast.success('일정이 등록되었습니다.'); }}
      />
    </div>
  );
};

export default VendorModal;
