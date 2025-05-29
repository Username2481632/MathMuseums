from django.urls import path
from .views import (
    ConceptTileListCreateView, ConceptTileRetrieveUpdateDestroyView, 
    UserPreferenceRetrieveUpdateView, SyncView, SyncLogListView, AuthStatusView,
    ClassmatesWorkView
)

urlpatterns = [
    path('concepts/', ConceptTileListCreateView.as_view(), name='concepttile-list-create'),
    path('concepts/<int:pk>/', ConceptTileRetrieveUpdateDestroyView.as_view(), name='concepttile-retrieve-update-destroy'),
    path('preferences/', UserPreferenceRetrieveUpdateView.as_view(), name='userpreference-retrieve-update'),
    path('sync/', SyncView.as_view(), name='sync'),
    path('sync/logs/', SyncLogListView.as_view(), name='sync-log-list'),
    path('auth/status/', AuthStatusView.as_view(), name='auth-status'),
    path('classmates/work/', ClassmatesWorkView.as_view(), name='classmates-work'),
]
