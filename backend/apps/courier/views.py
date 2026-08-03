from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from django.utils import timezone
import random

from .models import Courier, CourierPricing, CourierRequest
from .serializers import (
    CourierRegisterSerializer, CourierSerializer,
    CourierPricingSerializer,
    CourierRequestCreateSerializer, CourierRequestSerializer
)
from apps.orders.models import Order


# ==================== COURIER ====================

@extend_schema(
    description='ثبت‌نام به عنوان پیک',
    request=CourierRegisterSerializer
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_courier(request):
    """ثبت‌نام پیک جدید"""
    user = request.user
    
    # بررسی تکراری نبودن
    if Courier.objects.filter(user=user).exists():
        return Response(
            {'error': 'شما قبلاً ثبت‌نام کرده‌اید.'},
            status=status.HTTP_409_CONFLICT
        )
    
    serializer = CourierRegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    
    courier = Courier.objects.create(
        user=user,
        vehicle_type=data['vehicle_type'],
        vehicle_plate=data.get('vehicle_plate', ''),
        max_distance_km=data['max_distance_km'],
    )
    
    # تغییر user_type
    user.user_type = 'courier'
    user.save()
    
    return Response({
        'message': 'ثبت‌نام با موفقیت انجام شد. لطفاً مدارک خود را بارگذاری کنید.',
        'courier': CourierSerializer(courier).data
    }, status=status.HTTP_201_CREATED)


@extend_schema(description='بارگذاری مدارک پیک')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_documents(request):
    """بارگذاری مدارک پیک"""
    try:
        courier = Courier.objects.get(user=request.user)
    except Courier.DoesNotExist:
        return Response({'error': 'پیک یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
    
    courier.national_card_image = request.FILES.get('national_card')
    courier.license_image = request.FILES.get('license')
    courier.vehicle_card_image = request.FILES.get('vehicle_card')
    courier.approval_status = 'documents_uploaded'
    courier.save()
    
    return Response({
        'message': 'مدارک با موفقیت بارگذاری شد. در انتظار تأیید مدیر.',
        'status': courier.approval_status
    })


@extend_schema(description='لیست تعرفه‌های پیک')
@api_view(['GET'])
def list_pricing(request):
    """مشاهده تعرفه‌های پیک"""
    pricing = CourierPricing.objects.filter(is_active=True)
    return Response(CourierPricingSerializer(pricing, many=True).data)


# ==================== COURIER REQUEST ====================

@extend_schema(
    description='درخواست پیک (توسط فروشنده)',
    request=CourierRequestCreateSerializer
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_courier(request):
    """فروشنده درخواست پیک می‌دهد"""
    user = request.user
    
    if not user.is_seller:
        return Response(
            {'error': 'فقط فروشندگان می‌توانند درخواست پیک دهند.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # بررسی پلن
    if user.subscription_plan not in ['silver', 'gold']:
        return Response(
            {'error': 'امکان درخواست پیک فقط با پلن نقره‌ای و طلایی.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = CourierRequestCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    
    # بررسی سفارش
    try:
        order = Order.objects.get(
            id=data['order_id'],
            product__shop__owner=user,
            status='confirmed'
        )
    except Order.DoesNotExist:
        return Response(
            {'error': 'سفارش یافت نشد یا در وضعیت مناسب نیست.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # محاسبه هزینه
    try:
        pricing = CourierPricing.objects.get(
            vehicle_type=data['vehicle_type'],
            is_active=True
        )
    except CourierPricing.DoesNotExist:
        return Response(
            {'error': 'تعرفه‌ای برای این وسیله یافت نشد.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    distance = data['distance_km']
    if distance <= 5:
        # درون شهری
        fee = pricing.city_base_fee + (distance * pricing.city_per_km_fee)
    else:
        # حومه
        fee = pricing.suburb_base_fee + (distance * pricing.suburb_per_km_fee)
    
    # ایجاد درخواست
    courier_request = CourierRequest.objects.create(
        order=order,
        seller=user,
        pickup_address=data['pickup_address'],
        pickup_lat=data['pickup_lat'],
        pickup_lng=data['pickup_lng'],
        delivery_address=data['delivery_address'],
        delivery_lat=data['delivery_lat'],
        delivery_lng=data['delivery_lng'],
        distance_km=distance,
        estimated_fee=fee,
    )
    
    return Response(
        CourierRequestSerializer(courier_request).data,
        status=status.HTTP_201_CREATED
    )


@extend_schema(description='پذیرش سفارش توسط پیک')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_request(request, request_id):
    """پیک درخواست را قبول می‌کند"""
    try:
        courier = Courier.objects.get(user=request.user, is_active=True)
    except Courier.DoesNotExist:
        return Response(
            {'error': 'پیک تأیید نشده یا غیرفعال است.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        courier_request = CourierRequest.objects.get(
            id=request_id,
            status='pending',
            courier__isnull=True
        )
    except CourierRequest.DoesNotExist:
        return Response(
            {'error': 'درخواست یافت نشد یا قبلاً پذیرفته شده.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    courier_request.courier = courier
    courier_request.status = 'accepted'
    courier_request.save()
    
    return Response({
        'message': 'سفارش پذیرفته شد.',
        'pickup_code': courier_request.pickup_code
    })
