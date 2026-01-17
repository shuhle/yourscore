/**
 * IndexedDB Wrapper for YourScore
 * Provides a promise-based API for database operations
 */

import { runMigrations } from './migrations.js';

const DB_NAME = 'yourscore';
const DB_VERSION = 1;

/**
 * Object store configurations
 * Each store defines its keyPath and any indexes
 */
const STORES = {
  settings: {
    keyPath: 'key',
    indexes: []
  },
  categories: {
    keyPath: 'id',
    indexes: [
      { name: 'order', keyPath: 'order', options: { unique: false } }
    ]
  },
  activities: {
    keyPath: 'id',
    indexes: [
      { name: 'categoryId', keyPath: 'categoryId', options: { unique: false } },
      { name: 'archived', keyPath: 'archived', options: { unique: false } }
    ]
  },
  completions: {
    keyPath: 'id',
    indexes: [
      { name: 'activityId', keyPath: 'activityId', options: { unique: false } },
      { name: 'date', keyPath: 'date', options: { unique: false } },
      { name: 'activityDate', keyPath: ['activityId', 'date'], options: { unique: true } }
    ]
  },
  scoreHistory: {
    keyPath: 'date',
    indexes: []
  },
  achievements: {
    keyPath: 'id',
    indexes: []
  }
};

/**
 * Database class providing IndexedDB operations
 */
class Database {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize the database connection
   * Creates object stores if they don't exist
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const transaction = event.target.transaction;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion || DB_VERSION;

        // Create stores first (for initial setup)
        this.createStores(db);

        // Run any pending migrations
        runMigrations(db, transaction, oldVersion, newVersion);
      };
    });
  }

  /**
   * Create object stores based on STORES configuration
   * @param {IDBDatabase} db
   */
  createStores(db) {
    for (const [storeName, config] of Object.entries(STORES)) {
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: config.keyPath });

        for (const index of config.indexes) {
          store.createIndex(index.name, index.keyPath, index.options);
        }
      }
    }
  }

  /**
   * Ensure database is initialized
   * @returns {Promise<IDBDatabase>}
   */
  async ensureDb() {
    if (!this.db) {
      await this.init();
    }
    return this.db;
  }

  /**
   * Get a single record by key
   * @param {string} storeName - Name of the object store
   * @param {*} key - Primary key value
   * @returns {Promise<*>} The record or undefined
   */
  async get(storeName, key) {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to get from ${storeName}: ${request.error}`));
    });
  }

  /**
   * Get all records from a store
   * @param {string} storeName - Name of the object store
   * @returns {Promise<Array>} Array of all records
   */
  async getAll(storeName) {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error(`Failed to getAll from ${storeName}: ${request.error}`));
    });
  }

  /**
   * Get records by index value
   * @param {string} storeName - Name of the object store
   * @param {string} indexName - Name of the index
   * @param {*} value - Index value to match
   * @returns {Promise<Array>} Array of matching records
   */
  async getByIndex(storeName, indexName, value) {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error(`Failed to getByIndex from ${storeName}: ${request.error}`));
    });
  }

  /**
   * Get a single record by index value
   * @param {string} storeName - Name of the object store
   * @param {string} indexName - Name of the index
   * @param {*} value - Index value to match
   * @returns {Promise<*>} The first matching record or undefined
   */
  async getOneByIndex(storeName, indexName, value) {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.get(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to getOneByIndex from ${storeName}: ${request.error}`));
    });
  }

  /**
   * Insert or update a record
   * @param {string} storeName - Name of the object store
   * @param {*} value - Record to store (must include keyPath field)
   * @returns {Promise<*>} The key of the stored record
   */
  async put(storeName, value) {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to put to ${storeName}: ${request.error}`));
    });
  }

  /**
   * Insert multiple records
   * @param {string} storeName - Name of the object store
   * @param {Array} values - Array of records to store
   * @returns {Promise<void>}
   */
  async putMany(storeName, values) {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error(`Failed to putMany to ${storeName}: ${transaction.error}`));

      for (const value of values) {
        store.put(value);
      }
    });
  }

  /**
   * Delete a record by key
   * @param {string} storeName - Name of the object store
   * @param {*} key - Primary key of record to delete
   * @returns {Promise<void>}
   */
  async delete(storeName, key) {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete from ${storeName}: ${request.error}`));
    });
  }

  /**
   * Clear all records from a store
   * @param {string} storeName - Name of the object store
   * @returns {Promise<void>}
   */
  async clear(storeName) {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to clear ${storeName}: ${request.error}`));
    });
  }

  /**
   * Clear all records from all stores
   * @returns {Promise<void>}
   */
  async reset() {
    await this.ensureDb();
    const storeNames = Object.keys(STORES);
    for (const storeName of storeNames) {
      await this.clear(storeName);
    }
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Count records in a store
   * @param {string} storeName - Name of the object store
   * @returns {Promise<number>} Number of records
   */
  async count(storeName) {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to count ${storeName}: ${request.error}`));
    });
  }

  /**
   * Execute a custom transaction
   * @param {string|string[]} storeNames - Store name(s) to include
   * @param {string} mode - 'readonly' or 'readwrite'
   * @param {Function} callback - Function receiving transaction and store(s)
   * @returns {Promise<*>} Result from callback
   */
  async transaction(storeNames, mode, callback) {
    await this.ensureDb();

    const stores = Array.isArray(storeNames) ? storeNames : [storeNames];

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(stores, mode);
      let result;

      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error}`));

      if (stores.length === 1) {
        const store = transaction.objectStore(stores[0]);
        result = callback(transaction, store);
      } else {
        const storeObjects = {};
        for (const name of stores) {
          storeObjects[name] = transaction.objectStore(name);
        }
        result = callback(transaction, storeObjects);
      }
    });
  }

  /**
   * Delete the entire database
   * @returns {Promise<void>}
   */
  async deleteDatabase() {
    this.close();

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete database: ${request.error}`));
    });
  }
}

// Singleton instance
const db = new Database();

/**
 * Generate a UUID v4
 * @returns {string}
 */
function generateId() {
  // Use crypto.randomUUID if available (Safari 15.4+), otherwise fallback
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export { db, Database, generateId, STORES, DB_NAME, DB_VERSION };
export default db;
