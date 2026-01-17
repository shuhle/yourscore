/**
 * Export/Import Service for YourScore
 * Handles data export to JSON/CSV and import with validation
 */

import { db } from '../storage/db.js';
import { getLocalDateString, getTimestamp } from '../utils/date.js';

const EXPORT_VERSION = 1;
const APP_NAME = 'YourScore';
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_RECORDS = 50000;

/**
 * Store names that contain user data
 */
const DATA_STORES = ['settings', 'categories', 'activities', 'completions', 'scoreHistory', 'achievements'];

/**
 * Required fields for each store's records
 */
const SCHEMA = {
  settings: {
    required: ['key', 'value'],
    types: { key: 'string' }
  },
  categories: {
    required: ['id', 'name', 'order', 'createdAt'],
    types: { id: 'string', name: 'string', order: 'number', createdAt: 'string' }
  },
  activities: {
    required: ['id', 'name', 'points', 'categoryId', 'archived', 'createdAt'],
    types: { id: 'string', name: 'string', points: 'number', categoryId: 'string', archived: 'boolean', createdAt: 'string' }
  },
  completions: {
    required: ['id', 'activityId', 'date', 'completedAt'],
    types: { id: 'string', activityId: 'string', date: 'string', completedAt: 'string' }
  },
  scoreHistory: {
    required: ['date', 'score', 'earned', 'decay'],
    types: { date: 'string', score: 'number', earned: 'number', decay: 'number' }
  },
  achievements: {
    required: ['id', 'unlockedAt'],
    types: { id: 'string', unlockedAt: 'string' }
  }
};

/**
 * Export all data to JSON format
 * @returns {Promise<Object>} Export data object
 */
async function exportToJSON() {
  await db.ensureDb();

  const data = {
    app: APP_NAME,
    version: EXPORT_VERSION,
    exportedAt: getTimestamp(),
    data: {}
  };

  for (const storeName of DATA_STORES) {
    data.data[storeName] = await db.getAll(storeName);
  }

  return data;
}

/**
 * Export all data as a downloadable JSON string
 * @returns {Promise<string>} JSON string
 */
async function exportToJSONString() {
  const data = await exportToJSON();
  return JSON.stringify(data, null, 2);
}

/**
 * Export completions history to CSV format
 * @returns {Promise<string>} CSV string
 */
async function exportToCSV() {
  await db.ensureDb();

  const completions = await db.getAll('completions');
  const activities = await db.getAll('activities');
  const categories = await db.getAll('categories');

  // Create lookup maps
  const activityMap = new Map(activities.map(a => [a.id, a]));
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  // CSV header
  const lines = ['Date,Activity,Category,Points,Completed At'];

  // Sort completions by date (newest first)
  const sortedCompletions = [...completions].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.completedAt.localeCompare(a.completedAt);
  });

  for (const completion of sortedCompletions) {
    const activity = activityMap.get(completion.activityId);
    const activityName = activity ? activity.name : 'Unknown';
    const points = activity ? activity.points : 0;
    const category = activity ? categoryMap.get(activity.categoryId) : null;
    const categoryName = category ? category.name : 'Uncategorized';

    // Escape CSV fields
    const escapedActivityName = escapeCSVField(activityName);
    const escapedCategoryName = escapeCSVField(categoryName);

    lines.push(`${completion.date},${escapedActivityName},${escapedCategoryName},${points},${completion.completedAt}`);
  }

  return lines.join('\n');
}

/**
 * Escape a field for CSV (handle commas, quotes, newlines)
 * @param {string} field - Field value
 * @returns {string} Escaped field
 */
