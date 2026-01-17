/**
 * Dashboard View
 * Analytics and statistics overview
 */

import { ScoreModel } from '../models/score.js';
import { ActivityModel } from '../models/activity.js';
import { CompletionModel } from '../models/completion.js';
import { SettingsModel } from '../models/settings.js';
import { getLocalDateString, daysBetween } from '../utils/date.js';
import { escapeHtml } from '../utils/dom.js';
import {
  getSuccessfulDayStreak,
  getPerfectDayStreak,
  getAchievementProgress,
  getAllAchievementsWithStatus
} from '../services/achievements.js';

async function renderDashboardView(container) {
  container.innerHTML = '';

  const view = document.createElement('section');
  view.className = 'dashboard-view';

  const header = document.createElement('div');
  header.className = 'view-header';
  header.innerHTML = `
    <h2>Statistics</h2>
    <p>Your progress and achievements at a glance.</p>
  `;
  view.appendChild(header);

  // Main score card
  const scoreCard = await createScoreCard();
  view.appendChild(scoreCard);

  // Today's progress card
  const progressCard = await createTodayProgressCard();
  view.appendChild(progressCard);

  // Streaks card
  const streaksCard = await createStreaksCard();
  view.appendChild(streaksCard);

  // Activity stats card
  const activityStatsCard = await createActivityStatsCard();
  view.appendChild(activityStatsCard);

  // Achievements card
  const achievementsCard = await createAchievementsCard();
  view.appendChild(achievementsCard);

  container.appendChild(view);
  view.dataset.ready = 'true';
}

async function createScoreCard() {
  const score = await ScoreModel.getScore();
  const highestScore = await ScoreModel.getHighestScore();
  const lowestScore = await ScoreModel.getLowestScore();
  const firstUseDate = await SettingsModel.getFirstUseDate();
  const daysActive = firstUseDate ? daysBetween(firstUseDate, getLocalDateString()) + 1 : 1;

  const card = document.createElement('div');
  card.className = 'card dashboard-card score-card';
  card.innerHTML = `
    <div class="dashboard-score">
      <div class="dashboard-score-label">Current Score</div>
      <div class="dashboard-score-value ${score > 0 ? 'score-positive' : score < 0 ? 'score-negative' : 'score-neutral'}" data-testid="dashboard-score">
        ${score}
      </div>
    </div>
    <div class="dashboard-score-stats">
      <div class="stat-item">
        <span class="stat-label">Highest</span>
        <span class="stat-value score-positive" data-testid="highest-score">${highestScore}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Lowest</span>
        <span class="stat-value ${lowestScore < 0 ? 'score-negative' : ''}" data-testid="lowest-score">${lowestScore}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Days Active</span>
        <span class="stat-value" data-testid="days-active">${daysActive}</span>
      </div>
    </div>
  `;

  return card;
}

async function createTodayProgressCard() {
  const breakEven = await ScoreModel.getBreakEvenStatus();
  const decayAmount = await SettingsModel.getDecayAmount();
  const completionsToday = await CompletionModel.countByDate();
  const activities = await ActivityModel.getAll();
  const totalActivities = activities.length;

  const progressPercent = decayAmount > 0
    ? Math.min(100, Math.round((breakEven.earned / decayAmount) * 100))
    : 100;

  const completionPercent = totalActivities > 0
    ? Math.round((completionsToday / totalActivities) * 100)
    : 0;

  const card = document.createElement('div');
  card.className = 'card dashboard-card';
  card.innerHTML = `
    <h3 class="dashboard-card-title">Today's Progress</h3>
    <div class="progress-section">
      <div class="progress-row">
        <div class="progress-info">
          <span class="progress-label">Break-even</span>
          <span class="progress-detail">${breakEven.earned} / ${decayAmount} pts</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar" role="progressbar" aria-label="Break-even progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressPercent}" aria-valuetext="${breakEven.breakEven ? 'Break-even achieved' : `${breakEven.remaining} points remaining`}">
            <div class="progress-bar-fill ${breakEven.breakEven ? 'progress-success' : 'progress-warning'}"
                 style="width: ${progressPercent}%" data-testid="breakeven-progress"></div>
          </div>
        </div>
        <span class="progress-status ${breakEven.breakEven ? 'status-success' : 'status-warning'}">
          ${breakEven.breakEven ? '✓ Done' : `${breakEven.remaining} left`}
        </span>
      </div>
      <div class="progress-row">
        <div class="progress-info">
          <span class="progress-label">Activities</span>
          <span class="progress-detail">${completionsToday} / ${totalActivities}</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar" role="progressbar" aria-label="Activity completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${completionPercent}" aria-valuetext="${completionPercent}% complete">
            <div class="progress-bar-fill ${completionPercent === 100 ? 'progress-success' : 'progress-primary'}"
                 style="width: ${completionPercent}%" data-testid="activity-progress"></div>
          </div>
        </div>
        <span class="progress-status">
          ${completionPercent}%
        </span>
      </div>
    </div>
  `;

  return card;
}

