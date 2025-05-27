#!/usr/bin/env python3
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_test_email_with_server(smtp_host):
    """Send a test email using smtplib directly with specific SMTP host"""
    
    # Email configuration
    port = 465
    username = 'noreply@math.moshchuk.com'
    password = '12345'
    sender_email = 'noreply@math.moshchuk.com'
    receiver_email = 'test-lh2dwy2id@srv1.mail-tester.com'
    
    # Create message
    message = MIMEMultipart("alternative")
    message["Subject"] = f"HelioHost SMTP Test - {smtp_host}"
    message["From"] = sender_email
    message["To"] = receiver_email
    
    # Create the plain-text part
    text = f"""
HelioHost SMTP Server Test

This is a test email from HelioHost using {smtp_host}.

Configuration:
- SMTP Host: {smtp_host}
- Port: {port} (SSL)
- Username: {username}
- From: {sender_email}

If you receive this email, SMTP authentication is working correctly!
"""
    
    # Turn these into plain/html MIMEText objects
    part1 = MIMEText(text, "plain")
    message.attach(part1)
    
    try:
        # Create a secure SSL context
        context = ssl.create_default_context()
        
        # Connect to server and send email
        with smtplib.SMTP_SSL(smtp_host, port, context=context) as server:
            server.login(username, password)
            server.sendmail(sender_email, receiver_email, message.as_string())
            
        return f"✅ Email sent successfully via {smtp_host}!"
        
    except smtplib.SMTPAuthenticationError as e:
        return f"❌ Authentication failed for {smtp_host}: {str(e)}"
    except smtplib.SMTPException as e:
        return f"❌ SMTP error with {smtp_host}: {str(e)}"
    except Exception as e:
        return f"❌ Connection error with {smtp_host}: {str(e)}"

def test_all_servers():
    """Test all HelioHost SMTP servers to find the correct one"""
    servers = [
        'tommy.heliohost.org',
        'johnny.heliohost.org', 
        'morty.heliohost.org'
    ]
    
    results = []
    
    for server in servers:
        print(f"Testing {server}...")
        result = send_test_email_with_server(server)
        results.append((server, result))
        print(f"  {result}")
        
        # If successful, we found the right server!
        if "✅" in result:
            print(f"SUCCESS! {server} is the correct SMTP server!")
            # Continue testing others to see if multiple work
    
    return results

def application(environ, start_response):
    """WSGI application that tests HelioHost SMTP servers"""
    try:
        # Test all HelioHost SMTP servers
        results = test_all_servers()
        
        # Find successful servers
        successful_servers = [server for server, result in results if "✅" in result]
        
        # Prepare response
        results_html = ""
        for server, result in results:
            status_class = 'success' if '✅' in result else 'error'
            results_html += f'<p class="{status_class}"><strong>{server}:</strong> {result}</p>\n'
        
        # Summary section
        if successful_servers:
            summary_html = f"""
            <div class="success">
                <h3>🎉 SUCCESS!</h3>
                <p>Working SMTP server(s): <strong>{', '.join(successful_servers)}</strong></p>
            </div>
            """
        else:
            summary_html = """
            <div class="error">
                <h3>⚠️ No working SMTP servers found</h3>
                <p>Please contact HelioHost support with these test results.</p>
            </div>
            """
        
        response_body = f"""<!DOCTYPE html>
<html>
<head>
    <title>HelioHost SMTP Server Test</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; }}
        .success {{ color: green; background: #e8f5e8; padding: 10px; border-left: 4px solid green; }}
        .error {{ color: red; }}
        .info {{ background: #f0f0f0; padding: 10px; margin: 20px 0; }}
        .highlight {{ background: yellow; padding: 5px; margin: 10px 0; }}
        .code {{ background: #f8f8f8; padding: 10px; font-family: monospace; border: 1px solid #ddd; }}
    </style>
</head>
<body>
    <h1>HelioHost SMTP Server Test</h1>
    
    <div class="highlight">
        <h3>🔧 SOLUTION IMPLEMENTED</h3>
        <p><strong>Issue:</strong> Using domain name (math.moshchuk.com) instead of HelioHost server hostname</p>
        <p><strong>Fix:</strong> HelioHost documentation states: "When configuring mail clients, use your account's server name instead of your domain."</p>
    </div>
    
    {summary_html}
    
    <div class="info">
        <h3>Test Configuration:</h3>
        <ul>
            <li><strong>Port:</strong> 465 (SSL/TLS)</li>
            <li><strong>Username:</strong> noreply@math.moshchuk.com</li>
            <li><strong>Password:</strong> [CONFIGURED]</li>
            <li><strong>Target:</strong> test-lh2dwy2id@srv1.mail-tester.com</li>
            <li><strong>Method:</strong> Direct SMTP connection (not Django)</li>
        </ul>
    </div>
    
    <h3>SMTP Server Test Results:</h3>
    {results_html}
    
    <div class="info">
        <h3>📧 For Django Email Configuration:</h3>
        <div class="code">
# Use the working server in your Django settings:<br>
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'<br>
EMAIL_HOST = '<strong>[WORKING_SERVER_FROM_ABOVE]</strong>'<br>
EMAIL_PORT = 465<br>
EMAIL_USE_SSL = True<br>
EMAIL_HOST_USER = 'noreply@math.moshchuk.com'<br>
EMAIL_HOST_PASSWORD = '12345'<br>
DEFAULT_FROM_EMAIL = 'noreply@math.moshchuk.com'
        </div>
    </div>
    
    <div class="info">
        <p><strong>Next Steps:</strong></p>
        <ol>
            <li>Check <a href="https://www.mail-tester.com/" target="_blank">mail-tester.com</a> for the test email(s)</li>
            <li>Use the working server hostname in your Django project</li>
            <li>Share these results with HelioHost support if needed</li>
        </ol>
    </div>
</body>
</html>"""
        
        response_headers = [
            ('Content-Type', 'text/html'),
            ('Content-Length', str(len(response_body)))
        ]
        
        start_response('200 OK', response_headers)
        return [response_body.encode('utf-8')]
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        
        error_body = f"""<!DOCTYPE html>
<html>
<head><title>Application Error</title></head>
<body>
    <h1>Application Error</h1>
    <p style="color: red;">Error: {str(e)}</p>
    <pre>{error_details}</pre>
</body>
</html>"""
        
        response_headers = [
            ('Content-Type', 'text/html'),
            ('Content-Length', str(len(error_body)))
        ]
        
        start_response('500 Internal Server Error', response_headers)
        return [error_body.encode('utf-8')]

if __name__ == '__main__':
    # For testing locally
    print("Testing all HelioHost SMTP servers...")
    print("=" * 50)
    results = test_all_servers()
    print("=" * 50)
    print("SUMMARY:")
    successful = []
    for server, result in results:
        status = 'SUCCESS' if '✅' in result else 'FAILED'
        print(f"  {server}: {status}")
        if status == 'SUCCESS':
            successful.append(server)
    
    if successful:
        print(f"\n🎉 WORKING SMTP SERVER(S): {', '.join(successful)}")
        print("Use this server hostname in your Django EMAIL_HOST setting!")
    else:
        print("\n⚠️ No servers worked. Contact HelioHost support with these results.")
