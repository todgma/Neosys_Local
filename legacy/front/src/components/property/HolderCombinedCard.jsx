import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, Eraser } from 'lucide-react';
import ConfirmDialog from '../ui/ConfirmDialog';

/**
 * 소유자/임차인/공인중개사 통합 카드 (표 인라인 편집)
 * - 탭(소유자/임차인/공인중개사)으로 표 전환
 * - 기본 빈 행에서 바로 편집, 하단 행추가 버튼, 데이터 행 우측 삭제 아이콘
 */
const HolderCombinedCard = ({
  holders = [],
  onHoldersChange,
  registryOwner,
  onRegistryOwnerChange,
  contractTenant,
  onContractTenantChange,
  shareHistory = [],
  onShareHistoryChange,
}) => {
  const [activeType, setActiveType] = useState('OWNER');
  const [confirm, setConfirm] = useState(null); // { message, onConfirm }
  const focusInputRef = useRef(null); // 빈 행 첫 입력칸 (커서 깜박이도록)
  const wantFocusRef = useRef(false); // 사용자 액션(탭전환/행추가) 시에만 포커스

  const switchTab = (type) => {
    wantFocusRef.current = true;
    setActiveType(type);
  };

  const isOwner = activeType === 'OWNER';
  const isBuyer = activeType === 'BUYER';
  const isShare = activeType === 'SHARE';
  const title = isOwner ? '소유자' : isBuyer ? '임차인' : '공인중개사';

  // 데이터 유무 / 과거(전 소유자·임차인) 판별 (effect·렌더 공용)
  const holderHasData = (h) => !!(h.holderName || h.holderPhone || h.holderRelation || h.holderTelecom || h.holderAddress);
  const shareHasData = (s) => !!(s.officeName || s.regionName || s.officePhone || s.memo);
  const isPastHolder = (h) => h.holderRelation === '전 소유자' || h.holderRelation === '전 임차인';

  // 현재(비과거) 빈 행 3개는 데이터가 있어도 항상 유지 (부족분만 보충)
  //  · 함수형 업데이트로 최신 상태 기준 보충 → 상세 로드(비동기)와의 경합으로 로드된 행이 사라지는 문제 방지
  useEffect(() => {
    if (isShare) {
      onShareHistoryChange?.((prev) => ((prev && prev.length) ? prev : Array.from({ length: 3 }, () => ({ officeName: '', regionName: '', officePhone: '', memo: '' }))));
    } else {
      onHoldersChange?.((prev) => {
        const list = prev || [];
        const emptyCur = list.filter((h) => h.holderType === activeType && !isPastHolder(h) && !holderHasData(h)).length;
        if (emptyCur >= 3) return list;
        const add = Array.from({ length: 3 - emptyCur }, () => ({ holderType: activeType, holderName: '', holderRelation: '', holderPhone: '', holderTelecom: '', holderAddress: '' }));
        return [...list, ...add];
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, holders, shareHistory]);

  // 탭전환/행추가 시 빈 행 첫 칸에 포커스(커서) - 최초 마운트엔 동작 안 함
  useEffect(() => {
    if (wantFocusRef.current && focusInputRef.current) {
      focusInputRef.current.focus();
      wantFocusRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, holders, shareHistory]);

  // 활성 탭: 인디고(보라 아님)로 명확히 표시
  const tabStyle = (active) => ({
    width: '90px',
    padding: '6px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: active ? '700' : '500',
    border: 'none',
    borderRight: '1px solid #cbd5e1',
    borderBottom: active ? '3px solid #4f46e5' : '3px solid transparent',
    background: active ? '#4f46e5' : '#f8fafc',
    color: active ? '#ffffff' : '#000',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  });

  const thStyle = { padding: '4px 2px',fontSize:'14px',fontWeight:500, border: '1px solid #cbd5e1', background: '#f1f5f9' };
  const tdStyle = { padding: '0', border: '1px solid #cbd5e1' };
  const cellInput = { width: '100%', padding: '4px 6px', fontSize: '13px', border: 'none', outline: 'none', background: 'transparent', boxSizing: 'border-box' };
  const delTdStyle = { width: '52px', padding: '0', border: '1px solid #cbd5e1', textAlign: 'center' };
  const delBtnStyle = { padding: '2px', border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
  const eraseBtnStyle = { padding: '2px', border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

  // ===== holders 편집 =====
  const updateHolder = (actualIndex, field, value) => {
    const next = [...holders];
    next[actualIndex] = { ...next[actualIndex], [field]: value };
    onHoldersChange?.(next);
  };
  const deleteHolder = (actualIndex) => {
    setConfirm({
      message: '이 행을 삭제하시겠습니까?',
      onConfirm: () => onHoldersChange?.(holders.filter((_, i) => i !== actualIndex)),
    });
  };
  const clearHolder = (actualIndex) => {
    setConfirm({
      message: '이 행의 내용을 지우시겠습니까?',
      onConfirm: () => {
        const next = [...holders];
        next[actualIndex] = { ...next[actualIndex], holderName: '', holderRelation: '', holderPhone: '', holderTelecom: '', holderAddress: '' };
        onHoldersChange?.(next);
      },
    });
  };
  const addHolder = () => {
    wantFocusRef.current = true;
    onHoldersChange?.([...holders, { holderType: activeType, holderName: '', holderRelation: '', holderPhone: '', holderTelecom: '', holderAddress: '' }]);
  };

  // ===== share 편집 =====
  const updateShare = (index, field, value) => {
    const next = [...shareHistory];
    next[index] = { ...next[index], [field]: value };
    onShareHistoryChange?.(next);
  };
  const deleteShare = (index) => {
    setConfirm({
      message: '이 행을 삭제하시겠습니까?',
      onConfirm: () => onShareHistoryChange?.(shareHistory.filter((_, i) => i !== index)),
    });
  };
  const clearShare = (index) => {
    setConfirm({
      message: '이 행의 내용을 지우시겠습니까?',
      onConfirm: () => {
        const next = [...shareHistory];
        next[index] = { ...next[index], officeName: '', regionName: '', officePhone: '', memo: '' };
        onShareHistoryChange?.(next);
      },
    });
  };
  const addShare = () => {
    wantFocusRef.current = true;
    onShareHistoryChange?.([...shareHistory, { officeName: '', regionName: '', officePhone: '', memo: '' }]);
  };

  const ownerRows = holders.map((h, i) => ({ h, i })).filter((x) => x.h.holderType === activeType);
  // 과거(전 소유자/전 임차인) 구분 — 현재 행 먼저, 과거 행은 아래로(저장일 최신순). 과거부터 경계선 진하게
  const ownerCurRows = ownerRows.filter((x) => !isPastHolder(x.h));
  const ownerPastRows = ownerRows.filter((x) => isPastHolder(x.h)).sort((a, b) => String(b.h.holderRegDate || '').localeCompare(String(a.h.holderRegDate || '')));
  const ownerDisplayRows = [...ownerCurRows, ...ownerPastRows];
  const firstPastActualIdx = ownerPastRows.length ? ownerPastRows[0].i : null;
  const ownerEmptyMapIdx = ownerDisplayRows.findIndex(({ h }) => !holderHasData(h)); // 첫 빈 행
  const shareEmptyIdx = shareHistory.findIndex((s) => !shareHasData(s)); // 첫 빈 행

  return (
    <div style={{ border: '2px solid #8b7ad8', boxShadow: '0 2px 6px rgba(139,122,216,0.25)', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* 탭 + 입력 */}
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid #cbd5e1', flexShrink: 0 }}>
        <button type="button" onClick={() => switchTab('SHARE')} style={tabStyle(isShare)}>공인중개사</button>
        <button type="button" onClick={() => switchTab('OWNER')} style={tabStyle(isOwner)}>소유자</button>
        <button type="button" onClick={() => switchTab('BUYER')} style={tabStyle(isBuyer)}>임차인</button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px', background: '#f1f5f9' }}>
          {isOwner && (
            <input
              type="text"
              value={registryOwner || ''}
              onChange={(e) => onRegistryOwnerChange?.(e.target.value)}
              placeholder="등기사항전부증명서상 소유자"
              style={{ flex: 1, padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '3px', color: '#1e293b' }}
            />
          )}
          {isBuyer && (
            <input
              type="text"
              value={contractTenant || ''}
              onChange={(e) => onContractTenantChange?.(e.target.value)}
              placeholder="계약서상 임차인"
              style={{ flex: 1, padding: '4px 6px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '3px', color: '#1e293b' }}
            />
          )}
          {/* 행추가 — 카드 우상단 (표 아래 대신) */}
          <button type="button" onClick={isShare ? addShare : addHolder} style={{ marginLeft: 'auto', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', color: '#4f46e5', cursor: 'pointer' }}><Plus size={12} /> 행추가</button>
        </div>
      </div>

      {/* 표 (탭에 따라 전환) - 남은 높이 채움 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {isShare ? (
          <table style={{ width: '100%', height: '100%', fontSize: '11px', borderCollapse: 'collapse', background: 'white', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '84px' }} />
              <col style={{ width: '76px' }} />
              <col style={{ width: '104px' }} />
              <col />
              <col style={{ width: '44px' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={thStyle}>상호</th>
                <th style={thStyle}>지역명</th>
                <th style={thStyle}>전화번호</th>
                <th style={thStyle}>내용</th>
                <th style={{ ...thStyle, width: '52px' }}></th>
              </tr>
            </thead>
            <tbody>
              {shareHistory.map((item, idx) => (
                <tr key={idx}>
                  <td style={tdStyle}><input ref={idx === shareEmptyIdx ? focusInputRef : null} type="text" value={item.officeName || ''} onChange={(e) => updateShare(idx, 'officeName', e.target.value)} placeholder="상호" style={cellInput} /></td>
                  <td style={tdStyle}><input type="text" value={item.regionName || ''} onChange={(e) => updateShare(idx, 'regionName', e.target.value)} placeholder="지역명" style={cellInput} /></td>
                  <td style={tdStyle}><input type="text" value={item.officePhone || ''} onChange={(e) => updateShare(idx, 'officePhone', e.target.value)} placeholder="전화번호" style={cellInput} /></td>
                  <td style={tdStyle}><input type="text" value={item.memo || ''} onChange={(e) => updateShare(idx, 'memo', e.target.value)} placeholder="내용" style={cellInput} /></td>
                  <td style={delTdStyle}>
                    <button type="button" onClick={() => clearShare(idx)} title="내용 지우기" style={eraseBtnStyle}><Eraser size={13} /></button>
                    {idx >= 3 && (
                      <button type="button" onClick={() => deleteShare(idx)} title="행 삭제" style={delBtnStyle}><Trash2 size={13} /></button>
                    )}
                  </td>
                </tr>
              ))}
              {/* 남은 높이 채우는 빈 행 */}
              <tr style={{ height: '100%' }}><td colSpan={5} style={{ border: '1px solid #cbd5e1' }} /></tr>
            </tbody>
          </table>
        ) : (
          <table style={{ width: '100%', height: '100%', fontSize: '11px', borderCollapse: 'collapse', background: 'white', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '46px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '128px' }} />
              {isOwner && <col style={{ width: '66px' }} />}
              <col />
              <col style={{ width: '44px' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={thStyle}>구분</th>
                <th style={thStyle}>성함</th>
                <th style={thStyle}>관계</th>
                <th style={thStyle}>전화번호</th>
                {isOwner && <th style={thStyle}>통신사</th>}
                <th style={thStyle}>주 소</th>
                <th style={{ ...thStyle, width: '52px' }}></th>
              </tr>
            </thead>
            <tbody>
              {ownerDisplayRows.map(({ h, i }, mIdx) => {
                const past = isPastHolder(h);
                const boundary = i === firstPastActualIdx; // 과거 시작 행 → 위쪽 경계선 진하게
                const cTd = past ? { ...tdStyle, border: '1px solid #64748b' } : tdStyle;
                const topBd = boundary ? { borderTop: '2px solid #334155' } : null;
                return (
                <tr key={i}>
                  <td style={{ ...cTd, ...topBd, textAlign: 'center', background: past ? '#f1f5f9' : 'transparent', fontWeight: 700, fontSize: '12px', color: past ? '#dc2626' : '#cbd5e1' }}>{past ? '과거' : ''}</td>
                  <td style={{ ...cTd, ...topBd }}><input ref={mIdx === ownerEmptyMapIdx ? focusInputRef : null} type="text" value={h.holderName || ''} onChange={(e) => updateHolder(i, 'holderName', e.target.value)} placeholder="성함" style={cellInput} /></td>
                  <td style={{ ...cTd, ...topBd }}><input type="text" value={h.holderRelation || ''} onChange={(e) => updateHolder(i, 'holderRelation', e.target.value)} placeholder="관계" style={cellInput} /></td>
                  <td style={{ ...cTd, ...topBd }}><input type="text" value={h.holderPhone || ''} onChange={(e) => updateHolder(i, 'holderPhone', e.target.value)} placeholder="전화번호" style={cellInput} /></td>
                  {isOwner && (
                    <td style={{ ...cTd, ...topBd }}><input type="text" value={h.holderTelecom || ''} onChange={(e) => updateHolder(i, 'holderTelecom', e.target.value)} placeholder="통신사" style={cellInput} /></td>
                  )}
                  <td style={{ ...cTd, ...topBd }}><input type="text" value={h.holderAddress || ''} onChange={(e) => updateHolder(i, 'holderAddress', e.target.value)} placeholder="주소" style={cellInput} /></td>
                  <td style={{ ...delTdStyle, ...(past ? { border: '1px solid #64748b' } : null), ...topBd }}>
                    <button type="button" onClick={() => clearHolder(i)} title="내용 지우기" style={eraseBtnStyle}><Eraser size={13} /></button>
                    {(mIdx >= 3 || past) && (
                      <button type="button" onClick={() => deleteHolder(i)} title="행 삭제" style={delBtnStyle}><Trash2 size={13} /></button>
                    )}
                  </td>
                </tr>
              );})}
              {/* 남은 높이 채우는 빈 행 */}
              <tr style={{ height: '100%' }}><td colSpan={isOwner ? 7 : 6} style={{ border: '1px solid #cbd5e1' }} /></tr>
            </tbody>
          </table>
        )}
      </div>

      {/* 지우개/삭제 확인 모달 */}
      <ConfirmDialog
        open={!!confirm}
        message={confirm?.message}
        onConfirm={() => { confirm?.onConfirm?.(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
};

export default HolderCombinedCard;
