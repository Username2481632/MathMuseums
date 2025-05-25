import django
from django.conf import settings
from django.core.mail import send_mail

settings.configure(
    EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend',
    EMAIL_HOST='math.moshchuk.com',
    EMAIL_PORT=465,
    EMAIL_USE_SSL=True,
    EMAIL_HOST_USER='noreply@math.moshchuk.com',
    EMAIL_HOST_PASSWORD='12345',
    DEFAULT_FROM_EMAIL='noreply@math.moshchuk.com',
    SECRET_KEY='dummy',
    INSTALLED_APPS=[],
)
django.setup()

def application(environ, start_response):
    to_address = 'test-v8u6s6y9q@srv1.mail-tester.com'
    subject = 'An Email'
    body = 'This is an email.'
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to_address], fail_silently=False)
        status_message = f"Email sent to {to_address}"
    except Exception as e:
        status_message = f"Failed to send email: {e}"
        import traceback; traceback.print_exc()

    print(status_message)
    start_response('200 OK', [('Content-Type', 'text/html; charset=utf-8')])
    html = f"""<html>
<head><title>Send Mail Result</title></head>
<body>
<h1>Mail Result</h1>
<p>{status_message}</p>
</body>
</html>"""
    return [html.encode('utf-8')]
