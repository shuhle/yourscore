/**
 * Score Model for YourScore
 * Manages the main score and score history
 */

import { db } from '../storage/db.js';
import { SettingsModel } from './settings.js';
import { getLocalDateString } from '../utils/date.js';

const HISTORY_STORE = 'scoreHistory';

/**
 * Score model for managing the main score and history
 */
class ScoreModel {
  /**
   * Get the current main score
   * @returns {Promise<number>}
   */
  static async getScore() {
    return SettingsModel.getMainScore();
  }

  /**
   * Set the main score to a specific value
   * @param {number} score - New score value
   * @returns {Promise<void>}
   */
  static async setScore(score) {
    await SettingsModel.setMainScore(score);
  }

  /**
   * Add points to the main score
   * @param {number} points - Points to add (can be negative)
   * @returns {Promise<number>} New score value
   */
  static async addPoints(points) {
    const currentScore = await this.getScore();
    const newScore = currentScore + points;
    await this.setScore(newScore);
    return newScore;
  }

  /**
   * Subtract points from the main score
   * @param {number} points - Points to subtract
   * @returns {Promise<number>} New score value
   */
  static async subtractPoints(points) {
    return this.addPoints(-points);
  }

  /**
   * Reset the score to zero
   * @returns {Promise<void>}
   */
  static async reset() {
    await this.setScore(0);
  }

  // ============ Score History ============

  /**
   * Record score history for a day
   * @param {Object} data - History data
   * @param {string} [data.date] - Date (YYYY-MM-DD), defaults to today
   * @param {number} data.score - Score at end of day
   * @param {number} data.earned - Points earned that day
   * @param {number} data.decay - Decay applied that day
   * @returns {Promise<Object>} History record
   */
  static async recordHistory(data) {
    const record = {
      date: data.date || getLocalDateString(),
      score: data.score,
      earned: data.earned || 0,
      decay: data.decay || 0
    };

    await db.put(HISTORY_STORE, record);
    return record;
  }

  /**
   * Get score history for a specific date
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {Promise<Object|undefined>} History record or undefined
   */
  static async getHistoryByDate(date) {
    return db.get(HISTORY_STORE, date);
  }

  /**
   * Get score history for a date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} Array of history records, sorted by date
   */
  static async getHistoryRange(startDate, endDate) {
    const allHistory = await db.getAll(HISTORY_STORE);
    return allHistory
      .filter(h => h.date >= startDate && h.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get all score history
   * @returns {Promise<Array>} Array of all history records, sorted by date
   */
  static async getAllHistory() {
    const history = await db.getAll(HISTORY_STORE);
    return history.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get today's history record
   * @returns {Promise<Object|undefined>}
   */
  static async getTodayHistory() {
    return this.getHistoryByDate(getLocalDateString());
  }

  /**
   * Update or create today's history
   * @param {Object} updates - Data to update
   * @returns {Promise<Object>} Updated history record
   */
  static async updateTodayHistory(updates) {
    const today = getLocalDateString();
    const existing = await this.getHistoryByDate(today);

    const record = {
      date: today,
      score: updates.score ?? existing?.score ?? await this.getScore(),
      earned: updates.earned ?? existing?.earned ?? 0,
      decay: updates.decay ?? existing?.decay ?? 0
    };

    await db.put(HISTORY_STORE, record);
    return record;
  }

  /**
   * Add earned points to today's history
   * @param {number} points - Points earned
   * @returns {Promise<Object>} Updated history record
   */
  static async addEarnedToday(points) {
    const existing = await this.getTodayHistory();
    const currentEarned = existing?.earned || 0;

    return this.updateTodayHistory({
      earned: currentEarned + points,
      score: await this.getScore()
    });
  }

  /**
   * Get points earned today
   * @returns {Promise<number>}
   */
  static async getEarnedToday() {
    const history = await this.getTodayHistory();
    return history?.earned || 0;
  }

  /**
   * Get decay applied today
   * @returns {Promise<number>}
   */
  static async getDecayToday() {
    const history = await this.getTodayHistory();
    return history?.decay || 0;
  }

  /**
   * Calculate break-even status for today
   * @returns {Promise<Object>} {breakEven: boolean, remaining: number, surplus: number, percent: number}
   */
  static async getBreakEvenStatus() {
    const decayAmount = await SettingsModel.getDecayAmount();
    const earnedToday = await this.getEarnedToday();

    const breakEven = earnedToday >= decayAmount;
    const remaining = Math.max(0, decayAmount - earnedToday);
    const surplus = Math.max(0, earnedToday - decayAmount);
    const percent = getBreakEvenPercent(earnedToday, decayAmount);

    return { breakEven, remaining, surplus, earned: earnedToday, decay: decayAmount, percent };
  }

  /**
   * Get highest score ever achieved
   * @returns {Promise<number>}
   */
  static async getHighestScore() {
    const history = await this.getAllHistory();
    if (history.length === 0) {
      return await this.getScore();
    }
    const highestInHistory = Math.max(...history.map(h => h.score));
    const currentScore = await this.getScore();
    return Math.max(highestInHistory, currentScore);
  }

  /**
   * Get lowest score ever reached
   * @returns {Promise<number>}
   */
  static async getLowestScore() {
    const history = await this.getAllHistory();
    if (history.length === 0) {
      return await this.getScore();
    }
    const lowestInHistory = Math.min(...history.map(h => h.score));
    const currentScore = await this.getScore();
    return Math.min(lowestInHistory, currentScore);
  }

  /**
   * Clear all score history (for testing/reset)
   * @returns {Promise<void>}
   */
  static async clearHistory() {
    await db.clear(HISTORY_STORE);
  }
}

/**
 * Calculate break-even percentage
 * @param {number} earned - Points earned
 * @param {number} decay - Decay amount
 * @returns {number} Percentage (0-100)
 */
function getBreakEvenPercent(earned, decay) {
  if (decay === 0) {return 100;}
  return Math.min(100, Math.round((earned / decay) * 100));
}

export { ScoreModel, getBreakEvenPercent };
export default ScoreModel;
