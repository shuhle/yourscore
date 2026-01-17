# YourScore

Turn daily habits into points, streaks, and achievements with a PWA that works offline and keeps your data on your device.

## Screenshots

![Daily view](docs/screenshots/daily-view.png)
![Dashboard](docs/screenshots/dashboard-view.png)

## Why YourScore

- **Client-only by design**: No server, no account, no tracking.
- **Offline-first**: Works anywhere once installed.
- **Momentum over guilt**: Daily decay nudges you forward without nagging.
- **Built for long runs**: Streaks, milestones, and recovery achievements.

## Quick Start (Development)

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

## Install as a PWA

The app can be installed on your device for quick access:
- **Desktop**: Click the install icon in your browser's address bar
- **Mobile**: Use "Add to Home Screen" from your browser's menu

## How It Works

- **Main score** carries between days, positive or negative.
- **Daily decay** applies once per day (first day is free).
- **Break-even** is today’s points vs. decay target.
- **Completions** are one per activity per day, with quick undo.

## Development

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

Playwright covers unit, integration, end-to-end, and visual regression tests across viewports.

## License

MIT
