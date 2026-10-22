import React, { useState, useEffect } from 'react';
import { X, Pencil, Users, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { reportService } from '../../services/reportService';
import { customerService } from '../../services/customerService';
import { useAuthStore } from '../../stores/authStore';

/**
 * 보고서 관리 모달
 * - 내가 만든 보고서 목록
 * - 각 보고서: [수정](편집) / [고객공유](리스트에서 바로 고객 검색·공유)
 */
const ReportManageModal = ({ isOpen, onClose, onEdit }) => {
  const { user } = useAuthStore();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shareNo, setShareNo] = useState(null);      // 공유 패널 열린 보고서번호
  const [custKeyword, setCustKeyword] = useState('');
  const [custResults, setCustResults] = useState([]);
  const [selectedCusts, setSelectedCusts] = useState([]);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (isOpen) loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadReports = async () => {
    if (!user?.userId) return;
    setLoading(true);
    try {
      const res = await reportService.getByUser(user.userId);
      setReports(res?.data || []);
    } catch (e) {
      toast.error('보고서 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const openShare = (reportNo) => {
    setShareNo((cur) => (cur === reportNo ? null : reportNo));
    setCustKeyword(''); setCustResults([]); setSelectedCusts([]);
  };

  const searchCustomers = async () => {
    try {
      const res = await customerService.getList(null, custKeyword, null, null, null, null, 1, 50);
      setCustResults(res?.data?.customers || res?.data?.Customers || []);
    } catch (e) { toast.error('고객 검색 실패'); }
  };

  const toggleCust = (c) => {
    setSelectedCusts((prev) => prev.some((x) => x.custNo === c.custNo) ? prev.filter((x) => x.custNo !== c.custNo) : [...prev, c]);
  };

  const doShare = async (reportNo) => {
    if (selectedCusts.length === 0) { toast.error('공유할 고객을 선택하세요.'); return; }
    setSharing(true);
    try {
      await reportService.attachCustomers(reportNo, selectedCusts.map((c) => c.custNo), user?.userId);
      toast.success(`${selectedCusts.length}명에게 공유되었습니다.`);
      setShareNo(null); setSelectedCusts([]); setCustResults([]); setCustKeyword('');
      loadReports();
    } catch (e) {
      toast.error('고객 공유에 실패했습니다.');
    } finally {
      setSharing(false);
    }
  };

  const fmtDate = (d) => (d ? String(d).replace('T', ' ').slice(0, 16) : '-');

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '760px', maxWidth: '95vw', maxHeight: '85vh', background: 'white', borderRadius: '10px', boxShadow: '0 12px 32px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>보고서 관리 <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>({reports.length}건)</span></span>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
        </div>

        {/* 목록 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>
          ) : reports.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>작성한 보고서가 없습니다.</div>
          ) : (
            reports.map((r) => (
              <div key={r.reportNo} style={{ borderBottom: '1px solid #f1f5f9', padding: '8px 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title || `보고서 #${r.reportNo}`}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{fmtDate(r.regDt)} · 공유 {r.custCount ?? 0}명</div>
                  </div>
                  <button onClick={() => onEdit?.(r)} style={btn('#4f46e5')}><Pencil size={13} /> 수정</button>
                  <button onClick={() => openShare(r.reportNo)} style={btn(shareNo === r.reportNo ? '#0891b2' : '#15803d')}><Users size={13} /> 고객공유</button>
                </div>

                {/* 고객공유 인라인 패널 */}
                {shareNo === r.reportNo && (
                  <div style={{ marginTop: '8px', padding: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                      <input value={custKeyword} onChange={(e) => setCustKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchCustomers()} placeholder="고객명 검색" style={{ flex: 1, padding: '6px 8px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                      <button onClick={searchCustomers} style={{ padding: '6px 8px', border: '1px solid #cbd5e1', background: 'white', borderRadius: '4px', cursor: 'pointer' }}><Search size={14} /></button>
                    </div>
                    {selectedCusts.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                        {selectedCusts.map((c) => (
                          <span key={c.custNo} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: '11px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '10px', color: '#3730a3' }}>
                            {c.name}<button onClick={() => toggleCust(c)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6366f1' }}>✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ maxHeight: '140px', overflow: 'auto', border: custResults.length ? '1px solid #e2e8f0' : 'none', borderRadius: '4px' }}>
                      {custResults.map((c) => (
                        <div key={c.custNo} onClick={() => toggleCust(c)} style={{ padding: '6px 8px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: selectedCusts.some((x) => x.custNo === c.custNo) ? '#eef2ff' : 'white' }}>
                          {selectedCusts.some((x) => x.custNo === c.custNo) ? '✓ ' : ''}{c.name} · {c.tel || '-'}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '8px' }}>
                      <button onClick={() => setShareNo(null)} style={{ padding: '6px 12px', fontSize: '13px', border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', cursor: 'pointer', color: '#475569' }}>취소</button>
                      <button onClick={() => doShare(r.reportNo)} disabled={sharing} style={btn('#15803d')}>{sharing ? '공유 중...' : `공유 (${selectedCusts.length})`}</button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const btn = (bg) => ({ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', fontSize: '13px', fontWeight: 600, background: bg, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' });

export default ReportManageModal;
