import { PreferenceStorage } from './StorageManager';

const DOWNLOADS_KEY = 'ndesk_downloads';

const MIME_ICONS = {
  pdf:   { icon: 'document-text-outline', color: '#EF4444' },
  zip:   { icon: 'archive-outline',       color: '#F59E0B' },
  mp4:   { icon: 'videocam-outline',      color: '#3B82F6' },
  mp3:   { icon: 'musical-notes-outline', color: '#8B5CF6' },
  jpg:   { icon: 'image-outline',         color: '#10B981' },
  jpeg:  { icon: 'image-outline',         color: '#10B981' },
  png:   { icon: 'image-outline',         color: '#10B981' },
  gif:   { icon: 'image-outline',         color: '#10B981' },
  apk:   { icon: 'logo-android',          color: '#22C55E' },
  docx:  { icon: 'document-outline',      color: '#2563EB' },
  xlsx:  { icon: 'grid-outline',          color: '#16A34A' },
  default: { icon: 'download-outline',   color: '#6B7280' },
};

export const DownloadManager = {
  /**
   * Returns icon metadata for a given URL/filename.
   */
  getIconForUrl(url) {
    const ext = (url || '').split('?')[0].split('.').pop().toLowerCase();
    return MIME_ICONS[ext] || MIME_ICONS.default;
  },

  /**
   * Retrieve all download records.
   */
  async getDownloads() {
    return await StorageManager.get(DOWNLOADS_KEY, []);
  },

  /**
   * Add a new download record (returns the created entry).
   */
  async addDownload(url, filename) {
    const downloads = await this.getDownloads();
    const entry = {
      id:         Date.now().toString(),
      url,
      filename:   filename || this._nameFromUrl(url),
      status:     'pending',   // pending | downloading | paused | complete | error
      progress:   0,           // 0-100
      size:       null,        // bytes, if known
      createdAt:  new Date().toISOString(),
      completedAt: null,
    };
    downloads.unshift(entry);
    await StorageManager.save(DOWNLOADS_KEY, downloads);
    return entry;
  },

  /**
   * Update a download entry by id.
   */
  async updateDownload(id, patch) {
    const downloads = await this.getDownloads();
    const idx = downloads.findIndex(d => d.id === id);
    if (idx === -1) return null;
    downloads[idx] = { ...downloads[idx], ...patch };
    await this._saveDownloads(downloads);
    return downloads[idx];
  },

  async _saveDownloads(downloads) {
    await PreferenceStorage.save(DOWNLOADS_KEY, downloads);
  },

  /**
   * Delete a download record.
   */
  async deleteDownload(id) {
    const downloads = await this.getDownloads();
    await PreferenceStorage.save(DOWNLOADS_KEY, downloads.filter(d => d.id !== id));
    return true;
  },

  /**
   * Clear all completed downloads.
   */
  async clearCompleted() {
    const downloads = await this.getDownloads();
    await PreferenceStorage.save(DOWNLOADS_KEY, downloads.filter(d => d.status !== 'complete'));
    return true;
  },

  /**
   * Start/resume a download using fetch with progress tracking.
   * Calls onProgress(percent), onComplete(), onError(err).
   */
  async startDownload(id, url, { onProgress, onComplete, onError } = {}) {
    try {
      await this.updateDownload(id, { status: 'downloading', progress: 0 });

      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : null;
      await this.updateDownload(id, { size: total });

      const reader = response.body?.getReader();
      let received = 0;

      if (!reader) {
        // Fallback — no streaming available, mark as complete
        await this.updateDownload(id, { status: 'complete', progress: 100, completedAt: new Date().toISOString() });
        onComplete?.();
        return;
      }

      const readChunk = async () => {
        const { done, value } = await reader.read();
        if (done) {
          await this.updateDownload(id, { status: 'complete', progress: 100, completedAt: new Date().toISOString() });
          onComplete?.();
          return;
        }
        received += value.length;
        const percent = total ? Math.round((received / total) * 100) : null;
        if (percent !== null) {
          await this.updateDownload(id, { progress: percent });
          onProgress?.(percent);
        }
        // Continue reading
        await readChunk();
      };

      await readChunk();
    } catch (err) {
      await this.updateDownload(id, { status: 'error' });
      onError?.(err);
    }
  },

  _nameFromUrl(url) {
    try {
      const pathname = new URL(url).pathname;
      const parts = pathname.split('/');
      const name = parts[parts.length - 1];
      return decodeURIComponent(name) || 'download';
    } catch {
      return 'download';
    }
  },
};
