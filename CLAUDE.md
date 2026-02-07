# CLAUDE.md - AI Agent Implementation Guide

This document serves as the authoritative guide for AI coding agents working on the YourScore project.

---

## Project Overview

**YourScore** is a Progressive Web App (PWA) that gamifies daily habit tracking through a scoring system. Users earn points by completing activities and must maintain positive momentum against daily score decay.

**Key Principle**: This is a **client-only** application. No server, no backend, no database server. All data is stored locally in the browser using IndexedDB.

---

## Domain Model

### Main Score
- Persistent integer that carries over between days (can be positive or negative)
- New users start at **0**
- Displayed with color coding (green = positive, red = negative)

### Daily Decay
- Configurable penalty subtracted from Main Score when a new day is detected
- **First-day exemption**: No decay on the user's first day of use
- **Multi-day absence**: If user is away for N days, decay = N × daily_decay_amount
- Applied when the app opens and detects day rollover(s)

### Day Rollover
- Detected by comparing stored last-active date with current date (YYYY-MM-DD format)
- All times use the user's **local timezone**
- **Critical**: Store dates as strings (YYYY-MM-DD), not timestamps, to avoid timezone issues

### Break Even
- User "breaks even" when points earned today >= decay amount
- Display shows: remaining points needed OR surplus points earned

### Activity Completion
- Each activity can only be completed **once per day**
- Completions can be undone (toggle behavior)

---

## Current Features

All core features are implemented and tested:

- ✅ **Data Layer**: IndexedDB with migrations, models for activities, categories, completions, scores, settings
- ✅ **Core Services**: Decay calculation, achievement system, import/export (JSON/CSV)
- ✅ **Views**: Daily tracking, activity management, category management, settings, analytics dashboard
- ✅ **UI Components**: Score display, activity cards, achievement badges, toast notifications
- ✅ **PWA**: Service worker with offline caching, install prompts, manifest
- ✅ **Gamification**: Achievements for milestones, streaks, perfect weeks, recovery
- ✅ **i18n**: Multi-language support with translation system (30+ languages)
- ✅ **Themes**: Light/dark mode, UI scaling
- ✅ **Tests**: Comprehensive unit, integration, E2E, and visual tests

See `specs/FEATURES.md` for complete feature list and `specs/PLAN.md` for implementation details.

---

## Architecture

### File Structure

```
src/
├── index.html
├── manifest.json
├── sw.js
├── css/
│   ├── main.css
│   ├── themes.css
│   └── components.css
├── js/
│   ├── app.js
│   ├── storage/
│   │   ├── db.js
│   │   └── migrations.js
│   ├── models/
│   │   ├── activity.js
│   │   ├── category.js
│   │   ├── completion.js
│   │   ├── score.js
│   │   └── settings.js
│   ├── services/
│   │   ├── achievements.js
│   │   ├── decay.js
│   │   └── export.js
│   ├── views/
│   │   ├── activities.js
│   │   ├── categories.js
│   │   ├── daily.js
│   │   ├── dashboard.js
│   │   └── settings.js
│   ├── components/
│   │   ├── achievement-badge.js
│   │   ├── activity-card.js
│   │   ├── score-display.js
│   │   └── toast.js
│   ├── i18n/
│   │   ├── i18n.js              # Translation utilities
│   │   └── translations.js      # Language strings (30+ languages)
│   └── utils/
│       ├── celebrations.js      # Animation effects
│       ├── date.js              # Date/time utilities
│       └── dom.js               # DOM helpers, XSS prevention
└── assets/
    ├── icons/
    └── images/

tests/
├── unit/                        # 4 files: Pure logic tests
├── integration/                 # 9 files: Storage/model tests
├── e2e/                         # 7 files: Full user workflows
└── visual/                      # 6 files: Screenshot comparisons

tools/
├── ai-visual-inspect.js         # AI-powered visual test analysis
├── dev-server.js                # Development server
└── visual-test-runner.js        # Automated visual testing
```

### Data Storage Schema (IndexedDB)

```javascript
{
  settings: {
    key: 'string',               // e.g., 'decayAmount', 'firstUseDate', 'theme', 'language'
    value: 'any'
  },
  categories: {
    id: 'string',                // UUID
    name: 'string',
    order: 'number',
    createdAt: 'string'          // ISO date
  },
  activities: {
    id: 'string',                // UUID
    name: 'string',
    description: 'string',
    points: 'number',
    categoryId: 'string',
    archived: 'boolean',
    createdAt: 'string'
  },
  completions: {
    id: 'string',                // UUID
    activityId: 'string',
    date: 'string',              // YYYY-MM-DD (local)
    completedAt: 'string'        // ISO timestamp
  },
  scoreHistory: {
    date: 'string',              // YYYY-MM-DD (primary key)
    score: 'number',             // Main score at end of day
    earned: 'number',            // Points earned that day
    decay: 'number'              // Decay applied that day
  },
  achievements: {
    id: 'string',                // Achievement type ID
    unlockedAt: 'string'         // ISO timestamp
  }
}
```

### Key Patterns

