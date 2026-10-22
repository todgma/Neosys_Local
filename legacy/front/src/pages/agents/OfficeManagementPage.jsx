import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { officeService } from '../../services/officeService';
import { authService } from '../../services/authService';
import FileUploadForm from '../../components/common/FileUploadForm';
import { fileUploadService } from '../../services/fileUploadService';

// 사업자등록증 파일 분류 코드 (회원가입/사무실정보 공통)
const BIZ_FILE_TYP = 'SYFTY05'; // 증빙
const BIZ_FILE_DIV = 'SYFDV03'; // 기타문서(사업자등록증)
// 개설등록증(중개사무소 개설등록증) 파일 분류 — 사업자등록증과 구분(div 다름)
const OPEN_FILE_TYP = 'SYFTY05'; // 증빙
const OPEN_FILE_DIV = 'SYFDV04'; // 개설등록증 (신규 공통코드)
const fv = (o, ...keys) => { for (const k of keys) { if (o && o[k] != null && o[k] !== '') return o[k]; } return ''; };

const OfficeManagementPage = () => {
  const { user, office, updateOffice } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [bizFiles, setBizFiles] = useState([]); // 사업자등록증 첨부(서버 저장분)
  const [openFiles, setOpenFiles] = useState([]); // 개설등록증 첨부(서버 저장분)
  // 패스워드 변경 모달
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ curPw: '', newPw: '', newPw2: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async () => {
    const { curPw, newPw, newPw2 } = pwForm;
    if (!curPw || !newPw || !newPw2) { alert('모든 항목을 입력하세요.'); return; }
    if (newPw !== newPw2) { alert('새 패스워드가 일치하지 않습니다.'); return; }
    if (newPw.length < 4) { alert('새 패스워드는 4자 이상으로 입력하세요.'); return; }
    if (curPw === newPw) { alert('현재 패스워드와 다른 패스워드로 변경하세요.'); return; }
    const loginId = user?.userId || user?.id;
    if (!loginId) { alert('로그인 정보를 확인할 수 없습니다.'); return; }
    setPwLoading(true);
    try {
      const res = await authService.changePassword(loginId, curPw, newPw);
      if (res.success) {
        alert('패스워드가 변경되었습니다.');
        setShowPwModal(false);
        setPwForm({ curPw: '', newPw: '', newPw2: '' });
      } else {
        alert(res.message || '패스워드 변경에 실패했습니다.');
      }
    } catch (e) {
      console.error('패스워드 변경 실패:', e);
      alert('패스워드 변경 중 오류가 발생했습니다.');
    } finally {
      setPwLoading(false);
    }
  };

  // 사업자등록증 목록 조회(사무소번호 기준)
  const loadBizFiles = async (offNo) => {
    if (!offNo) { setBizFiles([]); return; }
    try {
      const items = await fileUploadService.list({ fileTyp: BIZ_FILE_TYP, fileDiv: BIZ_FILE_DIV, refKey: offNo });
      setBizFiles(items || []);
    } catch (e) { console.error('사업자등록증 조회 실패:', e); setBizFiles([]); }
  };
  const openBizFile = async (f) => {
    let url = fv(f, 'url', 'Url');
    if (!url) { try { url = await fileUploadService.getUrl(fv(f, 'objectKey', 'ObjectKey')); } catch { /* ignore */ } }
    if (url) window.open(url, '_blank', 'noopener');
    else alert('파일 URL을 가져올 수 없습니다.');
  };
  const deleteBizFile = async (f) => {
    const id = fv(f, 'fileId', 'FileId');
    if (!id || !window.confirm('사업자등록증 파일을 삭제할까요?')) return;
    try { await fileUploadService.remove(id, user?.userId); await loadBizFiles(office?.offNo); }
    catch (e) { alert('삭제 실패'); }
  };

  // 개설등록증 목록/열기/삭제 (사업자등록증과 동일 방식)
  const loadOpenFiles = async (offNo) => {
    if (!offNo) { setOpenFiles([]); return; }
    try {
      const items = await fileUploadService.list({ fileTyp: OPEN_FILE_TYP, fileDiv: OPEN_FILE_DIV, refKey: offNo });
      setOpenFiles(items || []);
    } catch (e) { console.error('개설등록증 조회 실패:', e); setOpenFiles([]); }
  };
  const openOpenFile = async (f) => {
    let url = fv(f, 'url', 'Url');
    if (!url) { try { url = await fileUploadService.getUrl(fv(f, 'objectKey', 'ObjectKey')); } catch { /* ignore */ } }
    if (url) window.open(url, '_blank', 'noopener');
    else alert('파일 URL을 가져올 수 없습니다.');
  };
  const deleteOpenFile = async (f) => {
    const id = fv(f, 'fileId', 'FileId');
    if (!id || !window.confirm('개설등록증 파일을 삭제할까요?')) return;
    try { await fileUploadService.remove(id, user?.userId); await loadOpenFiles(office?.offNo); }
    catch (e) { alert('삭제 실패'); }
  };

  const [formData, setFormData] = useState({
    offNm: '',
    addr: '',
    rpsNm: '',
    rpsPhone: '',
    offTel: '',
    offFax: '',
    regNo: '',
    bizNo: '',
  });

  // 페이지 진입 시 사무실 정보 조회
  useEffect(() => {
    const fetchOfficeInfo = async () => {
      if (user?.userId) {
        try {
          setIsLoading(true);
          const response = await officeService.getOfficeByUser(user.userId);
          if (response.success && response.data) {
            updateOffice(response.data);
          } else {
            // API에서 데이터가 없으면 null로 초기화
            updateOffice(null);
          }
        } catch (error) {
          console.log('사무실 정보 조회 실패:', error);
          // 에러 발생 시에도 null로 초기화
          updateOffice(null);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchOfficeInfo();
  }, [user?.userId]);

  // 사무실 정보가 변경되면 폼 데이터 업데이트
  useEffect(() => {
    if (office && office.offNo) {
      // 사무실 정보가 있으면 폼에 채우기
      setFormData({
        offNm: office.offNm || '',
        addr: office.addr || '',
        rpsNm: office.rpsNm || '',
        rpsPhone: office.rpsPhone || '',
        offTel: office.offTel || '',
        offFax: office.offFax || '',
        regNo: office.regNo || '',
        bizNo: office.bizNo || '',
      });
      setIsEditMode(true);
      loadBizFiles(office.offNo);
      loadOpenFiles(office.offNo);
    } else {
      // 사무실 정보가 없으면 신규 등록 모드
      setIsEditMode(false);
      setBizFiles([]);
    }
  }, [office]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.offNm || !formData.rpsNm) {
      alert('상호와 대표자명은 필수입니다.');
      return;
    }

    setIsLoading(true);
    try {
      const submitData = {
        ...formData,
        userId: user.userId,
      };

      let response;
      if (isEditMode && office?.offNo) {
        // 수정
        response = await officeService.updateOffice(office.offNo, submitData);
      } else {
        // 신규 등록
        response = await officeService.createOffice(submitData);
      }

      if (response.success) {
        alert(isEditMode ? '사무실 정보가 수정되었습니다.' : '사무실 정보가 등록되었습니다.');

        // 사무실 정보 다시 조회하여 업데이트
        const updatedOffice = await officeService.getOfficeByUser(user.userId);
        if (updatedOffice.success && updatedOffice.data) {
          updateOffice(updatedOffice.data);
        }

        if (!isEditMode) {
          setIsEditMode(true);
        }
      } else {
        alert(response.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('사무실 정보 저장 실패:', error);
      alert('사무실 정보 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 회원가입 화면과 동일한 라벨 | 입력창(가로) + 섹션 스타일
  const inp = { width: '100%', height: '34px', padding: '0 10px', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', color: '#111827', outline: 'none' };
  const secHead = { gridColumn: '1 / -1', fontSize: '15px', fontWeight: 800, color: '#111827', borderBottom: '2px solid #e5e7eb', paddingBottom: '6px', marginTop: '2px' };
  const row = (labelText, node, opts = {}) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...(opts.full ? { gridColumn: '1 / -1' } : {}) }}>
      <label style={{ flexShrink: 0, width: '112px', fontSize: '14px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>{labelText}</label>
      <div style={{ flex: 1, minWidth: 0 }}>{node}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f9fafb' }}>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '24px' }}>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 20px', alignContent: 'start' }}>
        <div style={secHead}>대표 정보</div>
        {row('대표자명 *', <input name="rpsNm" value={formData.rpsNm} onChange={handleChange} placeholder="대표자명을 입력하세요" required style={inp} />)}
        {row('대표자 전화번호', <input name="rpsPhone" value={formData.rpsPhone} onChange={handleChange} placeholder="010-0000-0000" style={inp} />)}

        <div style={secHead}>사무소 정보</div>
        {row('상호 *', <input name="offNm" value={formData.offNm} onChange={handleChange} placeholder="상호를 입력하세요" required style={inp} />)}
        {row('사무실 전화번호', <input name="offTel" value={formData.offTel} onChange={handleChange} placeholder="02-0000-0000" style={inp} />)}
        {row('사업장 소재지', <input name="addr" value={formData.addr} onChange={handleChange} placeholder="사업장 소재지를 입력하세요" style={inp} />, { full: true })}
        {row('개설등록번호', <input name="regNo" value={formData.regNo} onChange={handleChange} placeholder="중개업 등록번호" style={inp} />)}
        {row('사업자등록번호', <input name="bizNo" value={formData.bizNo} onChange={handleChange} placeholder="000-00-00000" style={inp} />)}
      </form>

      {/* 첨부파일 — 개설등록증 (사업자등록증 위) */}
      {isEditMode && office?.offNo && (
        <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 pb-2 border-b border-gray-200">
              개설등록증
            </h2>

            {openFiles.length > 0 ? (
              <div className="mb-4 space-y-2">
                {openFiles.map((f, i) => (
                  <div key={fv(f, 'fileId', 'FileId') || i} className="flex items-center gap-3 p-2 border border-gray-200 rounded-md">
                    <span className="text-sm font-semibold text-gray-800 flex-1 truncate" title={fv(f, 'origName', 'OrigName')}>
                      {fv(f, 'origName', 'OrigName') || '개설등록증'}
                    </span>
                    <button type="button" onClick={() => openOpenFile(f)}
                      className="px-3 py-1 text-sm font-bold text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50">보기</button>
                    <button type="button" onClick={() => deleteOpenFile(f)}
                      className="px-3 py-1 text-sm font-bold text-red-600 border border-red-200 rounded hover:bg-red-50">삭제</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">첨부된 개설등록증이 없습니다. 아래에서 업로드하세요.</p>
            )}

            <FileUploadForm
              label="개설등록증 첨부"
              accept=".pdf,.jpg,.jpeg,.png"
              fileTyp={OPEN_FILE_TYP}
              fileDiv={OPEN_FILE_DIV}
              refKey={office.offNo}
              userId={user?.userId}
              value={[]}
              onChange={() => loadOpenFiles(office.offNo)}
            />
        </div>
      )}

      {isEditMode && office?.offNo && (
        <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 pb-2 border-b border-gray-200">
              사업자등록증
            </h2>

            {/* 첨부된 파일 보기 */}
            {bizFiles.length > 0 ? (
              <div className="mb-4 space-y-2">
                {bizFiles.map((f, i) => (
                  <div key={fv(f, 'fileId', 'FileId') || i} className="flex items-center gap-3 p-2 border border-gray-200 rounded-md">
                    <span className="text-sm font-semibold text-gray-800 flex-1 truncate" title={fv(f, 'origName', 'OrigName')}>
                      {fv(f, 'origName', 'OrigName') || '사업자등록증'}
                    </span>
                    <button type="button" onClick={() => openBizFile(f)}
                      className="px-3 py-1 text-sm font-bold text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50">보기</button>
                    <button type="button" onClick={() => deleteBizFile(f)}
                      className="px-3 py-1 text-sm font-bold text-red-600 border border-red-200 rounded hover:bg-red-50">삭제</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">첨부된 사업자등록증이 없습니다. 아래에서 업로드하세요.</p>
            )}

            {/* 신규/추가 업로드 — refKey(사무소번호) 있으므로 업로드 즉시 저장 */}
            <FileUploadForm
              label="사업자등록증 첨부"
              accept=".pdf,.jpg,.jpeg,.png"
              fileTyp={BIZ_FILE_TYP}
              fileDiv={BIZ_FILE_DIV}
              refKey={office.offNo}
              userId={user?.userId}
              value={[]}
              onChange={() => loadBizFiles(office.offNo)}
            />
        </div>
      )}

      {isEditMode && office && (
        <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 pb-2 border-b border-gray-200">
              등록 정보
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">사무실번호</span>
                <p className="mt-1 text-gray-900">{office.offNo}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">등록일시</span>
                <p className="mt-1 text-gray-900">
                  {office.regDt ? new Date(office.regDt).toLocaleString('ko-KR') : '-'}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-600">수정일시</span>
                <p className="mt-1 text-gray-900">
                  {office.modDt ? new Date(office.modDt).toLocaleString('ko-KR') : '-'}
                </p>
              </div>
            </div>
        </div>
      )}
      </div>

      {/* 하단 고정 버튼바 (PropertyFormPageV2 스타일) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '10px 16px', background: 'white', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => { setPwForm({ curPw: '', newPw: '', newPw2: '' }); setShowPwModal(true); }}
          className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          style={{ fontSize: '14px', fontWeight: 600 }}
        >
          패스워드 변경
        </button>
        <button
          type="button"
          disabled={isLoading}
          onClick={(e) => handleSubmit(e)}
          className="px-5 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontSize: '14px', fontWeight: 700 }}
        >
          {isLoading ? '저장 중...' : (isEditMode ? '수정' : '등록')}
        </button>
        <button
          type="button"
          onClick={() => { try { window.close(); } catch { /* noop */ } }}
          className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          style={{ fontSize: '14px', fontWeight: 600 }}
        >
          닫기
        </button>
      </div>

      {/* 패스워드 변경 모달 */}
      {showPwModal && (
        <div onClick={() => !pwLoading && setShowPwModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1400, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '420px', maxWidth: '96vw', background: 'white', borderRadius: '10px', boxShadow: '0 16px 44px rgba(0,0,0,0.32)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>패스워드 변경</span>
              <button type="button" onClick={() => setShowPwModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#334155' }}>×</button>
            </div>
            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '15px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>현재 패스워드</label>
                <input type="password" autoComplete="current-password" value={pwForm.curPw}
                  onChange={(e) => setPwForm((p) => ({ ...p, curPw: e.target.value }))}
                  placeholder="현재 패스워드"
                  style={{ width: '100%', height: '38px', padding: '0 10px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '15px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>변경할 패스워드</label>
                <input type="password" autoComplete="new-password" value={pwForm.newPw}
                  onChange={(e) => setPwForm((p) => ({ ...p, newPw: e.target.value }))}
                  placeholder="새 패스워드 (4자 이상)"
                  style={{ width: '100%', height: '38px', padding: '0 10px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '15px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>변경할 패스워드 확인</label>
                <input type="password" autoComplete="new-password" value={pwForm.newPw2}
                  onChange={(e) => setPwForm((p) => ({ ...p, newPw2: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !pwLoading) handleChangePassword(); }}
                  placeholder="새 패스워드 확인"
                  style={{ width: '100%', height: '38px', padding: '0 10px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 18px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <button type="button" onClick={() => setShowPwModal(false)} disabled={pwLoading}
                className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                style={{ fontSize: '14px', fontWeight: 600 }}>취소</button>
              <button type="button" onClick={handleChangePassword} disabled={pwLoading}
                className="px-5 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                style={{ fontSize: '14px', fontWeight: 700 }}>{pwLoading ? '변경 중...' : '변경'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficeManagementPage;
