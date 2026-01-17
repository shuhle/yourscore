/**
 * Achievements Service for YourScore
 * Handles achievement tracking, checking, and unlocking
 */

import { db } from '../storage/db.js';
import { ScoreModel } from '../models/score.js';
import { CompletionModel } from '../models/completion.js';
import { ActivityModel } from '../models/activity.js';
import { getLocalDateString } from '../utils/date.js';

const STORE_NAME = 'achievements';

/**
 * Maximum number of days to look back when calculating streaks
 */
const MAX_STREAK_LOOKBACK_DAYS = 365;

/**
 * Achievement definitions
 * Each achievement has: id, name, description, icon, type, and check function
 */
const ACHIEVEMENTS = {
  // Score milestones
  score_100: {
    id: 'score_100',
    name: 'Century',
    description: 'Reach 100 points',
    icon: '💯',
    type: 'score_milestone',
    threshold: 100
  },
  score_500: {
    id: 'score_500',
    name: 'High Achiever',
    description: 'Reach 500 points',
    icon: '⭐',
    type: 'score_milestone',
    threshold: 500
  },
  score_1000: {
    id: 'score_1000',
    name: 'Thousand Club',
    description: 'Reach 1,000 points',
    icon: '🏆',
    type: 'score_milestone',
    threshold: 1000
  },

  // Streak achievements (consecutive successful days where earned >= decay)
  streak_3: {
    id: 'streak_3',
    name: 'Getting Started',
    description: 'Complete 3 successful days in a row',
    icon: '🔥',
    type: 'streak',
    threshold: 3
  },
  streak_7: {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Complete 7 successful days in a row',
    icon: '🔥',
    type: 'streak',
    threshold: 7
  },
  streak_14: {
    id: 'streak_14',
    name: 'Fortnight Fighter',
    description: 'Complete 14 successful days in a row',
    icon: '🔥',
    type: 'streak',
    threshold: 14
  },
  streak_30: {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Complete 30 successful days in a row',
    icon: '🔥',
    type: 'streak',
    threshold: 30
  },

  // Perfect week (all activities completed every day for 7 consecutive days)
  perfect_week: {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Complete all activities every day for 7 consecutive days',
    icon: '🌟',
    type: 'perfect_week',
    threshold: 7
  },

  // Recovery achievement (bounce back from negative to positive)
  recovery: {
    id: 'recovery',
    name: 'Comeback Kid',
    description: 'Recover from a negative score to positive',
    icon: '🚀',
    type: 'recovery',
    threshold: 0
  },

  // First completion
  first_completion: {
    id: 'first_completion',
    name: 'First Step',
    description: 'Complete your first activity',
    icon: '👣',
    type: 'first_completion',
    threshold: 1
  },

  // Activity count milestones
  activities_50: {
    id: 'activities_50',
    name: 'Half Century',
    description: 'Complete 50 activities total',
    icon: '📊',
    type: 'activity_count',
    threshold: 50
  },
  activities_100: {
    id: 'activities_100',
    name: 'Activity Centurion',
    description: 'Complete 100 activities total',
    icon: '📊',
    type: 'activity_count',
    threshold: 100
  },
  activities_500: {
    id: 'activities_500',
    name: 'Habit Hero',
    description: 'Complete 500 activities total',
    icon: '🦸',
    type: 'activity_count',
    threshold: 500
  }
};

/**
 * Get all achievement definitions
 * @returns {Object} Achievement definitions
 */
function getAchievementDefinitions() {
  return ACHIEVEMENTS;
}

/**
 * Get an achievement definition by ID
 * @param {string} id - Achievement ID
 * @returns {Object|undefined} Achievement definition
 */
function getAchievementById(id) {
  return ACHIEVEMENTS[id];
}

/**
 * Get all unlocked achievements
 * @returns {Promise<Array>} Array of unlocked achievement records
 */
async function getUnlockedAchievements() {
  return db.getAll(STORE_NAME);
}

/**
 * Check if an achievement is unlocked
 * @param {string} id - Achievement ID
 * @returns {Promise<boolean>}
 */
async function isUnlocked(id) {
  const record = await db.get(STORE_NAME, id);
  return record !== undefined;
}

