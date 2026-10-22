import React, { useState } from 'react';
import { X } from 'lucide-react';

/**
 * 고객센터 문의 / 일괄변경 요청 접수 모달
 *  - category(=변경 항목) 전달 시: 물건관리 "일괄변경 요청" 레이아웃
 *    · 사무소명/사무소 전화번호/사무소주소 자동완성, 제목 "OO 변경 요청합니다" 자동완성
 *  - category 미전달 시: 기존 고객센터 문의 레이아웃(이름/연락처/이메일/문의유형)
 */
const InquiryModal = ({ isOpen, onClose, onSave, user, office, category }) => {
  const isRequest = !!category; // 일괄변경 요청 모드
  const [formData, setFormData] = useState({
    userId: user?.userId || '',
    // 고객센터 문의(기존)
    name: user?.rtName || '',
    email: '',
    phone: user?.rtPhone || '',
    categorySel: '',
    // 일괄변경 요청(물건관리) — 사무소/담당자
    officeName: office?.offNm || '',
    officeTel: office?.offTel || '',
    officeAddr: office?.addr || '',
    agentName: user?.rtNm || user?.rtName || '',
    agentGrade: user?.grade || '',
    agentPhone: user?.rtPhone || user?.rtTel || user?.phone || '',
    // 공통
    title: category ? `${category} 변경 요청합니다` : '',
    content: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (isRequest) {
      if (!formData.agentName.trim()) newErrors.agentName = '성함을 입력해주세요';
    } else {
      if (!formData.name.trim()) newErrors.name = '이름을 입력해주세요';
      if (!formData.categorySel) newErrors.categorySel = '문의 유형을 선택해주세요';
    }
    if (!formData.title.trim()) newErrors.title = '제목을 입력해주세요';
    if (!formData.content.trim()) newErrors.content = '내용을 입력해주세요';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      let payload;
      if (isRequest) {
        // 일괄변경요청(고객센터와 분리된 rt_bulk_request) — 사무소/담당자 정보는 구조화 필드로 전송
        payload = {
          isBulk: true,
          userId: formData.userId,
          offNo: office?.offNo ?? office?.OffNo ?? null,
          category, title: formData.title, content: formData.content,
          officeName: formData.officeName, officeTel: formData.officeTel, officeAddr: formData.officeAddr,
          agentName: formData.agentName, agentGrade: formData.agentGrade, agentPhone: formData.agentPhone,
        };
      } else {
        payload = {
          userId: formData.userId, name: formData.name, phone: formData.phone, email: formData.email,
          category: formData.categorySel, title: formData.title, content: formData.content,
        };
      }
      await onSave(payload);
      setFormData((prev) => ({ ...prev, content: '' }));
    } catch (error) {
      console.error('문의 등록 에러:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const label = 'block text-sm font-medium text-gray-700 mb-1';
  const field = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm';
  const fieldErr = 'w-full px-3 py-2 border border-red-500 rounded-md text-sm';
  const autoField = 'w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 my-8">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-indigo-600">
          <h2 className="text-lg font-semibold text-white">{isRequest ? `${category} 변경 요청` : '문의 접수'}</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* 고객센터 문의(비요청) 모드: 이름/연락처/이메일/유형은 상단 유지 */}
            {!isRequest && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>이름 <span className="text-red-500">*</span></label>
                    <input name="name" value={formData.name} onChange={handleChange} className={errors.name ? fieldErr : field} />
                    {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                  </div>
                  <div>
                    <label className={label}>연락처</label>
                    <input name="phone" value={formData.phone} onChange={handleChange} className={field} />
                  </div>
                </div>
                <div>
                  <label className={label}>이메일</label>
                  <input name="email" type="email" value={formData.email} onChange={handleChange} className={field} />
                </div>
                <div>
                  <label className={label}>문의 유형 <span className="text-red-500">*</span></label>
                  <select name="categorySel" value={formData.categorySel} onChange={handleChange} className={errors.categorySel ? fieldErr : field}>
                    <option value="">선택하세요</option>
                    <option value="기능문의">기능문의</option>
                    <option value="오류신고">오류신고</option>
                    <option value="개선제안">개선제안</option>
                    <option value="기타">기타</option>
                  </select>
                  {errors.categorySel && <p className="mt-1 text-xs text-red-500">{errors.categorySel}</p>}
                </div>
              </>
            )}

            {/* 제목 — 요청 모드는 자동입력(readonly) */}
            <div>
              <label className={label}>제목 <span className="text-red-500">*</span></label>
              <input
                name="title"
                value={formData.title}
                onChange={handleChange}
                readOnly={isRequest}
                className={isRequest ? autoField : (errors.title ? fieldErr : field)}
              />
              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
            </div>

            {/* 내용 */}
            <div>
              <label className={label}>내용 <span className="text-red-500">*</span></label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={7}
                className={`${errors.content ? fieldErr : field} resize-none`}
                placeholder={isRequest ? '요청 내용을 상세히 입력해주세요...' : '문의 내용을 상세히 입력해주세요...'}
              />
              {errors.content && <p className="mt-1 text-xs text-red-500">{errors.content}</p>}
            </div>

            {/* 요청 모드: 사무소 정보(자동) — 정보망전송 팝업의 하단 부동산정보 섹션처럼 하단 배치 */}
            {isRequest && (
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px', background: '#f8fafc' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>사무소 정보</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>사무소명</label>
                    <input name="officeName" value={formData.officeName} onChange={handleChange} className={autoField} />
                  </div>
                  <div>
                    <label className={label}>사무소 전화번호</label>
                    <input name="officeTel" value={formData.officeTel} onChange={handleChange} className={autoField} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4" style={{ marginTop: '12px' }}>
                  <div>
                    <label className={label}>성함 <span className="text-red-500">*</span></label>
                    <input name="agentName" value={formData.agentName} onChange={handleChange} className={errors.agentName ? fieldErr : field} />
                    {errors.agentName && <p className="mt-1 text-xs text-red-500">{errors.agentName}</p>}
                  </div>
                  <div>
                    <label className={label}>직급</label>
                    <input name="agentGrade" value={formData.agentGrade} onChange={handleChange} className={field} />
                  </div>
                  <div>
                    <label className={label}>휴대폰</label>
                    <input name="agentPhone" value={formData.agentPhone} onChange={handleChange} className={field} />
                  </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <label className={label}>사무소주소</label>
                  <input name="officeAddr" value={formData.officeAddr} onChange={handleChange} className={autoField} />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
              취소
            </button>
            <button type="submit" disabled={isLoading} className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
              {isLoading ? '접수 중...' : (isRequest ? '요청 접수' : '문의 접수')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InquiryModal;
