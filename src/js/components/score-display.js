/**
 * Score Display Component
 */

function getScoreClass(score) {
  if (score > 0) {return 'score-positive';}
  if (score < 0) {return 'score-negative';}
  return 'score-neutral';
}

function createScoreDisplay({ score, earnedToday, decayAmount }) {
  const wrapper = document.createElement('section');
  wrapper.className = 'card score-display';

  const scoreValue = document.createElement('div');
  scoreValue.className = `score-value ${getScoreClass(score)}`;
  scoreValue.textContent = score;

  const label = document.createElement('div');
  label.className = 'score-label';
  label.textContent = 'Main Score';

  const meta = document.createElement('div');
  meta.className = 'score-meta';
  meta.innerHTML = `
    <span>Today: <strong>${earnedToday}</strong></span>
    <span>Decay: <strong>${decayAmount}</strong></span>
  `;

  wrapper.appendChild(label);
  wrapper.appendChild(scoreValue);
  wrapper.appendChild(meta);

  return { wrapper, scoreValue, meta };
}

export { createScoreDisplay };