/**
 * Unlock an achievement
 * @param {string} id - Achievement ID
 * @returns {Promise<Object>} Achievement record
 */
async function unlock(id) {
  const existing = await db.get(STORE_NAME, id);
  if (existing) {
    return existing; // Already unlocked
  }

  const record = {
    id,
    unlockedAt: new Date().toISOString()
  };

  await db.put(STORE_NAME, record);
  return record;
}

/**
 * Get successful day streak (days where earned >= decay)
 * @returns {Promise<number>} Current streak count
 */
async function getSuccessfulDayStreak() {
  const history = await ScoreModel.getAllHistory();
  if (history.length === 0) {
    return 0;
  }

  // Sort by date descending
  const sortedHistory = [...history].sort((a, b) => b.date.localeCompare(a.date));

  let streak = 0;
  const today = getLocalDateString();

  // Start from today or most recent day
  let checkDate = today;
  let historyIndex = 0;

  // Find the starting point
  while (historyIndex < sortedHistory.length && sortedHistory[historyIndex].date > checkDate) {
    historyIndex++;
  }

  while (historyIndex < sortedHistory.length) {
    const record = sortedHistory[historyIndex];

    // If there's a gap in dates, streak is broken
    if (record.date !== checkDate) {
      break;
    }

    // Check if this was a successful day (earned >= decay)
    // Note: A day with 0 decay and 0 earned is considered successful (first day or no decay set)
    if (record.earned >= record.decay) {
      streak++;
    } else {
      break; // Streak broken
    }

    // Move to previous day
    const date = new Date(checkDate + 'T00:00:00');
    date.setDate(date.getDate() - 1);
    checkDate = getLocalDateString(date);
    historyIndex++;
  }

  return streak;
}

/**
 * Get perfect day streak (all activities completed for consecutive days)
 * @returns {Promise<number>} Current perfect day streak
 */
async function getPerfectDayStreak() {
  const activities = await ActivityModel.getAll();

  // If no activities exist, can't have perfect days
  if (activities.length === 0) {
    return 0;
  }

  const activityIds = activities.map(a => a.id);
  const today = getLocalDateString();

  let streak = 0;
  let checkDate = today;

  // Check each day going backwards
  for (let i = 0; i < MAX_STREAK_LOOKBACK_DAYS; i++) {
    const allCompleted = await CompletionModel.allCompleted(checkDate, activityIds);

    if (allCompleted) {
      streak++;
    } else {
      break;
    }

    // Move to previous day
    const date = new Date(checkDate + 'T00:00:00');
    date.setDate(date.getDate() - 1);
    checkDate = getLocalDateString(date);
  }

  return streak;
}

/**
 * Get total completion count
 * @returns {Promise<number>}
 */
async function getTotalCompletionCount() {
  const completions = await CompletionModel.getAll();
  return completions.length;
}

/**
 * Check if recovery achievement should be unlocked
 * (User went from negative to positive score)
 * @param {number} previousScore - Score before change
 * @param {number} currentScore - Score after change
 * @returns {boolean}
 */
function checkRecoveryCondition(previousScore, currentScore) {
  return previousScore < 0 && currentScore >= 0;
}

/**
 * Check for newly earned achievements based on current state
 * @param {Object} context - Context for checking
 * @param {number} [context.previousScore] - Score before recent change
 * @returns {Promise<Array>} Array of newly unlocked achievement IDs
 */
