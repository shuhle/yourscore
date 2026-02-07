/**
 * DOM Utilities for YourScore
 * Helper functions for DOM manipulation and sanitization
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML insertion
 */
function escapeHtml(text) {
  if (text === null || text === undefined) {
    return '';
  }
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/**
 * Create an empty state element
 * @param {Object} options - Empty state options
 * @param {string} options.title - Title text
 * @param {string} options.message - Message text
 * @returns {HTMLElement} Empty state element
 */
function createEmptyState({ title, message }) {
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.innerHTML = `
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(message)}</p>
  `;
  return empty;
}

/**
 * Validate an integer value with optional bounds
 * @param {string|number} value - Value to validate
 * @param {Object} [options] - Validation options
 * @param {number} [options.min] - Minimum allowed value
 * @param {number} [options.max] - Maximum allowed value
 * @param {string} [options.fieldName] - Field name for error messages
 * @param {string} [options.errorMessage] - Custom error message override
 * @returns {{ valid: boolean, value?: number, error?: string }}
 */
function validateInteger(value, { min, max, fieldName, errorMessage } = {}) {
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num)) {
    return { valid: false, error: errorMessage || `${fieldName} must be a number` };
  }
  if (min !== undefined && num < min) {
    return { valid: false, error: errorMessage || `${fieldName} must be at least ${min}` };
  }
  if (max !== undefined && num > max) {
    return { valid: false, error: errorMessage || `${fieldName} must be at most ${max}` };
  }
  return { valid: true, value: num };
}

export { escapeHtml, createEmptyState, validateInteger };
