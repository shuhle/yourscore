# YourScore - Implementation Plan

## Overview
This document outlines the implementation plan for YourScore, a PWA habit tracking app with gamification. Development will be done in a Docker-based dev container on Apple Silicon M4, with integrated AI coding agents (Claude Code, OpenAI Codex API) and a closed-loop testing system that allows agents to visually inspect the app.

---

## Part 1: Development Environment

### 1.1 Dev Container Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Dev Container (ARM64)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │ Claude Code │  │ Openai Codex │  │ Node.js + Tools     │  │
│  │    CLI      │  │  CLI         │  │ - Playwright        │  │
│  └─────────────┘  └──────────────┘  │ - Chromium          │  │
│                                     │ - HTTP Server       │  │
│  ┌────────────────────────────────┐ │ - Test Runner       │  │
│  │     Visual Feedback Loop       │ └─────────────────────┘  │
│  │  Screenshot → AI Analysis →    │                          │
│  │  Code Fix → Re-test → Verify   │                          │
│  └────────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Dev Container Configuration

**File: `.devcontainer/devcontainer.json`**
```json
{
  "name": "YourScore Dev",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "20"
    }
  },
  "forwardPorts": [3000, 8080],
  "postCreateCommand": "npm install",
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode"
      ]
    }
  },
  "mounts": [
    "source=${localEnv:HOME}/.claude,target=/home/node/.claude,type=bind",
    "source=${localEnv:HOME}/.config/claude-code,target=/home/node/.config/claude-code,type=bind"
  ],
  "containerEnv": {
    "OPENAI_API_KEY": "${localEnv:OPENAI_API_KEY}",
    "ANTHROPIC_API_KEY": "${localEnv:ANTHROPIC_API_KEY}"
  }
}
```

**File: `.devcontainer/Dockerfile`**
```dockerfile
FROM mcr.microsoft.com/devcontainers/javascript-node:20-bookworm

# Install Playwright dependencies and Chromium
RUN npx playwright install-deps chromium
RUN npx playwright install chromium

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Install Codex CLI
RUN npm install -g @openai/codex

# Create scripts directory
RUN mkdir -p /usr/local/bin/ai-tools

# Install additional tools
RUN apt-get update && apt-get install -y \
    jq \
    curl \
    && rm -rf /var/lib/apt/lists/*
```

### 1.4 Visual Feedback Loop System

The key innovation: AI agents can "see" the app through automated screenshots.

**Architecture:**
```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  AI Agent    │───▶│  Playwright  │───▶│  Screenshot  │
│  (Claude/    │    │  Test Runner │    │  Capture     │
│   Codex)     │    └──────────────┘    └──────┬───────┘
│              │                               │
│              │◀──────────────────────────────┘
│              │    (Screenshot sent back to AI
│              │     for visual analysis)
└──────────────┘
```

**File: `tools/visual-test-runner.js`**
- Runs Playwright tests
- Captures screenshots at each interaction step
- Saves screenshots with descriptive names
- Returns screenshot paths for AI analysis

**File: `tools/ai-visual-inspect.js`**
- Takes screenshot path as input
- Sends to Claude API (multimodal) for visual analysis
- Returns structured feedback about UI state
- Can detect visual bugs, layout issues, missing elements

### 1.5 Test Infrastructure

**Playwright Configuration (`playwright.config.js`):**
- Headless Chromium for CI
- Screenshot on every action (configurable)
- Video recording for debugging
- HTML report generation

**Test Categories:**
1. **Unit Tests** (`tests/unit/`) - Pure logic testing
2. **Integration Tests** (`tests/integration/`) - Data layer testing
3. **E2E Tests** (`tests/e2e/`) - Full user flow testing
4. **Visual Tests** (`tests/visual/`) - Screenshot-based regression

---

## Part 2: Project Structure

