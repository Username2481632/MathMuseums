# Email OTP Authentication Implementation Plan

## Overview
This document outlines the detailed implementation plan for the email OTP authentication system for the Math Museums project. This system will enable users to authenticate across multiple devices using their email address as the primary identifier.

## Components

### 1. Custom User Model
- **Model Structure**:
  - Email as username field (primary identifier)
  - No username field (replaced by email)
  - Standard Django auth model fields (is_active, is_staff, etc.)
  - Custom UserManager for creating users without username

- **Implementation Details**:
  ```python
  class UserManager(BaseUserManager):
      use_in_migrations = True
      
      def _create_user(self, email, password=None, **extra_fields):
          if not email:
              raise ValueError('Email is required')
          email = self.normalize_email(email)
          user = self.model(email=email, **extra_fields)
          if password:
              user.set_password(password)
          user.save(using=self._db)
          return user
      
      def create_user(self, email, password=None, **extra_fields):
          extra_fields.setdefault('is_staff', False)
          extra_fields.setdefault('is_superuser', False)
          return self._create_user(email, password, **extra_fields)
      
      def create_superuser(self, email, password, **extra_fields):
          extra_fields.setdefault('is_staff', True)
          extra_fields.setdefault('is_superuser', True)
          return self._create_user(email, password, **extra_fields)
  
  class User(AbstractUser):
      username = None
      email = models.EmailField('email address', unique=True)
      
      USERNAME_FIELD = 'email'
      REQUIRED_FIELDS = []
      
      objects = UserManager()
  ```

### 2. OTP Model
- **Model Structure**:
  - ForeignKey to User model
  - OTP code field (6-digit string)
  - Created timestamp
  - Expiration timestamp (15 minutes from creation)
  - Used status (boolean)

- **Implementation Details**:
  ```python
  class OTPCode(models.Model):
      user = models.ForeignKey(User, related_name='otp_codes', on_delete=models.CASCADE)
      code = models.CharField(max_length=6)
      created_at = models.DateTimeField(auto_now_add=True)
      expires_at = models.DateTimeField()
      is_used = models.BooleanField(default=False)
      
      def __str__(self):
          return f"OTP for {self.user.email} (valid until {self.expires_at})"
      
      def is_valid(self):
          now = timezone.now()
          return not self.is_used and now <= self.expires_at
  ```

### 3. OTP Generation and Validation Utilities
- **Utility Functions**:
  - Generate random OTP code (6 digits)
  - Create OTP record for user
  - Validate submitted OTP
  - Send OTP email

- **Implementation Details**:
  ```python
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
      subject = "Your Math Museums verification code"
      message = f"Your verification code is: {otp_code}\n\nThis code will expire in 15 minutes."
      from_email = settings.DEFAULT_FROM_EMAIL
      send_mail(
          subject,
          message,
          from_email,
          [user.email]
      )
  ```

### 4. Authentication Views
- **Login/Signup View**:
  - Single form for both new and existing users
  - Email input field
  - Backend logic to determine if user exists
  - Generate and send OTP
  - Redirect to OTP verification view

- **OTP Verification View**:
  - OTP input form
  - Verification logic
  - Session creation on success
  - Redirect to app on success

- **API Endpoints**:
  - Login/signup endpoint
  - OTP verification endpoint
  - Logout endpoint

### 5. Templates/Frontend Components
- **Login Form**:
  - Email input
  - Submit button
  - Error handling for invalid emails

- **OTP Verification Form**:
  - 6-digit OTP input
  - Submit button
  - Resend OTP option
  - Countdown timer for expiration
  - Error handling for invalid OTPs

### 6. Email Configuration
- **SMTP Settings**:
  - Configure Django email backend for SMTP
  - Use environment variables for credentials
  - Set up DEFAULT_FROM_EMAIL

- **Email Templates**:
  - OTP email template
  - Plain text and HTML versions

### 7. Testing Plan
- **Unit Tests**:
  - Test OTP generation (length, randomness)
  - Test OTP validation (valid, expired, already used)
  - Test custom user model (creation, validation)

- **Integration Tests**:
  - Test login flow for existing users
  - Test signup flow for new users
  - Test email sending
  - Test OTP verification
  - Test session creation

- **Manual Testing**:
  - Complete login flow
  - Complete signup flow
  - Test with various email providers
  - Test OTP expiration
  - Test logout functionality

## Implementation Sequence
1. Create custom User model
2. Configure migrations and update settings
3. Create OTP model
4. Implement utility functions
5. Create authentication views and templates
6. Configure email settings
7. Implement API endpoints
8. Write tests
9. Manual testing and refinement

## Deployment Considerations
- Ensure SMTP settings are properly configured in production
- Set secure session cookies in production
- Configure rate limiting to prevent abuse
- Implement proper error handling for production environment
