import React, { useState, useEffect, useRef } from 'react';
import addressService from '../../../services/common/addressService';

/**
 * 필지 소재지 선택 — 시/도 · 시/군/구 · 읍/면/동 3단 드롭다운(자체 상태).
 *  · value = 법정동코드(bjdCode). 선택 완료(읍면동) 시 onChange(bjdCode, '시도 시군구 읍면동' 법정동명) 호출.
 *  · 물건 필지목록 각 행에서 사용(행마다 다른 행정구역 선택 가능).
 */
export default function ParcelRegionSelect({ bjdCode = '', onChange }) {
  const [sidoList, setSidoList] = useState([]);
  const [sigunguList, setSigunguList] = useState([]);
  const [dongList, setDongList] = useState([]);
  const [sido, setSido] = useState('');
  const [sigungu, setSigungu] = useState('');
  const initRef = useRef(false);

  useEffect(() => { addressService.getSidoList().then((d) => setSidoList(d || [])).catch(() => {}); }, []);

  // 기존 bjdCode(수정/기본값)로 시도·시군구·읍면동 목록 복원
  useEffect(() => {
    if (initRef.current || !bjdCode || sidoList.length === 0) return;
    (async () => {
      try {
        const sidoCode = bjdCode.substring(0, 2) + '00000000';
        const sigunguCode = bjdCode.substring(0, 5) + '00000';
        setSido(sidoCode);
        const sg = await addressService.getSigunguList(sidoCode); setSigunguList(sg || []);
        setSigungu(sigunguCode);
        const emd = await addressService.getEupMyeonDongList(sigunguCode); setDongList(emd || []);
        initRef.current = true;
      } catch (e) { /* ignore */ }
    })();
  }, [bjdCode, sidoList.length]);

  const nameOf = (a, b, c) => [a, b, c].filter(Boolean).join(' ');

  const onSido = async (code) => {
    setSido(code); setSigungu(''); setSigunguList([]); setDongList([]);
    if (code) { try { setSigunguList((await addressService.getSigunguList(code)) || []); } catch { /* */ } }
  };
  const onSigungu = async (code) => {
    setSigungu(code); setDongList([]);
    if (code) { try { setDongList((await addressService.getEupMyeonDongList(code)) || []); } catch { /* */ } }
  };
  const onDong = (code) => {
    const sidoName = sidoList.find((s) => s.bjdCode === sido)?.bjdName || '';
    const sgName = sigunguList.find((s) => s.bjdCode === sigungu)?.bjdName || '';
    const dongName = dongList.find((s) => s.bjdCode === code)?.bjdName || '';
    onChange?.(code, nameOf(sidoName, sgName, dongName));
  };

  const sel = { padding: '3px 4px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '3px', cursor: 'pointer' };
  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center', flexWrap: 'nowrap' }}>
      <select value={sido} onChange={(e) => onSido(e.target.value)} style={{ ...sel, width: '92px' }}>
        <option value="">시/도</option>
        {sidoList.map((s) => <option key={s.bjdCode} value={s.bjdCode}>{s.bjdName}</option>)}
      </select>
      <select value={sigungu} onChange={(e) => onSigungu(e.target.value)} disabled={!sido} style={{ ...sel, width: '100px' }}>
        <option value="">시/군/구</option>
        {sigunguList.map((s) => <option key={s.bjdCode} value={s.bjdCode}>{s.bjdName}</option>)}
      </select>
      <select value={bjdCode || ''} onChange={(e) => onDong(e.target.value)} disabled={!sigungu} style={{ ...sel, width: '96px' }}>
        <option value="">읍/면/동</option>
        {dongList.map((s) => <option key={s.bjdCode} value={s.bjdCode}>{s.bjdName}</option>)}
      </select>
    </div>
  );
}