function escapeCSVField(field) {
  if (field === null || field === undefined) {
    return '';
  }
  let str = String(field);
  const trimmed = str.replace(/^\s+/, '');
  if (trimmed && /^[=+\-@]/.test(trimmed)) {
    str = `'${str}`;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Validate import data schema
 * @param {Object} data - Import data
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateImportData(data) {
  const errors = [];
  let totalRecords = 0;

  // Check top-level structure
  if (!data || typeof data !== 'object') {
    errors.push('Invalid data format: expected an object');
    return { valid: false, errors };
  }

  if (data.app !== APP_NAME) {
    errors.push(`Invalid app identifier: expected "${APP_NAME}", got "${data.app}"`);
  }

  if (typeof data.version !== 'number' || data.version < 1) {
    errors.push('Invalid or missing version number');
  }

  if (!data.data || typeof data.data !== 'object') {
    errors.push('Missing or invalid data section');
    return { valid: false, errors };
  }

  // Validate each store's data
  for (const storeName of DATA_STORES) {
    const storeData = data.data[storeName];

    if (storeData === undefined) {
      continue; // Store can be missing (will be empty)
    }

    if (!Array.isArray(storeData)) {
      errors.push(`Invalid data for store "${storeName}": expected array`);
      continue;
    }

    const schema = SCHEMA[storeName];
    if (!schema) {
      continue;
    }

    totalRecords += storeData.length;

    for (let i = 0; i < storeData.length; i++) {
      const record = storeData[i];

      if (!record || typeof record !== 'object') {
        errors.push(`Invalid record at ${storeName}[${i}]: expected object`);
        continue;
      }

      for (const field of schema.required) {
        if (record[field] === undefined) {
          errors.push(`Missing required field "${field}" at ${storeName}[${i}]`);
        }
      }

      if (schema.types) {
        for (const [field, expectedType] of Object.entries(schema.types)) {
          if (record[field] !== undefined && typeof record[field] !== expectedType) {
            errors.push(`Invalid type for "${field}" at ${storeName}[${i}]: expected ${expectedType}`);
          }
        }
      }
    }
  }

  if (totalRecords > MAX_IMPORT_RECORDS) {
    errors.push(`Import exceeds maximum record limit (${MAX_IMPORT_RECORDS})`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Import data from JSON
 * @param {Object} data - Import data object
 * @param {Object} options - Import options
 * @param {boolean} options.merge - If true, merge with existing data; if false, replace all
 * @returns {Promise<Object>} Import result { success: boolean, imported: Object, errors: string[] }
 */
async function importFromJSON(data, options = { merge: false }) {
  const validation = validateImportData(data);

  if (!validation.valid) {
    return { success: false, imported: {}, errors: validation.errors };
  }

  await db.ensureDb();

  const imported = {};
  const errors = [];

  try {
    await db.transaction(DATA_STORES, 'readwrite', (_transaction, stores) => {
      if (!options.merge) {
        for (const storeName of DATA_STORES) {
          stores[storeName].clear();
        }
      }

      for (const storeName of DATA_STORES) {
        const storeData = data.data[storeName];

        if (!storeData || !Array.isArray(storeData) || storeData.length === 0) {
          imported[storeName] = 0;
          continue;
        }

        for (const record of storeData) {
          stores[storeName].put(record);
        }

        imported[storeName] = storeData.length;
      }
    });

    return { success: true, imported, errors: [] };
  } catch (error) {
    errors.push(`Import failed: ${error.message}`);
    return { success: false, imported, errors };
  }
}

/**
 * Import data from JSON string
 * @param {string} jsonString - JSON string to import
 * @param {Object} options - Import options
 * @returns {Promise<Object>} Import result
 */
async function importFromJSONString(jsonString, options = { merge: false }) {
  if (jsonString.length > MAX_IMPORT_BYTES) {
    return { success: false, imported: {}, errors: ['Import file is too large'] };
  }
  let data;

  try {
    data = JSON.parse(jsonString);
  } catch (error) {
    return { success: false, imported: {}, errors: [`Invalid JSON: ${error.message}`] };
  }

  return importFromJSON(data, options);
}

/**
 * Reset all data (clear all stores)
 * @returns {Promise<void>}
 */
async function resetAllData() {
  await db.reset();
}

/**
 * Trigger a file download
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @param {string} mimeType - MIME type
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download data as JSON file
 * @returns {Promise<void>}
 */
async function downloadJSON() {
  const content = await exportToJSONString();
  const date = getLocalDateString();
  const filename = `yourscore-backup-${date}.json`;
  downloadFile(content, filename, 'application/json');
}

/**
 * Download completions as CSV file
 * @returns {Promise<void>}
 */
async function downloadCSV() {
  const content = await exportToCSV();
  const date = getLocalDateString();
  const filename = `yourscore-completions-${date}.csv`;
  downloadFile(content, filename, 'text/csv');
}

/**
 * Read a file as text
 * @param {File} file - File object
 * @returns {Promise<string>} File content
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Import from a File object
 * @param {File} file - File to import
 * @param {Object} options - Import options
 * @returns {Promise<Object>} Import result
 */
async function importFromFile(file, options = { merge: false }) {
  if (!file) {
    return { success: false, imported: {}, errors: ['No file provided'] };
  }

  if (!file.name.endsWith('.json')) {
    return { success: false, imported: {}, errors: ['Invalid file type: expected .json'] };
  }

  if (file.size > MAX_IMPORT_BYTES) {
    return { success: false, imported: {}, errors: ['Import file is too large'] };
  }

  try {
    const content = await readFileAsText(file);
    return importFromJSONString(content, options);
  } catch (error) {
    return { success: false, imported: {}, errors: [`Failed to read file: ${error.message}`] };
  }
}

export {
  exportToJSON,
  exportToJSONString,
  exportToCSV,
  validateImportData,
  importFromJSON,
  importFromJSONString,
  importFromFile,
  resetAllData,
  downloadJSON,
  downloadCSV,
  downloadFile,
  readFileAsText,
  EXPORT_VERSION,
  APP_NAME,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_RECORDS
};
