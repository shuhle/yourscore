# CLAUDE.md - AI Agent Implementation Guide

This document serves as the authoritative guide for AI coding agents (Claude, Codex) working on the YourScore project. It contains domain knowledge, implementation details, and practical guidance for each development phase.

---

## Project Overview

**YourScore** is a Progressive Web App (PWA) that gamifies daily habit tracking through a scoring system. Users earn points by completing activities and must maintain positive momentum against daily score decay.

**Key Principle**: This is a **client-only** application. There is no server, no backend, no database server. All data is stored locally in the browser using IndexedDB/localStorage.

---

## Domain Model

Understanding these core concepts is essential for correct implementation:

### Main Score
- A persistent integer that carries over between days
- Can be positive or negative
- New users start at **0**
- Displayed prominently with color coding (green = positive, red = negative)

### Daily Decay
- A configurable penalty subtracted from the Main Score when a new day is detected
- **First-day exemption**: No decay on the user's first day of use
- **Multi-day absence**: If user is away for N days, decay = N × daily_decay_amount
- Applied when the app opens and detects day rollover(s)

### Day Rollover
- Detected by comparing stored last-active date with current date (YYYY-MM-DD format)
- All times use the user's local timezone
- Important: Store dates as strings, not timestamps, to avoid timezone issues

### Break Even
- The user "breaks even" when points earned today >= decay amount
- Display shows: remaining points needed OR surplus points earned

### Successful Day
- A day where earned points >= decay amount
- Used for streak calculations

### Activity Completion
- Each activity can only be completed **once per day**
- Completions store a timestamp
- Completions can be undone (toggle behavior)

---

## Current Implementation Status

### Phase 1: Foundation - COMPLETE
- [x] Dev container with Node 20, Playwright, AI tools
- [x] Basic project structure (`src/`, `tests/`, `tools/`)
- [x] `package.json` with all scripts
- [x] Basic `index.html` shell with app structure
- [x] CSS files (main.css, themes.css, components.css)
- [x] Service worker (`sw.js`)
- [x] PWA manifest (`manifest.json`)
- [x] Basic `app.js` with navigation scaffold
- [x] Playwright configured with smoke test
- [x] AI visual inspection tools
- [x] IndexedDB wrapper (`src/js/storage/db.js`)
- [x] Schema migrations (`src/js/storage/migrations.js`)

### Phase 2: Data Models + Core Logic - COMPLETE
- [x] `src/js/utils/date.js` - Date utilities (getLocalDateString, daysBetween, hasNewDayStarted)
- [x] `src/js/utils/celebrations.js` - Animation and celebration effects
- [x] `src/js/models/settings.js` - User preferences with firstUseDate, lastActiveDate
- [x] `src/js/models/category.js` - CRUD for categories with default seeding
- [x] `src/js/models/activity.js` - CRUD for activities with templates
- [x] `src/js/models/completion.js` - Daily completion tracking with toggle
- [x] `src/js/models/score.js` - Main score and history management
- [x] `src/js/services/decay.js` - Decay calculation with first-day exemption
- [x] `src/js/services/achievements.js` - Achievement system with milestones and streaks
- [x] `src/js/services/export.js` - Import/export functionality (JSON/CSV)
- [x] Integration tests for all models and services

### Phase 3: Daily View (Core UI) - COMPLETE
- [x] `src/js/views/daily.js` - Daily tracking view
- [x] `src/js/components/score-display.js` - Score with color coding
- [x] `src/js/components/activity-card.js` - Tappable activity items
- [x] `src/js/components/toast.js` - Notification toasts
- [x] Activity grouping by category
- [x] Completion toggle with visual feedback
- [x] Undo completion functionality
- [x] Break-even progress display
- [x] Decay notifications
- [x] E2E and visual tests

### Phase 4: Activity Management - COMPLETE
- [x] `src/js/views/activities.js` - Full activity management interface
- [x] Create, edit, archive activities
- [x] Form validation
- [x] E2E tests

### Phase 5: Category Management - COMPLETE
- [x] `src/js/views/categories.js` - Full category management
- [x] CRUD operations with reordering
- [x] Default categories seeding
- [x] Uncategorized handling
- [x] E2E tests

### Phase 6: Settings - COMPLETE
- [x] `src/js/views/settings.js` - Full settings interface
- [x] Decay configuration
- [x] Main score adjustment
- [x] Theme switching (light/dark)
- [x] UI scale slider
- [x] Immediate application on change

### Phase 7: PWA Features - COMPLETE
- [x] `manifest.json` with icons
- [x] `sw.js` service worker with caching
- [x] Install prompt handling

