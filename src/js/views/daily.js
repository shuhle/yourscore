/**
 * Daily View
 */

import { ActivityModel } from '../models/activity.js';
import { CategoryModel } from '../models/category.js';
import { CompletionModel } from '../models/completion.js';
import { ScoreModel } from '../models/score.js';
import { SettingsModel } from '../models/settings.js';
import { getLocalDateString, formatDate } from '../utils/date.js';
import { createEmptyState } from '../utils/dom.js';
import { createScoreDisplay } from '../components/score-display.js';
import { createActivityCard, formatTimestamp } from '../components/activity-card.js';
import { showToast } from '../components/toast.js';
import { checkForNewAchievements, getAchievementById } from '../services/achievements.js';
import { showAchievementNotification } from '../components/achievement-badge.js';
import { animateScoreChange, animateActivityCompletion } from '../utils/celebrations.js';
import { t, tPlural, formatNumber } from '../i18n/i18n.js';

async function renderDailyView(container, { decayInfo } = {}) {
  container.innerHTML = '';

  const view = document.createElement('section');
  view.className = 'daily-view';

  const header = document.createElement('div');
  header.className = 'daily-header';

  const dateLabel = document.createElement('div');
  dateLabel.className = 'daily-date';
  dateLabel.textContent = formatDate(getLocalDateString(), 'long');

  header.appendChild(dateLabel);

  view.appendChild(header);

  if (decayInfo?.applied) {
    const decayNotice = document.createElement('div');
    decayNotice.className = 'decay-notification';
    decayNotice.textContent = decayInfo.message;
    view.appendChild(decayNotice);
  }

  const score = await ScoreModel.getScore();
  const earnedToday = await ScoreModel.getEarnedToday();
  const decayAmount = await SettingsModel.getDecayAmount();
  const scoreDisplay = createScoreDisplay({ score, earnedToday, decayAmount });
  view.appendChild(scoreDisplay.wrapper);

  const breakEven = await ScoreModel.getBreakEvenStatus();
  const breakEvenIndicator = createBreakEvenIndicator(breakEven);
  view.appendChild(breakEvenIndicator.wrapper);

  const activitiesSection = document.createElement('div');
  activitiesSection.className = 'daily-activities';

  const activities = await ActivityModel.getAll();
  if (activities.length === 0) {
    activitiesSection.appendChild(
      createEmptyState({
        title: t('daily.emptyTitle'),
        message: t('daily.emptyMessage'),
      })
    );
  } else {
    const grouped = await ActivityModel.getGroupedByCategory();
    const categories = await CategoryModel.getAll();
    const uncategorized = await CategoryModel.getUncategorized();
    const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));
    categoryMap.set(uncategorized.id, uncategorized);

    for (const categoryId of Object.keys(grouped)) {
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, { id: categoryId, name: t('common.uncategorized') });
      }
    }

    const categoryOrder = [...categoryMap.values()];

    const today = getLocalDateString();
    const completions = await CompletionModel.getByDate(today);
    const completionMap = new Map(completions.map((c) => [c.activityId, c]));

    for (const category of categoryOrder) {
      const categoryActivities = grouped[category.id] || [];
      if (categoryActivities.length === 0) {
        continue;
      }

      const group = document.createElement('div');
      group.className = 'category-group';

      const title = document.createElement('div');
      title.className = 'category-header';
      title.textContent = category.name;

      group.appendChild(title);

      for (const activity of categoryActivities) {
        const completion = completionMap.get(activity.id);
        const cardParts = createActivityCard(activity, completion);

        cardParts.card.addEventListener('click', async () => {
          await toggleCompletion({
            activity,
            completionMap,
            cardParts,
            breakEvenIndicator,
            scoreDisplay,
          });
        });

        group.appendChild(cardParts.card);
      }

      activitiesSection.appendChild(group);
    }
  }

  view.appendChild(activitiesSection);
  container.appendChild(view);
}

function createBreakEvenIndicator(status) {
  const wrapper = document.createElement('div');
  wrapper.className = `break-even-indicator ${status.breakEven ? 'achieved' : 'needs-more'}`;
  const pointsLabel = tPlural(
    'units.pointsLong',
    status.breakEven ? status.surplus : status.remaining
  );

  const message = document.createElement('div');
  message.className = 'break-even-message';
  message.textContent = status.breakEven
    ? t('daily.breakEvenAchieved', {
        points: formatNumber(status.surplus),
        pointsLabel,
      })
    : t('daily.breakEvenRemaining', {
        points: formatNumber(status.remaining),
        pointsLabel,
      });

  const progress = document.createElement('div');
  progress.className = 'break-even-progress';
  progress.setAttribute('role', 'progressbar');
  progress.setAttribute('aria-valuemin', '0');
  progress.setAttribute('aria-valuemax', '100');
  progress.setAttribute('aria-valuenow', String(status.percent));
  progress.setAttribute('aria-label', t('daily.breakEvenProgressLabel'));
  progress.setAttribute(
    'aria-valuetext',
    status.breakEven
      ? t('daily.breakEvenAchievedAria')
      : t('daily.breakEvenRemainingAria', {
          points: formatNumber(status.remaining),
          pointsLabel,
        })
  );

  const fill = document.createElement('div');
  fill.className = 'break-even-progress-fill';
  fill.style.width = status.percent + '%';

  progress.appendChild(fill);
  wrapper.appendChild(message);
  wrapper.appendChild(progress);

  return { wrapper, message, fill, progress };
}

