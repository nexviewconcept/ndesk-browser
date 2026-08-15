import React, { createContext, useContext, useState, useEffect } from 'react';
import { DatabaseManager } from '../services/DatabaseManager';
import { PreferenceStorage } from '../services/StorageManager';

const TabContext = createContext();

export const TabProvider = ({ children }) => {
  const [tabs, setTabs] = useState([
    {
      id: '1',
      url: 'about:blank',
      title: 'New Tab',
      canGoBack: false,
      canGoForward: false,
      isIncognito: false,
      groupId: null
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [tabGroups, setTabGroups] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load tabs on startup
  useEffect(() => {
    const loadTabs = async () => {
      try {
        const savedTabs = await DatabaseManager.getAllAsync(`SELECT * FROM tabs WHERE isIncognito = 0 ORDER BY createdAt ASC`);
        const savedGroups = await DatabaseManager.getAllAsync(`SELECT * FROM tab_groups ORDER BY createdAt ASC`);
        const savedActiveId = await PreferenceStorage.get('ndesk_active_tab_id', null);
        
        if (savedGroups && savedGroups.length > 0) {
          setTabGroups(savedGroups);
        }

        if (savedTabs && savedTabs.length > 0) {
          const parsedTabs = savedTabs.map(t => ({
            ...t,
            canGoBack: Boolean(t.canGoBack),
            canGoForward: Boolean(t.canGoForward),
            isIncognito: Boolean(t.isIncognito)
          }));
          setTabs(parsedTabs);
          if (savedActiveId && parsedTabs.some(t => t.id === savedActiveId)) {
            setActiveTabId(savedActiveId);
          } else {
            setActiveTabId(parsedTabs[0].id);
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
          // In a real app we'd update/insert specifically, for simplicity here we just replace them.
          // Since tabs are small, we can just delete all normal tabs and re-insert them.
          await DatabaseManager.runAsync(`DELETE FROM tabs WHERE isIncognito = 0`);
          for (const t of normalTabs) {
            await DatabaseManager.runAsync(
              `INSERT INTO tabs (id, url, title, canGoBack, canGoForward, isIncognito, groupId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
              [t.id, t.url, t.title, t.canGoBack ? 1 : 0, t.canGoForward ? 1 : 0, t.groupId || null, new Date().toISOString(), new Date().toISOString()]
            );
          }

          const activeTabObj = tabs.find(t => t.id === activeTabId);
          if (activeTabObj && !activeTabObj.isIncognito) {
            await PreferenceStorage.save('ndesk_active_tab_id', activeTabId);
          } else {
            await PreferenceStorage.save('ndesk_active_tab_id', normalTabs[0].id);
          }
        } else {
          await DatabaseManager.runAsync(`DELETE FROM tabs WHERE isIncognito = 0`);
          await PreferenceStorage.remove('ndesk_active_tab_id');
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
  const addTab = (url = 'about:blank', isIncognito = false, groupId = null) => {
    const newId = Date.now().toString();
    const newTab = {
      id: newId,
      url,
      title: isIncognito ? 'Private Tab' : 'New Tab',
      canGoBack: false,
      canGoForward: false,
      isIncognito,
      groupId
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    return newId;
  };

  /**
   * Creates a new Tab Group and assigns currently active tab to it.
   */
  const createTabGroup = async (name) => {
    const groupId = Date.now().toString();
    const newGroup = {
      id: groupId,
      name,
      tabIds: JSON.stringify([activeTabId]),
      isPrivate: activeTab?.isIncognito ? 1 : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setTabGroups(prev => [...prev, newGroup]);
    updateTabState(activeTabId, { groupId });

    await DatabaseManager.runAsync(
      `INSERT INTO tab_groups (id, name, tabIds, isPrivate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [newGroup.id, newGroup.name, newGroup.tabIds, newGroup.isPrivate, newGroup.createdAt, newGroup.updatedAt]
    );
    return groupId;
  };

  /**
   * Deletes a Tab Group (un-groups tabs).
   */
  const deleteTabGroup = async (groupId) => {
    setTabGroups(prev => prev.filter(g => g.id !== groupId));
    setTabs(prev => prev.map(t => t.groupId === groupId ? { ...t, groupId: null } : t));
    await DatabaseManager.runAsync(`DELETE FROM tab_groups WHERE id = ?`, [groupId]);
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
        tabGroups,
        activeTabId,
        activeTab,
        addTab,
        closeTab,
        updateTabState,
        setActiveTabId,
        createTabGroup,
        deleteTabGroup,
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
