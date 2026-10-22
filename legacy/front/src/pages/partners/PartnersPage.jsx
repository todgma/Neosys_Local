import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { vendorService } from '../../services/vendorService';
import PropertyListTable from '../../components/properties/PropertyListTable';
import VendorModal from '../../components/partners/VendorModal';
import VendorRegionModal from '../../components/partners/VendorRegionModal';
import { PARTNER_CATEGORY_GRID, categoryTwoLine } from '../../constants/partnerCategories';

const PartnersPage = () => {
  // 페이지 타이틀 설정
  useEffect(() => {
    document.title = '네오시스 - 협력업체관리';
  }, []);

  const { user, office } = useAuthStore();
  const [vendorList, setVendorList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedVendorIds, setSelectedVendorIds] = useState([]); // 선택(체크) — 단일선택
  const [colorFillRequest, setColorFillRequest] = useState(null);  // 색 채우기 요청 {seq, ids, color}
  const [selectedCategories, setSelectedCategories] = useState([]); // 상단 분류 버튼(복수선택)
  const [onlyWithConsult, setOnlyWithConsult] = useState(false);     // 상담이력 있는 업체만 보기
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // 페이지 진입 시 사무실 정보 조회 및 협력업체 목록 조회
  useEffect(() => {
    const fetchOfficeAndVendors = async () => {
      if (!user?.userId) return;

      // office가 없으면 먼저 조회
      if (!office || !office.offNo) {
        try {
          const { officeService } = await import('../../services/officeService');
          const response = await officeService.getOfficeByUser(user.userId);
          if (response.success && response.data) {
            useAuthStore.getState().updateOffice(response.data);
            // office 정보를 가져온 후 협력업체 목록 조회
            fetchVendorList(response.data.offNo);
          } else {
            toast.error('사무실 정보를 먼저 등록해야 합니다.');
          }
        } catch (error) {
          console.error('사무실 정보 조회 실패:', error);
        }
      } else {
        fetchVendorList(office.offNo);
      }
    };

    fetchOfficeAndVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchVendorList = async (officeNo) => {
    const offNo = officeNo || office?.offNo;

    if (!offNo) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await vendorService.getVendorList(
        null,
        offNo,
        null,
        currentPage,
        rowsPerPage
      );
      if (response.success && response.data) {
        setVendorList(response.data.vendors || []);
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (error) {
      console.error('협력업체 목록 조회 실패:', error);
      toast.error('협력업체 목록 조회에 실패했습니다.');
      setVendorList([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 별도 창(vendor-form)에서 저장 성공 시 목록 갱신
  useEffect(() => {
    if (!window.electronAPI?.modal?.on) return;
    const off = window.electronAPI.modal.on('success', ({ type }) => {
      if (type === 'vendor-form') fetchVendorList();
    });
    return () => { off && off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 등록/수정 창 — 물건등록처럼 별도 새 창(Electron), 실패 시 인페이지 모달 폴백
  const openVendorWindow = async (editData) => {
    if (window.electronAPI?.modal?.open) {
      try {
        await window.electronAPI.modal.open({
          type: 'vendor-form',
          data: { title: editData?.vendorId ? `협력업체 수정 - ${editData.vendorName || ''}` : '협력업체 등록', editData: editData || null },
          width: 1080, height: 840, minWidth: 900, minHeight: 640, resizable: true,
        });
        return;
      } catch (e) { console.error('협력업체 창 열기 실패:', e); }
    }
    setSelectedVendor(editData || null);
    setIsModalOpen(true);
  };

  const handleEditVendor = (vendor) => openVendorWindow(vendor);
  // 1회 클릭 = 선택(체크) 토글(단일선택), 2회 클릭 = 수정창
  const handleSelectVendor = (vendor) => setSelectedVendorIds((prev) => (prev.includes(vendor.vendorId) ? [] : [vendor.vendorId]));

  const handleManageRegions = (vendor) => {
    setSelectedVendor(vendor);
    setIsRegionModalOpen(true);
  };

  // 저장 후 신규/기존 vendorId 반환 → VendorModal이 상담이력 저장에 사용(닫기는 모달이 onClose로 처리)
  const handleSaveVendor = async (vendorData) => {
    try {
      if (selectedVendor) {
        // 수정
        const response = await vendorService.updateVendor(selectedVendor.vendorId, {
          ...vendorData,
          offNo: office.offNo,
          rtNo: user?.rtNo,
          userId: user?.userId,
        });
        if (response.success) {
          toast.success('협력업체 정보가 수정되었습니다.');
          fetchVendorList();
          return selectedVendor.vendorId;
        }
      } else {
        // 등록
        const response = await vendorService.createVendor({
          ...vendorData,
          offNo: office.offNo,
          rtNo: user?.rtNo,
          userId: user?.userId,
        });
        if (response.success) {
          toast.success('협력업체가 등록되었습니다.');
          fetchVendorList();
          return response.vendorId || null;
        }
      }
    } catch (error) {
      console.error('협력업체 저장 실패:', error);
      toast.error(error.message || '협력업체 저장에 실패했습니다.');
    }
    return null;
  };

  const getUseYnText = (useYn) => {
    return useYn === 'Y' ? '사용' : '미사용';
  };

  const getCategoryText = (category1, category2, category3) => {
    const categories = [category1, category2, category3].filter(Boolean);
    return categories.join(' > ') || '-';
  };

  // 테이블 컬럼 정의 (한 칼럼에 한 항목씩)
  const partnerColumns = [
    { key: 'select', label: '선택', width: 56, noRowClick: true },
    { key: 'category', label: '분류', width: 150 },
    { key: 'vendorName', label: '상호', width: 180 },
    { key: 'region', label: '영업지역', width: 150, noRowClick: true },
    { key: 'officeTel', label: '사무소 번호', width: 130 },
    { key: 'ceoName', label: '대표자명', width: 110 },
    { key: 'ceoPhone', label: '대표님 번호', width: 130 },
    { key: 'managerName', label: '담당자명', width: 110 },
    { key: 'managerPhone', label: '담당자 번호', width: 130 },
    { key: 'productDesc', label: '상품설명', width: 220 },
    { key: 'soji', label: '소재지', width: 240 },
    { key: 'consultationNote', label: '상담내용', width: 220 },
  ];

  // 테이블 셀 렌더링
  const renderTableCell = (vendor, column) => {
    switch (column.key) {
      case 'select':
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }} onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selectedVendorIds.includes(vendor.vendorId)}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => { e.stopPropagation(); setSelectedVendorIds(e.target.checked ? [vendor.vendorId] : []); }}
              className="w-4 h-4 cursor-pointer"
            />
          </div>
        );
      case 'category':
        return <div style={{ fontSize: '14px', textAlign: 'center' }}>{getCategoryText(vendor.category1, vendor.category2, vendor.category3)}</div>;
      case 'vendorName':
        return <div style={{ fontSize: '14px', fontWeight: 600, textAlign: 'center' }}>{vendor.vendorName || '-'}</div>;
      case 'soji':
        return <div style={{ fontSize: '14px', textAlign: 'center' }}>{[vendor.addr1, vendor.addr2, vendor.addr3, vendor.detailAddress].filter(Boolean).join(' ') || '-'}</div>;
      case 'region': {
        // 영업지역: 첫 지역 + "외 N곳" (고객 희망지역과 동일 표기)
        const arr = (vendor.businessRegion
          ? String(vendor.businessRegion).split(',')
          : (vendor.businessAreas || []).map((a) => a.regionName || [a.addr1, a.addr2, a.addr3].filter(Boolean).join(' '))
        ).map((s) => (typeof s === 'string' ? s.trim() : s)).filter(Boolean);
        const text = arr.length === 0 ? '-' : arr.length === 1 ? arr[0] : `${arr[0]} 외 ${arr.length - 1}곳`;
        return <div style={{ fontSize: '14px', textAlign: 'center' }}>{text}</div>;
      }
      case 'officeTel':
        return <div style={{ fontSize: '14px', textAlign: 'center' }}>{vendor.managerTel || '-'}</div>;
      case 'ceoName':
        return <div style={{ fontSize: '14px', textAlign: 'center' }}>{vendor.ceoName || '-'}</div>;
      case 'ceoPhone':
        return <div style={{ fontSize: '14px', textAlign: 'center' }}>{vendor.ceoPhone || '-'}</div>;
      case 'managerName':
        return <div style={{ fontSize: '14px', textAlign: 'center' }}>{vendor.managerName || '-'}</div>;
      case 'managerPhone':
        return <div style={{ fontSize: '14px', textAlign: 'center' }}>{vendor.managerPhone || '-'}</div>;
      case 'productDesc':
        return <div style={{ fontSize: '14px', textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word' }}>{vendor.productDesc || '-'}</div>;
      case 'consultationNote':
        return <div style={{ fontSize: '14px', textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word' }}>{vendor.consultationNote || '-'}</div>;
      default:
        return vendor[column.key] || '-';
    }
  };

  // 페이지 변경 핸들러
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // 신규 등록 / 수정 / 삭제 / 색 채우기 (물건관리 툴바와 동일)
  const handleAddVendor = () => openVendorWindow(null);
  const handleEditSelected = () => {
    if (selectedVendorIds.length === 0) { toast.error('수정할 업체를 선택하세요.'); return; }
    const v = vendorList.find((x) => selectedVendorIds.includes(x.vendorId));
    if (v) openVendorWindow(v); else toast.error('선택한 업체를 찾을 수 없습니다.');
  };
  const handleDeleteSelected = async () => {
    if (selectedVendorIds.length === 0) { toast.error('삭제할 업체를 선택하세요.'); return; }
    const v = vendorList.find((x) => selectedVendorIds.includes(x.vendorId));
    if (!v) return;
    if (!window.confirm(`${v.vendorName} 협력업체를 삭제하시겠습니까?`)) return;
    try {
      const response = await vendorService.deleteVendor(v.vendorId, user?.userId);
      if (response.success) { toast.success('협력업체가 삭제되었습니다.'); setSelectedVendorIds([]); fetchVendorList(); }
    } catch (error) {
      console.error('협력업체 삭제 실패:', error);
      toast.error(error.message || '협력업체 삭제에 실패했습니다.');
    }
  };
  const handleColorFill = (color) => {
    if (selectedVendorIds.length === 0) { toast.error('색을 채울 업체를 선택하세요.'); return; }
    setColorFillRequest({ seq: Date.now(), ids: [...selectedVendorIds], color });
  };

  // 분류 버튼 토글(복수선택)
  const toggleCategory = (label) => {
    setSelectedCategories((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]));
  };

  // 분류 필터 매칭 — 버튼 라벨('A | B')의 각 항목을 업체 분류(category1~3)와 대조
  const matchCategory = (vendor, label) => {
    const parts = label.split('|').map((s) => s.trim()).filter(Boolean);
    const cats = [vendor.category1, vendor.category2, vendor.category3].filter(Boolean);
    return parts.some((p) => cats.some((c) => c.includes(p) || p.includes(c)));
  };

  // 분류 버튼 + 상담이력 필터 적용된 목록
  let filteredVendorList = selectedCategories.length === 0
    ? vendorList
    : vendorList.filter((v) => selectedCategories.some((label) => matchCategory(v, label)));
  if (onlyWithConsult) filteredVendorList = filteredVendorList.filter((v) => (v.consultCnt ?? 0) > 0);

  // 테이블 데이터 준비 (고유 id 추가 — 색 채우기 매칭 키)
  const tableData = filteredVendorList.map((vendor) => ({
    ...vendor,
    id: vendor.vendorId,
  }));

  const catBtnStyle = (active, prep, span) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    ...(span ? { gridColumn: `span ${span}` } : {}),
    minHeight: '28px', padding: '3px 4px', fontSize: '14px', fontWeight: active ? 700 : 600,
    border: `1px solid ${active ? '#4f46e5' : (prep ? '#fca5a5' : '#93a3f4')}`,
    borderRadius: '4px',
    backgroundColor: active ? '#4f46e5' : 'white',
    color: active ? 'white' : (prep ? '#dc2626' : '#1f2937'),
    cursor: 'pointer', whiteSpace: 'pre-line', wordBreak: 'keep-all', lineHeight: 1.25,
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f9fafb' }}>
      {/* 상단 분류 버튼 (3줄 × 12칸, 복수선택) */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '5px' }}>
          {PARTNER_CATEGORY_GRID.map((c, i) => (
            c ? (
              <button
                key={c.label}
                type="button"
                onClick={() => (c.prep ? toast('준비 중입니다.') : toggleCategory(c.label))}
                style={catBtnStyle(!c.prep && selectedCategories.includes(c.label), c.prep, c.span)}
              >
                {categoryTwoLine(c.label)}
              </button>
            ) : (
              <div key={`empty-${i}`} style={{ minHeight: '28px', border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: '#fafafa' }} />
            )
          ))}
        </div>
        {selectedCategories.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button type="button" onClick={() => setSelectedCategories([])}
              style={{ padding: '5px 12px', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              전체해제
            </button>
          </div>
        )}
      </div>
      <div className="partners-grid" style={{ flex: 1, minHeight: 0, padding: '8px' }}>
        {/* 협력업체 목록: 헤더/데이터셀 폰트 14px 통일 (공유 prop-list-grid 11px 규칙 덮어씀) */}
        <style>{`
          .partners-grid .prop-list-grid td,
          .partners-grid .prop-list-grid td div,
          .partners-grid .prop-list-grid td span { font-size: 14px !important; }
          /* 헤더: 배경 #fafafa + 폰트 14px (물건관리와 동일) */
          .partners-grid .prop-list-grid thead th,
          .partners-grid .prop-list-grid thead th * { font-size: 14px !important; }
          .partners-grid .prop-list-grid thead th { background-color: #fafafa !important; }
          /* 헤더 높이 고정 = 총 50px (1줄=50px, 2줄 subHeader=각 25px → 100px 방지) */
          .partners-grid .prop-list-grid thead tr:only-child th { height: 50px !important; max-height: 50px !important; }
          .partners-grid .prop-list-grid thead tr:not(:only-child) { height: 25px !important; }
          .partners-grid .prop-list-grid thead tr:not(:only-child) th { height: 25px !important; max-height: 25px !important; }
          /* 데이터 셀 세로 여백(행 높이) */
          .partners-grid .prop-list-grid td { padding-top: 6px !important; padding-bottom: 6px !important; }
        `}</style>
        <PropertyListTable
          menuId="partners"
          allColumns={partnerColumns}
          defaultColumns={partnerColumns}
          data={tableData}
          isLoading={isLoading}
          renderCell={renderTableCell}
          onRowClick={handleEditVendor}
          onRowSelect={handleSelectVendor}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={rowsPerPage}
          onPageChange={handlePageChange}
          onAddPropertyV2={handleAddVendor}
          onEditSelected={handleEditSelected}
          onDeleteSelected={handleDeleteSelected}
          onColorFill={handleColorFill}
          colorFillRequest={colorFillRequest}
          selectedCount={selectedVendorIds.length}
          fixedColumns
          fluidWidth
          emptyMessage="등록된 협력업체가 없습니다."
          leftContent={
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={onlyWithConsult} onChange={(e) => setOnlyWithConsult(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
              상담이력 있는 업체보기
            </label>
          }
        />
      </div>

      {isModalOpen && (
        <VendorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveVendor}
          vendor={selectedVendor}
        />
      )}

      {isRegionModalOpen && (
        <VendorRegionModal
          isOpen={isRegionModalOpen}
          onClose={() => setIsRegionModalOpen(false)}
          vendor={selectedVendor}
        />
      )}
    </div>
  );
};

export default PartnersPage;
