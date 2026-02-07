/**
 * Decay Service for YourScore
 * Handles daily score decay calculation and application
 */

import { SettingsModel } from '../models/settings.js';
import { ScoreModel } from '../models/score.js';
import { getLocalDateString, daysSinceLastActive } from '../utils/date.js';
import { t, tPlural, formatNumber } from '../i18n/i18n.js';

/**
 * Calculate decay for missed days
 * @param {number} daysAway - Number of days since last active
 * @param {number} decayAmount - Daily decay amount
 * @returns {number} Total decay to apply
 */
function calculateDecay(daysAway, decayAmount) {
  if (daysAway <= 0 || decayAmount <= 0) {
    return 0;
  }
  return daysAway * decayAmount;
}

/**
 * Check and apply decay if needed
 * This is the main entry point called when the app opens
 * @returns {Promise<Object>} Decay result with details
 */
async function checkAndApplyDecay() {
  const today = getLocalDateString();

  // Initialize settings for new users
  const isNewUser = await SettingsModel.initializeIfNeeded();

  if (isNewUser) {
    return {
      applied: false,
      decay: 0,
      daysAway: 0,
      isFirstDay: true,
      message: t('decay.firstDayWelcome'),
    };
  }

  const settings = await SettingsModel.getAll();
  const { firstUseDate, lastActiveDate, decayAmount } = settings;

  // Check if this is the first day (no decay on first day)
  if (today === firstUseDate) {
    await SettingsModel.setLastActiveDate(today);
    return {
      applied: false,
      decay: 0,
      daysAway: 0,
      isFirstDay: true,
      message: t('decay.firstDay'),
    };
  }

  // Check if already processed today
  if (lastActiveDate === today) {
    return {
      applied: false,
      decay: 0,
      daysAway: 0,
      isFirstDay: false,
      message: t('decay.alreadyActive'),
    };
  }

  // Calculate days since last active
  const daysAway = daysSinceLastActive(lastActiveDate, today);

  if (daysAway <= 0) {
    await SettingsModel.setLastActiveDate(today);
    return {
      applied: false,
      decay: 0,
      daysAway: 0,
      isFirstDay: false,
      message: t('decay.noneNeeded'),
    };
  }

  // Calculate and apply decay
  const totalDecay = calculateDecay(daysAway, decayAmount);
  const previousScore = await ScoreModel.getScore();
  const newScore = await ScoreModel.subtractPoints(totalDecay);

  // Update last active date
  await SettingsModel.setLastActiveDate(today);

  // Record in today's history
  await ScoreModel.updateTodayHistory({
    decay: totalDecay,
    score: newScore,
  });

  return {
    applied: true,
    decay: totalDecay,
    daysAway: daysAway,
    isFirstDay: false,
    previousScore: previousScore,
    newScore: newScore,
    message:
      daysAway === 1
        ? t('decay.appliedSingle', {
            points: formatNumber(totalDecay),
            pointsLabel: tPlural('units.pointsLong', totalDecay),
          })
        : t('decay.appliedMultiple', {
            days: formatNumber(daysAway),
            points: formatNumber(totalDecay),
            pointsLabel: tPlural('units.pointsLong', totalDecay),
          }),
  };
}

/**
 * Preview decay without applying it
 * @returns {Promise<Object>} Preview of what decay would be applied
 */
async function previewDecay() {
  const today = getLocalDateString();
  const settings = await SettingsModel.getAll();

  const { firstUseDate, lastActiveDate, decayAmount } = settings;

  // New user or first day
  if (!firstUseDate || today === firstUseDate) {
    return {
      wouldApply: false,
      decay: 0,
      daysAway: 0,
      reason: t('decay.previewFirstDay'),
    };
  }

  // Already active today
  if (lastActiveDate === today) {
    return {
      wouldApply: false,
      decay: 0,
      daysAway: 0,
      reason: t('decay.previewAlreadyActive'),
    };
  }

  const daysAway = daysSinceLastActive(lastActiveDate, today);
  const totalDecay = calculateDecay(daysAway, decayAmount);

  return {
    wouldApply: daysAway > 0,
    decay: totalDecay,
    daysAway: daysAway,
    reason:
      daysAway > 0
        ? t('decay.previewDaysAway', { days: formatNumber(daysAway) })
        : t('decay.previewNone'),
  };
}

/**
 * Get the daily decay amount
 * @returns {Promise<number>}
 */
async function getDecayAmount() {
  return SettingsModel.getDecayAmount();
}

/**
 * Set the daily decay amount
 * @param {number} amount - New decay amount
 * @returns {Promise<void>}
 */
async function setDecayAmount(amount) {
  if (amount < 0) {
    throw new Error(t('errors.decayNegative'));
  }
  await SettingsModel.setDecayAmount(amount);
}

/**
 * Check if user has "broken even" today
 * (earned enough to offset today's decay)
 * @returns {Promise<boolean>}
 */
async function hasBrokenEvenToday() {
  const status = await ScoreModel.getBreakEvenStatus();
  return status.breakEven;
}

/**
 * Get points remaining to break even today
 * @returns {Promise<number>} Points remaining (0 if already broken even)
 */
async function getPointsToBreakEven() {
  const status = await ScoreModel.getBreakEvenStatus();
  return status.remaining;
}

/**
 * Get surplus points earned today (above decay)
 * @returns {Promise<number>} Surplus points (0 if not broken even)
 */
async function getSurplusPoints() {
  const status = await ScoreModel.getBreakEvenStatus();
  return status.surplus;
}

/**
 * Simulate decay for multiple days (for testing/preview)
 * @param {number} currentScore - Starting score
 * @param {number} decayAmount - Daily decay amount
 * @param {number} days - Number of days to simulate
 * @returns {Object} Simulation result
 */
function simulateDecay(currentScore, decayAmount, days) {
  const totalDecay = calculateDecay(days, decayAmount);
  const finalScore = currentScore - totalDecay;

  return {
    startingScore: currentScore,
    decayPerDay: decayAmount,
    days: days,
    totalDecay: totalDecay,
    finalScore: finalScore,
  };
}

// Legacy class wrapper for backwards compatibility
class DecayService {
  static calculateDecay(daysAway, decayAmount) {
    return calculateDecay(daysAway, decayAmount);
  }

  static async checkAndApplyDecay() {
    return checkAndApplyDecay();
  }

  static async previewDecay() {
    return previewDecay();
  }

  static async getDecayAmount() {
    return getDecayAmount();
  }

  static async setDecayAmount(amount) {
    return setDecayAmount(amount);
  }

  static async hasBrokenEvenToday() {
    return hasBrokenEvenToday();
  }

  static async getPointsToBreakEven() {
    return getPointsToBreakEven();
  }

  static async getSurplusPoints() {
    return getSurplusPoints();
  }

  static simulateDecay(currentScore, decayAmount, days) {
    return simulateDecay(currentScore, decayAmount, days);
  }
}

export {
  DecayService,
  calculateDecay,
  checkAndApplyDecay,
  previewDecay,
  getDecayAmount,
  setDecayAmount,
  hasBrokenEvenToday,
  getPointsToBreakEven,
  getSurplusPoints,
  simulateDecay,
};

export default DecayService;
