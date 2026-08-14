import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// NOTE: To use expo-intent-launcher, it must be installed. 
// For now, this is a structural implementation for the auto-updater.
let IntentLauncher = null;
try {
  IntentLauncher = require('expo-intent-launcher');
} catch (e) {
  console.warn('expo-intent-launcher not installed. Auto-update installation will not work.');
}

const GITHUB_REPO_API = 'https://api.github.com/repos/nexviewconcept/ndesk-browser/releases/latest';

export const AppUpdateManager = {
  /**
   * Checks for the latest release on GitHub.
   * @param {string} currentVersion - The current app version.
   */
  async checkForUpdates(currentVersion) {
    try {
      const response = await fetch(GITHUB_REPO_API);
      if (!response.ok) return null;
      
      const data = await response.json();
      const latestVersion = data.tag_name; // e.g., 'v1.0.1'
      
      // Simple version comparison (assumes format vX.Y.Z)
      if (latestVersion && latestVersion !== `v${currentVersion}`) {
        // Find the APK asset
        const apkAsset = data.assets.find(asset => asset.name.endsWith('.apk'));
        if (apkAsset) {
          return {
            hasUpdate: true,
            version: latestVersion,
            downloadUrl: apkAsset.browser_download_url,
            releaseNotes: data.body
          };
        }
      }
      return { hasUpdate: false };
    } catch (error) {
      console.error('Update check failed:', error);
      return { hasUpdate: false, error };
    }
  },

  /**
   * Downloads the APK file to local cache.
   */
  async downloadUpdate(downloadUrl, onProgress) {
    try {
      const fileUri = FileSystem.cacheDirectory + 'NDesk_Update.apk';
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          if (onProgress) onProgress(progress);
        }
      );
      
      const { uri } = await downloadResumable.downloadAsync();
      return uri;
    } catch (error) {
      console.error('Download failed:', error);
      return null;
    }
  },

  /**
   * Triggers the Android package installer for the downloaded APK.
   */
  async installUpdate(fileUri) {
    if (Platform.OS !== 'android') {
      console.warn('Auto-install is only supported on Android.');
      return false;
    }
    
    if (!IntentLauncher) {
      console.error('IntentLauncher is required to install APKs.');
      return false;
    }

    try {
      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/vnd.android.package-archive',
      });
      return true;
    } catch (error) {
      console.error('Failed to trigger installer:', error);
      return false;
    }
  }
};
