import smtplib
import ssl

def application(environ, start_response):
    smtp_host = 'math.moshchuk.com'
    smtp_port = 465
    smtp_user = 'noreply@math.moshchuk.com'
    smtp_pass = '12345'

    from_address = smtp_user
    to_address = 'test-v8u6s6y9q@srv1.mail-tester.com'
    subject = 'An Email'
    body = 'This is an email.'
    message = "Subject: %s\n\n%s" % (subject, body)

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context) as server:
        server.login(smtp_user, smtp_pass)
        server.sendmail(from_address, to_address, message)

    start_response('200 OK', [('Content-Type', 'text/plain')])
    return [b'Email sent to ' + to_address.encode()]
