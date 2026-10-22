import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/authService';

const StaffModal = ({ isOpen, onClose, onSave, staff }) => {
  const [formData, setFormData] = useState({
    rtType: 'RTTYP02', // 기본: 소속공인중개사
    rtNm: '',
    rtTel: '',
    rtRegNo: '',
    id: '',
    pw: '',
    grade: '',        // 직급
    email: '',
    joinDate: '',
    leaveDate: '',
    note: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isIdChecked, setIsIdChecked] = useState(false);
  const [isCheckingId, setIsCheckingId] = useState(false);

  useEffect(() => {
    if (staff) {
      // 수정 모드
      setFormData({
        rtType: staff.rtType || 'RTTYP02',
        rtNm: staff.rtNm || '',
        rtTel: staff.rtTel || '',
        rtRegNo: staff.rtRegNo || '',
        id: staff.id || '',
        pw: '', // 비밀번호는 비워둠
        grade: staff.grade || '',
        email: staff.email || '',
        joinDate: staff.joinDate || '',
        leaveDate: staff.leaveDate || '',
        note: staff.note || '',
      });
    } else {
      // 신규 등록 모드
      setFormData({
        rtType: 'RTTYP02',
        rtNm: '',
        rtTel: '',
        rtRegNo: '',
        id: '',
        pw: '',
        grade: 'user',
      });
    }
  }, [staff]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // 에러 제거
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
    // 아이디 변경 시 중복확인 상태 초기화
    if (name === 'id') {
      setIsIdChecked(false);
    }
  };

  const handleCheckDuplicateId = async () => {
    if (!formData.id.trim()) {
      toast.error('아이디를 입력해주세요.');
      return;
    }

    if (formData.id.length < 4) {
      toast.error('아이디는 최소 4자 이상이어야 합니다.');
      return;
    }

    setIsCheckingId(true);
    try {
      const response = await authService.checkDuplicateId(formData.id);

      if (response.available) {
        setIsIdChecked(true);
        toast.success(response.message);
      } else {
        setIsIdChecked(false);
        toast.error(response.message);
      }
    } catch (error) {
      console.error('ID 중복확인 에러:', error);
      setIsIdChecked(false);
      toast.error('중복확인 중 오류가 발생했습니다.');
    } finally {
      setIsCheckingId(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.rtNm.trim()) {
      newErrors.rtNm = '이름을 입력해주세요';
    }

    if (!formData.id.trim()) {
      newErrors.id = '아이디를 입력해주세요';
    } else if (formData.id.length < 4) {
      newErrors.id = '아이디는 최소 4자 이상이어야 합니다';
    } else if (!staff && !isIdChecked) {
      newErrors.id = '아이디 중복확인을 해주세요';
    }

    // 신규 등록 시에만 비밀번호 필수
    if (!staff && !formData.pw) {
      newErrors.pw = '비밀번호를 입력해주세요';
    } else if (!staff && formData.pw.length < 6) {
      newErrors.pw = '비밀번호는 최소 6자 이상이어야 합니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // 비밀번호가 입력되지 않은 경우 제외
      const submitData = { ...formData };
      if (!submitData.pw) {
        delete submitData.pw;
      }

      await onSave(submitData);
    } catch (error) {
      console.error('직원 저장 에러:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      rtType: 'RTTYP02',
      rtNm: '',
      rtTel: '',
      rtRegNo: '',
      id: '',
      pw: '',
      grade: 'user',
    });
    setErrors({});
    setIsIdChecked(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleClose} />

      {/* 모달 컨텐츠 */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {staff ? '직원 정보 수정' : '직원 추가'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 구분 */}
          <div>
            <label htmlFor="rtType" className="block text-sm font-medium text-gray-700 mb-1">
              구분 *
            </label>
            <select
              id="rtType"
              name="rtType"
              value={formData.rtType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="RTTYP02">소속공인중개사</option>
              <option value="RTTYP03">중개보조원</option>
              <option value="RTTYP04">기타</option>
            </select>
          </div>

          {/* 이름 */}
          <div>
            <label htmlFor="rtNm" className="block text-sm font-medium text-gray-700 mb-1">
              이름 *
            </label>
            <input
              id="rtNm"
              name="rtNm"
              type="text"
              value={formData.rtNm}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.rtNm ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="이름을 입력하세요"
            />
            {errors.rtNm && <p className="mt-1 text-xs text-red-500">{errors.rtNm}</p>}
          </div>

          {/* 전화번호 */}
          <div>
            <label htmlFor="rtTel" className="block text-sm font-medium text-gray-700 mb-1">
              전화번호
            </label>
            <input
              id="rtTel"
              name="rtTel"
              type="tel"
              value={formData.rtTel}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="010-1234-5678"
            />
          </div>

          {/* 등록번호 */}
          <div>
            <label htmlFor="rtRegNo" className="block text-sm font-medium text-gray-700 mb-1">
              중개사 등록번호
            </label>
            <input
              id="rtRegNo"
              name="rtRegNo"
              type="text"
              value={formData.rtRegNo}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="중개사 등록번호"
            />
          </div>

          {/* 아이디 */}
          <div>
            <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-1">
              아이디 *
            </label>
            {staff ? (
              <input
                id="id"
                name="id"
                type="text"
                value={formData.id}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                placeholder="아이디 (최소 4자)"
              />
            ) : (
              <div className="flex gap-2">
                <input
                  id="id"
                  name="id"
                  type="text"
                  value={formData.id}
                  onChange={handleChange}
                  className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.id ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="아이디 (최소 4자)"
                />
                <button
                  type="button"
                  onClick={handleCheckDuplicateId}
                  disabled={isCheckingId || !formData.id.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-600 border border-transparent rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isCheckingId ? '확인중...' : '중복확인'}
                </button>
              </div>
            )}
            {errors.id && <p className="mt-1 text-xs text-red-500">{errors.id}</p>}
          </div>

          {/* 비밀번호 */}
          <div>
            <label htmlFor="pw" className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 {!staff && '*'}
              {staff && <span className="text-xs text-gray-500 ml-1">(변경 시에만 입력)</span>}
            </label>
            <input
              id="pw"
              name="pw"
              type="password"
              value={formData.pw}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.pw ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={staff ? '변경할 비밀번호 (최소 6자)' : '비밀번호 (최소 6자)'}
            />
            {errors.pw && <p className="mt-1 text-xs text-red-500">{errors.pw}</p>}
          </div>

          {/* 직급 */}
          <div>
            <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">직급</label>
            <input id="grade" name="grade" type="text" value={formData.grade} onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="예: 대표/실장/팀장/사원" />
          </div>

          {/* 이메일 */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input id="email" name="email" type="email" value={formData.email} onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="이메일" />
          </div>

          {/* 입사일 / 퇴사일 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="joinDate" className="block text-sm font-medium text-gray-700 mb-1">입사일</label>
              <input id="joinDate" name="joinDate" type="date" value={formData.joinDate} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label htmlFor="leaveDate" className="block text-sm font-medium text-gray-700 mb-1">퇴사일</label>
              <input id="leaveDate" name="leaveDate" type="date" value={formData.leaveDate} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* 비고 */}
          <div>
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">비고</label>
            <textarea id="note" name="note" rows={2} value={formData.note} onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="비고" />
          </div>

          {/* 버튼 */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? '저장 중...' : staff ? '수정하기' : '등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffModal;
