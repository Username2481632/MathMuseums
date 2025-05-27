# Product Context

## Purpose

The Math Museums project creates an interactive, visual learning environment for Algebra 2 concepts. It serves as a personal museum where students can:
- Visualize abstract mathematical relationships through Desmos graphs
- Document their understanding through both equations and text descriptions
- Organize concepts spatially in a way that makes sense to them
- Access their work across multiple devices through synchronization
- Continue working offline with automatic syncing when reconnected

The project solves the problem of disconnection between symbolic math notation and visual/conceptual understanding that many students struggle with, while ensuring their work is accessible anywhere.

## User Experience Goals

- Create a clean, distraction-free interface that puts focus on mathematical concepts
- Enable intuitive interactions (dragging, clicking) with minimal UI elements
- Provide progressive guidance through the onboarding flow without overwhelming
- Support personalization through spatial arrangement of concepts
- Ensure persistence of user work with robust server-based storage and offline capability
- Maximize available space for content layout while maintaining readability
- Provide clear visual feedback during user interactions
- Seamlessly synchronize user data across multiple devices
- Provide a frictionless authentication experience

## Scope

In scope:
- Home page with draggable concept tiles
- Detail views with Desmos integration, image upload, and text descriptions
- Server-side storage using Django and PostgreSQL
- Client-side storage using IndexedDB with localStorage fallback for offline capability
- Synchronization between devices
- User authentication with email OTP verification
- Onboarding flows for new and returning users
- Desktop-first experience with clean design aesthetics
- Space-efficient interface with maximized usable area
- Consistent visual feedback during interactions

Out of scope:
- Mobile-optimized interactions (though basic responsiveness will be maintained)
- Real-time collaboration features
- Advanced customization beyond tile positioning
- Localization (English text only)
- Social sharing capabilities

## Interface Design

- **Home View**: Maximizes available space for tile layout with zero margins/padding
- **Detail View**: Maintains comfortable margins for readability of mathematical content
- **Interactive Elements**: Provide blue highlight during drag/resize operations
- **Navigation**: Clean, minimalist header with fixed positioning
- **Tile Design**: Simple, card-based design with clear visual hierarchy
- **Visual Feedback**: Consistent styling cues for all interaction states
- **Authentication**: Minimalist shared interface for login/signup with email focus
- **User Indicators**: Subtle indication of login status without cluttering the interface

---

## [Added from documentation/api-integration-implementation.md]

### User Experience and Integration Notes
- The API integration enables seamless authentication and cross-device synchronization.
- The onboarding flow is now tied to user preferences and can be disabled per user.
- The sync status indicator and manual sync button provide clear feedback and control to users.
- Offline-first strategy ensures users can work without interruption and sync later.

---

## [Added from documentation/api-integration-status.md]

### API Integration User Experience
- Authentication and sync are now transparent to the user, with automatic background sync and clear status indicators.
- Preferences and onboarding are consistent across devices.
- Known issues: No robust conflict resolution UI yet; some browsers may limit background sync in inactive tabs.
