import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { AiProvider, AiKeyManager } from '../services/AiProvider';
import { animations } from '../animations/transitions';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export const AiPanel = ({ isVisible, onClose, currentUrl, currentTitle, privacySettings }) => {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: "Hello! I am NDesk AI. I can answer questions, summarize pages, or explain concepts based on what you are reading. How can I help you today?",
      isBot: true
    }
  ]);
  const [loading, setLoading] = useState(false);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scrollViewRef = useRef();

  useEffect(() => {
    if (isVisible) {
      animations.slide(slideAnim, 0, 300).start();
    } else {
      animations.slide(slideAnim, SCREEN_HEIGHT, 250).start();
    }
  }, [isVisible]);

  // Autoscroll to bottom when messages list updates
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => scrollViewRef.current.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const text = textToSend || query;
    if (!text.trim()) return;

    if (!textToSend) setQuery('');
    
    const userMsg = { id: Date.now().toString(), text, isBot: false };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const context = `Webpage Title: ${currentTitle || 'Unknown'}\nWebpage URL: ${currentUrl || 'about:blank'}`;
    const provider = privacySettings?.aiProvider || 'HuggingFace';
    const apiKey = await AiKeyManager.getUserKey(provider);

    try {
      const reply = await AiProvider.ask(text, context, provider, apiKey);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: reply, isBot: true }]);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "Oops, I encountered a connection issue. Please verify your internet and API settings and try again.",
          isBot: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    let promptText = '';
    if (action === 'summarize') {
      promptText = `Summarize this page: "${currentTitle || currentUrl}"`;
    } else if (action === 'takeaways') {
      promptText = `What are the key takeaways from this page?`;
    } else if (action === 'explain') {
      promptText = `Explain the core concepts discussed on this page.`;
    }
    handleSend(promptText);
  };

  return (
    <Animated.View
      style={[
        styles.panel,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="sparkles" size={18} color={theme.accent} style={styles.sparkleIcon} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>NDesk AI Assistant</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
      >
        {messages.map(msg => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.isBot
                ? [styles.botBubble, { backgroundColor: theme.surfaceSecondary }]
                : [styles.userBubble, { backgroundColor: theme.accent }]
            ]}
          >
            <Text
              style={[
                styles.messageText,
                { color: msg.isBot ? theme.text : '#FFF' }
              ]}
            >
              {msg.text}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.messageBubble, styles.botBubble, { backgroundColor: theme.surfaceSecondary, flexDirection: 'row', alignItems: 'center' }]}>
            <ActivityIndicator size="small" color={theme.accent} style={{ marginRight: 8 }} />
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Action Chips */}
      <View style={[styles.quickActions, { borderTopColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => handleQuickAction('summarize')}
          style={[styles.chip, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
        >
          <Text style={[styles.chipText, { color: theme.text }]}>📄 Summarize</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleQuickAction('takeaways')}
          style={[styles.chip, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
        >
          <Text style={[styles.chipText, { color: theme.text }]}>💡 Takeaways</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleQuickAction('explain')}
          style={[styles.chip, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
        >
          <Text style={[styles.chipText, { color: theme.text }]}>🔍 Explain</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.inputContainer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
          <TextInput
            placeholder="Ask about this page..."
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={setQuery}
            style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.border }]}
          />
          <TouchableOpacity
            onPress={() => handleSend()}
            disabled={!query.trim() || loading}
            style={[
              styles.sendButton,
              { backgroundColor: query.trim() && !loading ? theme.accent : theme.border }
            ]}
          >
            <Ionicons name="arrow-up" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.65,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    zIndex: 1000,
  },
  header: {
    height: 55,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sparkleIcon: {
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  botBubble: {
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputContainer: {
    height: 65,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
