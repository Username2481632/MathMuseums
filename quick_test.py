#!/usr/bin/env python3
import smtplib
import ssl
import socket

# Test basic connectivity first
def test_connectivity():
    print("=== Testing basic connectivity ===")
    
    hosts_ports = [
        ('math.moshchuk.com', 25),
        ('math.moshchuk.com', 587), 
        ('math.moshchuk.com', 465),
        ('mail.math.moshchuk.com', 25),
        ('mail.math.moshchuk.com', 587),
        ('mail.math.moshchuk.com', 465)
    ]
    
    for host, port in hosts_ports:
        try:
            print(f"Testing {host}:{port}...", end=' ')
            sock = socket.create_connection((host, port), timeout=10)
            sock.close()
            print("✓ Connected")
        except Exception as e:
            print(f"✗ Failed: {e}")

# Test simple SMTP connection without auth
def test_smtp_connection():
    print("\n=== Testing SMTP connections (no auth) ===")
    
    configs = [
        ('math.moshchuk.com', 25),
        ('math.moshchuk.com', 587),
        ('mail.math.moshchuk.com', 25), 
        ('mail.math.moshchuk.com', 587)
    ]
    
    for host, port in configs:
        try:
            print(f"Testing SMTP {host}:{port}...", end=' ')
            server = smtplib.SMTP(host, port, timeout=10)
            server.ehlo()
            print("✓ SMTP OK")
            server.quit()
        except Exception as e:
            print(f"✗ Failed: {e}")

# Test SSL SMTP connection with auth
def test_smtp_ssl_auth():
    print("\n=== Testing SMTP SSL with authentication ===")
    
    try:
        print("Testing math.moshchuk.com:465 with SSL auth...", end=' ')
        context = ssl.create_default_context()
        server = smtplib.SMTP_SSL('math.moshchuk.com', 465, context=context, timeout=10)
        server.ehlo()
        print("✓ SSL connection established")
        
        # Try to login
        server.login('noreply@math.moshchuk.com', '12345')
        print("✓ Authentication successful!")
        
        # Try to send a test email
        from_addr = 'noreply@math.moshchuk.com'
        to_addr = 'test-lh2dwy2id@srv1.mail-tester.com'
        message = "Subject: Test Email\n\nThis is a test email from Python script."
        
        server.sendmail(from_addr, to_addr, message)
        print("✓ Email sent successfully!")
        
        server.quit()
        
    except Exception as e:
        print(f"✗ Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_connectivity()
    test_smtp_connection()
    test_smtp_ssl_auth()
