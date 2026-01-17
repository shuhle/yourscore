/**
 * Completion Model for YourScore
 * Tracks daily activity completions
 */

import { db, generateId } from '../storage/db.js';
import { getLocalDateString, getTimestamp } from '../utils/date.js';

const STORE_NAME = 'completions';

/**
 * Completion model for tracking activity completions
 */
class CompletionModel {
  /**
   * Create a new completion record
   * @param {Object} data - Completion data
   * @param {string} data.activityId - Activity ID
   * @param {string} [data.date] - Date (YYYY-MM-DD), defaults to today
   * @returns {Promise<Object>} Created completion with id
   */
  static async create(data) {
    if (!data.activityId) {
      throw new Error('Activity ID is required');
    }

    const date = data.date || getLocalDateString();

    // Check if already completed today
    const existing = await this.findByActivityAndDate(data.activityId, date);
    if (existing) {
      throw new Error('Activity already completed for this date');
    }

    const completion = {
      id: generateId(),
      activityId: data.activityId,
      date: date,
      completedAt: getTimestamp()
    };

    await db.put(STORE_NAME, completion);
    return completion;
  }

  /**
   * Get a completion by ID
   * @param {string} id - Completion ID
   * @returns {Promise<Object|undefined>} Completion or undefined
   */
  static async getById(id) {
    return db.get(STORE_NAME, id);
  }

  /**
   * Find completion by activity and date
   * @param {string} activityId - Activity ID
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {Promise<Object|undefined>} Completion or undefined
   */
  static async findByActivityAndDate(activityId, date) {
    return db.getOneByIndex(STORE_NAME, 'activityDate', [activityId, date]);
  }

  /**
   * Check if an activity is completed for a date
   * @param {string} activityId - Activity ID
   * @param {string} [date] - Date (YYYY-MM-DD), defaults to today
   * @returns {Promise<boolean>}
   */
  static async isCompleted(activityId, date = getLocalDateString()) {
    const completion = await this.findByActivityAndDate(activityId, date);
    return completion !== undefined;
  }

  /**
   * Get all completions for a specific date
   * @param {string} [date] - Date (YYYY-MM-DD), defaults to today
   * @returns {Promise<Array>} Array of completions
   */
  static async getByDate(date = getLocalDateString()) {
    return db.getByIndex(STORE_NAME, 'date', date);
  }

  /**
   * Get all completions for an activity
   * @param {string} activityId - Activity ID
   * @returns {Promise<Array>} Array of completions
   */
  static async getByActivity(activityId) {
    return db.getByIndex(STORE_NAME, 'activityId', activityId);
  }

  /**
   * Get completions for a date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} Array of completions
   */
  static async getByDateRange(startDate, endDate) {
    const allCompletions = await db.getAll(STORE_NAME);
    return allCompletions.filter(c => c.date >= startDate && c.date <= endDate);
  }

  /**
   * Get all completions
   * @returns {Promise<Array>} Array of all completions
   */
  static async getAll() {
    return db.getAll(STORE_NAME);
  }

  /**
   * Delete a completion (undo)
   * @param {string} id - Completion ID
   * @returns {Promise<void>}
   */
  static async delete(id) {
    await db.delete(STORE_NAME, id);
  }

  /**
   * Delete completion by activity and date
   * @param {string} activityId - Activity ID
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  static async deleteByActivityAndDate(activityId, date) {
    const completion = await this.findByActivityAndDate(activityId, date);
    if (completion) {
      await this.delete(completion.id);
      return true;
    }
    return false;
  }

  /**
   * Toggle completion for an activity
   * @param {string} activityId - Activity ID
   * @param {string} [date] - Date (YYYY-MM-DD), defaults to today
   * @returns {Promise<{completed: boolean, completion: Object|null}>}
   */
  static async toggle(activityId, date = getLocalDateString()) {
    const existing = await this.findByActivityAndDate(activityId, date);

    if (existing) {
      await this.delete(existing.id);
      return { completed: false, completion: null };
    } else {
      const completion = await this.create({ activityId, date });
      return { completed: true, completion };
    }
  }

  /**
   * Count completions for a date
   * @param {string} [date] - Date (YYYY-MM-DD), defaults to today
   * @returns {Promise<number>}
   */
  static async countByDate(date = getLocalDateString()) {
    const completions = await this.getByDate(date);
    return completions.length;
  }

  /**
   * Get completion count by activity for a date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Object with activityId keys and count values
   */
  static async getCompletionCountsByActivity(startDate, endDate) {
    const completions = await this.getByDateRange(startDate, endDate);
    const counts = {};

    for (const completion of completions) {
      counts[completion.activityId] = (counts[completion.activityId] || 0) + 1;
    }

    return counts;
  }

  /**
   * Get dates with completions in a range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Set<string>>} Set of dates with completions
   */
  static async getDatesWithCompletions(startDate, endDate) {
    const completions = await this.getByDateRange(startDate, endDate);
    return new Set(completions.map(c => c.date));
  }

  /**
   * Check if all activities were completed on a date
   * @param {string} date - Date (YYYY-MM-DD)
   * @param {string[]} activityIds - Array of activity IDs to check
   * @returns {Promise<boolean>}
   */
  static async allCompleted(date, activityIds) {
    if (activityIds.length === 0) {
      return false; // No activities means can't complete all
    }

    const completions = await this.getByDate(date);
    const completedIds = new Set(completions.map(c => c.activityId));

    return activityIds.every(id => completedIds.has(id));
  }

  /**
   * Get streak of consecutive days with at least one completion
   * @param {string} [endDate] - End date (defaults to today)
   * @returns {Promise<number>} Number of consecutive days
   */
  static async getCompletionStreak(endDate = getLocalDateString()) {
    const allCompletions = await this.getAll();
    const datesWithCompletions = new Set(allCompletions.map(c => c.date));

    let streak = 0;
    let currentDate = endDate;

    while (datesWithCompletions.has(currentDate)) {
      streak++;
      // Go back one day
      const date = new Date(currentDate + 'T00:00:00');
      date.setDate(date.getDate() - 1);
      currentDate = getLocalDateString(date);
    }

    return streak;
  }

  /**
   * Clear all completions (for testing/reset)
   * @returns {Promise<void>}
   */
  static async clear() {
    await db.clear(STORE_NAME);
  }
}

export { CompletionModel };
export default CompletionModel;
