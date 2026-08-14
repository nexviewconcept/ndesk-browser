import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DownloadManager } from '../services/DownloadManager';

const STATUS_COLORS = {
  pending:     '#F59E0B',
  downloading: '#3B82F6',
  paused:      '#6B7280',
  complete:    '#10B981',
  error:       '#EF4444',
};

const STATUS_LABELS = {
  pending:     'Pending',
  downloading: 'Downloading',
  paused:      'Paused',
  complete:    'Done',
  error:       'Failed',
};

export const DownloadPanel = ({ isVisible, onClose, theme }) => {
  const insets = useSafeAreaInsets();
  const [downloads, setDownloads] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await DownloadManager.getDownloads();
    setDownloads(data);
  }, []);

  useEffect(() => {
    if (isVisible) load();
    // Poll while panel is open so progress updates are visible
    const interval = isVisible ? setInterval(load, 1500) : null;
    return () => { if (interval) clearInterval(interval); };
  }, [isVisible, load]);

  const handleDelete = (id) => {
    Alert.alert('Remove Download', 'Remove this download from the list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await DownloadManager.deleteDownload(id);
          load();
        },
      },
    ]);
  };

  const handleClearCompleted = () => {
    Alert.alert('Clear Completed', 'Remove all finished downloads from the list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: async () => { await DownloadManager.clearCompleted(); load(); },
      },
    ]);
  };

  const handleOpenUrl = (url) => {
    Linking.openURL(url).catch(() =>
      Alert.alert('Cannot open', 'Could not open the file URL.')
    );
  };

  const renderItem = ({ item }) => {
    const { icon, color } = DownloadManager.getIconForUrl(item.url);
    const statusColor = STATUS_COLORS[item.status] || '#6B7280';
    const isActive = item.status === 'downloading';
    const progress = item.progress || 0;

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {/* Icon */}
        <View style={[styles.fileIcon, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>

        {/* Info */}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text numberOfLines={1} style={[styles.filename, { color: theme.text }]}>
            {item.filename}
          </Text>
          <Text numberOfLines={1} style={[styles.url, { color: theme.textSecondary }]}>
            {item.url}
          </Text>

          {/* Progress Bar */}
          {isActive && (
            <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: '#3B82F6' }]} />
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[item.status]}{isActive && progress > 0 ? ` — ${progress}%` : ''}
            </Text>
            {item.size && (
              <Text style={[styles.size, { color: theme.textSecondary }]}>
                {' '}• {(item.size / 1024 / 1024).toFixed(1)} MB
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={{ justifyContent: 'center', gap: 8 }}>
          {item.status === 'complete' && (
            <TouchableOpacity onPress={() => handleOpenUrl(item.url)} style={styles.actionBtn}>
              <Ionicons name="open-outline" size={18} color={theme.accent} />
            </TouchableOpacity>
          )}
          {isActive && (
            <ActivityIndicator size="small" color="#3B82F6" />
          )}
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.background, paddingBottom: insets.bottom + 16 }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="cloud-download-outline" size={20} color={theme.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.title, { color: theme.text }]}>Downloads</Text>
              {downloads.length > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>{downloads.length}</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {downloads.some(d => d.status === 'complete') && (
                <TouchableOpacity onPress={handleClearCompleted} style={[styles.headerBtn, { borderColor: theme.border }]}>
                  <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>Clear Done</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* List */}
          {downloads.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-download-outline" size={52} color={theme.border} style={{ marginBottom: 12 }} />
              <Text style={{ color: theme.textSecondary, fontSize: 14 }}>No downloads yet</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
                When you tap a downloadable link, it will appear here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={downloads}
              keyExtractor={d => d.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, gap: 10 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    minHeight: 260,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filename: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  url: {
    fontSize: 10,
    marginBottom: 4,
  },
  progressBg: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  size: {
    fontSize: 11,
  },
  actionBtn: {
    padding: 4,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
});
