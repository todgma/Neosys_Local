import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';

const ConsultationCard = ({
  consultations = [],
  onUpdate,
  compact = false
}) => {
  const { user } = useAuthStore();

  const handleAdd = () => {
    const now = new Date();
    const dateStr = now.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const newEntry = {
      datetime: dateStr,
      userId: user?.userId || user?.userName || '담당자',
      content: ''
    };
    onUpdate([...consultations, newEntry]);
  };

  const handleContentChange = (index, content) => {
    const updated = [...consultations];
    updated[index].content = content;
    onUpdate(updated);
  };

  const handleDelete = (index) => {
    onUpdate(consultations.filter((_, i) => i !== index));
  };

  return (
    <div style={{
      border: '1px solid #cbd5e1',
      padding: compact ? '4px' : '6px',
      background: '#fef3c7',
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: compact ? '4px' : '6px'
      }}>
        <div style={{ fontSize: compact ? '12px' : '13px', fontWeight: '600', color: '#1e293b' }}>
          상담이력
        </div>
        <button
          type="button"
          onClick={handleAdd}
          style={{
            padding: '2px 6px',
            fontSize: '11px',
            border: '1px solid #f59e0b',
            background: '#f59e0b',
            color: 'white',
            cursor: 'pointer',
            borderRadius: '3px'
          }}
        >
          + 추가
        </button>
      </div>
      <div style={{
        flex: 1,
        overflow: 'auto',
        border: '1px solid #cbd5e1',
        padding: compact ? '4px' : '6px',
        background: 'white',
        fontFamily: 'monospace',
        fontSize: '11px',
        lineHeight: '1.6',
        minHeight: compact ? '150px' : '100px',
        maxHeight: compact ? '400px' : 'none'
      }}>
        {consultations.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
            상담이력 정보 없음
          </div>
        ) : (
          consultations.map((entry, index) => (
            <div key={index} style={{
              padding: '4px 0',
              borderBottom: index < consultations.length - 1 ? '1px solid #f1f5f9' : 'none',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '4px'
            }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                <span style={{ whiteSpace: 'nowrap', color: '#64748b' }}>[{entry.datetime}]</span>
                <span style={{ whiteSpace: 'nowrap', color: '#3b82f6', fontWeight: '600' }}>[{entry.userId}]</span>
                <span style={{ whiteSpace: 'nowrap' }}>:</span>
                <input
                  type="text"
                  value={entry.content}
                  onChange={(e) => handleContentChange(index, e.target.value)}
                  placeholder="내용 입력..."
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '11px',
                    fontFamily: 'inherit',
                    padding: '2px'
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => handleDelete(index)}
                style={{
                  padding: '1px 4px',
                  fontSize: '10px',
                  border: '1px solid #ef4444',
                  background: 'white',
                  color: '#ef4444',
                  cursor: 'pointer',
                  borderRadius: '2px',
                  whiteSpace: 'nowrap'
                }}
              >
                삭제
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConsultationCard;
