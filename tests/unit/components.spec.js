import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_MODE__ = true;
  });
});

test.describe('Toast Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.app);
  });

  test('showToast creates toast element with correct content', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { showToast } = await import('/js/components/toast.js');
      showToast('Test message', 'success');

      const toast = document.querySelector('.toast');
      return {
        exists: !!toast,
        message: toast?.textContent,
        hasSuccessClass: toast?.classList.contains('success'),
        role: toast?.getAttribute('role'),
        ariaLive: toast?.getAttribute('aria-live')
      };
    });

    expect(result.exists).toBe(true);
    expect(result.message).toBe('Test message');
    expect(result.hasSuccessClass).toBe(true);
    expect(result.role).toBe('status');
    expect(result.ariaLive).toBe('polite');
  });

  test('showToast supports different types', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { showToast } = await import('/js/components/toast.js');

      showToast('Success', 'success');
      showToast('Warning', 'warning');
      showToast('Error', 'error');

      const toasts = document.querySelectorAll('.toast');
      return {
        count: toasts.length,
        types: Array.from(toasts).map(t => ({
          text: t.textContent,
          isSuccess: t.classList.contains('success'),
          isWarning: t.classList.contains('warning'),
          isError: t.classList.contains('error')
        }))
      };
    });

    expect(result.count).toBe(3);
    expect(result.types[0].isSuccess).toBe(true);
    expect(result.types[1].isWarning).toBe(true);
    expect(result.types[2].isError).toBe(true);
  });

  test('showToast auto-removes after duration', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { showToast } = await import('/js/components/toast.js');

      // Show toast with short duration
      showToast('Quick toast', 'success', 100);

      const initialCount = document.querySelectorAll('.toast').length;

      // Wait for removal
      await new Promise(resolve => setTimeout(resolve, 500));

      const finalCount = document.querySelectorAll('.toast').length;

      return { initialCount, finalCount };
    });

    expect(result.initialCount).toBe(1);
    expect(result.finalCount).toBe(0);
  });

  test('showToast handles missing container gracefully', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { showToast } = await import('/js/components/toast.js');

      // Remove the toast container
      const container = document.getElementById('toast-container');
      container?.remove();

      // This should not throw
      let errorOccurred = false;
      try {
        showToast('Test', 'success');
      } catch (e) {
        errorOccurred = true;
      }

      return { errorOccurred };
    });

    expect(result.errorOccurred).toBe(false);
  });

  test('multiple toasts can be shown simultaneously', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { showToast } = await import('/js/components/toast.js');

      showToast('First', 'success', 5000);
      showToast('Second', 'warning', 5000);
      showToast('Third', 'error', 5000);

      const toasts = document.querySelectorAll('.toast');
      return {
        count: toasts.length,
        messages: Array.from(toasts).map(t => t.textContent)
      };
    });

    expect(result.count).toBe(3);
    expect(result.messages).toContain('First');
    expect(result.messages).toContain('Second');
    expect(result.messages).toContain('Third');
  });
});

test.describe('Score Display Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.app);
  });

  test('createScoreDisplay renders positive score with correct styling', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { createScoreDisplay } = await import('/js/components/score-display.js');

      const display = createScoreDisplay({ score: 150, earnedToday: 25, decayAmount: 10 });
      document.body.appendChild(display.wrapper);

      const value = display.wrapper.querySelector('.score-value');
      return {
        hasWrapper: !!display.wrapper,
        scoreText: value?.textContent,
        isPositive: value?.classList.contains('score-positive'),
        hasScoreDisplay: display.wrapper.classList.contains('score-display')
      };
    });

    expect(result.hasWrapper).toBe(true);
    expect(result.scoreText).toBe('150');
    expect(result.isPositive).toBe(true);
    expect(result.hasScoreDisplay).toBe(true);
  });

  test('createScoreDisplay renders negative score with correct styling', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { createScoreDisplay } = await import('/js/components/score-display.js');

      const display = createScoreDisplay({ score: -50, earnedToday: 5, decayAmount: 10 });
      document.body.appendChild(display.wrapper);

      const value = display.wrapper.querySelector('.score-value');
      return {
        scoreText: value?.textContent,
        isNegative: value?.classList.contains('score-negative')
      };
    });

    expect(result.scoreText).toBe('-50');
    expect(result.isNegative).toBe(true);
  });

  test('createScoreDisplay renders zero score with neutral styling', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { createScoreDisplay } = await import('/js/components/score-display.js');

      const display = createScoreDisplay({ score: 0, earnedToday: 0, decayAmount: 10 });
      document.body.appendChild(display.wrapper);

      const value = display.wrapper.querySelector('.score-value');
      return {
        scoreText: value?.textContent,
        isNeutral: value?.classList.contains('score-neutral')
      };
    });

    expect(result.scoreText).toBe('0');
    expect(result.isNeutral).toBe(true);
  });

  test('createScoreDisplay shows meta information', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { createScoreDisplay } = await import('/js/components/score-display.js');

      const display = createScoreDisplay({ score: 100, earnedToday: 30, decayAmount: 15 });
      document.body.appendChild(display.wrapper);

      const meta = display.wrapper.querySelector('.score-meta');
      return {
        hasMeta: !!meta,
        metaContent: meta?.textContent
      };
    });

    expect(result.hasMeta).toBe(true);
    expect(result.metaContent).toContain('30');
    expect(result.metaContent).toContain('15');
  });
});

