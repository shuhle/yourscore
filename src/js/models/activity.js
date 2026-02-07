/**
 * Activity Model for YourScore
 * Manages activities with CRUD operations
 */

import { db, generateId } from '../storage/db.js';
import { getTimestamp } from '../utils/date.js';
import { UNCATEGORIZED_ID } from './category.js';
import { t } from '../i18n/i18n.js';

const STORE_NAME = 'activities';

/**
 * Activity model for managing trackable activities
 */
class ActivityModel {
  /**
   * Create a new activity
   * @param {Object} data - Activity data
   * @param {string} data.name - Activity name
   * @param {number} data.points - Points earned when completed
   * @param {string} [data.categoryId] - Category ID (defaults to Uncategorized)
   * @returns {Promise<Object>} Created activity with id
   */
  static async create(data) {
    if (!data.name || data.name.trim() === '') {
      throw new Error(t('errors.activityNameRequired'));
    }

    if (!data.points || data.points < 1) {
      throw new Error(t('errors.activityPointsPositive'));
    }

    const categoryId = data.categoryId || UNCATEGORIZED_ID;
    const siblings = await db.getByIndex(STORE_NAME, 'categoryId', categoryId);
    const maxOrder = siblings.reduce((max, activityItem) => {
      return Number.isFinite(activityItem.order) ? Math.max(max, activityItem.order) : max;
    }, -1);

    const activity = {
      id: generateId(),
      name: data.name.trim(),
      points: Math.floor(data.points),
      categoryId,
      order: data.order !== undefined ? data.order : maxOrder + 1,
      archived: false,
      createdAt: getTimestamp(),
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
    return this.sortActivities(activities.filter((a) => !a.archived));
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
    return this.sortActivities(activities.filter((a) => !a.archived));
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

    for (const categoryId of Object.keys(grouped)) {
      grouped[categoryId] = this.sortActivities(grouped[categoryId]);
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
      throw new Error(t('errors.activityNotFound'));
    }

    // Validate if points is being updated
    if (data.points !== undefined && data.points < 1) {
      throw new Error(t('errors.activityPointsPositive'));
    }

    let nextOrder = activity.order;
    if (data.categoryId && data.categoryId !== activity.categoryId) {
      const siblings = await db.getByIndex(STORE_NAME, 'categoryId', data.categoryId);
      const maxOrder = siblings.reduce((max, activityItem) => {
        return Number.isFinite(activityItem.order) ? Math.max(max, activityItem.order) : max;
      }, -1);
      nextOrder = maxOrder + 1;
    }

    const updated = {
      ...activity,
      ...data,
      id, // Ensure ID cannot be changed
      name: data.name?.trim() || activity.name,
      points: data.points !== undefined ? Math.floor(data.points) : activity.points,
      order: data.order !== undefined ? data.order : nextOrder,
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
    return this.sortActivities(activities.filter((a) => a.archived === true));
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

    const destination = await db.getByIndex(STORE_NAME, 'categoryId', toCategoryId);
    let maxOrder = destination.reduce((max, activityItem) => {
      return Number.isFinite(activityItem.order) ? Math.max(max, activityItem.order) : max;
    }, -1);

    const updates = activities.map((a) => {
      maxOrder += 1;
      return {
        ...a,
        categoryId: toCategoryId,
        order: maxOrder,
      };
    });

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

  /**
   * Reorder activities within a category
   * @param {string} categoryId - Category ID
   * @param {string[]} orderedIds - Array of activity IDs in desired order
   * @returns {Promise<void>}
   */
  static async reorder(categoryId, orderedIds) {
    const activities = await db.getByIndex(STORE_NAME, 'categoryId', categoryId);
    const updates = [];

    for (let i = 0; i < orderedIds.length; i++) {
      const activity = activities.find((item) => item.id === orderedIds[i]);
      if (activity && activity.order !== i) {
        updates.push({ ...activity, order: i });
      }
    }

    if (updates.length > 0) {
      await db.putMany(STORE_NAME, updates);
    }
  }

  /**
   * Sort activities by order with stable fallbacks
   * @param {Array} activities - Activities to sort
   * @returns {Array} Sorted activities
   */
  static sortActivities(activities) {
    return [...activities].sort((a, b) => {
      const aOrder = Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER;
      const bOrder = Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      const aCreated = a.createdAt || '';
      const bCreated = b.createdAt || '';
      if (aCreated !== bCreated) {
        return aCreated.localeCompare(bCreated);
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }
}

export { ActivityModel };
export default ActivityModel;
