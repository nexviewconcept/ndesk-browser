import { DatabaseManager } from './DatabaseManager';
import { SecureStorage } from './StorageManager';
import * as Crypto from 'expo-crypto';
// NOTE: expo-crypto in SDK 51+ provides global.crypto and crypto.subtle.
// If unavailable, this will correctly fail the runtime audit.

const LOGINS_LEGACY_KEY = 'ndesk_autofill_logins';
const CARDS_LEGACY_KEY = 'ndesk_autofill_cards';
const MASTER_KEY_STORE = 'ndesk_master_encryption_key';

/**
 * Helper to get the WebCrypto API
 */
const getSubtleCrypto = () => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto.subtle;
  }
  throw new Error("CRITICAL SECURITY BLOCKER: Web Crypto API (AES-GCM) is not supported in this runtime. Authenticated encryption failed.");
};

export const AutofillStore = {
  /**
   * Retrieves or generates the AES-GCM Master Encryption Key.
   */
  async getMasterKey() {
    let keyStr = await SecureStorage.get(MASTER_KEY_STORE, null);
    const subtle = getSubtleCrypto();
    
    if (!keyStr) {
      // Generate a strong random 256-bit key for AES-GCM
      const key = await subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );
      // Export to raw for SecureStore
      const exported = await subtle.exportKey("raw", key);
      const exportedBase64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
      await SecureStorage.save(MASTER_KEY_STORE, exportedBase64);
      return key;
    } else {
      // Import from SecureStore
      const binaryString = atob(keyStr);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return await subtle.importKey(
        "raw",
        bytes.buffer,
        { name: "AES-GCM" },
        true,
        ["encrypt", "decrypt"]
      );
    }
  },

  /**
   * Encrypt plaintext using AES-GCM
   */
  async _encryptPayload(plaintext) {
    if (!plaintext) return '';
    const subtle = getSubtleCrypto();
    const key = await this.getMasterKey();
    
    // Generate unique 12-byte IV
    const iv = new Uint8Array(12);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(iv);
    } else {
      throw new Error("No secure random generator available for IV.");
    }

    const encodedPlaintext = new TextEncoder().encode(plaintext);
    const ciphertextBuffer = await subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encodedPlaintext
    );

    // Serialize: IV (base64) + ":" + CIPHERTEXT (base64)
    const ivBase64 = btoa(String.fromCharCode(...iv));
    const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)));
    return `AES-GCM:${ivBase64}:${cipherBase64}`;
  },

  /**
   * Decrypt payload using AES-GCM (tamper detection built-in)
   */
  async _decryptPayload(payload) {
    if (!payload) return '';
    if (!payload.startsWith('AES-GCM:')) {
      throw new Error("Unsupported encryption format or unauthenticated cipher.");
    }
    
    const parts = payload.split(':');
    if (parts.length !== 3) throw new Error("Malformed ciphertext payload.");
    
    const ivBase64 = parts[1];
    const cipherBase64 = parts[2];

    const subtle = getSubtleCrypto();
    const key = await this.getMasterKey();

    const ivStr = atob(ivBase64);
    const ivBytes = new Uint8Array(ivStr.length);
    for (let i = 0; i < ivStr.length; i++) ivBytes[i] = ivStr.charCodeAt(i);

    const cipherStr = atob(cipherBase64);
    const cipherBytes = new Uint8Array(cipherStr.length);
    for (let i = 0; i < cipherStr.length; i++) cipherBytes[i] = cipherStr.charCodeAt(i);

    try {
      const decryptedBuffer = await subtle.decrypt(
        { name: "AES-GCM", iv: ivBytes },
        key,
        cipherBytes.buffer
      );
      return new TextDecoder().decode(decryptedBuffer);
    } catch (e) {
      console.error("AES-GCM Authentication Failed (Tampered or Wrong Key)");
      throw e;
    }
  },

  /**
   * Migrate legacy credentials from SecureStore to SQLite.
   * Note: In Phase 11, this is upgraded to use full AES-GCM encryption.
   */
  async _migrateLegacyData() {
    try {
      // 1. Destroy legacy payment cards (Status: Not Supported in v1.0.2)
      await SecureStorage.remove(CARDS_LEGACY_KEY);

      // 2. Migrate logins to SQLite Credentials table
      const legacyLogins = await SecureStorage.get(LOGINS_LEGACY_KEY, null);
      if (legacyLogins && Array.isArray(legacyLogins)) {
        console.log(`Migrating ${legacyLogins.length} credentials to SQLite...`);
        const masterKey = await this.getMasterKey();
        
        for (const login of legacyLogins) {
          const dbEncrypted = await this._encryptPayload(login.password || '');
          await DatabaseManager.runAsync(
            `INSERT OR IGNORE INTO credentials (id, origin, username, encryptedPassword, title, createdAt, updatedAt, lastUsedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              login.id || Date.now().toString(),
              login.domain,
              login.username,
              dbEncrypted,
              login.domain, // title defaults to domain
              login.createdAt || new Date().toISOString(),
              login.updatedAt || new Date().toISOString(),
              new Date().toISOString()
            ]
          );
        }
        await SecureStorage.remove(LOGINS_LEGACY_KEY); // Delete after successful migration
      }
    } catch (e) {
      console.error('Credential migration failed:', e);
    }
  },

  /**
   * Save a login credential linked to a domain.
   */
  async saveLogin(domain, username, password) {
    try {
      const cleanedDomain = this.cleanDomain(domain);
      const dbEncrypted = await this._encryptPayload(password);
      
      const existing = await DatabaseManager.getFirstAsync(
        `SELECT id FROM credentials WHERE origin = ? AND username = ?`, 
        [cleanedDomain, username]
      );

      if (existing) {
        await DatabaseManager.runAsync(
          `UPDATE credentials SET encryptedPassword = ?, updatedAt = ? WHERE id = ?`,
          [dbEncrypted, new Date().toISOString(), existing.id]
        );
      } else {
        const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
        await DatabaseManager.runAsync(
          `INSERT INTO credentials (id, origin, username, encryptedPassword, title, createdAt, updatedAt, lastUsedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, cleanedDomain, username, dbEncrypted, cleanedDomain, new Date().toISOString(), new Date().toISOString(), new Date().toISOString()]
        );
      }
      return true;
    } catch (e) {
      console.error('Error saving login details:', e);
      return false;
    }
  },

  /**
   * Retrieve all saved login credentials for a specific domain.
   */
  async getLoginsForDomain(domain) {
    try {
      await this._migrateLegacyData();
      const cleanedDomain = this.cleanDomain(domain);
      const rows = await DatabaseManager.getAllAsync(`SELECT * FROM credentials WHERE origin = ?`, [cleanedDomain]);
      
      // Decrypt
      const decryptedRows = [];
      for (const r of rows) {
        let plaintext = '';
        try {
          if (r.encryptedPassword.startsWith('AES-GCM:')) {
            plaintext = await this._decryptPayload(r.encryptedPassword);
          } else {
            console.warn("Skipping unauthenticated credential.");
          }
          decryptedRows.push({
            ...r,
            domain: r.origin,
            password: plaintext
          });
        } catch (e) {
          console.error("Failed to decrypt row", r.id);
        }
      }
      return decryptedRows;
    } catch (e) {
      console.error('Error fetching logins for domain:', e);
      return [];
    }
  },

  /**
   * Retrieve all saved logins.
   */
  async getAllLogins() {
    await this._migrateLegacyData();
    const rows = await DatabaseManager.getAllAsync(`SELECT * FROM credentials ORDER BY createdAt DESC`);
    
    const decryptedRows = [];
    for (const r of rows) {
      let plaintext = '';
      try {
        if (r.encryptedPassword.startsWith('AES-GCM:')) {
          plaintext = await this._decryptPayload(r.encryptedPassword);
        } else {
          console.warn("Skipping unauthenticated credential.");
        }
        decryptedRows.push({
          ...r,
          domain: r.origin,
          password: plaintext
        });
      } catch (e) {
        console.error("Failed to decrypt row", r.id);
      }
    }
    return decryptedRows;
  },

  /**
   * Payment card storage is explicitly NOT SUPPORTED in v1.0.2 due to security constraints.
   */
  async savePaymentCard() {
    console.error("Payment card storage is NOT SUPPORTED in v1.0.2.");
    return false;
  },

  async getPaymentCards() {
    return [];
  },

  cleanDomain(url) {
    if (!url) return '';
    let domain = url.replace(/^(https?:\/\/)?(www\.)?/, '');
    domain = domain.split('/')[0];
    domain = domain.split(':')[0];
    return domain.toLowerCase();
  }
};
