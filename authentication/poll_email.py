import os
import re
import imaplib
import email
from email.header import decode_header
from authentication.models import AuthCode
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

CODE_REGEX = re.compile(r'\b(\d{8})\b')

IMAP_HOST = getattr(settings, 'VERIFICATION_IMAP_HOST', os.environ.get('VERIFICATION_IMAP_HOST'))
IMAP_PORT = int(getattr(settings, 'VERIFICATION_IMAP_PORT', os.environ.get('VERIFICATION_IMAP_PORT', 993)))
IMAP_USER = getattr(settings, 'VERIFICATION_IMAP_USER', os.environ.get('VERIFICATION_IMAP_USER'))
IMAP_PASSWORD = getattr(settings, 'VERIFICATION_IMAP_PASSWORD', os.environ.get('VERIFICATION_IMAP_PASSWORD'))
IMAP_FOLDER = getattr(settings, 'VERIFICATION_IMAP_FOLDER', os.environ.get('VERIFICATION_IMAP_FOLDER', 'INBOX'))

def dummy_verification():
    """
    Dummy email verification mode - automatically verifies codes older than 20 seconds
    This is perfect for development and testing without requiring real email setup
    """
    try:
        # Find all unverified codes that are at least 20 seconds old
        cutoff_time = timezone.now() - timedelta(seconds=20)
        
        auth_codes = AuthCode.objects.filter(
            is_verified=False,
            created_at__lte=cutoff_time
        )
        
        verified = []
        for auth_code in auth_codes:
            auth_code.is_verified = True
            auth_code.save()
            verified.append(auth_code.code)
        
        if verified:
            return {
                'status': 'success', 
                'message': f'Auto-verified {len(verified)} codes after 20 seconds',
                'verified_codes': verified
            }
        else:
            return {
                'status': 'success',
                'message': 'No codes ready for auto-verification yet'
            }
            
    except Exception as e:
        return {'status': 'error', 'message': f'Dummy verification error: {str(e)}'}

def poll_verification_email():
    """
    Main email verification function - uses dummy mode or real IMAP based on settings
    """
    # Check which verification mode to use
    verification_mode = getattr(settings, 'EMAIL_VERIFICATION_MODE', 'dummy')
    
    if verification_mode == 'dummy':
        return dummy_verification()
    elif verification_mode == 'imap':
        return imap_verification()
    else:
        return {'status': 'error', 'message': f'Unknown email verification mode: {verification_mode}'}

def imap_verification():
    """
    Real IMAP email verification - connects to actual email server
    """
    if not all([IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASSWORD]):
        return {'status': 'error', 'message': 'IMAP credentials not set.'}
    try:
        mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
        mail.login(IMAP_USER, IMAP_PASSWORD)
        mail.select(IMAP_FOLDER)
        status, messages = mail.search(None, '(UNSEEN)')
        if status != 'OK':
            return {'status': 'error', 'message': 'Failed to search mailbox.'}
        verified = []
        for num in messages[0].split():
            status, msg_data = mail.fetch(num, '(RFC822)')
            if status != 'OK':
                continue
            msg = email.message_from_bytes(msg_data[0][1])
            body = ''
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == 'text/plain':
                        body += part.get_payload(decode=True).decode(errors='ignore')
            else:
                body = msg.get_payload(decode=True).decode(errors='ignore')
            match = CODE_REGEX.search(body)
            if match:
                code = match.group(1)
                try:
                    auth_code = AuthCode.objects.get(code=code, is_verified=False)
                    auth_code.is_verified = True
                    auth_code.save()
                    verified.append(code)
                except AuthCode.DoesNotExist:
                    pass
        mail.close()
        mail.logout()
        if verified:
            return {'status': 'success', 'message': f'Verified codes: {", ".join(verified)}'}
        else:
            return {'status': 'success', 'message': 'No new verification codes found.'}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}
