/**
 * Category Model for YourScore
 * Manages activity categories with CRUD operations
 */

import { db, generateId } from '../storage/db.js';
import { getTimestamp } from '../utils/date.js';
import { t } from '../i18n/i18n.js';

const STORE_NAME = 'categories';

/**
 * Order value for uncategorized category (ensures it's always last)
 */
const UNCATEGORIZED_ORDER = 999;

/**
 * Default categories to seed on first use
 * Only Uncategorized is seeded by default.
 */
const DEFAULT_CATEGORIES = [{ name: t('common.uncategorized'), order: UNCATEGORIZED_ORDER }];

/**
 * The uncategorized category ID (constant)
 */
const UNCATEGORIZED_ID = 'uncategorized';

/**
 * Category model for managing activity categories
 */
class CategoryModel {
  /**
   * Create a new category
   * @param {Object} data - Category data
   * @param {string} data.name - Category name
   * @param {number} [data.order] - Display order
   * @returns {Promise<Object>} Created category with id
   */
  static async create(data) {
    const categories = await this.getAll();
    const maxOrder = categories
      .filter((cat) => cat.id !== UNCATEGORIZED_ID)
      .reduce((max, cat) => Math.max(max, cat.order), -1);

    const category = {
      id: generateId(),
      name: data.name,
      order: data.order !== undefined ? data.order : maxOrder + 1,
      createdAt: getTimestamp(),
    };

    await db.put(STORE_NAME, category);
    return category;
  }

  /**
   * Get a category by ID
   * @param {string} id - Category ID
   * @returns {Promise<Object|undefined>} Category or undefined
   */
  static async getById(id) {
    return db.get(STORE_NAME, id);
  }

  /**
   * Get all categories sorted by order
   * @returns {Promise<Array>} Array of categories
   */
  static async getAll() {
    const categories = await db.getAll(STORE_NAME);
    return categories.sort((a, b) => {
      if (a.id === UNCATEGORIZED_ID) {
        return 1;
      }
      if (b.id === UNCATEGORIZED_ID) {
        return -1;
      }
      return a.order - b.order;
    });
  }

  /**
   * Update a category
   * @param {string} id - Category ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object>} Updated category
   */
  static async update(id, data) {
    const category = await this.getById(id);
    if (!category) {
      throw new Error(t('errors.categoryNotFound'));
    }

    // Prevent renaming Uncategorized
    if (id === UNCATEGORIZED_ID && data.name) {
      throw new Error(t('errors.categoryCannotRenameUncategorized'));
    }

    const updated = {
      ...category,
      ...data,
      id, // Ensure ID cannot be changed
    };

    await db.put(STORE_NAME, updated);
    return updated;
  }

  /**
   * Delete a category
   * Activities in this category will be moved to Uncategorized
   * @param {string} id - Category ID
   * @returns {Promise<void>}
   */
  static async delete(id) {
    // Prevent deleting Uncategorized
    if (id === UNCATEGORIZED_ID) {
      throw new Error(t('errors.categoryCannotDeleteUncategorized'));
    }

    const category = await this.getById(id);
    if (!category) {
      throw new Error(t('errors.categoryNotFound'));
    }

    // Move activities to Uncategorized
    const { ActivityModel } = await import('./activity.js');
    await this.getUncategorized();
    await ActivityModel.moveToCategory(id, UNCATEGORIZED_ID);

    await db.delete(STORE_NAME, id);
  }

  /**
   * Reorder categories
   * @param {string[]} orderedIds - Array of category IDs in desired order
   * @returns {Promise<void>}
   */
  static async reorder(orderedIds) {
    const categories = await this.getAll();
    const updates = [];

    const ids = orderedIds.filter((id) => id !== UNCATEGORIZED_ID);
    for (let i = 0; i < ids.length; i++) {
      const category = categories.find((c) => c.id === ids[i]);
      if (category && category.order !== i) {
        updates.push({ ...category, order: i });
      }
    }

    const uncategorized = categories.find((c) => c.id === UNCATEGORIZED_ID);
    if (uncategorized && uncategorized.order !== UNCATEGORIZED_ORDER) {
      updates.push({ ...uncategorized, order: UNCATEGORIZED_ORDER });
    }

    if (updates.length > 0) {
      await db.putMany(STORE_NAME, updates);
    }
  }

  /**
   * Get the Uncategorized category, creating it if needed
   * @returns {Promise<Object>} Uncategorized category
   */
  static async getUncategorized() {
    let uncategorized = await this.getById(UNCATEGORIZED_ID);

    if (!uncategorized) {
      uncategorized = {
        id: UNCATEGORIZED_ID,
        name: t('common.uncategorized'),
        order: UNCATEGORIZED_ORDER,
        createdAt: getTimestamp(),
      };
      await db.put(STORE_NAME, uncategorized);
    }

    return uncategorized;
  }

  /**
   * Update the Uncategorized name (used for i18n)
   * @param {string} name - Localized name
   * @returns {Promise<Object>} Updated Uncategorized category
   */
  static async updateUncategorizedName(name) {
    const uncategorized = await this.getById(UNCATEGORIZED_ID);
    const updated = {
      id: UNCATEGORIZED_ID,
      name: name || t('common.uncategorized'),
      order: UNCATEGORIZED_ORDER,
      createdAt: uncategorized?.createdAt || getTimestamp(),
    };
    await db.put(STORE_NAME, updated);
    return updated;
  }

  /**
   * Seed default categories for first-time use
   * @returns {Promise<Array>} Created categories
   */
  static async seedDefaults() {
    await this.getUncategorized();
    return this.getAll();
  }

  /**
   * Find category by name
   * @param {string} name - Category name
   * @returns {Promise<Object|undefined>} Category or undefined
   */
  static async findByName(name) {
    const categories = await this.getAll();
    return categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Count categories
   * @returns {Promise<number>} Number of categories
   */
  static async count() {
    return db.count(STORE_NAME);
  }

  /**
   * Clear all categories (for testing/reset)
   * @returns {Promise<void>}
   */
  static async clear() {
    await db.clear(STORE_NAME);
  }
}

export { CategoryModel, DEFAULT_CATEGORIES, UNCATEGORIZED_ID };
export default CategoryModel;
