import { StorageManager } from './StorageManager';

const PRIVACY_SETTINGS_KEY = 'ndesk_privacy_settings';

const DEFAULT_SETTINGS = {
  incognitoMode: false,
  adBlockEnabled: true,
  httpsOnlyMode: true,
  cookiePolicy: 'no-third-party',
  searchEngine: 'Google', // Changed to Google as requested
  customUserAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  googleClientId: '897737077020-j4se6psb0c48tjlt0i408mo4pnhstg99.apps.googleusercontent.com'
};

const USER_AGENTS = [
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36', // Chrome Android
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', // Safari iOS
  'Mozilla/5.0 (Linux; Android 10; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0', // Firefox Android
];

export const PrivacyManager = {
  /**
   * Retrieves the current privacy settings.
   */
  async getSettings() {
    const settings = await StorageManager.get(PRIVACY_SETTINGS_KEY, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...settings };
  },

  /**
   * Updates a single setting.
   */
  async updateSetting(key, value) {
    const settings = await this.getSettings();
    settings[key] = value;
    await StorageManager.save(PRIVACY_SETTINGS_KEY, settings);
    return settings;
  },

  /**
   * Gets a random User Agent for privacy rotation.
   */
  getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  },

  /**
   * Formats a search query or URL.
   */
  async formatUrl(input, engine = 'Google') {
    if (!input) return 'about:blank';
    
    const trimmed = input.trim();
    const settings = await this.getSettings();
    
    // Check if input looks like a URL
    const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i;
    const ipPattern = /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?/i;
    
    if (urlPattern.test(trimmed) || ipPattern.test(trimmed) || trimmed.startsWith('localhost:')) {
      if (!/^https?:\/\//i.test(trimmed)) {
        return `https://${trimmed}`;
      }
      if (settings.httpsOnlyMode && trimmed.startsWith('http://') && !trimmed.includes('localhost')) {
        return trimmed.replace('http://', 'https://');
      }
      return trimmed;
    }

    // Otherwise, execute search
    const cleanQuery = encodeURIComponent(trimmed);
    switch (engine) {
      case 'DuckDuckGo':
        return `https://duckduckgo.com/?q=${cleanQuery}`;
      case 'Bing':
        return `https://www.bing.com/search?q=${cleanQuery}`;
      case 'Google':
      default:
        return `https://www.google.com/search?q=${cleanQuery}`;
    }
  }
};
