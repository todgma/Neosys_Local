import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import FileUploadForm from '../common/FileUploadForm';
import { fileUploadService, MAX_UPLOAD_LABEL } from '../../services/fileUploadService';
import { contractApiService } from '../../services/contractApiService';

/**
 * 공제증서 첨부 모달 — 계약서 PK(master_id) 기준 sys_file 저장/조회/삭제.
 *  - file_typ=SYFTY05(증빙) / file_div=SYFDV06(공제증서), ref_key=master_id
 *  - FileUploadForm(refKey 지정) 재사용: 업로드 즉시 저장, 삭제 즉시 반영. 개수 변경 시 onCount 통지.
 */
const FILE_TYP = 'SYFTY05';
const FILE_DIV = 'SYFDV06';

export default function GongjeCertModal({ refKey, userId, meta = null, onClose, onCount }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // 기존 첨부 로드 (list 항목은 PascalCase + Url)
  useEffect(() => {
    if (!refKey) { setLoading(false); return; }
    (async () => {
      try {
        const items = await fileUploadService.list({ fileTyp: FILE_TYP, fileDiv: FILE_DIV, refKey: String(refKey) });
        const mapped = (items || []).map((it) => ({
          fileId: it.FileId, objectKey: it.ObjectKey, origName: it.OrigName,
          contentType: it.ContentType, fileSize: it.FileSize, ext: it.Ext,
          previewUrl: it.Url, fileTyp: FILE_TYP, fileDiv: FILE_DIV, refKey: String(refKey),
        }));
        setFiles(mapped);
        onCount?.(mapped.length);
      } catch (e) { console.error('공제증서 로드 실패:', e); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refKey]);

  const handleChange = (next) => {
    const added = next.length > files.length; // 새 파일 업로드 발생
    setFiles(next);
    onCount?.(next.length);
    // 파일만 첨부하고 계약서를 저장하지 않아도 마스터 행을 만들어 목록에 노출(유실 방지)
    if (added && refKey) {
      contractApiService.ensureMaster(String(refKey), meta, userId).catch((e) => console.error('마스터 보장 실패:', e));
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '32px 16px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '620px', maxWidth: '96vw', background: 'white', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>공제증서 첨부 <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>(파일당 최대 {MAX_UPLOAD_LABEL})</span></div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#334155' }}><X className="w-5 h-5" /></button>
        </div>
        <div style={{ padding: '18px 20px', minHeight: '160px' }}>
          {!refKey ? (
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>계약 정보가 없어 첨부할 수 없습니다.</div>
          ) : loading ? (
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>불러오는 중…</div>
          ) : (
            <FileUploadForm
              label="공제증서 파일"
              accept=".pdf,.jpg,.jpeg,.png"
              fileTyp={FILE_TYP}
              fileDiv={FILE_DIV}
              refKey={String(refKey)}
              multiple
              userId={userId}
              value={files}
              onChange={handleChange}
            />
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 18px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 700, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>닫기</button>
        </div>
      </div>
    </div>
  );
}
