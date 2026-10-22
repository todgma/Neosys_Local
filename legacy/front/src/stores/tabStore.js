import { create } from 'zustand';



export const useTabStore = create((set, get) => ({
  tabs: [],
  activeTabId: null,
  splitView: false,
  splitTabs: {
    left: null,
    right: null,
  },

  addTab: (tabData) => {
    const { tabs } = get();
    const newTabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 기존 탭 중 같은 경로가 있는지 확인
    const existingTab = tabs.find(tab => tab.path === tabData.path);
    if (existingTab) {
      set({ activeTabId: existingTab.id });
      return;
    }

    const newTab: TabItem = {
      ...tabData,
      id: newTabId,
      isActive: true,
    };

    set({
      tabs: tabs.map(tab => ({ ...tab, isActive: false })).concat(newTab),
      activeTabId: newTabId,
    });
  },

  removeTab: (tabId) => {
    const { tabs, activeTabId, splitView, splitTabs } = get();
    const updatedTabs = tabs.filter(tab => tab.id !== tabId);

    let newActiveTabId = activeTabId;
    if (activeTabId === tabId && updatedTabs.length > 0) {
      const removedTabIndex = tabs.findIndex(tab => tab.id === tabId);
      const newIndex = Math.min(removedTabIndex, updatedTabs.length - 1);
      newActiveTabId = updatedTabs[newIndex]?.id || null;
    } else if (updatedTabs.length === 0) {
      newActiveTabId = null;
    }

    // 분할 뷰에서 탭이 제거될 경우 처리
    let newSplitTabs = splitTabs;
    if (splitView && (splitTabs.left === tabId || splitTabs.right === tabId)) {
      newSplitTabs = {
        left: splitTabs.left === tabId ? null : splitTabs.left,
        right: splitTabs.right === tabId ? null : splitTabs.right,
      };
    }

    set({
      tabs: updatedTabs.map(tab => ({
        ...tab,
        isActive: tab.id === newActiveTabId,
      })),
      activeTabId: newActiveTabId,
      splitTabs: newSplitTabs,
    });
  },

  setActiveTab: (tabId) => {
    const { tabs } = get();
    set({
      tabs: tabs.map(tab => ({ ...tab, isActive: tab.id === tabId })),
      activeTabId: tabId,
    });
  },

  updateTab: (tabId, updates) => {
    const { tabs } = get();
    set({
      tabs: tabs.map(tab =>
        tab.id === tabId ? { ...tab, ...updates } : tab
      ),
    });
  },

  setSplitView: (enabled) => {
    set({ splitView: enabled });
    if (!enabled) {
      set({ splitTabs: { left: null, right: null } });
    }
  },

  setSplitTabs: (left, right) => {
    set({ splitTabs: { left, right } });
  },

  moveTab: (fromIndex, toIndex) => {
    const { tabs } = get();
    const newTabs = [...tabs];
    const [movedTab] = newTabs.splice(fromIndex, 1);
    newTabs.splice(toIndex, 0, movedTab);
    set({ tabs: newTabs });
  },

  duplicateTab: (tabId) => {
    const { tabs } = get();
    const tabToDuplicate = tabs.find(tab => tab.id === tabId);
    if (tabToDuplicate) {
      const newTabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const duplicatedTab: TabItem = {
        ...tabToDuplicate,
        id: newTabId,
        title: `${tabToDuplicate.title} (복사)`,
        hasChanges: false,
      };

      set({
        tabs: tabs.map(tab => ({ ...tab, isActive: false })).concat(duplicatedTab),
        activeTabId: newTabId,
      });
    }
  },

  closeAllTabs: () => {
    set({
      tabs: [],
      activeTabId: null,
      splitView: false,
      splitTabs: { left: null, right: null },
    });
  },

  closeOtherTabs: (tabId) => {
    const { tabs } = get();
    const tabToKeep = tabs.find(tab => tab.id === tabId);
    if (tabToKeep) {
      set({
        tabs: [{ ...tabToKeep, isActive: true }],
        activeTabId: tabId,
        splitView: false,
        splitTabs: { left: null, right: null },
      });
    }
  },
}));