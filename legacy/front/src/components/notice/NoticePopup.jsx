import React, { useEffect, useState } from 'react';
import axios from 'axios';
import systemService from '../../services/systemService';
import { API_BASE_URL } from '../../config/apiEndpoints';

/**
 * 메인 로그인 후 공지 팝업 — isPopup='Y' & 게시기간(startDate~endDate) 내 공지를 팝업으로 표시.
 *  - 내용은 편집기 HTML(색/이미지 포함) 그대로 렌더.
 *  - 팝업 크기: 내용 앞의 <!--popup:가로x세로--> 마커로 지정(관리자 편집기에서 삽입). 없으면 기본값.
 *  - 옵션: [오늘 보지 않음] / [다시 보지 않음] — localStorage 기억.
 *  - 게시종료일을 localStorage에 함께 저장 → 종료된 공지의 dismiss 기록은 자동 정리.
 */
const KEY = 'noticePopupDismiss_v1';
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dOnly = (v) => (v ? String(v).slice(0, 10) : null);
const truthy = (v) => v === 'Y' || v === true || v === 'true' || v === 1 || v === '1';

const loadStore = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
const saveStore = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } };

export default function NoticePopup() {
  const [items, setItems] = useState([]); // 표시할 공지들

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await systemService.getNotices(null, 1, 200);
        const list = res?.data?.notices || res?.notices || [];
        const today = todayStr();

        // 1) dismiss 기록 자동 정리: 게시종료일이 지난 항목 + 오늘보지않음(만료) 제거
        const store = loadStore();
        let changed = false;
        for (const [id, ent] of Object.entries(store)) {
          const expiredByEnd = ent.endDate && dOnly(ent.endDate) < today;         // 게시 종료된 공지
          const expiredToday = ent.until && ent.until !== 'forever' && ent.until < today; // 오늘보지않음 만료
          if (expiredByEnd || expiredToday) { delete store[id]; changed = true; }
        }
        if (changed) saveStore(store);

        // 2) 팝업 대상: isPopup + 게시기간 내 + dismiss 안된 것
        const shown = list.filter((n) => {
          if (!truthy(n.isPopup ?? n.IsPopup)) return false;
          const s = dOnly(n.startDate ?? n.StartDate);
          const e = dOnly(n.endDate ?? n.EndDate);
          if (s && s > today) return false;
          if (e && e < today) return false;
          const ent = store[String(n.noticeId ?? n.NoticeId)];
          if (ent) {
            if (ent.until === 'forever') return false;
            if (ent.until && ent.until >= today) return false; // 오늘 보지 않음(당일)
          }
          return true;
        }).map((n) => {
          const raw = n.content ?? n.Content ?? '';
          const m = raw.match(/<!--\s*popup:\s*(\d+)\s*[x×]\s*(\d+)\s*-->/i);
          // 크기 우선순위: DB 컬럼(popupW/popupH) → 내용 마커 → 기본값
          const dbW = Number(n.popupW ?? n.PopupW) || null;
          const dbH = Number(n.popupH ?? n.PopupH) || null;
          return {
            id: String(n.noticeId ?? n.NoticeId),
            title: n.title ?? n.Title ?? '공지사항',
            html: raw.replace(/<!--\s*popup:.*?-->/i, ''),
            endDate: dOnly(n.endDate ?? n.EndDate),
            w: dbW || (m ? Number(m[1]) : 460),
            h: dbH || (m ? Number(m[2]) : 620),
          };
        });
        // 3) 이벤트 팝업(isPopup + 게시기간 + dismiss 안된 것) — 공지와 동일 UI로 병합
        let evShown = [];
        try {
          const evRes = await axios.get(`${API_BASE_URL}/api/admin/events`, { params: { isPublic: 'Y', isPopup: 'Y', rowsPerPage: 50 } });
          const evList = evRes?.data?.data?.events || evRes?.data?.data?.Events || [];
          evShown = evList.filter((e) => {
            const s = dOnly(e.startDate ?? e.StartDate); const en = dOnly(e.endDate ?? e.EndDate);
            if (s && s > today) return false;
            if (en && en < today) return false;
            const ent = store[`ev_${e.eventId ?? e.EventId}`];
            if (ent) { if (ent.until === 'forever') return false; if (ent.until && ent.until >= today) return false; }
            return true;
          }).map((e) => ({
            // 내용은 편집기 HTML(이미지 포함) 그대로 렌더
            id: `ev_${e.eventId ?? e.EventId}`,
            title: e.title ?? e.Title ?? '이벤트',
            html: e.content ?? e.Content ?? '',
            endDate: dOnly(e.endDate ?? e.EndDate),
            w: Number(e.popupW ?? e.PopupW) || 480,
            h: Number(e.popupH ?? e.PopupH) || 600,
          }));
        } catch (err) { console.error('이벤트 팝업 조회 실패:', err); }

        if (alive) setItems([...shown, ...evShown]);
      } catch (e) { console.error('공지 팝업 조회 실패:', e); }
    })();
    return () => { alive = false; };
  }, []);

  const dismiss = (item, mode) => {
    if (mode) {
      const store = loadStore();
      store[item.id] = { until: mode === 'forever' ? 'forever' : todayStr(), endDate: item.endDate || null };
      saveStore(store);
    }
    setItems((prev) => prev.filter((x) => x.id !== item.id));
  };

  if (!items.length) return null;

  return (
    <>
      {items.map((it, i) => (
        <div key={it.id} onClick={() => dismiss(it, null)}
          style={{ position: 'fixed', inset: 0, zIndex: 3000 + i, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: `${it.w}px`, maxWidth: '96vw', height: `${it.h}px`, maxHeight: '92vh', background: 'white', borderRadius: '10px', boxShadow: '0 12px 40px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden', transform: `translate(${i * 24}px, ${i * 24}px)` }}>
            {/* 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#4f46e5', color: 'white', flexShrink: 0 }}>
              <span style={{ fontSize: '16px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
              <button type="button" onClick={() => dismiss(it, null)} style={{ border: 'none', background: 'transparent', color: 'white', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            {/* 내용(편집기 HTML) */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px', fontSize: '14px', lineHeight: 1.7, color: '#111827' }}
              dangerouslySetInnerHTML={{ __html: it.html || '<span style="color:#94a3b8">(내용 없음)</span>' }} />
            {/* 하단 옵션 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid #e5e7eb', background: '#f8fafc', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => dismiss(it, 'today')}>
                  <input type="checkbox" readOnly checked={false} style={{ pointerEvents: 'none' }} /> 오늘 보지 않음
                </label>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => dismiss(it, 'forever')}>
                  <input type="checkbox" readOnly checked={false} style={{ pointerEvents: 'none' }} /> 다시 보지 않음
                </label>
              </div>
              <button type="button" onClick={() => dismiss(it, null)}
                style={{ padding: '6px 16px', fontSize: '13px', fontWeight: 700, border: '1px solid #cbd5e1', background: 'white', color: '#334155', borderRadius: '5px', cursor: 'pointer' }}>닫기</button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
