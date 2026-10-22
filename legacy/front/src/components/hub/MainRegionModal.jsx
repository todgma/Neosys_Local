import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import addressService from '../../services/common/addressService';
import hubService from '../../services/hubService';

/**
 * 주거래지역 설정 모달
 *  - 공동중개망에서 "주거래지역" 체크 시, 여기서 설정한 지역의 물건만 조회됨.
 *  - 소유 단위: 개인(rt_no) 기준 (off_no 병행 저장)
 *  - 최하위 '리'까지 법정동 코드(bjd_code)로 저장, 복수 등록 가능.
 * props:
 *  - isOpen, onClose
 *  - mode: 'view' | 'edit'  (view는 읽기전용, edit는 추가/삭제 가능)
 *  - offNo, rtNo
 *  - onChanged: 목록 변경 시 콜백 (부모 필터 갱신용)
 */
const MainRegionModal = ({ isOpen, onClose, mode = 'edit', offNo, rtNo, onChanged, items, onAdd, onRemove, title }) => {
  const editable = mode === 'edit';
  // 로컬 모드: 서버 주거래지역 대신 items/onAdd/onRemove 로 동작(예: 고객폼 구입희망지역)
  const localMode = typeof onAdd === 'function';
  const [serverRegions, setServerRegions] = useState([]);
  const regions = localMode ? (items || []) : serverRegions;
  const [loading, setLoading] = useState(false);

  // 지역 선택 드롭다운 상태
  const [sidoList, setSidoList] = useState([]);
  const [sigunguList, setSigunguList] = useState([]);
  const [emdList, setEmdList] = useState([]);
  const [riList, setRiList] = useState([]);
  const [sel, setSel] = useState({ sido: '', sigungu: '', emd: '', ri: '' });
  const [names, setNames] = useState({ sido: '', sigungu: '', emd: '', ri: '' });

  const loadRegions = useCallback(async () => {
    if (localMode) return;
    setLoading(true);
    try {
      const res = await hubService.getMainRegions({ offNo, rtNo });
      setServerRegions(res.data || []);
    } catch (e) {
      // showError already handled
    } finally {
      setLoading(false);
    }
  }, [offNo, rtNo, localMode]);

  useEffect(() => {
    if (!isOpen) return;
    loadRegions();
    addressService.getSidoList().then((d) => setSidoList(d || [])).catch(() => {});
    setSel({ sido: '', sigungu: '', emd: '', ri: '' });
    setNames({ sido: '', sigungu: '', emd: '', ri: '' });
    setSigunguList([]); setEmdList([]); setRiList([]);
  }, [isOpen, loadRegions]);

  if (!isOpen) return null;

  const onSido = async (code) => {
    const nm = sidoList.find((x) => x.bjdCode === code)?.bjdName || '';
    setSel({ sido: code, sigungu: '', emd: '', ri: '' });
    setNames({ sido: nm, sigungu: '', emd: '', ri: '' });
    setSigunguList([]); setEmdList([]); setRiList([]);
    if (code) setSigunguList((await addressService.getSigunguList(code)) || []);
  };
  const onSigungu = async (code) => {
    const nm = sigunguList.find((x) => x.bjdCode === code)?.bjdName || '';
    setSel((s) => ({ ...s, sigungu: code, emd: '', ri: '' }));
    setNames((n) => ({ ...n, sigungu: nm, emd: '', ri: '' }));
    setEmdList([]); setRiList([]);
    if (code) setEmdList((await addressService.getEupMyeonDongList(code)) || []);
  };
  const onEmd = async (code) => {
    const nm = emdList.find((x) => x.bjdCode === code)?.bjdName || '';
    setSel((s) => ({ ...s, emd: code, ri: '' }));
    setNames((n) => ({ ...n, emd: nm, ri: '' }));
    setRiList([]);
    if (code) {
      try { setRiList((await addressService.getRiList(code)) || []); } catch { setRiList([]); }
    }
  };
  const onRi = (code) => {
    const nm = riList.find((x) => x.bjdCode === code)?.bjdName || '';
    setSel((s) => ({ ...s, ri: code }));
    setNames((n) => ({ ...n, ri: nm }));
  };

  const handleAdd = async () => {
    // 최하위 선택 코드 = 리 > 읍면동 (시군구/시도만으로는 등록 불가)
    const bjdCode = sel.ri || sel.emd;
    if (!bjdCode) { toast.error('읍/면/동까지 선택해 주세요.'); return; }
    const regionName = [names.sido, names.sigungu, names.emd, names.ri].filter(Boolean).join(' ');
    if (localMode) {
      onAdd({ bjdCode, regionName, addr1: names.sido, addr2: names.sigungu, addr3: [names.emd, names.ri].filter(Boolean).join(' ') });
      setSel({ sido: '', sigungu: '', emd: '', ri: '' });
      setNames({ sido: '', sigungu: '', emd: '', ri: '' });
      setSigunguList([]); setEmdList([]); setRiList([]);
      return;
    }
    try {
      await hubService.addMainRegion({ offNo, rtNo, bjdCode, regionName, regId: rtNo });
      toast.success('주거래지역이 추가되었습니다.');
      setSel({ sido: '', sigungu: '', emd: '', ri: '' });
      setNames({ sido: '', sigungu: '', emd: '', ri: '' });
      setSigunguList([]); setEmdList([]); setRiList([]);
      await loadRegions();
      onChanged?.();
    } catch (e) { /* handled */ }
  };

  const handleDelete = async (regionId) => {
    try {
      await hubService.deleteMainRegion(regionId);
      await loadRegions();
      onChanged?.();
    } catch (e) { /* handled */ }
  };

  const SELECT = { minWidth: '110px', padding: '5px 6px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}>
      <div style={{ width: '560px', maxHeight: '80vh', background: 'white', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
            {title || '주거래지역'} {editable ? '편집' : '보기'}
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>

        {/* 지역 추가 (편집 모드) */}
        {editable && (
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>지역 추가</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <select value={sel.sido} onChange={(e) => onSido(e.target.value)} style={SELECT}>
                <option value="">시/도</option>
                {sidoList.map((x) => (<option key={x.bjdCode} value={x.bjdCode}>{x.bjdName}</option>))}
              </select>
              <select value={sel.sigungu} onChange={(e) => onSigungu(e.target.value)} disabled={!sel.sido} style={SELECT}>
                <option value="">시/군/구</option>
                {sigunguList.map((x) => (<option key={x.bjdCode} value={x.bjdCode}>{x.bjdName}</option>))}
              </select>
              <select value={sel.emd} onChange={(e) => onEmd(e.target.value)} disabled={!sel.sigungu} style={SELECT}>
                <option value="">읍/면/동</option>
                {emdList.map((x) => (<option key={x.bjdCode} value={x.bjdCode}>{x.bjdName}</option>))}
              </select>
              {riList.length > 0 && (
                <select value={sel.ri} onChange={(e) => onRi(e.target.value)} disabled={!sel.emd} style={SELECT}>
                  <option value="">리</option>
                  {riList.map((x) => (<option key={x.bjdCode} value={x.bjdCode}>{x.bjdName}</option>))}
                </select>
              )}
              <button onClick={handleAdd}
                style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 600, color: 'white', background: '#6366f1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                추가
              </button>
            </div>
          </div>
        )}

        {/* 저장된 지역 목록 */}
        <div style={{ padding: '14px 18px', overflowY: 'auto', flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
            설정된 {title || '주거래지역'} ({regions.length})
          </div>
          {loading ? (
            <div style={{ fontSize: '13px', color: '#9ca3af', padding: '20px 0', textAlign: 'center' }}>불러오는 중...</div>
          ) : regions.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#9ca3af', padding: '20px 0', textAlign: 'center' }}>설정된 지역이 없습니다.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {regions.map((r, idx) => (
                <div key={localMode ? idx : r.regionId}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '16px', fontSize: '13px', color: '#3730a3' }}>
                  <span>{r.regionName || [r.addr1, r.addr2, r.addr3, r.bldNm].filter(Boolean).join(' ') || r.bjdCode}</span>
                  {editable && (
                    <button onClick={() => (localMode ? onRemove(idx) : handleDelete(r.regionId))}
                      style={{ border: 'none', background: 'transparent', color: '#6366f1', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 18px', borderTop: '1px solid #e5e7eb' }}>
          <button onClick={onClose}
            style={{ padding: '7px 18px', fontSize: '13px', fontWeight: 600, color: '#374151', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default MainRegionModal;
