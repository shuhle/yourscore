/**
 * Date Utilities for YourScore
 * All dates are handled in user's local timezone
 * Dates are stored as YYYY-MM-DD strings to avoid timezone issues
 */

import { t, tPlural, getLocale, formatNumber } from '../i18n/i18n.js';

/**
 * Get current date as YYYY-MM-DD string in local timezone
 * @returns {string} Date string in YYYY-MM-DD format
 */
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current ISO timestamp
 * @returns {string} ISO 8601 timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Parse a YYYY-MM-DD string to a Date object (at midnight local time)
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {Date} Date object
 */
function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Convert a date string to a UTC day number for DST-safe comparisons
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {number} UTC day number
 */
function toUtcDayNumber(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

/**
 * Calculate the number of days between two date strings
 * @param {string} startDateStr - Start date (YYYY-MM-DD)
 * @param {string} endDateStr - End date (YYYY-MM-DD)
 * @returns {number} Number of days (positive if end > start)
 */
function daysBetween(startDateStr, endDateStr) {
  const startDay = toUtcDayNumber(startDateStr);
  const endDay = toUtcDayNumber(endDateStr);
  return endDay - startDay;
}

/**
 * Check if a new day has started since the last active date
 * @param {string} lastActiveDate - Last active date (YYYY-MM-DD)
 * @param {string} [currentDate] - Current date (defaults to today)
 * @returns {boolean} True if day has rolled over
 */
function hasNewDayStarted(lastActiveDate, currentDate = getLocalDateString()) {
  return lastActiveDate !== currentDate;
}

/**
 * Get the number of days since the last active date
 * @param {string} lastActiveDate - Last active date (YYYY-MM-DD)
 * @param {string} [currentDate] - Current date (defaults to today)
 * @returns {number} Number of days (0 if same day)
 */
function daysSinceLastActive(lastActiveDate, currentDate = getLocalDateString()) {
  const days = daysBetween(lastActiveDate, currentDate);
  return Math.max(0, days);
}

/**
 * Check if a date string is today
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {boolean} True if the date is today
 */
function isToday(dateStr) {
  return dateStr === getLocalDateString();
}

/**
 * Check if a date string is yesterday
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {boolean} True if the date is yesterday
 */
function isYesterday(dateStr) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateStr === getLocalDateString(yesterday);
}

/**
 * Get date string for N days ago
 * @param {number} daysAgo - Number of days in the past
 * @returns {string} Date string (YYYY-MM-DD)
 */
function getDateDaysAgo(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return getLocalDateString(date);
}

/**
 * Subtract N days from a date string
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {number} days - Number of days to subtract
 * @returns {string} Date string (YYYY-MM-DD)
 */
function subtractDays(dateStr, days) {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() - days);
  return getLocalDateString(date);
}

/**
 * Get date string for N days from now
 * @param {number} daysFromNow - Number of days in the future
 * @returns {string} Date string (YYYY-MM-DD)
 */
function getDateDaysFromNow(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return getLocalDateString(date);
}

/**
 * Get an array of date strings for a range
 * @param {string} startDateStr - Start date (YYYY-MM-DD)
 * @param {string} endDateStr - End date (YYYY-MM-DD)
 * @returns {string[]} Array of date strings
 */
function getDateRange(startDateStr, endDateStr) {
  const dates = [];
  const days = daysBetween(startDateStr, endDateStr);

  for (let i = 0; i <= days; i++) {
    const date = parseLocalDate(startDateStr);
    date.setDate(date.getDate() + i);
    dates.push(getLocalDateString(date));
  }

  return dates;
}

/**
 * Format a date string for display
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {string} [format='short'] - Format style: 'short', 'long', 'relative'
 * @returns {string} Formatted date string
 */
function formatDate(dateStr, format = 'short') {
  const date = parseLocalDate(dateStr);

  if (format === 'relative') {
    if (isToday(dateStr)) {
      return t('date.today');
    }
    if (isYesterday(dateStr)) {
      return t('date.yesterday');
    }
    const days = daysBetween(dateStr, getLocalDateString());
    if (days > 0 && days <= 7) {
      return tPlural('date.daysAgo', days, { count: formatNumber(days) });
    }
  }

  const options =
    format === 'long'
      ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      : { month: 'short', day: 'numeric' };

  return date.toLocaleDateString(getLocale(), options);
}

/**
 * Format an ISO timestamp for display (time only)
 * @param {string} isoString - ISO 8601 timestamp
 * @returns {string} Formatted time string (e.g., "Completed 2:30 PM")
 */
function formatTimestamp(isoString) {
  if (!isoString) {
    return '';
  }
  const date = new Date(isoString);
  const time = date.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });
  return t('date.completedAt', { time });
}

export {
  getLocalDateString,
  getTimestamp,
  parseLocalDate,
  daysBetween,
  hasNewDayStarted,
  daysSinceLastActive,
  isToday,
  isYesterday,
  subtractDays,
  getDateDaysAgo,
  getDateDaysFromNow,
  getDateRange,
  formatDate,
  formatTimestamp,
};
