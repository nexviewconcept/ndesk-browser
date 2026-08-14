import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const READER_THEMES = {
  light:   { bg: '#FFFDF7', text: '#1A1A1A', secondary: '#6B7280', label: 'Light' },
  sepia:   { bg: '#F5ECD7', text: '#3B2A14', secondary: '#8B6F47', label: 'Sepia' },
  dark:    { bg: '#1A1A1A', text: '#E5E5E5', secondary: '#9CA3AF', label: 'Dark' },
  black:   { bg: '#000000', text: '#FFFFFF', secondary: '#6B7280', label: 'Black' },
};

const FONTS = ['Georgia', 'Arial', 'Verdana', "'Times New Roman'"];
const FONT_LABELS = ['Georgia', 'Arial', 'Verdana', 'Times'];
const MIN_SIZE = 14;
const MAX_SIZE = 28;

// Injected into the page WebView to extract readable content
const READER_EXTRACT_SCRIPT = `
(function() {
  function clean(el) {
    ['script','style','nav','footer','header','aside','iframe','noscript','form','button','input','select','textarea','svg'].forEach(tag => {
      el.querySelectorAll(tag).forEach(n => n.remove());
    });
    el.querySelectorAll('[class*="ad"],[class*="banner"],[class*="popup"],[class*="cookie"],[class*="sidebar"],[id*="ad"],[id*="banner"]').forEach(n => n.remove());
    return el;
  }

  let title = document.title || '';
  let content = '';

  // Try article first
  let article = document.querySelector('article') || document.querySelector('[role="main"]') || document.querySelector('main');
  if (!article) {
    // Score divs by text length
    let best = null, bestScore = 0;
    document.querySelectorAll('div, section').forEach(el => {
      const score = el.innerText ? el.innerText.length : 0;
      if (score > bestScore) { bestScore = score; best = el; }
    });
    article = best;
  }

  if (article) {
    clean(article);
    content = article.innerHTML;
  } else {
    content = '<p>Could not extract article content. Please try on a text-heavy page.</p>';
  }

  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: 'READER_CONTENT',
    title,
    content
  }));
  true;
})();
`;

