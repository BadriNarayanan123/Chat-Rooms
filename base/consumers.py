import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from .models import Room, Message,User

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_name']  # from routing
        self.room_group_name = f'chat_{self.room_id}'
        self.username = self.scope['user'].username

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        participants = await self.get_room(self.room_id)
        print(participants)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type':"user_join",
                'username':self.username,
                'participants':participants
            }
        )

    async def disconnect(self, close_code):
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
        else:
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
            "participants":event["participants"]
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
