import { test, expect } from '@playwright/test';

test.describe('Achievements Service', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();
      await db.reset();
    });
    await page.reload();
    await page.waitForFunction(() => window.app);
  });

  test.describe('Score Milestone Achievements', () => {
    test('unlocks century achievement at 100 points', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { ScoreModel } = await import('/js/models/score.js');
        const { checkForNewAchievements, isUnlocked } = await import('/js/services/achievements.js');

        await ScoreModel.setScore(99);
        let newAchievements = await checkForNewAchievements();
        const notUnlockedAt99 = !newAchievements.includes('score_100');

        await ScoreModel.setScore(100);
        newAchievements = await checkForNewAchievements();
        const unlockedAt100 = newAchievements.includes('score_100');
        const isNowUnlocked = await isUnlocked('score_100');

        return { notUnlockedAt99, unlockedAt100, isNowUnlocked };
      });

      expect(result.notUnlockedAt99).toBe(true);
      expect(result.unlockedAt100).toBe(true);
      expect(result.isNowUnlocked).toBe(true);
    });

    test('unlocks high achiever at 500 points', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { ScoreModel } = await import('/js/models/score.js');
        const { checkForNewAchievements, isUnlocked } = await import('/js/services/achievements.js');

        await ScoreModel.setScore(500);
        await checkForNewAchievements();

        return await isUnlocked('score_500');
      });

      expect(result).toBe(true);
    });

    test('unlocks thousand club at 1000 points', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { ScoreModel } = await import('/js/models/score.js');
        const { checkForNewAchievements, isUnlocked } = await import('/js/services/achievements.js');

        await ScoreModel.setScore(1000);
        await checkForNewAchievements();

        return await isUnlocked('score_1000');
      });

      expect(result).toBe(true);
    });

    test('does not unlock same achievement twice', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { ScoreModel } = await import('/js/models/score.js');
        const { checkForNewAchievements, getUnlockedAchievements } = await import('/js/services/achievements.js');

        await ScoreModel.setScore(100);
        await checkForNewAchievements();
        const firstCheck = await checkForNewAchievements();

        // Second check should not return the same achievement
        return { firstCheck, count: (await getUnlockedAchievements()).length };
      });

      expect(result.firstCheck.includes('score_100')).toBe(false);
    });
  });

  test.describe('Streak Achievements', () => {
    test('calculates successful day streak correctly', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { ScoreModel } = await import('/js/models/score.js');
        const { getSuccessfulDayStreak } = await import('/js/services/achievements.js');
        const { getLocalDateString } = await import('/js/utils/date.js');

        const today = getLocalDateString();
        const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
        const twoDaysAgo = getLocalDateString(new Date(Date.now() - 86400000 * 2));

        // Record 3 successful days
        await ScoreModel.recordHistory({ date: twoDaysAgo, score: 10, earned: 10, decay: 5 });
        await ScoreModel.recordHistory({ date: yesterday, score: 20, earned: 10, decay: 5 });
        await ScoreModel.recordHistory({ date: today, score: 30, earned: 10, decay: 5 });

        return await getSuccessfulDayStreak();
      });

      expect(result).toBe(3);
    });

    test('breaks streak on unsuccessful day', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { ScoreModel } = await import('/js/models/score.js');
        const { getSuccessfulDayStreak } = await import('/js/services/achievements.js');
        const { getLocalDateString } = await import('/js/utils/date.js');

        const today = getLocalDateString();
        const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
        const twoDaysAgo = getLocalDateString(new Date(Date.now() - 86400000 * 2));

        // Yesterday was unsuccessful (earned < decay)
        await ScoreModel.recordHistory({ date: twoDaysAgo, score: 10, earned: 10, decay: 5 });
        await ScoreModel.recordHistory({ date: yesterday, score: 5, earned: 2, decay: 10 }); // Failed
        await ScoreModel.recordHistory({ date: today, score: 15, earned: 10, decay: 5 });

        return await getSuccessfulDayStreak();
      });

      expect(result).toBe(1); // Only today counts
    });

    test('unlocks streak achievements', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { ScoreModel } = await import('/js/models/score.js');
        const { checkForNewAchievements, isUnlocked } = await import('/js/services/achievements.js');
        const { getLocalDateString } = await import('/js/utils/date.js');

        // Create 7 days of successful history
        for (let i = 6; i >= 0; i--) {
          const date = getLocalDateString(new Date(Date.now() - 86400000 * i));
          await ScoreModel.recordHistory({ date, score: i * 10, earned: 10, decay: 5 });
        }

        await checkForNewAchievements();

        return {
          streak3: await isUnlocked('streak_3'),
          streak7: await isUnlocked('streak_7')
        };
      });

      expect(result.streak3).toBe(true);
      expect(result.streak7).toBe(true);
    });
  });

  test.describe('Perfect Week Achievement', () => {
    test('calculates perfect day streak', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { ActivityModel } = await import('/js/models/activity.js');
        const { CategoryModel } = await import('/js/models/category.js');
        const { CompletionModel } = await import('/js/models/completion.js');
        const { getPerfectDayStreak } = await import('/js/services/achievements.js');
        const { getLocalDateString } = await import('/js/utils/date.js');

        // Create a category and activity
        const cat = await CategoryModel.create({ name: 'Test' });
        const activity = await ActivityModel.create({
          name: 'Test Activity',
          points: 10,
          categoryId: cat.id
        });

        // Complete for 3 days
        const today = getLocalDateString();
        const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
        const twoDaysAgo = getLocalDateString(new Date(Date.now() - 86400000 * 2));

        await CompletionModel.create({ activityId: activity.id, date: twoDaysAgo });
        await CompletionModel.create({ activityId: activity.id, date: yesterday });
        await CompletionModel.create({ activityId: activity.id, date: today });

        return await getPerfectDayStreak();
      });

      expect(result).toBe(3);
    });

    test('returns 0 for perfect streak when no activities exist', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { getPerfectDayStreak } = await import('/js/services/achievements.js');
        return await getPerfectDayStreak();
      });

      expect(result).toBe(0);
    });
  });

  test.describe('Recovery Achievement', () => {
    test('unlocks recovery when going from negative to positive', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { ScoreModel } = await import('/js/models/score.js');
        const { checkForNewAchievements, isUnlocked, checkRecoveryCondition } = await import('/js/services/achievements.js');

        // Start with negative score
        await ScoreModel.setScore(-50);
        const previousScore = -50;

        // Move to positive
        await ScoreModel.setScore(10);

        // Check condition
        const conditionMet = checkRecoveryCondition(previousScore, 10);

        // Check for achievements with context
        await checkForNewAchievements({ previousScore });

        return {
          conditionMet,
          unlocked: await isUnlocked('recovery')
        };
      });

      expect(result.conditionMet).toBe(true);
      expect(result.unlocked).toBe(true);
    });

    test('does not unlock recovery when staying positive', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { ScoreModel } = await import('/js/models/score.js');
        const { checkForNewAchievements, isUnlocked } = await import('/js/services/achievements.js');

        await ScoreModel.setScore(50);
        const previousScore = 50;

        await ScoreModel.setScore(100);
        await checkForNewAchievements({ previousScore });

        return await isUnlocked('recovery');
      });

      expect(result).toBe(false);
    });
  });

  test.describe('First Completion Achievement', () => {
    test('unlocks on first activity completion', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { ActivityModel } = await import('/js/models/activity.js');
        const { CategoryModel } = await import('/js/models/category.js');
        const { CompletionModel } = await import('/js/models/completion.js');
        const { checkForNewAchievements, isUnlocked } = await import('/js/services/achievements.js');

        // Create activity
        const cat = await CategoryModel.create({ name: 'Test' });
        const activity = await ActivityModel.create({
          name: 'Test',
          points: 10,
          categoryId: cat.id
        });

        // Complete it
        await CompletionModel.create({ activityId: activity.id });

        // Check achievements
        const newAchievements = await checkForNewAchievements();

        return {
          newAchievements,
          unlocked: await isUnlocked('first_completion')
        };
      });

      expect(result.newAchievements).toContain('first_completion');
      expect(result.unlocked).toBe(true);
    });
  });

  test.describe('Activity Count Achievements', () => {
    test('unlocks at 50 completions', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { ActivityModel } = await import('/js/models/activity.js');
        const { CategoryModel } = await import('/js/models/category.js');
        const { CompletionModel } = await import('/js/models/completion.js');
        const { checkForNewAchievements, isUnlocked } = await import('/js/services/achievements.js');
        const { getLocalDateString } = await import('/js/utils/date.js');

        // Create activity
        const cat = await CategoryModel.create({ name: 'Test' });
        const activity = await ActivityModel.create({
          name: 'Test',
          points: 10,
          categoryId: cat.id
        });

        // Create 50 completions on different dates
        for (let i = 0; i < 50; i++) {
          const date = getLocalDateString(new Date(Date.now() - 86400000 * i));
          await CompletionModel.create({ activityId: activity.id, date });
        }

        await checkForNewAchievements();

        return {
          activities50: await isUnlocked('activities_50'),
          firstCompletion: await isUnlocked('first_completion')
        };
      });

      expect(result.activities50).toBe(true);
      expect(result.firstCompletion).toBe(true);
    });
  });

  test.describe('Achievement Progress', () => {
    test('returns correct progress data', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { ScoreModel } = await import('/js/models/score.js');
        const { getAchievementProgress } = await import('/js/services/achievements.js');

        await ScoreModel.setScore(75);

        return await getAchievementProgress();
      });

      expect(result.score.current).toBe(75);
      expect(result.score.next).toBe(100);
      expect(result.totalCount).toBeGreaterThan(0);
    });
  });

  test.describe('Achievement Status', () => {
    test('getAllAchievementsWithStatus returns all achievements', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { getAllAchievementsWithStatus } = await import('/js/services/achievements.js');
        return await getAllAchievementsWithStatus();
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('unlocked');
    });
  });
});
