from django.urls import path
from . import views

urlpatterns = [
    path('request/', views.auth_request_view, name='auth_request'),
    path('verify/', views.verify_otp_view, name='verify_otp'),
    path('logout/', views.logout_view, name='logout'),
]
