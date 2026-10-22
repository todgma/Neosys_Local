import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/authService';

const SignupModal = ({ isOpen, onClose, onSignup }) => {
  const [formData, setFormData] = useState({
    rtType: 'RTTYP01', // 대표로 고정
    rtNm: '',
    id: '',
    pw: '',
    confirmPassword: '',
    rtTel: '',
    rtRegNo: '',
    offNo: '',
    grade: 'user',
    referralCode: '' // 추천인 코드
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isIdChecked, setIsIdChecked] = useState(false);
  const [isCheckingId, setIsCheckingId] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // 입력 중 에러 제거
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
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

    // rtType은 'RTTYP01'로 고정되어 있으므로 검증 불필요

    if (!formData.rtNm.trim()) {
      newErrors.rtNm = '이름을 입력해주세요';
    }

    if (!formData.id.trim()) {
      newErrors.id = '아이디를 입력해주세요';
    } else if (formData.id.length < 4) {
      newErrors.id = '아이디는 최소 4자 이상이어야 합니다';
    } else if (!isIdChecked) {
      newErrors.id = '아이디 중복확인을 해주세요';
    }

    if (!formData.pw) {
      newErrors.pw = '비밀번호를 입력해주세요';
    } else if (formData.pw.length < 6) {
      newErrors.pw = '비밀번호는 최소 6자 이상이어야 합니다';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요';
    } else if (formData.pw !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
    }

    if (formData.rtTel && !/^[0-9-]+$/.test(formData.rtTel)) {
      newErrors.rtTel = '올바른 전화번호 형식이 아닙니다';
    }

    if (formData.offNo && !/^[0-9]+$/.test(formData.offNo)) {
      newErrors.offNo = '사무소 번호는 숫자만 입력해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // 백엔드 API에 맞춰 데이터 전송
      const signupData = {
        rtType: formData.rtType,
        rtNm: formData.rtNm,
        rtTel: formData.rtTel || null,
        rtRegNo: formData.rtRegNo || null,
        offNo: formData.offNo ? parseInt(formData.offNo) : null,
        grade: formData.grade || null,
        id: formData.id,
        pw: formData.pw,
        userId: formData.id, // userId는 id와 동일하게 설정
        referralCode: formData.referralCode || null // 추천인 코드
      };

      await onSignup(signupData);

      // 성공 시 폼 리셋
      setFormData({
        rtType: 'RTTYP01',
        rtNm: '',
        id: '',
        pw: '',
        confirmPassword: '',
        rtTel: '',
        rtRegNo: '',
        offNo: '',
        grade: 'user',
        referralCode: ''
      });
      onClose();
    } catch (error) {
      console.error('회원가입 에러:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      rtType: 'RTTYP01',
      rtNm: '',
      id: '',
      pw: '',
      confirmPassword: '',
      rtTel: '',
      rtRegNo: '',
      offNo: '',
      grade: 'user',
      referralCode: ''
    });
    setErrors({});
    setIsIdChecked(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-gray-900">회원가입</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600">
            중개사무소 대표자만 가입 가능합니다.<br /> 직원은 로그인 후 등록 가능합니다.
          </p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.rtNm ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="이름을 입력하세요"
            />
            {errors.rtNm && <p className="mt-1 text-xs text-red-500">{errors.rtNm}</p>}
          </div>

          {/* 아이디 */}
          <div>
            <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-1">
              아이디 *
            </label>
            <div className="flex gap-2">
              <input
                id="id"
                name="id"
                type="text"
                value={formData.id}
                onChange={handleInputChange}
                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.id ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="아이디를 입력하세요 (최소 4자)"
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
            {errors.id && <p className="mt-1 text-xs text-red-500">{errors.id}</p>}
          </div>

          {/* 비밀번호 */}
          <div>
            <label htmlFor="pw" className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 *
            </label>
            <div className="relative">
              <input
                id="pw"
                name="pw"
                type={showPassword ? 'text' : 'password'}
                value={formData.pw}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.pw ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="비밀번호를 입력하세요 (최소 6자)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.pw && <p className="mt-1 text-xs text-red-500">{errors.pw}</p>}
          </div>

          {/* 비밀번호 확인 */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 확인 *
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="비밀번호를 다시 입력하세요"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
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
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.rtTel ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="010-1234-5678 (선택)"
            />
            {errors.rtTel && <p className="mt-1 text-xs text-red-500">{errors.rtTel}</p>}
          </div>

          {/* 중개사 등록번호 */}
          <div>
            <label htmlFor="rtRegNo" className="block text-sm font-medium text-gray-700 mb-1">
              중개사 등록번호
            </label>
            <input
              id="rtRegNo"
              name="rtRegNo"
              type="text"
              value={formData.rtRegNo}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="중개사 등록번호 (선택)"
            />
          </div>

          {/* 사무소 번호 */}
          <div>
            <label htmlFor="offNo" className="block text-sm font-medium text-gray-700 mb-1">
              사무소 번호
            </label>
            <input
              id="offNo"
              name="offNo"
              type="number"
              value={formData.offNo}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.offNo ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="사무소 번호 (선택)"
            />
            {errors.offNo && <p className="mt-1 text-xs text-red-500">{errors.offNo}</p>}
          </div>

          {/* 추천인 코드 */}
          <div>
            <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700 mb-1">
              추천인 코드
            </label>
            <input
              id="referralCode"
              name="referralCode"
              type="text"
              value={formData.referralCode}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="추천인 코드 입력 (선택)"
            />
            <p className="mt-1 text-xs text-gray-500">추천인 코드 입력 시 30일 무료 혜택이 제공됩니다.</p>
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
              {isLoading ? '가입 중...' : '회원가입'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupModal;