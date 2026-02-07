/**
 * Export/Import Service for YourScore
 * Handles data export to JSON/CSV and import with validation
 */

import { db } from '../storage/db.js';
import { getLocalDateString, getTimestamp } from '../utils/date.js';
import { t, formatNumber } from '../i18n/i18n.js';

const EXPORT_VERSION = 1;
const APP_NAME = 'YourScore';
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_RECORDS = 50000;

/**
 * Store names that contain user data
 */
const DATA_STORES = [
  'settings',
  'categories',
  'activities',
  'completions',
  'scoreHistory',
  'achievements',
];

/**
 * Required fields for each store's records
 */
const SCHEMA = {
  settings: {
    required: ['key', 'value'],
    types: { key: 'string' },
  },
  categories: {
    required: ['id', 'name', 'order', 'createdAt'],
    types: { id: 'string', name: 'string', order: 'number', createdAt: 'string' },
  },
  activities: {
    required: ['id', 'name', 'points', 'categoryId', 'archived', 'createdAt'],
    types: {
      id: 'string',
      name: 'string',
      points: 'number',
      categoryId: 'string',
      archived: 'boolean',
      createdAt: 'string',
      order: 'number',
    },
  },
  completions: {
    required: ['id', 'activityId', 'date', 'completedAt'],
    types: { id: 'string', activityId: 'string', date: 'string', completedAt: 'string' },
  },
  scoreHistory: {
    required: ['date', 'score', 'earned', 'decay'],
    types: { date: 'string', score: 'number', earned: 'number', decay: 'number' },
  },
  achievements: {
    required: ['id', 'unlockedAt'],
    types: { id: 'string', unlockedAt: 'string' },
  },
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
    data: {},
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
  const activityMap = new Map(activities.map((a) => [a.id, a]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // CSV header
  const headers = t('export.csvHeaders');
  const lines = [Array.isArray(headers) ? headers.join(',') : String(headers)];

  // Sort completions by date (newest first)
  const sortedCompletions = [...completions].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.completedAt.localeCompare(a.completedAt);
  });

  for (const completion of sortedCompletions) {
    const activity = activityMap.get(completion.activityId);
    const activityName = activity ? activity.name : t('common.unknown');
    const points = activity ? activity.points : 0;
    const category = activity ? categoryMap.get(activity.categoryId) : null;
    const categoryName = category ? category.name : t('common.uncategorized');

    // Escape CSV fields
    const escapedActivityName = escapeCSVField(activityName);
    const escapedCategoryName = escapeCSVField(categoryName);

    lines.push(
      `${completion.date},${escapedActivityName},${escapedCategoryName},${points},${completion.completedAt}`
    );
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
  if (/^\s*[=+\-@\t\r]/.test(str)) {
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
    errors.push(t('errors.importInvalidFormat'));
    return { valid: false, errors };
  }

  if (data.app !== APP_NAME) {
    errors.push(t('errors.importInvalidApp', { expected: APP_NAME, actual: data.app }));
  }

  if (typeof data.version !== 'number' || data.version < 1) {
    errors.push(t('errors.importInvalidVersion'));
  }

  if (!data.data || typeof data.data !== 'object') {
    errors.push(t('errors.importMissingData'));
    return { valid: false, errors };
  }

  // Validate each store's data
  for (const storeName of DATA_STORES) {
    const storeData = data.data[storeName];

    if (storeData === undefined) {
      continue; // Store can be missing (will be empty)
    }

    if (!Array.isArray(storeData)) {
      errors.push(t('errors.importStoreInvalid', { store: storeName }));
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
        errors.push(t('errors.importRecordInvalid', { store: storeName, index: i }));
        continue;
      }

      for (const field of schema.required) {
        if (record[field] === undefined) {
          errors.push(t('errors.importMissingField', { field, store: storeName, index: i }));
        }
      }

      if (schema.types) {
        for (const [field, expectedType] of Object.entries(schema.types)) {
          if (record[field] !== undefined && typeof record[field] !== expectedType) {
            errors.push(
              t('errors.importInvalidType', {
                field,
                store: storeName,
                index: i,
                expected: expectedType,
              })
            );
          }
        }
      }

      // Bounds validation
      if (storeName === 'activities') {
        if (
          typeof record.points === 'number' &&
          (record.points < -10000 || record.points > 10000)
        ) {
          errors.push(
            t('errors.importValueOutOfRange', { field: 'points', store: storeName, index: i })
          );
        }
        if (typeof record.name === 'string' && record.name.length > 200) {
          errors.push(
            t('errors.importValueTooLong', { field: 'name', store: storeName, index: i })
          );
        }
      }
      if (storeName === 'categories') {
        if (typeof record.name === 'string' && record.name.length > 200) {
          errors.push(
            t('errors.importValueTooLong', { field: 'name', store: storeName, index: i })
          );
        }
      }
    }
  }

  if (totalRecords > MAX_IMPORT_RECORDS) {
    errors.push(t('errors.importTooManyRecords', { max: formatNumber(MAX_IMPORT_RECORDS) }));
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
    errors.push(t('errors.importFailed', { error: error.message }));
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
    return { success: false, imported: {}, errors: [t('errors.importFileTooLarge')] };
  }
  let data;

  try {
    data = JSON.parse(jsonString);
  } catch (error) {
    return {
      success: false,
      imported: {},
      errors: [t('errors.importInvalidJson', { error: error.message })],
    };
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
  const filename = t('export.filenameBackup', { date });
  downloadFile(content, filename, 'application/json');
}

/**
 * Download completions as CSV file
 * @returns {Promise<void>}
 */
async function downloadCSV() {
  const content = await exportToCSV();
  const date = getLocalDateString();
  const filename = t('export.filenameCsv', { date });
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
    reader.onerror = () => reject(new Error(t('errors.fileReadFailed')));
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
    return { success: false, imported: {}, errors: [t('errors.importNoFile')] };
  }

  const isJSON =
    file.name.endsWith('.json') || file.type === 'application/json' || file.type === 'text/json';

  if (!isJSON) {
    return { success: false, imported: {}, errors: [t('errors.importInvalidFileType')] };
  }

  if (file.size > MAX_IMPORT_BYTES) {
    return { success: false, imported: {}, errors: [t('errors.importFileTooLarge')] };
  }

  try {
    const content = await readFileAsText(file);
    return importFromJSONString(content, options);
  } catch (error) {
    return {
      success: false,
      imported: {},
      errors: [t('errors.importReadFailed', { error: error.message })],
    };
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
  MAX_IMPORT_RECORDS,
};
