/**
 * YourScore - Main Application Entry Point
 */

import { db } from './storage/db.js';
import { CategoryModel } from './models/category.js';
import { DecayService } from './services/decay.js';
import { SettingsModel } from './models/settings.js';
import { renderDailyView } from './views/daily.js';
import { renderActivitiesView } from './views/activities.js';
import { renderCategoriesView } from './views/categories.js';
import { renderSettingsView } from './views/settings.js';
import { renderDashboardView } from './views/dashboard.js';

// Register service worker for PWA functionality
if (!window.__TEST_MODE__ && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('ServiceWorker registered:', registration.scope);
    } catch (error) {
      console.log('ServiceWorker registration failed:', error);
    }
  });
}

// Application initialization
class App {
  constructor() {
    this.currentView = 'daily';
    this.decayInfo = null;
    this.renderQueue = Promise.resolve();
    this.shouldFocusMain = false;
    this.ready = this.init();
  }

  async init() {
    console.log('YourScore initializing...');

    await db.init();
    await CategoryModel.getUncategorized();

    this.decayInfo = await DecayService.checkAndApplyDecay();

    await this.applyTheme();
    await this.applyUIScale();
    this.initInstallPrompt();

    // Render initial view
    this.renderNav();
    await this.renderCurrentView();

    console.log('YourScore initialized');
  }

  initInstallPrompt() {
    const banner = document.getElementById('install-banner');
    if (!banner) {return;}

    const installButton = banner.querySelector('[data-action="install"]');
    const dismissButton = banner.querySelector('[data-action="dismiss"]');
    let deferredPrompt = null;

    const isAutomated = window.__TEST_MODE__ || navigator.webdriver;
    if (isAutomated) {
      banner.setAttribute('hidden', '');
      return;
    }

    const hideBanner = () => {
      banner.classList.remove('visible');
      banner.setAttribute('hidden', '');
    };

    const showBanner = () => {
      banner.removeAttribute('hidden');
      requestAnimationFrame(() => banner.classList.add('visible'));
    };

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone;

    if (isStandalone) {
      hideBanner();
      return;
    }

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredPrompt = event;
      showBanner();
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      hideBanner();
    });

    installButton?.addEventListener('click', async () => {
      if (!deferredPrompt) {return;}
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome === 'accepted') {
        hideBanner();
      }
    });

    dismissButton?.addEventListener('click', () => {
      hideBanner();
    });
  }

  async applyTheme() {
    const savedTheme = await SettingsModel.getTheme();
    document.documentElement.setAttribute('data-theme', savedTheme || 'light');
  }

  async applyUIScale() {
    const savedScale = await SettingsModel.getUIScale();
    document.documentElement.style.setProperty('--ui-scale', String(savedScale ?? 1));
  }

  renderNav() {
    const nav = document.getElementById('app-nav');
    if (!nav) {return;}

    nav.innerHTML = `
      <a href="#" class="nav-item ${this.currentView === 'daily' ? 'active' : ''}" data-view="daily" ${this.currentView === 'daily' ? 'aria-current="page"' : ''}>
        <span class="nav-icon">📋</span>
        <span>Today</span>
      </a>
      <a href="#" class="nav-item ${this.currentView === 'activities' ? 'active' : ''}" data-view="activities" ${this.currentView === 'activities' ? 'aria-current="page"' : ''}>
        <span class="nav-icon">⚡</span>
        <span>Activities</span>
      </a>
      <a href="#" class="nav-item ${this.currentView === 'categories' ? 'active' : ''}" data-view="categories" ${this.currentView === 'categories' ? 'aria-current="page"' : ''}>
        <span class="nav-icon">🧩</span>
        <span>Categories</span>
      </a>
      <a href="#" class="nav-item ${this.currentView === 'dashboard' ? 'active' : ''}" data-view="dashboard" ${this.currentView === 'dashboard' ? 'aria-current="page"' : ''}>
        <span class="nav-icon">📊</span>
        <span>Stats</span>
      </a>
      <a href="#" class="nav-item ${this.currentView === 'settings' ? 'active' : ''}" data-view="settings" ${this.currentView === 'settings' ? 'aria-current="page"' : ''}>
        <span class="nav-icon">⚙️</span>
        <span>Settings</span>
      </a>
    `;

    // Add navigation event listeners
    nav.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        await this.navigateTo(view);
      });
    });
  }

  async navigateTo(view) {
    this.currentView = view;
    this.shouldFocusMain = true;
    this.renderNav();
    await this.renderCurrentView();
  }

  async renderCurrentView() {
    this.renderQueue = this.renderQueue.then(async () => {
      const main = document.getElementById('app-main');
      if (!main) {return;}

      if (this.currentView === 'daily') {
        await renderDailyView(main, { decayInfo: this.decayInfo });
      } else if (this.currentView === 'activities') {
        await renderActivitiesView(main);
      } else if (this.currentView === 'categories') {
        await renderCategoriesView(main);
      } else if (this.currentView === 'settings') {
        await renderSettingsView(main);
      } else if (this.currentView === 'dashboard') {
        await renderDashboardView(main);
      } else {
        main.innerHTML = `
          <section class="placeholder-view">
            <h2>${this.currentView[0].toUpperCase() + this.currentView.slice(1)}</h2>
            <p>Coming soon.</p>
          </section>
        `;
      }

      if (this.shouldFocusMain) {
        main.focus({ preventScroll: true });
        this.shouldFocusMain = false;
      }
    });
    return this.renderQueue;
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.__TEST_MODE__) {return;}
  window.app = new App();
});
