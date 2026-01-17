/**
 * Settings Model for YourScore
 * Manages user preferences and app configuration
 */

import { db } from '../storage/db.js';
import { getLocalDateString } from '../utils/date.js';

const STORE_NAME = 'settings';

/**
 * Default settings values
 */
const DEFAULTS = {
  decayAmount: 10,
  theme: 'light',
  uiScale: 1,
  mainScore: 0
};

/**
 * Settings model for managing user preferences
 */
class SettingsModel {
  /**
   * Get a single setting value
   * @param {string} key - Setting key
   * @param {*} [defaultValue] - Default value if not set
   * @returns {Promise<*>} Setting value
   */
  static async get(key, defaultValue = undefined) {
    const record = await db.get(STORE_NAME, key);
    if (record === undefined) {
      return defaultValue !== undefined ? defaultValue : DEFAULTS[key];
    }
    return record.value;
  }

  /**
   * Set a single setting value
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   * @returns {Promise<void>}
   */
  static async set(key, value) {
    await db.put(STORE_NAME, { key, value });
  }

  /**
   * Get all settings as an object
   * @returns {Promise<Object>} All settings
   */
  static async getAll() {
    const records = await db.getAll(STORE_NAME);
    const settings = { ...DEFAULTS };

    for (const record of records) {
      settings[record.key] = record.value;
    }

    return settings;
  }

  /**
   * Set multiple settings at once
   * @param {Object} settings - Object with key-value pairs
   * @returns {Promise<void>}
   */
  static async setMany(settings) {
    const records = Object.entries(settings).map(([key, value]) => ({
      key,
      value
    }));
    await db.putMany(STORE_NAME, records);
  }

  /**
   * Delete a setting (resets to default)
   * @param {string} key - Setting key
   * @returns {Promise<void>}
   */
  static async delete(key) {
    await db.delete(STORE_NAME, key);
  }

  /**
   * Reset all settings to defaults
   * @returns {Promise<void>}
   */
  static async reset() {
    await db.clear(STORE_NAME);
  }

  // ============ Convenience Methods ============

  /**
   * Get the decay amount per day
   * @returns {Promise<number>}
   */
  static async getDecayAmount() {
    return this.get('decayAmount', DEFAULTS.decayAmount);
  }

  /**
   * Set the decay amount per day
   * @param {number} amount
   * @returns {Promise<void>}
   */
  static async setDecayAmount(amount) {
    return this.set('decayAmount', amount);
  }

  /**
   * Get the current theme
   * @returns {Promise<string>}
   */
  static async getTheme() {
    return this.get('theme', DEFAULTS.theme);
  }

  /**
   * Set the theme
   * @param {string} theme - 'light' or 'dark'
   * @returns {Promise<void>}
   */
  static async setTheme(theme) {
    return this.set('theme', theme);
  }

  /**
   * Get the UI scale
   * @returns {Promise<number>}
   */
  static async getUIScale() {
    return this.get('uiScale', DEFAULTS.uiScale);
  }

  /**
   * Set the UI scale
   * @param {number} scale
   * @returns {Promise<void>}
   */
  static async setUIScale(scale) {
    return this.set('uiScale', scale);
  }

  /**
   * Get the main score
   * @returns {Promise<number>}
   */
  static async getMainScore() {
    return this.get('mainScore', DEFAULTS.mainScore);
  }

  /**
   * Set the main score
   * @param {number} score
   * @returns {Promise<void>}
   */
  static async setMainScore(score) {
    return this.set('mainScore', score);
  }

  /**
   * Get the first use date
   * @returns {Promise<string|null>} Date string (YYYY-MM-DD) or null
   */
  static async getFirstUseDate() {
    return this.get('firstUseDate', null);
  }

  /**
   * Set the first use date (should only be called once)
   * @param {string} [date] - Date string, defaults to today
   * @returns {Promise<void>}
   */
  static async setFirstUseDate(date = getLocalDateString()) {
    return this.set('firstUseDate', date);
  }

  /**
   * Get the last active date
   * @returns {Promise<string|null>} Date string (YYYY-MM-DD) or null
   */
  static async getLastActiveDate() {
    return this.get('lastActiveDate', null);
  }

  /**
   * Set the last active date
   * @param {string} [date] - Date string, defaults to today
   * @returns {Promise<void>}
   */
  static async setLastActiveDate(date = getLocalDateString()) {
    return this.set('lastActiveDate', date);
  }

  /**
   * Initialize settings for first-time user
   * Sets firstUseDate and lastActiveDate if not already set
   * @returns {Promise<boolean>} True if this is a new user
   */
  static async initializeIfNeeded() {
    const firstUseDate = await this.getFirstUseDate();

    if (firstUseDate === null) {
      const today = getLocalDateString();
      await this.setMany({
        firstUseDate: today,
        lastActiveDate: today,
        mainScore: DEFAULTS.mainScore,
        decayAmount: DEFAULTS.decayAmount
      });
      return true;
    }

    return false;
  }
}

export { SettingsModel, DEFAULTS };
export default SettingsModel;