test.describe('Activity Card Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.app);
  });

  test('createActivityCard renders activity with points', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { createActivityCard } = await import('/js/components/activity-card.js');

      const activity = { id: '1', name: 'Test Activity', points: 15 };
      const card = createActivityCard(activity, null);
      document.body.appendChild(card.card);

      return {
        hasCard: !!card.card,
        hasCheckbox: !!card.checkbox,
        hasTimestamp: !!card.timestamp,
        isActivityCard: card.card.classList.contains('activity-card'),
        nameText: card.card.querySelector('.activity-card-name')?.textContent,
        pointsText: card.card.querySelector('.activity-card-points')?.textContent
      };
    });

    expect(result.hasCard).toBe(true);
    expect(result.hasCheckbox).toBe(true);
    expect(result.hasTimestamp).toBe(true);
    expect(result.isActivityCard).toBe(true);
    expect(result.nameText).toBe('Test Activity');
    expect(result.pointsText).toContain('15');
  });

  test('createActivityCard shows completed state', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { createActivityCard } = await import('/js/components/activity-card.js');

      const activity = { id: '1', name: 'Completed Activity', points: 10 };
      const completion = { completedAt: '2024-01-15T14:30:00.000Z' };
      const card = createActivityCard(activity, completion);
      document.body.appendChild(card.card);

      return {
        isCompleted: card.card.classList.contains('completed'),
        checkboxContent: card.checkbox.textContent,
        hasTimestamp: card.timestamp.textContent.length > 0
      };
    });

    expect(result.isCompleted).toBe(true);
    expect(result.checkboxContent).toBe('✓');
    expect(result.hasTimestamp).toBe(true);
  });

  test('createActivityCard shows uncompleted state', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { createActivityCard } = await import('/js/components/activity-card.js');

      const activity = { id: '1', name: 'Uncompleted Activity', points: 10 };
      const card = createActivityCard(activity, null);
      document.body.appendChild(card.card);

      return {
        isCompleted: card.card.classList.contains('completed'),
        checkboxContent: card.checkbox.textContent,
        timestampContent: card.timestamp.textContent
      };
    });

    expect(result.isCompleted).toBe(false);
    expect(result.checkboxContent).toBe('');
    expect(result.timestampContent).toBe('');
  });
});

