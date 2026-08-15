import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

/**
 * Exclusively for sensitive secrets (AI keys, OAuth tokens, Encryption keys)
 */
export const SecureStorage = {
  async save(key, value) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (isWeb) {
        window.localStorage.setItem('SECURE_' + key, stringValue);
        return true;
      }
      await SecureStore.setItemAsync(key, stringValue);
      return true;
    } catch (error) {
      console.error(`SecureStorage save error for key ${key}:`, error);
      return false;
    }
  },

  async get(key, defaultValue = null) {
    try {
      let value = null;
      if (isWeb) {
        value = window.localStorage.getItem('SECURE_' + key);
      } else {
        value = await SecureStore.getItemAsync(key);
      }
      if (value === null) return defaultValue;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`SecureStorage get error for key ${key}:`, error);
      return defaultValue;
    }
  },

  async remove(key) {
    try {
      if (isWeb) {
        window.localStorage.removeItem('SECURE_' + key);
        return true;
      }
      await SecureStore.deleteItemAsync(key);
      return true;
    } catch (error) {
      console.error(`SecureStorage remove error for key ${key}:`, error);
      return false;
    }
  }
};

/**
 * Exclusively for lightweight, non-sensitive UI preferences (Theme, Layout configs)
 */
export const PreferenceStorage = {
  async save(key, value) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (isWeb) {
        window.localStorage.setItem('PREF_' + key, stringValue);
        return true;
      }
      await AsyncStorage.setItem(key, stringValue);
      return true;
    } catch (error) {
      console.error(`PreferenceStorage save error for key ${key}:`, error);
      return false;
    }
  },

  async get(key, defaultValue = null) {
    try {
      let value = null;
      if (isWeb) {
        value = window.localStorage.getItem('PREF_' + key);
      } else {
        value = await AsyncStorage.getItem(key);
      }
      if (value === null) return defaultValue;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`PreferenceStorage get error for key ${key}:`, error);
      return defaultValue;
    }
  },

  async remove(key) {
    try {
      if (isWeb) {
        window.localStorage.removeItem('PREF_' + key);
        return true;
      }
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`PreferenceStorage remove error for key ${key}:`, error);
      return false;
    }
  }
};

/**
 * Legacy StorageManager mapping for migration only.
 * DO NOT USE FOR NEW FEATURES.
 */
export const StorageManager = {
  async save(key, value) {
    return await SecureStorage.save(key, value);
  },
  async get(key, defaultValue = null) {
    return await SecureStorage.get(key, defaultValue);
  },
  async remove(key) {
    return await SecureStorage.remove(key);
  }
};
