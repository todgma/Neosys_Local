import React, { useEffect } from 'react';
import StickyMemo from '../../components/memo/StickyMemo';

/**
 * 메모 — 별도 창(Electron detached)용 스티커 메모 페이지
 */
const MemoPage = () => {
  useEffect(() => { document.title = '메모'; }, []);
  return <StickyMemo standalone onClose={() => { try { window.close(); } catch (e) { /* ignore */ } }} />;
};

export default MemoPage;
