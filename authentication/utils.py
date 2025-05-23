import random
import string
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from .models import OTPCode, User

def generate_otp(length=6):
    """Generate a random numeric OTP code of specified length."""
    return ''.join(random.choices(string.digits, k=length))

def create_otp_for_user(user):
    """Create a new OTP for the given user."""
    code = generate_otp()
    expires_at = timezone.now() + timedelta(minutes=15)
    otp = OTPCode.objects.create(
        user=user,
        code=code,
        expires_at=expires_at
    )
    return otp

def validate_otp(user, code):
    """Validate an OTP code for a user."""
    now = timezone.now()
    try:
        otp = OTPCode.objects.get(
            user=user,
            code=code,
            is_used=False,
            expires_at__gte=now
        )
        otp.is_used = True
        otp.save()
        return True
    except OTPCode.DoesNotExist:
        return False

def send_otp_email(otp, otp_code):
    """Send OTP code to user's email."""
    import logging
    logger = logging.getLogger('authentication')
    
    subject = "Your Math Museums verification code"
    message = f"Your verification code is: {otp_code}\n\nThis code will expire in 15 minutes."
    from_email = settings.DEFAULT_FROM_EMAIL
    
    try:
        sent = send_mail(
            subject,
            message,
            from_email,
            [otp.email],
            fail_silently=False,
        )
        if not sent:
            logger.warning(f"Email not sent to {otp.email}. No error raised, but send_mail returned 0.")
            raise Exception("Email not sent")
        logger.debug(
            f"OTP email sent successfully to {otp.email}\n"
            f"  Recipient: {otp.email}\n"
            f"  Subject: {subject}\n"
            f"  Message: {message}\n"
            f"  From: {from_email}\n"
            f"  EMAIL_BACKEND: {getattr(settings, 'EMAIL_BACKEND', None)}\n"
            f"  DEFAULT_FROM_EMAIL: {getattr(settings, 'DEFAULT_FROM_EMAIL', None)}\n"
            f"  fail_silently: False\n"
        )
        return True
    except Exception as e:
        import django
        django_version = getattr(django, '__version__', 'unknown')
        logger.error(
            f"Failed to send OTP email to {otp.email}: {str(e)}\n"
            f"OTP email send attempt details:\n"
            f"  Recipient: {otp.email}\n"
            f"  Subject: {subject}\n"
            f"  Message: {message}\n"
            f"  From: {from_email}\n"
            f"  EMAIL_BACKEND: {getattr(settings, 'EMAIL_BACKEND', None)}\n"
            f"  DEFAULT_FROM_EMAIL: {getattr(settings, 'DEFAULT_FROM_EMAIL', None)}\n"
            f"  Django version: {django_version}\n"
            f"  fail_silently: False\n"
        )
        raise

def create_otp_for_email(email):
    """Create a new OTP for the given email."""
    code = generate_otp()
    expires_at = timezone.now() + timedelta(minutes=15)
    otp = OTPCode.objects.create(
        email=email,
        code=code,
        expires_at=expires_at
    )
    return otp

def validate_otp_and_create_user(email, code):
    """Validate an OTP code for an email and create a user if valid."""
    now = timezone.now()
    try:
        otp = OTPCode.objects.get(
            email=email,
            code=code,
            is_used=False,
            expires_at__gte=now
        )
        otp.is_used = True
        otp.save()
        user, created = User.objects.get_or_create(email=email)
        otp.user = user
        otp.save()
        return user
    except OTPCode.DoesNotExist:
        return None
