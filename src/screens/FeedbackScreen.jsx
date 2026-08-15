import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export const FeedbackScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [category, setCategory] = useState('Bug Report');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const categories = ['Bug Report', 'Feature Request', 'Suggestion', 'General Feedback'];

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }
    
    setIsLoading(true);
    try {
      // SCRIPT_URL goes here when the user provides it
      const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzUj-VHLlZznKtIaFkuAgJ8bIUOf61t-0QM9JQ81MVvZ1EQQBS7HYhNaC3fAGQeOyiT/exec';
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        redirect: 'follow',
        body: JSON.stringify({
          category,
          message,
          email,
          appVersion: '1.0.2'
        })
      });
      
      const responseText = await response.text();
      
      // Fix Apps Script `<` parse error: Google Apps Script returns HTML on error
      if (responseText.trim().startsWith('<')) {
        console.error('GAS HTML Error:', responseText);
        throw new Error('Server returned an HTML error page instead of JSON. Check the Apps Script deployment.');
      }
      
      const result = JSON.parse(responseText);
      
      if (result.status === 'success') {
        Alert.alert('Success', 'Feedback submitted successfully!');
        setMessage('');
        navigation.goBack();
      } else {
        throw new Error(result.message || 'Submission failed');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to submit feedback. ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Send Feedback</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: theme.text }]}>Category</Text>
        <View style={styles.catContainer}>
          {categories.map(c => (
            <TouchableOpacity 
              key={c} 
              style={[styles.catBtn, { backgroundColor: category === c ? theme.accent : theme.surfaceSecondary, borderColor: theme.border }]}
              onPress={() => setCategory(c)}
            >
              <Text style={{ color: category === c ? '#fff' : theme.textSecondary, fontSize: 13 }}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Message</Text>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, height: 120 }]}
          multiline
          placeholder="Tell us what's on your mind..."
          placeholderTextColor={theme.textSecondary}
          value={message}
          onChangeText={setMessage}
        />

        <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Email (Optional)</Text>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
          placeholder="your@email.com"
          placeholderTextColor={theme.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: theme.accent, opacity: !message.trim() || isLoading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={!message.trim() || isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Feedback</Text>}
        </TouchableOpacity>
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
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  catContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, textAlignVertical: 'top' },
  submitBtn: { marginTop: 24, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
