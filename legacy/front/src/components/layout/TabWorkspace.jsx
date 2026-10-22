import React from 'react';
import { X, Plus, MoreHorizontal } from 'lucide-react';
import { useTabStore } from '../../stores/tabStore';

const TabWorkspace = () => {
  const {
    tabs,
    activeTabId,
    splitView,
    splitTabs,
    setActiveTab,
    removeTab,
    setSplitView,
    setSplitTabs,
  } = useTabStore();

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
  };

  const handleTabClose = (e) => {
    e.stopPropagation();
    removeTab(tabId);
  };

  const handleSplitView = (tabId) => {
    if (!splitView) {
      setSplitView(true);
      setSplitTabs(activeTabId, tabId);
    } else {
      setSplitView(false);
      setSplitTabs(null, null);
    }
  };

  if (tabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <Plus className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">열린 탭이 없습니다</h3>
          <p className="text-gray-500">사이드바에서 메뉴를 선택하여 새 탭을 열어보세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Tab Bar */}
      <div className="flex items-center bg-gray-100 border-b border-gray-200 px-2">
        <div className="flex-1 flex items-center space-x-1 overflow-x-auto scrollbar-thin">
          {tabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`group flex items-center px-3 py-2 min-w-0 cursor-pointer border-b-2 transition-colors ${
                tab.id === activeTabId
                  ? 'bg-white border-primary-500 text-primary-700'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="truncate text-sm font-medium mr-2">{tab.title}</span>
              {tab.hasChanges && (
                <div className="w-2 h-2 bg-orange-400 rounded-full mr-1" />
              )}
              {tab.canClose && (
                <button
                  onClick={(e) => handleTabClose(e, tab.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Tab Actions */}
        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={() => setSplitView(!splitView)}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
              splitView ? 'bg-primary-100 text-primary-700' : 'text-gray-600'
            }`}
            title="분할 보기"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {splitView && splitTabs.left && splitTabs.right ? (
          <div className="flex h-full">
            <div className="flex-1 border-r border-gray-200">
              {tabs.find(tab => tab.id === splitTabs.left)?.component &&
                React.createElement(tabs.find(tab => tab.id === splitTabs.left).component)
              }
            </div>
            <div className="flex-1">
              {tabs.find(tab => tab.id === splitTabs.right)?.component &&
                React.createElement(tabs.find(tab => tab.id === splitTabs.right).component)
              }
            </div>
          </div>
        ) : (
          <div className="h-full">
            {activeTab?.component && React.createElement(activeTab.component)}
          </div>
        )}
      </div>
    </div>
  );
};

export default TabWorkspace;