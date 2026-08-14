import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useTabs } from '../context/TabContext';
import { BookmarkStore } from '../services/BookmarkStore';
import { HistoryStore } from '../services/HistoryStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const BookmarksScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { activeTab, updateTabState } = useTabs();

  const [activeSegment, setActiveSegment] = useState('bookmarks'); // 'bookmarks' | 'history'
  const [bookmarks, setBookmarks] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadData();
  }, [activeSegment]);

  const loadData = async () => {
    if (activeSegment === 'bookmarks') {
      const data = await BookmarkStore.getBookmarks();
      setBookmarks(data);
    } else {
      const data = await HistoryStore.getHistory();
      setHistory(data);
    }
  };

  const handleOpenUrl = (url) => {
    updateTabState(activeTab.id, { url });
    navigation.navigate('Browser');
  };

  const handleDeleteBookmark = async (id) => {
    await BookmarkStore.deleteBookmark(id);
    loadData();
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all browsing history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await HistoryStore.clearHistory();
            loadData();
          }
        }
      ]
    );
  };

  const renderBookmarkItem = ({ item }) => (
    <View style={[styles.listItem, { borderBottomColor: theme.border }]}>
      <TouchableOpacity
        onPress={() => handleOpenUrl(item.url)}
        style={styles.itemContent}
      >
        <Ionicons name="bookmark" size={18} color={theme.accent} style={styles.itemIcon} />
        <View style={styles.textContainer}>
          <Text numberOfLines={1} style={[styles.itemTitle, { color: theme.text }]}>
            {item.title}
          </Text>
          <Text numberOfLines={1} style={[styles.itemUrl, { color: theme.textSecondary }]}>
            {item.url}
          </Text>
        </View>
      </TouchableOpacity>
      {!item.isSystem && (
        <TouchableOpacity onPress={() => handleDeleteBookmark(item.id)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color={theme.error} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHistoryItem = ({ item }) => (
    <View style={[styles.listItem, { borderBottomColor: theme.border }]}>
      <TouchableOpacity
        onPress={() => handleOpenUrl(item.url)}
        style={styles.itemContent}
      >
        <Ionicons name="time-outline" size={18} color={theme.textSecondary} style={styles.itemIcon} />
        <View style={styles.textContainer}>
          <Text numberOfLines={1} style={[styles.itemTitle, { color: theme.text }]}>
            {item.title}
          </Text>
          <Text numberOfLines={1} style={[styles.itemUrl, { color: theme.textSecondary }]}>
            {item.url}
          </Text>
        </View>
      </TouchableOpacity>
      <Text style={[styles.timestampText, { color: theme.textSecondary }]}>
        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Library</Text>
        {activeSegment === 'history' && history.length > 0 ? (
          <TouchableOpacity onPress={handleClearHistory} style={styles.clearBtn}>
            <Text style={[styles.clearBtnText, { color: theme.error }]}>Clear</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Segmented Controls */}
      <View style={[styles.segmentContainer, { backgroundColor: theme.surfaceSecondary }]}>
        <TouchableOpacity
          onPress={() => setActiveSegment('bookmarks')}
          style={[
            styles.segmentButton,
            activeSegment === 'bookmarks' && [styles.segmentActiveButton, { backgroundColor: theme.surface }]
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              { color: activeSegment === 'bookmarks' ? theme.text : theme.textSecondary }
            ]}
          >
            Bookmarks
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveSegment('history')}
          style={[
            styles.segmentButton,
            activeSegment === 'history' && [styles.segmentActiveButton, { backgroundColor: theme.surface }]
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              { color: activeSegment === 'history' ? theme.text : theme.textSecondary }
            ]}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* List Area */}
      {activeSegment === 'bookmarks' ? (
        <FlatList
          data={bookmarks}
          renderItem={renderBookmarkItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bookmark-outline" size={48} color={theme.border} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No Bookmarks Saved</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={48} color={theme.border} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No Browsing History</Text>
            </View>
          }
        />
      )}
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
  clearBtn: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentActiveButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  itemIcon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemUrl: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
  },
  timestampText: {
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
});
