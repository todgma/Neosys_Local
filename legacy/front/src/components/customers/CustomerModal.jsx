import React, { useState, useEffect } from 'react';
import { customerService } from '../../services/customerService';
import { customerMemoService } from '../../services/customerMemoService';
import { interviewService } from '../../services/interviewService';
import { useAuthStore } from '../../stores/authStore';
import { useHubModalStore } from '../../stores/hubModalStore';
import ResizableModal from '../ui/ResizableModal';
import AddressSelectorSimple from '../property/AddressSelectorSimple';
import { Trash2, Plus } from 'lucide-react';
import ReportBuilderModal from '../reports/ReportBuilderModal';
import toast from 'react-hot-toast';

/**
 * 고객 등록/수정 모달
 */
const CustomerModal = ({ isOpen, onClose, onSuccess, editData = null }) => {
  const { user } = useAuthStore();
  const { openWithCustomer } = useHubModalStore();
  const [showReport, setShowReport] = useState(false);
  const [formData, setFormData] = useState({
    custType: '',
    name: '',
    alias: '',
    tel: '',
    addr: '',
    memo: '',
    rentBsnYn: 'N',
    trdPrg: '',
    wantType: '',
    wantNm: '',
    excAreaFr: '',
    excAreaTo: '',
    landShareFr: '',
    landShareTo: '',
    trdType: [],
    moveinYn: '',
    moveDateFr: '',
    moveDateTo: '',
    cashAblt: '',
    saleAmtFr: '',
    saleAmtTo: '',
    lesAmtFr: '',
    lesAmtTo: '',
    protAmtFr: '',
    protAmtTo: '',
    monAmtFr: '',
    monAmtTo: '',
    etcProtAmtFr: '',
    etcProtAmtTo: '',
    etcMonAmtFr: '',
    etcMonAmtTo: '',
    etcType: '',
    rmk: '',
    rnk: '',
    roomCnt: '',
    bathCnt: '',
    parkCnt: '',
    communityFac: '',
    featureNote: '',
    gapInvestYn: '',
    irrelevantYn: '',
    rtNo: null,
    offNo: null,
    vendorId: null,
  });

  // 희망지역(1:N) / 구입자정보(1:N)
  const [wishAreas, setWishAreas] = useState([]);
  const [buyers, setBuyers] = useState([]);

  // 고객 유형
  const customerTypes = [
    { value: 1, label: '소유주' },
    { value: 2, label: '구매자' },
    { value: 3, label: '임차인' },
  ];

  // 거래 진행 상태
  const progressStates = [
    { value: 'TRDPRG01', label: '상담중' },
    { value: 'TRDPRG02', label: '계약진행' },
    { value: 'TRDPRG03', label: '계약완료' },
    { value: 'TRDPRG04', label: '보류' },
    { value: 'TRDPRG05', label: '취소' },
  ];

  // 거래 유형
  const tradeTypes = [
    { value: 'TRDTYP01', label: '매매' },
    { value: 'TRDTYP02', label: '전세' },
    { value: 'TRDTYP03', label: '월세' },
    { value: 'TRDTYP04', label: '기타임대' },
  ];

  // 입주 여부 유형
  const moveInTypes = [
    { value: 'MOVEIN01', label: '입주' },
    { value: 'MOVEIN02', label: '전세' },
    { value: 'MOVEIN03', label: '월세' },
    { value: 'MOVEIN04', label: '기타임대' },
  ];

  // 물건 종류
  const propertyTypes = [
    { value: 'SYCA101', label: '아파트' },
    { value: 'SYCA102', label: '오피스텔' },
    { value: 'SYCA103', label: '주상복합' },
    { value: 'SYCA104', label: '재건축' },
    { value: 'SYCA105', label: '아파트 분양권' },
    { value: 'SYCA106', label: '오피스텔 분양권' },
    { value: 'SYCA107', label: '주상복합 분양권' },
    { value: 'SYCA108', label: '빌딩/건물' },
    { value: 'SYCA109', label: '상가건물' },
    { value: 'SYCA110', label: '숙박/콘도' },
    { value: 'SYCA111', label: '공장/창고' },
    { value: 'SYCA112', label: '기타' },
    { value: 'SYCA113', label: '사무실' },
    { value: 'SYCA114', label: '상가점포' },
    { value: 'SYCA115', label: '토지' },
    { value: 'SYCA116', label: '지식산업센터' },
    { value: 'SYCA117', label: '원투룸' },
    { value: 'SYCA118', label: '빌라/연립' },
    { value: 'SYCA119', label: '주택' },
    { value: 'SYCA120', label: '재개발' },
  ];

  useEffect(() => {
    if (!isOpen) return;

    if (editData) {
      // 수정 모드
      setFormData({
        custType: editData.custType || '',
        name: editData.name || '',
        alias: editData.alias || '',
        tel: editData.tel || '',
        addr: editData.addr || '',
        memo: editData.memo || '',
        rentBsnYn: editData.rentBsnYn || 'N',
        trdPrg: editData.trdPrg || '',
        wantType: editData.wantType || '',
        wantNm: editData.wantNm || '',
        excAreaFr: editData.excAreaFr || '',
        excAreaTo: editData.excAreaTo || '',
        landShareFr: editData.landShareFr || '',
        landShareTo: editData.landShareTo || '',
        trdType: editData.trdType ? (Array.isArray(editData.trdType) ? editData.trdType : String(editData.trdType).split(',').filter(Boolean)) : [],
        moveinYn: editData.moveinYn === 'Y' ? 'Y' : '',
        moveDateFr: editData.moveDateFr ? editData.moveDateFr.split('T')[0] : '',
        moveDateTo: editData.moveDateTo ? editData.moveDateTo.split('T')[0] : '',
        cashAblt: editData.cashAblt || '',
        saleAmtFr: editData.saleAmtFr || '',
        saleAmtTo: editData.saleAmtTo || '',
        lesAmtFr: editData.lesAmtFr || '',
        lesAmtTo: editData.lesAmtTo || '',
        protAmtFr: editData.protAmtFr || '',
        protAmtTo: editData.protAmtTo || '',
        monAmtFr: editData.monAmtFr || '',
        monAmtTo: editData.monAmtTo || '',
        etcProtAmtFr: editData.etcProtAmtFr || '',
        etcProtAmtTo: editData.etcProtAmtTo || '',
        etcMonAmtFr: editData.etcMonAmtFr || '',
        etcMonAmtTo: editData.etcMonAmtTo || '',
        etcType: editData.etcType || '',
        rmk: editData.rmk || '',
        rnk: editData.rnk || '',
        roomCnt: editData.roomCnt ?? '',
        bathCnt: editData.bathCnt ?? '',
        parkCnt: editData.parkCnt ?? '',
        communityFac: editData.communityFac || '',
        featureNote: editData.featureNote || '',
        gapInvestYn: editData.gapInvestYn || '',
        irrelevantYn: editData.irrelevantYn || '',
        rtNo: editData.rtNo || null,
        offNo: editData.offNo || null,
        vendorId: editData.vendorId || null,
      });
      // 희망지역/구입자 등 상세 로드
      if (editData.custNo) loadCustomerDetail(editData.custNo);
    } else {
      // 신규 등록 모드 - 초기화
      setFormData({
        custType: '',
        name: '',
        alias: '',
        tel: '',
        addr: '',
        memo: '',
        rentBsnYn: 'N',
        trdPrg: '',
        wantType: '',
        wantNm: '',
        excAreaFr: '',
        excAreaTo: '',
        landShareFr: '',
        landShareTo: '',
        trdType: [],
        moveinYn: '',
        moveDateFr: '',
        moveDateTo: '',
        cashAblt: '',
        saleAmtFr: '',
        saleAmtTo: '',
        lesAmtFr: '',
        lesAmtTo: '',
        protAmtFr: '',
        protAmtTo: '',
        monAmtFr: '',
        monAmtTo: '',
        etcProtAmtFr: '',
        etcProtAmtTo: '',
        etcMonAmtFr: '',
        etcMonAmtTo: '',
        etcType: '',
        rmk: '',
        rnk: '',
        roomCnt: '',
        bathCnt: '',
        parkCnt: '',
        communityFac: '',
        featureNote: '',
        gapInvestYn: '',
        irrelevantYn: '',
        rtNo: null,
        offNo: null,
        vendorId: null,
      });
      setWishAreas([]);
      setBuyers([{ name: '', relation: '', tel: '', addr: '' }]);
      setShares([{ officeName: '', regionName: '', officePhone: '', memo: '' }]);
      setMemos([]);
      setConsultations([]);
    }
  }, [isOpen, editData]);

  // 상세(희망지역/구입자/신규필드) 로드
  const loadCustomerDetail = async (custNo) => {
    try {
      const res = await customerService.getDetail(custNo);
      const d = res?.data;
      if (!d) return;
      setFormData((prev) => ({
        ...prev,
        roomCnt: d.roomCnt ?? '',
        bathCnt: d.bathCnt ?? '',
        parkCnt: d.parkCnt ?? '',
        communityFac: d.communityFac || '',
        featureNote: d.featureNote || '',
        gapInvestYn: d.gapInvestYn || '',
        irrelevantYn: d.irrelevantYn || '',
        moveinYn: d.moveinYn === 'Y' ? 'Y' : '',
        rnk: d.rnk || '',
        rmk: d.rmk || prev.rmk,
      }));
      setWishAreas((d.areas || []).map((a) => ({
        addr1: a.addr1 || '', addr2: a.addr2 || '', addr3: a.addr3 || '',
        bjdCode: a.bjdCode || '', bldNm: a.bldNm || '', danjiCode: a.danjiCode || '',
        detailLoc: a.detailLoc || '',
      })));
      const loadedBuyers = (d.buyers || []).map((b) => ({
        name: b.name || '', relation: b.relation || '', tel: b.tel || '', addr: b.addr || '',
      }));
      setBuyers(loadedBuyers.length ? loadedBuyers : [{ name: '', relation: '', tel: '', addr: '' }]);
      const loadedShares = (d.shares || []).map((s) => ({
        officeName: s.officeName || '', regionName: s.regionName || '', officePhone: s.officePhone || '', memo: s.memo || '',
      }));
      setShares(loadedShares.length ? loadedShares : [{ officeName: '', regionName: '', officePhone: '', memo: '' }]);
      loadMemos(custNo);
      loadConsultations(custNo);
    } catch (e) {
      console.error('고객 상세 로드 실패:', e);
    }
  };

  // 상담이력 = 상담관리(ct_interview) 테이블 (cust_no 기준)
  const loadConsultations = async (custNo) => {
    if (!custNo) { setConsultations([]); return; }
    try {
      const res = await interviewService.getByCustomer(custNo);
      const list = res?.data?.interviews || res?.data?.Interviews || [];
      setConsultations(list.map((i) => ({
        itvNo: i.itvNo,
        datetime: (i.itvDate || i.regDt || '').toString().replace('T', ' ').slice(0, 16),
        userId: i.regId || '',
        content: i.itvContent || '',
      })));
    } catch (e) {
      console.error('상담이력 조회 실패:', e);
      setConsultations([]);
    }
  };

  // 신규 상담이력을 ct_interview에 저장 (본인 아이디 + 중개사무소 번호)
  const saveNewConsultations = async (custNo, custNm) => {
    const kst = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    const itvDate = kst.toISOString().slice(0, 10);
    const news = consultations.filter((c) => !c.itvNo && (c.content || '').trim());
    for (const c of news) {
      try {
        await interviewService.createInterview({
          itvType: 'ITVTYP01',
          itvDate,
          custNo,
          custName: custNm || '',
          itvContent: c.content,
          offNo: user?.offNo,
          userId: user?.userId,
        });
      } catch (e) { /* 개별 실패 무시 */ }
    }
  };

  // 희망지역 행 조작
  const removeWishArea = (idx) => setWishAreas((prev) => prev.filter((_, i) => i !== idx));

  // 희망지역 입력(초안) → 추가 (상단 노란바에서 입력)
  const [areaDraft, setAreaDraft] = useState({});
  const [areaDraftKey, setAreaDraftKey] = useState(0);
  const updateAreaDraft = (field, value) => setAreaDraft((p) => ({ ...p, [field]: value }));
  const commitAreaDraft = () => {
    if (!areaDraft.addr1 && !areaDraft.addr3 && !areaDraft.bjdCode && !areaDraft.bldNm && !areaDraft.detailLoc) {
      toast.error('희망지역을 선택/입력하세요.');
      return;
    }
    setWishAreas((prev) => [...prev, {
      addr1: areaDraft.addr1 || '', addr2: areaDraft.addr2 || '', addr3: areaDraft.addr3 || '',
      bjdCode: areaDraft.bjdCode || '', bldNm: areaDraft.bldNm || '',
      danjiCode: areaDraft.danjiCode || '', detailLoc: areaDraft.detailLoc || '',
    }]);
    setAreaDraft({});
    setAreaDraftKey((k) => k + 1);
  };

  // 구입자 행 조작
  const addBuyer = () => setBuyers((prev) => [...prev, { name: '', relation: '', tel: '', addr: '' }]);
  const removeBuyer = (idx) => setBuyers((prev) => prev.filter((_, i) => i !== idx));
  const updateBuyer = (idx, field, value) => setBuyers((prev) => prev.map((b, i) => (i === idx ? { ...b, [field]: value } : b)));

  // 공동중개사 사무소 (표) — ※ 영구저장은 공통(pt_share+cust_no) 적용 후 연동 예정
  const [shares, setShares] = useState([]);
  const addShare = () => setShares((prev) => [...prev, { officeName: '', regionName: '', officePhone: '', memo: '' }]);
  const removeShare = (idx) => setShares((prev) => prev.filter((_, i) => i !== idx));
  const updateShare = (idx, field, value) => setShares((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));

  // 물건메모 (pt_memo + cust_no, API) — 물건폼과 동일
  const [memos, setMemos] = useState([]);
  const [showMemoInput, setShowMemoInput] = useState(false);
  const [newMemoContent, setNewMemoContent] = useState('');
  const [displayMemoContent, setDisplayMemoContent] = useState('');
  const [newMemoDate, setNewMemoDate] = useState('');
  const [memoTextareaRef, setMemoTextareaRef] = useState(null);
  const [editingMemoNo, setEditingMemoNo] = useState(null);
  const [editingMemoContent, setEditingMemoContent] = useState('');
  const [editingMemoDate, setEditingMemoDate] = useState('');
  // 상담이력 (세션) — 물건폼과 동일
  const [consultations, setConsultations] = useState([]);

  const loadMemos = async (custNo) => {
    if (!custNo) { setMemos([]); return; }
    try {
      const res = await customerMemoService.getMemoList(custNo);
      setMemos(res?.data || []);
    } catch (e) {
      console.error('상담메모 조회 실패:', e);
      setMemos([]);
    }
  };

  const handleCreateMemo = async (custNo) => {
    if (!newMemoContent.trim()) { toast.error('메모 내용을 입력하세요.'); return; }
    if (!custNo) {
      // custNo 없으면 임시 저장 → 등록 시 함께 저장
      setMemos((prev) => [...prev, { memoNo: `temp_${Date.now()}`, memoDate: newMemoDate, memoContent: newMemoContent, userId: user?.userId || '담당자', isTemp: true }]);
      setNewMemoContent(''); setDisplayMemoContent(''); setNewMemoDate(''); setShowMemoInput(false);
      toast.success('메모가 임시 저장되었습니다. 고객 저장 시 함께 등록됩니다.');
      return;
    }
    try {
      await customerMemoService.createMemo(custNo, { memoDate: newMemoDate, memoContent: newMemoContent, userId: user?.userId });
      toast.success('메모가 등록되었습니다.');
      setNewMemoContent(''); setDisplayMemoContent(''); setNewMemoDate(''); setShowMemoInput(false);
      await loadMemos(custNo);
    } catch (e) { console.error(e); toast.error('메모 등록에 실패했습니다.'); }
  };

  const handleUpdateMemo = async (memoNo) => {
    if (!editingMemoContent.trim()) { toast.error('메모 내용을 입력하세요.'); return; }
    try {
      await customerMemoService.updateMemo(editData?.custNo, memoNo, { memoDate: editingMemoDate, memoContent: editingMemoContent });
      toast.success('메모가 수정되었습니다.');
      setEditingMemoNo(null);
      await loadMemos(editData?.custNo);
    } catch (e) { console.error(e); toast.error('메모 수정에 실패했습니다.'); }
  };

  const handleDeleteMemo = async (memoNo) => {
    if (!window.confirm('이 메모를 삭제하시겠습니까?')) return;
    const memo = memos.find((m) => m.memoNo === memoNo);
    if (memo?.isTemp) { setMemos(memos.filter((m) => m.memoNo !== memoNo)); toast.success('메모가 삭제되었습니다.'); return; }
    try {
      await customerMemoService.deleteMemo(editData?.custNo, memoNo);
      toast.success('메모가 삭제되었습니다.');
      await loadMemos(editData?.custNo);
    } catch (e) { console.error(e); toast.error('메모 삭제에 실패했습니다.'); }
  };

  const insertSpecialChar = (char) => {
    if (!memoTextareaRef) return;
    const start = memoTextareaRef.selectionStart;
    const end = memoTextareaRef.selectionEnd;
    const text = displayMemoContent;
    const newText = text.substring(0, start) + char + text.substring(end);
    setNewMemoContent(newText); setDisplayMemoContent(newText);
    setTimeout(() => { memoTextareaRef.selectionStart = memoTextareaRef.selectionEnd = start + char.length; memoTextareaRef.focus(); }, 0);
  };

  const applyColor = (color) => {
    if (!memoTextareaRef) return;
    const start = memoTextareaRef.selectionStart;
    const end = memoTextareaRef.selectionEnd;
    if (start === end) { toast.error('색상을 적용할 텍스트를 선택하세요.'); return; }
    const text = newMemoContent;
    const selected = text.substring(start, end);
    const colored = `<span style="color:${color}">${selected}</span>`;
    const newText = text.substring(0, start) + colored + text.substring(end);
    setNewMemoContent(newText); setDisplayMemoContent(newText);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      setFormData((prev) => {
        const currentArray = prev[name] || [];
        if (checked) {
          return { ...prev, [name]: [...currentArray, value] };
        } else {
          return { ...prev, [name]: currentArray.filter((v) => v !== value) };
        }
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 대표 정보(구입자 첫 행 또는 실구입할사람)
    const primaryBuyer = buyers.find((b) => b.name) || {};
    const custName = formData.name || primaryBuyer.name || formData.alias || '';
    const custTel = formData.tel || primaryBuyer.tel || '';

    if (!custName) {
      toast.error('구입자 성함(또는 실구입할 사람)을 입력해주세요.');
      return;
    }

    try {
      // 빈 문자열을 null로 변환하는 함수
      const convertEmptyToNull = (value) => {
        if (value === '' || value === null || value === undefined) {
          return null;
        }
        return value;
      };

      // 숫자 필드들을 null 또는 숫자로 변환
      const payload = {
        custType: convertEmptyToNull(formData.custType),
        name: custName,
        alias: convertEmptyToNull(formData.alias),
        tel: convertEmptyToNull(custTel),
        addr: convertEmptyToNull(formData.addr),
        memo: convertEmptyToNull(formData.memo),
        rentBsnYn: formData.rentBsnYn,
        trdPrg: convertEmptyToNull(formData.trdPrg),
        wantType: convertEmptyToNull(formData.wantType),
        wantNm: convertEmptyToNull(formData.wantNm),
        excAreaFr: convertEmptyToNull(formData.excAreaFr),
        excAreaTo: convertEmptyToNull(formData.excAreaTo),
        landShareFr: convertEmptyToNull(formData.landShareFr),
        landShareTo: convertEmptyToNull(formData.landShareTo),
        trdType: (formData.trdType || []).join(',') || null,
        moveinYn: convertEmptyToNull(formData.moveinYn),
        moveDateFr: convertEmptyToNull(formData.moveDateFr),
        moveDateTo: convertEmptyToNull(formData.moveDateTo),
        cashAblt: convertEmptyToNull(formData.cashAblt),
        saleAmtFr: convertEmptyToNull(formData.saleAmtFr),
        saleAmtTo: convertEmptyToNull(formData.saleAmtTo),
        lesAmtFr: convertEmptyToNull(formData.lesAmtFr),
        lesAmtTo: convertEmptyToNull(formData.lesAmtTo),
        protAmtFr: convertEmptyToNull(formData.protAmtFr),
        protAmtTo: convertEmptyToNull(formData.protAmtTo),
        monAmtFr: convertEmptyToNull(formData.monAmtFr),
        monAmtTo: convertEmptyToNull(formData.monAmtTo),
        etcProtAmtFr: convertEmptyToNull(formData.etcProtAmtFr),
        etcProtAmtTo: convertEmptyToNull(formData.etcProtAmtTo),
        etcMonAmtFr: convertEmptyToNull(formData.etcMonAmtFr),
        etcMonAmtTo: convertEmptyToNull(formData.etcMonAmtTo),
        etcType: convertEmptyToNull(formData.etcType),
        rmk: convertEmptyToNull(formData.rmk),
        rnk: convertEmptyToNull(formData.rnk),
        roomCnt: convertEmptyToNull(formData.roomCnt),
        bathCnt: convertEmptyToNull(formData.bathCnt),
        parkCnt: convertEmptyToNull(formData.parkCnt),
        communityFac: convertEmptyToNull(formData.communityFac),
        featureNote: convertEmptyToNull(formData.featureNote),
        gapInvestYn: convertEmptyToNull(formData.gapInvestYn),
        irrelevantYn: convertEmptyToNull(formData.irrelevantYn),
        rtNo: convertEmptyToNull(formData.rtNo),
        offNo: convertEmptyToNull(formData.offNo),
        vendorId: convertEmptyToNull(formData.vendorId),
        userId: user?.userId,
        // 1:N
        areas: wishAreas
          .filter((a) => a.addr1 || a.addr3 || a.bjdCode || a.bldNm || a.detailLoc)
          .map((a) => ({
            addr1: a.addr1 || null, addr2: a.addr2 || null, addr3: a.addr3 || null,
            bjdCode: a.bjdCode || null, bldNm: a.bldNm || null,
            danjiCode: a.danjiCode || null, detailLoc: a.detailLoc || null,
          })),
        buyers: buyers
          .filter((b) => b.name || b.tel || b.relation || b.addr)
          .map((b) => ({
            name: b.name || null, relation: b.relation || null,
            tel: b.tel || null, addr: b.addr || null,
          })),
        shares: shares
          .filter((s) => s.officeName || s.regionName || s.officePhone || s.memo)
          .map((s) => ({
            officeName: s.officeName || null, regionName: s.regionName || null,
            officePhone: s.officePhone || null, memo: s.memo || null,
          })),
      };

      if (editData) {
        // 수정
        await customerService.update(editData.custNo, payload);
        await saveNewConsultations(editData.custNo, custName);
        await loadConsultations(editData.custNo);
        toast.success('고객 정보가 수정되었습니다.');
        onSuccess && onSuccess();
        // 수정 후 팝업 유지
      } else {
        // 등록 → 신규 custNo 반환
        const res = await customerService.create(payload);
        const newCustNo = res?.data;
        // 임시 메모 저장
        if (newCustNo) {
          const temps = memos.filter((m) => m.isTemp);
          for (const m of temps) {
            try {
              await customerMemoService.createMemo(newCustNo, { memoDate: m.memoDate, memoContent: m.memoContent, userId: user?.userId });
            } catch (err) { /* 개별 실패 무시 */ }
          }
          await saveNewConsultations(newCustNo, custName);
        }
        toast.success('고객이 등록되었습니다.');
        onSuccess && onSuccess();
        requestAnimationFrame(() => {
          onClose();
        });
      }
    } catch (error) {
      console.error('고객 저장 실패:', error);
      toast.error('고객 저장에 실패했습니다.');
    }
  };

  if (!isOpen) return null;

  // PropertyFormPageV2 스타일 (가로 배치: 보라 라벨 + 내용)
  const ROW = { display: 'flex', borderBottom: '1px solid #cbd5e1' };
  const LABEL = { width: '110px', padding: '6px', fontSize: '13px', fontWeight: '600', background: '#8b7ad8', color: 'white', border: '1px solid #5b4aa8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' };
  const LABEL_R = { ...LABEL, borderLeft: 'none' };
  const CONTENT = { flex: 1, padding: '6px' };
  const INPUT = { width: '100%', padding: '4px 8px', fontSize: '13px', border: '1px solid #cbd5e1' };
  const RANGE = { display: 'flex', gap: '6px', alignItems: 'center' };
  const RANGE_INPUT = { flex: 1, padding: '4px 8px', fontSize: '13px', border: '1px solid #cbd5e1' };
  const SECTION_HEAD = { padding: '6px 8px', fontSize: '13px', fontWeight: '700', background: '#ede9fe', color: '#5b4aa8', borderBottom: '1px solid #cbd5e1' };
  const CHECKS = { padding: '6px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', flex: 1 };
  const AMT = { width: '90px', padding: '4px 8px', fontSize: '13px', border: '1px solid #cbd5e1' };
  const SUB = { fontSize: '11px', fontWeight: '600', color: '#5b4aa8', minWidth: '50px' };
  const SUB2 = { fontSize: '11px', color: '#374151', whiteSpace: 'nowrap' };
  const AMT_LINE = { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' };
  const AMT_CELL = { width: '100%', padding: '4px 8px', fontSize: '13px', border: '1px solid #cbd5e1', boxSizing: 'border-box' };
  const TILDE = { textAlign: 'center', color: '#94a3b8' };
  const CHIP = { alignSelf: 'stretch', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '13px', fontWeight: '600', color: '#92400e', background: '#fef3c7', border: '1px solid #fbbf24', whiteSpace: 'nowrap' };
  const RCARD_HEAD = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', fontSize: '13px', fontWeight: '700', background: '#8b7ad8', color: 'white' };
  // HolderCombinedCard(물건폼)와 동일한 표 스타일
  const thStyle = { fontSize:'14px',padding: '4px 2px', border: '1px solid #cbd5e1', background: '#f1f5f9' };
  const tdStyle = { padding: '0', border: '1px solid #cbd5e1' };
  const cellInput = { width: '100%', padding: '4px 6px', fontSize: '11px', border: 'none', outline: 'none', background: 'transparent', boxSizing: 'border-box' };
  const delTdStyle = { width: '32px', padding: '0', border: '1px solid #cbd5e1', textAlign: 'center' };
  const delBtnStyle = { padding: '2px', border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
  const addRowBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', color: '#4f46e5', cursor: 'pointer' };
  const buyerHasData = (b) => !!(b.name || b.tel || b.relation || b.addr);
  const shareHasData = (s) => !!(s.officeName || s.regionName || s.officePhone || s.memo);

  return (
    <>
    <ResizableModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span>{editData ? '고객 수정' : '고객 등록'}</span>
          {editData && formData.regId && (
            <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 'normal' }}>
              등록자: {formData.regId} | 등록일: {formData.regDt ? new Date(formData.regDt).toLocaleString('ko-KR') : '-'} | 최근수정일: {formData.updDt ? new Date(formData.updDt).toLocaleString('ko-KR') : '-'}
            </span>
          )}
        </div>
      }
      autoFit
      initialWidth={Math.min(1280, (typeof window !== 'undefined' ? window.innerWidth : 1280) - 32)}
      initialHeight={(typeof window !== 'undefined' ? window.innerHeight : 760) - 32}
      minWidth={900}
      minHeight={560}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderTop: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => {
                if (editData && editData.custNo) {
                  openWithCustomer(editData);
                } else {
                  toast.error('저장된 고객 정보만 정보망 전송이 가능합니다.');
                }
              }}
              style={{ padding: '4px 12px', fontSize: '13px', border: '1px solid #0ea5e9', backgroundColor: '#0ea5e9', color: 'white', borderRadius: '3px', cursor: 'pointer' }}
            >
              정보망전송
            </button>
            {editData && editData.custNo && (
              <button
                type="button"
                onClick={() => setShowReport(true)}
                style={{ padding: '4px 12px', fontSize: '13px', border: '1px solid #4f46e5', backgroundColor: '#4f46e5', color: 'white', borderRadius: '3px', cursor: 'pointer' }}
              >
                보고서 생성
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '4px 12px', fontSize: '13px', border: '1px solid #cbd5e1', backgroundColor: 'white', borderRadius: '3px', cursor: 'pointer' }}
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              style={{ padding: '4px 12px', fontSize: '13px', border: '1px solid #6366f1', backgroundColor: '#6366f1', color: 'white', borderRadius: '3px', cursor: 'pointer' }}
            >
              {editData ? '수정' : '등록'}
            </button>
          </div>
        </div>
      }
    >
      <div style={{ padding: '8px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '6px', height: '100%', minHeight: 0 }}>

          {/* 최상단 노란 바: 물건유형 + 희망지역 입력 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '0 8px 0 0', minHeight: '40px', background: '#fefce8', border: '2px solid #fbbf24' }}>
            <span style={CHIP}>물건유형</span>
            <select name="wantType" value={formData.wantType} onChange={handleChange} style={{ width: '130px', padding: '4px 8px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
              <option value="">선택</option>
              {propertyTypes.map((type) => (<option key={type.value} value={type.value}>{type.label}</option>))}
            </select>

            <span style={CHIP}>희망지역</span>
            <AddressSelectorSimple key={areaDraftKey} formData={areaDraft} ptType="SYCA101" onChange={updateAreaDraft} onDanjiListChange={() => {}} />
            <input type="text" value={areaDraft.bldNm || ''} onChange={(e) => updateAreaDraft('bldNm', e.target.value)} placeholder="건물명/단지명" style={{ width: '120px', padding: '4px 8px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
            <input type="text" value={areaDraft.detailLoc || ''} onChange={(e) => updateAreaDraft('detailLoc', e.target.value)} placeholder="상세위치" style={{ width: '110px', padding: '4px 8px', fontSize: '13px', border: '1px solid #cbd5e1' }} />
            <button type="button" onClick={commitAreaDraft} style={{ padding: '5px 12px', fontSize: '13px', border: '1px solid #d97706', background: '#f59e0b', color: 'white', borderRadius: '3px', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ 지역추가</button>
          </div>

          {/* 추가된 희망지역 태그 */}
          {wishAreas.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '0 4px' }}>
              {wishAreas.map((area, idx) => (
                <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', fontSize: '11px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '12px', color: '#3730a3' }}>
                  {[area.addr1, area.addr2, area.addr3, area.bldNm, area.detailLoc].filter(Boolean).join(' ') || '(지역)'}
                  <button type="button" onClick={() => removeWishArea(idx)} style={{ border: 'none', background: 'transparent', color: '#6366f1', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}>✕</button>
                </span>
              ))}
            </div>
          )}

          {/* 좌우 분리 */}
          <div style={{ display: 'flex', gap: '6px', flex: 1, minHeight: 0, alignItems: 'stretch' }}>
            {/* 좌측: 메인 폼 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1', overflow: 'auto' }}>

            {/* 고객 상태 */}
            <div style={ROW}>
              <div style={LABEL}>고객 상태</div>
              <div style={CHECKS}>
                {progressStates.map((state) => (
                  <label key={state.value} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="radio" name="trdPrg" value={state.value} checked={formData.trdPrg === state.value} onChange={handleChange} style={{ cursor: 'pointer' }} />
                    <span>{state.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 전용면적 */}
            <div style={ROW}>
              <div style={LABEL}>전용면적(㎡)</div>
              <div style={CONTENT}>
                <div style={RANGE}>
                  <input type="number" name="excAreaFr" value={formData.excAreaFr} onChange={handleChange} placeholder="최소" style={RANGE_INPUT} />
                  <span>~</span>
                  <input type="number" name="excAreaTo" value={formData.excAreaTo} onChange={handleChange} placeholder="최대" style={RANGE_INPUT} />
                </div>
              </div>
            </div>

            {/* 거래 구분 */}
            <div style={ROW}>
              <div style={LABEL}>거래 구분</div>
              <div style={CHECKS}>
                {tradeTypes.map((type) => (
                  <label key={type.value} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" name="trdType" value={type.value} checked={formData.trdType.includes(type.value)} onChange={handleChange} style={{ cursor: 'pointer' }} />
                    <span>{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 금액 (매매/전세 / 월세 / 기타임대) — 입력창 수직 정렬(그리드) */}
            <div style={ROW}>
              <div style={LABEL}>금액(만원)</div>
              <div style={CONTENT}>
                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 14px 1fr 44px 1fr 14px 1fr', columnGap: '6px', rowGap: '8px', alignItems: 'center', maxWidth: '620px' }}>
                  {/* 매매 / 전세 */}
                  <span style={SUB}>매매</span>
                  <input type="number" name="saleAmtFr" value={formData.saleAmtFr} onChange={handleChange} placeholder="최소" style={AMT_CELL} />
                  <span style={TILDE}>~</span>
                  <input type="number" name="saleAmtTo" value={formData.saleAmtTo} onChange={handleChange} placeholder="최대" style={AMT_CELL} />
                  <span style={SUB}>전세</span>
                  <input type="number" name="lesAmtFr" value={formData.lesAmtFr} onChange={handleChange} placeholder="최소" style={AMT_CELL} />
                  <span style={TILDE}>~</span>
                  <input type="number" name="lesAmtTo" value={formData.lesAmtTo} onChange={handleChange} placeholder="최대" style={AMT_CELL} />
                  {/* 월세 */}
                  <span style={SUB}>월세</span>
                  <input type="number" name="protAmtFr" value={formData.protAmtFr} onChange={handleChange} placeholder="최소" style={AMT_CELL} />
                  <span style={TILDE}>~</span>
                  <input type="number" name="protAmtTo" value={formData.protAmtTo} onChange={handleChange} placeholder="최대" style={AMT_CELL} />
                  <span />
                  <input type="number" name="monAmtFr" value={formData.monAmtFr} onChange={handleChange} placeholder="최소" style={AMT_CELL} />
                  <span style={TILDE}>~</span>
                  <input type="number" name="monAmtTo" value={formData.monAmtTo} onChange={handleChange} placeholder="최대" style={AMT_CELL} />
                  {/* 기타임대 */}
                  <span style={SUB}>기타임대</span>
                  <input type="number" name="etcProtAmtFr" value={formData.etcProtAmtFr} onChange={handleChange} placeholder="최소" style={AMT_CELL} />
                  <span style={TILDE}>~</span>
                  <input type="number" name="etcProtAmtTo" value={formData.etcProtAmtTo} onChange={handleChange} placeholder="최대" style={AMT_CELL} />
                  <span />
                  <input type="number" name="etcMonAmtFr" value={formData.etcMonAmtFr} onChange={handleChange} placeholder="최소" style={AMT_CELL} />
                  <span style={TILDE}>~</span>
                  <input type="number" name="etcMonAmtTo" value={formData.etcMonAmtTo} onChange={handleChange} placeholder="최대" style={AMT_CELL} />
                </div>
              </div>
            </div>

            {/* 실입주 여부 (실입주 | 갭투자 | 무관) */}
            <div style={ROW}>
              <div style={LABEL}>실입주 여부</div>
              <div style={CHECKS}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={formData.moveinYn === 'Y'} onChange={(e) => setFormData((p) => ({ ...p, moveinYn: e.target.checked ? 'Y' : '' }))} style={{ cursor: 'pointer' }} />
                  <span>실입주</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={formData.gapInvestYn === 'Y'} onChange={(e) => setFormData((p) => ({ ...p, gapInvestYn: e.target.checked ? 'Y' : '' }))} style={{ cursor: 'pointer' }} />
                  <span>갭투자</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={formData.irrelevantYn === 'Y'} onChange={(e) => setFormData((p) => ({ ...p, irrelevantYn: e.target.checked ? 'Y' : '' }))} style={{ cursor: 'pointer' }} />
                  <span>무관</span>
                </label>
              </div>
            </div>

            {/* 이사 예정일 */}
            <div style={ROW}>
              <div style={LABEL}>이사 예정일</div>
              <div style={CONTENT}>
                <div style={RANGE}>
                  <input type="date" name="moveDateFr" value={formData.moveDateFr} onChange={handleChange} style={RANGE_INPUT} />
                  <span>~</span>
                  <input type="date" name="moveDateTo" value={formData.moveDateTo} onChange={handleChange} style={RANGE_INPUT} />
                </div>
              </div>
            </div>

            {/* 상세 정보 */}
            <div style={ROW}>
              <div style={LABEL}>상세 정보</div>
              <div style={CONTENT}>
                <textarea name="rmk" value={formData.rmk} onChange={handleChange} rows={2} style={{ ...INPUT, resize: 'vertical' }} />
              </div>
            </div>

            {/* 구입자정보 (1:N) — 임차인 표 형태 */}
            <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid #cbd5e1' }}>
              <div style={{ width: '110px', padding: '6px', fontSize: '14px', fontWeight: '600', background: '#8b7ad8', color: 'white', borderRight: '1px solid #5b4aa8', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>구입자</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', background: '#f1f5f9' }}>
                <input type="text" name="alias" value={formData.alias} onChange={handleChange} placeholder="실구입할 사람" style={{ flex: 1, padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '3px', color: '#1e293b' }} />
              </div>
            </div>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', background: 'white' }}>
              <thead>
                <tr>
                  <th style={thStyle}>성함</th>
                  <th style={thStyle}>관계</th>
                  <th style={thStyle}>전화번호</th>
                  <th style={thStyle}>주 소</th>
                  <th style={{ ...thStyle, width: '32px' }}></th>
                </tr>
              </thead>
              <tbody>
                {buyers.map((b, idx) => (
                  <tr key={idx}>
                    <td style={tdStyle}><input type="text" value={b.name || ''} onChange={(e) => updateBuyer(idx, 'name', e.target.value)} placeholder="성함" style={cellInput} /></td>
                    <td style={tdStyle}><input type="text" value={b.relation || ''} onChange={(e) => updateBuyer(idx, 'relation', e.target.value)} placeholder="관계" style={cellInput} /></td>
                    <td style={tdStyle}><input type="text" value={b.tel || ''} onChange={(e) => updateBuyer(idx, 'tel', e.target.value)} placeholder="전화번호" style={cellInput} /></td>
                    <td style={tdStyle}><input type="text" value={b.addr || ''} onChange={(e) => updateBuyer(idx, 'addr', e.target.value)} placeholder="주소" style={cellInput} /></td>
                    <td style={delTdStyle}>
                      {buyerHasData(b) && (
                        <button type="button" onClick={() => removeBuyer(idx)} title="삭제" style={delBtnStyle}><Trash2 size={13} /></button>
                      )}
                    </td>
                  </tr>
                ))}
                {/* 행추가 버튼 행 */}
                <tr>
                  <td colSpan={5} style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'center', background: '#f8fafc' }}>
                    <button type="button" onClick={addBuyer} style={addRowBtnStyle}><Plus size={12} /> 행추가</button>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 공동중개사 사무소 (1:N) — 표 형태 */}
            <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid #cbd5e1' }}>
              <div style={{ width: '110px', padding: '6px', fontSize: '13px', fontWeight: '600', background: '#8b7ad8', color: 'white', borderRight: '1px solid #5b4aa8', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', whiteSpace: 'nowrap' }}>공동중개사<br/>사무소</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', background: '#f1f5f9' }}>
                <span style={{ fontSize: '11px', color: '#64748b', flex: 1 }}>상호 / 지역명 / 전화번호 / 내용</span>
              </div>
            </div>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', background: 'white' }}>
              <thead>
                <tr>
                  <th style={thStyle}>상호</th>
                  <th style={thStyle}>지역명</th>
                  <th style={thStyle}>전화번호</th>
                  <th style={thStyle}>내용</th>
                  <th style={{ ...thStyle, width: '32px' }}></th>
                </tr>
              </thead>
              <tbody>
                {shares.map((s, idx) => (
                  <tr key={idx}>
                    <td style={tdStyle}><input type="text" value={s.officeName || ''} onChange={(e) => updateShare(idx, 'officeName', e.target.value)} placeholder="상호" style={cellInput} /></td>
                    <td style={tdStyle}><input type="text" value={s.regionName || ''} onChange={(e) => updateShare(idx, 'regionName', e.target.value)} placeholder="지역명" style={cellInput} /></td>
                    <td style={tdStyle}><input type="text" value={s.officePhone || ''} onChange={(e) => updateShare(idx, 'officePhone', e.target.value)} placeholder="전화번호" style={cellInput} /></td>
                    <td style={tdStyle}><input type="text" value={s.memo || ''} onChange={(e) => updateShare(idx, 'memo', e.target.value)} placeholder="내용" style={cellInput} /></td>
                    <td style={delTdStyle}>
                      {shareHasData(s) && (
                        <button type="button" onClick={() => removeShare(idx)} title="삭제" style={delBtnStyle}><Trash2 size={13} /></button>
                      )}
                    </td>
                  </tr>
                ))}
                {/* 행추가 버튼 행 */}
                <tr>
                  <td colSpan={5} style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'center', background: '#f8fafc' }}>
                    <button type="button" onClick={addShare} style={addRowBtnStyle}><Plus size={12} /> 행추가</button>
                  </td>
                </tr>
              </tbody>
            </table>

            </div>
            {/* 우측: 물건메모 + 상담이력 (물건폼 우측과 동일, 옵션 제외) */}
            <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '0' }}>
              {/* 물건메모 */}
              <div style={{ display: 'flex', border: '1px solid #cbd5e1', flex: 0.7, minHeight: '105px' }}>
                <div style={{ width: '80px', padding: '6px', fontSize: '13px', fontWeight: '600', background: '#8b7ad8', color: 'white', borderRight: '1px solid #5b4aa8', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>물건메모</div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMemoInput(true);
                      const now = new Date();
                      const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
                      setNewMemoDate(kstDate.toISOString().slice(0, 16));
                      setTimeout(() => memoTextareaRef?.focus(), 100);
                    }}
                    style={{ width: '68px', padding: '3px 6px', fontSize: '10px', border: '1px solid #5b4aa8', borderRadius: '3px', background: '#10b981', color: 'white', cursor: 'pointer' }}
                  >
                    날짜입력
                  </button>
                  <select onChange={(e) => { insertSpecialChar(e.target.value); e.target.value = ''; }} value="" style={{ width: '68px', padding: '3px 4px', fontSize: '10px', border: '1px solid #5b4aa8', borderRadius: '3px', background: 'white', color: '#374151', cursor: 'pointer' }}>
                    <option value="">특수문자</option>
                    <option value="★">★</option>
                    <option value="●">●</option>
                    <option value="■">■</option>
                    <option value="▶">▶</option>
                    <option value="✓">✓</option>
                    <option value="※">※</option>
                    <option value="→">→</option>
                  </select>
                  <select onChange={(e) => { applyColor(e.target.value); e.target.value = ''; }} value="" style={{ width: '68px', padding: '3px 4px', fontSize: '10px', border: '1px solid #5b4aa8', borderRadius: '3px', background: 'white', color: '#374151', cursor: 'pointer' }}>
                    <option value="">색상</option>
                    <option value="red">빨강</option>
                    <option value="blue">파랑</option>
                    <option value="green">초록</option>
                    <option value="orange">주황</option>
                    <option value="purple">보라</option>
                  </select>
                </div>
                <div style={{ flex: 1, padding: '6px', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                  {showMemoInput && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 8px', borderRadius: '4px', background: '#fffbeb' }}>
                      <span style={{ fontSize: '10px', color: '#1f2937', fontWeight: '700', flexShrink: 0 }}>
                        [{newMemoDate.slice(0, 10).replace(/-/g, '. ')} {newMemoDate.slice(11, 16)}]
                      </span>
                      <span style={{ fontSize: '10px', color: '#1f2937', fontWeight: '600', flexShrink: 0 }}>[{user?.userId || '담당자'}]</span>
                      <span style={{ fontSize: '10px', color: '#1f2937', flexShrink: 0 }}>:</span>
                      <textarea
                        ref={setMemoTextareaRef}
                        value={newMemoContent}
                        onChange={(e) => { setNewMemoContent(e.target.value); setDisplayMemoContent(e.target.value); }}
                        placeholder="여기에 메모를 입력하세요..."
                        rows="1"
                        style={{ flex: 1, padding: '4px 6px', fontSize: '13px', border: 'none', background: 'transparent', resize: 'none', outline: 'none', fontWeight: '500' }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreateMemo(editData?.custNo); } }}
                      />
                      <button type="button" onClick={() => handleCreateMemo(editData?.custNo)} style={{ padding: '4px 10px', fontSize: '11px', background: '#10b981', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', flexShrink: 0, fontWeight: '600' }}>저장</button>
                    </div>
                  )}
                  <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '4px', minHeight: '80px', background: '#fafafa' }}>
                    {memos.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '11px' }}>메모가 없습니다.</div>
                    ) : (
                      memos.map((memo) => (
                        <div key={memo.memoNo} style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6', background: 'white' }}>
                          {editingMemoNo === memo.memoNo ? (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                              <input type="datetime-local" value={editingMemoDate} onChange={(e) => setEditingMemoDate(e.target.value)} style={{ padding: '2px 4px', fontSize: '10px', border: '1px solid #cbd5e1', borderRadius: '3px' }} />
                              <textarea value={editingMemoContent} onChange={(e) => setEditingMemoContent(e.target.value)} style={{ flex: 1, minWidth: '120px', padding: '4px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '3px', minHeight: '36px' }} />
                              <button type="button" onClick={() => handleUpdateMemo(memo.memoNo)} style={{ padding: '2px 8px', fontSize: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>저장</button>
                              <button type="button" onClick={() => setEditingMemoNo(null)} style={{ padding: '2px 8px', fontSize: '10px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>취소</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px', background: '#f9fafb', borderRadius: '3px' }}>
                              <span style={{ fontSize: '10px', color: '#374151', fontWeight: '600', flexShrink: 0 }}>
                                [{(memo.memoDate || '').slice(0, 10).replace(/-/g, '. ')} {(memo.memoDate || '').slice(11, 16)}]
                              </span>
                              <span style={{ fontSize: '10px', color: '#374151', flexShrink: 0 }}>[{memo.userId}]</span>
                              <span style={{ fontSize: '10px', color: '#374151', flexShrink: 0 }}>:</span>
                              <div style={{ flex: 1, fontSize: '11px', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1f2937', minWidth: 0 }} dangerouslySetInnerHTML={{ __html: memo.memoContent }} />
                              <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                                <button type="button" onClick={() => { setEditingMemoNo(memo.memoNo); setEditingMemoContent(memo.memoContent); setEditingMemoDate((memo.memoDate || '').slice(0, 16)); }} style={{ padding: '2px 6px', fontSize: '10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '3px', cursor: 'pointer' }}>수정</button>
                                <button type="button" onClick={() => handleDeleteMemo(memo.memoNo)} style={{ padding: '2px 6px', fontSize: '10px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '3px', cursor: 'pointer', color: '#dc2626' }}>삭제</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 상담이력 */}
              <div style={{ display: 'flex', border: '1px solid #cbd5e1', flex: 1.3, minHeight: '195px' }}>
                <div style={{ width: '80px', padding: '6px', fontSize: '13px', fontWeight: '600', background: '#8b7ad8', color: 'white', borderRight: '1px solid #5b4aa8', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>상담이력</div>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const dateStr = now.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
                      setConsultations([...consultations, { datetime: dateStr, userId: user?.userId || user?.userName || '담당자', content: '' }]);
                    }}
                    style={{ width: '68px', padding: '3px 6px', fontSize: '10px', border: '1px solid #5b4aa8', borderRadius: '3px', background: '#10b981', color: 'white', cursor: 'pointer' }}
                  >
                    + 추가
                  </button>
                </div>
                <div style={{ flex: 1, padding: '6px', background: '#fef3c7', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ flex: 1, overflow: 'auto', border: '1px solid #cbd5e1', padding: '6px', background: 'white', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.6', minHeight: '100px' }}>
                    {consultations.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>상담이력 정보 없음</div>
                    ) : (
                      consultations.map((entry, index) => (
                        <div key={index} style={{ padding: '4px 0', borderBottom: index < consultations.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '4px', minWidth: 0 }}>
                            <span style={{ whiteSpace: 'nowrap', color: '#64748b' }}>[{entry.datetime}]</span>
                            <span style={{ whiteSpace: 'nowrap', color: '#3b82f6', fontWeight: '600' }}>[{entry.userId}]</span>
                            <span style={{ whiteSpace: 'nowrap' }}>:</span>
                            <input type="text" value={entry.content} onChange={(e) => { const updated = [...consultations]; updated[index].content = e.target.value; setConsultations(updated); }} placeholder="내용 입력..." style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '11px', fontFamily: 'inherit', padding: '2px', minWidth: 0 }} />
                          </div>
                          <button type="button" onClick={async () => {
                            if (entry.itvNo) {
                              if (!window.confirm('이 상담이력을 삭제하시겠습니까?')) return;
                              try { await interviewService.deleteInterview(entry.itvNo, user?.userId); toast.success('상담이력이 삭제되었습니다.'); } catch (er) { toast.error('삭제 실패'); return; }
                            }
                            setConsultations(consultations.filter((_, i) => i !== index));
                          }} style={{ padding: '1px 4px', fontSize: '10px', border: '1px solid #ef4444', background: 'white', color: '#ef4444', cursor: 'pointer', borderRadius: '2px', whiteSpace: 'nowrap' }}>삭제</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </ResizableModal>
    {showReport && (
      <ReportBuilderModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        customer={editData ? { custNo: editData.custNo, name: formData.name || editData.name } : null}
      />
    )}
    </>
  );
};

export default CustomerModal;
