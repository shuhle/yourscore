/**
 * Settings View
 */

import { SettingsModel } from '../models/settings.js';
import { ScoreModel } from '../models/score.js';
import { showToast } from '../components/toast.js';
import {
  downloadJSON,
  downloadCSV,
  importFromFile,
  resetAllData
} from '../services/export.js';

async function renderSettingsView(container) {
  container.innerHTML = '';

  const view = document.createElement('section');
  view.className = 'settings-view';

  const header = document.createElement('div');
  header.className = 'view-header';
  header.innerHTML = `
    <h2>Settings</h2>
    <p>Adjust decay, score, and appearance preferences.</p>
  `;

  const settingsCard = document.createElement('div');
  settingsCard.className = 'card settings-card';
  settingsCard.innerHTML = `
    <form class="settings-form" data-testid="settings-form" novalidate>
      <div class="settings-section">
        <h3>Score & Decay</h3>
        <div class="form-group">
          <label class="form-label" for="settings-decay">Daily decay amount</label>
          <input class="form-input" id="settings-decay" name="decayAmount" type="number" min="0" step="1" />
        </div>
        <div class="form-group">
          <label class="form-label" for="settings-score">Main score</label>
          <input class="form-input" id="settings-score" name="mainScore" type="number" step="1" />
        </div>
      </div>

      <div class="settings-section">
        <h3>Appearance</h3>
        <div class="form-group">
          <label class="form-label" for="settings-theme">Theme</label>
          <select class="form-input" id="settings-theme" name="theme">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="settings-scale">UI scale</label>
          <div class="range-field">
            <input class="form-input" id="settings-scale" name="uiScale" type="range" min="0.8" max="1.4" step="0.05" />
            <span class="range-value" data-testid="settings-scale-value"></span>
          </div>
        </div>
      </div>

      <div class="form-error" data-testid="settings-error" aria-live="polite"></div>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit" data-testid="settings-save">Save Settings</button>
      </div>
    </form>
  `;

  const dataCard = document.createElement('div');
  dataCard.className = 'card settings-card data-management-card';
  dataCard.innerHTML = `
    <div class="settings-section">
      <h3>Data Management</h3>

      <div class="data-section">
        <h4>Export</h4>
        <p class="data-description">Download your data for backup or transfer.</p>
        <div class="button-row">
          <button class="btn btn-secondary" type="button" data-testid="export-json">Export JSON</button>
          <button class="btn btn-secondary" type="button" data-testid="export-csv">Export CSV</button>
        </div>
      </div>

      <div class="data-section">
        <h4>Import</h4>
        <p class="data-description">Restore data from a JSON backup file.</p>
        <div class="import-controls">
          <label class="checkbox-label">
            <input type="checkbox" data-testid="import-merge" />
            <span>Merge with existing data</span>
          </label>
          <div class="file-input-wrapper">
            <input type="file" accept=".json" data-testid="import-file" class="file-input" />
            <button class="btn btn-secondary" type="button" data-testid="import-btn">Import JSON</button>
          </div>
        </div>
        <div class="import-status" data-testid="import-status" aria-live="polite"></div>
      </div>

      <div class="data-section data-section-danger">
        <h4>Reset Data</h4>
        <p class="data-description">Permanently delete all your data. This cannot be undone.</p>
        <button class="btn btn-danger" type="button" data-testid="reset-data">Reset All Data</button>
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

  const currentDecay = await SettingsModel.getDecayAmount();
  const currentScore = await ScoreModel.getScore();
  const currentTheme = await SettingsModel.getTheme();
  const currentScale = await SettingsModel.getUIScale();

  form.elements.decayAmount.value = String(currentDecay);
  form.elements.mainScore.value = String(currentScore);
  form.elements.theme.value = currentTheme || 'light';
  scaleInput.value = String(currentScale ?? 1);
  scaleValue.textContent = `${Number(scaleInput.value).toFixed(2)}x`;

  const applyScale = async () => {
    const scale = Number(scaleInput.value);
    scaleValue.textContent = `${scale.toFixed(2)}x`;
    await SettingsModel.setUIScale(scale);
    document.documentElement.style.setProperty('--ui-scale', String(scale));
  };

  const applyTheme = async () => {
    const theme = form.elements.theme.value;
    await SettingsModel.setTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
  };

  scaleInput.addEventListener('input', applyScale);
  scaleInput.addEventListener('change', applyScale);
  form.elements.theme.addEventListener('change', applyTheme);
  form.elements.theme.addEventListener('input', applyTheme);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    errorField.textContent = '';

    const decayAmount = Number.parseInt(form.elements.decayAmount.value, 10);
    const mainScore = Number.parseInt(form.elements.mainScore.value, 10);

    if (!Number.isFinite(decayAmount) || decayAmount < 0) {
      errorField.textContent = 'Decay amount must be 0 or more.';
      return;
    }

    if (!Number.isFinite(mainScore)) {
      errorField.textContent = 'Main score must be a number.';
      return;
    }

    try {
      await SettingsModel.setDecayAmount(decayAmount);
      await ScoreModel.setScore(mainScore);
      await ScoreModel.updateTodayHistory({ score: mainScore });
      showToast('Settings saved', 'success');
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
      showToast('JSON backup downloaded', 'success');
    } catch (error) {
      showToast(`Export failed: ${error.message}`, 'error');
    }
  });

  exportCSVBtn.addEventListener('click', async () => {
    try {
      await downloadCSV();
      showToast('CSV export downloaded', 'success');
    } catch (error) {
      showToast(`Export failed: ${error.message}`, 'error');
    }
  });

  importBtn.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    importStatus.textContent = 'Importing...';
    importStatus.className = 'import-status';

    const merge = importMergeCheckbox.checked;
    const result = await importFromFile(file, { merge });

    if (result.success) {
      const counts = Object.entries(result.imported)
        .filter(([_, count]) => count > 0)
        .map(([store, count]) => `${store}: ${count}`)
        .join(', ');

      importStatus.textContent = `Import successful! ${counts || 'No records imported'}`;
      importStatus.className = 'import-status import-success';
      showToast('Data imported successfully', 'success');

      // Reload the page to reflect imported data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      importStatus.textContent = result.errors.join('; ');
      importStatus.className = 'import-status import-error';
      showToast('Import failed', 'error');
    }

    // Reset file input
    importFileInput.value = '';
  });

  resetDataBtn.addEventListener('click', async () => {
    const confirmed = confirm(
      'Are you sure you want to delete ALL your data?\n\n' +
      'This includes all activities, completions, score history, and settings.\n\n' +
      'This action CANNOT be undone!'
    );

    if (!confirmed) {
      return;
    }

    // Double confirmation for safety
    const doubleConfirmed = confirm(
      'Please confirm again.\n\n' +
      'All your YourScore data will be permanently deleted.'
    );

    if (!doubleConfirmed) {
      return;
    }

    try {
      await resetAllData();
      showToast('All data has been reset', 'success');
      // Reload the page to start fresh
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      showToast(`Reset failed: ${error.message}`, 'error');
    }
  });

  view.dataset.ready = 'true';
}

export { renderSettingsView };
