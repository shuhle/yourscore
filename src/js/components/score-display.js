/**
 * Score Display Component
 */

import { t, formatNumber } from '../i18n/i18n.js';

function getScoreClass(score) {
  if (score > 0) {
    return 'score-positive';
  }
  if (score < 0) {
    return 'score-negative';
  }
  return 'score-neutral';
}

function createScoreDisplay({ score, earnedToday, decayAmount }) {
  const wrapper = document.createElement('section');
  wrapper.className = 'card score-display';

  const scoreValue = document.createElement('div');
  scoreValue.className = `score-value ${getScoreClass(score)}`;
  scoreValue.textContent = formatNumber(score);

  const label = document.createElement('div');
  label.className = 'score-label';
  label.textContent = t('score.mainLabel');

  const meta = document.createElement('div');
  meta.className = 'score-meta';
  meta.innerHTML = `
    <span>${t('score.todayLabel')}: <strong>${formatNumber(earnedToday)}</strong></span>
    <span>${t('score.decayLabel')}: <strong>${formatNumber(decayAmount)}</strong></span>
  `;

  wrapper.appendChild(label);
  wrapper.appendChild(scoreValue);
  wrapper.appendChild(meta);

  return { wrapper, scoreValue, meta };
}

export { createScoreDisplay };
