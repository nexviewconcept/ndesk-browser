import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorageManager } from '../services/StorageManager';

const TabContext = createContext();

export const TabProvider = ({ children }) => {
  const [tabs, setTabs] = useState([
    {
      id: '1',
      url: 'about:blank',
      title: 'New Tab',
      canGoBack: false,
      canGoForward: false,
      isIncognito: false
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load tabs on startup
  useEffect(() => {
    const loadTabs = async () => {
      try {
        const savedTabs = await StorageManager.get('ndesk_open_tabs', null);
        const savedActiveId = await StorageManager.get('ndesk_active_tab_id', null);
        if (savedTabs && savedTabs.length > 0) {
          setTabs(savedTabs);
          if (savedActiveId && savedTabs.some(t => t.id === savedActiveId)) {
            setActiveTabId(savedActiveId);
          } else {
            setActiveTabId(savedTabs[0].id);
          }
        }
      } catch (e) {
        console.error('Error restoring tabs:', e);
      } finally {
        setHasLoaded(true);
      }
    };
    loadTabs();
  }, []);

  // Save tabs on state changes
  useEffect(() => {
    if (!hasLoaded) return;
    const saveState = async () => {
      try {
        const normalTabs = tabs.filter(t => !t.isIncognito);
        if (normalTabs.length > 0) {
          await StorageManager.save('ndesk_open_tabs', normalTabs);
          const activeTabObj = tabs.find(t => t.id === activeTabId);
          if (activeTabObj && !activeTabObj.isIncognito) {
            await StorageManager.save('ndesk_active_tab_id', activeTabId);
          } else {
            await StorageManager.save('ndesk_active_tab_id', normalTabs[0].id);
          }
        } else {
          await StorageManager.remove('ndesk_open_tabs');
          await StorageManager.remove('ndesk_active_tab_id');
        }
      } catch (e) {
        console.error('Error saving tabs state:', e);
      }
    };
    saveState();
  }, [tabs, activeTabId, hasLoaded]);

  /**
   * Adds a new browser tab and sets it as active.
   */
  const addTab = (url = 'about:blank', isIncognito = false) => {
    const newId = Date.now().toString();
    const newTab = {
      id: newId,
      url,
      title: isIncognito ? 'Private Tab' : 'New Tab',
      canGoBack: false,
      canGoForward: false,
      isIncognito
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    return newId;
  };

  /**
   * Closes an existing tab. Resets state if it was the last tab.
   */
  const closeTab = (id) => {
    if (tabs.length === 1) {
      // Keep at least one tab open
      const newId = Date.now().toString();
      setTabs([
        {
          id: newId,
          url: 'https://www.google.com',
          title: 'New Tab',
          canGoBack: false,
          canGoForward: false,
          isIncognito: false
        }
      ]);
      setActiveTabId(newId);
      return;
    }

    const index = tabs.findIndex(t => t.id === id);
    const filteredTabs = tabs.filter(t => t.id !== id);
    setTabs(filteredTabs);

    if (activeTabId === id) {
      const nextActiveIndex = index > 0 ? index - 1 : 0;
      setActiveTabId(filteredTabs[nextActiveIndex].id);
    }
  };

  /**
   * Updates WebView state attributes for a specific tab.
   */
  const updateTabState = (id, updates) => {
    setTabs(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const [isIncognitoUnlocked, setIncognitoUnlocked] = useState(false);

  // If the active tab changes to a normal tab, we lock the incognito session
  // This satisfies "Authentication MUST happen when switching normal -> existing incognito tab"
  useEffect(() => {
    if (activeTab && !activeTab.isIncognito && isIncognitoUnlocked) {
      setIncognitoUnlocked(false);
    }
  }, [activeTab?.isIncognito]);

  return (
    <TabContext.Provider
      value={{
        tabs,
        activeTabId,
        activeTab,
        addTab,
        closeTab,
        updateTabState,
        setActiveTabId,
        isIncognitoUnlocked,
        setIncognitoUnlocked
      }}
    >
      {children}
    </TabContext.Provider>
  );
};

export const useTabs = () => useContext(TabContext);
export default TabContext;
