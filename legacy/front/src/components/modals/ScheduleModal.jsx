import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { scheduleService } from '../../services/scheduleService';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';

/**
 * 일정 등록/수정 모달
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 콜백
 * @param {Function} props.onSuccess - 성공 시 콜백
 * @param {Object} props.editData - 수정할 데이터 (없으면 신규 등록)
 */
// 오늘 날짜를 date 포맷(YYYY-MM-DD)으로 반환 (시간은 직접입력하므로 미포함)
const todayLocal = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// 구분(category) 옵션
const categoryOptions = ['계약일', '중도금일', '잔금일', '만기일', '거래신고기한', '전화드리기', '임장', '내방', '미팅'];

const ScheduleModal = ({ isOpen, onClose, onSuccess, editData = null, defaultLocation = '', linkPtNo = null, defaultDate = '', defaultTitle = '', defaultContent = '', defaultTime = '' }) => {
  const { user, office } = useAuthStore();
  const [formData, setFormData] = useState({
    scopeDiv: 'MY',
    category: '',
    title: '',
    content: '',
    startDate: todayLocal(), // 날짜: 오늘 자동
    startTime: '',           // 시간: 직접입력(기본값 없음)
    endAt: '',
    location: '',
    phone: '',
    contactName: '',
    contactRole: '',
    phone2: '',
    contactName2: '',
    contactRole2: '',
    amount: '',
    allDay: false,
    isShared: false,
    isPrivate: false,
  });
  const [customTitle, setCustomTitle] = useState(false); // 제목 직접입력 모드

  useEffect(() => {
    if (!isOpen) return;

    if (editData) {
      // 수정 모드
      setFormData({
        scopeDiv: editData.scopeDiv || 'MY',
        category: editData.category || '',
        title: editData.title || '',
        content: editData.content || '',
        startDate: editData.startAt ? editData.startAt.slice(0, 10) : todayLocal(),
        startTime: editData.startAt ? editData.startAt.slice(11, 16) : '',
        endAt: editData.endAt ? editData.endAt.slice(0, 16) : '',
        location: editData.location || '',
        phone: editData.phone || '',
        contactName: editData.contactName || '',
        contactRole: editData.contactRole || '',
        phone2: editData.phone2 || '',
        contactName2: editData.contactName2 || '',
        contactRole2: editData.contactRole2 || '',
        amount: editData.amount != null ? editData.amount : '',
        allDay: editData.allDay || false,
        isShared: editData.isShared || false,
        isPrivate: editData.isPrivate || false,
      });
    } else {
      // 신규 등록 모드 (물건등록폼/업무일지 등에서 진입 시 소재지·제목·내용·시간 자동입력)
      setFormData({
        scopeDiv: 'MY',
        category: categoryOptions.includes(defaultTitle) ? defaultTitle : '',
        title: defaultTitle || '',
        content: defaultContent || '',
        startDate: defaultDate || todayLocal(),
        startTime: defaultTime || '',
        endAt: '',
        location: defaultLocation || '',
        phone: '',
        contactName: '',
        contactRole: '',
        phone2: '',
        contactName2: '',
        contactRole2: '',
        amount: '',
        allDay: false,
        isShared: false,
        isPrivate: false,
      });
    }
    // 제목이 프리셋에 없으면 직접입력 모드로 (수정/기본제목 진입 시)
    const t = editData?.title || defaultTitle || '';
    setCustomTitle(!!t && !categoryOptions.includes(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // 사무실일정 / 나의일정 복수 선택 토글 (둘 다 = SHARE)
  const handleScopeToggle = (which) => {
    setFormData((prev) => {
      let office = prev.scopeDiv === 'OFFICE' || prev.scopeDiv === 'SHARE';
      let my = prev.scopeDiv === 'MY' || prev.scopeDiv === 'SHARE';
      if (which === 'OFFICE') office = !office;
      if (which === 'MY') my = !my;
      let sd = '';
      if (office && my) sd = 'SHARE';
      else if (office) sd = 'OFFICE';
      else if (my) sd = 'MY';
      return { ...prev, scopeDiv: sd };
    });
  };
  const isOfficeScope = formData.scopeDiv === 'OFFICE' || formData.scopeDiv === 'SHARE';
  const isMyScope = formData.scopeDiv === 'MY' || formData.scopeDiv === 'SHARE';
  // 금액은 계약일/중도금일/잔금일일 때만 표기
  const showAmount = ['계약일', '중도금일', '잔금일'].includes(formData.title);
  // 연락처/성함은 계약일~거래신고기한(날짜성 항목)일 때 표기
  const showContact = ['계약일', '중도금일', '잔금일', '만기일', '거래신고기한'].includes(formData.title);

  // 제목 드롭다운(카테고리 프리셋 + 직접입력)
  const handleTitleSelect = (v) => {
    if (v === '__custom__') {
      setCustomTitle(true);
      setFormData((prev) => ({ ...prev, title: '', category: '' }));
    } else {
      setCustomTitle(false);
      setFormData((prev) => ({ ...prev, title: v, category: v }));
    }
  };
  // 드롭다운 표시값: 직접입력 모드면 __custom__, 프리셋이면 그 값, 아니면 빈값
  const titleSelectValue = customTitle
    ? '__custom__'
    : (categoryOptions.includes(formData.title) ? formData.title : '');

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 필수 필드 검증
    if (!formData.title) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    if (!formData.startDate) {
      toast.error('날짜를 입력해주세요.');
      return;
    }
    if (!formData.startTime) {
      toast.error('시간을 입력해주세요.');
      return;
    }

    try {
      const submitData = {
        ...formData,
        scopeDiv: formData.scopeDiv || 'MY', // 미선택 시 기본 나의일정
        startAt: `${formData.startDate}T${formData.startTime}`, // 날짜+직접입력 시간
        ownerUserId: user?.userId,
        officeId: office?.offNo,
        userId: user?.userId,
      };

      // 물건등록폼에서 진입한 신규 등록이면 물건번호를 연동 저장(rt_schedule_link)
      if (!editData && linkPtNo) {
        submitData.links = [{ LinkType: 'PT', LinkKey: String(linkPtNo) }];
      }

      if (editData) {
        // 수정
        await scheduleService.updateSchedule(editData.scheduleId, submitData);
      } else {
        // 등록
        await scheduleService.createSchedule(submitData);
      }

      // 먼저 모달 닫기
      onClose();

      // 모달이 닫힌 후 토스트 표시
      setTimeout(() => {
        if (editData) {
          toast.success('일정이 수정되었습니다.');
        } else {
          toast.success('일정이 등록되었습니다.');
        }
        onSuccess && onSuccess();
      }, 100);
    } catch (error) {
      console.error('일정 저장 실패:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {editData ? '일정 수정' : '일정 등록'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* 사무실일정 / 나의일정 (복수 선택 가능) */}
            <div className="flex items-center gap-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOfficeScope}
                  onChange={() => handleScopeToggle('OFFICE')}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">사무실일정</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMyScope}
                  onChange={() => handleScopeToggle('MY')}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">나의일정</span>
              </label>
              <span className="text-xs text-gray-400">(복수 선택 가능)</span>
            </div>

            {/* 제목 + 금액 (라벨-입력창 한 줄) */}
            <div className="flex items-center gap-3">
              <label className="w-16 flex-shrink-0 text-sm font-medium text-gray-700">제목 <span className="text-red-500">*</span></label>
              <select value={titleSelectValue} onChange={(e) => handleTitleSelect(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">선택</option>
                {categoryOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                <option value="__custom__">직접입력</option>
              </select>
              {customTitle && (
                <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="제목 직접입력" required
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
              {showAmount && (
                <>
                  <label className="flex-shrink-0 text-sm font-medium text-gray-700 ml-1">금액(만원)</label>
                  <input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="금액"
                    className="w-28 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </>
              )}
            </div>

            {/* 일시 (라벨-입력창 한 줄) */}
            <div className="flex items-center gap-3">
              <label className="w-16 flex-shrink-0 text-sm font-medium text-gray-700">일시 <span className="text-red-500">*</span></label>
              <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* 주소 (라벨-입력창 한 줄) */}
            <div className="flex items-center gap-3">
              <label className="w-16 flex-shrink-0 text-sm font-medium text-gray-700">{['내방', '미팅', '임장'].includes(formData.title) ? '물건주소' : '주소'}</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="주소를 입력하세요"
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* 연락처 / 성함 */}
            {showContact ? (
              <>
                {/* [연락처] [구분(매도인/매수인)] [성함] 2줄 */}
                {[{ p: 'phone', r: 'contactRole', n: 'contactName' }, { p: 'phone2', r: 'contactRole2', n: 'contactName2' }].map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <label className="w-16 flex-shrink-0 text-sm font-medium text-gray-700">연락처</label>
                    <input type="text" name={f.p} value={formData[f.p]} onChange={handleChange} placeholder="연락처"
                      className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <select name={f.r} value={formData[f.r]} onChange={handleChange}
                      className="w-24 flex-shrink-0 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">구분</option><option value="매도인">매도인</option><option value="매수인">매수인</option>
                    </select>
                    <input type="text" name={f.n} value={formData[f.n]} onChange={handleChange} placeholder="성함"
                      className="w-32 flex-shrink-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <label className="w-16 flex-shrink-0 text-sm font-medium text-gray-700">연락처</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="연락처"
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <label className="flex-shrink-0 text-sm font-medium text-gray-700 ml-1">성함</label>
                <input type="text" name="contactName" value={formData.contactName} onChange={handleChange} placeholder="성함"
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}

            {/* 내용 (라벨-입력창 한 줄) */}
            <div className="flex items-start gap-3">
              <label className="w-16 flex-shrink-0 text-sm font-medium text-gray-700 mt-2">내용</label>
              <textarea name="content" value={formData.content} onChange={handleChange} rows={3} placeholder="일정 내용을 입력하세요"
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            {editData ? '수정' : '등록'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;
