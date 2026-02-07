import { TRANSLATIONS, SUPPORTED_LOCALES, LANGUAGE_LABELS } from './translations.js';

let currentLocale = 'en';
const listeners = new Set();

function normalizeLocale(locale) {
  if (!locale) {
    return 'en';
  }

  const lower = String(locale).toLowerCase();

  if (lower === 'cn') {
    return 'zh-CN';
  }
  if (lower === 'jp') {
    return 'ja';
  }

  if (lower.startsWith('zh')) {
    return 'zh-CN';
  }
  if (lower.startsWith('ja')) {
    return 'ja';
  }

  const base = lower.split('-')[0];
  const match = SUPPORTED_LOCALES.find((entry) => entry.toLowerCase() === base);
  return match || 'en';
}

function detectLocale() {
  const languages =
    navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || 'en'];

  for (const language of languages) {
    const normalized = normalizeLocale(language);
    if (SUPPORTED_LOCALES.includes(normalized)) {
      return normalized;
    }
  }

  return 'en';
}

function setLocale(locale) {
  const normalized = normalizeLocale(locale);
  if (normalized === currentLocale) {
    return currentLocale;
  }
  currentLocale = normalized;
  listeners.forEach((listener) => listener(currentLocale));
  return currentLocale;
}

function getLocale() {
  return currentLocale;
}

function getSupportedLocales() {
  return [...SUPPORTED_LOCALES];
}

function getLocaleLabel(locale) {
  const normalized = normalizeLocale(locale);
  return LANGUAGE_LABELS[normalized] || normalized;
}

function getTranslation(locale, key) {
  const parts = key.split('.');
  let value = TRANSLATIONS[locale];

  for (const part of parts) {
    if (!value || typeof value !== 'object') {
      return undefined;
    }
    value = value[part];
  }

  return value;
}

function interpolate(template, params = {}) {
  if (!params || typeof template !== 'string') {
    return template;
  }
  return template.replace(/\{\{(.*?)\}\}/g, (_match, token) => {
    const key = token.trim();
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      return String(params[key]);
    }
    return '';
  });
}

function t(key, params) {
  const value = getTranslation(currentLocale, key) ?? getTranslation('en', key);
  if (typeof value === 'string') {
    return interpolate(value, params);
  }
  return value ?? key;
}

function tPlural(key, count, params = {}) {
  const value = getTranslation(currentLocale, key) ?? getTranslation('en', key);
  if (!value || typeof value !== 'object') {
    return String(count);
  }

  const pluralRules = new Intl.PluralRules(currentLocale);
  const category = pluralRules.select(count);
  const template = value[category] || value.other || value.one;
  return interpolate(template, { ...params, count });
}

function formatNumber(value, options = {}) {
  const formatter = new Intl.NumberFormat(currentLocale, options);
  return formatter.format(value);
}

function onLocaleChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export {
  setLocale,
  getLocale,
  detectLocale,
  normalizeLocale,
  getSupportedLocales,
  getLocaleLabel,
  t,
  tPlural,
  formatNumber,
  onLocaleChange,
};
