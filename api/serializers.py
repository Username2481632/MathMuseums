from rest_framework import serializers
from .models import UserPreference

# ConceptTileSerializer removed - data is now stored locally
# SyncLogSerializer removed - no longer needed with local file storage

class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = ['onboarding_disabled', 'theme', 'share_with_classmates', 'aspect_ratio_width', 'aspect_ratio_height', 'screen_fit']