### Phase 8: Import/Export - COMPLETE
- [x] JSON export/import
- [x] CSV export
- [x] Import validation
- [x] E2E tests (`export-import.spec.js`)

### Phase 9: Gamification - COMPLETE
- [x] `src/js/services/achievements.js` - Full achievement system
- [x] `src/js/components/achievement-badge.js` - Achievement UI
- [x] Score milestones (100, 500, 1000)
- [x] Streak achievements
- [x] Perfect weeks
- [x] Recovery achievements
- [x] Celebration animations via `celebrations.js`

### Phase 10: Analytics Dashboard - COMPLETE
- [x] `src/js/views/dashboard.js` - Full dashboard implementation
- [x] Current score display
- [x] Today's progress
- [x] Streak counter
- [x] Activity statistics
- [x] Visual tests

### Phase 11: Polish + Final Testing - IN PROGRESS
- [x] Comprehensive test suites (unit, integration, e2e, visual)
- [x] Theme support
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Final documentation review

---

## Architecture

### File Structure
```
src/
├── index.html              # Single page shell
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── css/
│   ├── main.css           # Base styles, layout
│   ├── themes.css         # Light/dark theme variables
│   └── components.css     # Component-specific styles
├── js/
│   ├── app.js             # Entry point, App class
│   ├── storage/
│   │   ├── db.js          # IndexedDB wrapper
│   │   └── migrations.js  # Schema migrations
│   ├── models/
│   │   ├── activity.js    # Activity CRUD
│   │   ├── category.js    # Category CRUD
│   │   ├── completion.js  # Completion tracking
│   │   ├── score.js       # Score management
│   │   └── settings.js    # User preferences
│   ├── services/
│   │   ├── achievements.js # Achievement system
│   │   ├── decay.js       # Decay calculation
│   │   └── export.js      # Import/export functionality
│   ├── views/
│   │   ├── activities.js  # Activity management view
│   │   ├── categories.js  # Category management view
│   │   ├── daily.js       # Daily tracking view
│   │   ├── dashboard.js   # Analytics dashboard view
│   │   └── settings.js    # Settings view
│   ├── components/
│   │   ├── achievement-badge.js # Achievement display
│   │   ├── activity-card.js     # Activity list item
│   │   ├── score-display.js     # Score indicator
│   │   └── toast.js             # Notification toasts
│   └── utils/
│       ├── celebrations.js # Animation effects
│       └── date.js         # Date utilities
└── assets/
    ├── icons/             # App icons
    └── images/            # Other images

tests/
├── unit/                  # Pure logic tests (3 files)
│   ├── date-utils.spec.js
│   ├── decay.spec.js
│   └── models.spec.js
├── integration/           # Storage/model tests (9 files)
│   ├── achievements.spec.js
│   ├── activity.spec.js
│   ├── category.spec.js
│   ├── completion.spec.js
│   ├── date-utils.spec.js
│   ├── db.spec.js
│   ├── decay.spec.js
│   ├── score.spec.js
│   └── settings.spec.js
├── e2e/                   # End-to-end tests (7 files)
│   ├── activities.spec.js
│   ├── categories.spec.js
│   ├── daily.spec.js
│   ├── dashboard.spec.js
│   ├── export-import.spec.js
│   ├── settings.spec.js
│   └── smoke.spec.js
└── visual/                # Visual regression tests (5 files)
    ├── activities-view.spec.js
    ├── categories-view.spec.js
    ├── dashboard-view.spec.js
    ├── score-display.spec.js
    └── settings-view.spec.js
```

### Data Storage Schema (IndexedDB)

```javascript
// Object Stores:
{
  settings: {
    key: 'string',      // e.g., 'decayAmount', 'firstUseDate', 'theme'
    value: 'any'
  },
  categories: {
    id: 'string',       // UUID
    name: 'string',
    order: 'number',
    createdAt: 'string' // ISO date
  },
  activities: {
    id: 'string',       // UUID
    name: 'string',
    description: 'string',
    points: 'number',
    categoryId: 'string',
    archived: 'boolean',
    createdAt: 'string'
  },
  completions: {
    id: 'string',       // UUID
    activityId: 'string',
    date: 'string',     // YYYY-MM-DD (local)
    completedAt: 'string', // ISO timestamp
  },
  scoreHistory: {
    date: 'string',     // YYYY-MM-DD (primary key)
    score: 'number',    // Main score at end of day
    earned: 'number',   // Points earned that day
    decay: 'number'     // Decay applied that day
  },
  achievements: {
    id: 'string',       // Achievement type ID
    unlockedAt: 'string' // ISO timestamp
  }
}
```