async function createStreaksCard() {
  const successStreak = await getSuccessfulDayStreak();
  const perfectStreak = await getPerfectDayStreak();
  const completionStreak = await CompletionModel.getCompletionStreak();

  const card = document.createElement('div');
  card.className = 'card dashboard-card';
  card.innerHTML = `
    <h3 class="dashboard-card-title">Streaks</h3>
    <div class="streaks-grid">
      <div class="streak-item">
        <span class="streak-icon">🔥</span>
        <span class="streak-value" data-testid="success-streak">${successStreak}</span>
        <span class="streak-label">Successful Days</span>
        <span class="streak-hint">Earned ≥ decay</span>
      </div>
      <div class="streak-item">
        <span class="streak-icon">⭐</span>
        <span class="streak-value" data-testid="perfect-streak">${perfectStreak}</span>
        <span class="streak-label">Perfect Days</span>
        <span class="streak-hint">All activities done</span>
      </div>
      <div class="streak-item">
        <span class="streak-icon">📅</span>
        <span class="streak-value" data-testid="completion-streak">${completionStreak}</span>
        <span class="streak-label">Active Days</span>
        <span class="streak-hint">At least 1 activity</span>
      </div>
    </div>
  `;

  return card;
}

async function createActivityStatsCard() {
  const today = getLocalDateString();
  const thirtyDaysAgo = getLocalDateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  const activities = await ActivityModel.getAll();
  const completionCounts = await CompletionModel.getCompletionCountsByActivity(thirtyDaysAgo, today);

  // Calculate stats for each activity
  const activityStats = activities.map(activity => ({
    ...activity,
    completions: completionCounts[activity.id] || 0
  }));

  // Sort by completions
  const sorted = [...activityStats].sort((a, b) => b.completions - a.completions);
  const mostCompleted = sorted.slice(0, 3);
  const leastCompleted = sorted.filter(a => a.completions > 0).slice(-3).reverse();

  // Get activities never completed in 30 days
  const neverCompleted = activityStats.filter(a => a.completions === 0);

  const card = document.createElement('div');
  card.className = 'card dashboard-card';

  let content = '<h3 class="dashboard-card-title">Activity Stats (30 Days)</h3>';

  if (activities.length === 0) {
    content += '<p class="empty-message">No activities yet. Add activities to see stats.</p>';
  } else {
    content += '<div class="activity-stats-sections">';

    // Most completed
    if (mostCompleted.length > 0 && mostCompleted[0].completions > 0) {
      content += `
        <div class="stats-section">
          <h4 class="stats-section-title">Most Completed</h4>
          <ul class="stats-list" data-testid="most-completed">
            ${mostCompleted.filter(a => a.completions > 0).map(a => `
              <li class="stats-list-item">
                <span class="stats-item-name">${escapeHtml(a.name)}</span>
                <span class="stats-item-count">${a.completions}×</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // Least completed (but at least once)
    if (leastCompleted.length > 0 && leastCompleted.some(a => a.completions > 0)) {
      content += `
        <div class="stats-section">
          <h4 class="stats-section-title">Least Completed</h4>
          <ul class="stats-list" data-testid="least-completed">
            ${leastCompleted.filter(a => a.completions > 0).map(a => `
              <li class="stats-list-item">
                <span class="stats-item-name">${escapeHtml(a.name)}</span>
                <span class="stats-item-count">${a.completions}×</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // Never completed
    if (neverCompleted.length > 0) {
      content += `
        <div class="stats-section stats-section-warning">
          <h4 class="stats-section-title">Not Completed Yet</h4>
          <ul class="stats-list stats-list-muted" data-testid="never-completed">
            ${neverCompleted.slice(0, 3).map(a => `
              <li class="stats-list-item">
                <span class="stats-item-name">${escapeHtml(a.name)}</span>
                <span class="stats-item-count">0×</span>
              </li>
            `).join('')}
            ${neverCompleted.length > 3 ? `<li class="stats-more">+${neverCompleted.length - 3} more</li>` : ''}
          </ul>
        </div>
      `;
    }

    content += '</div>';
  }

  card.innerHTML = content;
  return card;
}

async function createAchievementsCard() {
  const progress = await getAchievementProgress();
  const achievements = await getAllAchievementsWithStatus();
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const recentUnlocked = unlockedAchievements
    .sort((a, b) => (b.unlockedAt || '').localeCompare(a.unlockedAt || ''))
    .slice(0, 4);

  const card = document.createElement('div');
  card.className = 'card dashboard-card';

  let content = `
    <h3 class="dashboard-card-title">Achievements</h3>
    <div class="achievement-summary">
      <span class="achievement-count" data-testid="achievement-count">${progress.unlockedCount} / ${progress.totalCount}</span>
      <span class="achievement-label">unlocked</span>
    </div>
  `;

  if (recentUnlocked.length > 0) {
    content += `
      <div class="recent-achievements">
        <h4 class="stats-section-title">Recently Unlocked</h4>
        <div class="achievement-badges">
          ${recentUnlocked.map(a => `
            <div class="dashboard-achievement-badge" title="${escapeHtml(a.description)}">
              <span class="badge-icon">${a.icon}</span>
              <span class="badge-name">${escapeHtml(a.name)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Next achievements to unlock
  const nextAchievements = [];
  if (progress.score.nextAchievement) {
    nextAchievements.push({
      ...progress.score.nextAchievement,
      progress: `${progress.score.current} / ${progress.score.next}`
    });
  }
  if (progress.streak.nextAchievement) {
    nextAchievements.push({
      ...progress.streak.nextAchievement,
      progress: `${progress.streak.current} / ${progress.streak.next}`
    });
  }

  if (nextAchievements.length > 0) {
    content += `
      <div class="next-achievements">
        <h4 class="stats-section-title">Next Goals</h4>
        <ul class="next-achievement-list">
          ${nextAchievements.slice(0, 2).map(a => `
            <li class="next-achievement-item">
              <span class="next-achievement-icon">${a.icon}</span>
              <div class="next-achievement-info">
                <span class="next-achievement-name">${escapeHtml(a.name)}</span>
                <span class="next-achievement-progress">${a.progress}</span>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  card.innerHTML = content;
  return card;
}

export { renderDashboardView };
