from rest_framework import serializers
from .models import ConceptTile, UserPreference

class ConceptTileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConceptTile
        fields = [
            'id', 'concept_type', 'position_x', 'position_y', 'width', 'height',
            'desmos_state', 'description', 'is_complete', 'updated_at', 'created_at'
        ]

class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = ['onboarding_disabled', 'theme']
