import { useEffect } from 'react';
import { X } from 'lucide-react';

// 원격지원 — ezHelp 위젯(runezhelp.js) 임베드. 새 창(작게)에서 상담원 번호 표시.
const EZHELP_CFG = { divid: 'ezHelpActivex', userid: 'neosis2026', width: '370', height: '210', type: '1', lang: 'kr' };

export default function RemoteSupportModal({ onClose, page = false }) {
  useEffect(() => {
    let script;
    const run = () => { try { if (window.runezHelp) window.runezHelp({ ...EZHELP_CFG }); } catch (e) { console.error('원격지원 위젯 실행 실패:', e); } };
    if (window.runezHelp) { run(); return; }
    script = document.createElement('script');
    script.src = 'https://939.co.kr/runezhelp.js';
    script.async = true;
    script.onload = run;
    script.onerror = () => console.error('원격지원 스크립트 로드 실패');
    document.body.appendChild(script);
    return () => { try { if (script && script.parentNode) script.parentNode.removeChild(script); } catch { /* noop */ } };
  }, []);

  const wrap = page
    ? { position: 'relative', width: '100%', height: '100%', background: 'white', display: 'flex', flexDirection: 'column' }
    : { position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' };
  const card = page
    ? { width: '100%', height: '100%', background: 'white', display: 'flex', flexDirection: 'column' }
    : { width: '420px', maxWidth: '96vw', background: 'white', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 44px rgba(0,0,0,0.3)' };

  return (
    <div onClick={page ? undefined : onClose} style={wrap}>
      <div onClick={page ? undefined : (e) => e.stopPropagation()} style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>원격지원</span>
          {onClose && <button onClick={onClose} title="닫기" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#334155', display: 'inline-flex' }}><X className="w-6 h-6" /></button>}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', textAlign: 'center' }}>상담원 안내에 따라 원격지원을 진행해 주세요.</div>
          <div id="ezHelpActivex" />
        </div>
      </div>
    </div>
  );
}
