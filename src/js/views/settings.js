/**
 * Settings View
 */

import { SettingsModel } from '../models/settings.js';
import { ScoreModel } from '../models/score.js';
import { showToast } from '../components/toast.js';
import { downloadJSON, downloadCSV, importFromFile, resetAllData } from '../services/export.js';
import { validateInteger } from '../utils/dom.js';
import { t, formatNumber, getSupportedLocales, getLocaleLabel } from '../i18n/i18n.js';

const UI_SCALE_MIN = 0.8;
const UI_SCALE_MAX = 1.4;
const UI_SCALE_STEP = 0.05;

async function renderSettingsView(container) {
  container.innerHTML = '';

  const view = document.createElement('section');
  view.className = 'settings-view';

  const header = document.createElement('div');
  header.className = 'view-header';
  header.innerHTML = `
    <h2>${t('settings.title')}</h2>
    <p>${t('settings.subtitle')}</p>
  `;

  const settingsCard = document.createElement('div');
  settingsCard.className = 'card settings-card';
  settingsCard.innerHTML = `
    <form class="settings-form" data-testid="settings-form" novalidate>
      <div class="settings-section">
        <h3>${t('settings.sections.scoreDecay')}</h3>
        <div class="form-group">
          <label class="form-label" for="settings-decay">${t('settings.fields.dailyDecay')}</label>
          <input class="form-input" id="settings-decay" name="decayAmount" type="number" min="0" step="1" />
        </div>
        <div class="form-group">
          <label class="form-label" for="settings-score">${t('settings.fields.mainScore')}</label>
          <input class="form-input" id="settings-score" name="mainScore" type="number" step="1" />
        </div>
      </div>

      <div class="settings-section">
        <h3>${t('settings.sections.appearance')}</h3>
        <div class="form-group">
          <label class="form-label" for="settings-theme">${t('settings.fields.theme')}</label>
          <select class="form-input" id="settings-theme" name="theme">
            <option value="light">${t('settings.fields.themeLight')}</option>
            <option value="dark">${t('settings.fields.themeDark')}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="settings-language">${t('settings.fields.language')}</label>
          <select class="form-input" id="settings-language" name="language">
            <option value="auto">${t('settings.fields.languageAuto')}</option>
            ${getSupportedLocales()
              .map((locale) => `<option value="${locale}">${getLocaleLabel(locale)}</option>`)
              .join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="settings-scale">${t('settings.fields.uiScale')}</label>
          <div class="range-field">
            <input class="form-input" id="settings-scale" name="uiScale" type="range" min="${UI_SCALE_MIN}" max="${UI_SCALE_MAX}" step="${UI_SCALE_STEP}" />
            <span class="range-value" data-testid="settings-scale-value"></span>
          </div>
        </div>
      </div>

      <div class="form-error" data-testid="settings-error" aria-live="polite"></div>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit" data-testid="settings-save">${t('settings.saveButton')}</button>
      </div>
    </form>
  `;

  const dataCard = document.createElement('div');
  dataCard.className = 'card settings-card data-management-card';
  dataCard.innerHTML = `
    <div class="settings-section">
      <h3>${t('settings.sections.data')}</h3>

      <div class="data-section">
        <h4>${t('settings.data.exportTitle')}</h4>
        <p class="data-description">${t('settings.data.exportDescription')}</p>
        <div class="button-row">
          <button class="btn btn-secondary" type="button" data-testid="export-json">${t('settings.data.exportJson')}</button>
          <button class="btn btn-secondary" type="button" data-testid="export-csv">${t('settings.data.exportCsv')}</button>
        </div>
      </div>

      <div class="data-section">
        <h4>${t('settings.data.importTitle')}</h4>
        <p class="data-description">${t('settings.data.importDescription')}</p>
        <div class="import-controls">
          <label class="checkbox-label">
            <input type="checkbox" data-testid="import-merge" />
            <span>${t('settings.data.importMerge')}</span>
          </label>
          <div class="file-input-wrapper">
            <input type="file" accept=".json" data-testid="import-file" class="file-input" />
            <button class="btn btn-secondary" type="button" data-testid="import-btn">${t('settings.data.importJson')}</button>
          </div>
        </div>
        <div class="import-status" data-testid="import-status" aria-live="polite"></div>
      </div>

      <div class="data-section data-section-danger">
        <h4>${t('settings.data.resetTitle')}</h4>
        <p class="data-description">${t('settings.data.resetDescription')}</p>
        <button class="btn btn-danger" type="button" data-testid="reset-data">${t('settings.data.resetButton')}</button>
      </div>
    </div>
  `;

  view.appendChild(header);
  view.appendChild(settingsCard);
  view.appendChild(dataCard);
  container.appendChild(view);

  const form = view.querySelector('.settings-form');
  const errorField = view.querySelector('[data-testid="settings-error"]');
  const scaleInput = view.querySelector('#settings-scale');
  const scaleValue = view.querySelector('[data-testid="settings-scale-value"]');
  const languageSelect = view.querySelector('#settings-language');

  const currentDecay = await SettingsModel.getDecayAmount();
  const currentScore = await ScoreModel.getScore();
  const currentTheme = await SettingsModel.getTheme();
  const currentScale = await SettingsModel.getUIScale();
  const currentLanguage = await SettingsModel.getLanguage();

  form.elements.decayAmount.value = String(currentDecay);
  form.elements.mainScore.value = String(currentScore);
  form.elements.theme.value = currentTheme || 'light';
  languageSelect.value = currentLanguage || 'auto';
  scaleInput.value = String(currentScale ?? 1);
  scaleValue.textContent = `${formatNumber(Number(scaleInput.value), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;

  const applyScale = async () => {
    const scale = Number(scaleInput.value);
    scaleValue.textContent = `${formatNumber(scale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
    document.documentElement.style.setProperty('--ui-scale', String(scale));
    await SettingsModel.setUIScale(scale);
  };

  const applyTheme = async () => {
    const theme = form.elements.theme.value;
    await SettingsModel.setTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
  };

  const applyLanguage = async () => {
    const language = form.elements.language.value;
    await SettingsModel.setLanguage(language);
    if (window.app) {
      await window.app.applyLanguage();
      window.app.renderNav();
      await window.app.renderCurrentView();
    }
  };

  scaleInput.addEventListener('input', applyScale);
  scaleInput.addEventListener('change', applyScale);
  form.elements.theme.addEventListener('change', applyTheme);
  form.elements.theme.addEventListener('input', applyTheme);
  form.elements.language.addEventListener('change', applyLanguage);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorField.textContent = '';

    const decayResult = validateInteger(form.elements.decayAmount.value, {
      min: 0,
      fieldName: 'Decay',
      errorMessage: t('settings.errors.decayNonNegative'),
    });
    if (!decayResult.valid) {
      errorField.textContent = decayResult.error;
      return;
    }

    const scoreResult = validateInteger(form.elements.mainScore.value, {
      fieldName: 'Score',
      errorMessage: t('settings.errors.mainScoreNumber'),
    });
    if (!scoreResult.valid) {
      errorField.textContent = scoreResult.error;
      return;
    }

    const decayAmount = decayResult.value;
    const mainScore = scoreResult.value;

    try {
      await SettingsModel.setDecayAmount(decayAmount);
      await ScoreModel.setScore(mainScore);
      await ScoreModel.updateTodayHistory({ score: mainScore });
      showToast(t('toasts.settingsSaved'), 'success');
    } catch (error) {
      errorField.textContent = error.message;
    }
  });

  // Data management event handlers
  const exportJSONBtn = view.querySelector('[data-testid="export-json"]');
  const exportCSVBtn = view.querySelector('[data-testid="export-csv"]');
  const importFileInput = view.querySelector('[data-testid="import-file"]');
  const importBtn = view.querySelector('[data-testid="import-btn"]');
  const importMergeCheckbox = view.querySelector('[data-testid="import-merge"]');
  const importStatus = view.querySelector('[data-testid="import-status"]');
  const resetDataBtn = view.querySelector('[data-testid="reset-data"]');

  exportJSONBtn.addEventListener('click', async () => {
    try {
      await downloadJSON();
      showToast(t('toasts.exportJsonDownloaded'), 'success');
    } catch (error) {
      showToast(t('toasts.exportFailed', { error: error.message }), 'error');
    }
  });

  exportCSVBtn.addEventListener('click', async () => {
    try {
      await downloadCSV();
      showToast(t('toasts.exportCsvDownloaded'), 'success');
    } catch (error) {
      showToast(t('toasts.exportFailed', { error: error.message }), 'error');
    }
  });

  importBtn.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    importStatus.textContent = t('settings.import.importing');
    importStatus.className = 'import-status';

    const merge = importMergeCheckbox.checked;
    const result = await importFromFile(file, { merge });

    if (result.success) {
      const storeLabels = t('import.storeLabels') || {};
      const counts = Object.entries(result.imported)
        .filter(([_, count]) => count > 0)
        .map(([store, count]) =>
          t('settings.import.countItem', {
            store: storeLabels[store] || store,
            count: formatNumber(count),
          })
        )
        .join(', ');

      importStatus.textContent = t('settings.import.success', {
        summary: counts || t('settings.import.noRecords'),
      });
      importStatus.className = 'import-status import-success';
      showToast(t('toasts.importSuccess'), 'success');

      // Reload the page to reflect imported data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      importStatus.textContent = result.errors.join('; ');
      importStatus.className = 'import-status import-error';
      showToast(t('toasts.importFailed'), 'error');
    }

    // Reset file input
    importFileInput.value = '';
  });

  resetDataBtn.addEventListener('click', async () => {
    const confirmed = confirm(t('settings.confirm.resetPrimary'));

    if (!confirmed) {
      return;
    }

    // Double confirmation for safety
    const doubleConfirmed = confirm(t('settings.confirm.resetSecondary'));

    if (!doubleConfirmed) {
      return;
    }

    try {
      await resetAllData();
      showToast(t('toasts.resetSuccess'), 'success');
      // Reload the page to start fresh
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      showToast(t('toasts.resetFailed', { error: error.message }), 'error');
    }
  });

  view.dataset.ready = 'true';
}

export { renderSettingsView };
