from django.db import models
from authentication.models import User

# Create your models here.

# ConceptTile model removed - data is now stored locally in user files
# SyncLog model removed - no longer needed with local file storage

class UserPreference(models.Model):
    """Simple user preferences that remain server-side"""
    user = models.OneToOneField(User, on_delete=models.PROTECT, related_name='preferences')
    onboarding_disabled = models.BooleanField(default=False)
    theme = models.CharField(max_length=20, default='light')
    share_with_classmates = models.BooleanField(default=True)  # For future classmates feature
    aspect_ratio_width = models.IntegerField(default=1)  # Default to 1:1 aspect ratio
    aspect_ratio_height = models.IntegerField(default=1)
    screen_fit = models.CharField(max_length=10, default='fit', choices=[('fit', 'Fit'), ('fill', 'Fill')])

    def __str__(self):
        return f"Preferences for {self.user.email}"
