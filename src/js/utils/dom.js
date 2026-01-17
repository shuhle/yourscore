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

export {
  escapeHtml,
  createEmptyState
};
