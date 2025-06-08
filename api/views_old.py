from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.db import transaction
from .models import ConceptTile, UserPreference, SyncLog, User # Added User
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
        from django.db import transaction
        
        with transaction.atomic():
            instance = self.get_object()
            
            # Get the version from the request data
            incoming_version = request.data.get('version', None)
            
            # Check for concurrent modifications
            if incoming_version and int(incoming_version) != instance.version:
                return Response(
                    {"detail": "Concept has been modified since last sync. Please refresh and try again."},
                    status=status.HTTP_409_CONFLICT
                )
            
            # Store the current version for incrementing
            current_version = instance.version
            
            response = super().update(request, *args, **kwargs)
            
            # Increment version on successful update
            if response.status_code == status.HTTP_200_OK:
                # Refresh from database to get the updated instance
                instance.refresh_from_db()
                instance.version = current_version + 1
                instance.last_synced = timezone.now()
                instance.save(update_fields=['version', 'last_synced'])
            
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
            conflicts_resolved = 0
            errors = []
            
            for concept_data in concepts_data:
                concept_type = concept_data.get('concept_type')
                incoming_version = concept_data.get('version', 1)
                incoming_updated_at = concept_data.get('updated_at')
                
                # Try to find existing concept
                try:
                    concept = ConceptTile.objects.select_for_update().get(
                        user=request.user, 
                        concept_type=concept_type
                    )
                    
                    # Enhanced conflict resolution: use timestamp if versions conflict
                    version_conflict = concept.version > incoming_version
                    timestamp_conflict = False
                    
                    if incoming_updated_at:
                        if isinstance(incoming_updated_at, str):
                            incoming_time = parse_datetime(incoming_updated_at)
                        else:
                            incoming_time = incoming_updated_at
                            
                        if incoming_time and concept.updated_at > incoming_time:
                            timestamp_conflict = True
                    
                    # If there's a conflict, resolve using the most recent timestamp
                    if version_conflict or timestamp_conflict:
                        if timestamp_conflict and not version_conflict:
                            # Server data is newer, skip client update but log it
                            conflicts_resolved += 1
                            continue
                        elif version_conflict and incoming_updated_at:
                            # Check if client data is actually newer despite version conflict
                            if isinstance(incoming_updated_at, str):
                                incoming_time = parse_datetime(incoming_updated_at)
                            else:
                                incoming_time = incoming_updated_at
                                
                            if incoming_time and incoming_time > concept.updated_at:
                                # Client data is newer, allow the update
                                conflicts_resolved += 1
                            else:
                                # Server data is newer, skip
                                conflicts_resolved += 1
                                continue
                        else:
                            # No timestamp available, skip to avoid data loss
                            conflicts_resolved += 1
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
                    else:
                        errors.append(f"Validation error for {concept_type}: {serializer.errors}")
                    
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
                    else:
                        errors.append(f"Validation error for new {concept_type}: {serializer.errors}")
            
            # Update sync log
            if errors:
                sync_log.status = 'failed'
                sync_log.error_message = '; '.join(errors[:5])  # Limit error message length
            elif conflicts_resolved > 0:
                sync_log.status = 'complete'
                sync_log.error_message = f"Resolved {conflicts_resolved} conflicts using timestamps"
            else:
                sync_log.status = 'complete'
            
            sync_log.items_synced = updated_items
            sync_log.save()
            
            # Get latest data to send back to client
            concepts = ConceptTile.objects.filter(user=request.user)
            concept_serializer = ConceptTileSerializer(concepts, many=True)
            
            return Response({
                'status': 'success',
                'sync_id': sync_log.id,
                'items_synced': updated_items,
                'conflicts_resolved': conflicts_resolved,
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

class ClassmatesWorkView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.preferences.share_with_classmates:
            return Response({"message": "You have not opted in to share your work."}, status=status.HTTP_403_FORBIDDEN)

        # Get 5 random users who have opted in, excluding the current user
        classmates = User.objects.filter(
            preferences__share_with_classmates=True
        ).exclude(pk=user.pk).order_by('?')[:5]

        if not classmates.exists():
            return Response({"message": "No classmates are currently sharing their work."}, status=status.HTTP_200_OK)

        classmates_tiles = ConceptTile.objects.filter(user__in=classmates)
        serializer = ConceptTileSerializer(classmates_tiles, many=True)
        return Response(serializer.data)

class AuthStatusView(APIView):
    """Lightweight endpoint to check authentication status."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'authenticated': request.user.is_authenticated}, status=status.HTTP_200_OK)
