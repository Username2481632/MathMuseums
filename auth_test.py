#!/usr/bin/env python3
import smtplib
import ssl

def test_auth_variations():
    print("=== Testing authentication variations ===")
    
    # Different username formats to try
    usernames = [
        'noreply@math.moshchuk.com',
        'noreply',
        'coder248',  # Your HelioHost username
    ]
    
    passwords = [
        '12345',
        # Add any other passwords you might have set
    ]
    
    for username in usernames:
        for password in passwords:
            try:
                print(f"Testing {username}:{password}...", end=' ')
                context = ssl.create_default_context()
                server = smtplib.SMTP_SSL('math.moshchuk.com', 465, context=context, timeout=10)
                server.ehlo()
                server.login(username, password)
                print("✓ SUCCESS!")
                
                # If we get here, try to send an email
                from_addr = 'noreply@math.moshchuk.com'
                to_addr = 'test-lh2dwy2id@srv1.mail-tester.com'
                message = "Subject: Test Email Success\n\nAuthentication worked!"
                
                server.sendmail(from_addr, to_addr, message)
                print("✓ Email sent successfully!")
                server.quit()
                return True
                
            except Exception as e:
                print(f"✗ Failed: {e}")
                try:
                    server.quit()
                except:
                    pass
    
    return False

def check_smtp_capabilities():
    print("\n=== Checking SMTP server capabilities ===")
    try:
        context = ssl.create_default_context()
        server = smtplib.SMTP_SSL('math.moshchuk.com', 465, context=context, timeout=10)
        print("Connected to SMTP server")
        
        # Get server capabilities
        resp = server.ehlo()
        print(f"EHLO response: {resp}")
        
        # Show available auth methods
        if hasattr(server, 'esmtp_features'):
            print("Available features:")
            for feature, params in server.esmtp_features.items():
                print(f"  {feature}: {params}")
        
        server.quit()
        
    except Exception as e:
        print(f"Failed to check capabilities: {e}")

if __name__ == '__main__':
    check_smtp_capabilities()
    test_auth_variations()
