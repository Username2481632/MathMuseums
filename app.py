import smtplib
import ssl
import traceback

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
    try:
        with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context) as server:
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_address, to_address, message)
        status_message = f"Email sent to {to_address}"
    except Exception as e:
        status_message = f"Failed to send email: {e}"
        traceback.print_exc()

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
