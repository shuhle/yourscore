# YourScore - Features Specification

## Core Concept
A Progressive Web App (PWA) that gamifies daily habit tracking through a scoring system. Users earn points by completing activities and must maintain positive momentum against daily score decay.

## Key Definitions
- **Main Score**: A persistent integer that carries over between days. Can be positive or negative.
- **Daily Decay**: A configurable penalty subtracted from the Main Score when a new day is detected.
- **Break Even**: Earning enough points in a day to offset the decay (earned points >= decay amount).
- **Successful Day**: A day where the user earned points >= the daily decay amount.
- **Day Rollover**: The moment when the app detects that the calendar day has changed since last use.

## Initial State
- New users start with a Main Score of **0**
- No decay is applied on the first day of use
- Decay begins applying from day 2 onwards

## Core Features

### 1. Activity Management
- **Create Custom Activities**
  - Name and description
  - Assign point value (positive integer)
  - Assign category
  - Activities can only be completed once per day

- **Edit/Delete Activities**
  - Modify existing activities
  - Archive instead of delete to preserve historical data

- **Activity Templates**
  - Pre-defined common activities for quick setup
  - Examples: "Early wake up", "Exercise 30min", "Read 30min", "Meditation"

### 2. Daily Tracking
- **Mark Activities as Complete**
  - Simple checkbox/tap interface
  - Each activity completable once per day
  - Timestamp when completed
  - Visual feedback on score addition

- **Daily View**
  - See all available activities for the day
  - Track completion status
  - Group activities by category
  - Display current day's earned score
  - Show remaining score needed to break even (offset today's decay)
  - If already broken even, show surplus points earned

- **Undo/Edit Completions**
  - Allow corrections for mistakes
  - Maintain completion history

### 3. Scoring System
- **Main Score**
  - Persistent score that carries over daily
  - Visual prominence (large number display)
  - Color-coded based on value (green for positive, red for negative)

- **Daily Score Decay**
  - User-configurable daily penalty amount
  - **Applied on app open**: When the app opens and detects one or more day rollovers since last use, decay is calculated and applied
  - **Multi-day absence**: Decay accumulates retroactively (e.g., 3 days away = 3x decay applied)
  - Visual indicator showing decay amount and any accumulated decay applied

### 4. Category Management
- **CRUD Operations**
  - Create new categories
  - Rename existing categories
  - Delete categories (activities are moved to "Uncategorized")
  - Reorder categories for display priority

- **Default Categories**
  - Pre-populated categories available: Morning, Work, Evening, Health, Learning
  - User can modify or delete default categories
  - "Uncategorized" category always exists and cannot be deleted

### 5. Gamification Elements

- **Achievements/Badges**
  - Score milestones: Reach 100, 500, 1000 points
  - Streak achievements: Complete X successful days in a row (where successful = earned >= decay)
  - Perfect weeks: Complete all activities every day for 7 consecutive days
  - Recovery achievements: Bounce back from negative to positive score
  - Note: Activity-based achievements require at least one activity to exist

- **Visual Feedback**
  - Animations on activity completion
  - Score increase/decrease animations
  - Celebratory effects for milestones

### 6. Analytics & Insights
- **Dashboard**
  - Current score (large, prominent)
  - Today's progress vs. break-even target
  - Current streak (consecutive successful days)
  - Most/least completed activities (past 30 days)

### 7. User Settings & Customization
- **Daily Decay Configuration**
  - Set/adjust daily score penalty
  - Set/adjust value of Main Score

- **Theme Customization**
  - Light/dark mode
  - UI scale (adjust overall interface size, similar to browser zoom)

- **Data Management**
  - Export data (JSON/CSV)
  - Import data
  - Reset/clear history

### 8. PWA-Specific Features
- **Offline Support**
  - Full functionality without internet
  - Local data store only (user can use Export/Import to transfer complete state to other device)
  - No server part / no server logic / no server database - all data is stored on the client device / browser storage

- **Install to Home Screen**
  - Works like a native app
  - App icon and splash screen

- **Fast Loading**
  - Service worker caching
  - Optimized performance

- **Responsive Design**
  - Works on phone, tablet, desktop
  - Touch-optimized interface

## Technical Considerations
- **Data Storage**: IndexedDB or localStorage
- **Framework**: Plain JavaScript + PWA manifest
- **Offline**: Service Worker with cache strategies
- **Time Handling**: All times in user's local timezone; day rollover detected by comparing stored last-active date with current date
