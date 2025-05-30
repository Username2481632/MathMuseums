import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()

class EmailCheckConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()

    async def disconnect(self, close_code):
        pass

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            email = data.get('email', '').strip().lower()
            
            if not email:
                await self.send(text_data=json.dumps({
                    'type': 'email_check_result',
                    'email': email,
                    'exists': False,
                    'error': 'Invalid email'
                }))
                return
            
            # Check if user exists with this email
            user_exists = await self.check_user_exists(email)
            
            await self.send(text_data=json.dumps({
                'type': 'email_check_result',
                'email': email,
                'exists': user_exists
            }))
            
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON data'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e)
            }))

    @database_sync_to_async
    def check_user_exists(self, email):
        return User.objects.filter(email=email).exists()