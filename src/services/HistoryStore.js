import { StorageManager } from './StorageManager';

const HISTORY_KEY = 'ndesk_history';

export const HistoryStore = {
  /**
   * Retrieves full browsing history.
   */
  async getHistory() {
    return await StorageManager.get(HISTORY_KEY, []);
  },

  /**
   * Adds a new entry to the browsing history, moving duplicates to the top.
   */
  async addHistoryItem(title, url) {
    if (!url || url === 'about:blank') return null;

    let history = await this.getHistory();
    
    // Remove duplicate entry to bump to top
    history = history.filter(item => item.url.toLowerCase() !== url.toLowerCase());

    const newItem = {
      id: Date.now().toString(),
      title: title || url,
      url,
      timestamp: new Date().toISOString()
    };

    history.unshift(newItem);

    // Limit history size to 200 items
    if (history.length > 200) {
      history = history.slice(0, 200);
    }

    await StorageManager.save(HISTORY_KEY, history);
    return newItem;
  },

  /**
   * Clears all history.
   */
  async clearHistory() {
    await StorageManager.save(HISTORY_KEY, []);
    return true;
  }
};
