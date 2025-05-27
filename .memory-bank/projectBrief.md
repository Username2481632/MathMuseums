# Math Museums Project Brief

## Overview
An interactive vanilla HTML/CSS/JavaScript application for documenting and visualizing key Algebra 2 concepts in a draggable tile interface with Desmos API integration.

## Target Users
Students and educators seeking an interactive, offline-capable tool to connect visual representations, descriptions, and equations for Algebra 2 concepts.

## Core Requirements
- Home page displaying draggable tiles for the following concepts:
  • Linear
  • Quadratic
  • Cubic
  • Square & Cube Root
  • Absolute-Value
  • Rational/Inverse
  • Exponential
  • Logarithmic
  • Trigonometric
  • Piecewise
  Each tile renders the user's Desmos graph (uploaded image plus visible equations), which means a blank Desmos calculator if no work exists.
  Tiles are:
    - Clickable to open the detail view for editing
    - Long-pressable (2s) to enter drag mode and reposition freely on the home screen
    - Persistently saved in their user-defined positions across sessions
- Detail view for each concept featuring:
  - Desmos graphing calculator for equation input and overlay
  - Image upload functionality (via Desmos) with lossless IndexedDB storage and localStorage fallback
  - Text description input area
  - "Mark as Complete"/"Mark as in Progress" button and navigation back to home
- Onboarding flow in each concept detail view after 10 seconds of user idle (no mouse/keyboard/touch/Desmos interactions) when session onboarding is not disabled and persistent onboarding is not disabled:
  - For new users (no `imageSkill` flag): trigger full onboarding without a "Do Not Show This Again" option
  - For experienced users (with `imageSkill` flag): trigger onboarding with an additional "Hide + Never Show Again" button that, if clicked, terminates the current onboarding flow and sets a persistent disable-onboarding flag
  - Steps for both flows:
    1. Circle the "+" button in red (select via `button[aria-label="Add Item"]`)
    2. Position an arrow and text label ("Click here to add an image") above that button
    3. Upon clicking the "+" button, circle the image add button (select via `button[aria-label="Add image"]`), keeping the instruction text unchanged
    4. After an image is detected in the Desmos calculator state (via `getState()` expressions list), remove all onboarding highlights, arrows, and instruction text, then disable onboarding for the session (and persistently if the user clicked "Hide + Never Show Again")
- Cross-device synchronization: 
  - User authentication with email OTP for secure login
  - Server-side storage of user concepts, positions, and preferences
  - Automatic synchronization between devices
  - Offline capability with re-sync when connection is restored

## Technical Context
- Vanilla ES6+ JavaScript, HTML5, CSS3
- Desmos API for graphing and image integration
  - Use `GraphingCalculator.getState()` and inspect `state.expressions.list` for any objects with `type === 'image'` to detect uploaded images
- IndexedDB/localStorage for durability and redundancy
- Django 5.0.7 for server-side functionality
- PostgreSQL for server-side database storage
- Email OTP authentication for cross-device synchronization
- No additional frontend frameworks or build steps

## Timeline
- Project started: May 7, 2025
- Last updated: May 18, 2025
- Target completion: May 20, 2025

---

## [Added from documentation/implementation-report.md]

### Implementation Status Table

| Feature                         | Status      | Notes                                                 |
|---------------------------------|-------------|-------------------------------------------------------|
| Authentication Client           | ✅ Complete | auth.js module with session handling                   |
| Sync Client                     | ✅ Complete | sync.js module with conflict handling                 |
| Preferences Client              | ✅ Complete | preferences.js module with server sync                |
| Storage Enhancements            | ✅ Complete | Added sync tracking to storage.js                     |
| Sync Status UI                  | ✅ Complete | Added indicator in bottom right corner                |
| Manual Sync Button              | ✅ Complete | Added button in navigation bar                        |
| Onboarding Integration          | ✅ Complete | Updated to use preferences client                     |
| Conflict Detection              | ✅ Complete | Using version field for optimistic concurrency        |
| Conflict Resolution (Basic)     | ✅ Complete | Server-side "newest wins" strategy                    |
| Conflict Resolution (Advanced)  | ⏳ Pending  | User interface for conflict resolution                |
| Offline Detection               | ✅ Complete | Using navigator.onLine and event listeners            |
| Background Sync                 | ✅ Complete | Periodic sync and online event handling               |
| Documentation                   | ✅ Complete | API integration docs in documentation/               |
| Unit Tests                      | ⏳ Pending  | Need to add proper JavaScript unit tests              |

### Testing Status Table

| Test Scenario                   | Status      | Notes                                                 |
|---------------------------------|-------------|-------------------------------------------------------|
| Authentication Flow             | ✅ Passed   | Login redirect and session handling work              |
| Data Synchronization            | ✅ Passed   | Changes sync between devices                          |
| Offline Operation               | ✅ Passed   | Changes persist and sync when online                  |
| Conflict Detection              | ✅ Passed   | Version conflicts detected correctly                  |
| Conflict Resolution             | ✅ Passed   | Server-side resolution works                          |
| Background Sync                 | ✅ Passed   | Auto-sync works after specified interval              |
| Manual Sync                     | ✅ Passed   | Sync button triggers synchronization                  |
| Cross-Browser Compatibility     | ⏳ Pending  | Need to test in multiple browsers                     |
| Performance Testing             | ⏳ Pending  | Need to test with larger datasets                     |