let _toggling = false;

async function toggleCompletion({
  activity,
  completionMap,
  cardParts,
  breakEvenIndicator,
  scoreDisplay,
}) {
  if (_toggling) {
    return;
  }
  _toggling = true;
  try {
    const today = getLocalDateString();
    const existing = completionMap.get(activity.id);
    const previousScore = await ScoreModel.getScore();

    // Animate the activity card
    animateActivityCompletion(cardParts.card);

    if (existing) {
      await CompletionModel.deleteByActivityAndDate(activity.id, today);
      completionMap.delete(activity.id);

      await ScoreModel.subtractPoints(activity.points);
      await ScoreModel.addEarnedToday(-activity.points);

      cardParts.card.classList.remove('completed');
      cardParts.checkbox.textContent = '';
      cardParts.timestamp.textContent = '';

      showToast(t('toasts.activityUndone', { name: activity.name }), 'warning');
    } else {
      const completion = await CompletionModel.create({ activityId: activity.id, date: today });
      completionMap.set(activity.id, completion);

      await ScoreModel.addPoints(activity.points);
      await ScoreModel.addEarnedToday(activity.points);

      cardParts.card.classList.add('completed');
      cardParts.checkbox.textContent = '✓';
      cardParts.timestamp.textContent = formatTimestamp(completion.completedAt);

      showToast(t('toasts.activityCompleted', { name: activity.name }), 'success');
    }

    const updatedScore = await ScoreModel.getScore();
    const updatedBreakEven = await ScoreModel.getBreakEvenStatus();
    const decayAmount = await SettingsModel.getDecayAmount();

    // Animate score change
    const scoreValueEl = scoreDisplay.wrapper.querySelector('.score-value');
    const pointChange = existing ? -activity.points : activity.points;
    animateScoreChange(scoreValueEl, pointChange);

    scoreValueEl.textContent = formatNumber(updatedScore);
    scoreValueEl.className = `score-value ${updatedScore > 0 ? 'score-positive' : updatedScore < 0 ? 'score-negative' : 'score-neutral'}`;
    scoreDisplay.wrapper.querySelector('.score-meta').innerHTML = `
      <span>${t('score.todayLabel')}: <strong>${formatNumber(updatedBreakEven.earned)}</strong></span>
      <span>${t('score.decayLabel')}: <strong>${formatNumber(decayAmount)}</strong></span>
    `;

    const pointsLabel = tPlural(
      'units.pointsLong',
      updatedBreakEven.breakEven ? updatedBreakEven.surplus : updatedBreakEven.remaining
    );
    breakEvenIndicator.message.textContent = updatedBreakEven.breakEven
      ? t('daily.breakEvenAchieved', {
          points: formatNumber(updatedBreakEven.surplus),
          pointsLabel,
        })
      : t('daily.breakEvenRemaining', {
          points: formatNumber(updatedBreakEven.remaining),
          pointsLabel,
        });
    breakEvenIndicator.fill.style.width = updatedBreakEven.percent + '%';
    breakEvenIndicator.progress.setAttribute('aria-valuenow', String(updatedBreakEven.percent));
    breakEvenIndicator.progress.setAttribute(
      'aria-valuetext',
      updatedBreakEven.breakEven
        ? t('daily.breakEvenAchievedAria')
        : t('daily.breakEvenRemainingAria', {
            points: formatNumber(updatedBreakEven.remaining),
            pointsLabel,
          })
    );
    breakEvenIndicator.wrapper.className = `break-even-indicator ${updatedBreakEven.breakEven ? 'achieved' : 'needs-more'}`;

    // Check for new achievements (only on completion, not undo)
    if (!existing) {
      const newAchievements = await checkForNewAchievements({ previousScore });

      // Show notifications for newly unlocked achievements
      for (const achievementId of newAchievements) {
        const achievement = getAchievementById(achievementId);
        if (achievement) {
          // Delay to let completion animation finish
          setTimeout(() => {
            showAchievementNotification(achievementId);
          }, 500);
        }
      }
    }
  } finally {
    _toggling = false;
  }
}

export { renderDailyView };
