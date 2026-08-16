
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
  return null;
};
