# Active Context

## Current Focus

- Implementing email OTP authentication system with shared login/signup UI
- Creating custom user model with email as primary field
- Implementing OTP generation, sending, and verification
- Developing authentication views and endpoints
- Testing the authentication flow end-to-end

## Recent Changes

- Successfully configured PostgreSQL database for server-side storage:
  - Set up local PostgreSQL instance using Podman container
  - Updated Django settings to use PostgreSQL with environment variables
  - Migrated database schema to PostgreSQL
  - Added django-extensions for better development tools
  - Created database documentation
- Removed padding and margins from the home page to maximize usable space:
  - Eliminated padding in #app-container
  - Removed margin-top from .tiles-container
  - Adjusted height calculation to use more vertical space
  - Set container padding values to 0 in getContainerPadding()
  - Added blue highlight effect during tile dragging to match resize styling
- Restored margins for detail views while keeping zero margins for home view
- Created view-specific styling to ensure proper appearance across different views
- Modified header padding to be more compact
- Ensured consistent visual feedback during user interactions:
  - Blue highlight during both resizing and dragging operations
  - Consistent cursor styling for different interaction modes
- Fixed navigation between views with proper resource cleanup
- Removed extraneous files and backup history
- Ensured all controllers have proper cleanup methods
- Implemented proper Desmos preview image generation for tile grid
- Added resource cleanup to prevent memory leaks during navigation
- Enhanced error handling and loading states for preview images

## Active Decisions

- Moving to PostgreSQL for the database backend (over MariaDB) due to its robust features for storing JSON data
- Using email as the primary user identifier with OTP authentication for simplicity and security
- Maintaining existing client-side storage as a fallback for offline functionality
- Implementing a REST API pattern for syncing data between client and server
- Adopting a shared UI for login/signup, with backend logic to determine the appropriate action

## Next Steps

1. Implement the email OTP authentication system (Step 3):
   - Create custom user model with email as primary field
   - Implement OTP generation and validation
   - Create authentication views and templates
   - Set up email sending functionality
   - Test authentication flow end-to-end
2. Define database models for user data and concept information (Step 4)
3. Develop REST API endpoints for data synchronization (Step 5)
4. Modify frontend for API integration (Step 6)
5. Deploy to HelioHost (Step 7)

## Decisions Made

- Fixed tile sizes: 250px width × 200px height
- Default tile layout: 3 columns with padding
- Drag behavior: Direct positioning without animations for precise control
- Z-index management: Higher z-index during drag, reset afterward
- Drag cooldown: 300ms delay before clicks are registered after dragging
