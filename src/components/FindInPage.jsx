import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const FindInPage = ({ isVisible, onClose, webViewRef, theme }) => {
  const [query, setQuery] = useState('');
  const [matchInfo, setMatchInfo] = useState({ current: 0, total: 0 });
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const inputRef = useRef(null);

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 100, friction: 12 }).start();
      setTimeout(() => inputRef.current?.focus(), 200);
    } else {
      Animated.timing(slideAnim, { toValue: -60, duration: 200, useNativeDriver: true }).start();
      clearSearch();
      setQuery('');
    }
  }, [isVisible]);

  // Called by BrowserScreen when WebView posts FIND_RESULT message
  FindInPage.handleMessage = (data) => {
    if (data?.type === 'FIND_RESULT') {
      setMatchInfo({ current: data.current, total: data.total });
    }
  };

  const clearSearch = () => {
    setMatchInfo({ current: 0, total: 0 });
    webViewRef?.current?.injectJavaScript(`
      (function() {
        if (window.__ndeskFindClear) window.__ndeskFindClear();
      })(); true;
    `);
  };

  const doSearch = (text) => {
    setQuery(text);
    if (!text.trim()) { clearSearch(); return; }
    const escaped = text.replace(/'/g, "\\'");
    const js = `
      (function() {
        // Remove previous highlights
        if (window.__ndeskFindClear) window.__ndeskFindClear();

        const text = '${escaped}';
        if (!text) return;

        const body = document.body;
        const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null, false);
        const nodes = [];
        let node;
        while (node = walker.nextNode()) {
          if (node.parentElement.tagName !== 'SCRIPT' && node.parentElement.tagName !== 'STYLE') {
            nodes.push(node);
          }
        }

        let total = 0;
        const highlights = [];
        function escapeRegex(s) {
          var special = ['\\\\', '.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']'];
          var result = s;
          for (var i = 0; i < special.length; i++) {
            result = result.split(special[i]).join('\\\\' + special[i]);
          }
          return result;
        }
        const regex = new RegExp(escapeRegex(text), 'gi');

        nodes.forEach(textNode => {
          const matches = [...textNode.textContent.matchAll(regex)];
          if (matches.length === 0) return;
          const frag = document.createDocumentFragment();
          let lastIdx = 0;
          matches.forEach(match => {
            frag.appendChild(document.createTextNode(textNode.textContent.slice(lastIdx, match.index)));
            const mark = document.createElement('mark');
            mark.textContent = match[0];
            mark.style.cssText = 'background:#FACC15;color:#000;border-radius:2px;padding:0 1px;';
            mark.className = '__ndesk_highlight';
            highlights.push(mark);
            frag.appendChild(mark);
            lastIdx = match.index + match[0].length;
            total++;
          });
          frag.appendChild(document.createTextNode(textNode.textContent.slice(lastIdx)));
          textNode.parentNode.replaceChild(frag, textNode);
        });

        let current = 0;
        function scrollToCurrent() {
          highlights.forEach((h, i) => {
            h.style.background = i === current ? '#F97316' : '#FACC15';
          });
          if (highlights[current]) {
            highlights[current].scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FIND_RESULT', current: current + 1, total }));
        }

        window.__ndeskFindNext = function() {
          if (highlights.length === 0) return;
          current = (current + 1) % highlights.length;
          scrollToCurrent();
        };
        window.__ndeskFindPrev = function() {
          if (highlights.length === 0) return;
          current = (current - 1 + highlights.length) % highlights.length;
          scrollToCurrent();
        };
        window.__ndeskFindClear = function() {
          document.querySelectorAll('.__ndesk_highlight').forEach(el => {
            el.parentNode.replaceChild(document.createTextNode(el.textContent), el);
          });
          window.__ndeskFindNext = null;
          window.__ndeskFindPrev = null;
          window.__ndeskFindClear = null;
        };

        if (total > 0) scrollToCurrent();
        else window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FIND_RESULT', current: 0, total: 0 }));
      })(); true;
    `;
    webViewRef?.current?.injectJavaScript(js);
  };

  const navigate = (dir) => {
    const fn = dir === 'next' ? 'window.__ndeskFindNext' : 'window.__ndeskFindPrev';
    webViewRef?.current?.injectJavaScript(`if (${fn}) ${fn}(); true;`);
  };

  if (!isVisible) return null;

  const hasMatches = matchInfo.total > 0;
  const noMatch = query.length > 0 && matchInfo.total === 0;

  return (
    <Animated.View style={[styles.bar, { backgroundColor: theme.surface, borderBottomColor: theme.border, transform: [{ translateY: slideAnim }] }]}>
      <Ionicons name="search" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: noMatch ? '#EF4444' : theme.text }]}
        value={query}
        onChangeText={doSearch}
        placeholder="Find in page…"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={() => navigate('next')}
      />
      {hasMatches && (
        <Text style={[styles.count, { color: theme.textSecondary }]}>
          {matchInfo.current}/{matchInfo.total}
        </Text>
      )}
      {noMatch && (
        <Text style={[styles.count, { color: '#EF4444' }]}>No match</Text>
      )}
      <TouchableOpacity onPress={() => navigate('prev')} style={styles.navBtn} disabled={!hasMatches}>
        <Ionicons name="chevron-up" size={20} color={hasMatches ? theme.text : theme.border} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigate('next')} style={styles.navBtn} disabled={!hasMatches}>
        <Ionicons name="chevron-down" size={20} color={hasMatches ? theme.text : theme.border} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => { clearSearch(); onClose(); }} style={styles.closeBtn}>
        <Ionicons name="close" size={20} color={theme.text} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 8,
    minWidth: 44,
    textAlign: 'center',
  },
  navBtn: {
    padding: 6,
  },
  closeBtn: {
    padding: 6,
    marginLeft: 4,
  },
});
