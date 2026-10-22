import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/authService';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Card from '../../components/ui/Card';

const SecurityPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    currentPassword: '',
    password: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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

    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = '현재 비밀번호를 입력해주세요';
    }

    if (!formData.password) {
      newErrors.password = '새 비밀번호를 입력해주세요';
    } else if (formData.password.length < 6) {
      newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // TODO: 현재 비밀번호 검증 로직 추가 필요

      const updateData = {
        pw: formData.password,
        userId: user?.email || 'system',
      };

      await authService.updateProfile(parseInt(user?.id), updateData);

      alert('비밀번호가 변경되었습니다.');

      // 폼 초기화
      setFormData({
        currentPassword: '',
        password: '',
        confirmPassword: '',
      });

      navigate('/settings');
    } catch (error) {
      alert(error.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">보안 설정</h1>
          <p className="text-gray-600">비밀번호를 변경하세요</p>
        </div>
      </div>

      <Card>
        <Card.Content>
          <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">비밀번호 변경</h3>
              <p className="text-sm text-gray-600 mb-6">
                보안을 위해 정기적으로 비밀번호를 변경하는 것을 권장합니다.
              </p>
            </div>

            {/* 현재 비밀번호 */}
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                현재 비밀번호 *
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.currentPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="현재 비밀번호를 입력하세요"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.currentPassword && <p className="mt-1 text-sm text-red-500">{errors.currentPassword}</p>}
            </div>

            {/* 새 비밀번호 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                새 비밀번호 *
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="새 비밀번호를 입력하세요 (최소 6자)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
            </div>

            {/* 새 비밀번호 확인 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                새 비밀번호 확인 *
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="새 비밀번호를 다시 입력하세요"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
            </div>

            {/* 버튼 */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
};

export default SecurityPage;