async function checkForNewAchievements(context = {}) {
  const newlyUnlocked = [];
  const currentScore = await ScoreModel.getScore();

  // Check score milestones
  for (const achievement of Object.values(ACHIEVEMENTS)) {
    if (achievement.type === 'score_milestone') {
      if (currentScore >= achievement.threshold && !(await isUnlocked(achievement.id))) {
        await unlock(achievement.id);
        newlyUnlocked.push(achievement.id);
      }
    }
  }

  // Check streak achievements
  const streak = await getSuccessfulDayStreak();
  for (const achievement of Object.values(ACHIEVEMENTS)) {
    if (achievement.type === 'streak') {
      if (streak >= achievement.threshold && !(await isUnlocked(achievement.id))) {
        await unlock(achievement.id);
        newlyUnlocked.push(achievement.id);
      }
    }
  }

  // Check perfect week
  const perfectStreak = await getPerfectDayStreak();
  if (perfectStreak >= 7 && !(await isUnlocked('perfect_week'))) {
    await unlock('perfect_week');
    newlyUnlocked.push('perfect_week');
  }

  // Check recovery achievement
  if (context.previousScore !== undefined) {
    if (checkRecoveryCondition(context.previousScore, currentScore) && !(await isUnlocked('recovery'))) {
      await unlock('recovery');
      newlyUnlocked.push('recovery');
    }
  }

  // Check first completion
  const completionCount = await getTotalCompletionCount();
  if (completionCount >= 1 && !(await isUnlocked('first_completion'))) {
    await unlock('first_completion');
    newlyUnlocked.push('first_completion');
  }

  // Check activity count milestones
  for (const achievement of Object.values(ACHIEVEMENTS)) {
    if (achievement.type === 'activity_count') {
      if (completionCount >= achievement.threshold && !(await isUnlocked(achievement.id))) {
        await unlock(achievement.id);
        newlyUnlocked.push(achievement.id);
      }
    }
  }

  return newlyUnlocked;
}

/**
 * Get achievement progress for display
 * @returns {Promise<Object>} Progress for various achievement types
 */
async function getAchievementProgress() {
  const currentScore = await ScoreModel.getScore();
  const streak = await getSuccessfulDayStreak();
  const perfectStreak = await getPerfectDayStreak();
  const completionCount = await getTotalCompletionCount();
  const unlockedList = await getUnlockedAchievements();
  const unlockedIds = new Set(unlockedList.map(a => a.id));

  // Find next milestone for each type
  const nextScoreMilestone = Object.values(ACHIEVEMENTS)
    .filter(a => a.type === 'score_milestone' && a.threshold > currentScore)
    .sort((a, b) => a.threshold - b.threshold)[0];

  const nextStreakMilestone = Object.values(ACHIEVEMENTS)
    .filter(a => a.type === 'streak' && a.threshold > streak)
    .sort((a, b) => a.threshold - b.threshold)[0];

  const nextActivityMilestone = Object.values(ACHIEVEMENTS)
    .filter(a => a.type === 'activity_count' && a.threshold > completionCount)
    .sort((a, b) => a.threshold - b.threshold)[0];

  return {
    score: {
      current: currentScore,
      next: nextScoreMilestone?.threshold,
      nextAchievement: nextScoreMilestone
    },
    streak: {
      current: streak,
      next: nextStreakMilestone?.threshold,
      nextAchievement: nextStreakMilestone
    },
    perfectStreak: {
      current: perfectStreak,
      target: 7,
      unlocked: unlockedIds.has('perfect_week')
    },
    completions: {
      current: completionCount,
      next: nextActivityMilestone?.threshold,
      nextAchievement: nextActivityMilestone
    },
    unlockedCount: unlockedList.length,
    totalCount: Object.keys(ACHIEVEMENTS).length,
    unlockedIds: Array.from(unlockedIds)
  };
}

/**
 * Get all achievements with unlocked status
 * @returns {Promise<Array>} Array of achievements with unlocked status
 */
async function getAllAchievementsWithStatus() {
  const unlockedList = await getUnlockedAchievements();
  const unlockedMap = new Map(unlockedList.map(a => [a.id, a]));

  return Object.values(ACHIEVEMENTS).map(achievement => ({
    ...achievement,
    unlocked: unlockedMap.has(achievement.id),
    unlockedAt: unlockedMap.get(achievement.id)?.unlockedAt
  }));
}

/**
 * Clear all unlocked achievements (for testing/reset)
 * @returns {Promise<void>}
 */
async function clearAchievements() {
  await db.clear(STORE_NAME);
}

export {
  ACHIEVEMENTS,
  getAchievementDefinitions,
  getAchievementById,
  getUnlockedAchievements,
  isUnlocked,
  unlock,
  getSuccessfulDayStreak,
  getPerfectDayStreak,
  getTotalCompletionCount,
  checkRecoveryCondition,
  checkForNewAchievements,
  getAchievementProgress,
  getAllAchievementsWithStatus,
  clearAchievements
};
