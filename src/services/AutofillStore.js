import { StorageManager } from './StorageManager';

const LOGINS_KEY = 'ndesk_autofill_logins';
const CARDS_KEY = 'ndesk_autofill_cards';

export const AutofillStore = {
  /**
   * Save a login credential (username and password) linked to a domain.
   */
  async saveLogin(domain, username, password) {
    try {
      const logins = await StorageManager.get(LOGINS_KEY, []);
      
      // Prevent duplicates, update password if username exists
      const cleanedDomain = this.cleanDomain(domain);
      const existingIdx = logins.findIndex(
        item => this.cleanDomain(item.domain) === cleanedDomain && item.username === username
      );

      if (existingIdx > -1) {
        logins[existingIdx].password = password;
        logins[existingIdx].updatedAt = new Date().toISOString();
      } else {
        logins.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          domain: cleanedDomain,
          username,
          password,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      await StorageManager.save(LOGINS_KEY, logins);
      return true;
    } catch (e) {
      console.error('Error saving login details:', e);
      return false;
    }
  },

  /**
   * Retrieve all saved login credentials for a specific domain.
   */
  async getLoginsForDomain(domain) {
    try {
      const logins = await StorageManager.get(LOGINS_KEY, []);
      const cleanedDomain = this.cleanDomain(domain);
      return logins.filter(item => this.cleanDomain(item.domain) === cleanedDomain);
    } catch (e) {
      console.error('Error fetching logins for domain:', e);
      return [];
    }
  },

  /**
   * Retrieve all saved logins.
   */
  async getAllLogins() {
    return await StorageManager.get(LOGINS_KEY, []);
  },

  /**
   * Save a payment card.
   */
  async savePaymentCard(cardNumber, cardHolder, expiryDate, cvv) {
    try {
      const cards = await StorageManager.get(CARDS_KEY, []);
      
      // Mask card number for lookup and safety
      const maskedNumber = '•••• •••• •••• ' + cardNumber.slice(-4);
      
      const existingIdx = cards.findIndex(c => c.cardNumber === cardNumber);
      if (existingIdx > -1) {
        cards[existingIdx] = {
          id: cards[existingIdx].id,
          cardNumber,
          maskedNumber,
          cardHolder,
          expiryDate,
          cvv,
          updatedAt: new Date().toISOString(),
        };
      } else {
        cards.push({
          id: Date.now().toString(),
          cardNumber,
          maskedNumber,
          cardHolder,
          expiryDate,
          cvv,
          createdAt: new Date().toISOString(),
        });
      }
      await StorageManager.save(CARDS_KEY, cards);
      return true;
    } catch (e) {
      console.error('Error saving payment card:', e);
      return false;
    }
  },

  /**
   * Retrieve all saved payment cards.
   */
  async getPaymentCards() {
    return await StorageManager.get(CARDS_KEY, []);
  },

  /**
   * Helper to clean URL domains for matching.
   */
  cleanDomain(url) {
    if (!url) return '';
    let domain = url.replace(/^(https?:\/\/)?(www\.)?/, '');
    domain = domain.split('/')[0];
    domain = domain.split(':')[0];
    return domain.toLowerCase();
  }
};
