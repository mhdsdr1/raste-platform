from rest_framework import serializers
from .models import ChatRoom, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    """سریالایزر پیام"""
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    sender_phone = serializers.CharField(source='sender.phone', read_only=True)
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'room', 'sender', 'sender_name', 'sender_phone',
            'message_type', 'content', 'attachment',
            'reference_id', 'is_read', 'created_at',
        ]
        read_only_fields = ['id', 'sender', 'created_at']


class ChatRoomSerializer(serializers.ModelSerializer):
    """سریالایزر اتاق گفتگو"""
    last_message = ChatMessageSerializer(read_only=True)
    unread_count = serializers.IntegerField(read_only=True)
    participants_list = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatRoom
        fields = [
            'id', 'participants', 'participants_list',
            'order', 'is_active',
            'last_message', 'unread_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_participants_list(self, obj):
        return [
            {'id': p.id, 'phone': p.phone, 'name': p.get_full_name()}
            for p in obj.participants.all()
        ]


class SendMessageSerializer(serializers.Serializer):
    """سریالایزر ارسال پیام"""
    message_type = serializers.ChoiceField(
        choices=['text', 'image', 'product', 'location', 'order'],
        default='text'
    )
    content = serializers.CharField(required=False, allow_blank=True)
    reference_id = serializers.IntegerField(required=False)
