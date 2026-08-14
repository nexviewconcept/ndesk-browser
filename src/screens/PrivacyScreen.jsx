import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export const PrivacyScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy Center</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Privacy & Transparency</Text>
        
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>What We Collect</Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            NDesk Browser operates under a minimum-data principle. We do NOT intentionally collect: browsing history, visited URLs, search queries, passwords, or incognito activity. If you voluntarily provide feedback, we collect only the category, message, and optional email you provide.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Cloud Backup</Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            If you enable Google Drive sync, your bookmarks and settings are securely backed up to your personal Google Drive (appDataFolder). NDesk does not have access to your personal files.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Telemetry & Diagnostics</Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            NDesk Browser does not use advertising identifiers or tracking telemetry. 
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, borderBottomWidth: 1 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  cardText: { fontSize: 14, lineHeight: 22 }
});