---

## Coding Conventions

### JavaScript Style
- ES modules (`import`/`export`)
- 2-space indentation
- Single quotes for strings
- Semicolons required
- Line width: 100 characters
- Use `async/await` for asynchronous code

### Naming Conventions
- **Files**: `kebab-case.js` (e.g., `score-display.js`)
- **Classes**: `PascalCase` (e.g., `ActivityCard`)
- **Functions/methods**: `camelCase` (e.g., `calculateDecay`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `DEFAULT_DECAY`)
- **CSS classes**: `kebab-case` (e.g., `activity-card`)

### Test Files
- Follow `*.spec.js` pattern
- Place in appropriate directory: `tests/unit/`, `tests/e2e/`, `tests/visual/`
- Use descriptive test names: `test('should calculate decay for 3 missed days', ...)`

### Code Organization
- One class per file
- Export default for main class/function
- Group related imports together
- Keep files focused (<300 lines ideally)

---

## Testing

### Commands
```bash
npm test                 # Run all tests
npm run test:unit        # Unit tests only
npm run test:e2e         # E2E tests only
npm run test:visual      # Visual regression tests
npm run test:watch       # Watch mode for development
```

### Test Categories

**Unit Tests** (`tests/unit/`) - 3 files:
- Pure logic: decay calculation, date utilities, data transformations
- No DOM, no browser APIs
- Fast, isolated, comprehensive

**Integration Tests** (`tests/integration/`) - 9 files:
- Storage layer with IndexedDB
- Model interactions
- Data persistence verification
- Covers all models and services

**E2E Tests** (`tests/e2e/`) - 7 files:
- Full user workflows
- Browser interactions via Playwright
- Test on multiple viewports (desktop, mobile, tablet)
- Covers daily, activities, categories, settings, dashboard, export/import

**Visual Tests** (`tests/visual/`) - 5 files:
- Screenshot comparisons
- UI state verification
- AI-assisted visual analysis available
- Covers all major views

### Writing Tests
```javascript
import { test, expect } from '@playwright/test';

test.describe('Daily View', () => {
  test('should show break-even indicator when score is positive', async ({ page }) => {
    // Arrange: Set up initial state
    // Act: Perform user actions
    // Assert: Verify expected outcomes
  });
});
```

### Visual Test Loop
```bash
# 1. Make code changes
# 2. Run visual tests
npm run test:visual

# 3. Screenshots saved to playwright-report/
# 4. Optional: AI analysis
node tools/ai-visual-inspect.js <screenshot-path>
```

---

## Development Workflow

### Starting Development
```bash
# Dev container should auto-run this, but if needed:
npm install

# Start dev server
npm run dev

# In another terminal, run tests in watch mode
npm run test:watch
```

### Making Changes

1. **Read relevant files first** - Understand existing code before modifying
2. **Check specs** - Consult `specs/FEATURES.md` and `specs/PLAN.md`
3. **Write/modify code** - Follow conventions above
4. **Run tests** - Ensure all tests pass
5. **Check lint** - `npm run lint`
6. **Format code** - `npm run format`

### Creating New Files

When creating new modules, follow this pattern:

```javascript
// src/js/models/example.js

/**
 * Example model for managing X data
 */

import { db } from '../storage/db.js';

const STORE_NAME = 'examples';

export class ExampleModel {
  /**
   * Create a new example
   * @param {Object} data - Example data
   * @returns {Promise<Object>} Created example with id
   */
  static async create(data) {
    // Implementation
  }

  static async getById(id) {
    // Implementation
  }

  static async getAll() {
    // Implementation
  }

  static async update(id, data) {
    // Implementation
  }

  static async delete(id) {
    // Implementation
  }
}

export default ExampleModel;
```

---

## Key Implementation Details

### IndexedDB Wrapper Pattern
```javascript
// src/js/storage/db.js should provide:
class DB {
  async init()                    // Initialize database
  async get(store, key)           // Get single record
  async getAll(store)             // Get all records from store
  async put(store, value)         // Insert or update
  async delete(store, key)        // Delete record
  async clear(store)              // Clear all records in store
  async transaction(stores, mode, callback)  // Custom transactions
}
```

### Date Handling
```javascript
// src/js/utils/date.js should provide:

// Get current date as YYYY-MM-DD in local timezone
function getLocalDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // WRONG - uses UTC
  // Correct approach:
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Calculate days between two date strings
function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1 + 'T00:00:00');
  const d2 = new Date(dateStr2 + 'T00:00:00');
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

// Check if day has rolled over since last active
function hasNewDayStarted(lastActiveDate, currentDate) {
  return lastActiveDate !== currentDate;
}
```

