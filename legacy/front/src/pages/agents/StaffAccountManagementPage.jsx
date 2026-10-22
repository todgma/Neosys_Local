import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { realestaterService } from '../../services/realestaterService';
import StaffModal from '../../components/agents/StaffModal';
import StaffMenuPermModal from '../../components/agents/StaffMenuPermModal';

const RT_TYPE_LABEL = { RTTYP01: '대표', RTTYP02: '소속공인중개사', RTTYP03: '중개보조원', RTTYP04: '기타' };
const fmtDate = (v) => (v ? String(v).split('T')[0] : '-');

/**
 * 직원계정관리 — 물건관리처럼 목록(테이블) UI.
 *  - 직원 추가/수정(아이디·이름·비번·직급·이메일·입사일·퇴사일·비고) + 메뉴권한 부여
 *  - rt_realtor_info(off_no 소속) 백엔드 연동
 */
export default function StaffAccountManagementPage() {
  const { user, office } = useAuthStore();
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [permStaff, setPermStaff] = useState(null);
  const [offNo, setOffNo] = useState(office?.offNo || null);

  useEffect(() => { document.title = '네오시스 - 직원계정관리'; }, []);

  useEffect(() => {
    (async () => {
      if (!user?.userId) return;
      let off = office?.offNo;
      if (!off) {
        try {
          const { officeService } = await import('../../services/officeService');
          const res = await officeService.getOfficeByUser(user.userId);
          if (res.success && res.data) { useAuthStore.getState().updateOffice(res.data); off = res.data.offNo; }
        } catch (e) { console.error('사무실 정보 조회 실패:', e); }
      }
      if (off) { setOffNo(off); fetchStaffList(off); }
      else toast.error('사무실 정보를 먼저 등록해야 합니다.');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStaffList = async (officeNo) => {
    const off = officeNo || offNo || office?.offNo;
    if (!off) return;
    setIsLoading(true);
    try {
      const res = await realestaterService.getList(null, off);
      if (res.success && res.data) setStaffList(res.data.relaters || res.data.Relaters || []);
    } catch (e) { console.error('직원 목록 조회 실패:', e); toast.error('직원 목록 조회에 실패했습니다.'); }
    finally { setIsLoading(false); }
  };

  const handleAdd = () => {
    if (!offNo && !office?.offNo) { toast.error('사무실 정보를 먼저 등록해야 합니다.'); return; }
    setSelectedStaff(null); setIsModalOpen(true);
  };
  const handleEdit = (staff) => { setSelectedStaff(staff); setIsModalOpen(true); };
  const handleDelete = async (staff) => {
    if (!window.confirm(`${staff.rtNm || ''} 직원을 삭제하시겠습니까?`)) return;
    try {
      const res = await realestaterService.delete(staff.rtNo, user?.userId);
      if (res.success) { toast.success('직원이 삭제되었습니다.'); fetchStaffList(); }
    } catch (e) { toast.error(e.message || '직원 삭제에 실패했습니다.'); }
  };
  const handleSave = async (staffData) => {
    try {
      const payload = { ...staffData, offNo: offNo || office?.offNo, userId: user?.userId };
      const res = selectedStaff
        ? await realestaterService.update(selectedStaff.rtNo, payload)
        : await realestaterService.create(payload);
      if (res.success) { toast.success(selectedStaff ? '직원 정보가 수정되었습니다.' : '직원이 등록되었습니다.'); setIsModalOpen(false); fetchStaffList(); }
    } catch (e) { toast.error(e.message || '직원 저장에 실패했습니다.'); }
  };

  const th = { padding: '10px 12px', fontSize: '14px', fontWeight: 700, color: '#111827', background: '#f8fafc', borderBottom: '2px solid #000', whiteSpace: 'nowrap', textAlign: 'center' };
  const td = { padding: '9px 12px', fontSize: '14px', fontWeight: 600, color: '#111827', borderBottom: '1px solid #e5e7eb', textAlign: 'center', whiteSpace: 'nowrap' };

  // 대표자(RTTYP01) 정보는 상단에 별도 표기, 목록에는 자기 자신(로그인 계정) 제외
  const selfRtNo = String(user?.rtNo ?? '');
  const selfId = String(user?.userId ?? user?.id ?? '');
  const repRow = staffList.find((s) => (s.rtType || '') === 'RTTYP01') || null;
  const visibleStaff = staffList.filter((s) => String(s.rtNo) !== selfRtNo && String(s.id) !== selfId);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      {/* 상단 툴바 */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>

        <button onClick={handleAdd}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '38px', padding: '0 16px', fontSize: '14px', fontWeight: 700, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          <Plus className="w-4 h-4" /> 직원 추가
        </button>
      </div>

      {/* 대표자 정보 (자기 자신은 목록에서 제외되므로 상단에 별도 표기) */}
      {repRow && (
        <div style={{ flexShrink: 0, margin: '0 16px 12px', padding: '12px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#4f46e5' }}>대표자</span>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>{repRow.rtNm || '-'}</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>아이디 <b style={{ color: '#111827' }}>{repRow.id || '-'}</b></span>
          {repRow.rtTel && <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>전화 <b style={{ color: '#111827' }}>{repRow.rtTel}</b></span>}
          {repRow.email && <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>이메일 <b style={{ color: '#111827' }}>{repRow.email}</b></span>}
        </div>
      )}

      {/* 목록 테이블 (자기 자신 제외한 소속직원) */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', margin: '0 16px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th style={th}>아이디</th>
              <th style={th}>이름</th>
              <th style={th}>구분</th>
              <th style={th}>직급</th>
              <th style={th}>이메일</th>
              <th style={th}>전화번호</th>
              <th style={th}>입사일</th>
              <th style={th}>퇴사일</th>
              <th style={{ ...th, textAlign: 'left' }}>비고</th>
              <th style={th}>관리</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} style={{ ...td, padding: '40px', color: '#94a3b8' }}>불러오는 중…</td></tr>
            ) : visibleStaff.length === 0 ? (
              <tr><td colSpan={10} style={{ ...td, padding: '40px', color: '#94a3b8' }}>등록된 소속직원이 없습니다. 우측 상단 <b>직원 추가</b>로 등록하세요.</td></tr>
            ) : visibleStaff.map((s) => (
              <tr key={s.rtNo} style={{ cursor: 'pointer' }} onClick={() => handleEdit(s)}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}>
                <td style={td}>{s.id || '-'}</td>
                <td style={{ ...td, fontWeight: 800 }}>{s.rtNm || '-'}</td>
                <td style={td}>{RT_TYPE_LABEL[s.rtType] || s.rtType || '-'}</td>
                <td style={td}>{s.grade || '-'}</td>
                <td style={td}>{s.email || '-'}</td>
                <td style={td}>{s.rtTel || '-'}</td>
                <td style={td}>{fmtDate(s.joinDate)}</td>
                <td style={td}>{fmtDate(s.leaveDate)}</td>
                <td style={{ ...td, textAlign: 'left', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.note || ''}>{s.note || '-'}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setPermStaff(s)} title="메뉴 권한"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '4px 8px', fontSize: '13px', fontWeight: 700, color: '#059669', background: 'white', border: '1px solid #a7f3d0', borderRadius: '5px', cursor: 'pointer', marginRight: '4px' }}>
                    <Shield className="w-3.5 h-3.5" /> 메뉴권한
                  </button>
                  <button onClick={() => handleEdit(s)} title="수정"
                    style={{ padding: '4px 8px', fontSize: '13px', fontWeight: 700, color: '#4f46e5', background: 'white', border: '1px solid #c7d2fe', borderRadius: '5px', cursor: 'pointer', marginRight: '4px' }}>
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(s)} title="삭제"
                    style={{ padding: '4px 8px', fontSize: '13px', fontWeight: 700, color: '#dc2626', background: 'white', border: '1px solid #fecaca', borderRadius: '5px', cursor: 'pointer' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <StaffModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} staff={selectedStaff} />
      )}
      {permStaff && (
        <StaffMenuPermModal rtNo={permStaff.rtNo} name={permStaff.rtNm} userId={user?.userId} onClose={() => setPermStaff(null)} />
      )}
    </div>
  );
}
