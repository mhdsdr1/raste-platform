from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from .models import LoyaltySettings, CustomerLoyaltyPoints, LoyaltyTransaction
from .serializers import (
    LoyaltySettingsSerializer,
    CustomerLoyaltyPointsSerializer,
    LoyaltyTransactionSerializer,
    RedeemPointsSerializer,
)
from apps.orders.models import Order


# ==================== SETTINGS ====================

@extend_schema(description='تنظیمات باشگاه مشتریان من')
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def my_loyalty_settings(request):
    """مشاهده یا ویرایش تنظیمات باشگاه"""
    if not request.user.is_seller:
        return Response({'error': 'فقط فروشندگان.'}, status=status.HTTP_403_FORBIDDEN)
    
    settings, created = LoyaltySettings.objects.get_or_create(seller=request.user)
    
    if request.method == 'GET':
        return Response(LoyaltySettingsSerializer(settings).data)
    
    elif request.method == 'PUT':
        serializer = LoyaltySettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==================== MY POINTS ====================

@extend_schema(description='امتیازات من نزد یک فروشنده')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_points_with_seller(request, seller_id):
    """مشاهده امتیازات من نزد فروشنده"""
    try:
        points = CustomerLoyaltyPoints.objects.get(
            customer=request.user,
            seller_id=seller_id
        )
        return Response(CustomerLoyaltyPointsSerializer(points).data)
    except CustomerLoyaltyPoints.DoesNotExist:
        return Response({
            'total_points_earned': 0,
            'available_points': 0,
            'tier': 'bronze',
            'credit_value': 0,
            'can_get_free_shipping': False,
        })


@extend_schema(description='تاریخچه تراکنش‌های امتیاز من')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_transactions(request):
    """تاریخچه تراکنش‌های امتیاز من"""
    seller_id = request.query_params.get('seller_id')
    
    transactions = LoyaltyTransaction.objects.filter(customer=request.user)
    if seller_id:
        transactions = transactions.filter(seller_id=seller_id)
    
    return Response(LoyaltyTransactionSerializer(transactions, many=True).data)


# ==================== REDEEM ====================

@extend_schema(
    description='مصرف امتیاز',
    request=RedeemPointsSerializer
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def redeem_points(request):
    """مصرف امتیاز برای تخفیف یا ارسال رایگان"""
    serializer = RedeemPointsSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    
    # بررسی وجود امتیاز
    try:
        customer_points = CustomerLoyaltyPoints.objects.get(
            customer=request.user,
            seller_id=data['seller_id']
        )
    except CustomerLoyaltyPoints.DoesNotExist:
        return Response({'error': 'امتیازی یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
    
    # بررسی تنظیمات
    try:
        settings = LoyaltySettings.objects.get(seller_id=data['seller_id'], is_active=True)
    except LoyaltySettings.DoesNotExist:
        return Response({'error': 'باشگاه مشتریان این فروشنده غیرفعال است.'}, status=status.HTTP_400_BAD_REQUEST)
    
    points_to_use = data['points']
    redeem_type = data['redeem_type']
    
    # اعتبارسنجی
    if points_to_use > customer_points.available_points:
        return Response({'error': 'امتیاز کافی ندارید.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if points_to_use < settings.min_redeem_points:
        return Response(
            {'error': f'حداقل امتیاز قابل مصرف: {settings.min_redeem_points}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if redeem_type == 'free_shipping' and points_to_use < settings.free_shipping_points:
        return Response(
            {'error': f'برای ارسال رایگان {settings.free_shipping_points} امتیاز لازم است.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # مصرف امتیاز
    customer_points.available_points -= points_to_use
    customer_points.save()
    
    # ثبت تراکنش
    if redeem_type == 'credit':
        credit_value = points_to_use // settings.points_to_credit_rate
        description = f'تبدیل {points_to_use} امتیاز به {credit_value:,} تومان تخفیف'
    else:
        description = f'مصرف {points_to_use} امتیاز برای ارسال رایگان'
    
    LoyaltyTransaction.objects.create(
        customer=request.user,
        seller_id=data['seller_id'],
        transaction_type='redeem',
        points=-points_to_use,
        description=description,
    )
    
    return Response({
        'message': 'امتیاز با موفقیت مصرف شد.',
        'used_points': points_to_use,
        'remaining_points': customer_points.available_points,
        'description': description,
    })


# ==================== SELLER VIEWS ====================

@extend_schema(description='لیست مشتریان وفادار من')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_loyal_customers(request):
    """فروشنده لیست مشتریان وفادارش رو می‌بینه"""
    if not request.user.is_seller:
        return Response({'error': 'فقط فروشندگان.'}, status=status.HTTP_403_FORBIDDEN)
    
    customers = CustomerLoyaltyPoints.objects.filter(
        seller=request.user
    ).select_related('customer').order_by('-total_points_earned')
    
    return Response(CustomerLoyaltyPointsSerializer(customers, many=True).data)


@extend_schema(description='اهدای امتیاز جایزه به مشتری')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def give_bonus_points(request):
    """فروشنده به مشتری امتیاز جایزه میده"""
    if not request.user.is_seller:
        return Response({'error': 'فقط فروشندگان.'}, status=status.HTTP_403_FORBIDDEN)
    
    customer_id = request.data.get('customer_id')
    points = request.data.get('points', 0)
    description = request.data.get('description', 'امتیاز جایزه')
    
    if not customer_id or points <= 0:
        return Response({'error': 'اطلاعات ناقص.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # بروزرسانی امتیازات
    loyalty, created = CustomerLoyaltyPoints.objects.get_or_create(
        customer_id=customer_id,
        seller=request.user,
    )
    loyalty.available_points += points
    loyalty.total_points_earned += points
    loyalty.save()
    loyalty.update_tier()
    
    # ثبت تراکنش
    LoyaltyTransaction.objects.create(
        customer_id=customer_id,
        seller=request.user,
        transaction_type='bonus',
        points=points,
        description=description,
    )
    
    return Response({
        'message': f'{points} امتیاز به مشتری اهدا شد.',
        'customer': CustomerLoyaltyPointsSerializer(loyalty).data
    })
