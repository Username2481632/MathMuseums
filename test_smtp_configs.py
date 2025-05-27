#!/usr/bin/env python3

# Test different SMTP configurations
import smtplib
import ssl

# Test configurations to try
configs = [
    {'host': 'mail.math.moshchuk.com', 'port': 587, 'use_tls': True, 'use_ssl': False},
    {'host': 'mail.math.moshchuk.com', 'port': 465, 'use_tls': False, 'use_ssl': True},
    {'host': 'smtp.math.moshchuk.com', 'port': 587, 'use_tls': True, 'use_ssl': False},
    {'host': 'smtp.math.moshchuk.com', 'port': 465, 'use_tls': False, 'use_ssl': True},
    {'host': 'math.moshchuk.com', 'port': 587, 'use_tls': True, 'use_ssl': False},
    {'host': 'math.moshchuk.com', 'port': 25, 'use_tls': True, 'use_ssl': False},
]

username = 'noreply@math.moshchuk.com'
password = '12345'

for i, config in enumerate(configs):
    print(f"\n=== Testing config {i+1}: {config['host']}:{config['port']} ===")
    
    try:
        context = ssl.create_default_context()
        
        if config['use_ssl']:
            # SSL connection
            with smtplib.SMTP_SSL(config['host'], config['port'], context=context) as server:
                print(f"✓ Connected to {config['host']}:{config['port']} (SSL)")
                try:
                    server.login(username, password)
                    print("✓ Authentication successful")
                    break  # Success! Stop testing
                except Exception as e:
                    print(f"✗ Authentication failed: {e}")
        else:
            # STARTTLS connection
            with smtplib.SMTP(config['host'], config['port']) as server:
                print(f"✓ Connected to {config['host']}:{config['port']} (plain)")
                if config['use_tls']:
                    server.starttls(context=context)
                    print("✓ STARTTLS enabled")
                try:
                    server.login(username, password)
                    print("✓ Authentication successful")
                    break  # Success! Stop testing
                except Exception as e:
                    print(f"✗ Authentication failed: {e}")
                    
    except Exception as e:
        print(f"✗ Connection failed: {e}")

print("\n=== Test complete ===")
