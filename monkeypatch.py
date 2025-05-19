"""
Monkeypatch module to fix translation issues in HelioHost environment.
This is loaded by dispatch.wsgi before importing Django.
"""

def apply_patches():
    """Apply patches to Django to avoid locale-related errors."""
    # Monkeypatch the translation module
    import django.utils.translation
    
    # Store original gettext function
    original_gettext = django.utils.translation.gettext
    
    # Replace with a simpler version that doesn't try to load translations
    def simple_gettext(message):
        return message
    
    # Apply the patch
    django.utils.translation.gettext = simple_gettext
    django.utils.translation.ugettext = simple_gettext
    django.utils.translation._ = simple_gettext

    return True
