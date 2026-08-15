import { HuggingFaceProvider } from './HuggingFaceProvider';
import { SecureStorage, PreferenceStorage } from './StorageManager';

// General fallback API keys that work out-of-the-box for demo/limited usage.
// Users can override these with their personal keys in Settings,
// which are stored locally per-device using expo-secure-store via StorageManager.
const GENERAL_GEMINI_KEY = 'AIzaSyBzL4v_demo_ndesk_general_fallback';
const GENERAL_HF_KEY = 'hf_demo_ndesk_general_fallback_token';

// Persistent storage keys for per-user overrides
const USER_KEY_STORE_PREFIX = 'ndesk_user_key_';
const USER_AI_PROVIDER_STORE = 'ndesk_user_ai_provider';

export const ProviderRegistry = {
  HuggingFace: {
    name: 'HuggingFace',
    endpoint: 'https://api-inference.huggingface.co/models/...',
    privacyUrl: 'https://huggingface.co/privacy',
    termsUrl: 'https://huggingface.co/terms',
  },
  Gemini: {
    name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/...',
    privacyUrl: 'https://policies.google.com/privacy',
    termsUrl: 'https://policies.google.com/terms',
  },
  Groq: {
    name: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama3-8b-8192',
    privacyUrl: 'https://groq.com/privacy-policy/',
    termsUrl: 'https://groq.com/terms-of-use/',
  },
  Cerebras: {
    name: 'Cerebras',
    endpoint: 'https://api.cerebras.ai/v1/chat/completions',
    model: 'llama3.1-8b',
    privacyUrl: 'https://cerebras.ai/privacy-policy/',
    termsUrl: 'https://cerebras.ai/terms-of-use/',
  },
  OpenRouter: {
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3-8b-instruct:free',
    privacyUrl: 'https://openrouter.ai/privacy',
    termsUrl: 'https://openrouter.ai/terms',
  },
  Mistral: {
    name: 'Mistral AI',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-tiny',
    privacyUrl: 'https://mistral.ai/privacy/',
    termsUrl: 'https://mistral.ai/terms/',
  },
  NVIDIANIM: {
    name: 'NVIDIA NIM',
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'meta/llama3-8b-instruct',
    privacyUrl: 'https://www.nvidia.com/en-us/about-nvidia/privacy-policy/',
    termsUrl: 'https://www.nvidia.com/en-us/about-nvidia/terms-of-service/',
  },
  GitHubModels: {
    name: 'GitHub Models',
    endpoint: 'https://models.inference.ai.azure.com/chat/completions',
    model: 'gpt-4o-mini',
    privacyUrl: 'https://docs.github.com/en/site-policy/privacy-policies',
    termsUrl: 'https://docs.github.com/en/site-policy/github-terms',
  }
};

const OpenAICompatibleProvider = {
  async askQuestion(providerConfig, message, context, apiKey) {
    if (!apiKey) {
      return `👋 Hello! I am NDesk AI.\n\nTo enable cloud-powered replies via ${providerConfig.name}, go to **Settings → AI Assistant** and add your personal API Key.`;
    }

    try {
      const response = await fetch(providerConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          ...(providerConfig.name === 'OpenRouter' ? {
             'HTTP-Referer': 'https://ndesk.io',
             'X-Title': 'NDesk Browser'
          } : {})
        },
        body: JSON.stringify({
          model: providerConfig.model,
          messages: [
            { role: 'system', content: `You are NDesk AI, a helpful, privacy-oriented assistant integrated inside NDesk Browser. Use the context below to help answer the user's question about the webpage they are reading.\nContext: ${context || 'None'}` },
            { role: 'user', content: message }
          ]
        })
      });

      if (response.ok) {
        const result = await response.json();
        const text = result.choices?.[0]?.message?.content;
        if (text) return text.trim();
      }
      return `${providerConfig.name} API Error: Failed to generate content. Status Code: ${response.status}`;
    } catch (e) {
      console.error(`${providerConfig.name} API Provider Error:`, e);
      return `Could not reach ${providerConfig.name} API. Please verify your internet connection and API key.`;
    }
  }
};

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
    const storeKey = USER_KEY_STORE_PREFIX + provider;
    await SecureStorage.save(storeKey, key);
  },

  /**
   * Retrieves the user's personal API key from local storage.
   * Falls back to the general/demo key if none is saved.
   */
  async getUserKey(provider) {
    const storeKey = USER_KEY_STORE_PREFIX + provider;
    const userKey = await SecureStorage.get(storeKey, null);
    if (userKey) return userKey;
    if (provider === 'Gemini') return GENERAL_GEMINI_KEY;
    if (provider === 'HuggingFace') return GENERAL_HF_KEY;
    return ''; // Other providers don't have built-in fallbacks
  },

  /**
   * Saves the user's preferred AI provider selection.
   */
  async savePreferredProvider(provider) {
    await PreferenceStorage.save(USER_AI_PROVIDER_STORE, provider);
  },

  /**
   * Gets the user's preferred AI provider.
   */
  async getPreferredProvider() {
    return await PreferenceStorage.get(USER_AI_PROVIDER_STORE, 'HuggingFace');
  },

  /**
   * Clears a user's stored API key (reset to general/fallback).
   */
  async clearUserKey(provider) {
    const storeKey = USER_KEY_STORE_PREFIX + provider;
    await SecureStorage.remove(storeKey);
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
    if (provider === 'HuggingFace') {
      return await HuggingFaceProvider.askQuestion(message, context, resolvedKey);
    }
    
    // Check if it's an OpenAI compatible REST provider
    if (ProviderRegistry[provider]) {
      return await OpenAICompatibleProvider.askQuestion(ProviderRegistry[provider], message, context, resolvedKey);
    }
    
    return 'Error: Unknown AI Provider selected.';
  }
};
