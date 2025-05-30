from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
import json
import secrets
from .models import User, AuthCode
from authentication.poll_email import poll_verification_email

def logout_view(request):
    logout(request)
    return redirect('advanced_auth')

class EmailCheckView(View):
    """AJAX endpoint to check if email exists and return dynamic UI state"""
    
    def post(self, request):
        try:
            data = json.loads(request.body)
            email = data.get('email', '').strip().lower()
            
            if not email:
                return JsonResponse({'error': 'Email is required'}, status=400)
            
            # Check if user exists
            user_exists = User.objects.filter(email=email).exists()
            
            return JsonResponse({
                'exists': user_exists,
                'email': email,
                'password_label': 'Enter your Password' if user_exists else 'Choose a Password',
                'submit_text': 'Log In' if user_exists else 'Sign Up',
                'emphasis_class': 'existing-user' if user_exists else 'new-user'
            })
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': 'Server error'}, status=500)

class AdvancedAuthView(View):
    """Advanced login/signup view with dynamic UI"""
    
    def get(self, request):
        # Only show the 'Email verified successfully!' message if just verified
        just_verified = request.session.pop('just_verified', False)
        return render(request, 'authentication/advanced_auth.html', {'just_verified': just_verified})
    
    def post(self, request):
        email = request.POST.get('email', '').strip().lower()
        password = request.POST.get('password', '')
        
        if not email:
            messages.error(request, 'Please enter your email address.')
            return render(request, 'authentication/advanced_auth.html')
        
        try:
            # Check if user exists
            user_exists = User.objects.filter(email=email).exists()
            
            if user_exists:
                # Login flow
                try:
                    user = User.objects.get(email=email)
                    if user.check_password(password):
                        # Check if user has verified their email before
                        if user.is_email_verified:
                            # User is already verified, log them in directly
                            login(request, user)
                            messages.success(request, 'Login successful!')
                            return redirect('auth_check')
                        else:
                            # User needs email verification (first time or not yet verified)
                            auth_code, created = AuthCode.objects.get_or_create(
                                email=email,
                                session_key=request.session.session_key or request.session.cycle_key(),
                                defaults={'code': f"{secrets.randbelow(100000000):08d}"}
                            )
                            
                            request.session['auth_email'] = email
                            request.session['auth_password'] = password  # Store for after verification
                            messages.info(request, f'Please verify your email by sending the code to verify@math.moshchuk.com: {auth_code.code}')
                            return redirect('email_verification')
                    else:
                        messages.error(request, 'Invalid email or password.')
                        return render(request, 'authentication/advanced_auth.html')
                        
                except User.DoesNotExist:
                    messages.error(request, 'Invalid email or password.')
                    return render(request, 'authentication/advanced_auth.html')
            
            else:
                # Signup flow - always requires email verification
                user = User.objects.create_user(email=email, password=password)
                # is_email_verified defaults to False for new users
                
                # Generate auth code for email verification
                auth_code = AuthCode.objects.create(
                    email=email,
                    session_key=request.session.session_key or request.session.cycle_key(),
                    code=f"{secrets.randbelow(100000000):08d}"
                )
                
                request.session['auth_email'] = email
                request.session['auth_password'] = password
                messages.success(request, f'Account created! Please verify your email by sending the code to verify@math.moshchuk.com: {auth_code.code}')
                return redirect('email_verification')
                
        except Exception as e:
            messages.error(request, 'An error occurred. Please try again later.')
            return render(request, 'authentication/advanced_auth.html')

class EmailVerificationView(View):
    """View for email verification status and instructions"""
    
    def get(self, request):
        email = request.session.get('auth_email')
        if not email:
            return redirect('advanced_auth')
        
        try:
            auth_code = AuthCode.objects.get(
                email=email,
                session_key=request.session.session_key
            )
            
            if auth_code.is_verified:
                # Verification complete, log in the user
                password = request.session.get('auth_password')
                user = User.objects.get(email=email)
                
                if user.check_password(password):
                    # Mark user as email verified
                    user.is_email_verified = True
                    user.save()
                    
                    login(request, user)
                    # Clean up session
                    request.session.pop('auth_email', None)
                    request.session.pop('auth_password', None)
                    messages.success(request, 'Email verified successfully!')
                    response = redirect('auth_check')
                    # Mark that we just verified, so the message is only shown once
                    request.session['just_verified'] = True
                    return response
            
            return render(request, 'authentication/email_verification.html', {
                'email': email,
                'auth_code': auth_code.code
            })
            
        except AuthCode.DoesNotExist:
            messages.error(request, 'Verification session expired. Please try again.')
            return redirect('advanced_auth')

class ScanVerificationEmailView(View):
    """AJAX endpoint to scan verification email inbox (manual trigger)"""
    def post(self, request):
        if not request.session.get('auth_email'):
            return JsonResponse({'error': 'No active verification session'}, status=403)
        try:
            result = poll_verification_email()
            return JsonResponse(result)
        except Exception as e:
            import traceback
            return JsonResponse({'status': 'error', 'message': str(e), 'traceback': traceback.format_exc()}, status=500)

class VerificationStatusView(View):
    """AJAX endpoint to check verification status"""
    
    def get(self, request):
        email = request.session.get('auth_email')
        if not email:
            return JsonResponse({'error': 'No active verification session'}, status=400)
        
        try:
            auth_code = AuthCode.objects.get(
                email=email,
                session_key=request.session.session_key
            )
            
            return JsonResponse({
                'verified': auth_code.is_verified,
                'code': auth_code.code
            })
            
        except AuthCode.DoesNotExist:
            return JsonResponse({'error': 'Verification not found'}, status=404)
