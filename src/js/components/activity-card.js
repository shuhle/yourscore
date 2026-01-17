/**
 * Activity Card Component
 */

import { formatTimestamp } from '../utils/date.js';
import { t, formatNumber } from '../i18n/i18n.js';

function createActivityCard(activity, completion) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'activity-card';
  card.dataset.activityId = activity.id;

  if (completion) {
    card.classList.add('completed');
  }

  const checkbox = document.createElement('div');
  checkbox.className = 'activity-card-checkbox';
  checkbox.textContent = completion ? '✓' : '';

  const content = document.createElement('div');
  content.className = 'activity-card-content';

  const name = document.createElement('div');
  name.className = 'activity-card-name';
  name.textContent = activity.name;

  const points = document.createElement('div');
  points.className = 'activity-card-points';
  points.textContent = `+${formatNumber(activity.points)} ${t('units.pointsShort')}`;

  const timestamp = document.createElement('div');
  timestamp.className = 'activity-card-timestamp';
  timestamp.textContent = completion ? formatTimestamp(completion.completedAt) : '';

  content.appendChild(name);
  content.appendChild(points);
  content.appendChild(timestamp);

  card.appendChild(checkbox);
  card.appendChild(content);

  return { card, checkbox, timestamp };
}

// Re-export formatTimestamp from date.js for backwards compatibility
export { createActivityCard, formatTimestamp };
