import { useEffect, useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../../config/apiEndpoints';
import FileUploadForm from '../common/FileUploadForm';

// 미션문구 — 참여형 이벤트(미션) 목록 + 상세(미션문구 + 파일 제출).
//  · 열면 가장 최근 미션이 자동으로 열림. 제출 후에도 파일을 다시 첨부해 교체 가능(백엔드 upsert).
//  · page=true: 새 창(전체) / page=false: 인페이지 오버레이
const EVENT_FILE_DIV = 'SYFDV08';

export default function EventParticipationModal({ page = false, onClose, userId, offNo, rtNo, userNm, variant = 'mission' }) {
  const isReview = variant === 'review';        // 리뷰이벤트(텍스트 참여) vs 미션문구(파일 참여)
  const REVIEW_KEY = '부동산의 성공 비결';        // 제목에 이 키워드가 있으면 리뷰이벤트로 분류
  const headerTitle = isReview ? '리뷰이벤트' : '미션문구';

  const [events, setEvents] = useState(null); // null=로딩
  const [sel, setSel] = useState(null);       // 선택한 미션(상세)
  const [files, setFiles] = useState([]);
  const [reviewText, setReviewText] = useState(''); // 리뷰 텍스트(리뷰이벤트 전용)
  const [submitting, setSubmitting] = useState(false);

  const evId = (e) => e.eventId ?? e.EventId;
  const evTitle = (e) => e.title ?? e.Title ?? '';
  const evContent = (e) => e.content ?? e.Content ?? '';

  const loadAll = async (keepSel = false) => {
    try {
      const evRes = await axios.get(`${API_BASE_URL}/api/admin/events`, { params: { isPublic: 'Y', isParticipatory: 'Y', rowsPerPage: 100 } });
      const all = evRes?.data?.data?.events || evRes?.data?.data?.Events || [];
      // 제목 키워드로 분류: 리뷰이벤트=키워드 포함 / 미션문구=키워드 미포함
      const evList = all.filter((e) => (evTitle(e).includes(REVIEW_KEY)) === isReview);
      setEvents(evList);
      // 가장 최근(목록 첫번째) 자동 열기
      if (!keepSel && evList.length > 0) { setSel(evList[0]); setFiles([]); setReviewText(''); }
    } catch (e) { console.error('이벤트 조회 실패:', e); setEvents([]); }
  };
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  const openDetail = (e) => { setSel(e); setFiles([]); setReviewText(''); };
  const back = () => { setSel(null); setFiles([]); setReviewText(''); };

  // 미션 내용 복사는 전역 우클릭 메뉴(Electron main.cjs)로 처리 — 드래그 선택 후 우클릭 → 복사

  const submit = async () => {
    if (!sel) return;
    if (isReview) { if (!reviewText.trim()) { toast.error('링크를 입력하세요.'); return; } }
    else if (files.length === 0) { toast.error('제출 파일을 등록하세요.'); return; }
    setSubmitting(true);
    try {
      const payload = {
        EventId: evId(sel), OffNo: offNo ?? null, RtNo: rtNo ?? null, UserId: userId || null, UserNm: userNm || null,
        Content: isReview ? reviewText.trim() : null,
        Files: isReview ? [] : files.map((f) => ({ ObjectKey: f.objectKey, OrigName: f.origName, ContentType: f.contentType, FileSize: f.fileSize, Ext: f.ext })),
      };
      const res = await axios.post(`${API_BASE_URL}/api/events/entries`, payload);
      const ok = res?.data?.success !== false;
      if (!ok) throw new Error(res?.data?.error?.message || '제출 실패');
      toast.success(isReview ? '리뷰가 제출되었습니다.' : '미션이 제출되었습니다.');
      setFiles([]); setReviewText('');
      await loadAll(true); // 상세 유지
    } catch (e) { toast.error(e?.message || '제출에 실패했습니다.'); }
    finally { setSubmitting(false); }
  };

  const overlayStyle = page
    ? { position: 'relative', width: '100%', height: '100%', background: '#f1f5f9', display: 'flex', flexDirection: 'column' }
    : { position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' };
  const cardStyle = page
    ? { width: '100%', height: '100%', background: 'white', display: 'flex', flexDirection: 'column' }
    : { width: '720px', maxWidth: '96vw', height: '82vh', background: 'white', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' };

  return (
    <div onClick={page ? undefined : onClose} style={overlayStyle}>
      <div onClick={page ? undefined : (e) => e.stopPropagation()} style={cardStyle}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {sel && (events?.length ?? 0) > 1 && <button onClick={back} title="목록" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#334155', display: 'inline-flex', alignItems: 'center' }}><ChevronLeft className="w-5 h-5" /></button>}
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>{headerTitle}</span>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#334155', display: 'inline-flex' }}><X className="w-6 h-6" /></button>
        </div>

        {/* 본문 */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px' }}>
          {!sel ? (
            /* 목록 */
            events === null ? (
              <p style={muted}>불러오는 중…</p>
            ) : events.length === 0 ? (
              <p style={muted}>참여 가능한 {headerTitle}가 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {events.map((e) => (
                  <button key={evId(e)} type="button" onClick={() => openDetail(e)}
                    style={{ textAlign: 'left', padding: '14px 16px', border: '1px solid #e5e7eb', borderRadius: '10px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>{evTitle(e)}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5', flexShrink: 0 }}>{isReview ? '내용 보기' : '미션 보기'} ›</span>
                  </button>
                ))}
              </div>
            )
          ) : (
            /* 상세: 미션문구 + 파일 제출 */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', marginBottom: '10px' }}>{evTitle(sel)}</div>
                <div
                  style={{ fontSize: '14px', fontWeight: 600, color: '#111827', lineHeight: 1.7, border: '1px solid #eef1f5', borderRadius: '10px', padding: '14px 16px', background: '#fafafa', userSelect: 'text', WebkitUserSelect: 'text', cursor: 'text' }}
                  dangerouslySetInnerHTML={{ __html: evContent(sel) || '<span style="color:#64748b">미션 내용이 없습니다.</span>' }} />
              </div>

              {/* 제출 — 리뷰이벤트: 텍스트 / 미션문구: 파일 */}
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px 16px', background: 'white', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {isReview ? (
                  <>
                    <label style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>링크를 적어주세요</label>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="링크를 입력하세요"
                      rows={7}
                      style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '140px', padding: '12px 14px', fontSize: '14px', fontWeight: 600, color: '#111827', lineHeight: 1.6, border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
                    />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>제출 후에도 다시 작성해 교체할 수 있습니다.</div>
                  </>
                ) : (
                  <>
                    <FileUploadForm
                      label="게시한 내용을 업로드해 주세요(최대 5개)"
                      fileDiv={EVENT_FILE_DIV}
                      multiple
                      maxCount={5}
                      maxBytes={5 * 1024 * 1024}
                      value={files}
                      onChange={setFiles}
                    />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>제출 후에도 파일을 다시 첨부해 교체할 수 있습니다.</div>
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={submit} disabled={submitting}
                    style={{ padding: '10px 26px', fontSize: '16px', fontWeight: 800, color: 'white', border: 'none', borderRadius: '9px', background: submitting ? '#a5b4fc' : '#4f46e5', cursor: submitting ? 'default' : 'pointer' }}>
                    {submitting ? '제출 중…' : '제출하기'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

const muted = { fontSize: '15px', fontWeight: 600, color: '#334155', textAlign: 'center', padding: '40px 0', margin: 0 };
