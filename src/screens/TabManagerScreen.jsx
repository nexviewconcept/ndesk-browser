import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useTabs } from '../context/TabContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

export const TabManagerScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { tabs, tabGroups, activeTabId, setActiveTabId, addTab, closeTab, createTabGroup, deleteTabGroup } = useTabs();

  const [isGroupModalVisible, setGroupModalVisible] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState('');

  const handleSelectTab = (id) => {
    setActiveTabId(id);
    navigation.navigate('Browser');
  };

  const handleCreateTab = (isIncognito = false) => {
    addTab('https://www.google.com', isIncognito);
    navigation.navigate('Browser');
  };

  const renderTabCard = ({ item }) => {
    const isActive = item.id === activeTabId;
    const isIncognito = item.isIncognito;
    
    return (
      <TouchableOpacity
        onPress={() => handleSelectTab(item.id)}
        style={[
          styles.card,
          {
            backgroundColor: isIncognito ? '#121212' : theme.surface,
            borderColor: isActive ? (isIncognito ? '#C4B5FD' : theme.accent) : theme.border,
            borderWidth: isActive ? 2 : 1
          }
        ]}
      >
        <View style={[styles.cardHeader, { borderBottomColor: isIncognito ? '#2D2D2D' : theme.border }]}>
          {isIncognito && (
            <Ionicons name="eye-off" size={14} color="#A78BFA" style={{ marginRight: 4 }} />
          )}
          <Text numberOfLines={1} style={[styles.cardTitle, { color: isIncognito ? '#E9D5FF' : theme.text }]}>
            {item.title || (isIncognito ? 'Private Tab' : 'New Tab')}
          </Text>
          <TouchableOpacity onPress={() => closeTab(item.id)} style={styles.closeBtn}>
            <Ionicons name="close" size={16} color={isIncognito ? '#A78BFA' : theme.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={[styles.cardBody, { backgroundColor: isIncognito ? '#1A102F' : theme.surfaceSecondary }]}>
          {isIncognito ? (
            <>
              <Ionicons name="eye-off-outline" size={32} color="#8B5CF6" />
              <Text numberOfLines={1} style={{ fontSize: 10, color: '#A78BFA', marginTop: 8, fontWeight: '600' }}>
                Private content hidden
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="globe-outline" size={32} color={theme.border} />
              <Text numberOfLines={2} style={[styles.cardUrl, { color: theme.textSecondary }]}>
                {item.url}
              </Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleGroupPrompt = () => {
    setNewGroupName('');
    setGroupModalVisible(true);
  };

  const submitNewGroup = () => {
    if (newGroupName && newGroupName.trim()) {
      createTabGroup(newGroupName.trim());
    }
    setGroupModalVisible(false);
  };

  const groupedTabs = tabs.filter(t => t.groupId);
  const looseTabs = tabs.filter(t => !t.groupId);

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Tabs ({tabs.length})</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs Grid */}
      <ScrollView contentContainerStyle={styles.listContent}>
        {tabGroups && tabGroups.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 12, marginLeft: 4, letterSpacing: 1 }}>TAB GROUPS</Text>
            {tabGroups.map(group => {
              const groupTabs = tabs.filter(t => t.groupId === group.id);
              if (groupTabs.length === 0) {
                // Render empty group or hide it
                return null;
              }
              return (
                <View key={group.id} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{group.name}</Text>
                    <TouchableOpacity onPress={() => deleteTabGroup(group.id)} style={{ padding: 4 }}>
                      <Text style={{ fontSize: 12, color: theme.error || '#EF4444' }}>Ungroup</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.gridContainer}>
                    {groupTabs.map(t => renderTabCard({ item: t }))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 12, marginLeft: 4, letterSpacing: 1 }}>{tabGroups && tabGroups.length > 0 ? 'OTHER TABS' : 'ALL TABS'}</Text>
        <View style={styles.gridContainer}>
          {looseTabs.map(t => renderTabCard({ item: t }))}
        </View>
      </ScrollView>

      {/* Bottom Bar for creating new tabs */}
      <View style={[styles.bottomBar, { borderTopColor: theme.border, backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <TouchableOpacity onPress={handleGroupPrompt} style={[styles.newTabButton, { backgroundColor: theme.surfaceSecondary, borderWidth: 1, borderColor: theme.border, flex: 1 }]}>
            <Ionicons name="folder-outline" size={18} color={theme.text} />
            <Text style={[styles.newTabButtonText, { color: theme.text }]}>Group Active</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={() => handleCreateTab(false)} style={[styles.newTabButton, { backgroundColor: theme.accent, flex: 1 }]}>
            <Ionicons name="add" size={22} color="#FFF" />
            <Text style={styles.newTabButtonText}>New Tab</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleCreateTab(true)} style={[styles.newTabButton, { backgroundColor: '#4C1D95', flex: 1 }]}>
            <Ionicons name="eye-off" size={18} color="#FFF" />
            <Text style={styles.newTabButtonText}>Private Tab</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Group Creation Modal */}
      <Modal
        visible={isGroupModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGroupModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 12, padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text, marginBottom: 16 }}>New Tab Group</Text>
            <TextInput
              style={{ backgroundColor: theme.surfaceSecondary, color: theme.text, height: 44, borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 24 }}
              placeholder="Group Name"
              placeholderTextColor={theme.textSecondary}
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoFocus
              onSubmitEditing={submitNewGroup}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={() => setGroupModalVisible(false)} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitNewGroup} style={{ backgroundColor: theme.accent, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 }}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  listContent: {
    padding: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.25,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 38,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginRight: 4,
  },
  closeBtn: {
    padding: 4,
  },
  cardBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  cardUrl: {
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  newTabButton: {
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newTabButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
});
