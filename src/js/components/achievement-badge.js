/**
 * Achievement Badge Component
 * Displays achievement badges with optional animation
 */

import { getAchievementById } from '../services/achievements.js';
import { showConfetti } from '../utils/celebrations.js';
import { t, getLocale } from '../i18n/i18n.js';

/**
 * Create an achievement badge element
 * @param {Object} options - Badge options
 * @param {string} options.achievementId - Achievement ID
 * @param {boolean} [options.unlocked=false] - Whether the achievement is unlocked
 * @param {boolean} [options.showDescription=false] - Show full description
 * @param {string} [options.size='medium'] - Size: 'small', 'medium', 'large'
 * @returns {HTMLElement} Badge element
 */
function createAchievementBadge(options) {
  const {
    achievementId,
    unlocked = false,
    showDescription = false,
    size = 'medium'
  } = options;

  const achievement = getAchievementById(achievementId);
  if (!achievement) {
    console.warn(`Achievement not found: ${achievementId}`);
    return document.createElement('span');
  }

  const badge = document.createElement('div');
  badge.className = `achievement-badge achievement-badge--${size}`;
  badge.dataset.achievementId = achievementId;

  if (unlocked) {
    badge.classList.add('achievement-badge--unlocked');
  } else {
    badge.classList.add('achievement-badge--locked');
  }

  badge.innerHTML = `
    <span class="achievement-badge__icon">${achievement.icon}</span>
    <span class="achievement-badge__name">${achievement.name}</span>
    ${showDescription ? `<span class="achievement-badge__desc">${achievement.description}</span>` : ''}
  `;

  return badge;
}

/**
 * Create an achievement card for detailed display
 * @param {Object} achievement - Achievement object with status
 * @returns {HTMLElement} Card element
 */
function createAchievementCard(achievement) {
  const card = document.createElement('div');
  card.className = 'achievement-card';
  card.dataset.achievementId = achievement.id;

  if (achievement.unlocked) {
    card.classList.add('achievement-card--unlocked');
  } else {
    card.classList.add('achievement-card--locked');
  }

  const unlockedDate = achievement.unlockedAt
    ? new Date(achievement.unlockedAt).toLocaleDateString(getLocale())
    : '';

  card.innerHTML = `
    <div class="achievement-card__icon">${achievement.icon}</div>
    <div class="achievement-card__content">
      <div class="achievement-card__name">${achievement.name}</div>
      <div class="achievement-card__desc">${achievement.description}</div>
      ${achievement.unlocked && unlockedDate ? `<div class="achievement-card__date">${t('date.unlockedOn', { date: unlockedDate })}</div>` : ''}
    </div>
    <div class="achievement-card__status">
      ${achievement.unlocked ? '✓' : '🔒'}
    </div>
  `;

  return card;
}

/**
 * Create an achievement notification popup
 * @param {string} achievementId - Achievement ID
 * @returns {HTMLElement} Notification element
 */
function createAchievementNotification(achievementId) {
  const achievement = getAchievementById(achievementId);
  if (!achievement) {
    return document.createElement('div');
  }

  const notification = document.createElement('div');
  notification.className = 'achievement-notification';
  notification.dataset.achievementId = achievementId;
  notification.setAttribute('role', 'status');
  notification.setAttribute('aria-live', 'polite');
  notification.setAttribute('aria-atomic', 'true');

  notification.innerHTML = `
    <div class="achievement-notification__header">${t('achievements.notificationTitle')}</div>
    <div class="achievement-notification__badge">
      <span class="achievement-notification__icon">${achievement.icon}</span>
      <div class="achievement-notification__info">
        <div class="achievement-notification__name">${achievement.name}</div>
        <div class="achievement-notification__desc">${achievement.description}</div>
      </div>
    </div>
  `;

  return notification;
}

/**
 * Achievements that trigger confetti celebration
 */
const CONFETTI_ACHIEVEMENTS = new Set([
  'score_100', 'score_500', 'score_1000',
  'streak_7', 'streak_14', 'streak_30',
  'perfect_week', 'recovery'
]);

/**
 * Show achievement notification with animation
 * @param {string} achievementId - Achievement ID
 * @param {number} [duration=4000] - Display duration in ms
 */
function showAchievementNotification(achievementId, duration = 4000) {
  const notification = createAchievementNotification(achievementId);
  document.body.appendChild(notification);

  // Show confetti for significant achievements
  if (CONFETTI_ACHIEVEMENTS.has(achievementId)) {
    showConfetti(60, 3500);
  }

  // Trigger animation
  requestAnimationFrame(() => {
    notification.classList.add('achievement-notification--visible');
  });

  // Auto-remove after duration
  setTimeout(() => {
    notification.classList.remove('achievement-notification--visible');
    notification.classList.add('achievement-notification--hiding');

    notification.addEventListener('animationend', () => {
      notification.remove();
    }, { once: true });

    // Fallback removal
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 500);
  }, duration);
}

/**
 * Show multiple achievement notifications sequentially
 * @param {string[]} achievementIds - Array of achievement IDs
 * @param {number} [delay=1500] - Delay between notifications in ms
 */
function showMultipleAchievementNotifications(achievementIds, delay = 1500) {
  achievementIds.forEach((id, index) => {
    setTimeout(() => {
      showAchievementNotification(id);
    }, index * (4000 + delay));
  });
}

/**
 * Create progress bar for achievement
 * @param {number} current - Current progress
 * @param {number} target - Target for achievement
 * @param {string} [label] - Optional label
 * @returns {HTMLElement} Progress bar element
 */
function createProgressBar(current, target, label = '') {
  const progress = document.createElement('div');
  progress.className = 'achievement-progress';

  const percentage = Math.min(100, Math.round((current / target) * 100));

  progress.innerHTML = `
    ${label ? `<div class="achievement-progress__label">${label}</div>` : ''}
    <div class="achievement-progress__bar">
      <div class="achievement-progress__fill" style="width: ${percentage}%"></div>
    </div>
    <div class="achievement-progress__text">${current} / ${target}</div>
  `;

  return progress;
}

export {
  createAchievementBadge,
  createAchievementCard,
  createAchievementNotification,
  showAchievementNotification,
  showMultipleAchievementNotifications,
  createProgressBar
};
