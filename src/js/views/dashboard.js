/**
 * Dashboard View
 * Analytics and statistics overview
 */

import { ScoreModel } from '../models/score.js';
import { ActivityModel } from '../models/activity.js';
import { CompletionModel } from '../models/completion.js';
import { SettingsModel } from '../models/settings.js';
import { getLocalDateString, getDateDaysAgo, daysBetween } from '../utils/date.js';
import { escapeHtml } from '../utils/dom.js';
import {
  getSuccessfulDayStreak,
  getPerfectDayStreak,
  getAchievementProgress,
  getAllAchievementsWithStatus,
} from '../services/achievements.js';
import { t, tPlural, formatNumber } from '../i18n/i18n.js';
import { iconFlame, iconSparkle, iconCalendar } from '../utils/icons.js';

async function renderDashboardView(container) {
  container.innerHTML = '';

  const view = document.createElement('section');
  view.className = 'dashboard-view';

  const header = document.createElement('div');
  header.className = 'view-header';
  header.innerHTML = `
    <h2>${t('dashboard.title')}</h2>
    <p>${t('dashboard.subtitle')}</p>
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
      <div class="dashboard-score-label">${t('dashboard.scoreCard.current')}</div>
      <div class="dashboard-score-value ${score > 0 ? 'score-positive' : score < 0 ? 'score-negative' : 'score-neutral'}" data-testid="dashboard-score">
        ${formatNumber(score)}
      </div>
    </div>
    <div class="dashboard-score-stats">
      <div class="stat-item">
        <span class="stat-label">${t('dashboard.scoreCard.highest')}</span>
        <span class="stat-value score-positive" data-testid="highest-score">${formatNumber(highestScore)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">${t('dashboard.scoreCard.lowest')}</span>
        <span class="stat-value ${lowestScore < 0 ? 'score-negative' : ''}" data-testid="lowest-score">${formatNumber(lowestScore)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">${t('dashboard.scoreCard.daysActive')}</span>
        <span class="stat-value" data-testid="days-active">${formatNumber(daysActive)}</span>
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

  const progressPercent =
    decayAmount > 0 ? Math.min(100, Math.round((breakEven.earned / decayAmount) * 100)) : 100;

  const completionPercent =
    totalActivities > 0 ? Math.round((completionsToday / totalActivities) * 100) : 0;

  const remainingPointsLabel = tPlural('units.pointsLong', breakEven.remaining);
  const card = document.createElement('div');
  card.className = 'card dashboard-card';
  card.innerHTML = `
    <h3 class="dashboard-card-title">${t('dashboard.todayProgress')}</h3>
    <div class="progress-section">
      <div class="progress-row">
        <div class="progress-info">
          <span class="progress-label">${t('dashboard.progress.breakEvenLabel')}</span>
          <span class="progress-detail">${formatNumber(breakEven.earned)} / ${formatNumber(decayAmount)} ${t('units.pointsShort')}</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar" role="progressbar" aria-label="${t('dashboard.progress.breakEvenAria')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressPercent}" aria-valuetext="${breakEven.breakEven ? t('dashboard.progress.breakEvenAchievedAria') : t('dashboard.progress.breakEvenRemainingAria', { points: formatNumber(breakEven.remaining), pointsLabel: remainingPointsLabel })}">
            <div class="progress-bar-fill ${breakEven.breakEven ? 'progress-success' : 'progress-warning'}"
                 style="width: ${progressPercent}%" data-testid="breakeven-progress"></div>
          </div>
        </div>
        <span class="progress-status ${breakEven.breakEven ? 'status-success' : 'status-warning'}">
          ${breakEven.breakEven ? t('dashboard.progress.breakEvenStatusDone') : t('dashboard.progress.breakEvenStatusLeft', { count: formatNumber(breakEven.remaining) })}
        </span>
      </div>
      <div class="progress-row">
        <div class="progress-info">
          <span class="progress-label">${t('dashboard.progress.activitiesLabel')}</span>
          <span class="progress-detail">${formatNumber(completionsToday)} / ${formatNumber(totalActivities)}</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar" role="progressbar" aria-label="${t('dashboard.progress.activitiesAria')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${completionPercent}" aria-valuetext="${t('dashboard.progress.percentComplete', { percent: formatNumber(completionPercent) })}">
            <div class="progress-bar-fill ${completionPercent === 100 ? 'progress-success' : 'progress-primary'}"
                 style="width: ${completionPercent}%" data-testid="activity-progress"></div>
          </div>
        </div>
        <span class="progress-status">
          ${formatNumber(completionPercent)}%
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
    <h3 class="dashboard-card-title">${t('dashboard.streaksTitle')}</h3>
    <div class="streaks-grid">
      <div class="streak-item">
        <span class="streak-icon">${iconFlame(20)}</span>
        <span class="streak-value" data-testid="success-streak">${formatNumber(successStreak)}</span>
        <span class="streak-label">${t('dashboard.streaks.successfulDays')}</span>
        <span class="streak-hint">${t('dashboard.streaks.successfulHint')}</span>
      </div>
      <div class="streak-item">
        <span class="streak-icon">${iconSparkle(20)}</span>
        <span class="streak-value" data-testid="perfect-streak">${formatNumber(perfectStreak)}</span>
        <span class="streak-label">${t('dashboard.streaks.perfectDays')}</span>
        <span class="streak-hint">${t('dashboard.streaks.perfectHint')}</span>
      </div>
      <div class="streak-item">
        <span class="streak-icon">${iconCalendar(20)}</span>
        <span class="streak-value" data-testid="completion-streak">${formatNumber(completionStreak)}</span>
        <span class="streak-label">${t('dashboard.streaks.activeDays')}</span>
        <span class="streak-hint">${t('dashboard.streaks.activeHint')}</span>
      </div>
    </div>
  `;

  return card;
}

function createStatsSection(title, items, testId, extraClass = '') {
  if (items.length === 0) {
    return '';
  }
  return `
    <div class="stats-section ${extraClass}">
      <h4 class="stats-section-title">${title}</h4>
      <ul class="stats-list ${extraClass ? 'stats-list-muted' : ''}" data-testid="${testId}">
        ${items
          .map(
            (a) => `
          <li class="stats-list-item">
            <span class="stats-item-name">${escapeHtml(a.name)}</span>
            <span class="stats-item-count">${formatNumber(a.completions)}×</span>
          </li>
        `
          )
          .join('')}
      </ul>
    </div>
  `;
}

async function createActivityStatsCard() {
  const STATS_PERIOD_DAYS = 30;
  const TOP_ACTIVITIES_COUNT = 3;
  const today = getLocalDateString();
  const thirtyDaysAgo = getDateDaysAgo(STATS_PERIOD_DAYS);

  const activities = await ActivityModel.getAll();
  const completionCounts = await CompletionModel.getCompletionCountsByActivity(
    thirtyDaysAgo,
    today
  );

  const activityStats = activities.map((activity) => ({
    ...activity,
    completions: completionCounts[activity.id] || 0,
  }));

  const sorted = [...activityStats].sort((a, b) => b.completions - a.completions);
  const mostCompleted = sorted.slice(0, TOP_ACTIVITIES_COUNT).filter((a) => a.completions > 0);
  const leastCompleted = sorted
    .filter((a) => a.completions > 0)
    .slice(-TOP_ACTIVITIES_COUNT)
    .reverse()
    .filter((a) => a.completions > 0);
  const neverCompleted = activityStats.filter((a) => a.completions === 0);

  const card = document.createElement('div');
  card.className = 'card dashboard-card';

  let content = `<h3 class="dashboard-card-title">${t('dashboard.activityStatsTitle', { days: formatNumber(STATS_PERIOD_DAYS) })}</h3>`;

  if (activities.length === 0) {
    content += `<p class="empty-message">${t('dashboard.activityStatsEmpty')}</p>`;
  } else {
    content += '<div class="activity-stats-sections">';
    content += createStatsSection(
      t('dashboard.stats.mostCompleted'),
      mostCompleted,
      'most-completed'
    );
    content += createStatsSection(
      t('dashboard.stats.leastCompleted'),
      leastCompleted,
      'least-completed'
    );

    if (neverCompleted.length > 0) {
      const displayed = neverCompleted
        .slice(0, TOP_ACTIVITIES_COUNT)
        .map((a) => ({ ...a, completions: 0 }));
      content += createStatsSection(
        t('dashboard.stats.notCompletedYet'),
        displayed,
        'never-completed',
        'stats-section-warning'
      );
      if (neverCompleted.length > TOP_ACTIVITIES_COUNT) {
        content += `<div class="stats-more">${t('dashboard.stats.more', { count: formatNumber(neverCompleted.length - TOP_ACTIVITIES_COUNT) })}</div>`;
      }
    }

    content += '</div>';
  }

  card.innerHTML = content;
  return card;
}

function createNextAchievementsSection(progress) {
  const nextAchievements = [];
  if (progress.score.nextAchievement) {
    nextAchievements.push({
      ...progress.score.nextAchievement,
      progress: `${formatNumber(progress.score.current)} / ${formatNumber(progress.score.next)}`,
    });
  }
  if (progress.streak.nextAchievement) {
    nextAchievements.push({
      ...progress.streak.nextAchievement,
      progress: `${formatNumber(progress.streak.current)} / ${formatNumber(progress.streak.next)}`,
    });
  }

  if (nextAchievements.length === 0) {
    return '';
  }

  return `
    <div class="next-achievements">
      <h4 class="stats-section-title">${t('dashboard.achievementsNext')}</h4>
      <ul class="next-achievement-list">
        ${nextAchievements
          .slice(0, 2)
          .map(
            (a) => `
          <li class="next-achievement-item">
            <span class="next-achievement-icon">${a.icon}</span>
            <div class="next-achievement-info">
              <span class="next-achievement-name">${escapeHtml(a.name)}</span>
              <span class="next-achievement-progress">${a.progress}</span>
            </div>
          </li>
        `
          )
          .join('')}
      </ul>
    </div>
  `;
}

async function createAchievementsCard() {
  const progress = await getAchievementProgress();
  const achievements = await getAllAchievementsWithStatus();
  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const recentUnlocked = unlockedAchievements
    .sort((a, b) => (b.unlockedAt || '').localeCompare(a.unlockedAt || ''))
    .slice(0, 4);

  const card = document.createElement('div');
  card.className = 'card dashboard-card';

  let content = `
    <h3 class="dashboard-card-title">${t('dashboard.achievementsTitle')}</h3>
    <div class="achievement-summary">
      <span class="achievement-count" data-testid="achievement-count">${formatNumber(progress.unlockedCount)} / ${formatNumber(progress.totalCount)}</span>
      <span class="achievement-label">${t('dashboard.achievementsUnlocked')}</span>
    </div>
  `;

  if (recentUnlocked.length > 0) {
    content += `
      <div class="recent-achievements">
        <h4 class="stats-section-title">${t('dashboard.achievementsRecent')}</h4>
        <div class="achievement-badges">
          ${recentUnlocked
            .map(
              (a) => `
            <div class="dashboard-achievement-badge" title="${escapeHtml(a.description)}">
              <span class="badge-icon">${a.icon}</span>
              <span class="badge-name">${escapeHtml(a.name)}</span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  content += createNextAchievementsSection(progress);

  card.innerHTML = content;
  return card;
}

export { renderDashboardView };
