from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import login, logout
from .utils import create_otp_for_email, send_otp_email, validate_otp_and_create_user

def auth_request_view(request):
    # If user is already authenticated, redirect to index
    if request.user.is_authenticated:
        return redirect('index')
    
    if request.method == 'POST':
        email = request.POST.get('email')
        if not email:
            messages.error(request, 'Please enter your email address.')
            return render(request, 'authentication/auth_request.html')
        try:
            otp = create_otp_for_email(email)
            try:
                send_otp_email(otp, otp.code)
                request.session['auth_email'] = email
                messages.success(request, f'An OTP has been sent to {email}.')
                return redirect('verify_otp')
            except Exception as e:
                import logging
                logger = logging.getLogger('django')
                logger.error(f"Email sending error for {email}: {str(e)}")
                messages.error(request, 'We could not send the verification code. Please try again later or contact support.')
                return render(request, 'authentication/auth_request.html')
        except Exception as e:
            import logging
            logger = logging.getLogger('django')
            logger.error(f"Authentication error: {str(e)}")
            messages.error(request, 'An error occurred. Please try again later.')
            return render(request, 'authentication/auth_request.html')
    return render(request, 'authentication/auth_request.html')

def verify_otp_view(request):
    email = request.session.get('auth_email')
    if not email:
        return redirect('auth_request')
    if request.method == 'POST':
        code = request.POST.get('otp')
        user = validate_otp_and_create_user(email, code)
        if user:
            login(request, user)
            messages.success(request, 'Authentication successful!')
            return redirect('index')
        else:
            messages.error(request, 'Invalid or expired OTP. Please try again.')
    return render(request, 'authentication/verify_otp.html', {'email': email})

def logout_view(request):
    logout(request)
    return redirect('auth_request')
