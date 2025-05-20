from django.core.mail import send_mail
from django.conf import settings
import django
import os
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mathmuseums.settings')
django.setup()

# Read recipient from command line or use default
to_email = sys.argv[1] if len(sys.argv) > 1 else getattr(settings, 'DEFAULT_TO_EMAIL', None)
if not to_email:
    print("Usage: python send_test_email.py recipient@example.com")
    sys.exit(1)

try:
    send_mail(
        subject='MathMuseums Test Email',
        message='This is a test email from the MathMuseums Django stack.',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[to_email],
        fail_silently=False,
    )
    print(f"Test email sent to {to_email}")
except Exception as e:
    print(f"Failed to send email: {e}")
    sys.exit(2)
