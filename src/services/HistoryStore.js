import { DatabaseManager } from './DatabaseManager';
import { StorageManager } from './StorageManager';

const HISTORY_LEGACY_KEY = 'ndesk_history';

export const HistoryStore = {
  /**
   * Migrate history from SecureStore to SQLite
   */
  async _migrateLegacyData() {
    try {
      const legacyData = await StorageManager.get(HISTORY_LEGACY_KEY, null);
      if (legacyData && Array.isArray(legacyData)) {
        console.log(`Migrating ${legacyData.length} history items to SQLite...`);
        for (const h of legacyData) {
          await DatabaseManager.runAsync(
            `INSERT OR IGNORE INTO history (id, title, url, timestamp) VALUES (?, ?, ?, ?)`,
            [h.id, h.title || h.url, h.url, h.timestamp || new Date().toISOString()]
          );
        }
        await StorageManager.remove(HISTORY_LEGACY_KEY); // Verify success then delete
      }
    } catch (e) {
      console.error('History migration failed:', e);
    }
  },

  /**
   * Retrieves full browsing history.
   */
  async getHistory() {
    await this._migrateLegacyData();
    return await DatabaseManager.getAllAsync(`SELECT * FROM history ORDER BY timestamp DESC LIMIT 200`);
  },

  /**
   * Adds a new entry to the browsing history, moving duplicates to the top.
   */
  async addHistoryItem(title, url) {
    if (!url || url === 'about:blank') return null;

    // Delete existing entry for this URL to bump it to top
    await DatabaseManager.runAsync(`DELETE FROM history WHERE url = ?`, [url]);

    const newItem = {
      id: Date.now().toString(),
      title: title || url,
      url,
      timestamp: new Date().toISOString()
    };

    await DatabaseManager.runAsync(
      `INSERT INTO history (id, title, url, timestamp) VALUES (?, ?, ?, ?)`,
      [newItem.id, newItem.title, newItem.url, newItem.timestamp]
    );

    // Keep history trimmed to 200 items (SQLite handles this via a simple subquery delete or we can just fetch limits)
    await DatabaseManager.runAsync(`
      DELETE FROM history WHERE id NOT IN (
        SELECT id FROM history ORDER BY timestamp DESC LIMIT 200
      )
    `);

    return newItem;
  },

  /**
   * Clears all history.
   */
  async clearHistory() {
    await DatabaseManager.runAsync(`DELETE FROM history`);
    return true;
  }
};
