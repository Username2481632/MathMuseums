from django.urls import path
from . import views

urlpatterns = [
    # Main authentication flow
    path('', views.AdvancedAuthView.as_view(), name='auth_main'),
    path('login/', views.AdvancedAuthView.as_view(), name='advanced_auth'),
    path('email-check/', views.EmailCheckView.as_view(), name='email_check'),
    path('email-verification/', views.EmailVerificationView.as_view(), name='email_verification'),
    path('verification-status/', views.VerificationStatusView.as_view(), name='verification_status'),
    path('scan-email/', views.ScanVerificationEmailView.as_view(), name='scan_verification_email'),
    
    # Logout
    path('logout/', views.logout_view, name='logout'),
]
