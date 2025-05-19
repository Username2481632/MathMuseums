from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import ConceptTile, UserPreference
from .serializers import ConceptTileSerializer, UserPreferenceSerializer

# Create your views here.

class ConceptTileListCreateView(generics.ListCreateAPIView):
    serializer_class = ConceptTileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ConceptTile.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ConceptTileRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ConceptTileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ConceptTile.objects.filter(user=self.request.user)

class UserPreferenceRetrieveUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        prefs, _ = UserPreference.objects.get_or_create(user=request.user)
        serializer = UserPreferenceSerializer(prefs)
        return Response(serializer.data)

    def put(self, request):
        prefs, _ = UserPreference.objects.get_or_create(user=request.user)
        serializer = UserPreferenceSerializer(prefs, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
