import React, { useState, useEffect } from 'react';

const OPTIONS = {
  냉방시설: ['벽걸이에어컨', '스탠드에어컨', '천장에어컨'],
  생활시설: [
    '침대', '책상', '옷장', '붙박이장', '식탁', '소파', '신발장',
    '냉장고', '세탁기', '건조기', '샤워부스', '욕조', '비데',
    '싱크대', '식기세척기', '가스레인지', '인덕션레인지', '전자레인지', '가스오븐'
  ],
  보안시설: ['경비원', '비디오폰', '인터폰', '카드키', 'CCTV', '사설경비', '현관보안', '방범창'],
  기타시설: ['엘리베이터', '화재경보기', '베란다', '테라스', '마당', '무인택배함']
};

// 냉방시설(에어컨)은 개수 입력 대상 — "이름 N대" 형식으로 저장/파싱
const COOLING = OPTIONS.냉방시설;
const isCooling = (opt) => COOLING.includes(opt);

const OptionModal = ({ isOpen, onClose, initialValue = '', onConfirm }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [counts, setCounts] = useState({}); // 냉방시설 개수: { 벽걸이에어컨: 2, ... }

  useEffect(() => {
    if (isOpen && initialValue) {
      // "벽걸이에어컨 2대, 냉장고" → 선택목록 + 개수 파싱
      const opts = [];
      const cnts = {};
      initialValue.split(',').map((s) => s.trim()).filter(Boolean).forEach((part) => {
        const m = part.match(/^(.+?)\s+(\d+)대$/);
        if (m) { opts.push(m[1]); cnts[m[1]] = Number(m[2]); }
        else { opts.push(part); }
      });
      setSelectedOptions(opts);
      setCounts(cnts);
    } else if (isOpen) {
      setSelectedOptions([]);
      setCounts({});
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleToggleOption = (option) => {
    if (selectedOptions.includes(option)) {
      setSelectedOptions((prev) => prev.filter((opt) => opt !== option));
    } else {
      setSelectedOptions((prev) => [...prev, option]);
      if (isCooling(option) && !counts[option]) setCounts((c) => ({ ...c, [option]: 1 }));
    }
  };

  const handleToggleCategory = (category) => {
    const categoryOptions = OPTIONS[category];
    const allSelected = categoryOptions.every((opt) => selectedOptions.includes(opt));

    if (allSelected) {
      // 모두 선택되어 있으면 해제
      setSelectedOptions((prev) => prev.filter((opt) => !categoryOptions.includes(opt)));
    } else {
      // 하나라도 선택 안 되어 있으면 모두 선택
      setSelectedOptions((prev) => {
        const newSet = new Set([...prev, ...categoryOptions]);
        return Array.from(newSet);
      });
      // 냉방시설 전체선택 시 개수 기본값 1
      setCounts((c) => {
        const next = { ...c };
        categoryOptions.forEach((opt) => { if (isCooling(opt) && !next[opt]) next[opt] = 1; });
        return next;
      });
    }
  };

  const handleCountChange = (option, value) => {
    setCounts((c) => ({ ...c, [option]: value === '' ? '' : Math.max(1, Number(value) || 1) }));
  };

  const handleConfirm = () => {
    // 냉방시설 선택 항목은 "이름 N대"로, 그 외는 이름 그대로
    const parts = selectedOptions.map((opt) => (isCooling(opt) ? `${opt} ${counts[opt] || 1}대` : opt));
    onConfirm(parts.join(', '));
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '20px',
        width: '600px',
        maxHeight: '94vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>옵션 선택</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            ×
          </button>
        </div>

        {Object.entries(OPTIONS).map(([category, options]) => {
          const allSelected = options.every((opt) => selectedOptions.includes(opt));

          return (
            <div key={category} style={{ marginBottom: '12px' }}>
              <div style={{
                background: '#f1f5f9',
                padding: '8px 13px',
                borderRadius: '4px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => handleToggleCategory(category)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontWeight: '600', fontSize: '14px' }}>{category}</span>
                <span style={{ fontSize: '14px', color: '#64748b' }}>전체 선택</span>
                {category === '냉방시설' && <span style={{ fontSize: '11px', color: '#94a3b8' }}>· 선택 시 개수 입력</span>}
              </div>
              <div style={category === '냉방시설'
                ? { display: 'flex', flexWrap: 'wrap', gap: '20px', paddingLeft: '13px' }
                : { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', paddingLeft: '13px' }}>
                {options.map((option) => {
                  const cooling = isCooling(option);
                  const sel = selectedOptions.includes(option);
                  return (
                    <div key={option} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => handleToggleOption(option)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ whiteSpace: 'nowrap' }}>{option}</span>
                      </label>
                      {cooling && sel && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          <input
                            type="number"
                            min="1"
                            value={counts[option] ?? 1}
                            onChange={(e) => handleCountChange(option, e.target.value)}
                            style={{ width: '42px', padding: '2px 4px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '3px', textAlign: 'right' }}
                          />
                          <span style={{ fontSize: '14px', color: '#64748b' }}>대</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-end',
          marginTop: '20px',
          paddingTop: '20px',
          borderTop: '1px solid #e2e8f0'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #cbd5e1',
              background: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: '#3b82f6',
              color: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default OptionModal;
