from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/auth/email-check/$', consumers.EmailCheckConsumer.as_asgi()),
]