test.describe('Achievement Badge Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.app);
  });

  test('createAchievementBadge renders unlocked badge', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { createAchievementBadge } = await import('/js/components/achievement-badge.js');

      const badge = createAchievementBadge({
        achievementId: 'score_100',
        unlocked: true,
        size: 'medium'
      });
      document.body.appendChild(badge);

      return {
        hasBadge: badge.classList.contains('achievement-badge'),
        isUnlocked: badge.classList.contains('achievement-badge--unlocked'),
        isMedium: badge.classList.contains('achievement-badge--medium'),
        hasIcon: !!badge.querySelector('.achievement-badge__icon'),
        hasName: !!badge.querySelector('.achievement-badge__name')
      };
    });

    expect(result.hasBadge).toBe(true);
    expect(result.isUnlocked).toBe(true);
    expect(result.isMedium).toBe(true);
    expect(result.hasIcon).toBe(true);
    expect(result.hasName).toBe(true);
  });

  test('createAchievementBadge renders locked badge', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { createAchievementBadge } = await import('/js/components/achievement-badge.js');

      const badge = createAchievementBadge({
        achievementId: 'score_100',
        unlocked: false
      });
      document.body.appendChild(badge);

      return {
        isLocked: badge.classList.contains('achievement-badge--locked'),
        isNotUnlocked: !badge.classList.contains('achievement-badge--unlocked')
      };
    });

    expect(result.isLocked).toBe(true);
    expect(result.isNotUnlocked).toBe(true);
  });

  test('createAchievementBadge supports different sizes', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { createAchievementBadge } = await import('/js/components/achievement-badge.js');

      const small = createAchievementBadge({ achievementId: 'score_100', size: 'small' });
      const medium = createAchievementBadge({ achievementId: 'score_100', size: 'medium' });
      const large = createAchievementBadge({ achievementId: 'score_100', size: 'large' });

      return {
        smallSize: small.classList.contains('achievement-badge--small'),
        mediumSize: medium.classList.contains('achievement-badge--medium'),
        largeSize: large.classList.contains('achievement-badge--large')
      };
    });

    expect(result.smallSize).toBe(true);
    expect(result.mediumSize).toBe(true);
    expect(result.largeSize).toBe(true);
  });

  test('createAchievementBadge shows description when requested', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { createAchievementBadge } = await import('/js/components/achievement-badge.js');

      const withDesc = createAchievementBadge({
        achievementId: 'score_100',
        showDescription: true
      });
      const withoutDesc = createAchievementBadge({
        achievementId: 'score_100',
        showDescription: false
      });

      return {
        hasDesc: !!withDesc.querySelector('.achievement-badge__desc'),
        noDesc: !withoutDesc.querySelector('.achievement-badge__desc')
      };
    });

    expect(result.hasDesc).toBe(true);
    expect(result.noDesc).toBe(true);
  });

  test('createAchievementBadge handles invalid achievement ID', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { createAchievementBadge } = await import('/js/components/achievement-badge.js');

      const badge = createAchievementBadge({
        achievementId: 'nonexistent_achievement'
      });

      return {
        isElement: badge instanceof HTMLElement,
        isEmpty: badge.innerHTML === ''
      };
    });

    expect(result.isElement).toBe(true);
    expect(result.isEmpty).toBe(true);
  });

  test('createAchievementCard renders full card', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { createAchievementCard } = await import('/js/components/achievement-badge.js');

      const achievement = {
        id: 'score_100',
        name: 'Century',
        description: 'Reach 100 points',
        icon: '💯',
        unlocked: true,
        unlockedAt: '2024-01-15T10:00:00.000Z'
      };

      const card = createAchievementCard(achievement);
      document.body.appendChild(card);

      return {
        isCard: card.classList.contains('achievement-card'),
        isUnlocked: card.classList.contains('achievement-card--unlocked'),
        hasIcon: !!card.querySelector('.achievement-card__icon'),
        hasName: !!card.querySelector('.achievement-card__name'),
        hasDesc: !!card.querySelector('.achievement-card__desc'),
        hasDate: !!card.querySelector('.achievement-card__date'),
        hasStatus: !!card.querySelector('.achievement-card__status')
      };
    });

    expect(result.isCard).toBe(true);
    expect(result.isUnlocked).toBe(true);
    expect(result.hasIcon).toBe(true);
    expect(result.hasName).toBe(true);
    expect(result.hasDesc).toBe(true);
    expect(result.hasDate).toBe(true);
    expect(result.hasStatus).toBe(true);
  });

  test('createAchievementCard renders locked card', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { createAchievementCard } = await import('/js/components/achievement-badge.js');

      const achievement = {
        id: 'score_1000',
        name: 'Grand Master',
        description: 'Reach 1000 points',
        icon: '🏆',
        unlocked: false
      };

      const card = createAchievementCard(achievement);
      document.body.appendChild(card);

      return {
        isLocked: card.classList.contains('achievement-card--locked'),
        noDate: !card.querySelector('.achievement-card__date'),
        hasSvgIcon: !!card.querySelector('.achievement-card__status svg')
      };
    });

    expect(result.isLocked).toBe(true);
    expect(result.noDate).toBe(true);
    expect(result.hasSvgIcon).toBe(true);
  });

  test('createAchievementNotification creates accessible notification', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { createAchievementNotification } = await import('/js/components/achievement-badge.js');

      const notification = createAchievementNotification('score_100');
      document.body.appendChild(notification);

      return {
        isNotification: notification.classList.contains('achievement-notification'),
        hasRole: notification.getAttribute('role') === 'status',
        hasAriaLive: notification.getAttribute('aria-live') === 'polite',
        hasAriaAtomic: notification.getAttribute('aria-atomic') === 'true',
        hasHeader: !!notification.querySelector('.achievement-notification__header'),
        hasIcon: !!notification.querySelector('.achievement-notification__icon'),
        hasName: !!notification.querySelector('.achievement-notification__name'),
        hasDesc: !!notification.querySelector('.achievement-notification__desc')
      };
    });

    expect(result.isNotification).toBe(true);
    expect(result.hasRole).toBe(true);
    expect(result.hasAriaLive).toBe(true);
    expect(result.hasAriaAtomic).toBe(true);
    expect(result.hasHeader).toBe(true);
    expect(result.hasIcon).toBe(true);
    expect(result.hasName).toBe(true);
    expect(result.hasDesc).toBe(true);
  });

  test('createProgressBar renders progress correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { createProgressBar } = await import('/js/components/achievement-badge.js');

      const progress50 = createProgressBar(50, 100, 'Progress Label');
      const progress0 = createProgressBar(0, 100);
      const progress100 = createProgressBar(100, 100);
      const progressOver = createProgressBar(150, 100);

      return {
        hasClass: progress50.classList.contains('achievement-progress'),
        hasLabel: !!progress50.querySelector('.achievement-progress__label'),
        hasBar: !!progress50.querySelector('.achievement-progress__bar'),
        hasFill: !!progress50.querySelector('.achievement-progress__fill'),
        hasText: progress50.querySelector('.achievement-progress__text')?.textContent === '50 / 100',
        fillWidth50: progress50.querySelector('.achievement-progress__fill')?.style.width,
        fillWidth0: progress0.querySelector('.achievement-progress__fill')?.style.width,
        fillWidth100: progress100.querySelector('.achievement-progress__fill')?.style.width,
        fillWidthOver: progressOver.querySelector('.achievement-progress__fill')?.style.width
      };
    });

    expect(result.hasClass).toBe(true);
    expect(result.hasLabel).toBe(true);
    expect(result.hasBar).toBe(true);
    expect(result.hasFill).toBe(true);
    expect(result.hasText).toBe(true);
    expect(result.fillWidth50).toBe('50%');
    expect(result.fillWidth0).toBe('0%');
    expect(result.fillWidth100).toBe('100%');
    expect(result.fillWidthOver).toBe('100%'); // Should cap at 100%
  });
});

