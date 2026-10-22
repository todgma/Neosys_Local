'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const pick = (o, ...keys) => { for (const k of keys) { if (o && o[k] != null && o[k] !== '') return o[k]; } return ''; };
// 협력업체 분류 — 프로그램 협력업체관리 상단 분류 버튼과 동일(front/src/constants/partnerCategories.js 와 동기화)
const VENDOR_CATEGORIES = [
  '중개사무소', '네이버광고', '이사 | 청소', '은행 | 대출상담', '법무 | 세무', '지도 | 평면도', '분양대행사',
  '시행 | 시공 | 설계', '인테리어 | 철거', '변호사 | 행정사', '기타',
  '블로그 | 유튜브 | 인스타그램', '컴퓨터 | 프린터 / 인터넷 | 네트워크',
  '정수기 | 디퓨저 / cc카메라 | 소품', '차 | 음료 | 다과 / 문구 | 명함', '개업인사 / 떡케잌 | 꽃배달',
];
const EMPTY = {
  vendorName: '', category1: '', ceoName: '', ceoPhone: '', managerName: '', managerPhone: '',
  managerTel: '', managerFax: '', homepageUrl: '', detailAddress: '', productDesc: '', consultationNote: '',
};

export default function VendorsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.get('/api/vendors?pageNumber=1&rowsPerPage=500');
      setRows(d?.vendors || d?.Vendors || d?.items || []);
    } catch (e) { console.error(e); setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.vendorName?.trim()) { alert('상호를 입력하세요.'); return; }
    // 관리자 전역 협력업체: OffNo/RtNo 미지정(null) → 모든 사용자에게 최상단 노출
    const body = {
      VendorName: form.vendorName, Category1: form.category1 || null,
      CeoName: form.ceoName || null, CeoPhone: form.ceoPhone || null,
      ManagerName: form.managerName || null, ManagerPhone: form.managerPhone || null,
      ManagerTel: form.managerTel || null, ManagerFax: form.managerFax || null,
      HomepageUrl: form.homepageUrl || null, DetailAddress: form.detailAddress || null,
      ProductDesc: form.productDesc || null, ConsultationNote: form.consultationNote || null,
      RegType: 'ADMIN', UseYn: 'Y', UserId: 'admin',
    };
    try {
      if (form.vendorId) await api.put(`/api/vendors/${form.vendorId}`, body);
      else await api.post('/api/vendors', body);
      setForm(null); load();
    } catch (e) { console.error(e); alert('저장 실패'); }
  };
  const remove = async (id) => { if (!confirm('삭제할까요?')) return; try { await api.del(`/api/vendors/${id}?userId=admin`); load(); } catch (e) { alert('삭제 실패'); } };

  const openEdit = (r) => setForm({
    vendorId: pick(r, 'vendorId', 'VendorId'),
    vendorName: pick(r, 'vendorName', 'VendorName'), category1: pick(r, 'category1', 'Category1'),
    ceoName: pick(r, 'ceoName', 'CeoName'), ceoPhone: pick(r, 'ceoPhone', 'CeoPhone'),
    managerName: pick(r, 'managerName', 'ManagerName'), managerPhone: pick(r, 'managerPhone', 'ManagerPhone'),
    managerTel: pick(r, 'managerTel', 'ManagerTel'), managerFax: pick(r, 'managerFax', 'ManagerFax'),
    homepageUrl: pick(r, 'homepageUrl', 'HomepageUrl'), detailAddress: pick(r, 'detailAddress', 'DetailAddress'),
    productDesc: pick(r, 'productDesc', 'ProductDesc'), consultationNote: pick(r, 'consultationNote', 'ConsultationNote'),
  });

  const isGlobal = (r) => !pick(r, 'offNo', 'OffNo');
  const F = (k, label) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
      {label}<input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </label>
  );
  // 분류 드롭다운
  const CategoryField = () => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
      분류
      <select value={form.category1 || ''} onChange={(e) => setForm({ ...form, category1: e.target.value })}>
        <option value="">분류 선택</option>
        {VENDOR_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
      </select>
    </label>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginTop: 0 }}>협력업체관리 <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>(관리자 등록 = 전 사용자 최상단 노출)</span></h1>
        <button className="btn primary" onClick={() => setForm({ ...EMPTY })}>＋ 새 협력업체</button>
      </div>

      {form && (
        <div className="card" style={{ margin: '12px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            <CategoryField />{F('vendorName', '상호 *')}
            {F('ceoName', '대표자명')}{F('ceoPhone', '대표 연락처')}
            {F('managerName', '담당자명')}{F('managerPhone', '담당 휴대폰')}
            {F('managerTel', '사무소 번호')}{F('managerFax', '팩스')}
            {F('homepageUrl', '홈페이지')}{F('detailAddress', '소재지')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '13px', fontWeight: 600 }}>상품설명
              <textarea value={form.productDesc} onChange={(e) => setForm({ ...form, productDesc: e.target.value })} rows={3} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '13px', fontWeight: 600 }}>상담내용
              <textarea value={form.consultationNote} onChange={(e) => setForm({ ...form, consultationNote: e.target.value })} rows={3} /></label>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button className="btn" onClick={() => setForm(null)}>취소</button>
            <button className="btn primary" onClick={save}>저장</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>분류</th><th>상호</th><th>대표</th><th>연락처</th><th>소재지</th><th>상담</th><th>구분</th><th>관리</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>불러오는 중…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>협력업체가 없습니다.</td></tr>
                : rows.map((r, i) => (
                  <tr key={i}>
                    <td>{pick(r, 'category1', 'Category1')}</td>
                    <td style={{ textAlign: 'left', fontWeight: 700 }}>{pick(r, 'vendorName', 'VendorName')}</td>
                    <td>{pick(r, 'ceoName', 'CeoName')}</td>
                    <td>{pick(r, 'ceoPhone', 'CeoPhone') || pick(r, 'managerPhone', 'ManagerPhone')}</td>
                    <td style={{ textAlign: 'left' }}>{pick(r, 'detailAddress', 'DetailAddress')}</td>
                    <td>{pick(r, 'consultCnt', 'ConsultCnt') || 0}</td>
                    <td>{isGlobal(r) ? <span style={{ color: '#4f46e5', fontWeight: 700 }}>전역</span> : <span style={{ color: '#94a3b8' }}>사무소</span>}</td>
                    <td>
                      <button className="btn" style={{ padding: '3px 8px' }} onClick={() => openEdit(r)}>수정</button>{' '}
                      <button className="btn danger" style={{ padding: '3px 8px' }} onClick={() => remove(pick(r, 'vendorId', 'VendorId'))}>삭제</button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