**IndexedDB Wrapper** (`src/js/storage/db.js`):
- `async init()` - Initialize database
- `async get(store, key)` - Get single record
- `async getAll(store)` - Get all records
- `async put(store, value)` - Insert or update
- `async delete(store, key)` - Delete record
- `async transaction(stores, mode, callback)` - Custom transactions

**Date Handling** (`src/js/utils/date.js`):
- `getLocalDateString()` - Current date as YYYY-MM-DD in local timezone
- `daysBetween(startDate, endDate)` - Calculate day difference
- `parseLocalDate(dateStr)` - Parse YYYY-MM-DD to Date object
- Always use local timezone, never UTC conversions

**i18n System** (`src/js/i18n/i18n.js`):
- `t(key, params)` - Translate text with optional parameters
- `tPlural(key, count)` - Plural-aware translation
- `formatNumber(num)` - Locale-aware number formatting
- 30+ languages supported, stored in `translations.js`

**Model Pattern**:
- Static methods for CRUD operations
- All operations are async
- Use UUID for IDs
- See `src/js/models/` for examples

---

## Development

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at localhost:3000 |
| `npm test` | Run all tests |
| `npm run test:unit` | Unit tests (4 files) |
| `npm run test:e2e` | E2E tests (7 files) |
| `npm run test:visual` | Visual regression tests (6 files) |
| `npm run test:visual:ai` | Run visual tests with AI analysis |
| `npm run lint` | Check code style |
| `npm run format` | Format code with Prettier |

**Important**: Stop the dev server after tests to avoid port conflicts.

### Testing

| Type | Files | Purpose | Tools |
|------|-------|---------|-------|
| Unit | 4 | Pure logic, no DOM/browser APIs | Fast, isolated |
| Integration | 9 | Storage layer, model interactions | IndexedDB |
| E2E | 7 | Full user workflows, multiple viewports | Playwright |
| Visual | 6 | Screenshot comparisons, UI states | Playwright + AI |

**Visual Test Workflow**:
1. Make code changes
2. Run `npm run test:visual`
3. Review screenshots in `playwright-report/`
4. Optional: `node tools/ai-visual-inspect.js <path>` for AI analysis

### Workflow

1. **Read** relevant existing code first
2. **Check** `specs/FEATURES.md` for requirements
3. **Write/modify** code following conventions below
4. **Test** with `npm test`
5. **Lint** with `npm run lint && npm run format`

---

## Coding Conventions

### JavaScript Style
- ES modules (`import`/`export`)
- 2-space indentation, single quotes, semicolons required
- Line width: 100 characters
- `async/await` for asynchronous code

### Naming
- **Files**: `kebab-case.js`
- **Classes**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **CSS classes**: `kebab-case`

### File Organization
- One class per file
- Export default for main class/function
- Group related imports
- Keep files under 300 lines

### Security
- Use `escapeHtml()` from `utils/dom.js` for user input in HTML
- Never use `.innerHTML` with unsanitized data
- Validate all user inputs at boundaries

---

## Critical Implementation Notes

### Date/Time Handling
- ✅ **DO**: Use `getLocalDateString()` for YYYY-MM-DD dates
- ✅ **DO**: Store dates as strings, not timestamps
- ❌ **DON'T**: Use `toISOString().split('T')[0]` (converts to UTC first)
- ❌ **DON'T**: Use timestamps for date-only comparisons

### IndexedDB
- All operations are async - always `await`
- Transactions auto-commit when callback completes
- Can't reuse transactions after completion
- Use object stores, not SQL tables (NoSQL mindset)

### Service Worker
- Update version constant in `sw.js` when changing cached files
- Test offline functionality explicitly
- Service worker updates require page reload

### UI State
- Update UI immediately after data changes
- Handle loading states for async operations
- Debounce rapid user interactions
- Preserve scroll position on view changes

### Default Values
- Initial score: **0**
- Default decay: **10** (configurable)
- Theme: **light**
- UI scale: **1**
- Language: **browser default** or English fallback

### Default Categories
- Morning, Work, Evening, Health, Learning
- **Uncategorized** (cannot be deleted, always exists)

## User interface

The app provides one userinterface for both, Desktop and Mobile. The app should look and work very fine in the Browser on a desktop, as well as in mobile browsers and as PWA i.e. on the iPhone Homescreen.

The UI must be space effient, but provide good readability (esp. font size) on mobile.

## Essential Files Reference

| File | Purpose |
|------|---------|
| `specs/FEATURES.md` | Complete feature specification |
| `specs/PLAN.md` | Implementation phases and tasks |
| `src/js/app.js` | Application entry point, navigation |
| `src/js/views/daily.js` | Main daily tracking view |
| `src/js/services/decay.js` | Core decay logic |
| `src/js/services/achievements.js` | Achievement system |
| `src/js/i18n/i18n.js` | Translation utilities |
| `src/js/storage/db.js` | IndexedDB wrapper |

---

## When in Doubt

1. Check `specs/FEATURES.md` for feature requirements
2. Check `specs/PLAN.md` for implementation guidance
3. Read the actual implementation files for current patterns
4. Ask the user for clarification before implementing

**Prefer simpler implementations** that can be enhanced later over complex solutions that might be wrong.