export const ReaderMode = ({ isVisible, onClose, currentUrl, currentTitle, webViewRef, theme }) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const [readerTheme, setReaderTheme] = useState('light');
  const [fontIndex, setFontIndex] = useState(0);
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.7);
  const [readerContent, setReaderContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const rt = READER_THEMES[readerTheme];

  useEffect(() => {
    if (isVisible) {
      setIsLoading(true);
      setReaderContent(null);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
      // Extract content from the live WebView
      setTimeout(() => {
        webViewRef?.current?.injectJavaScript(READER_EXTRACT_SCRIPT);
      }, 400);
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  // Called from BrowserScreen when WebView posts READER_CONTENT
  ReaderMode.handleMessage = (data) => {
    if (data?.type === 'READER_CONTENT') {
      setReaderContent(data);
      setIsLoading(false);
    }
  };

  const buildHtml = () => {
    if (!readerContent) return '<body style="background:#fff"></body>';
    const font = FONTS[fontIndex];
    return `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${rt.bg};
    color: ${rt.text};
    font-family: ${font}, serif;
    font-size: ${fontSize}px;
    line-height: ${lineHeight};
    padding: 20px 24px 60px;
    word-wrap: break-word;
  }
  h1, h2, h3, h4 { margin: 1.2em 0 0.5em; font-weight: 700; color: ${rt.text}; }
  h1 { font-size: 1.5em; }
  h2 { font-size: 1.3em; }
  h3 { font-size: 1.1em; }
  p { margin-bottom: 1em; }
  a { color: #7C3AED; text-decoration: none; }
  img { max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; }
  blockquote { border-left: 4px solid #7C3AED; padding-left: 16px; color: ${rt.secondary}; margin: 1em 0; font-style: italic; }
  pre, code { background: rgba(0,0,0,0.08); padding: 2px 6px; border-radius: 4px; font-size: 0.85em; font-family: monospace; }
  li { margin-bottom: 0.4em; }
  ul, ol { padding-left: 20px; margin-bottom: 1em; }
</style>
</head>
<body>
  <h1 style="margin-bottom:8px;line-height:1.3">${readerContent.title || ''}</h1>
  <p style="font-size:0.75em;color:${rt.secondary};margin-bottom:24px;border-bottom:1px solid rgba(0,0,0,0.1);padding-bottom:12px">
    ${currentUrl || ''}
  </p>
  ${readerContent.content || ''}
</body>
</html>`;
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="none"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.container, { backgroundColor: rt.bg, transform: [{ translateY: slideAnim }] }]}>
        {/* Top Bar */}
        <View style={[styles.topBar, { backgroundColor: rt.bg, borderBottomColor: `${rt.secondary}30`, paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose} style={styles.topBtn}>
            <Ionicons name="close" size={24} color={rt.text} />
          </TouchableOpacity>
          <View style={styles.topCenter}>
            <Ionicons name="book-outline" size={16} color={rt.secondary} style={{ marginRight: 6 }} />
            <Text style={{ color: rt.secondary, fontSize: 13, fontWeight: '600' }}>Reader Mode</Text>
          </View>
          <TouchableOpacity onPress={() => setShowSettings(s => !s)} style={styles.topBtn}>
            <Ionicons name="text" size={22} color={showSettings ? '#7C3AED' : rt.text} />
          </TouchableOpacity>
        </View>

        {/* Settings Panel */}
        {showSettings && (
          <View style={[styles.settingsPanel, { backgroundColor: rt.bg, borderBottomColor: `${rt.secondary}25` }]}>
            {/* Theme Row */}
            <View style={styles.settingsRow}>
              <Text style={[styles.settingsLabel, { color: rt.secondary }]}>THEME</Text>
              <View style={styles.themeRow}>
                {Object.entries(READER_THEMES).map(([key, t]) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setReaderTheme(key)}
                    style={[
                      styles.themeBtn,
                      { backgroundColor: t.bg, borderColor: readerTheme === key ? '#7C3AED' : `${t.secondary}40` }
                    ]}
                  >
                    <Text style={{ color: t.text, fontSize: 10, fontWeight: '700' }}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Font Size Row */}
            <View style={styles.settingsRow}>
              <Text style={[styles.settingsLabel, { color: rt.secondary }]}>SIZE</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={() => setFontSize(s => Math.max(MIN_SIZE, s - 2))} style={[styles.adjBtn, { borderColor: `${rt.secondary}40` }]}>
                  <Ionicons name="remove" size={18} color={rt.text} />
                </TouchableOpacity>
                <Text style={{ color: rt.text, fontWeight: '700', fontSize: 15, minWidth: 36, textAlign: 'center' }}>{fontSize}</Text>
                <TouchableOpacity onPress={() => setFontSize(s => Math.min(MAX_SIZE, s + 2))} style={[styles.adjBtn, { borderColor: `${rt.secondary}40` }]}>
                  <Ionicons name="add" size={18} color={rt.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Font Row */}
            <View style={styles.settingsRow}>
              <Text style={[styles.settingsLabel, { color: rt.secondary }]}>FONT</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {FONT_LABELS.map((label, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setFontIndex(i)}
                    style={[styles.fontBtn, { borderColor: fontIndex === i ? '#7C3AED' : `${rt.secondary}30`, backgroundColor: fontIndex === i ? '#7C3AED15' : 'transparent' }]}
                  >
                    <Text style={{ color: fontIndex === i ? '#7C3AED' : rt.text, fontSize: 12, fontWeight: '600' }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Line Height Row */}
            <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.settingsLabel, { color: rt.secondary }]}>SPACING</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[1.4, 1.7, 2.0].map(lh => (
                  <TouchableOpacity
                    key={lh}
                    onPress={() => setLineHeight(lh)}
                    style={[styles.fontBtn, { borderColor: lineHeight === lh ? '#7C3AED' : `${rt.secondary}30`, backgroundColor: lineHeight === lh ? '#7C3AED15' : 'transparent' }]}
                  >
                    <Ionicons name="menu" size={16} color={lineHeight === lh ? '#7C3AED' : rt.text} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Content WebView */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="book" size={48} color="#7C3AED" style={{ opacity: 0.4, marginBottom: 16 }} />
            <Text style={{ color: rt.secondary, fontSize: 14 }}>Extracting article…</Text>
          </View>
        ) : (
          <WebView
            key={`reader-${readerTheme}-${fontIndex}-${fontSize}-${lineHeight}`}
            source={{ html: buildHtml() }}
            style={{ flex: 1, backgroundColor: rt.bg }}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            javaScriptEnabled={false}
          />
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  topBtn: { padding: 8 },
  topCenter: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsPanel: {
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  settingsLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    minWidth: 60,
  },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  adjBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
