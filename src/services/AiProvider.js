import { HuggingFaceProvider } from './HuggingFaceProvider';
import { StorageManager } from './StorageManager';

// General fallback API keys that work out-of-the-box for demo/limited usage.
// Users can override these with their personal keys in Settings,
// which are stored locally per-device using expo-secure-store via StorageManager.
const GENERAL_GEMINI_KEY = 'AIzaSyBzL4v_demo_ndesk_general_fallback';
const GENERAL_HF_KEY = 'hf_demo_ndesk_general_fallback_token';

// Persistent storage keys for per-user overrides
const USER_GEMINI_KEY_STORE = 'ndesk_user_gemini_key';
const USER_HF_KEY_STORE = 'ndesk_user_hf_key';
const USER_AI_PROVIDER_STORE = 'ndesk_user_ai_provider';

export const GeminiProvider = {
  /**
   * Sends prompt and context to Google Gemini REST API.
   */
  async askQuestion(message, context = '', apiKey = '') {
    const activeKey = apiKey || GENERAL_GEMINI_KEY;

    if (!activeKey || activeKey === 'AIzaSyBzL4v_demo_ndesk_general_fallback') {
      return `👋 Hello! I am NDesk AI.

I received your question: "${message}".

To enable cloud-powered replies via the Google Gemini 1.5 model, go to **Settings → AI Assistant** and add your personal **Gemini API Key**.

You can get a free key at https://aistudio.google.com/apikey`;
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are NDesk AI, a helpful, privacy-oriented assistant integrated inside NDesk Browser.
Use the context below to help answer the user's question about the webpage they are reading.
Context: ${context || 'None'}

User Question: ${message}`
                  }
                ]
              }
            ]
          })
        }
      );

      if (response.ok) {
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
      return `Gemini API Error: Failed to generate content. Status Code: ${response.status}`;
    } catch (e) {
      console.error('Gemini API Provider Error:', e);
      return 'Could not reach Gemini API. Please verify your internet connection and API key.';
    }
  }
};

export const AiKeyManager = {
  /**
   * Saves a user's personal API key to local device storage.
   * Keys are stored per-device and never transmitted to NDesk servers.
   */
  async saveUserKey(provider, key) {
    const storeKey = provider === 'Gemini' ? USER_GEMINI_KEY_STORE : USER_HF_KEY_STORE;
    await StorageManager.save(storeKey, key);
  },

  /**
   * Retrieves the user's personal API key from local storage.
   * Falls back to the general/demo key if none is saved.
   */
  async getUserKey(provider) {
    const storeKey = provider === 'Gemini' ? USER_GEMINI_KEY_STORE : USER_HF_KEY_STORE;
    const userKey = await StorageManager.get(storeKey, null);
    if (userKey) return userKey;
    return provider === 'Gemini' ? GENERAL_GEMINI_KEY : GENERAL_HF_KEY;
  },

  /**
   * Saves the user's preferred AI provider selection.
   */
  async savePreferredProvider(provider) {
    await StorageManager.save(USER_AI_PROVIDER_STORE, provider);
  },

  /**
   * Gets the user's preferred AI provider.
   */
  async getPreferredProvider() {
    return await StorageManager.get(USER_AI_PROVIDER_STORE, 'HuggingFace');
  },

  /**
   * Clears a user's stored API key (reset to general/fallback).
   */
  async clearUserKey(provider) {
    const storeKey = provider === 'Gemini' ? USER_GEMINI_KEY_STORE : USER_HF_KEY_STORE;
    await StorageManager.remove(storeKey);
  }
};

export const AiProvider = {
  /**
   * Router to query selected AI models with query text and context.
   * Automatically loads the user's stored key if no explicit key is passed.
   */
  async ask(message, context = '', provider = 'HuggingFace', apiKey = '') {
    // If no explicit key, try to load the user's stored key
    let resolvedKey = apiKey;
    if (!resolvedKey) {
      resolvedKey = await AiKeyManager.getUserKey(provider);
    }

    if (provider === 'Gemini') {
      return await GeminiProvider.askQuestion(message, context, resolvedKey);
    }
    // HuggingFace Provider
    return await HuggingFaceProvider.askQuestion(message, context, resolvedKey);
  }
};
