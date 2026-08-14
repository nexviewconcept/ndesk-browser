import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export const StorageManager = {
  /**
   * Save a key-value pair securely.
   * If value is an object/array, it will be automatically stringified.
   * Falls back to localStorage on web or when SecureStore fails.
   */
  async save(key, value) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (isWeb) {
        window.localStorage.setItem(key, stringValue);
        return true;
      }
      await SecureStore.setItemAsync(key, stringValue);
      return true;
    } catch (error) {
      console.error(`Error saving key ${key}:`, error);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
          window.localStorage.setItem(key, stringValue);
          return true;
        }
      } catch (err) {
        console.error('Failed to save to localStorage fallback:', err);
      }
      return false;
    }
  },

  /**
   * Get a key's value securely.
   * Automatically parses JSON strings back to objects/arrays.
   * Falls back to localStorage on web or when SecureStore fails.
   */
  async get(key, defaultValue = null) {
    try {
      let value = null;
      if (isWeb) {
        value = window.localStorage.getItem(key);
      } else {
        try {
          value = await SecureStore.getItemAsync(key);
        } catch {
          // If SecureStore fails, check fallback localStorage
          if (typeof window !== 'undefined' && window.localStorage) {
            value = window.localStorage.getItem(key);
          }
        }
      }
      if (value === null) return defaultValue;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`Error getting key ${key}:`, error);
      return defaultValue;
    }
  },

  /**
   * Delete a key-value pair.
   * Falls back to localStorage on web or when SecureStore fails.
   */
  async remove(key) {
    try {
      if (isWeb) {
        window.localStorage.removeItem(key);
        return true;
      }
      await SecureStore.deleteItemAsync(key);
      return true;
    } catch (error) {
      console.error(`Error removing key ${key}:`, error);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return true;
        }
      } catch {}
      return false;
    }
  }
};
