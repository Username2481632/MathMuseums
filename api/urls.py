from django.urls import path
from . import views

urlpatterns = [
    path('concepts/', views.ConceptTileListCreateView.as_view(), name='concept-list-create'),
    path('concepts/<int:pk>/', views.ConceptTileRetrieveUpdateDestroyView.as_view(), name='concept-detail'),
    path('preferences/', views.UserPreferenceRetrieveUpdateView.as_view(), name='user-preferences'),
    path('sync/', views.SyncView.as_view(), name='sync'),
    path('sync/logs/', views.SyncLogListView.as_view(), name='sync-logs'),
    path('auth/status/', views.AuthStatusView.as_view(), name='auth-status'),
]
