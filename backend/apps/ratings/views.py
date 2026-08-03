from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from django.db.models import Avg, Count

from .models import PublicRating, SellerHiddenRating
from .serializers import (
    PublicRatingCreateSerializer, PublicRatingSerializer,
    UserRatingSummarySerializer, SellerHiddenRatingSerializer
)
from apps.orders.models import Order
from apps.courier.models import Courier


# ==================== PUBLIC RATING ====================

@extend_schema(
    description='ثبت امتیاز و نظر',
    request=PublicRatingCreateSerializer
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_rating(request):
    """ثبت امتیاز برای فروشنده یا پیک"""
    serializer = PublicRatingCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    
    # بررسی سفارش
    try:
        order = Order.objects.get(
            id=data['order_id'],
            customer_user=request.user,
            status='delivered'
        )
    except Order.DoesNotExist:
        return Response(
            {'error': 'سفارش یافت نشد یا هنوز تحویل داده نشده.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    target_type = data['target_type']
    
    # تعیین rated_user
    if target_type == 'seller':
        rated_user = order.product.shop.owner
    elif target_type == 'courier':
        if not hasattr(order, 'courier_request') or not order.courier_request.courier:
            return Response(
                {'error': 'این سفارش پیک ندارد.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        rated_user = order.courier_request.courier.user
    else:
        return Response({'error': 'نوع نامعتبر.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # بررسی تکراری نبودن
    if PublicRating.objects.filter(rater=request.user, order=order, target_type=target_type).exists():
        return Response(
            {'error': 'شما قبلاً امتیاز داده‌اید.'},
            status=status.HTTP_409_CONFLICT
        )
    
    # ایجاد امتیاز
    rating = PublicRating.objects.create(
        rater=request.user,
        rated_user=rated_user,
        target_type=target_type,
        order=order,
        stars=data['stars'],
        quality_score=data.get('quality_score'),
        speed_score=data.get('speed_score'),
        communication_score=data.get('communication_score'),
        accuracy_score=data.get('accuracy_score'),
        delivery_speed_score=data.get('delivery_speed_score'),
        behavior_score=data.get('behavior_score'),
        package_health_score=data.get('package_health_score'),
        comment=data.get('comment', ''),
    )
    
    # بروزرسانی میانگین امتیاز کاربر
    update_user_rating(rated_user, target_type)
    
    return Response(PublicRatingSerializer(rating).data, status=status.HTTP_201_CREATED)


def update_user_rating(user, target_type):
    """بروزرسانی میانگین امتیاز کاربر"""
    avg = PublicRating.objects.filter(
        rated_user=user,
        target_type=target_type
    ).aggregate(
        avg_stars=Avg('stars'),
        avg_score=Avg('score'),
        count=Count('id')
    )
    
    if target_type == 'courier':
        try:
            courier = Courier.objects.get(user=user)
            courier.rating = avg['avg_stars'] or 5.0
            courier.total_deliveries = avg['count'] or 0
            courier.save()
        except Courier.DoesNotExist:
            pass


@extend_schema(description='مشاهده امتیازات یک کاربر')
@api_view(['GET'])
def user_ratings(request, user_id):
    """مشاهده امتیازات یک کاربر"""
    target_type = request.query_params.get('type', 'seller')
    
    ratings = PublicRating.objects.filter(
        rated_user_id=user_id,
        target_type=target_type
    ).order_by('-created_at')
    
    # خلاصه
    summary = ratings.aggregate(
        avg_stars=Avg('stars'),
        avg_score=Avg('score'),
        total=Count('id')
    )
    
    return Response({
        'summary': {
            'average_stars': round(summary['avg_stars'] or 0, 1),
            'average_score': int(summary['avg_score'] or 0),
            'total_ratings': summary['total'],
            'stars_display': '⭐' * round(summary['avg_stars'] or 0),
        },
        'ratings': PublicRatingSerializer(ratings, many=True).data
    })


# ==================== HIDDEN RATING ====================

@extend_schema(description='ثبت/بروزرسانی امتیاز مخفی مشتری')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_hidden_rating(request):
    """فروشنده امتیاز مخفی مشتری رو تنظیم می‌کنه"""
    if not request.user.is_seller:
        return Response(
            {'error': 'فقط فروشندگان.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    customer_id = request.data.get('customer_id')
    if not customer_id:
        return Response({'error': 'شناسه مشتری الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)
    
    rating, created = SellerHiddenRating.objects.get_or_create(
        seller=request.user,
        customer_id=customer_id,
        defaults={
            'loyalty_score': request.data.get('loyalty_score', 50),
            'prompt_payment_score': request.data.get('prompt_payment_score', 50),
            'low_return_score': request.data.get('low_return_score', 50),
            'referral_score': request.data.get('referral_score', 50),
            'seller_note': request.data.get('seller_note', ''),
        }
    )
    
    if not created:
        # بروزرسانی
        for field in ['loyalty_score', 'prompt_payment_score', 'low_return_score', 'referral_score']:
            if field in request.data:
                setattr(rating, field, request.data[field])
        if 'seller_note' in request.data:
            rating.seller_note = request.data['seller_note']
        rating.save()
    
    return Response(SellerHiddenRatingSerializer(rating).data)


@extend_schema(description='مشاهده امتیازات مخفی مشتریان من')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_hidden_ratings(request):
    """فروشنده لیست امتیازات مخفی مشتریانش رو می‌بینه"""
    if not request.user.is_seller:
        return Response({'error': 'فقط فروشندگان.'}, status=status.HTTP_403_FORBIDDEN)
    
    ratings = SellerHiddenRating.objects.filter(seller=request.user)
    return Response(SellerHiddenRatingSerializer(ratings, many=True).data)