### Decay Calculation
```javascript
// src/js/services/decay.js

async function applyDecayIfNeeded() {
  const settings = await SettingsModel.getAll();
  const lastActiveDate = settings.lastActiveDate;
  const firstUseDate = settings.firstUseDate;
  const currentDate = getLocalDateString();
  const decayAmount = settings.decayAmount || 0;

  // No decay on first day ever
  if (currentDate === firstUseDate) {
    await SettingsModel.set('lastActiveDate', currentDate);
    return { decayApplied: 0, daysAway: 0 };
  }

  // Calculate days since last active
  const daysAway = daysBetween(lastActiveDate, currentDate);

  if (daysAway <= 0) {
    return { decayApplied: 0, daysAway: 0 };
  }

  // Apply accumulated decay
  const totalDecay = daysAway * decayAmount;
  await ScoreModel.adjustScore(-totalDecay);
  await SettingsModel.set('lastActiveDate', currentDate);

  return { decayApplied: totalDecay, daysAway };
}
```

### Completion Toggle
```javascript
// Toggling activity completion
async function toggleCompletion(activityId) {
  const today = getLocalDateString();
  const existing = await CompletionModel.findByActivityAndDate(activityId, today);

  if (existing) {
    // Undo completion
    await CompletionModel.delete(existing.id);
    const activity = await ActivityModel.getById(activityId);
    await ScoreModel.adjustScore(-activity.points);
    return { completed: false };
  } else {
    // Mark complete
    await CompletionModel.create({
      activityId,
      date: today,
      completedAt: new Date().toISOString()
    });
    const activity = await ActivityModel.getById(activityId);
    await ScoreModel.adjustScore(activity.points);
    return { completed: true };
  }
}
```

---

## Common Pitfalls

### Date/Time Issues
- **Always use local timezone** for date comparisons
- **Store dates as YYYY-MM-DD strings**, not timestamps
- **Test day rollover** around midnight
- **Don't use `toISOString().split('T')[0]`** - it converts to UTC first

### IndexedDB Gotchas
- Operations are async - always await
- Transactions auto-commit when callback completes
- Can't reuse transactions after they complete
- Use object stores, not tables (NoSQL mindset)

### PWA/Service Worker
- Cache versioning is critical - update `sw.js` version on changes
- Test offline functionality explicitly
- Service worker updates require page reload

### UI State
- Always update UI after data changes
- Handle loading states for async operations
- Debounce rapid user interactions
- Preserve scroll position on view changes

---

## Quick Reference

### Essential Files to Understand
| File | Purpose |
|------|---------|
| `specs/FEATURES.md` | Complete feature specification |
| `specs/PLAN.md` | Implementation phases and tasks |
| `src/js/app.js` | Application entry point, navigation |
| `src/js/views/daily.js` | Main daily tracking view |
| `src/js/services/decay.js` | Core decay logic |
| `src/js/services/achievements.js` | Achievement system |
| `src/js/storage/db.js` | IndexedDB wrapper |
| `playwright.config.js` | Test configuration |
| `package.json` | Scripts and dependencies |

### npm Scripts
| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at localhost:3000 |
| `npm test` | Run all Playwright tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:e2e` | Run E2E tests only |
| `npm run test:visual` | Run visual tests |
| `npm run lint` | Check code with ESLint |
| `npm run format` | Format code with Prettier |

If you start the server make sure that you also stop it after your tests!

### Default Values
| Setting | Default |
|---------|---------|
| Initial score | 0 |
| Default decay | 10 (configurable) |
| Theme | light |
| UI scale | 1 |

### Default Categories
- Morning
- Work
- Evening
- Health
- Learning
- Uncategorized (cannot be deleted)

---

## Development Checklist

When making changes or adding features, follow this process:

1. **Read relevant existing code** - Understand the current implementation
2. **Check specs** - Consult `specs/FEATURES.md` for feature requirements
3. **Write tests first** for logic-heavy features (unit tests) or user flows (E2E)
4. **Implement the feature** following coding conventions
5. **Run all tests** - `npm test` to ensure nothing broke
6. **Run lint and format** - `npm run lint && npm run format`
7. **Update this document** if adding new modules or changing architecture

---

## Asking for Clarification

If implementation details are unclear:
1. First check `specs/FEATURES.md` for the feature spec
2. Then check `specs/PLAN.md` for implementation guidance
3. If still unclear, ask the user for clarification before implementing

**When in doubt**: Prefer simpler implementations that can be enhanced later over complex solutions that might be wrong.
