import React, { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { fileUploadService } from '../../services/fileUploadService';

/**
 * 공용 파일 업로드 컴포넌트 (네이버클라우드 presigned 업로드)
 *  - 파일 선택/드롭 → presign → 스토리지 PUT → 업로드된 메타를 value 리스트로 관리(controlled)
 *  - refKey가 이미 있으면(autoSave) 업로드 즉시 sys_file 메타까지 저장. 없으면(회원가입 등) 부모가 저장 시점에 처리.
 *  props:
 *   - label, accept('.pdf,.jpg,.png'), fileTyp, fileDiv, refKey(optional), multiple(기본 false), maxCount
 *   - value: 파일 메타 배열, onChange(list)
 */
export default function FileUploadForm({
  label = '파일 첨부',
  accept = '',
  fileTyp = '',
  fileDiv = '',
  refKey = null,
  multiple = false,
  maxCount = 0,
  maxBytes = 0,
  value = [],
  onChange = () => {},
  userId = null,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const acceptValue = accept
    ? (accept.includes('/') ? accept : accept.split(',').map((e) => (e.trim().startsWith('.') ? e.trim() : `.${e.trim()}`)).join(','))
    : '*/*';
  const allowedExts = accept && !accept.includes('/')
    ? accept.split(',').map((s) => s.replace(/^\./, '').trim().toLowerCase()).filter(Boolean) : [];
  const isAllowed = (name) => allowedExts.length === 0 || allowedExts.includes((name.split('.').pop() || '').toLowerCase());

  const addFiles = async (files) => {
    if (!files.length || busy) return;
    let picked = files.filter((f) => isAllowed(f.name));
    if (picked.length !== files.length) toast.error(`허용되지 않은 형식이 제외되었습니다.${allowedExts.length ? ` (${allowedExts.join(', ')})` : ''}`);
    if (maxBytes > 0) {
      const within = picked.filter((f) => f.size <= maxBytes);
      if (within.length !== picked.length) toast.error(`${Math.round(maxBytes / (1024 * 1024))}MB를 초과하는 파일은 제외됩니다.`);
      picked = within;
    }
    if (!multiple) picked = picked.slice(0, 1);
    if (maxCount > 0 && value.length + picked.length > maxCount) {
      toast.error(`최대 ${maxCount}개까지 첨부할 수 있습니다.`);
      picked = picked.slice(0, Math.max(0, maxCount - value.length));
    }
    if (!picked.length) return;

    setBusy(true);
    try {
      const uploaded = [];
      for (const file of picked) {
        const meta = await fileUploadService.upload(fileDiv, file);
        const item = {
          ...meta, fileTyp, fileDiv, refKey: refKey ?? null,
          previewUrl: URL.createObjectURL(file), // 미리보기(로컬)
          fileId: null,
        };
        // refKey가 있으면 즉시 메타 저장
        if (refKey != null) {
          try {
            item.fileId = await fileUploadService.register({
              FileTyp: fileTyp, FileDiv: fileDiv, RefKey: String(refKey), OrigName: meta.origName,
              ObjectKey: meta.objectKey, ContentType: meta.contentType, FileSize: meta.fileSize, Ext: meta.ext, UserId: userId,
            });
          } catch (e) { console.error('메타 저장 실패:', e); }
        }
        uploaded.push(item);
      }
      const next = multiple ? [...value, ...uploaded] : uploaded;
      onChange(next);
      toast.success('업로드되었습니다.');
    } catch (e) {
      console.error('업로드 실패:', e);
      toast.error('업로드에 실패했습니다.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = async (idx) => {
    const item = value[idx];
    if (item?.fileId) { try { await fileUploadService.remove(item.fileId, userId); } catch { /* ignore */ } }
    onChange(value.filter((_, i) => i !== idx));
  };

  const isImg = (it) => (it.contentType || '').startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes((it.ext || '').toLowerCase());
  const isPdf = (it) => (it.contentType || '') === 'application/pdf' || (it.ext || '').toLowerCase() === 'pdf';

  // 썸네일 클릭 — 미리보기 및 인쇄. Electron은 기본 뷰어로, 웹은 새 창에서 띄우고(이미지는 자동 인쇄) 인쇄
  const previewPrint = (it) => {
    const url = it.previewUrl;
    if (!url) { toast.error('열 수 있는 파일이 없습니다.'); return; }
    if (window.electronAPI?.openExternal) { window.electronAPI.openExternal(url); return; }
    const name = String(it.origName || '첨부파일').replace(/[<>]/g, '');
    const w = window.open('', '_blank', 'width=920,height=1040');
    if (!w) { toast.error('팝업이 차단되었습니다. 팝업을 허용해 주세요.'); return; }
    const body = isImg(it)
      ? `<img src="${url}" style="max-width:100%;height:auto" onload="setTimeout(function(){try{window.focus();window.print();}catch(e){}},200)"/>`
      : `<iframe src="${url}" style="border:none;width:100%;height:100vh"></iframe>`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${name}</title><style>body{margin:0;text-align:center;background:#525659}</style></head><body>${body}</body></html>`);
    w.document.close();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <style>{`
        .fuf-thumb { position: relative; cursor: pointer; }
        .fuf-ov { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; text-align: center;
          padding: 6px; background: rgba(15,23,42,0.58); color: #fff; font-size: 13px; font-weight: 700; line-height: 1.35;
          opacity: 0; transition: opacity .15s; box-sizing: border-box; }
        .fuf-thumb:hover .fuf-ov { opacity: 1; }
      `}</style>
      <label style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>{label}</label>

      <div
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true); } }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files || [])); }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
          border: `2px dashed ${dragging ? '#4f46e5' : '#cbd5e1'}`, borderRadius: '8px', padding: '20px', textAlign: 'center',
          cursor: busy ? 'default' : 'pointer', background: dragging ? '#eef2ff' : '#fafafa',
        }}
      >
        <input ref={inputRef} type="file" multiple={multiple} accept={acceptValue} onChange={(e) => addFiles(Array.from(e.target.files || []))} style={{ display: 'none' }} />
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
          {busy ? '업로드 중…' : <>파일을 <span style={{ color: '#4f46e5', fontWeight: 700 }}>드래그</span>하거나 <span style={{ color: '#4f46e5', fontWeight: 700 }}>클릭</span>해서 업로드</>}
        </div>
        {allowedExts.length > 0 && <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>({allowedExts.join(', ')})</div>}
      </div>

      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {value.map((it, idx) => (
            <div key={idx} style={{ width: '150px', textAlign: 'center' }}>
              <div className="fuf-thumb" onClick={() => previewPrint(it)} title="미리보기 및 인쇄" style={{ width: '150px', height: '104px', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden', background: '#f8fafc' }}>
                {isImg(it) ? (
                  <img src={it.previewUrl} alt={it.origName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : isPdf(it) ? (
                  <iframe src={it.previewUrl} title={it.origName} style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#64748b' }}>{(it.ext || '').toUpperCase()}</div>
                )}
                <div className="fuf-ov">미리보기 및<br />인쇄가 가능합니다</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.origName}>{it.origName}</span>
                <button type="button" onClick={() => removeAt(idx)} style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
