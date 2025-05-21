from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db import transaction
from .models import ConceptTile, UserPreference, SyncLog
from .serializers import ConceptTileSerializer, UserPreferenceSerializer, SyncLogSerializer

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
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Get the version from the request data
        incoming_version = request.data.get('version', None)
        
        # Check for concurrent modifications
        if incoming_version and int(incoming_version) != instance.version:
            return Response(
                {"detail": "Concept has been modified since last sync. Please refresh and try again."},
                status=status.HTTP_409_CONFLICT
            )
        
        response = super().update(request, *args, **kwargs)
        
        # Increment version on successful update
        if response.status_code == status.HTTP_200_OK:
            instance.version += 1
            instance.last_synced = timezone.now()
            instance.save()
        
        return response

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

class SyncView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    @transaction.atomic
    def post(self, request):
        device_id = request.data.get('device_id', 'unknown-device')
        concepts_data = request.data.get('concepts', [])
        
        # Create a sync log entry
        sync_log = SyncLog.objects.create(
            user=request.user,
            device_id=device_id,
            status='pending'
        )
        
        try:
            updated_items = 0
            conflicts = []
            
            for concept_data in concepts_data:
                concept_type = concept_data.get('concept_type')
                incoming_version = concept_data.get('version', 1)
                
                # Try to find existing concept
                try:
                    concept = ConceptTile.objects.get(
                        user=request.user, 
                        concept_type=concept_type
                    )
                    
                    # Check for version conflicts
                    if concept.version > incoming_version:
                        conflicts.append({
                            'concept_type': concept_type,
                            'server_version': concept.version,
                            'client_version': incoming_version
                        })
                        continue
                    
                    # Update the concept
                    serializer = ConceptTileSerializer(
                        concept, 
                        data=concept_data, 
                        partial=True
                    )
                    if serializer.is_valid():
                        serializer.save(
                            version=concept.version + 1,
                            last_synced=timezone.now()
                        )
                        updated_items += 1
                    
                except ConceptTile.DoesNotExist:
                    # Create new concept
                    serializer = ConceptTileSerializer(data=concept_data)
                    if serializer.is_valid():
                        serializer.save(
                            user=request.user,
                            version=1,
                            last_synced=timezone.now()
                        )
                        updated_items += 1
            
            # Update sync log
            if conflicts:
                sync_log.status = 'conflict'
                sync_log.error_message = f"Conflicts found: {len(conflicts)}"
            else:
                sync_log.status = 'complete'
            
            sync_log.items_synced = updated_items
            sync_log.save()
            
            # Get latest data to send back to client
            concepts = ConceptTile.objects.filter(user=request.user)
            concept_serializer = ConceptTileSerializer(concepts, many=True)
            
            return Response({
                'status': 'success' if not conflicts else 'conflict',
                'sync_id': sync_log.id,
                'items_synced': updated_items,
                'conflicts': conflicts,
                'concepts': concept_serializer.data
            })
            
        except Exception as e:
            sync_log.status = 'failed'
            sync_log.error_message = str(e)
            sync_log.save()
            
            return Response({
                'status': 'error',
                'sync_id': sync_log.id,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SyncLogListView(generics.ListAPIView):
    serializer_class = SyncLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return SyncLog.objects.filter(user=self.request.user).order_by('-sync_time')[:20]

class AuthStatusView(APIView):
    """Lightweight endpoint to check authentication status."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'authenticated': request.user.is_authenticated}, status=status.HTTP_200_OK)
