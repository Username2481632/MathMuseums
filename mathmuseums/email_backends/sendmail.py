import subprocess
import os
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.message import sanitize_address
from django.conf import settings

class EmailBackend(BaseEmailBackend):
    """
    A Django Email backend that sends messages through the local sendmail binary.
    """
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.sendmail_path = getattr(settings, 'EMAIL_SENDMAIL', '/usr/sbin/sendmail')

    def send_messages(self, email_messages):
        if not email_messages:
            return 0
        num_sent = 0
        for message in email_messages:
            try:
                self._send(message)
                num_sent += 1
            except Exception:
                if not self.fail_silently:
                    raise
        return num_sent

    def _send(self, message):
        from_email = sanitize_address(message.from_email, encoding=message.encoding)
        recipients = [sanitize_address(addr, encoding=message.encoding) for addr in message.recipients()]
        if not recipients:
            return
        # Prepare sendmail command
        sendmail_cmd = [self.sendmail_path, '-i', '-f', from_email] + recipients
        # Open a process to sendmail
        proc = subprocess.Popen(
            sendmail_cmd,
            stdin=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        # Write the message to sendmail's stdin
        msg = message.message()
        output = msg.as_bytes() if hasattr(msg, 'as_bytes') else msg.as_string().encode(message.encoding or 'utf-8')
        stdout, stderr = proc.communicate(output)
        if proc.returncode != 0:
            error_msg = stderr.decode('utf-8', errors='replace')
            raise Exception(f"Sendmail failed: {error_msg}")
