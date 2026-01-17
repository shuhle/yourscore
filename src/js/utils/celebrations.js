/**
 * Celebrations Utility
 * Provides visual celebration effects for achievements and milestones
 */

const CONFETTI_COLORS = [
  '#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#ff9ff3',
  '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43', '#10ac84'
];

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Create and show confetti effect
 * @param {number} [count=50] - Number of confetti pieces
 * @param {number} [duration=3000] - Duration in ms
 */
function showConfetti(count = 50, duration = 3000) {
  if (prefersReducedMotion()) {
    return;
  }
  const container = document.createElement('div');
  container.className = 'celebration-container';
  document.body.appendChild(container);

  for (let i = 0; i < count; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';

    // Random position and color
    const left = Math.random() * 100;
    const delay = Math.random() * 1000;
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const size = 8 + Math.random() * 8;
    const shape = Math.random() > 0.5 ? '50%' : '0';

    confetti.style.cssText = `
      left: ${left}%;
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: ${shape};
      animation-delay: ${delay}ms;
      animation-duration: ${2000 + Math.random() * 2000}ms;
    `;

    container.appendChild(confetti);
  }

  // Clean up after animation
  setTimeout(() => {
    container.remove();
  }, duration + 1000);
}

/**
 * Show score change animation
 * @param {HTMLElement} scoreElement - The score display element
 * @param {number} change - Points changed (positive or negative)
 */
function animateScoreChange(scoreElement, change) {
  if (!scoreElement || change === 0) {
    return;
  }
  if (prefersReducedMotion()) {
    return;
  }

  // Add pulse animation to score
  scoreElement.classList.add('score-value--animating');
  setTimeout(() => {
    scoreElement.classList.remove('score-value--animating');
  }, 400);

  // Create floating indicator
  const indicator = document.createElement('div');
  indicator.className = `score-change-indicator ${change > 0 ? 'score-change-indicator--positive' : 'score-change-indicator--negative'}`;
  indicator.textContent = change > 0 ? `+${change}` : `${change}`;

  // Position relative to score element
  const rect = scoreElement.getBoundingClientRect();
  indicator.style.cssText = `
    position: fixed;
    top: ${rect.bottom}px;
    left: ${rect.left + rect.width / 2}px;
    transform: translateX(-50%);
  `;

  document.body.appendChild(indicator);

  // Remove after animation
  setTimeout(() => {
    indicator.remove();
  }, 1000);
}

/**
 * Animate activity completion
 * @param {HTMLElement} cardElement - The activity card element
 */
function animateActivityCompletion(cardElement) {
  if (!cardElement) {
    return;
  }
  if (prefersReducedMotion()) {
    return;
  }

  cardElement.classList.add('activity-card--completing');
  setTimeout(() => {
    cardElement.classList.remove('activity-card--completing');
  }, 400);

  // Animate checkbox
  const checkbox = cardElement.querySelector('.activity-card-checkbox');
  if (checkbox) {
    checkbox.classList.add('activity-card-checkbox--checking');
    setTimeout(() => {
      checkbox.classList.remove('activity-card-checkbox--checking');
    }, 300);
  }
}

/**
 * Show milestone celebration overlay
 * @param {Object} options - Celebration options
 * @param {string} options.icon - Emoji icon
 * @param {string} options.title - Celebration title
 * @param {string} options.subtitle - Celebration subtitle
 * @param {boolean} [options.confetti=true] - Show confetti
 * @param {number} [options.autoDismiss=0] - Auto dismiss after ms (0 = manual)
 * @returns {Promise<void>} Resolves when dismissed
 */
function showMilestoneCelebration(options) {
  const {
    icon,
    title,
    subtitle,
    confetti = true,
    autoDismiss = 0
  } = options;

  return new Promise((resolve) => {
    const shouldConfetti = confetti && !prefersReducedMotion();
    const overlay = document.createElement('div');
    overlay.className = 'milestone-celebration';
    overlay.innerHTML = `
      <div class="milestone-celebration__content">
        <div class="milestone-celebration__icon">${icon}</div>
        <div class="milestone-celebration__title">${title}</div>
        <div class="milestone-celebration__subtitle">${subtitle}</div>
        <button class="btn btn-primary milestone-celebration__dismiss">Continue</button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Show confetti
    if (shouldConfetti) {
      showConfetti(80, 4000);
    }

    // Trigger animation
    requestAnimationFrame(() => {
      overlay.classList.add('milestone-celebration--visible');
    });

    const dismiss = () => {
      overlay.classList.remove('milestone-celebration--visible');
      setTimeout(() => {
        overlay.remove();
        resolve();
      }, 300);
    };

    // Click to dismiss
    overlay.querySelector('.milestone-celebration__dismiss').addEventListener('click', dismiss);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        dismiss();
      }
    });

    // Auto dismiss
    if (autoDismiss > 0) {
      setTimeout(dismiss, autoDismiss);
    }
  });
}

/**
 * Show quick celebration for score milestones
 * @param {number} score - Score milestone reached
 */
async function celebrateScoreMilestone(score) {
  await showMilestoneCelebration({
    icon: score >= 1000 ? '🏆' : score >= 500 ? '⭐' : '💯',
    title: `${score.toLocaleString()} Points!`,
    subtitle: 'Amazing achievement! Keep up the great work!',
    confetti: true
  });
}

/**
 * Show celebration for streak achievements
 * @param {number} days - Streak days
 */
async function celebrateStreak(days) {
  const icons = {
    3: '🔥',
    7: '🔥',
    14: '🔥',
    30: '🔥'
  };

  await showMilestoneCelebration({
    icon: icons[days] || '🔥',
    title: `${days} Day Streak!`,
    subtitle: `You've maintained your momentum for ${days} days straight!`,
    confetti: true
  });
}

/**
 * Show celebration for perfect week
 */
async function celebratePerfectWeek() {
  await showMilestoneCelebration({
    icon: '🌟',
    title: 'Perfect Week!',
    subtitle: 'You completed every activity for 7 days straight!',
    confetti: true
  });
}

/**
 * Show celebration for recovery
 */
async function celebrateRecovery() {
  await showMilestoneCelebration({
    icon: '🚀',
    title: 'Comeback Complete!',
    subtitle: 'You bounced back from negative to positive!',
    confetti: true
  });
}

export {
  showConfetti,
  animateScoreChange,
  animateActivityCompletion,
  prefersReducedMotion,
  showMilestoneCelebration,
  celebrateScoreMilestone,
  celebrateStreak,
  celebratePerfectWeek,
  celebrateRecovery
};
