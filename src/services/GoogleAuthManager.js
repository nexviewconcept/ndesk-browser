import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { SecureStorage } from './StorageManager';

// Completed browser-based auth session
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_AUTH_KEY = 'ndesk_google_auth';

export const GoogleAuthManager = {
  /**
   * Retrieves active authentication data.
   */
  async getAuthData() {
    return await SecureStorage.get(GOOGLE_AUTH_KEY, null);
  },

  /**
   * Saves authentication data.
   */
  async saveAuthData(data) {
    await SecureStorage.save(GOOGLE_AUTH_KEY, data);
  },

  /**
   * Clears authentication data (signs out).
   */
  async signOut() {
    await SecureStorage.remove(GOOGLE_AUTH_KEY);
    return true;
  },

  /**
   * Fetches Google user profile using the access token.
   */
  async fetchUserInfo(accessToken) {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (e) {
      console.error('Error fetching user info:', e);
      return null;
    }
  },

  /**
   * Starts real OAuth flow if Google Client ID is configured.
   * Forces account_select prompt so user can pick their device email.
   * If not configured, falls back to demo mode with mock data for developer convenience.
   */
  async signIn(clientId = null) {
    if (!clientId) {
      // Mock sign-in for testing purposes
      const mockData = {
        accessToken: 'mock_token_' + Date.now(),
        user: {
          name: 'NDesk Tester',
          email: 'tester@ndesk.io',
          picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
        }
      };
      await this.saveAuthData(mockData);
      return mockData;
    }

    try {
      const redirectUri = AuthSession.makeRedirectUri();
      const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
      };

      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: ['https://www.googleapis.com/auth/drive.file', 'openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.Token,
        prompt: AuthSession.Prompt.SelectAccount,  // Always shows account picker
      });

      const result = await request.promptAsync(discovery);

      if (result.type === 'success' && result.authentication?.accessToken) {
        const accessToken = result.authentication.accessToken;
        const user = await this.fetchUserInfo(accessToken);
        const authData = { accessToken, user };
        await this.saveAuthData(authData);
        return authData;
      }
      return null;
    } catch (error) {
      console.error('OAuth flow error:', error);
      throw error;
    }
  }
};
