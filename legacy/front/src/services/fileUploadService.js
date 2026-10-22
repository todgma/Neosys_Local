import axios from 'axios';
import { API_BASE_URL } from '../config/apiEndpoints';

/**
 * 공용 파일 업로드 서비스 — 네이버클라우드 Object Storage(presigned URL 방식)
 *  1) presign: 백엔드에서 업로드용 PUT URL + objectKey 발급
 *  2) PUT: 브라우저가 스토리지로 직접 업로드
 *  3) register: 업로드 완료 후 메타(sys_file) 저장 (refKey 있는 경우)
 */
const unwrap = (res) => (res?.data?.data ?? res?.data ?? res);

// 공통 첨부 용량 제한 — 10MB 초과 금지(전 업로드 공통)
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_UPLOAD_LABEL = '10MB';

export const fileUploadService = {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  // presigned PUT URL 발급
  presign: async (fileDiv, fileName) => {
    const d = unwrap(await axios.post(`${API_BASE_URL}/api/files/presign`, { FileDiv: fileDiv, FileName: fileName }));
    return { objectKey: d?.objectKey, uploadUrl: d?.uploadUrl };
  },

  // 스토리지로 직접 PUT 업로드
  putToStorage: async (uploadUrl, file) => {
    await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type || 'application/octet-stream' } });
  },

  // 한 파일 업로드(presign → PUT) → 메타 객체 반환(아직 DB 저장 전)
  upload: async (fileDiv, file) => {
    // 공통 용량 제한: 10MB 초과 차단
    if (file && file.size > MAX_UPLOAD_BYTES) {
      const err = new Error(`파일 용량은 ${MAX_UPLOAD_LABEL}를 초과할 수 없습니다.`);
      err.code = 'FILE_TOO_LARGE';
      throw err;
    }
    const { objectKey, uploadUrl } = await fileUploadService.presign(fileDiv, file.name);
    if (!uploadUrl || !objectKey) throw new Error('presign 실패');
    await fileUploadService.putToStorage(uploadUrl, file);
    return {
      objectKey,
      origName: file.name,
      contentType: file.type || null,
      fileSize: file.size,
      ext: (file.name.split('.').pop() || '').toLowerCase(),
    };
  },

  // 메타 저장(sys_file)
  register: async (meta) => {
    const d = unwrap(await axios.post(`${API_BASE_URL}/api/files`, meta));
    return d?.fileId ?? null;
  },

  // 목록(조회용 URL 포함)
  list: async ({ fileTyp, fileDiv, refKey } = {}) => {
    const params = new URLSearchParams();
    if (fileTyp) params.set('fileTyp', fileTyp);
    if (fileDiv) params.set('fileDiv', fileDiv);
    if (refKey != null) params.set('refKey', refKey);
    const d = unwrap(await axios.get(`${API_BASE_URL}/api/files?${params.toString()}`));
    return d?.items || [];
  },

  getUrl: async (objectKey) => {
    const d = unwrap(await axios.get(`${API_BASE_URL}/api/files/url?objectKey=${encodeURIComponent(objectKey)}`));
    return d?.url || '';
  },

  remove: async (fileId, userId) => unwrap(await axios.delete(`${API_BASE_URL}/api/files/${fileId}?userId=${encodeURIComponent(userId || '')}`)),
};

export default fileUploadService;
