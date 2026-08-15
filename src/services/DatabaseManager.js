import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';
let dbInstance = null;

export const DatabaseManager = {
  /**
   * Initializes the SQLite database and creates the necessary tables.
   */
  async initDb() {
    if (isWeb) {
      console.warn('SQLite is not supported on web. Falling back to in-memory/localStorage structures if necessary.');
      return;
    }
    
    if (dbInstance) return;

    try {
      dbInstance = await SQLite.openDatabaseAsync('ndesk_browser.db');

      // Create Bookmarks Table
      await dbInstance.execAsync(`
        CREATE TABLE IF NOT EXISTS bookmarks (
          id TEXT PRIMARY KEY,
          title TEXT,
          url TEXT,
          folder TEXT,
          isSystem INTEGER DEFAULT 0,
          isDeletable INTEGER DEFAULT 1,
          isEditable INTEGER DEFAULT 1,
          createdAt TEXT
        );
      `);

      // Create History Table
      await dbInstance.execAsync(`
        CREATE TABLE IF NOT EXISTS history (
          id TEXT PRIMARY KEY,
          title TEXT,
          url TEXT,
          timestamp TEXT
        );
      `);

      // Create Credentials Table (Encrypted payloads)
      await dbInstance.execAsync(`
        CREATE TABLE IF NOT EXISTS credentials (
          id TEXT PRIMARY KEY,
          origin TEXT,
          username TEXT,
          encryptedPassword TEXT,
          title TEXT,
          createdAt TEXT,
          updatedAt TEXT,
          lastUsedAt TEXT
        );
      `);
      
      // Create Tabs Table
      await dbInstance.execAsync(`
        CREATE TABLE IF NOT EXISTS tabs (
          id TEXT PRIMARY KEY,
          url TEXT,
          title TEXT,
          canGoBack INTEGER DEFAULT 0,
          canGoForward INTEGER DEFAULT 0,
          isIncognito INTEGER DEFAULT 0,
          groupId TEXT,
          createdAt TEXT,
          updatedAt TEXT
        );
      `);
      
      // Create Tab Groups Table
      await dbInstance.execAsync(`
        CREATE TABLE IF NOT EXISTS tab_groups (
          id TEXT PRIMARY KEY,
          name TEXT,
          tabIds TEXT,
          isPrivate INTEGER DEFAULT 0,
          createdAt TEXT,
          updatedAt TEXT
        );
      `);
    } catch (e) {
      console.error('Database initialization failed:', e);
    }
  },

  /**
   * Returns the active database connection.
   */
  async getDb() {
    if (!dbInstance) {
      await this.initDb();
    }
    return dbInstance;
  },

  /**
   * Executes a single write query (INSERT, UPDATE, DELETE).
   */
  async runAsync(sql, params = []) {
    if (isWeb) return null;
    try {
      const db = await this.getDb();
      return await db.runAsync(sql, params);
    } catch (e) {
      console.error('SQLite Run Error:', e, sql);
      throw e;
    }
  },

  /**
   * Fetches multiple rows (SELECT).
   */
  async getAllAsync(sql, params = []) {
    if (isWeb) return [];
    try {
      const db = await this.getDb();
      return await db.getAllAsync(sql, params);
    } catch (e) {
      console.error('SQLite GetAll Error:', e, sql);
      throw e;
    }
  },

  /**
   * Fetches a single row (SELECT LIMIT 1).
   */
  async getFirstAsync(sql, params = []) {
    if (isWeb) return null;
    try {
      const db = await this.getDb();
      return await db.getFirstAsync(sql, params);
    } catch (e) {
      console.error('SQLite GetFirst Error:', e, sql);
      throw e;
    }
  }
};
