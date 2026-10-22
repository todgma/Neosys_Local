import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { realestaterService } from '../../services/realestaterService';
import { menuService } from '../../services/menuService';
import Card from '../../components/ui/Card';

const StaffPermissionPage = () => {
  const { user, office } = useAuthStore();
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [menuList, setMenuList] = useState([]);
  const [menuPermissions, setMenuPermissions] = useState([]);
  const [hasExistingPermissions, setHasExistingPermissions] = useState(false); // 기존 권한 존재 여부
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  // 페이지 진입 시 직원 목록 조회
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

  // 직원 목록 조회
  const fetchStaffList = async (officeNo) => {
    const offNo = officeNo || office?.offNo;

    if (!offNo) {
      return;
    }

    setIsLoadingStaff(true);
    try {
      const response = await realestaterService.getList(null, offNo);
      if (response.success && response.data) {
        setStaffList(response.data.relaters || []);
      }
    } catch (error) {
      console.error('직원 목록 조회 실패:', error);
      toast.error('직원 목록 조회에 실패했습니다.');
    } finally {
      setIsLoadingStaff(false);
    }
  };

  // 전체 메뉴 목록 조회
  const fetchMenuList = async () => {
    setIsLoadingMenu(true);
    try {
      const response = await menuService.getMenuList();
      if (response.success && response.data) {
        setMenuList(response.data.menus || []);
      }
    } catch (error) {
      console.error('메뉴 목록 조회 실패:', error);
      toast.error('메뉴 목록 조회에 실패했습니다.');
    } finally {
      setIsLoadingMenu(false);
    }
  };

  // 선택된 직원의 메뉴 권한 조회
  const fetchMenuPermissions = async (rtNo) => {
    setIsLoadingMenu(true);
    try {
      const response = await menuService.getMenuListByRtNo(rtNo);
      if (response.success && response.data) {
        const permissions = response.data.menusRt || [];
        setMenuPermissions(permissions);
        // 권한이 있는지 확인 (빈 배열이면 신규, 데이터가 있으면 기존)
        setHasExistingPermissions(permissions.length > 0);
      }
    } catch (error) {
      console.error('메뉴 권한 조회 실패:', error);
      // NOT_FOUND 에러가 아닌 경우에만 에러 메시지 표시 (NOT_FOUND는 이미 apiHandler에서 처리됨)
      if (error.code !== 'NOT_FOUND') {
        toast.error('메뉴 권한 조회에 실패했습니다.');
      }
      // NOT_FOUND인 경우 신규 등록으로 처리
      setMenuPermissions([]);
      setHasExistingPermissions(false);
    } finally {
      setIsLoadingMenu(false);
    }
  };

  // 직원 선택 시
  const handleStaffSelect = async (staff) => {
    setSelectedStaff(staff);
    setShowPermissionModal(true);
    await Promise.all([fetchMenuList(), fetchMenuPermissions(staff.rtNo)]);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowPermissionModal(false);
    setSelectedStaff(null);
    setMenuList([]);
    setMenuPermissions([]);
  };

  // 권한 체크박스 변경
  const handlePermissionChange = (menuId, permissionType, value) => {
    setMenuPermissions((prev) => {
      const existing = prev.find((p) => p.id === menuId);
      if (existing) {
        return prev.map((p) =>
          p.id === menuId ? { ...p, [permissionType]: value ? 'Y' : 'N' } : p
        );
      } else {
        return [
          ...prev,
          {
            rtNo: selectedStaff.rtNo,
            id: menuId,
            cYn: permissionType === 'cYn' ? 'Y' : 'N',
            rYn: permissionType === 'rYn' ? 'Y' : 'N',
            uYn: permissionType === 'uYn' ? 'Y' : 'N',
            dYn: permissionType === 'dYn' ? 'Y' : 'N',
            useYn: 'Y',
          },
        ];
      }
    });
  };

  // 권한 저장
  const handleSavePermissions = async () => {
    if (!selectedStaff) {
      toast.error('직원을 선택해주세요.');
      return;
    }

    if (!menuPermissions || menuPermissions.length === 0) {
      toast.error('저장할 권한 설정이 없습니다.');
      return;
    }

    try {
      let response;
      // hasExistingPermissions 상태로 신규/수정 구분
      if (hasExistingPermissions) {
        // 수정
        response = await menuService.updateMenuPermissions(
          selectedStaff.rtNo,
          menuPermissions,
          user?.userId
        );
      } else {
        // 등록
        response = await menuService.createMenuPermissions(
          selectedStaff.rtNo,
          menuPermissions,
          user?.userId
        );
      }

      if (response.success) {
        toast.success('메뉴 권한이 저장되었습니다.');
        // 저장 후 모달 닫기
        handleCloseModal();
      }
    } catch (error) {
      console.error('권한 저장 실패:', error);
      toast.error(error.message || '권한 저장에 실패했습니다.');
    }
  };

  // 권한 초기화
  const handleResetPermissions = () => {
    if (!selectedStaff) return;
    fetchMenuPermissions(selectedStaff.rtNo);
    toast.success('권한 설정이 초기화되었습니다.');
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

  // 메뉴별 권한 가져오기
  const getMenuPermission = (menuId) => {
    const permission = menuPermissions.find((p) => p.id === menuId);
    return {
      cYn: permission?.cYn === 'Y',
      rYn: permission?.rYn === 'Y',
      uYn: permission?.uYn === 'Y',
      dYn: permission?.dYn === 'Y',
    };
  };

  // 메뉴를 트리 구조로 변환
  const buildMenuTree = (menus) => {
    const menuMap = new Map();
    const rootMenus = [];

    // 모든 메뉴를 Map에 저장
    menus.forEach((menu) => {
      menuMap.set(menu.id, { ...menu, children: [] });
    });

    // 부모-자식 관계 구성
    menus.forEach((menu) => {
      const menuNode = menuMap.get(menu.id);
      if (!menu.parentId || menu.parentId === 0 || menu.parentId === '0') {
        rootMenus.push(menuNode);
      } else {
        const parent = menuMap.get(menu.parentId);
        if (parent) {
          parent.children.push(menuNode);
        } else {
          // 부모가 없으면 루트로 추가
          rootMenus.push(menuNode);
        }
      }
    });

    // 정렬 (sort 속성이 있으면 사용, 없으면 id 순서)
    const sortMenus = (menuArray) => {
      menuArray.sort((a, b) => {
        if (a.sort !== undefined && b.sort !== undefined) {
          return a.sort - b.sort;
        }
        return String(a.id).localeCompare(String(b.id));
      });
      menuArray.forEach((menu) => {
        if (menu.children && menu.children.length > 0) {
          sortMenus(menu.children);
        }
      });
    };

    sortMenus(rootMenus);
    return rootMenus;
  };

  // 메뉴를 평면화 (렌더링용)
  const flattenMenuTree = (menus, level = 1) => {
    const result = [];
    menus.forEach((menu) => {
      result.push({ ...menu, lvl: level });
      if (menu.children && menu.children.length > 0) {
        result.push(...flattenMenuTree(menu.children, level + 1));
      }
    });
    return result;
  };

  // 메뉴 레벨별 표시 텍스트
  const getMenuDisplayText = (menu) => {
    const level = menu.lvl || 1;
    if (level === 1) {
      return menu.mnuNm;
    } else if (level === 2) {
      return `ㄴ ${menu.mnuNm}`;
    } else if (level === 3) {
      return `  ㄴ ${menu.mnuNm}`;
    }
    return menu.mnuNm;
  };

  // 메뉴 레벨별 스타일
  const getMenuLevelStyle = (level) => {
    const styles = {
      1: 'font-bold text-gray-900 bg-gray-50',
      2: 'pl-4 text-gray-800',
      3: 'pl-8 text-gray-700',
    };
    return styles[level] || 'pl-4';
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">직원 권한 관리</h1>
            <p className="text-gray-600">직원별 메뉴 접근 권한을 설정합니다</p>
          </div>
        </div>

        {/* 직원 목록 */}
        <Card>
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">직원 목록</h2>
          </div>
          <div className="p-4">
            {isLoadingStaff ? (
              <div className="text-center py-8">
                <p className="text-gray-500">로딩 중...</p>
              </div>
            ) : staffList.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">등록된 직원이 없습니다.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {staffList.map((staff) => (
                  <button
                    key={staff.rtNo}
                    onClick={() => handleStaffSelect(staff)}
                    className="px-4 py-2 rounded-md border transition-colors bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{staff.rtNm}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          staff.rtType === 'RTTYP01'
                            ? 'bg-purple-100 text-purple-800'
                            : staff.rtType === 'RTTYP03'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {getRoleText(staff.rtType)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* 메뉴 권한 설정 모달 */}
        {showPermissionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              {/* 모달 헤더 */}
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    메뉴 권한 설정
                    {selectedStaff && (
                      <span className="ml-2 text-base font-normal text-gray-600">
                        ({selectedStaff.rtNm})
                      </span>
                    )}
                  </h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleResetPermissions}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <RefreshCw className="h-4 w-4" />
                    초기화
                  </button>
                  <button
                    onClick={handleSavePermissions}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <Save className="h-4 w-4" />
                    저장
                  </button>
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    닫기
                  </button>
                </div>
              </div>

              {/* 모달 내용 */}
              <div className="flex-1 overflow-y-auto p-6">
                {isLoadingMenu ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">로딩 중...</p>
                  </div>
                ) : menuList.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">메뉴가 없습니다.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {/* 목록 테이블 최상단 굵은 테두리 — 물건관리 목록과 통일 */}
                    <style>{`.list-topline thead tr:first-child th { border-top: 2px solid #94a3b8; }`}</style>
                    <table className="min-w-full divide-y divide-gray-200 list-topline">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3 text-left text-[15px] font-semibold text-gray-700 uppercase tracking-wider">
                            메뉴명
                          </th>
                          <th className="px-4 py-3 text-center text-[15px] font-semibold text-gray-700 uppercase tracking-wider">
                            생성(C)
                          </th>
                          <th className="px-4 py-3 text-center text-[15px] font-semibold text-gray-700 uppercase tracking-wider">
                            조회(R)
                          </th>
                          <th className="px-4 py-3 text-center text-[15px] font-semibold text-gray-700 uppercase tracking-wider">
                            수정(U)
                          </th>
                          <th className="px-4 py-3 text-center text-[15px] font-semibold text-gray-700 uppercase tracking-wider">
                            삭제(D)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {flattenMenuTree(buildMenuTree(menuList)).map((menu) => {
                          const permission = getMenuPermission(menu.id);
                          return (
                            <tr key={menu.id} className="hover:bg-gray-50">
                              <td
                                className={`px-6 py-4 whitespace-nowrap text-sm ${getMenuLevelStyle(
                                  menu.lvl
                                )}`}
                              >
                                {getMenuDisplayText(menu)}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={permission.cYn}
                                  onChange={(e) =>
                                    handlePermissionChange(
                                      menu.id,
                                      'cYn',
                                      e.target.checked
                                    )
                                  }
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={permission.rYn}
                                  onChange={(e) =>
                                    handlePermissionChange(
                                      menu.id,
                                      'rYn',
                                      e.target.checked
                                    )
                                  }
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={permission.uYn}
                                  onChange={(e) =>
                                    handlePermissionChange(
                                      menu.id,
                                      'uYn',
                                      e.target.checked
                                    )
                                  }
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={permission.dYn}
                                  onChange={(e) =>
                                    handlePermissionChange(
                                      menu.id,
                                      'dYn',
                                      e.target.checked
                                    )
                                  }
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default StaffPermissionPage;
