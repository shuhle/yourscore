import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_MODE__ = true;
  });
});

test.describe('Decay Service', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();
      await db.reset();
    });
  });

  test('should calculate decay correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { DecayService } = await import('/js/services/decay.js');

      return {
        zeroDays: DecayService.calculateDecay(0, 10),
        oneDay: DecayService.calculateDecay(1, 10),
        threeDays: DecayService.calculateDecay(3, 10),
        fiveDays: DecayService.calculateDecay(5, 15),
        zeroDecay: DecayService.calculateDecay(5, 0)
      };
    });

    expect(result.zeroDays).toBe(0);
    expect(result.oneDay).toBe(10);
    expect(result.threeDays).toBe(30);
    expect(result.fiveDays).toBe(75);
    expect(result.zeroDecay).toBe(0);
  });

  test('should not apply decay on first day for new users', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { DecayService } = await import('/js/services/decay.js');
      const { ScoreModel } = await import('/js/models/score.js');
      await db.init();

      const decayResult = await DecayService.checkAndApplyDecay();
      const score = await ScoreModel.getScore();

      return { decayResult, score };
    });

    expect(result.decayResult.applied).toBe(false);
    expect(result.decayResult.isFirstDay).toBe(true);
    expect(result.decayResult.decay).toBe(0);
    expect(result.score).toBe(0);
  });

  test('should not apply decay when already active today', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { DecayService } = await import('/js/services/decay.js');
      const { SettingsModel } = await import('/js/models/settings.js');
      const { getLocalDateString } = await import('/js/utils/date.js');
      await db.init();

      const today = getLocalDateString();

      // Simulate existing user who was active today
      await SettingsModel.setMany({
        firstUseDate: '2024-01-01',
        lastActiveDate: today,
        decayAmount: 10
      });

      const decayResult = await DecayService.checkAndApplyDecay();

      return decayResult;
    });

    expect(result.applied).toBe(false);
    expect(result.decay).toBe(0);
    expect(result.message).toContain('Already active today');
  });

  test('should apply decay for one day away', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { DecayService } = await import('/js/services/decay.js');
      const { ScoreModel } = await import('/js/models/score.js');
      const { SettingsModel } = await import('/js/models/settings.js');
      const { getLocalDateString, getDateDaysAgo } = await import('/js/utils/date.js');
      await db.init();

      const today = getLocalDateString();
      const yesterday = getDateDaysAgo(1);

      // Set up: user started a while ago, was last active yesterday
      await SettingsModel.setMany({
        firstUseDate: '2024-01-01',
        lastActiveDate: yesterday,
        decayAmount: 10
      });
      await ScoreModel.setScore(100);

      const decayResult = await DecayService.checkAndApplyDecay();
      const newScore = await ScoreModel.getScore();

      return { decayResult, newScore };
    });

    expect(result.decayResult.applied).toBe(true);
    expect(result.decayResult.decay).toBe(10);
    expect(result.decayResult.daysAway).toBe(1);
    expect(result.newScore).toBe(90);
  });

  test('should apply accumulated decay for multiple days away', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { DecayService } = await import('/js/services/decay.js');
      const { ScoreModel } = await import('/js/models/score.js');
      const { SettingsModel } = await import('/js/models/settings.js');
      const { getDateDaysAgo } = await import('/js/utils/date.js');
      await db.init();

      const fiveDaysAgo = getDateDaysAgo(5);

      await SettingsModel.setMany({
        firstUseDate: '2024-01-01',
        lastActiveDate: fiveDaysAgo,
        decayAmount: 10
      });
      await ScoreModel.setScore(100);

      const decayResult = await DecayService.checkAndApplyDecay();
      const newScore = await ScoreModel.getScore();

      return { decayResult, newScore };
    });

    expect(result.decayResult.applied).toBe(true);
    expect(result.decayResult.decay).toBe(50); // 5 days * 10
    expect(result.decayResult.daysAway).toBe(5);
    expect(result.newScore).toBe(50);
  });

  test('should allow score to go negative', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { DecayService } = await import('/js/services/decay.js');
      const { ScoreModel } = await import('/js/models/score.js');
      const { SettingsModel } = await import('/js/models/settings.js');
      const { getDateDaysAgo } = await import('/js/utils/date.js');
      await db.init();

      const threeDaysAgo = getDateDaysAgo(3);

      await SettingsModel.setMany({
        firstUseDate: '2024-01-01',
        lastActiveDate: threeDaysAgo,
        decayAmount: 20
      });
      await ScoreModel.setScore(10); // Only 10 points, but 60 decay coming

      const decayResult = await DecayService.checkAndApplyDecay();
      const newScore = await ScoreModel.getScore();

      return { decayResult, newScore };
    });

    expect(result.decayResult.decay).toBe(60);
    expect(result.newScore).toBe(-50);
  });

  test('should preview decay without applying', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { DecayService } = await import('/js/services/decay.js');
      const { ScoreModel } = await import('/js/models/score.js');
      const { SettingsModel } = await import('/js/models/settings.js');
      const { getDateDaysAgo } = await import('/js/utils/date.js');
      await db.init();

      const twoDaysAgo = getDateDaysAgo(2);

      await SettingsModel.setMany({
        firstUseDate: '2024-01-01',
        lastActiveDate: twoDaysAgo,
        decayAmount: 15
      });
      await ScoreModel.setScore(100);

      const preview = await DecayService.previewDecay();
      const scoreAfterPreview = await ScoreModel.getScore();

      return { preview, scoreAfterPreview };
    });

    expect(result.preview.wouldApply).toBe(true);
    expect(result.preview.decay).toBe(30);
    expect(result.preview.daysAway).toBe(2);
    expect(result.scoreAfterPreview).toBe(100); // Score unchanged
  });

  test('should simulate decay correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { DecayService } = await import('/js/services/decay.js');

      return DecayService.simulateDecay(100, 10, 5);
    });

    expect(result.startingScore).toBe(100);
    expect(result.decayPerDay).toBe(10);
    expect(result.days).toBe(5);
    expect(result.totalDecay).toBe(50);
    expect(result.finalScore).toBe(50);
  });

  test('should update last active date after applying decay', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { DecayService } = await import('/js/services/decay.js');
      const { SettingsModel } = await import('/js/models/settings.js');
      const { getLocalDateString, getDateDaysAgo } = await import('/js/utils/date.js');
      await db.init();

      const today = getLocalDateString();
      const yesterday = getDateDaysAgo(1);

      await SettingsModel.setMany({
        firstUseDate: '2024-01-01',
        lastActiveDate: yesterday,
        decayAmount: 10
      });

      await DecayService.checkAndApplyDecay();

      const lastActiveDate = await SettingsModel.getLastActiveDate();

      return { today, lastActiveDate };
    });

    expect(result.lastActiveDate).toBe(result.today);
  });

  test('should record decay in today history', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { DecayService } = await import('/js/services/decay.js');
      const { ScoreModel } = await import('/js/models/score.js');
      const { SettingsModel } = await import('/js/models/settings.js');
      const { getDateDaysAgo } = await import('/js/utils/date.js');
      await db.init();

      const twoDaysAgo = getDateDaysAgo(2);

      await SettingsModel.setMany({
        firstUseDate: '2024-01-01',
        lastActiveDate: twoDaysAgo,
        decayAmount: 15
      });
      await ScoreModel.setScore(100);

      await DecayService.checkAndApplyDecay();

      const todayHistory = await ScoreModel.getTodayHistory();

      return todayHistory;
    });

    expect(result.decay).toBe(30);
    expect(result.score).toBe(70);
  });

  test('should get and set decay amount', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { DecayService } = await import('/js/services/decay.js');
      await db.init();

      const defaultAmount = await DecayService.getDecayAmount();

      await DecayService.setDecayAmount(25);
      const newAmount = await DecayService.getDecayAmount();

      return { defaultAmount, newAmount };
    });

    expect(result.defaultAmount).toBe(10);
    expect(result.newAmount).toBe(25);
  });

  test('should prevent negative decay amount', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { DecayService } = await import('/js/services/decay.js');
      await db.init();

      try {
        await DecayService.setDecayAmount(-5);
        return { error: null };
      } catch (e) {
        return { error: e.message };
      }
    });

    expect(result.error).toContain('cannot be negative');
  });
});
