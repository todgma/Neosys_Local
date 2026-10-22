import { useState, useEffect, useRef } from 'react';
import { X, Search, User, Building, Calendar, MessageSquare, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

const NeobotModal = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    customers: [],
    properties: [],
    consultations: []
  });
  const [selectedTab, setSelectedTab] = useState('all'); // all, customer, property, consultation
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults({ customers: [], properties: [], consultations: [] });
      return;
    }

    setIsSearching(true);
    try {
      // TODO: API 연동 필요
      // 임시 데이터
      setTimeout(() => {
        setSearchResults({
          customers: [
            { id: 1, name: '홍길동', phone: '010-3333-7777', type: 'customer' },
            { id: 2, name: '김철수', phone: '010-1234-5678', type: 'customer' }
          ],
          properties: [
            { id: 1, address: '경기도 남양주시 다산동 지산엠앤홈스위트아파트', type: 'property', memo: '3층, 남향' },
            { id: 2, address: '서울시 강남구 역삼동 123번지', type: 'property', memo: '신축, 전용 84㎡' }
          ],
          consultations: [
            { id: 1, customerName: '홍길동', date: '2026-03-03', type: 'consultation', status: '내방' },
            { id: 2, customerName: '김철수', date: '2026-04-04', type: 'consultation', status: '통화' }
          ]
        });
        setIsSearching(false);
      }, 300);
    } catch (error) {
      console.error('검색 실패:', error);
      toast.error('검색에 실패했습니다.');
      setIsSearching(false);
    }
  };

  const handleQuickAction = async (actionType) => {
    if (window.electronAPI) {
      try {
        let config = {};
        switch (actionType) {
          case 'property':
            config = {
              tabId: 'property-new',
              title: '물건 등록',
              content: 'properties/new',
              route: '/properties/new'
            };
            break;
          case 'customer':
            config = {
              tabId: 'customer-new',
              title: '고객 등록',
              content: 'customers/new',
              route: '/customers/new'
            };
            break;
          case 'schedule':
            config = {
              tabId: 'schedule',
              title: '일정관리',
              content: 'schedule',
              route: '/schedule'
            };
            break;
        }
        await window.electronAPI.openTabInWindow(config);
      } catch (error) {
        console.error('Failed to open window:', error);
        toast.error('창 열기에 실패했습니다.');
      }
    }
  };

  const handleResultClick = (result, type) => {
    // TODO: 각 결과 클릭시 상세 페이지 이동
    console.log('Result clicked:', type, result);
    toast.info(`${type} 상세 페이지 이동 예정`);
  };

  const getFilteredResults = () => {
    if (selectedTab === 'all') {
      return {
        customers: searchResults.customers,
        properties: searchResults.properties,
        consultations: searchResults.consultations
      };
    } else if (selectedTab === 'customer') {
      return { customers: searchResults.customers, properties: [], consultations: [] };
    } else if (selectedTab === 'property') {
      return { customers: [], properties: searchResults.properties, consultations: [] };
    } else if (selectedTab === 'consultation') {
      return { customers: [], properties: [], consultations: searchResults.consultations };
    }
  };

  const filteredResults = getFilteredResults();
  const totalCount = searchResults.customers.length + searchResults.properties.length + searchResults.consultations.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-2xl" style={{ width: '400px', height: '700px', display: 'flex', flexDirection: 'column' }}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-500">
          <h2 className="text-lg font-bold text-white">네오봇</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 빠른 업무 버튼 */}
        <div className="flex gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
          <button
            onClick={() => handleQuickAction('property')}
            className="flex-1 px-3 py-2 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <Building className="w-4 h-4" />
            물건관리 등록/수정
          </button>
          <button
            onClick={() => handleQuickAction('customer')}
            className="flex-1 px-3 py-2 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <User className="w-4 h-4" />
            고객관리 등록/수정
          </button>
          <button
            onClick={() => handleQuickAction('schedule')}
            className="flex-1 px-3 py-2 text-xs font-medium text-white bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <Calendar className="w-4 h-4" />
            일정관리
          </button>
        </div>

        {/* 검색창 */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              placeholder="고객, 물건, 상담 통합 검색..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-200 px-4">
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            전체 {totalCount > 0 && `(${totalCount})`}
          </button>
          <button
            onClick={() => setSelectedTab('customer')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === 'customer'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            고객 {searchResults.customers.length > 0 && `(${searchResults.customers.length})`}
          </button>
          <button
            onClick={() => setSelectedTab('property')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === 'property'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            물건 {searchResults.properties.length > 0 && `(${searchResults.properties.length})`}
          </button>
          <button
            onClick={() => setSelectedTab('consultation')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === 'consultation'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            상담 {searchResults.consultations.length > 0 && `(${searchResults.consultations.length})`}
          </button>
        </div>

        {/* 검색 결과 */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isSearching ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 text-sm">검색 중...</div>
            </div>
          ) : !searchQuery ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Search className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">검색어를 입력하세요</p>
              <p className="text-xs mt-1">고객, 물건, 상담 내역을 검색할 수 있습니다</p>
            </div>
          ) : totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Search className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">검색 결과가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 고객 결과 */}
              {filteredResults.customers.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    고객 ({filteredResults.customers.length})
                  </h3>
                  <div className="space-y-2">
                    {filteredResults.customers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => handleResultClick(customer, '고객')}
                        className="p-3 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors border border-blue-200"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{customer.name}</p>
                            <p className="text-xs text-gray-600">{customer.phone}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 물건 결과 */}
              {filteredResults.properties.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    물건 ({filteredResults.properties.length})
                  </h3>
                  <div className="space-y-2">
                    {filteredResults.properties.map((property) => (
                      <div
                        key={property.id}
                        onClick={() => handleResultClick(property, '물건')}
                        className="p-3 bg-green-50 hover:bg-green-100 rounded-lg cursor-pointer transition-colors border border-green-200"
                      >
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-green-600" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{property.address}</p>
                            {property.memo && (
                              <p className="text-xs text-gray-600">{property.memo}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 상담 결과 */}
              {filteredResults.consultations.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    상담 ({filteredResults.consultations.length})
                  </h3>
                  <div className="space-y-2">
                    {filteredResults.consultations.map((consultation) => (
                      <div
                        key={consultation.id}
                        onClick={() => handleResultClick(consultation, '상담')}
                        className="p-3 bg-purple-50 hover:bg-purple-100 rounded-lg cursor-pointer transition-colors border border-purple-200"
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-purple-600" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-gray-900">{consultation.customerName}</p>
                              <span className="text-xs px-2 py-0.5 bg-purple-200 text-purple-800 rounded">{consultation.status}</span>
                            </div>
                            <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {consultation.date}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NeobotModal;
