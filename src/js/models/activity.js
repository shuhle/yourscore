/**
 * Activity Model for YourScore
 * Manages activities with CRUD operations
 */

import { db, generateId } from '../storage/db.js';
import { getTimestamp } from '../utils/date.js';
import { UNCATEGORIZED_ID } from './category.js';

const STORE_NAME = 'activities';

/**
 * Activity model for managing trackable activities
 */
class ActivityModel {
  /**
   * Create a new activity
   * @param {Object} data - Activity data
   * @param {string} data.name - Activity name
   * @param {string} [data.description] - Activity description
   * @param {number} data.points - Points earned when completed
   * @param {string} [data.categoryId] - Category ID (defaults to Uncategorized)
   * @returns {Promise<Object>} Created activity with id
   */
  static async create(data) {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Activity name is required');
    }

    if (!data.points || data.points < 1) {
      throw new Error('Points must be a positive number');
    }

    const activity = {
      id: generateId(),
      name: data.name.trim(),
      description: data.description?.trim() || '',
      points: Math.floor(data.points),
      categoryId: data.categoryId || UNCATEGORIZED_ID,
      archived: false,
      createdAt: getTimestamp()
    };

    await db.put(STORE_NAME, activity);
    return activity;
  }

  /**
   * Get an activity by ID
   * @param {string} id - Activity ID
   * @returns {Promise<Object|undefined>} Activity or undefined
   */
  static async getById(id) {
    return db.get(STORE_NAME, id);
  }

  /**
   * Get all activities (excluding archived)
   * @returns {Promise<Array>} Array of active activities
   */
  static async getAll() {
    const activities = await db.getAll(STORE_NAME);
    return activities.filter(a => !a.archived);
  }

  /**
   * Get all activities including archived
   * @returns {Promise<Array>} Array of all activities
   */
  static async getAllIncludingArchived() {
    return db.getAll(STORE_NAME);
  }

  /**
   * Get activities by category
   * @param {string} categoryId - Category ID
   * @returns {Promise<Array>} Array of activities in the category
   */
  static async getByCategory(categoryId) {
    const activities = await db.getByIndex(STORE_NAME, 'categoryId', categoryId);
    return activities.filter(a => !a.archived);
  }

  /**
   * Get activities grouped by category
   * @returns {Promise<Object>} Object with categoryId keys and activity arrays
   */
  static async getGroupedByCategory() {
    const activities = await this.getAll();
    const grouped = {};

    for (const activity of activities) {
      const categoryId = activity.categoryId || UNCATEGORIZED_ID;
      if (!grouped[categoryId]) {
        grouped[categoryId] = [];
      }
      grouped[categoryId].push(activity);
    }

    return grouped;
  }

  /**
   * Update an activity
   * @param {string} id - Activity ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object>} Updated activity
   */
  static async update(id, data) {
    const activity = await this.getById(id);
    if (!activity) {
      throw new Error(`Activity not found: ${id}`);
    }

    // Validate if points is being updated
    if (data.points !== undefined && data.points < 1) {
      throw new Error('Points must be a positive number');
    }

    const updated = {
      ...activity,
      ...data,
      id, // Ensure ID cannot be changed
      name: data.name?.trim() || activity.name,
      description: data.description !== undefined ? data.description.trim() : activity.description,
      points: data.points !== undefined ? Math.floor(data.points) : activity.points
    };

    await db.put(STORE_NAME, updated);
    return updated;
  }

  /**
   * Archive an activity (soft delete)
   * @param {string} id - Activity ID
   * @returns {Promise<Object>} Archived activity
   */
  static async archive(id) {
    return this.update(id, { archived: true });
  }

  /**
   * Unarchive an activity
   * @param {string} id - Activity ID
   * @returns {Promise<Object>} Unarchived activity
   */
  static async unarchive(id) {
    return this.update(id, { archived: false });
  }

  /**
   * Get archived activities
   * @returns {Promise<Array>} Array of archived activities
   */
  static async getArchived() {
    // Note: Boolean indexes don't work reliably across browsers, so we filter manually
    const activities = await db.getAll(STORE_NAME);
    return activities.filter(a => a.archived === true);
  }

  /**
   * Permanently delete an activity
   * Note: This should rarely be used; prefer archive()
   * @param {string} id - Activity ID
   * @returns {Promise<void>}
   */
  static async delete(id) {
    await db.delete(STORE_NAME, id);
  }

  /**
   * Move activities to a different category
   * @param {string} fromCategoryId - Source category ID
   * @param {string} toCategoryId - Destination category ID
   * @returns {Promise<number>} Number of activities moved
   */
  static async moveToCategory(fromCategoryId, toCategoryId) {
    const activities = await db.getByIndex(STORE_NAME, 'categoryId', fromCategoryId);

    if (activities.length === 0) {
      return 0;
    }

    const updates = activities.map(a => ({
      ...a,
      categoryId: toCategoryId
    }));

    await db.putMany(STORE_NAME, updates);
    return updates.length;
  }

  /**
   * Calculate total possible points per day
   * @returns {Promise<number>} Sum of all activity points
   */
  static async getTotalPossiblePoints() {
    const activities = await this.getAll();
    return activities.reduce((sum, a) => sum + a.points, 0);
  }

  /**
   * Count active activities
   * @returns {Promise<number>} Number of active activities
   */
  static async count() {
    const activities = await this.getAll();
    return activities.length;
  }

  /**
   * Clear all activities (for testing/reset)
   * @returns {Promise<void>}
   */
  static async clear() {
    await db.clear(STORE_NAME);
  }
}

export { ActivityModel };
export default ActivityModel;
