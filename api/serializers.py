from rest_framework import serializers
from .models import ConceptTile, UserPreference, SyncLog

class ConceptTileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConceptTile
        fields = [
            'id', 'concept_type', 'position_x', 'position_y', 'width', 'height',
            'desmos_state', 'description', 'is_complete', 'updated_at', 'created_at',
            'last_synced', 'version'
        ]
        read_only_fields = ['created_at', 'updated_at', 'last_synced']

class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = ['onboarding_disabled', 'theme', 'share_with_classmates', 'aspect_ratio_width', 'aspect_ratio_height', 'screen_fit']

class SyncLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncLog
        fields = ['id', 'device_id', 'sync_time', 'status', 'items_synced', 'error_message']
        read_only_fields = ['sync_time']
