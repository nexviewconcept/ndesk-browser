import { StorageManager } from './StorageManager';

const BOOKMARKS_KEY = 'ndesk_bookmarks';

export const BookmarkStore = {
  async getBookmarks() {
    const defaultBookmarks = [
      {
        id: 'default_nexview',
        title: 'Nexview Concept',
        url: 'https://nexviewconcept.com.ng',
        folder: 'Bookmarks',
        isSystem: true,
        isDeletable: false,
        isEditable: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'default_openskills',
        title: 'Open Skills Academy',
        url: 'https://openskillsacademy.org',
        folder: 'Bookmarks',
        isSystem: true,
        isDeletable: false,
        isEditable: false,
        createdAt: new Date().toISOString()
      }
    ];
    let bookmarks = await StorageManager.get(BOOKMARKS_KEY, null);

    // Migration: If no bookmarks, return defaults
    if (!bookmarks) {
      await StorageManager.save(BOOKMARKS_KEY, defaultBookmarks);
      return defaultBookmarks;
    }
    
    // Migration: ensure system bookmarks exist and have proper flags
    let updated = false;
    defaultBookmarks.forEach(sysB => {
      const existingIndex = bookmarks.findIndex(b => b.url.toLowerCase() === sysB.url.toLowerCase() || b.id === sysB.id);
      if (existingIndex === -1) {
        bookmarks.unshift(sysB);
        updated = true;
      } else {
        // Enforce system flags on existing ones
        if (!bookmarks[existingIndex].isSystem || bookmarks[existingIndex].isDeletable !== false) {
          bookmarks[existingIndex] = { ...bookmarks[existingIndex], ...sysB };
          updated = true;
        }
      }
    });

    if (updated) {
      await StorageManager.save(BOOKMARKS_KEY, bookmarks);
    }
    
    return bookmarks;
  },

  /**
   * Adds a new bookmark.
   */
  async addBookmark(title, url, folder = 'Bookmarks') {
    if (!url) return false;
    
    const bookmarks = await this.getBookmarks();
    
    // Avoid duplicate URL bookmarks
    if (bookmarks.some(b => b.url.toLowerCase() === url.toLowerCase())) {
      return false;
    }

    const newBookmark = {
      id: Date.now().toString(),
      title: title || url,
      url,
      folder,
      createdAt: new Date().toISOString()
    };

    bookmarks.push(newBookmark);
    await StorageManager.save(BOOKMARKS_KEY, bookmarks);
    return newBookmark;
  },

  /**
   * Deletes a bookmark by ID.
   */
  async deleteBookmark(id) {
    const bookmarks = await this.getBookmarks();
    const filtered = bookmarks.filter(b => b.id !== id);
    await StorageManager.save(BOOKMARKS_KEY, filtered);
    return true;
  },

  /**
   * Toggles bookmark state for a given URL.
   */
  async toggleBookmark(title, url) {
    const bookmarks = await this.getBookmarks();
    const existingIndex = bookmarks.findIndex(b => b.url.toLowerCase() === url.toLowerCase());
    
    if (existingIndex > -1) {
      // Remove it
      bookmarks.splice(existingIndex, 1);
      await StorageManager.save(BOOKMARKS_KEY, bookmarks);
      return false; // Not bookmarked anymore
    } else {
      // Add it
      await this.addBookmark(title, url);
      return true; // Bookmarked now
    }
  },

  /**
   * Checks if a URL is bookmarked.
   */
  async isBookmarked(url) {
    if (!url) return false;
    const bookmarks = await this.getBookmarks();
    return bookmarks.some(b => b.url.toLowerCase() === url.toLowerCase());
  }
};
