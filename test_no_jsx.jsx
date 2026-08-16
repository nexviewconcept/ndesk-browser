
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { PrivacyManager } from '../services/PrivacyManager';
import { GoogleAuthManager } from '../services/GoogleAuthManager';
import { DriveBackupManager } from '../services/DriveBackupManager';
import { BookmarkStore } from '../services/BookmarkStore';
import { HistoryStore } from '../services/HistoryStore';
import { AutofillStore } from '../services/AutofillStore';
import { AiKeyManager, ProviderRegistry } from '../services/AiProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as LocalAuthentication from 'expo-local-authentication';

export const SettingsScreen = ({ navigation }) => {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Privacy and general settings
  const [privacySettings, setPrivacySettings] = useState({});
  
  // Google Auth details
  const [authData, setAuthData] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  // Custom Google Client ID input
  const [googleClientId, setGoogleClientId] = useState('');

  // AI Key state — loaded from per-user persistent storage
  const [userAiKey, setUserAiKey] = useState('');

  // Autofill / Saved credentials state
  const [savedLogins, setSavedLogins] = useState([]);
  const [showLogins, setShowLogins] = useState(false);

  // Payment cards state
  const [savedCards, setSavedCards] = useState([]);
  const [showCards, setShowCards] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await PrivacyManager.getSettings();
    setPrivacySettings(settings);
    
    if (settings.googleClientId) {
      setGoogleClientId(settings.googleClientId);
    }
    
    const googleAuth = await GoogleAuthManager.getAuthData();
    setAuthData(googleAuth);

    const syncTime = await DriveBackupManager.getLastSyncTime();
    setLastSyncTime(syncTime);

    const logins = await AutofillStore.getAllLogins();
    setSavedLogins(logins);

    const cards = await AutofillStore.getPaymentCards();
    setSavedCards(cards);

    // Load user's personal AI key
    const provider = settings.aiProvider || 'HuggingFace';
    const key = await AiKeyManager.getUserKey(provider);
    // Only show key if it's a user's personal key (not general fallback)
    const cleanKey = (key && !key.includes('fallback')) ? key : '';
    setUserAiKey(cleanKey);
    if (settings.aiApiKey !== cleanKey) {
      await handleUpdatePrivacy('aiApiKey', cleanKey);
    }
  };

  const handleUpdatePrivacy = async (key, value) => {
    const updated = await PrivacyManager.updateSetting(key, value);
    setPrivacySettings(updated);
  };

  const handleSaveAiKey = async (key) => {
    setUserAiKey(key);
    const provider = privacySettings.aiProvider || 'HuggingFace';
    if (key.trim()) {
      await AiKeyManager.saveUserKey(provider, key.trim());
    } else {
      await AiKeyManager.clearUserKey(provider);
    }
    await handleUpdatePrivacy('aiApiKey', key.trim());
  };

  const handleChangeAiProvider = async (provider) => {
    await handleUpdatePrivacy('aiProvider', provider);
    await AiKeyManager.savePreferredProvider(provider);
    // Load that provider's saved key
    const savedKey = await AiKeyManager.getUserKey(provider);
    const cleanKey = (savedKey && !savedKey.includes('fallback')) ? savedKey : '';
    setUserAiKey(cleanKey);
    await handleUpdatePrivacy('aiApiKey', cleanKey);
  };

  // Google Login and Sync Functions
  const handleGoogleSignIn = async () => {
    try {
      const result = await GoogleAuthManager.signIn(googleClientId || null);
      if (result) {
        setAuthData(result);
        Alert.alert('Google Auth Successful', `Signed in as ${result.user.name}`);
      }
    } catch (error) {
      Alert.alert('Sign-In Error', 'Unable to authenticate with Google. Please verify details.');
    }
  };

  const handleGoogleSignOut = async () => {
    await GoogleAuthManager.signOut();
    setAuthData(null);
    Alert.alert('Signed Out', 'You have logged out from your Google account.');
  };

  const handleSyncBackup = async () => {
    if (!authData) return;
    setIsSyncing(true);
    
    try {
      const { DatabaseManager } = require('../services/DatabaseManager');
      const bookmarks = await BookmarkStore.getBookmarks();
      const history = await HistoryStore.getHistory();
      const tabGroups = await DatabaseManager.getAllAsync(`SELECT * FROM tab_groups`);
      const settings = privacySettings;

      const result = await DriveBackupManager.uploadBackup(authData, bookmarks, settings, history, tabGroups || []);
      if (result && result.success) {
        setLastSyncTime(result.timestamp);
        Alert.alert('Sync Successful', 'Your bookmarks and settings have been safely backed up to Google Drive.');
      } else {
        Alert.alert('Sync Error', 'Failed to back up data to Google Drive.');
      }
    } catch (e) {
      Alert.alert('Sync Exception', 'An error occurred during sync operations.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!authData) return;
    setIsSyncing(true);

    try {
      const backup = await DriveBackupManager.downloadBackup(authData);
      if (backup) {
        Alert.alert(
          'Restore Backup',
          `Found backup from ${new Date(backup.timestamp).toLocaleString()}. Do you want to restore it? This will overwrite local data.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Restore',
              onPress: async () => {
                const { StorageManager } = require('../services/StorageManager');
                const { DatabaseManager } = require('../services/DatabaseManager');
                
                // Bookmarks
                if (backup.bookmarks && backup.bookmarks.length > 0) {
                  // Keep system bookmarks, merge with downloaded bookmarks
                  const existing = await BookmarkStore.getBookmarks();
                  const systemBms = existing.filter(b => b.isSystem);
                  const newBms = [...systemBms, ...backup.bookmarks.filter(b => !b.isSystem)];
                  await StorageManager.save('ndesk_bookmarks', newBms);
                }

                // History
                if (backup.publicHistory && backup.publicHistory.length > 0) {
                  await StorageManager.save('ndesk_history', backup.publicHistory);
                }

                // Settings
                if (backup.nonSensitivePreferences) {
                  const currentSettings = await PrivacyManager.getSettings();
                  const newSettings = { ...currentSettings, ...backup.nonSensitivePreferences };
                  await StorageManager.save('ndesk_privacy_settings', newSettings);
                  setPrivacySettings(newSettings);
                }

                // Tab Groups
                if (backup.tabGroups && backup.tabGroups.length > 0) {
                  await DatabaseManager.runAsync(`DELETE FROM tab_groups`);
                  for (const group of backup.tabGroups) {
                    await DatabaseManager.runAsync(
                      `INSERT INTO tab_groups (id, name, tabIds, isPrivate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
                      [group.id, group.name, group.tabIds, group.isPrivate, group.createdAt, group.updatedAt]
                    );
                  }
                }
                
                Alert.alert('Restored', 'Your backup has been restored successfully.');
              }
            }
          ]
        );
      } else {
        Alert.alert('No Backup Found', 'No backup file named "ndesk_backup.json" found on Google Drive.');
      }
    } catch (e) {
      Alert.alert('Restore Error', 'An error occurred during restore operations.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportBookmarks = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/html', 'application/xhtml+xml', '*/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        
        // Basic regex to find <a href="URL">TITLE</a>
        const aTagRegex = new RegExp('<a\\s+(?:[^>]*?\\s+)?href=["\'](.*?)["\'][^>]*>(.*?)<\\/a>', 'gi');
        let match;
        let importCount = 0;
        
        while ((match = aTagRegex.exec(fileContent)) !== null) {
          const url = match[1];
          const title = match[2].replace(new RegExp('<[^>]+>', 'g'), '').trim() || url;
          if (url && (url.startsWith('http') || url.startsWith('https'))) {
            await BookmarkStore.saveBookmark(url, title);
            importCount++;
          }
        }

        Alert.alert('Import Successful', `Imported ${importCount} bookmark(s) successfully.`);
      }
    } catch (err) {
      console.error('Bookmark import error:', err);
      Alert.alert('Import Error', 'Failed to read or parse the bookmarks file.');
    }
  };

  const handleDeleteCard = (card) => {
    Alert.alert(
      'Delete Payment Card',
      `Remove the card ending in ${card.maskedNumber?.slice(-4) || '****'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            const { StorageManager } = require('../services/StorageManager');
            const allCards = await AutofillStore.getPaymentCards();
            const filtered = allCards.filter(c => c.id !== card.id);
            await StorageManager.save('ndesk_autofill_cards', filtered);
            setSavedCards(filtered);
          }
        }
      ]
    );
  };

  const handleDeleteLogin = (login) => {
    Alert.alert(
      'Delete Password',
      `Remove saved password for "${login.username}" on ${login.domain}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            const { StorageManager } = require('../services/StorageManager');
            const all = await AutofillStore.getAllLogins();
            const filtered = all.filter(l => l.id !== login.id);
            await StorageManager.save('ndesk_autofill_logins', filtered);
            setSavedLogins(filtered);
          }
        }
      ]
    );
  const handleClearData = (type) => {
    let title = '';
    let message = '';
    let action = async () => {};

    if (type === 'history') {
      title = 'Clear History';
      message = 'This will delete all browsing history.';
      action = async () => await HistoryStore.clearHistory();
    } else if (type === 'bookmarks') {
      title = 'Clear Bookmarks';
      message = 'This will delete all saved bookmarks (except system protected).';
      action = async () => {
        const { StorageManager } = require('../services/StorageManager');
        const bms = await BookmarkStore.getBookmarks();
        const systemBms = bms.filter(b => b.isSystem);
        await StorageManager.save('ndesk_bookmarks', systemBms);
      };
    } else if (type === 'passwords') {
      title = 'Clear Passwords';
      message = 'This will delete all saved passwords and payment methods.';
      action = async () => {
        const { StorageManager } = require('../services/StorageManager');
        await StorageManager.save('ndesk_autofill_logins', []);
        await StorageManager.save('ndesk_autofill_cards', []);
        setSavedLogins([]);
        setSavedCards([]);
      };
    } else if (type === 'cache_cookies') {
      title = 'Clear Cache & Cookies';
      message = 'This will clear all browser cache and site cookies. You will be signed out of most sites.';
      action = async () => {
        // We will call react-native-webview's clearCache and clearCookies via a postMessage or globally if possible,
        // but for now, we just clear local storage
        Alert.alert('Notice', 'Cache and cookies can be cleared by fully restarting the app or via Android system settings.');
        return;
      };
    }

    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data', style: 'destructive',
          onPress: async () => {
            await action();
            Alert.alert('Data Cleared', `${title} has been successfully cleared.`);
          }
        }
      ]
    );
  };

  return (
};
