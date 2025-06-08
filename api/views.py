from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import UserPreference, User
from .serializers import UserPreferenceSerializer

# ConceptTile views removed - data is now stored locally
# SyncView and SyncLog views removed - no longer needed with local file storage

class UserPreferenceRetrieveUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            preferences = request.user.preferences
            serializer = UserPreferenceSerializer(preferences)
            return Response(serializer.data)
        except UserPreference.DoesNotExist:
            # Create default preferences if they don't exist
            preferences = UserPreference.objects.create(user=request.user)
            serializer = UserPreferenceSerializer(preferences)
            return Response(serializer.data)

    def patch(self, request):
        try:
            preferences = request.user.preferences
        except UserPreference.DoesNotExist:
            preferences = UserPreference.objects.create(user=request.user)

        serializer = UserPreferenceSerializer(preferences, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ClassmatesWorkView(APIView):
    """View for sharing concept previews with classmates (future feature)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.preferences.share_with_classmates:
            return Response({"message": "You must enable sharing to view classmates' work."}, status=status.HTTP_403_FORBIDDEN)

        # Find other users who are sharing their work
        classmates = User.objects.filter(
            preferences__share_with_classmates=True
        ).exclude(id=user.id)
        
        if not classmates.exists():
            return Response({"message": "No classmates are currently sharing their work."}, status=status.HTTP_200_OK)

        # Note: Since concept data is now stored locally, classmates sharing
        # would need to be implemented differently (e.g., through file sharing)
        classmates_data = []
        for classmate in classmates:
            classmates_data.append({
                "name": classmate.get_full_name() or classmate.email,
                "email": classmate.email,
                "message": "Concept sharing will be implemented in a future version"
            })

        return Response({
            "classmates": classmates_data,
            "message": "Note: With the new file-based storage system, classmates sharing will work through file exchange."
        })

class AuthStatusView(APIView):
    """Lightweight endpoint to check authentication status."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'authenticated': request.user.is_authenticated}, status=status.HTTP_200_OK)
