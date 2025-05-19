from django.urls import path
from . import views

urlpatterns = [
    path('concepts/', views.ConceptTileListCreateView.as_view(), name='concept-list-create'),
    path('concepts/<int:pk>/', views.ConceptTileRetrieveUpdateDestroyView.as_view(), name='concept-detail'),
    path('preferences/', views.UserPreferenceRetrieveUpdateView.as_view(), name='user-preferences'),
]
