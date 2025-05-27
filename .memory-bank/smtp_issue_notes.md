# SMTP Issue Resolution - Case Study

## Historical Context (Preserved for Learning)

**Original Issue**: Email backend problems on HelioHost - initially tried Sendmail backend due to misunderstanding about Plesk email configuration.

**Original Error Message**: `No module named 'django.core.mail.backends.sendmail'`

**Attempted Solutions**: 
- Switched from SMTP to Sendmail backend thinking Plesk required it
- Installed full Django package in staticlibs/ to get all backends
- Tried to manually copy sendmail.py files

## ACTUAL RESOLUTION (May 27, 2025)

**Root Cause**: Email account `noreply@math.moshchuk.com` had the "Mailbox" checkbox unchecked in Plesk control panel.

**Discovery Method**: HelioHost support (Krydos) identified via Discord troubleshooting by checking server logs:
```
May 27 18:31:20 johnny plesk_saslauthd[2135049]: No such user 'noreply@math.moshchuk.com' in mail authorization database
```

**Technical Explanation**: 
- Without mailbox enabled, the email account exists for Plesk login purposes but NOT for mail authentication
- This caused SMTP authentication error 535: "authentication failed"
- The issue was configuration, not code or Django backend choice

**Solution**: 
1. Logged into Plesk control panel
2. Found the email account `noreply@math.moshchuk.com`
3. Checked the "Mailbox" checkbox  
4. SMTP authentication immediately started working

**Final Configuration**:
- Using Django SMTP backend (not Sendmail)
- EMAIL_HOST=sr308.hostgator.com
- EMAIL_PORT=465 
- EMAIL_USE_SSL=True
- EMAIL_HOST_USER=noreply@math.moshchuk.com
- EMAIL_HOST_PASSWORD=heliohost123

## Key Lessons Learned

1. **Always check basic configuration first** - The issue was a simple checkbox, not complex authentication or backend problems
2. **HelioHost does support SMTP** - No need for Sendmail backend workarounds
3. **Mailbox requirement** - Email accounts need mailbox enabled for mail authentication, even for send-only accounts
4. **Community support value** - Discord troubleshooting with hosting support was essential for resolution
5. **Server logs are crucial** - The actual error was only visible in server-side authentication logs

## Prevention for Future

- When setting up email accounts, always enable mailbox even for send-only accounts
- Check server logs early in troubleshooting process
- Don't assume hosting provider limitations without verification
- Use community support resources when stuck on hosting-specific issues
