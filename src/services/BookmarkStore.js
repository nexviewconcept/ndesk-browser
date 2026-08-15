import { DatabaseManager } from './DatabaseManager';
import { StorageManager } from './StorageManager';

const BOOKMARKS_LEGACY_KEY = 'ndesk_bookmarks';

export const BookmarkStore = {
  /**
   * Migrate bookmarks from SecureStore to SQLite
   */
  async _migrateLegacyData() {
    try {
      const legacyData = await StorageManager.get(BOOKMARKS_LEGACY_KEY, null);
      if (legacyData && Array.isArray(legacyData)) {
        console.log(`Migrating ${legacyData.length} bookmarks to SQLite...`);
        for (const b of legacyData) {
          await DatabaseManager.runAsync(
            `INSERT OR IGNORE INTO bookmarks (id, title, url, folder, isSystem, isDeletable, isEditable, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [b.id, b.title || b.url, b.url, b.folder || 'Bookmarks', b.isSystem ? 1 : 0, b.isDeletable === false ? 0 : 1, b.isEditable === false ? 0 : 1, b.createdAt || new Date().toISOString()]
          );
        }
        await StorageManager.remove(BOOKMARKS_LEGACY_KEY); // Verify success then delete
      }
    } catch (e) {
      console.error('Bookmark migration failed:', e);
    }
  },

  async _ensureSystemBookmarks() {
    const systemBookmarks = [
      {
        id: 'default_nexview',
        title: 'Nexview Concept Limited',
        url: 'https://nexviewconcept.com.ng',
        folder: 'Bookmarks',
        isSystem: 1,
        isDeletable: 0,
        isEditable: 0,
        createdAt: new Date().toISOString()
      },
      {
        id: 'default_openskills',
        title: 'OpenSkills Academy',
        url: 'https://openskillsacademy.org',
        folder: 'Bookmarks',
        isSystem: 1,
        isDeletable: 0,
        isEditable: 0,
        createdAt: new Date().toISOString()
      }
    ];

    for (const b of systemBookmarks) {
      const existing = await DatabaseManager.getFirstAsync(`SELECT id FROM bookmarks WHERE id = ? OR url = ?`, [b.id, b.url]);
      if (!existing) {
        await DatabaseManager.runAsync(
          `INSERT INTO bookmarks (id, title, url, folder, isSystem, isDeletable, isEditable, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [b.id, b.title, b.url, b.folder, b.isSystem, b.isDeletable, b.isEditable, b.createdAt]
        );
      } else {
        // Enforce protection flags
        await DatabaseManager.runAsync(
          `UPDATE bookmarks SET isSystem = 1, isDeletable = 0, isEditable = 0 WHERE id = ? OR url = ?`,
          [b.id, b.url]
        );
      }
    }
  },

  async getBookmarks() {
    await this._migrateLegacyData();
    await this._ensureSystemBookmarks();
    const rows = await DatabaseManager.getAllAsync(`SELECT * FROM bookmarks ORDER BY createdAt DESC`);
    return rows.map(r => ({
      ...r,
      isSystem: Boolean(r.isSystem),
      isDeletable: Boolean(r.isDeletable),
      isEditable: Boolean(r.isEditable)
    }));
  },

  async addBookmark(title, url, folder = 'Bookmarks') {
    if (!url) return false;
    
    const existing = await DatabaseManager.getFirstAsync(`SELECT id FROM bookmarks WHERE url = ?`, [url]);
    if (existing) return false;

    const newBookmark = {
      id: Date.now().toString(),
      title: title || url,
      url,
      folder,
      createdAt: new Date().toISOString()
    };

    await DatabaseManager.runAsync(
      `INSERT INTO bookmarks (id, title, url, folder, isSystem, isDeletable, isEditable, createdAt) VALUES (?, ?, ?, ?, 0, 1, 1, ?)`,
      [newBookmark.id, newBookmark.title, newBookmark.url, newBookmark.folder, newBookmark.createdAt]
    );
    return newBookmark;
  },

  async deleteBookmark(id) {
    // Hard block for core system bookmarks at the database layer
    if (id === 'default_nexview' || id === 'default_openskills') {
      console.warn("CRITICAL: Attempted to delete an immutable system bookmark.");
      return false;
    }

    const existing = await DatabaseManager.getFirstAsync(`SELECT isDeletable FROM bookmarks WHERE id = ?`, [id]);
    if (existing && existing.isDeletable === 0) {
      console.warn("Attempted to delete a protected system bookmark.");
      return false; // Cannot delete protected bookmarks
    }
    await DatabaseManager.runAsync(`DELETE FROM bookmarks WHERE id = ?`, [id]);
    return true;
  },

  async toggleBookmark(title, url) {
    const existing = await DatabaseManager.getFirstAsync(`SELECT id FROM bookmarks WHERE url = ?`, [url]);
    if (existing) {
      await this.deleteBookmark(existing.id);
      return false;
    } else {
      await this.addBookmark(title, url);
      return true;
    }
  },

  async isBookmarked(url) {
    if (!url) return false;
    const existing = await DatabaseManager.getFirstAsync(`SELECT id FROM bookmarks WHERE url = ?`, [url]);
    return !!existing;
  }
};
