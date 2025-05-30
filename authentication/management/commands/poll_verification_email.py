import os
import re
import imaplib
import email
from email.header import decode_header
from django.core.management.base import BaseCommand
from django.utils import timezone
from authentication.models import AuthCode
from django.conf import settings


# Settings: must be set in your environment or .env file (fail if missing)
def require_env(var):
    value = os.environ.get(var)
    if not value:
        raise RuntimeError(f"Environment variable {var} is required but not set.")
    return value

IMAP_HOST = require_env('VERIFICATION_IMAP_HOST')
IMAP_PORT = int(require_env('VERIFICATION_IMAP_PORT'))
IMAP_USER = require_env('VERIFICATION_IMAP_USER')
IMAP_PASSWORD = require_env('VERIFICATION_IMAP_PASSWORD')
IMAP_FOLDER = os.environ.get('VERIFICATION_IMAP_FOLDER', 'INBOX')

CODE_REGEX = re.compile(r'\b(\d{8})\b')

class Command(BaseCommand):
    help = 'Polls the verify@math.moshchuk.com inbox for verification codes and updates AuthCode records.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Connecting to IMAP server...'))
        mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
        mail.login(IMAP_USER, IMAP_PASSWORD)
        mail.select(IMAP_FOLDER)

        # Search for all unseen emails
        status, messages = mail.search(None, '(UNSEEN)')
        if status != 'OK':
            self.stdout.write(self.style.ERROR('Failed to search mailbox.'))
            return

        for num in messages[0].split():
            status, msg_data = mail.fetch(num, '(RFC822)')
            if status != 'OK':
                continue
            msg = email.message_from_bytes(msg_data[0][1])
            subject, encoding = decode_header(msg['Subject'])[0]
            if isinstance(subject, bytes):
                subject = subject.decode(encoding or 'utf-8', errors='ignore')
            body = ''
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == 'text/plain':
                        charset = part.get_content_charset() or 'utf-8'
                        body += part.get_payload(decode=True).decode(charset, errors='ignore')
            else:
                charset = msg.get_content_charset() or 'utf-8'
                body = msg.get_payload(decode=True).decode(charset, errors='ignore')

            # Search for 8-digit code in subject or body
            match = CODE_REGEX.search(subject) or CODE_REGEX.search(body)
            if match:
                code = match.group(1)
                try:
                    auth_code = AuthCode.objects.get(code=code, is_verified=False)
                    auth_code.is_verified = True
                    auth_code.save()
                    self.stdout.write(self.style.SUCCESS(f'Verified code {code} for {auth_code.email}'))
                except AuthCode.DoesNotExist:
                    self.stdout.write(self.style.WARNING(f'Code {code} not found or already verified.'))
            else:
                self.stdout.write(self.style.WARNING('No valid code found in email.'))

            # Mark email as seen
            mail.store(num, '+FLAGS', '\\Seen')

        mail.logout()
        self.stdout.write(self.style.SUCCESS('Polling complete.'))
