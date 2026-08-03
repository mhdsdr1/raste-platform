from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from .models import ChatRoom, ChatMessage
from .serializers import (
    ChatRoomSerializer, ChatMessageSerializer, SendMessageSerializer
)
from apps.orders.models import Order


@extend_schema(description='ایجاد یا دریافت اتاق گفتگو برای یک سفارش')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_or_get_room(request):
    """ایجاد اتاق گفتگو برای سفارش (شرکت‌کنندگان: خریدار + فروشنده + پیک)"""
    order_id = request.data.get('order_id')
    
    try:
        order = Order.objects.select_related('product__shop__owner', 'customer_user').get(id=order_id)
    except Order.DoesNotExist:
        return Response({'error': 'سفارش یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
    
    # شرکت‌کنندگان
    participants = []
    
    # فروشنده
    participants.append(order.product.shop.owner)
    
    # خریدار (اگر لاگین کرده باشه)
    if order.customer_user:
        participants.append(order.customer_user)
    
    # کاربر فعلی (اگه جزو خریدار یا فروشنده نیست، مثلاً پیک)
    if request.user not in participants:
        participants.append(request.user)
    
    # پیک (اگر درخواست پیک داره)
    if hasattr(order, 'courier_request') and order.courier_request.courier:
        participants.append(order.courier_request.courier.user)
    
    # حذف تکراری‌ها
    participants = list(set(participants))
    
    # بررسی وجود اتاق قبلی با همین شرکت‌کنندگان
    room = ChatRoom.objects.filter(
        order=order,
        participants__in=participants
    ).distinct().first()
    
    if not room:
        room = ChatRoom.objects.create(order=order)
        room.participants.set(participants)
        room.save()
    else:
        # اضافه کردن شرکت‌کننده جدید (مثلاً پیک)
        for p in participants:
            if p not in room.participants.all():
                room.participants.add(p)
    
    return Response(ChatRoomSerializer(room).data)


@extend_schema(description='لیست اتاق‌های کاربر')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_rooms(request):
    """لیست اتاق‌های گفتگوی کاربر"""
    rooms = ChatRoom.objects.filter(
        participants=request.user,
        is_active=True
    ).order_by('-updated_at')
    
    return Response(ChatRoomSerializer(rooms, many=True).data)


@extend_schema(description='دریافت پیام‌های یک اتاق')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def room_messages(request, room_id):
    """لیست پیام‌های یک اتاق"""
    try:
        room = ChatRoom.objects.get(id=room_id, participants=request.user)
    except ChatRoom.DoesNotExist:
        return Response({'error': 'اتاق یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
    
    messages = room.messages.all()
    
    # علامت‌گذاری پیام‌ها به عنوان خوانده شده
    room.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
    
    return Response(ChatMessageSerializer(messages, many=True).data)


@extend_schema(
    description='ارسال پیام جدید',
    request=SendMessageSerializer
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request, room_id):
    """ارسال پیام به اتاق"""
    try:
        room = ChatRoom.objects.get(id=room_id, participants=request.user, is_active=True)
    except ChatRoom.DoesNotExist:
        return Response({'error': 'اتاق یافت نشد یا غیرفعال است.'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = SendMessageSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    
    message = ChatMessage.objects.create(
        room=room,
        sender=request.user,
        message_type=data['message_type'],
        content=data.get('content', ''),
        reference_id=data.get('reference_id'),
    )
    
    if 'attachment' in request.FILES:
        message.attachment = request.FILES['attachment']
        message.save()
    
    room.save()
    
    return Response(ChatMessageSerializer(message).data, status=status.HTTP_201_CREATED)


@extend_schema(description='جستجو در پیام‌های یک اتاق')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_messages(request, room_id):
    """جستجو در پیام‌های قدیمی"""
    query = request.query_params.get('q', '')
    
    try:
        room = ChatRoom.objects.get(id=room_id, participants=request.user)
    except ChatRoom.DoesNotExist:
        return Response({'error': 'اتاق یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
    
    messages = room.messages.filter(content__icontains=query)
    
    return Response(ChatMessageSerializer(messages, many=True).data)
