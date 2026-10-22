import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { realestaterService } from '../../services/realestaterService';
import { ArrowLeft } from 'lucide-react';
import Card from '../../components/ui/Card';
import { toast } from 'react-hot-toast';

const ProfileEditPage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();

  const [formData, setFormData] = useState({
    rtType: '',
    rtNm: '',
    rtTel: '',
    rtRegNo: '',
    offNo: '',
    grade: '',
    id: '',
    pw: '',
    pwConfirm: '',
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // 페이지 로드 시 중개인 상세 정보 조회
  useEffect(() => {
    const loadUserDetail = async () => {
      try {
        setLoading(true);
        const rtNo = user?.rtNo;
        if (rtNo) {
          const response = await realestaterService.getDetail(rtNo);
          if (response.success && response.data) {
            setFormData({
              rtType: response.data.rtType || '',
              rtNm: response.data.rtNm || '',
              rtTel: response.data.rtTel || '',
              rtRegNo: response.data.rtRegNo || '',
              offNo: response.data.offNo || '',
              grade: response.data.grade || '',
              id: response.data.id || '',
              pw: '',
              pwConfirm: '',
            });
          }
        }
      } catch (error) {
        console.error('중개인 정보 조회 실패:', error);
        toast.error('중개인 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadUserDetail();
  }, [user?.rtNo]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.rtNm.trim()) {
      newErrors.rtNm = '이름을 입력해주세요';
    }

    if (!formData.rtTel.trim()) {
      newErrors.rtTel = '전화번호를 입력해주세요';
    } else if (!/^[0-9-]+$/.test(formData.rtTel)) {
      newErrors.rtTel = '올바른 전화번호 형식이 아닙니다';
    }

    // 비밀번호 변경 시에만 검증
    if (formData.pw) {
      if (formData.pw.length < 4) {
        newErrors.pw = '비밀번호는 4자 이상이어야 합니다';
      }
      if (formData.pw !== formData.pwConfirm) {
        newErrors.pwConfirm = '비밀번호가 일치하지 않습니다';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const updateData = {
        rtType: formData.rtType,
        rtNm: formData.rtNm,
        rtTel: formData.rtTel,
        rtRegNo: formData.rtRegNo || null,
        offNo: formData.offNo ? parseInt(formData.offNo) : null,
        grade: formData.grade || null,
        id: formData.id,
        userId: user?.userId || user?.id || 'system',
      };

      // 비밀번호가 입력된 경우에만 포함
      if (formData.pw) {
        updateData.pw = formData.pw;
      }

      await realestaterService.update(user?.rtNo, updateData);

      // 사용자 정보 업데이트
      updateUser({
        ...user,
        rtNm: formData.rtNm,
        rtTel: formData.rtTel,
        rtRegNo: formData.rtRegNo,
        grade: formData.grade,
      });

      toast.success('회원정보가 수정되었습니다.');
      navigate('/dashboard');
    } catch (error) {
      console.error('회원정보 수정 실패:', error);
      toast.error(error.message || '회원정보 수정에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">회원정보 수정</h1>
          <p className="text-gray-600">계정 정보를 수정하세요</p>
        </div>
      </div>

      <Card>
        <Card.Content>
          <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
            {/* 중개인 유형 */}
            <div>
              <label htmlFor="rtType" className="block text-sm font-medium text-gray-700 mb-2">
                중개인 유형 *
              </label>
              <select
                id="rtType"
                name="rtType"
                value={formData.rtType}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">선택하세요</option>
                <option value="RTTYP01">중개사</option>
                <option value="RTTYP02">직원</option>
              </select>
            </div>

            {/* 이름 */}
            <div>
              <label htmlFor="rtNm" className="block text-sm font-medium text-gray-700 mb-2">
                이름 *
              </label>
              <input
                id="rtNm"
                name="rtNm"
                type="text"
                value={formData.rtNm}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.rtNm ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="이름을 입력하세요"
              />
              {errors.rtNm && <p className="mt-1 text-sm text-red-500">{errors.rtNm}</p>}
            </div>

            {/* 아이디 */}
            <div>
              <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-2">
                아이디 *
              </label>
              <input
                id="id"
                name="id"
                type="text"
                value={formData.id}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                placeholder="아이디"
              />
              <p className="mt-1 text-xs text-gray-500">아이디는 변경할 수 없습니다.</p>
            </div>

            {/* 비밀번호 */}
            <div>
              <label htmlFor="pw" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                id="pw"
                name="pw"
                type="password"
                value={formData.pw}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.pw ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="변경할 비밀번호 (입력 시에만 변경됩니다)"
              />
              {errors.pw && <p className="mt-1 text-sm text-red-500">{errors.pw}</p>}
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label htmlFor="pwConfirm" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호 확인
              </label>
              <input
                id="pwConfirm"
                name="pwConfirm"
                type="password"
                value={formData.pwConfirm}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.pwConfirm ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="비밀번호 확인"
              />
              {errors.pwConfirm && <p className="mt-1 text-sm text-red-500">{errors.pwConfirm}</p>}
            </div>

            {/* 전화번호 */}
            <div>
              <label htmlFor="rtTel" className="block text-sm font-medium text-gray-700 mb-2">
                전화번호 *
              </label>
              <input
                id="rtTel"
                name="rtTel"
                type="tel"
                value={formData.rtTel}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.rtTel ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="010-1234-5678"
              />
              {errors.rtTel && <p className="mt-1 text-sm text-red-500">{errors.rtTel}</p>}
            </div>

            {/* 중개사 등록번호 */}
            <div>
              <label htmlFor="rtRegNo" className="block text-sm font-medium text-gray-700 mb-2">
                중개사 등록번호
              </label>
              <input
                id="rtRegNo"
                name="rtRegNo"
                type="text"
                value={formData.rtRegNo}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="중개사 등록번호 (선택)"
              />
            </div>

            {/* 등급 */}
            <div>
              <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-2">
                등급
              </label>
              <input
                id="grade"
                name="grade"
                type="text"
                value={formData.grade}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="등급 (선택)"
              />
            </div>

            {/* 사무소 번호 */}
            <div>
              <label htmlFor="offNo" className="block text-sm font-medium text-gray-700 mb-2">
                사무소 번호
              </label>
              <input
                id="offNo"
                name="offNo"
                type="number"
                value={formData.offNo}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="사무소 번호 (선택)"
              />
            </div>

            {/* 버튼 */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
};

export default ProfileEditPage;
