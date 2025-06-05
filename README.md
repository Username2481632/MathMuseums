# MathMuseums

A Django-based web application for creating and managing interactive mathematical concept displays with tile-based layouts.

## Quick Start

### Prerequisites
- Python 3.8+
- MySQL/MariaDB
- Node.js (for any frontend build tools, if needed)

### Setup

1. **Clone and navigate to the project:**
   ```bash
   git clone <repository-url>
   cd MathMuseums
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Database setup:**
   ```bash
   # Create database (adjust for your MySQL setup)
   mysql -u root -p -e "CREATE DATABASE mathmuseums;"
   mysql -u root -p -e "CREATE USER 'mathmuseums_user'@'localhost' IDENTIFIED BY 'development_password';"
   mysql -u root -p -e "GRANT ALL PRIVILEGES ON mathmuseums.* TO 'mathmuseums_user'@'localhost';"
   
   # Run migrations
   python manage.py migrate
   ```

5. **Create superuser (optional):**
   ```bash
   python manage.py createsuperuser
   ```

6. **Run the development server:**
   ```bash
   python manage.py runserver
   ```

7. **Access the application:**
   - Main app: http://localhost:8000
   - Admin panel: http://localhost:8000/admin

## Environment Configuration

Copy `.env.example` to `.env` and configure:

```properties
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_NAME=mathmuseums
DATABASE_USER=mathmuseums_user
DATABASE_PASSWORD=your-password-here
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306

# Email verification modes:
# Set EMAIL_VERIFICATION_MODE=dummy for testing (auto-verifies after 20 seconds)
# Set EMAIL_VERIFICATION_MODE=imap for real email verification
EMAIL_VERIFICATION_MODE=dummy

# IMAP settings (only needed if EMAIL_VERIFICATION_MODE=imap)
VERIFICATION_IMAP_HOST=your-imap-host
VERIFICATION_IMAP_PORT=993
VERIFICATION_IMAP_USER=your-email@domain.com
VERIFICATION_IMAP_PASSWORD=your-password

DEFAULT_FROM_EMAIL=noreply@localhost
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
```

## Features

- **Tile-based Layout System**: Drag and resize mathematical concept tiles
- **Responsive Design**: Adaptive layouts with configurable aspect ratios
- **User Authentication**: Email-based registration and login
- **Coordinate System**: Center-based percentage positioning for consistent scaling
- **Undo/Redo**: Full layout editing history with keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- **Display Settings**: Fit/Fill modes and custom aspect ratios

## Development

### Project Structure
```
MathMuseums/
├── api/                    # Django REST API app
├── authentication/        # User auth and email verification
├── mathmuseums/           # Django project settings
├── static/
│   ├── css/              # Stylesheets
│   ├── js/               # Frontend JavaScript
│   │   ├── controllers/  # Page controllers
│   │   ├── managers/     # Feature managers (drag, resize, undo)
│   │   ├── models/       # Data models
│   │   └── utils/        # Utility functions
│   └── img/              # Images and icons
├── templates/            # HTML templates
└── requirements.txt      # Python dependencies
```

### Key Components

- **ConceptModel**: Manages tile data and coordinates
- **CoordinateUtils**: Handles percentage ↔ pixel conversions
- **DragManager**: Tile dragging with boundary constraints
- **ResizeManager**: Tile resizing functionality
- **UndoRedoManager**: Layout editing history
- **PreferencesClient**: User settings and display preferences

### Testing

- **Coordinate Test**: http://localhost:8000/static/test-coordinates.html
- **Scaling Test**: Open `test-scaling.html` in browser

### Email Verification Modes

1. **Dummy Mode** (`EMAIL_VERIFICATION_MODE=dummy`):
   - Automatically verifies emails after 20 seconds
   - Perfect for development and testing
   - No external email service required

2. **IMAP Mode** (`EMAIL_VERIFICATION_MODE=imap`):
   - Connects to real email server
   - Requires valid IMAP credentials
   - Use for production or testing with real emails

### Common Tasks

**Reset database:**
```bash
python manage.py flush
python manage.py migrate
```

**Create test data:**
```bash
python manage.py shell
# Then create some test concepts via Django ORM
```

**View logs:**
```bash
tail -f mathmuseums.log  # If logging to file
```

## Troubleshooting

### Common Issues

1. **Database connection errors:**
   - Check MySQL service is running
   - Verify database credentials in `.env`
   - Ensure database exists

2. **Email verification not working:**
   - For development, use `EMAIL_VERIFICATION_MODE=dummy`
   - Check IMAP settings if using real email

3. **Tiles not positioning correctly:**
   - Check browser console for JavaScript errors
   - Verify coordinate system is using center-based percentages
   - Test with `/static/test-coordinates.html`

4. **Undo/Redo not working:**
   - Check that `getCurrentLayoutState()` and `restoreLayoutState()` use center coordinates
   - Verify localStorage is available

### Debug Mode

Enable detailed logging by setting `DEBUG=True` in `.env` and checking the browser console.

## API Endpoints

- `GET /api/concepts/` - List all concepts
- `POST /api/concepts/` - Create new concept
- `PUT /api/concepts/{id}/` - Update concept
- `DELETE /api/concepts/{id}/` - Delete concept
- `GET /api/preferences/` - Get user preferences
- `PUT /api/preferences/` - Update user preferences

## Contributing

1. Create feature branch
2. Make changes
3. Test with both dummy and real email verification
4. Submit pull request

## License

[Add your license here]
