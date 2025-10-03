import json,time
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from collections import defaultdict
from .models import Room, Message,User

last_message_time = defaultdict(float)  # user-room → timestamp
ONLINE_USERS = {}

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_name']  # from routing
        self.room_group_name = f'chat_{self.room_id}'
        self.username = self.scope['user'].username
        ONLINE_USERS.setdefault(self.room_id, set()).add(self.username)

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type':"user_join",
                'username':list(ONLINE_USERS[self.room_id]),
            }
        )

    async def disconnect(self, close_code):
        ONLINE_USERS[self.room_id].discard(self.username)
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type':"user_leave",
                'username':self.username
            }
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        
        
        if "typing" in data:
            # Broadcast typing event
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "user_typing",
                    "username": self.username,
                    "typing": data["typing"]
                }
            )
        if "message" in data:
            key = f"{self.username}:{self.room_id}"
            now = time.time()

            if now - last_message_time[key] < 2:  # 2 sec cooldown
                await self.send(json.dumps({"event": "cooldown", "seconds": 2}))
                return

            last_message_time[key] = now
            
            message = data['message']
            username = data['username']
            print(f"User typed the message, {message}")

            # Save message in DB
            await self.save_message(username, self.room_id, message)

            # Broadcast to group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'username': username
                }
            )
            
        

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'username': event['username']
        }))

    async def user_typing(self, event):
        await self.send(text_data=json.dumps({
            "event": "typing",
            "username": event["username"],
            "typing": event["typing"]
        }))
    
    async def user_join(self,event):
        await self.send(text_data=json.dumps({
            "event":"join",
            "username":event["username"],
        }))
        
    async def user_leave(self,event):
        await self.send(text_data=json.dumps({
            "event":"leave",
            "username":event["username"]
        }))
        
    @database_sync_to_async
    def save_message(self, username, room_id, message):
        user = User.objects.get(username=username)
        room = Room.objects.get(id=room_id)

        msg = Message.objects.create(
            user=user,
            room=room,
            body=message
        )
        room.participants.add(user)
        return msg
    
    @database_sync_to_async
    def get_room(self, room_id):
        room = Room.objects.get(id=room_id)
        return [user.username for user in room.participants.all()]
