import { StorageManager } from './StorageManager';

const LAST_SYNC_KEY = 'ndesk_last_sync_timestamp';
const MOCK_CLOUD_STORE = 'ndesk_mock_cloud_store';

export const DriveBackupManager = {
  /**
   * Gets the formatted timestamp of the last sync operation.
   */
  async getLastSyncTime() {
    return await StorageManager.get(LAST_SYNC_KEY, null);
  },

  /**
   * Uploads bookmarks, settings, and history to Google Drive.
   * If using mock credentials, writes to a local simulated cloud store.
   */
  async uploadBackup(authData, bookmarks, settings, history) {
    if (!authData || !authData.accessToken) return false;

    const backupPayload = {
      bookmarks,
      settings,
      // EXCLUDED FOR PRIVACY: history is not backed up to the cloud without encryption
      // history,
      timestamp: new Date().toISOString(),
    };

    // Handle developer/tester mock flow
    if (authData.accessToken.startsWith('mock_token_')) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network lag
      await StorageManager.save(MOCK_CLOUD_STORE, backupPayload);
      const timestamp = new Date().toISOString();
      await StorageManager.save(LAST_SYNC_KEY, timestamp);
      return { success: true, timestamp };
    }

    try {
      const accessToken = authData.accessToken;
      
      // 1. Search for existing file
      const searchRes = await fetch(
        'https://www.googleapis.com/drive/v3/files?q=name="ndesk_backup.json" and trashed=false',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      let fileId = null;
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          fileId = searchData.files[0].id;
        }
      }

      const metadata = {
        name: 'ndesk_backup.json',
        mimeType: 'application/json',
      };

      let uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      let method = 'POST';

      if (fileId) {
        uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
        method = 'PATCH';
      }

      const boundary = 'ndesk_boundary';
      const body = 
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${JSON.stringify(backupPayload)}\r\n` +
        `--${boundary}--`;

      const uploadRes = await fetch(uploadUrl, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      });

      if (uploadRes.ok) {
        const timestamp = new Date().toISOString();
        await StorageManager.save(LAST_SYNC_KEY, timestamp);
        return { success: true, timestamp };
      }
      return false;
    } catch (e) {
      console.error('Google Drive Sync Upload Error:', e);
      return false;
    }
  },

  /**
   * Downloads and parses the backup from Google Drive.
   */
  async downloadBackup(authData) {
    if (!authData || !authData.accessToken) return null;

    if (authData.accessToken.startsWith('mock_token_')) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network lag
      return await StorageManager.get(MOCK_CLOUD_STORE, null);
    }

    try {
      const accessToken = authData.accessToken;
      
      // Search for file
      const searchRes = await fetch(
        'https://www.googleapis.com/drive/v3/files?q=name="ndesk_backup.json" and trashed=false',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!searchRes.ok) return null;
      const searchData = await searchRes.json();
      if (!searchData.files || searchData.files.length === 0) return null;

      const fileId = searchData.files[0].id;
      
      // Download content
      const downloadRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (downloadRes.ok) {
        return await downloadRes.json();
      }
      return null;
    } catch (e) {
      console.error('Google Drive Sync Download Error:', e);
      return null;
    }
  }
};
