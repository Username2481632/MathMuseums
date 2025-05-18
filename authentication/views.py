from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import login, logout
from .models import User
from .utils import create_otp_for_user, send_otp_email, validate_otp

def auth_request_view(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        if not email:
            messages.error(request, 'Please enter your email address.')
            return render(request, 'authentication/auth_request.html')
        user, created = User.objects.get_or_create(email=email)
        otp = create_otp_for_user(user)
        send_otp_email(user, otp.code)
        request.session['auth_email'] = email
        messages.success(request, f'An OTP has been sent to {email}.')
        return redirect('verify_otp')
    return render(request, 'authentication/auth_request.html')

def verify_otp_view(request):
    email = request.session.get('auth_email')
    if not email:
        return redirect('auth_request')
    if request.method == 'POST':
        code = request.POST.get('otp')
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            messages.error(request, 'User not found.')
            return redirect('auth_request')
        if validate_otp(user, code):
            login(request, user)
            messages.success(request, 'Authentication successful!')
            return redirect('/')
        else:
            messages.error(request, 'Invalid or expired OTP. Please try again.')
    return render(request, 'authentication/verify_otp.html', {'email': email})

def logout_view(request):
    logout(request)
    return redirect('auth_request')