test.describe('Celebrations Utility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.app);
  });

  test('prefersReducedMotion returns boolean', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { prefersReducedMotion } = await import('/js/utils/celebrations.js');
      return {
        isBoolean: typeof prefersReducedMotion() === 'boolean'
      };
    });

    expect(result.isBoolean).toBe(true);
  });

  test('showConfetti creates confetti container', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { showConfetti, prefersReducedMotion } = await import('/js/utils/celebrations.js');

      // If reduced motion is preferred, confetti won't show
      if (prefersReducedMotion()) {
        return { skipped: true };
      }

      // Get initial count
      const initialCount = document.querySelectorAll('.celebration-container').length;

      // Show confetti
      showConfetti(10, 100);

      // Check after short delay
      await new Promise(resolve => setTimeout(resolve, 50));
      const duringCount = document.querySelectorAll('.celebration-container').length;
      const confettiCount = document.querySelectorAll('.confetti').length;

      return {
        skipped: false,
        initialCount,
        duringCount,
        confettiCount
      };
    });

    if (result.skipped) {
      // Test passes if reduced motion is preferred
      expect(true).toBe(true);
    } else {
      expect(result.initialCount).toBe(0);
      expect(result.duringCount).toBeGreaterThan(0);
      expect(result.confettiCount).toBeGreaterThan(0);
    }
  });

  test('animateScoreChange adds animation class and indicator', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { animateScoreChange, prefersReducedMotion } = await import('/js/utils/celebrations.js');

      // If reduced motion is preferred, animation won't happen
      if (prefersReducedMotion()) {
        return { skipped: true };
      }

      const element = document.createElement('div');
      element.className = 'score-value';
      document.body.appendChild(element);

      animateScoreChange(element, 10);

      const hasAnimatingClass = element.classList.contains('score-value--animating');
      const hasPositiveIndicator = !!document.querySelector('.score-change-indicator--positive');

      // Test negative change
      const element2 = document.createElement('div');
      element2.className = 'score-value';
      document.body.appendChild(element2);

      animateScoreChange(element2, -5);

      const hasNegativeIndicator = !!document.querySelector('.score-change-indicator--negative');

      return {
        skipped: false,
        hasAnimatingClass,
        hasPositiveIndicator,
        hasNegativeIndicator
      };
    });

    if (result.skipped) {
      expect(true).toBe(true);
    } else {
      expect(result.hasAnimatingClass).toBe(true);
      expect(result.hasPositiveIndicator).toBe(true);
      expect(result.hasNegativeIndicator).toBe(true);
    }
  });

  test('animateActivityCompletion adds animation class', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { animateActivityCompletion, prefersReducedMotion } = await import('/js/utils/celebrations.js');

      // If reduced motion is preferred, animation won't happen
      if (prefersReducedMotion()) {
        return { skipped: true };
      }

      const element = document.createElement('div');
      element.className = 'activity-card';
      element.innerHTML = '<div class="activity-card-checkbox"></div>';
      document.body.appendChild(element);

      animateActivityCompletion(element);

      return {
        skipped: false,
        hasAnimationClass: element.classList.contains('activity-card--completing'),
        hasCheckboxAnimation: element.querySelector('.activity-card-checkbox')?.classList.contains('activity-card-checkbox--checking')
      };
    });

    if (result.skipped) {
      expect(true).toBe(true);
    } else {
      expect(result.hasAnimationClass).toBe(true);
      expect(result.hasCheckboxAnimation).toBe(true);
    }
  });
});
