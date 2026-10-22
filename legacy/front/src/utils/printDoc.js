// 자체완결 HTML 인쇄 헬퍼 — react-to-print(앱 전체 CSS 복사 → 대용량/빈화면) 대체.
//  · 미리보기 DOM(el)의 outerHTML + 폼 자체 CSS만으로 작은 완결 문서를 만들어 인쇄.
//  · Electron: 메인 프로세스 인쇄(printHtml). 웹: 새 창 열어 window.print().

// 완결 HTML 문서 문자열 생성
export function buildPrintDoc(bodyHtml, css = '', title = '') {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${title || ''}</title>
<style>
  @page { size: A4; margin: 20mm 20mm 10mm 20mm; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .no-print { display: none !important; }
  ${css}
  /* 인쇄 시 입력창(초록 배경/테두리) 표기 제거 — 값 텍스트만 출력 */
  input, textarea, select { border: none !important; background: transparent !important; box-shadow: none !important; -webkit-appearance: none !important; appearance: none !important; }
</style>
</head><body>${bodyHtml}</body></html>`;
}

// 완결 HTML 문서를 인쇄
export async function printDocHtml(bodyHtml, css = '', title = '') {
  const html = buildPrintDoc(bodyHtml, css, title);
  if (typeof window !== 'undefined' && window.electronAPI?.printHtml) {
    try { await window.electronAPI.printHtml(html); return; }
    catch (e) { console.error('인쇄 실패:', e); }
  }
  // 웹 폴백 — 새 창에서 인쇄
  const w = window.open('', '_blank', 'noopener,width=900,height=1000');
  if (!w) return;
  w.document.open(); w.document.write(html); w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch (_) { /* noop */ } }, 350);
}

// 미리보기 DOM 요소를 인쇄(요소의 outerHTML + 폼 CSS)
//  · 미리보기 안의 편집 가능한 input/textarea/select의 현재 값을 속성으로 복사해 outerHTML에 반영
export async function printElement(el, css = '', title = '') {
  if (!el) return;
  const clone = el.cloneNode(true);
  const src = el.querySelectorAll('input, textarea, select');
  const dst = clone.querySelectorAll('input, textarea, select');
  src.forEach((s, i) => {
    const d = dst[i];
    if (!d) return;
    const tag = s.tagName;
    if (tag === 'SELECT') {
      Array.from(d.options || []).forEach((o) => {
        if (o.value === s.value) o.setAttribute('selected', 'selected');
        else o.removeAttribute('selected');
      });
    } else if (s.type === 'checkbox' || s.type === 'radio') {
      if (s.checked) d.setAttribute('checked', 'checked');
      else d.removeAttribute('checked');
    } else if (tag === 'TEXTAREA') {
      d.textContent = s.value;
    } else {
      d.setAttribute('value', s.value);
    }
  });
  await printDocHtml(clone.outerHTML, css, title);
}
