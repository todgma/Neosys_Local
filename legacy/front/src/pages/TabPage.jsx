import React from 'react';
import { useParams } from 'react-router-dom';
import PropertyGrid from '../components/PropertyGrid';

const TabPage = () => {
  const { tabId } = useParams();

  const renderTabContent = (tabId) => {
    switch (tabId) {
      case 'property-status':
        return <PropertyGrid />;
      case 'property-register':
        return (
          <div style={{ padding: '2rem', height: '100%' }}>
            <h2>물건등록</h2>
            <p>물건 등록 폼이 여기에 표시됩니다.</p>
          </div>
        );
      case 'contract-list':
        return (
          <div style={{ padding: '2rem', height: '100%' }}>
            <h2>계약목록</h2>
            <p>계약 목록이 여기에 표시됩니다.</p>
          </div>
        );
      case 'contract-register':
        return (
          <div style={{ padding: '2rem', height: '100%' }}>
            <h2>계약등록</h2>
            <p>계약 등록 폼이 여기에 표시됩니다.</p>
          </div>
        );
      case 'employee-list':
        return (
          <div style={{ padding: '2rem', height: '100%' }}>
            <h2>직원목록</h2>
            <p>직원 목록이 여기에 표시됩니다.</p>
          </div>
        );
      case 'consultation-list':
        return (
          <div style={{ padding: '2rem', height: '100%' }}>
            <h2>상담목록</h2>
            <p>상담 목록이 여기에 표시됩니다.</p>
          </div>
        );
      default:
        return (
          <div style={{ padding: '2rem', height: '100%' }}>
            <h2>알 수 없는 탭</h2>
            <p>탭 ID: {tabId}</p>
          </div>
        );
    }
  };

  return (
    <div style={{
      height: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard Variable", Pretendard, Roboto, "Noto Sans KR", "Segoe UI", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif'
    }}>
      {/* 탭 컨텐츠 */}
      <div style={{ height: '100vh', overflow: 'hidden' }}>
        {renderTabContent(tabId)}
      </div>
    </div>
  );
};

const getTabTitle = (tabId) => {
  const titles = {
    'property-status': '물건현황',
    'property-register': '물건등록',
    'contract-list': '계약목록',
    'contract-register': '계약등록',
    'employee-list': '직원목록',
    'consultation-list': '상담목록'
  };
  return titles[tabId] || '알 수 없는 탭';
};

export default TabPage;