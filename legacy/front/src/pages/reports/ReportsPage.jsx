import React, { useEffect } from 'react';
import Card from '../../components/ui/Card';

const ReportsPage= () => {
  // 페이지 타이틀 설정
  useEffect(() => {
    document.title = '네오시스 - 통계/분석';
  }, []);
  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <Card.Content>
        <div className="text-center py-12">
          <p className="text-gray-500">보고서 페이지가 곧 추가될 예정입니다.</p>
        </div>
      </Card.Content>
    </div>
  );
};

export default ReportsPage;