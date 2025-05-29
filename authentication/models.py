from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

class UserManager(BaseUserManager):
    """Custom user manager where email is the unique identifier."""
    use_in_migrations = True

    def _create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)  # Always set password (can be None/blank)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self._create_user(email, password, **extra_fields)

class User(AbstractUser):
    username = None
    email = models.EmailField(_('email address'), unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

class OTPCode(models.Model):
    email = models.EmailField(_('email address'))
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_codes', null=True, blank=True)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def is_valid(self):
        now = timezone.now()
        return not self.is_used and now <= self.expires_at

    def __str__(self):
        return f"OTP for {self.email} (valid until {self.expires_at})"


class AuthCode(models.Model):
    """Session-persistent auth codes for user-initiated email verification"""
    email = models.EmailField(_('email address'))
    code = models.CharField(max_length=8)  # 8-digit code for display
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)
    session_key = models.CharField(max_length=40)  # Django session key
    
    class Meta:
        unique_together = ['email', 'session_key']
    
    def __str__(self):
        return f"Auth code for {self.email} - {'Verified' if self.is_verified else 'Pending'}"
