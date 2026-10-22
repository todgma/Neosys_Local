import { MessageSquare } from 'lucide-react';

/**
 * 네오봇 전용 상담이력 표시(읽기전용) — 공용 ConsultationCard 와 분리된 복사본.
 *  props: consultations [{ itvNo, datetime, userId, content }]
 */
const NeobotConsultationList = ({ consultations = [], maxHeight = 260 }) => {
  return (
    <div style={{ border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 10px', background: '#f1f5f9', borderBottom: '1px solid #d1d5db',
      }}>
        <MessageSquare size={15} color="#2563eb" />
        <span style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>상담이력</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>{consultations.length}건</span>
      </div>

      {consultations.length === 0 ? (
        <div style={{ padding: '18px 10px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#475569' }}>
          상담이력이 없습니다
        </div>
      ) : (
        <div style={{ maxHeight, overflowY: 'auto' }}>
          {consultations.map((c, idx) => (
            <div
              key={c.itvNo ?? idx}
              style={{
                padding: '8px 10px',
                borderBottom: idx === consultations.length - 1 ? 'none' : '1px solid #e5e7eb',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{c.datetime || '-'}</span>
                {c.userId && (
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#2563eb' }}>{c.userId}</span>
                )}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                {c.content || '-'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NeobotConsultationList;
