from django.urls import path
from . import views

urlpatterns = [
    # Legacy OTP authentication (keeping for backwards compatibility)
    path('request/', views.auth_request_view, name='auth_request'),
    path('verify/', views.verify_otp_view, name='verify_otp'),
    
    # Advanced Login Flow
    path('login/', views.AdvancedAuthView.as_view(), name='advanced_auth'),
    path('email-check/', views.EmailCheckView.as_view(), name='email_check'),
    path('email-verification/', views.EmailVerificationView.as_view(), name='email_verification'),
    path('verification-status/', views.VerificationStatusView.as_view(), name='verification_status'),
    path('scan-email/', views.ScanVerificationEmailView.as_view(), name='scan_verification_email'),
    
    # Logout
    path('logout/', views.logout_view, name='logout'),
]
