# Active Context

## Current Focus

- Developing REST API endpoints for user data and concept synchronization
- Preparing serializers and views for ConceptTile and UserPreference
- Planning API authentication and permissions

## Recent Changes

- Implemented ConceptTile and UserPreference models in the api app
- Applied migrations for new models
- Updated progress and documentation

## Active Decisions

- Moving to PostgreSQL for the database backend (over MariaDB) due to its robust features for storing JSON data
- Using email as the primary user identifier with OTP authentication for simplicity and security
- Maintaining existing client-side storage as a fallback for offline functionality
- Implementing a REST API pattern for syncing data between client and server
- Adopting a shared UI for login/signup, with backend logic to determine the appropriate action

## Next Steps

1. Implement REST API endpoints for user data and concept synchronization (Step 5)
2. Modify frontend for API integration (Step 6)
3. Deploy to HelioHost (Step 7)

## Decisions Made

- Fixed tile sizes: 250px width × 200px height
- Default tile layout: 3 columns with padding
- Drag behavior: Direct positioning without animations for precise control
- Z-index management: Higher z-index during drag, reset afterward
- Drag cooldown: 300ms delay before clicks are registered after dragging
