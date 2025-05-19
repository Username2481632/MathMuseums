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

def send_otp_email(user, otp_code):
    """Send OTP code to user's email."""
    import logging
    logger = logging.getLogger('django')
    
    subject = "Your Math Museums verification code"
    message = f"Your verification code is: {otp_code}\n\nThis code will expire in 15 minutes."
    from_email = settings.DEFAULT_FROM_EMAIL
    
    try:
        sent = send_mail(
            subject,
            message,
            from_email,
            [user.email],
            fail_silently=False,
        )
        if not sent:
            logger.warning(f"Email not sent to {user.email}. No error raised, but send_mail returned 0.")
            raise Exception("Email not sent")
        logger.info(f"OTP email sent successfully to {user.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email to {user.email}: {str(e)}")
        raise
