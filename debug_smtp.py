#!/usr/bin/env python3
import smtplib
import ssl

def test_smtp_server_info():
    print("=== Getting SMTP server information ===")
    
    try:
        context = ssl.create_default_context()
        server = smtplib.SMTP_SSL('math.moshchuk.com', 465, context=context, timeout=10)
        
        # Get server greeting and capabilities
        print("Server greeting:", server.get_server_greeting())
        print("\nServer capabilities (EHLO response):")
        server.ehlo()
        for line in server.ehlo_resp.decode().split('\n'):
            print(f"  {line}")
        
        server.quit()
        
    except Exception as e:
        print(f"Failed: {e}")

def test_different_usernames():
    print("\n=== Testing different username formats ===")
    
    usernames = [
        'noreply@math.moshchuk.com',
        'noreply',
        'coder248',  # Your hosting username
        'coder248@math.moshchuk.com'
    ]
    
    for username in usernames:
        try:
            print(f"Testing username: {username}...", end=' ')
            context = ssl.create_default_context()
            server = smtplib.SMTP_SSL('math.moshchuk.com', 465, context=context, timeout=10)
            server.ehlo()
            server.login(username, '12345')
            print("✓ SUCCESS!")
            server.quit()
            return username  # Return successful username
        except Exception as e:
            print(f"✗ Failed: {e}")
    
    return None

if __name__ == '__main__':
    test_smtp_server_info()
    successful_username = test_different_usernames()
    
    if successful_username:
        print(f"\n✓ Found working username: {successful_username}")
    else:
        print("\n✗ No working username found with password '12345'")
