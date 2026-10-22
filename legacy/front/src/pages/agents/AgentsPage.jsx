import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { realestaterService } from '../../services/realestaterService';
import Card from '../../components/ui/Card';
import StaffModal from '../../components/agents/StaffModal';
import StaffMenuPermModal from '../../components/agents/StaffMenuPermModal';

const AgentsPage = () => {
  // 페이지 타이틀 설정
  useEffect(() => {
    document.title = '네오시스 - 중개인관리';
  }, []);

  const { user, office } = useAuthStore();
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [permStaff, setPermStaff] = useState(null); // 메뉴권한 설정 대상

  // 페이지 진입 시 사무실 정보 조회 및 직원 목록 조회
  useEffect(() => {
    const fetchOfficeAndStaff = async () => {
      if (!user?.userId) return;

      // office가 없으면 먼저 조회
      if (!office || !office.offNo) {
        try {
          const { officeService } = await import('../../services/officeService');
          const response = await officeService.getOfficeByUser(user.userId);
          if (response.success && response.data) {
            useAuthStore.getState().updateOffice(response.data);
            // office 정보를 가져온 후 직원 목록 조회
            fetchStaffList(response.data.offNo);
          } else {
            toast.error('사무실 정보를 먼저 등록해야 합니다.');
          }
        } catch (error) {
          console.error('사무실 정보 조회 실패:', error);
        }
      } else {
        fetchStaffList(office.offNo);
      }
    };

    fetchOfficeAndStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStaffList = async (officeNo) => {
    const offNo = officeNo || office?.offNo;

    if (!offNo) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await realestaterService.getList(null, offNo);
      if (response.success && response.data) {
        setStaffList(response.data.relaters || []);
      }
    } catch (error) {
      console.error('직원 목록 조회 실패:', error);
      toast.error('직원 목록 조회에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStaff = () => {
    if (!office || !office.offNo) {
      toast.error('사무실 정보를 먼저 등록해야 합니다.');
      return;
    }
    setSelectedStaff(null);
    setIsModalOpen(true);
  };

  const handleEditStaff = (staff) => {
    setSelectedStaff(staff);
    setIsModalOpen(true);
  };

  const handleDeleteStaff = async (staff) => {
    if (!window.confirm(`${staff.rtNm} 직원을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await realestaterService.delete(staff.rtNo, user?.userId);
      if (response.success) {
        toast.success('직원이 삭제되었습니다.');
        fetchStaffList();
      }
    } catch (error) {
      console.error('직원 삭제 실패:', error);
      toast.error(error.message || '직원 삭제에 실패했습니다.');
    }
  };

  const handleSaveStaff = async (staffData) => {
    try {
      let response;
      if (selectedStaff) {
        // 수정
        response = await realestaterService.update(selectedStaff.rtNo, {
          ...staffData,
          offNo: office.offNo,
        });
        toast.success('직원 정보가 수정되었습니다.');
      } else {
        // 신규 등록
        response = await realestaterService.create({
          ...staffData,
          offNo: office.offNo,
          userId: user?.userId,
        });
        toast.success('직원이 등록되었습니다.');
      }

      if (response.success) {
        setIsModalOpen(false);
        fetchStaffList();
      }
    } catch (error) {
      console.error('직원 저장 실패:', error);
      toast.error(error.message || '직원 저장에 실패했습니다.');
    }
  };

  const getRoleText = (rtType) => {
    const roleMap = {
      RTTYP01: '대표',
      RTTYP02: '직원',
      RTTYP03: '중개인',
      RTTYP04: '사무원',
    };
    return roleMap[rtType] || rtType;
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
            <button
              onClick={handleAddStaff}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4" />
              직원 추가
            </button>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">로딩 중...</p>
              </div>
            ) : staffList.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">등록된 직원이 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* 목록 테이블 최상단 굵은 테두리 — 물건관리 목록과 통일 */}
                <style>{`.list-topline thead tr:first-child th { border-top: 2px solid #94a3b8; }`}</style>
                <table className="min-w-full divide-y divide-gray-200 list-topline">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-[15px] font-semibold text-gray-700 uppercase tracking-wider">
                        이름
                      </th>
                      <th className="px-6 py-3 text-left text-[15px] font-semibold text-gray-700 uppercase tracking-wider">
                        구분
                      </th>
                      <th className="px-6 py-3 text-left text-[15px] font-semibold text-gray-700 uppercase tracking-wider">
                        전화번호
                      </th>
                      <th className="px-6 py-3 text-left text-[15px] font-semibold text-gray-700 uppercase tracking-wider">
                        등록번호
                      </th>
                      <th className="px-6 py-3 text-left text-[15px] font-semibold text-gray-700 uppercase tracking-wider">
                        아이디
                      </th>
                      <th className="px-6 py-3 text-right text-[15px] font-semibold text-gray-700 uppercase tracking-wider">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {staffList.map((staff) => (
                      <tr key={staff.rtNo} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {staff.rtNm}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              staff.rtType === 'RTTYP01'
                                ? 'bg-purple-100 text-purple-800'
                                : staff.rtType === 'RTTYP03'
                                ? 'bg-indigo-100 text-indigo-800'
                                : staff.rtType === 'RTTYP04'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {getRoleText(staff.rtType)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {staff.rtTel || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {staff.rtRegNo || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {staff.id || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setPermStaff(staff)}
                            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 mr-4 text-sm font-semibold"
                            title="메뉴 권한"
                          >
                            <Shield className="h-4 w-4" /> 메뉴권한
                          </button>
                          <button
                            onClick={() => handleEditStaff(staff)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            <Edit className="h-4 w-4 inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(staff)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        {isModalOpen && (
          <StaffModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveStaff}
            staff={selectedStaff}
          />
        )}

        {permStaff && (
          <StaffMenuPermModal
            rtNo={permStaff.rtNo}
            name={permStaff.rtNm}
            userId={user?.userId}
            onClose={() => setPermStaff(null)}
          />
        )}
    </div>
  );
};

export default AgentsPage;
