# YourScore

A Progressive Web App (PWA) that gamifies daily habit tracking through a scoring system.

## Overview

YourScore helps you build positive habits by turning your daily routine into a game. Complete activities to earn points, maintain streaks, and unlock achievements while battling against daily score decay.

### Key Features

- **Score-Based Tracking**: Earn points by completing daily activities
- **Daily Decay**: Stay motivated with a configurable daily penalty
- **Achievements**: Unlock milestones for score, streaks, and consistency
- **Categories**: Organize activities however you like (Uncategorized is always available)
- **Analytics Dashboard**: Track progress with stats and streaks
- **Data Export/Import**: Backup and restore your data in JSON or CSV format
- **Offline Support**: Works without an internet connection
- **Responsive Design**: Optimized for phone, tablet, and desktop

## Getting Started

### Prerequisites

None for running. You can serve the `src/` folder with any static HTTP server.

Node.js (20+) and npm are only needed for development, testing, or linting.

### Installation (Development)

```bash
# Clone the repository
git clone <repository-url>
cd yourscore

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Serve Without Node

You can host the app by serving the `src/` folder directly:

```bash
# Example with Python
python3 -m http.server --directory src 3000
```

Then open `http://localhost:3000`. (An HTTP server is required for ES modules and the service worker.)

### Installing as PWA

The app can be installed on your device for quick access:
- **Desktop**: Click the install icon in your browser's address bar
- **Mobile**: Use "Add to Home Screen" from your browser's menu

## Usage

### Daily View

The main screen shows your current score and today's activities. Tap an activity to mark it complete and earn points.

### Score System

- **Main Score**: Your persistent score that carries over between days
- **Daily Decay**: A configurable penalty subtracted each day (default: 10 points)
- **Break Even**: Earn points equal to decay to maintain your score

### Activities

Create custom activities or use templates:
- Set point values based on difficulty/importance
- Organize into categories
- Archive activities you no longer use

### Settings

Customize your experience:
- Adjust daily decay amount
- Set your main score
- Choose light or dark theme
- Scale UI for accessibility

### Data Management

- **Export**: Download your data as JSON or CSV
- **Import**: Restore from a JSON backup (merge or replace)
- **Reset**: Clear all data and start fresh

## Development

### Project Structure

```
src/
├── index.html              # Single page shell
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── css/                    # Stylesheets
├── js/
│   ├── app.js              # Entry point
│   ├── storage/            # IndexedDB wrapper
│   ├── models/             # Data models
│   ├── services/           # Business logic
│   ├── views/              # View controllers
│   ├── components/         # UI components
│   └── utils/              # Utilities
└── assets/                 # Icons and images
```

### Commands

```bash
npm run dev          # Start development server
npm test             # Run all tests
npm run test:unit    # Unit tests only
npm run test:e2e     # E2E tests only
npm run test:visual  # Visual regression tests
npm run lint         # Check code style
npm run format       # Format code
```

### Testing

The project uses Playwright for testing with comprehensive coverage:

- **Unit Tests**: Pure logic (decay calculation, date utilities)
- **Integration Tests**: Storage layer and model interactions
- **E2E Tests**: Full user workflows across desktop, mobile, and tablet viewports
- **Visual Tests**: Screenshot comparisons for UI states

### Technology Stack

- **Frontend**: Vanilla JavaScript (ES modules)
- **Storage**: IndexedDB (client-side only)
- **PWA**: Service Worker with cache-first strategy
- **Testing**: Playwright
- **Linting**: ESLint + Prettier

## Architecture

YourScore is a **client-only** application with no server or backend. All data is stored locally in the browser using IndexedDB.

## Why Use YourScore

- **Data Protection First**: 100% client-side. No server, no cloud, no tracking.
- **Your Data Stays Yours**: Everything lives on your device. You are responsible for backups.
- **Offline-Ready**: Works without an internet connection.
- **Motivating, Not Punishing**: Score decay keeps momentum without nagging.

### Data Model

- **Score**: Persistent integer that can be positive or negative
- **Activities**: Tasks with point values organized by category
- **Completions**: Daily activity completion records
- **Achievements**: Unlocked milestones and badges
- **Settings**: User preferences (decay amount, theme, etc.)

### Key Concepts

- **Day Rollover**: Decay is applied when a new day is detected
- **First-Day Exemption**: No decay on the user's first day
- **Multi-Day Absence**: Accumulated decay for missed days
- **Streak Tracking**: Consecutive successful days

## License

MIT
