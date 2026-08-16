import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  BackHandler,
  Modal,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  AppState,
  Alert,
  Dimensions,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTabs } from '../context/TabContext';
import { BrowserView } from '../components/BrowserView';
import { AiPanel } from '../components/AiPanel';
import { PrintShareHub } from '../components/PrintShareHub';
import { ReaderMode } from '../components/ReaderMode';
import { FindInPage } from '../components/FindInPage';
import { DownloadPanel } from '../components/DownloadPanel';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { BookmarkStore } from '../services/BookmarkStore';
import { HistoryStore } from '../services/HistoryStore';
import { PrivacyManager } from '../services/PrivacyManager';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Clipboard from 'expo-clipboard';
import { AutofillStore } from '../services/AutofillStore';
import { DownloadManager } from '../services/DownloadManager';

export const BrowserScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { activeTab, updateTabState, tabs, addTab, setActiveTabId, isIncognitoUnlocked, setIncognitoUnlocked } = useTabs();

  const webViewRef = useRef(null);
  const [urlInput, setUrlInput] = useState(activeTab.url);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  // Privacy States
  const [privacySettings, setPrivacySettings] = useState(null);
  const [blockedTrackersCount, setBlockedTrackersCount] = useState(0);

  // Lock and Security States for Incognito tabs
  const isLocked = activeTab?.isIncognito && !isIncognitoUnlocked;
  const appState = useRef(AppState.currentState);

  // Autofill states
  const [autofillSuggestions, setAutofillSuggestions] = useState([]);
  const [showAutofill, setShowAutofill] = useState(false);

  // Address Bar Suggestions
  const [urlSuggestions, setUrlSuggestions] = useState([]);

  // Homepage States
  const [homeBookmarks, setHomeBookmarks] = useState([]);
  const [homeHistory, setHomeHistory] = useState([]);

  // Desktop Mode & Print Hub States
  const [isDesktopMode, setIsDesktopMode] = useState(false);
  const [zoomScale, setZoomScale] = useState(100);
  const [isPrintHubOpen, setIsPrintHubOpen] = useState(false);
  const [isReaderModeOpen, setIsReaderModeOpen] = useState(false);
  const [isFindInPageOpen, setIsFindInPageOpen] = useState(false);
  const [isDownloadPanelOpen, setIsDownloadPanelOpen] = useState(false);

  const loadHomeData = async () => {
    try {
      const bData = await BookmarkStore.getBookmarks();
      const hData = await HistoryStore.getHistory();
      setHomeBookmarks(bData || []);
      setHomeHistory(hData || []);
    } catch (e) {
      console.error('Error loading homepage data:', e);
    }
  };

  const handleToggleDesktopMode = () => {
    const nextMode = !isDesktopMode;
    setIsDesktopMode(nextMode);
    setZoomScale(100);
    updateTabState(activeTab.id, { isDesktopMode: nextMode });
    setIsMenuOpen(false);
    // Reload WebView to apply desktop user agent
    setTimeout(() => {
      webViewRef.current?.reload();
    }, 200);
  };

  const handleZoomChange = (diff) => {
    let nextZoom = 100;
    if (diff !== 0) {
      nextZoom = Math.min(Math.max(zoomScale + diff, 50), 200);
    }
    setZoomScale(nextZoom);
    // Inject JavaScript to scale/zoom page content
    const js = `
      (function() {
        document.body.style.zoom = "${nextZoom / 100}";
        let viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 'width=1280, initial-scale=${nextZoom / 100}, minimum-scale=0.1, maximum-scale=10.0, user-scalable=yes');
        }
      })();
    `;
    webViewRef.current?.injectJavaScript(js);
  };

  // Sync url input with active tab url when tab changes
  useEffect(() => {
    setUrlInput(activeTab.url === 'about:blank' ? '' : activeTab.url);
    checkBookmarkState(activeTab.url);
    // Dismiss autofill bar
    setShowAutofill(false);
    setAutofillSuggestions([]);

    // Restore desktop mode for this tab
    setIsDesktopMode(activeTab.isDesktopMode || false);
    setZoomScale(100);

    if (activeTab.url === 'about:blank' && !activeTab.isIncognito) {
      loadHomeData();
    }
  }, [activeTab.id, activeTab.url]);

  // URL Suggestions Fetcher
  useEffect(() => {
    if (isEditingUrl && urlInput && urlInput.length > 0 && !isTabIncognito) {
      const fetchSuggestions = async () => {
         const history = await HistoryStore.getHistory();
         const bookmarks = await BookmarkStore.getBookmarks();
         
         const q = urlInput.toLowerCase();
         const matches = [...bookmarks, ...history].filter(item => 
           (item.title && item.title.toLowerCase().includes(q)) || 
           (item.url && item.url.toLowerCase().includes(q))
         );
         
         const unique = [];
         const urls = new Set();
         for (const m of matches) {
           if (!urls.has(m.url)) {
             urls.add(m.url);
             unique.push(m);
           }
         }
         setUrlSuggestions(unique.slice(0, 8));
      };
      fetchSuggestions();
    } else {
      setUrlSuggestions([]);
    }
  }, [urlInput, isEditingUrl, isTabIncognito]);

  // Load privacy settings
  const loadPrivacySettings = async () => {
    const settings = await PrivacyManager.getSettings();
    setPrivacySettings(settings);
  };

  useEffect(() => {
    loadPrivacySettings();
    
    // Listen for tab focus/return
    const unsubscribe = navigation.addListener('focus', () => {
      loadPrivacySettings();
    });
    return unsubscribe;
  }, [navigation]);

  // Biometric / PIN Local Lock verification
  const authenticatePrivateSession = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'NDesk Incognito Security Verification',
          fallbackLabel: 'Use Device PIN',
          disableDeviceFallback: false,
        });
        if (result.success) {
          setIncognitoUnlocked(true);
        }
      } else {
        // Fallback for devices without biometric enrollment
        setIncognitoUnlocked(true);
      }
    } catch (error) {
      console.error('Local authentication error:', error);
      setIncognitoUnlocked(true);
    }
  };

  // Switch to public session if user chooses to bypass biometric prompt
  const switchToPublicSession = () => {
    const publicTab = tabs.find(t => !t.isIncognito);
    if (publicTab) {
      setActiveTabId(publicTab.id);
    } else {
      // If no public tab exists, create a new one (starts on our homepage)
      addTab('about:blank', false);
    }
  };

  // Monitor AppState to lock incognito session on minimize
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState.match(/inactive|background/)) {
        // App is minimized - lock incognito
        setIncognitoUnlocked(false);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [setIncognitoUnlocked]);

  // Ensure prompt triggers when switching to incognito
  useEffect(() => {
    if (activeTab?.isIncognito && !isIncognitoUnlocked) {
      authenticatePrivateSession();
      // Pause any playing media when locked
      const pauseMediaJs = `
        try {
          document.querySelectorAll('video, audio').forEach(media => media.pause());
        } catch(e) {}
        true;
      `;
      webViewRef.current?.injectJavaScript(pauseMediaJs);
    }
  }, [activeTab?.isIncognito, isIncognitoUnlocked]);

  // Handle Android hardware back press
  useEffect(() => {
    const onBackPress = () => {
      if (webViewRef.current && activeTab.canGoBack) {
        webViewRef.current.goBack();
        return true;
      }
      return false; // Exit app default
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [activeTab.canGoBack]);

  const checkBookmarkState = async (url) => {
    const bookmarked = await BookmarkStore.isBookmarked(url);
    setIsBookmarked(bookmarked);
  };

  const handleUrlSubmit = async (overrideUrl) => {
    setIsEditingUrl(false);
    const target = overrideUrl || urlInput;
    const formatted = await PrivacyManager.formatUrl(target, privacySettings?.searchEngine);
    setUrlInput(formatted);
    updateTabState(activeTab.id, { url: formatted });
  };

  const handleNavigationStateChange = (navState) => {
    // If we redirected or user typed a URL inside WebView, sync input
    if (navState.url !== 'about:blank') {
      setUrlInput(navState.url);
    }
    
    updateTabState(activeTab.id, {
      url: navState.url,
      title: navState.title || navState.url,
      canGoBack: navState.canGoBack,
      canGoForward: navState.canGoForward,
    });
    
    // Add to history
    if (!navState.loading && navState.url !== 'about:blank' && !activeTab?.isIncognito) {
      HistoryStore.addHistoryItem(navState.title, navState.url);
    }

    checkBookmarkState(navState.url);
  };

  const handleBlockedTracker = (trackerUrl) => {
    setBlockedTrackersCount(prev => prev + 1);
  };

  const handleToggleBookmark = async () => {
    const state = await BookmarkStore.toggleBookmark(activeTab.title, activeTab.url);
    setIsBookmarked(state);
    setIsMenuOpen(false);
  };

  const handleCopyLink = async () => {
    if (activeTab.url && activeTab.url !== 'about:blank') {
      await Clipboard.setStringAsync(activeTab.url);
      Alert.alert('Link Copied', 'The URL has been copied to your clipboard.');
    }
    setIsMenuOpen(false);
  };

  const handleToggleIncognito = async () => {
    const updated = await PrivacyManager.updateSetting('incognitoMode', !privacySettings?.incognitoMode);
    setPrivacySettings(updated);
    setBlockedTrackersCount(0);
    setIsMenuOpen(false);
  };

  const handleToggleAdBlock = async () => {
    const updated = await PrivacyManager.updateSetting('adBlockEnabled', !privacySettings?.adBlockEnabled);
    setPrivacySettings(updated);
    setIsMenuOpen(false);
  };

  // WebView message listener for autofill, reader mode, find in page, and downloads
  const handleWebViewMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'NDESK_SAVE_CREDENTIALS') {
        const { username, password, domain } = data;
        Alert.alert(
          'Save Password?',
          `Do you want NDesk Browser to save the password for "${username}" on ${domain}?`,
          [
            { text: 'Never for this site', style: 'cancel' },
            { text: 'No', style: 'default' },
            {
              text: 'Save',
              style: 'default',
              onPress: async () => {
                await AutofillStore.saveLogin(domain, username, password);
              }
            }
          ]
        );
      } else if (data.type === 'NDESK_FOCUS_USERNAME') {
        const { domain } = data;
        const saved = await AutofillStore.getLoginsForDomain(domain);
        if (saved && saved.length > 0) {
          setAutofillSuggestions(saved);
          setShowAutofill(true);
        }
      } else if (data.type === 'READER_CONTENT') {
        ReaderMode.handleMessage(data);
      } else if (data.type === 'FIND_RESULT') {
        FindInPage.handleMessage(data);
      } else if (data.type === 'DOWNLOAD_REQUEST') {
        handleDownloadRequest(data);
      }
    } catch (e) {
      console.log('Error parsing WebView message:', e);
    }
  };

  const handleDownloadRequest = (data) => {
    Alert.alert('Download File', `Do you want to download ${data.filename || 'this file'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Download', 
        onPress: async () => {
          const entry = await DownloadManager.addDownload(data.url, data.filename);
          setIsDownloadPanelOpen(true);
          DownloadManager.startDownload(entry.id, data.url, {
            onComplete: () => console.log('Download complete:', entry.id),
            onError: (err) => console.log('Download error:', err)
          });
        }
      }
    ]);
  };

  const applyAutofill = (username, password) => {
    const js = `
      (function() {
        const passwordFields = document.querySelectorAll('input[type="password"]');
        passwordFields.forEach(field => {
          field.value = "${password}";
          let parent = field.parentElement;
          while (parent && parent.tagName !== 'FORM') parent = parent.parentElement;
          const form = parent || document;
          const textFields = form.querySelectorAll('input[type="text"], input[type="email"]');
          let usernameField = null;
          textFields.forEach(tf => {
            if (tf !== field && (tf.name.includes('user') || tf.name.includes('email') || tf.type === 'email' || tf.id.includes('user') || tf.id.includes('email'))) {
              usernameField = tf;
            }
          });
          if (!usernameField && textFields.length > 0) {
            usernameField = textFields[0];
          }
          if (usernameField) {
            usernameField.value = "${username}";
          }
        });
      })();
    `;
    webViewRef.current?.injectJavaScript(js);
    setShowAutofill(false);
  };

  // Swipe gesture configuration
  const swipeHandlers = useSwipeGesture(
    () => webViewRef.current?.goForward(), // Swipe left -> Forward
    () => webViewRef.current?.goBack()     // Swipe right -> Back
  );

  const isTabIncognito = activeTab?.isIncognito;
  const activeThemeColor = isTabIncognito ? '#121212' : theme.surface;
  const activeBgColor = isTabIncognito ? '#000000' : theme.background;
  const activeTextColor = isTabIncognito ? '#A78BFA' : theme.text;
  const showIncognitoStart = isTabIncognito && activeTab.url === 'about:blank';

  const renderAddressBar = () => {
    return (
      <>
        {/* URL Input Bar */}
        <View style={[styles.urlBar, { backgroundColor: isTabIncognito ? '#1e1e1e' : theme.surfaceSecondary }]}>
          {isTabIncognito && (
            <Ionicons name="eye-off" size={16} color="#A78BFA" style={{ marginRight: 8 }} />
          )}
          {privacySettings?.adBlockEnabled && blockedTrackersCount > 0 && (
            <View style={styles.shieldBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#10B981" />
              <Text style={styles.shieldCount}>{blockedTrackersCount}</Text>
            </View>
          )}
          <TextInput
            style={[styles.urlInput, { color: isTabIncognito ? '#FFF' : theme.text }]}
            value={urlInput}
            onChangeText={setUrlInput}
            onFocus={() => setIsEditingUrl(true)}
            onBlur={() => setIsEditingUrl(false)}
            onSubmitEditing={() => handleUrlSubmit()}
            placeholder="Search or enter URL"
            placeholderTextColor={theme.textSecondary}
            selectTextOnFocus
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="web-search"
          />
          {urlInput && isEditingUrl ? (
            <TouchableOpacity onPress={() => setUrlInput('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              onPress={() => loading ? webViewRef.current?.stopLoading() : webViewRef.current?.reload()} 
              style={styles.clearButton}
            >
              <Ionicons name={loading ? "close" : "refresh"} size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Toolbar Buttons */}
        <View style={styles.toolbar}>
          <TouchableOpacity
            disabled={!activeTab.canGoBack}
            onPress={() => webViewRef.current?.goBack()}
            style={styles.toolButton}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={activeTab.canGoBack ? activeTextColor : theme.border}
            />
          </TouchableOpacity>

          <TouchableOpacity
            disabled={!activeTab.canGoForward}
            onPress={() => webViewRef.current?.goForward()}
            style={styles.toolButton}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={activeTab.canGoForward ? activeTextColor : theme.border}
            />
          </TouchableOpacity>

          {/* AI Sparkle Button */}
          <TouchableOpacity onPress={() => setIsAiOpen(true)} style={[styles.toolButton, styles.aiButton, { backgroundColor: isTabIncognito ? '#2A2050' : theme.surfaceSecondary }]}>
            <Ionicons name="sparkles" size={20} color={isTabIncognito ? '#C4B5FD' : theme.accent} />
          </TouchableOpacity>

          {/* New Tab Shortcut Button */}
          <TouchableOpacity onPress={() => addTab()} style={styles.toolButton}>
            <Ionicons name="add-circle-outline" size={25} color={activeTextColor} />
          </TouchableOpacity>

          {/* Tab Manager Toggle Button */}
          <TouchableOpacity onPress={() => navigation.navigate('TabManager')} style={styles.toolButton}>
            <View style={[styles.tabBadge, { borderColor: activeTextColor }]}>
              <Text style={[styles.tabCountText, { color: activeTextColor }]}>{tabs.length}</Text>
            </View>
          </TouchableOpacity>

          {/* Settings Menu Button */}
          <TouchableOpacity onPress={() => setIsMenuOpen(true)} style={styles.toolButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color={activeTextColor} />
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: activeBgColor, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark || isTabIncognito ? 'light-content' : 'dark-content'} />

      {privacySettings?.addressBarPosition === 'top' && !showIncognitoStart && (
        <View style={[styles.bottomBar, { backgroundColor: activeThemeColor, borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
          {renderAddressBar()}
        </View>
      )}

      {/* Security Biometric Lock Screen */}
      {isLocked && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#090516', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: 32 }]}>
          <Ionicons name="lock-closed" size={80} color="#8B5CF6" />
          <Text style={{ color: '#FFF', fontSize: 22, fontWeight: 'bold', marginTop: 24, textAlign: 'center' }}>
            Private Browsing Locked
          </Text>
          <Text style={{ color: '#A78BFA', fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 32, paddingHorizontal: 24 }}>
            Verify fingerprint or PIN to access private tabs.
          </Text>
          <TouchableOpacity 
            onPress={authenticatePrivateSession} 
            style={{ backgroundColor: '#8B5CF6', paddingVertical: 14, paddingHorizontal: 36, borderRadius: 28, elevation: 4 }}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>Unlock Session</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={switchToPublicSession} 
            style={{ marginTop: 20, paddingVertical: 10, paddingHorizontal: 20 }}
          >
            <Text style={{ color: '#A78BFA', fontWeight: '600', fontSize: 14, textDecorationLine: 'underline' }}>
              Switch to Public Tabs
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Progress Bar */}
      {loadProgress > 0 && loadProgress < 1 && !showIncognitoStart && (
        <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${loadProgress * 100}%`,
                backgroundColor: isTabIncognito ? '#A78BFA' : theme.accent
              }
            ]}
          />
        </View>
      )}

      {/* Main WebView area / Private Search start screen */}
      <View style={styles.webContainer} {...swipeHandlers}>
        {isEditingUrl && !isTabIncognito && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background, zIndex: 100 }]}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {urlSuggestions.map((item, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}
                  onPress={() => {
                    setUrlInput(item.url);
                    handleUrlSubmit(item.url);
                  }}
                >
                  <Ionicons name={item.isSystem ? "bookmark" : "time-outline"} size={20} color={theme.textSecondary} style={{ marginRight: 16 }} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>{item.title || item.url}</Text>
                    <Text numberOfLines={1} style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>{item.url}</Text>
                  </View>
                  <Ionicons name="arrow-up-left" size={20} color={theme.border} />
                </TouchableOpacity>
              ))}
              {urlSuggestions.length === 0 && urlInput.length > 0 && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Ionicons name="search" size={32} color={theme.border} style={{ marginBottom: 12 }} />
                  <Text style={{ color: theme.textSecondary }}>Search for "{urlInput}"</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {showIncognitoStart ? (
          <View style={{ flex: 1, backgroundColor: '#0A0516', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <Ionicons name="shield-half" size={72} color="#8B5CF6" style={{ marginBottom: 16 }} />
            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 8 }}>NDesk Incognito</Text>
            <Text style={{ color: '#A78BFA', fontSize: 13, textAlign: 'center', marginBottom: 32, paddingHorizontal: 20, lineHeight: 18 }}>
              You are browsing privately. Pages you visit won't be saved in history, and tracking scripts are blocked.
            </Text>
            <View style={{ width: '100%', maxWidth: 340, height: 48, borderRadius: 24, backgroundColor: '#1C1236', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: '#3B2B68' }}>
              <Ionicons name="search" size={18} color="#A78BFA" />
              <TextInput
                style={{ flex: 1, color: '#FFF', paddingHorizontal: 12, fontSize: 14 }}
                placeholder="Search privately on Google..."
                placeholderTextColor="#7C6FA6"
                onSubmitEditing={(e) => handleUrlSubmit(e.nativeEvent.text)}
                keyboardType="web-search"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
        ) : (!isTabIncognito && activeTab.url === 'about:blank') ? (
          <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
            {/* Logo/Branding */}
            <View style={{ alignItems: 'center', marginVertical: 32 }}>
              <View style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 12, shadowColor: theme.accent, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, overflow: 'hidden' }}>
                <Image 
                  source={require('../../assets/icon.jpg')} 
                  style={{ width: '100%', height: '100%' }} 
                />
              </View>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text }}>NDesk Browser</Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>Sleek • Secure • Privacy-First</Text>
            </View>

            {/* Custom Search Bar */}
            <View style={{ width: '100%', height: 48, borderRadius: 24, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1, marginBottom: 32 }}>
              <Ionicons name="search" size={18} color={theme.textSecondary} />
              <TextInput
                style={{ flex: 1, color: theme.text, paddingHorizontal: 12, fontSize: 14 }}
                placeholder={`Search on ${privacySettings?.searchEngine || 'Google'}...`}
                placeholderTextColor={theme.textSecondary}
                onSubmitEditing={(e) => handleUrlSubmit(e.nativeEvent.text)}
                keyboardType="web-search"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Bookmarks Section */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.accent || '#8B5CF6', letterSpacing: 1, marginBottom: 12 }}>BOOKMARKS</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
              {homeBookmarks.length > 0 ? (
                homeBookmarks.slice(0, 8).map(bm => (
                  <TouchableOpacity
                    key={bm.id}
                    onPress={() => handleUrlSubmit(bm.url)}
                    style={{ width: (SCREEN_WIDTH - 72) / 4, alignItems: 'center' }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: theme.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border, marginBottom: 6, overflow: 'hidden' }}>
                      <Image 
                        source={{ uri: `https://www.google.com/s2/favicons?domain=${bm.url}&sz=64` }} 
                        style={{ width: 24, height: 24 }} 
                        resizeMode="contain"
                      />
                    </View>
                    <Text numberOfLines={1} style={{ fontSize: 10, color: theme.text, fontWeight: '600', width: '100%', textAlign: 'center' }}>
                      {bm.title}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={{ width: '100%', padding: 16, backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center' }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>No bookmarks saved yet</Text>
                </View>
              )}
            </View>

            {/* Recent History Section */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.accent || '#8B5CF6', letterSpacing: 1, marginBottom: 12 }}>RECENT HISTORY</Text>
            <View style={{ backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' }}>
              {homeHistory.length > 0 ? (
                homeHistory.slice(0, 5).map((his, idx) => (
                  <TouchableOpacity
                    key={his.id || idx}
                    onPress={() => handleUrlSubmit(his.url)}
                    style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: idx < 4 ? 1 : 0, borderBottomColor: theme.border }}
                  >
                    <Ionicons name="time-outline" size={16} color={theme.textSecondary} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontSize: 13, color: theme.text, fontWeight: '500' }}>{his.title || his.url}</Text>
                      <Text numberOfLines={1} style={{ fontSize: 10, color: theme.textSecondary, marginTop: 2 }}>{his.url}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={theme.border} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>No browsing history</Text>
                </View>
              )}
            </View>
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            {isDesktopMode && activeTab.url !== 'about:blank' && (
              <View style={{ height: 38, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="desktop-outline" size={14} color={theme.accent} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: theme.accent, letterSpacing: 0.5 }}>DESKTOP MODE ACTIVE</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity onPress={() => handleZoomChange(-10)} style={{ padding: 4 }}>
                    <Ionicons name="remove-circle-outline" size={20} color={theme.text} />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text, minWidth: 44, textAlign: 'center' }}>{zoomScale}%</Text>
                  <TouchableOpacity onPress={() => handleZoomChange(10)} style={{ padding: 4 }}>
                    <Ionicons name="add-circle-outline" size={20} color={theme.text} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleZoomChange(0)} style={{ paddingVertical: 2, paddingHorizontal: 8, backgroundColor: theme.surfaceSecondary, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textSecondary }}>Reset</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <BrowserView
              webViewRef={webViewRef}
              url={activeTab.url}
              onNavigationStateChange={handleNavigationStateChange}
              onLoadProgress={setLoadProgress}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              privacySettings={privacySettings}
              onBlockedTracker={handleBlockedTracker}
              onMessage={handleWebViewMessage}
              isDesktopMode={isDesktopMode}
              zoomScale={zoomScale}
            />
          </View>
        )}
      </View>

      {/* Password Autofill Suggestion Bar */}
      {showAutofill && autofillSuggestions.length > 0 && (
        <View style={[styles.autofillBar, { backgroundColor: activeThemeColor, borderTopColor: theme.border }]}>
          <Text style={{ color: activeTextColor, fontSize: 12, marginRight: 8, fontWeight: '700' }}>AUTOFILL:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {autofillSuggestions.map(sug => (
              <TouchableOpacity
                key={sug.id}
                onPress={() => applyAutofill(sug.username, sug.password)}
                style={[styles.autofillChip, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
              >
                <Ionicons name="key-outline" size={12} color={activeTextColor} style={{ marginRight: 4 }} />
                <Text style={[styles.autofillText, { color: theme.text }]}>{sug.username}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={() => setShowAutofill(false)} style={{ padding: 4 }}>
            <Ionicons name="close" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Bar: Address Input + Toolbar (One-Handed design) */}
      {privacySettings?.addressBarPosition !== 'top' && (
        <View style={[styles.bottomBar, { backgroundColor: activeThemeColor, borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
          {renderAddressBar()}
        </View>
      )}

      {/* Menu Overlay */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isMenuOpen}
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsMenuOpen(false)}>
          <View style={[styles.menuDropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TouchableOpacity onPress={handleToggleBookmark} style={styles.menuItem}>
              <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={18} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>
                {isBookmarked ? 'Remove Bookmark' : 'Bookmark Page'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCopyLink} style={styles.menuItem}>
              <Ionicons name="copy-outline" size={18} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Copy Link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsMenuOpen(false);
                navigation.navigate('Bookmarks');
              }}
              style={styles.menuItem}
            >
              <Ionicons name="list" size={18} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Bookmarks & History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsMenuOpen(false);
                setIsPrintHubOpen(true);
              }}
              style={styles.menuItem}
            >
              <Ionicons name="print-outline" size={18} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Print & Share Hub</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsMenuOpen(false);
                setIsReaderModeOpen(true);
              }}
              style={styles.menuItem}
              disabled={activeTab.url === 'about:blank'}
            >
              <Ionicons name="book-outline" size={18} color={activeTab.url === 'about:blank' ? theme.border : theme.text} />
              <Text style={[styles.menuItemText, { color: activeTab.url === 'about:blank' ? theme.border : theme.text }]}>Reader Mode</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsMenuOpen(false);
                setIsFindInPageOpen(true);
              }}
              style={styles.menuItem}
              disabled={activeTab.url === 'about:blank'}
            >
              <Ionicons name="search-outline" size={18} color={activeTab.url === 'about:blank' ? theme.border : theme.text} />
              <Text style={[styles.menuItemText, { color: activeTab.url === 'about:blank' ? theme.border : theme.text }]}>Find in Page</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsMenuOpen(false);
                setIsDownloadPanelOpen(true);
              }}
              style={styles.menuItem}
            >
              <Ionicons name="cloud-download-outline" size={18} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Downloads</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleToggleDesktopMode}
              style={styles.menuItem}
            >
              <Ionicons name={isDesktopMode ? 'desktop' : 'desktop-outline'} size={18} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>
                {isDesktopMode ? 'Desktop Site: ON' : 'Request Desktop Site'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              onPress={() => {
                setIsMenuOpen(false);
                addTab('about:blank', true);
              }}
              style={styles.menuItem}
            >
              <Ionicons name="eye-off-outline" size={18} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>New Incognito Tab</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleToggleAdBlock} style={styles.menuItem}>
              <Ionicons name={privacySettings?.adBlockEnabled ? 'shield' : 'shield-outline'} size={18} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>
                {privacySettings?.adBlockEnabled ? 'AdBlocker: ON' : 'AdBlocker: OFF'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              onPress={() => {
                setIsMenuOpen(false);
                navigation.navigate('Settings');
              }}
              style={styles.menuItem}
            >
              <Ionicons name="settings-outline" size={18} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Browser Settings</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* AI Assistant Slide-up Panel */}
      <AiPanel
        isVisible={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        currentUrl={activeTab.url}
        currentTitle={activeTab.title}
        privacySettings={privacySettings}
      />
      {/* Print & Share Hub Modal */}
      <PrintShareHub
        isVisible={isPrintHubOpen}
        onClose={() => setIsPrintHubOpen(false)}
        currentUrl={activeTab.url}
        currentTitle={activeTab.title}
      />
      <ReaderMode
        isVisible={isReaderModeOpen}
        onClose={() => setIsReaderModeOpen(false)}
        currentUrl={activeTab.url}
        currentTitle={activeTab.title}
        webViewRef={webViewRef}
        theme={theme}
      />
      <DownloadPanel
        isVisible={isDownloadPanelOpen}
        onClose={() => setIsDownloadPanelOpen(false)}
        theme={theme}
      />
      <View style={{ position: 'absolute', top: Math.max(insets.top, 10), width: '100%', zIndex: 100 }}>
        <FindInPage
          isVisible={isFindInPageOpen}
          onClose={() => setIsFindInPageOpen(false)}
          webViewRef={webViewRef}
          theme={theme}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressBarBg: {
    height: 3,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  webContainer: {
    flex: 1,
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  urlBar: {
    height: 40,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  urlInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    paddingHorizontal: 8,
  },
  clearButton: {
    padding: 4,
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 4,
  },
  shieldCount: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '700',
    marginLeft: 2,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 45,
  },
  toolButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    padding: 0,
  },
  tabBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuDropdown: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 15,
    marginLeft: 12,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    marginVertical: 6,
    marginHorizontal: 16,
  },
  autofillBar: {
    height: 46,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  autofillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  autofillText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
