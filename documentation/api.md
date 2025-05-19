# API Documentation for Math Museums

## Authentication

All API endpoints require authentication. The authentication system uses Django's session-based authentication.

### Login

**Endpoint:** `/auth/request/`

**Method:** POST

**Parameters:**
- `email`: The user's email address

**Response:**
- Redirects to `/auth/verify/` if successful
- Returns error message if invalid

### Verify OTP

**Endpoint:** `/auth/verify/`

**Method:** POST

**Parameters:**
- `otp`: The OTP code sent to the user's email

**Response:**
- Redirects to `/` if successful
- Returns error message if invalid

### Logout

**Endpoint:** `/auth/logout/`

**Method:** POST

**Response:**
- Redirects to `/auth/request/`

## Concept Tiles

### List/Create Concept Tiles

**Endpoint:** `/api/concepts/`

**Method:** GET/POST

**GET Response:**
```json
[
  {
    "id": 1,
    "concept_type": "linear",
    "position_x": 100,
    "position_y": 200,
    "width": 250,
    "height": 200,
    "desmos_state": { /* Desmos calculator state */ },
    "description": "Linear function exploration",
    "is_complete": false,
    "updated_at": "2025-05-19T12:00:00Z",
    "created_at": "2025-05-18T10:00:00Z",
    "last_synced": "2025-05-19T12:00:00Z",
    "version": 1
  }
]
```

**POST Parameters:**
- `concept_type`: String, one of: 'linear', 'quadratic', 'cubic', 'sqrt', 'cbrt', 'abs', 'rational', 'exponential', 'logarithmic', 'trigonometric', 'piecewise'
- `position_x`: Integer, x-coordinate for the tile
- `position_y`: Integer, y-coordinate for the tile
- `width`: Integer, width of the tile (default: 250)
- `height`: Integer, height of the tile (default: 200)
- `desmos_state`: JSON object representing Desmos calculator state
- `description`: String, description of the concept
- `is_complete`: Boolean, whether the concept is marked as complete

### Retrieve/Update/Delete Concept Tile

**Endpoint:** `/api/concepts/:id/`

**Methods:** GET/PUT/DELETE

**PUT Parameters:**
Same as POST parameters for creation, plus:
- `version`: Integer, current version of the concept tile for optimistic concurrency control

**Response:**
- 200 OK with updated data if successful
- 409 Conflict if the version has changed

## User Preferences

### Get/Update User Preferences

**Endpoint:** `/api/preferences/`

**Methods:** GET/PUT

**GET Response:**
```json
{
  "onboarding_disabled": false,
  "theme": "light"
}
```

**PUT Parameters:**
- `onboarding_disabled`: Boolean, whether onboarding should be disabled
- `theme`: String, theme preference (default: 'light')

## Synchronization

### Sync Data

**Endpoint:** `/api/sync/`

**Method:** POST

**Parameters:**
- `device_id`: String, unique identifier for the device
- `concepts`: Array of concept tile data to sync

**Response:**
```json
{
  "status": "success",
  "sync_id": 1,
  "items_synced": 3,
  "conflicts": [],
  "concepts": [ /* Latest concept data from server */ ]
}
```

### List Sync Logs

**Endpoint:** `/api/sync/logs/`

**Method:** GET

**Response:**
```json
[
  {
    "id": 1,
    "device_id": "browser-chrome-123",
    "sync_time": "2025-05-19T12:00:00Z",
    "status": "complete",
    "items_synced": 3,
    "error_message": ""
  }
]
```

## Implementation Notes

1. **Offline-First Strategy:**
   - The frontend should continue to use client-side storage (IndexedDB) as the primary data store
   - Sync with the server when online
   - Handle conflicts with a "newest wins" approach or by presenting the user with options

2. **Optimistic Concurrency Control:**
   - Each concept has a version field that increments on update
   - Send the version when updating to detect concurrent modifications
   - Handle 409 Conflict responses by refreshing data

3. **Error Handling:**
   - Store failed sync attempts locally
   - Retry failed syncs automatically when online
   - Log sync issues for debugging