```
yourscore/
├── .devcontainer/
│   ├── devcontainer.json
│   └── Dockerfile
├── specs/
│   ├── FEATURES.md
│   └── PLAN.md
├── src/
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js                    # Service Worker
│   ├── css/
│   │   ├── main.css
│   │   ├── themes.css           # Light/dark themes
│   │   └── components.css
│   ├── js/
│   │   ├── app.js               # Main entry point
│   │   ├── storage/
│   │   │   ├── db.js            # IndexedDB wrapper
│   │   │   └── migrations.js    # Schema migrations
│   │   ├── models/
│   │   │   ├── activity.js
│   │   │   ├── category.js
│   │   │   ├── completion.js
│   │   │   ├── score.js
│   │   │   └── settings.js
│   │   ├── services/
│   │   │   ├── decay.js         # Decay calculation
│   │   │   ├── achievements.js  # Achievement tracking
│   │   │   └── export.js        # Import/export
│   │   ├── views/
│   │   │   ├── daily.js         # Daily tracking view
│   │   │   ├── activities.js    # Activity management
│   │   │   ├── categories.js    # Category management
│   │   │   ├── settings.js      # Settings view
│   │   │   └── dashboard.js     # Analytics dashboard
│   │   ├── components/
│   │   │   ├── score-display.js
│   │   │   ├── activity-card.js
│   │   │   ├── achievement-badge.js
│   │   │   └── toast.js
│   │   └── utils/
│   │       ├── date.js          # Date/time utilities
│   │       ├── dom.js           # DOM helpers
│   │       └── animations.js
│   └── assets/
│       ├── icons/
│       └── images/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── visual/
├── tools/
│   ├── codex-agent.js
│   ├── visual-test-runner.js
│   ├── ai-visual-inspect.js
│   └── dev-server.js
├── package.json
├── playwright.config.js
└── README.md
```

---

## Part 3: Implementation Phases

### Phase 1: Foundation (Dev Environment + Core Infrastructure)

**Goals:**
- Working dev container with all tools
- Basic project structure
- IndexedDB storage layer
- Simple HTTP server for development
- Playwright configured and running

**Tasks:**
1. Create `.devcontainer/` configuration
2. Create `package.json` with dependencies
3. Implement `src/js/storage/db.js` - IndexedDB wrapper
4. Create basic `src/index.html` shell
5. Set up Playwright with a simple smoke test
6. Create `tools/visual-test-runner.js`
7. Create `tools/ai-visual-inspect.js`

**Exit Criteria:**
- `npm run dev` starts local server
- `npm test` runs Playwright tests
- AI agent can run tests and receive screenshots

---

### Phase 2: Data Models + Core Logic

**Goals:**
- All data models implemented
- Decay calculation logic
- Day rollover detection
- Unit tests for all logic

**Tasks:**
1. Implement `models/activity.js` - CRUD for activities (including name, description, points, category)
2. Implement `models/category.js` - CRUD for categories
3. Implement `models/completion.js` - Track daily completions with timestamps
4. Implement `models/score.js` - Main score management
5. Implement `models/settings.js` - User preferences (including firstUseDate tracking)
6. Implement `services/decay.js` - Decay calculation with multi-day support and first-day exemption
7. Implement `utils/date.js` - Day rollover detection
8. Write unit tests for all models and services

