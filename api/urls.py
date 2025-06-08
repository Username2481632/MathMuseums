from django.urls import path
from .views import (
    UserPreferenceRetrieveUpdateView, 
    ClassmatesWorkView,
    AuthStatusView
)

# ConceptTile and Sync endpoints removed - data is now stored locally

urlpatterns = [
    path('preferences/', UserPreferenceRetrieveUpdateView.as_view(), name='userpreference-retrieve-update'),
    path('classmates/work/', ClassmatesWorkView.as_view(), name='classmates-work'),
    path('auth/status/', AuthStatusView.as_view(), name='auth-status'),
]
