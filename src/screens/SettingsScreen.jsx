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
        const aTagRegex = /<a\s+(?:[^>]*?\s+)?href=["'](.*?)["'][^>]*>(.*?)<\/a>/gi;
        let match;
        let importCount = 0;
        
        while ((match = aTagRegex.exec(fileContent)) !== null) {
          const url = match[1];
          const title = match[2].replace(/<[^>]+>/g, '').trim() || url;
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
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Section 1: Appearance */}
        <Text style={styles.sectionHeader}>APPEARANCE</Text>
        <View style={[styles.sectionGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.settingItem}>
            <View>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Theme Mode</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>Change the appearance of the browser</Text>
            </View>
            <View style={styles.segmentedButtons}>
              {['light', 'dark', 'system'].map(mode => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={[
                    styles.segBtn,
                    themeMode === mode && [styles.segBtnActive, { backgroundColor: theme.accent }]
                  ]}
                >
                  <Text
                    style={[
                      styles.segBtnText,
                      { color: themeMode === mode ? '#FFF' : theme.textSecondary }
                    ]}
                  >
                    {mode.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Section 2: Privacy & AdBlocker */}
        <Text style={styles.sectionHeader}>PRIVACY & SECURITY</Text>
        <View style={[styles.sectionGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.settingItem}>
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Block Ads & Trackers</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>Block tracking networks and popups</Text>
            </View>
            <Switch
              value={privacySettings.adBlockEnabled}
              onValueChange={val => handleUpdatePrivacy('adBlockEnabled', val)}
              trackColor={{ false: theme.border, true: theme.accent }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.settingItem}>
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Search Engine</Text>
            </View>
            <View style={styles.segmentedButtons}>
              {['DuckDuckGo', 'Google', 'Bing'].map(engine => (
                <TouchableOpacity
                  key={engine}
                  onPress={() => handleUpdatePrivacy('searchEngine', engine)}
                  style={[
                    styles.segBtn,
                    privacySettings.searchEngine === engine && [styles.segBtnActive, { backgroundColor: theme.accent }]
                  ]}
                >
                  <Text
                    style={[
                      styles.segBtnText,
                      { color: privacySettings.searchEngine === engine ? '#FFF' : theme.textSecondary }
                    ]}
                  >
                    {engine === 'DuckDuckGo' ? 'DDG' : engine}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Section 3: AI Settings */}
        <Text style={styles.sectionHeader}>AI ASSISTANT</Text>
        <View style={[styles.sectionGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.settingItem}>
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>AI Provider</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>Your key is saved per-provider on this device</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
            {Object.keys(ProviderRegistry).map(provider => (
              <TouchableOpacity
                key={provider}
                onPress={() => handleChangeAiProvider(provider)}
                style={[
                  styles.segBtn,
                  privacySettings.aiProvider === provider && [styles.segBtnActive, { backgroundColor: theme.accent }]
                ]}
              >
                <Text
                  style={[
                    styles.segBtnText,
                    { color: privacySettings.aiProvider === provider ? '#FFF' : theme.textSecondary }
                  ]}
                >
                  {ProviderRegistry[provider].name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.apiInputContainer}>
            <Text style={[styles.apiInputLabel, { color: theme.text }]}>
              {ProviderRegistry[privacySettings.aiProvider || 'HuggingFace']?.name || 'AI'} API Key
            </Text>
            <TextInput
              placeholder="Paste your personal API key here..."
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              value={userAiKey}
              onChangeText={setUserAiKey}
              onBlur={() => handleSaveAiKey(userAiKey)}
              onSubmitEditing={() => handleSaveAiKey(userAiKey)}
              style={[styles.apiInput, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.border }]}
            />
            <Text style={[styles.apiHelpText, { color: theme.textSecondary, marginTop: 8 }]}>
              {ProviderRegistry[privacySettings.aiProvider || 'HuggingFace']?.name} requires an API key to process content. 
              Key is stored securely on your device.
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.text, marginBottom: 4 }}>PRIVACY DISCLOSURE</Text>
            <Text style={{ fontSize: 11, color: theme.textSecondary, lineHeight: 16 }}>
              When you ask AI to summarize or explain a page, the page's text content is sent to {ProviderRegistry[privacySettings.aiProvider || 'HuggingFace']?.endpoint}.
              {"\n"}NDesk does not collect this data, but the provider might.
              {"\n\n"}Please review their policies:
              {"\n"}• Privacy: {ProviderRegistry[privacySettings.aiProvider || 'HuggingFace']?.privacyUrl}
              {"\n"}• Terms: {ProviderRegistry[privacySettings.aiProvider || 'HuggingFace']?.termsUrl}
            </Text>
          </View>
        </View>

        {/* Section 4: Google Drive Sync */}
        <Text style={styles.sectionHeader}>GOOGLE DRIVE CLOUD SYNC</Text>
        <View style={[styles.sectionGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          
          {authData ? (
            <View style={styles.profileWrapper}>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: theme.text }]}>{authData.user.name}</Text>
                <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{authData.user.email}</Text>
              </View>
              <TouchableOpacity onPress={handleGoogleSignOut} style={[styles.signOutBtn, { borderColor: theme.error }]}>
                <Text style={[styles.signOutText, { color: theme.error }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.loginWrapper}>
              <Text style={[styles.loginHelp, { color: theme.textSecondary }]}>
                Backup and sync bookmarks, history, and settings safely to your personal Google Drive storage. Sign in to select your Google account.
              </Text>
              <TextInput
                placeholder="Google Web Client ID (Optional)"
                placeholderTextColor={theme.textSecondary}
                value={googleClientId}
                onChangeText={setGoogleClientId}
                onBlur={() => handleUpdatePrivacy('googleClientId', googleClientId)}
                onSubmitEditing={() => handleUpdatePrivacy('googleClientId', googleClientId)}
                style={[styles.apiInput, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.border, marginBottom: 12 }]}
              />
              <TouchableOpacity onPress={handleGoogleSignIn} style={[styles.signInBtn, { backgroundColor: theme.accent }]}>
                <Ionicons name="logo-google" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.signInText}>Sign In with Google</Text>
              </TouchableOpacity>
            </View>
          )}

          {authData && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.syncActions}>
                <TouchableOpacity
                  disabled={isSyncing}
                  onPress={handleSyncBackup}
                  style={[styles.syncBtn, { backgroundColor: theme.accent }]}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.syncBtnText}>Backup</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={isSyncing}
                  onPress={handleRestoreBackup}
                  style={[styles.syncBtn, { backgroundColor: theme.surfaceSecondary, borderWidth: 1, borderColor: theme.border }]}
                >
                  <Ionicons name="cloud-download-outline" size={18} color={theme.text} style={{ marginRight: 6 }} />
                  <Text style={[styles.syncBtnText, { color: theme.text }]}>Restore</Text>
                </TouchableOpacity>
              </View>
              {lastSyncTime && (
                <Text style={[styles.syncTime, { color: theme.textSecondary }]}>
                  Last Sync: {new Date(lastSyncTime).toLocaleString()}
                </Text>
              )}
            </>
          )}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity onPress={handleImportBookmarks} style={[styles.settingItem, { paddingTop: 16 }]}>
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Import Bookmarks (HTML)</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>Import bookmarks from Chrome, Firefox, Safari</Text>
            </View>
            <Ionicons name="document-text-outline" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Section: Clear Data */}
        <Text style={styles.sectionHeader}>CLEAR BROWSING DATA</Text>
        <View style={[styles.sectionGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity onPress={() => handleClearData('history')} style={styles.settingItem}>
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.error || '#EF4444' }]}>Clear Browsing History</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>Remove list of visited websites</Text>
            </View>
            <Ionicons name="trash-outline" size={18} color={theme.error || '#EF4444'} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity onPress={() => handleClearData('cache_cookies')} style={styles.settingItem}>
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.error || '#EF4444' }]}>Clear Cache & Cookies</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>Sign out of sites and free up space</Text>
            </View>
            <Ionicons name="trash-outline" size={18} color={theme.error || '#EF4444'} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity onPress={() => handleClearData('passwords')} style={styles.settingItem}>
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.error || '#EF4444' }]}>Clear Saved Passwords</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>Remove all auto-fill credentials</Text>
            </View>
            <Ionicons name="trash-outline" size={18} color={theme.error || '#EF4444'} />
          </TouchableOpacity>
        </View>

        {/* Section 6: About & Help */}
        <Text style={styles.sectionHeader}>ABOUT & HELP</Text>
        <View style={[styles.sectionGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Privacy')}
            style={styles.settingItem}
          >
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Privacy Center</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>What we collect and how we protect you</Text>
            </View>
            <Ionicons name="shield-checkmark-outline" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity
            onPress={() => navigation.navigate('Feedback')}
            style={styles.settingItem}
          >
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Send Feedback</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>Report bugs or suggest features</Text>
            </View>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity
            onPress={() => {
              // Usually opens browser internally or externally
            }}
            style={styles.settingItem}
          >
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Developed by Nexview Concept Limited</Text>
              <Text style={[styles.settingDesc, { color: theme.accent }]}>nexviewconcept.com.ng</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={theme.accent} />
          </TouchableOpacity>
        </View>

        {/* Section 5: Autofill & Saved Passwords */}
        <Text style={styles.sectionHeader}>AUTOFILL & PASSWORDS</Text>
        <View style={[styles.sectionGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity
            onPress={async () => {
              if (!showLogins) {
                try {
                  const hasHardware = await LocalAuthentication.hasHardwareAsync();
                  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
                  if (hasHardware && isEnrolled) {
                    const result = await LocalAuthentication.authenticateAsync({
                      promptMessage: 'Authenticate to view saved passwords',
                      fallbackLabel: 'Use Device PIN',
                    });
                    if (result.success) {
                      setShowLogins(true);
                    } else {
                      Alert.alert('Authentication Failed', 'You must authenticate to view saved passwords.');
                    }
                  } else {
                    // No biometrics available, just show it
                    setShowLogins(true);
                  }
                } catch (e) {
                  setShowLogins(true);
                }
              } else {
                setShowLogins(false);
              }
            }}
            style={styles.settingItem}
          >
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Saved Passwords</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>{savedLogins.length} credential{savedLogins.length !== 1 ? 's' : ''} saved</Text>
            </View>
            <Ionicons
              name={showLogins ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>

          {showLogins && savedLogins.length > 0 && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              {savedLogins.map((login, idx) => (
                <View
                  key={login.id || idx}
                  style={[styles.loginRow, { borderColor: theme.border }]}
                >
                  <Ionicons name="key-outline" size={16} color={theme.accent} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: theme.text, fontSize: 13, fontWeight: '600' }]}>{login.domain}</Text>
                    <Text style={[{ color: theme.textSecondary, fontSize: 12 }]}>
                      {login.username} • {login.password}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteLogin(login)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.error || '#EF4444'} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {showLogins && savedLogins.length === 0 && (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>No saved passwords yet. Passwords are saved when you sign in to websites.</Text>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Payment Cards */}
          <TouchableOpacity
            onPress={() => setShowCards(!showCards)}
            style={styles.settingItem}
          >
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Payment Methods</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>{savedCards.length} card{savedCards.length !== 1 ? 's' : ''} saved</Text>
            </View>
            <Ionicons
              name={showCards ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>

          {showCards && savedCards.length > 0 && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              {savedCards.map((card, idx) => (
                <View
                  key={card.id || idx}
                  style={[styles.loginRow, { borderColor: theme.border }]}
                >
                  <Ionicons name="card-outline" size={16} color={theme.accent} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: theme.text, fontSize: 13, fontWeight: '600' }]}>{card.maskedNumber || '•••• ****'}</Text>
                    <Text style={[{ color: theme.textSecondary, fontSize: 12 }]}>{card.cardHolder || 'Card holder'}{card.expiryDate ? ` • Exp: ${card.expiryDate}` : ''}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteCard(card)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.error || '#EF4444'} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {showCards && savedCards.length === 0 && (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>No payment cards saved yet.</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 1,
  },
  sectionGroup: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  labelWrapper: {
    flex: 1,
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  segmentedButtons: {
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
  },
  segBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  segBtnActive: {
    shadowOpacity: 0.15,
  },
  segBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  apiInputContainer: {
    padding: 16,
  },
  apiInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  apiInput: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  apiHelpText: {
    fontSize: 10,
    marginTop: 6,
    lineHeight: 14,
  },
  profileWrapper: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileInfo: {
    flex: 1,
    marginRight: 8,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '600',
  },
  profileEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  signOutBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loginWrapper: {
    padding: 16,
  },
  loginHelp: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  signInBtn: {
    height: 44,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  syncActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  syncBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  syncTime: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 16,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