**Exit Criteria:**
- All models have CRUD operations
- Decay calculates correctly for N missed days
- First-day decay exemption works (no decay applied on user's first day)
- Day rollover detected accurately
- Completions store timestamp when marked complete
- 100% unit test coverage for logic

---

### Phase 3: Daily View (Core UI)

**Goals:**
- Main daily tracking interface
- Activity completion workflow
- Score display with color coding
- Break-even indicator

**Tasks:**
1. Create `views/daily.js` - Main daily view
2. Create `components/score-display.js` - Large score with colors
3. Create `components/activity-card.js` - Tappable activity items
4. Create `components/toast.js` - Notification toasts for feedback
5. Implement activity grouping by category
6. Implement completion toggle with visual feedback (using toast)
7. Implement undo completion functionality (tap again to uncomplete)
8. Display completion timestamps on completed activities
9. Show break-even progress
10. Show decay notification on app open after absence (display accumulated decay applied)
11. E2E tests for daily workflow (including undo)
12. Visual tests for score display states

**Exit Criteria:**
- User can see all activities grouped by category
- Tapping activity marks it complete (with timestamp) and updates score
- Tapping completed activity undoes the completion
- Score changes color based on positive/negative
- Break-even indicator shows remaining points needed
- When returning after absence, user sees notification of decay applied
- Toast notifications provide feedback on actions

---

### Phase 4: Activity Management

**Goals:**
- Create, edit, archive activities
- Activity templates
- Form validation

**Tasks:**
1. Create `views/activities.js` - Activity list/management
2. Implement create activity form (name, description, points, category)
3. Implement edit activity flow
4. Implement archive (soft delete)
5. Add activity templates with quick-add
6. Form validation for required fields
7. E2E tests for activity CRUD

**Exit Criteria:**
- User can create activity with name, description, points, category
- User can edit existing activities
- User can archive activities (they disappear but data preserved)
- Templates available for quick setup

---

### Phase 5: Category Management

**Goals:**
- Full category CRUD
- Category reordering
- Default categories

**Tasks:**
1. Create `views/categories.js` - Category management
2. Implement create/rename/delete
3. Implement drag-to-reorder
4. Seed default categories on first run
5. Handle "Uncategorized" special case
6. E2E tests for category management

**Exit Criteria:**
- User can create, rename, delete categories
- Deleting category moves activities to Uncategorized
- Categories can be reordered
- Default categories exist on first launch

---

### Phase 6: Settings

**Goals:**
- Decay configuration
- Main score adjustment
- Theme switching
- UI scale

**Tasks:**
1. Create `views/settings.js` - Settings page
2. Implement decay amount setting
3. Implement main score adjustment
4. Implement light/dark theme toggle
5. Implement UI scale slider
6. Persist all settings to storage
7. Apply theme/scale immediately on change

**Exit Criteria:**
- User can adjust decay amount
- User can manually set main score
- Theme switches between light/dark
- UI scale adjusts interface size

---

### Phase 7: PWA Features

**Goals:**
- Offline functionality
- Installable app
- Service worker caching

**Tasks:**
1. Create `manifest.json` with icons
2. Implement `sw.js` service worker
3. Cache-first strategy for static assets
4. Network-first for nothing (no server)
5. Add install prompt handling
6. Create app icons (multiple sizes)
7. Test offline functionality

**Exit Criteria:**
- App works completely offline
- App can be installed to home screen
- Proper icons and splash screen
- No network requests required for functionality

---

### Phase 8: Import/Export

**Goals:**
- Full data export (JSON/CSV)
- Data import with validation
- History reset

**Tasks:**
1. Implement `services/export.js`
2. JSON export (full state)
3. CSV export (completions history)
4. Import with schema validation
5. Merge vs replace import options
6. Reset/clear all data
7. E2E tests for export/import round-trip

**Exit Criteria:**
- Export produces valid JSON/CSV
- Import restores full app state
- Data round-trips correctly (export → import → same state)
- Reset clears all data

---

### Phase 9: Gamification

**Goals:**
- Achievement system
- Visual feedback/animations
- Milestone celebrations

**Tasks:**
1. Implement `services/achievements.js`
2. Define and implement all achievement types:
   - Score milestones: Reach 100, 500, 1000 points
   - Streak achievements: Complete X successful days in a row (earned >= decay)
   - Perfect weeks: Complete all activities every day for 7 consecutive days
   - Recovery achievements: Bounce back from negative to positive score
3. Handle edge case: Activity-based achievements require at least one activity to exist
4. Track achievement progress persistently
5. Create `components/achievement-badge.js`
6. Implement completion animations
7. Implement score change animations
8. Milestone celebration effects
9. Visual tests for animations

**Exit Criteria:**
- All achievement types unlock at correct thresholds
- Score milestone achievements work (100, 500, 1000)
- Streak achievements track consecutive successful days
- Perfect week achievement tracks all-activity completion for 7 days
- Recovery achievement triggers when score goes from negative to positive
- Achievements gracefully handle zero-activity state
- Visual feedback on activity completion
- Score animates on change
- Celebrations trigger for milestones

---

### Phase 10: Analytics Dashboard

**Goals:**
- Current score prominence
- Streak display
- Activity statistics

**Tasks:**
1. Create `views/dashboard.js`
2. Large current score display
3. Today's progress visualization
4. Current streak counter
5. Most/least completed activities (30 days)
6. Visual tests for dashboard states

**Exit Criteria:**
- Dashboard shows current score prominently
- Streak displayed correctly
- Activity statistics accurate
- Responsive on all screen sizes

---

### Phase 11: Polish + Final Testing

**Goals:**
- Responsive design verification
- Performance optimization
- Cross-browser testing
- Final visual polish

**Tasks:**
1. Test on phone, tablet, desktop viewports
2. Optimize bundle size
3. Audit with Lighthouse
4. Fix any visual regressions
5. Complete E2E test coverage
6. Documentation

**Exit Criteria:**
- Works on all target devices
- Lighthouse PWA score > 90
- All tests passing
- Clean, consistent UI

---

## Part 4: Testing Strategy

### 4.1 Test Pyramid

```
        ┌─────────┐
        │ Visual  │  ← AI-assisted screenshot analysis
        │  Tests  │
       ─┴─────────┴─
      ┌─────────────┐
      │   E2E Tests │  ← Playwright user flows
     ─┴─────────────┴─
    ┌─────────────────┐
    │Integration Tests│  ← Storage + model interactions
   ─┴─────────────────┴─
  ┌─────────────────────┐
  │     Unit Tests      │  ← Pure logic (decay, dates, etc.)
  └─────────────────────┘
```

### 4.2 Visual Testing with AI Agents

**Workflow for AI-Assisted Development:**

```bash
# 1. AI agent makes code changes
claude-code edit src/views/daily.js

# 2. Run visual test suite
npm run test:visual

# 3. Screenshots saved to tests/visual/screenshots/
# 4. AI agent analyzes screenshots
node tools/ai-visual-inspect.js tests/visual/screenshots/daily-view.png

# 5. AI receives structured feedback:
# {
#   "status": "issues_found",
#   "issues": [
#     {"type": "layout", "description": "Score text overlaps button on mobile"},
#     {"type": "color", "description": "Break-even indicator not visible in dark mode"}
#   ]
# }

# 6. AI agent fixes issues and re-runs
```

**Visual Test Runner Features:**
- Captures screenshot after each Playwright action
- Names screenshots descriptively: `{test-name}_{step}_{timestamp}.png`
- Supports multiple viewport sizes (mobile, tablet, desktop)
- Generates comparison reports

### 4.3 Continuous Testing During Development

**File Watcher Integration:**
```bash
# Watch mode: re-run tests on file changes
npm run test:watch

# Test specific area during development
npm run test -- --grep "daily view"
```

**AI Agent Test Loop:**
```
┌─────────────────────────────────────────────────────────┐
│  1. Write/modify code                                   │
│  2. Run tests (unit + e2e + visual)                    │
│  3. If tests fail:                                      │
│     a. Review error messages                            │
│     b. Review screenshots (for visual tests)            │
│     c. Fix code                                         │
│     d. Go to step 2                                     │
│  4. If tests pass:                                      │
│     a. Review screenshots for visual quality            │
│     b. If issues found, fix and go to step 2           │
│     c. If OK, proceed to next task                     │
└─────────────────────────────────────────────────────────┘
```

---

## Part 5: Commands Reference

### Development
```bash
npm run dev          # Start dev server on port 3000
npm run build        # Build for production (if needed)
```

### Testing
```bash
npm test             # Run all tests
npm run test:unit    # Unit tests only
npm run test:e2e     # E2E tests only
npm run test:visual  # Visual regression tests
npm run test:watch   # Watch mode
```

### AI Tools
```bash
# Run visual inspection on screenshot
node tools/ai-visual-inspect.js <screenshot-path>

# Run codex agent for code suggestions
node tools/codex-agent.js <prompt> <context-files...>

# Full visual test with AI analysis
npm run test:visual:ai
```

### Utilities
```bash
npm run lint         # Run ESLint
npm run format       # Run Prettier
```

---

## Part 6: Dependencies

### Production (bundled in app)
- None (vanilla JS)

### Development
```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "eslint": "^8.56.0",
    "prettier": "^3.2.0",
    "serve": "^14.2.0",
    "openai": "^4.24.0"
  }
}
```

---

## Part 7: Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| IndexedDB complexity | Medium | Use simple wrapper, extensive tests |
| Service worker caching bugs | High | Careful versioning, cache-bust on deploy |
| Date/timezone edge cases | Medium | Use local timezone throughout (client-only app), compare dates as YYYY-MM-DD strings |
| Visual tests flaky | Medium | Use stable selectors, wait for animations |
| AI screenshot analysis inaccurate | Low | Supplement with E2E assertions |
| Playwright Chromium on ARM64 | Medium | Use Firefox/WebKit as primary browsers on ARM64 (Apple Silicon); Chromium as optional fallback |

---

## Part 8: Success Criteria

The implementation is complete when:

1. ✅ All features from FEATURES.md are implemented
2. ✅ App works fully offline
3. ✅ App is installable as PWA
4. ✅ All tests pass (unit, integration, e2e, visual)
5. ✅ AI agents can run and verify tests with visual feedback
6. ✅ Lighthouse PWA score > 90
7. ✅ Works on mobile, tablet, and desktop
8. ✅ Light and dark themes work correctly
