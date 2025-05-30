import os
import re
import imaplib
import email
from email.header import decode_header
from authentication.models import AuthCode
from django.conf import settings
from django.utils import timezone

CODE_REGEX = re.compile(r'\b(\d{8})\b')

IMAP_HOST = getattr(settings, 'VERIFICATION_IMAP_HOST', os.environ.get('VERIFICATION_IMAP_HOST'))
IMAP_PORT = int(getattr(settings, 'VERIFICATION_IMAP_PORT', os.environ.get('VERIFICATION_IMAP_PORT', 993)))
IMAP_USER = getattr(settings, 'VERIFICATION_IMAP_USER', os.environ.get('VERIFICATION_IMAP_USER'))
IMAP_PASSWORD = getattr(settings, 'VERIFICATION_IMAP_PASSWORD', os.environ.get('VERIFICATION_IMAP_PASSWORD'))
IMAP_FOLDER = getattr(settings, 'VERIFICATION_IMAP_FOLDER', os.environ.get('VERIFICATION_IMAP_FOLDER', 'INBOX'))

def poll_verification_email():
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
            mail.store(num, '+FLAGS', '\\Seen')
        mail.logout()
        return {'status': 'ok', 'verified': verified}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}
