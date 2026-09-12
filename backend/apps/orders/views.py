from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from django.db import models, transaction
from django.utils import timezone
from django.core.cache import cache

from .models import Order, SellerDiscountCode
from .serializers import (
    OrderCreateSerializer, OrderSerializer,
    DiscountCodeCreateSerializer, DiscountCodeSerializer,
    ValidateDiscountSerializer,
)
from apps.shops.models import Product


# ==================== ORDER ====================

@extend_schema(description='ثبت سفارش جدید (با پشتیبانی از کد تخفیف)')
@api_view(['POST'])
def create_order(request):
    serializer = OrderCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    
    try:
        product = Product.objects.select_related('shop', 'shop__owner').get(
            id=data['product_id'],
            is_visible=True,
            buy_link_active=True
        )
    except Product.DoesNotExist:
        return Response({'error': 'محصول یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
    
    quantity = data['quantity']
    if product.stock < quantity:
        return Response({'error': f'موجودی کافی نیست.'}, status=status.HTTP_400_BAD_REQUEST)
    
    total_price = product.price * quantity
    discount_amount = 0
    discount_code_used = None
    
    # اعمال کد تخفیف
    if data.get('discount_code'):
        phone = data.get('customer_phone', '')
        ip = request.META.get('REMOTE_ADDR', '0.0.0.0')
        
        result = apply_discount_code(
            code=data['discount_code'],
            seller_id=product.shop.owner_id,
            phone=phone,
            order_amount=total_price,
            ip_address=ip
        )
        if result['success']:
            discount_amount = result['discount_amount']
            discount_code_used = data['discount_code']
        else:
            return Response({'error': result['message']}, status=status.HTTP_400_BAD_REQUEST)
    
    customer_user = request.user if request.user.is_authenticated else None
    customer_guest_info = None
    if not customer_user:
        customer_guest_info = {
            'name': data.get('customer_name', 'ناشناس'),
            'phone': data.get('customer_phone', ''),
        }
    
    order = Order.objects.create(
        product=product,
        quantity=quantity,
        total_price=total_price,
        discount_code_used=discount_code_used,
        discount_amount_applied=discount_amount,
        source=data['source'],
        payment_method=data['payment_method'],
        shipping_address=data.get('shipping_address', ''),
        customer_user=customer_user,
        customer_guest_info=customer_guest_info,
    )
    
    product.stock -= quantity
    product.save(update_fields=['stock'])
    
    return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


@extend_schema(description='لیست سفارشات کاربر')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_orders(request):
    orders = Order.objects.filter(customer_user=request.user)
    status_filter = request.query_params.get('status')
    if status_filter:
        orders = orders.filter(status=status_filter)
    seller_filter = request.query_params.get('seller_id')
    if seller_filter:
        orders = orders.filter(product__shop__owner_id=seller_filter)
    return Response(OrderSerializer(orders, many=True).data)


@extend_schema(description='جزئیات سفارش')
@api_view(['GET'])
def order_detail(request, tracking_code):
    try:
        order = Order.objects.get(tracking_code=tracking_code)
    except Order.DoesNotExist:
        return Response({'error': 'سفارش یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(OrderSerializer(order).data)


@extend_schema(description='تغییر وضعیت سفارش (فروشنده)')
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_order_status(request, order_id):
    try:
        order = Order.objects.get(id=order_id, product__shop__owner=request.user)
    except Order.DoesNotExist:
        return Response({'error': 'سفارش یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
    new_status = request.data.get('status')
    if new_status not in dict(Order.STATUS_CHOICES):
        return Response({'error': 'وضعیت نامعتبر.'}, status=status.HTTP_400_BAD_REQUEST)
    order.status = new_status
    order.save(update_fields=['status', 'updated_at'])
    return Response(OrderSerializer(order).data)


# ==================== DISCOUNT CODE ====================

@extend_schema(description='ایجاد کد تخفیف جدید')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_discount_code(request):
    if not request.user.is_seller:
        return Response({'error': 'فقط فروشندگان.'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.user.subscription_plan not in ['silver', 'gold']:
        return Response({'error': 'کد تخفیف فقط با پلن نقره‌ای و طلایی.'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = DiscountCodeCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    
    if data['discount_type'] == 'fixed' and not data.get('discount_value'):
        return Response({'error': 'مبلغ تخفیف الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)
    if data['discount_type'] == 'percent' and not data.get('discount_percent'):
        return Response({'error': 'درصد تخفیف الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if SellerDiscountCode.objects.filter(seller=request.user, code=data['code']).exists():
        return Response({'error': 'این کد قبلاً استفاده شده.'}, status=status.HTTP_409_CONFLICT)
    
    valid_from = timezone.now()
    valid_until = valid_from + timezone.timedelta(days=data['valid_days'])
    
    discount = SellerDiscountCode.objects.create(
        seller=request.user,
        code=data['code'],
        discount_type=data['discount_type'],
        discount_value=data.get('discount_value'),
        discount_percent=data.get('discount_percent'),
        min_order_amount=data.get('min_order_amount'),
        max_discount_amount=data.get('max_discount_amount'),
        max_uses=data['max_uses'],
        valid_from=valid_from,
        valid_until=valid_until,
        note=data.get('note', ''),
    )
    
    return Response(DiscountCodeSerializer(discount).data, status=status.HTTP_201_CREATED)


@extend_schema(description='لیست کدهای تخفیف من')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_discount_codes(request):
    if not request.user.is_seller:
        return Response({'error': 'فقط فروشندگان.'}, status=status.HTTP_403_FORBIDDEN)
    codes = SellerDiscountCode.objects.filter(seller=request.user).order_by('-created_at')
    return Response(DiscountCodeSerializer(codes, many=True).data)


@extend_schema(description='اعتبارسنجی کد تخفیف (بدون مصرف)')
@api_view(['POST'])
def validate_discount_code(request):
    """فقط بررسی می‌کنه کد معتبر هست یا نه - used_count رو زیاد نمی‌کنه"""
    serializer = ValidateDiscountSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    
    result = check_discount_validity(
        code=data['code'],
        seller_id=data['seller_id'],
        phone=data.get('phone', ''),
        order_amount=data['order_amount'],
        ip_address=request.META.get('REMOTE_ADDR', '0.0.0.0')
    )
    
    if result['success']:
        return Response(result)
    else:
        return Response({'error': result['message']}, status=status.HTTP_400_BAD_REQUEST)


# ==================== DISCOUNT LOGIC ====================

def check_rate_limit(ip_address, seller_id):
    key = f"discount_attempts:{ip_address}:{seller_id}"
    attempts = cache.get(key, 0)
    if attempts >= 10:
        return False, "تعداد تلاش‌های ناموفق زیاد. لطفاً ۱ ساعت دیگر تلاش کنید."
    cache.set(key, attempts + 1, 3600)
    return True, "مجاز"


def check_discount_validity(code, seller_id, phone, order_amount, ip_address='0.0.0.0'):
    """فقط اعتبارسنجی - بدون مصرف کد"""
    
    allowed, msg = check_rate_limit(ip_address, seller_id)
    if not allowed:
        return {'success': False, 'message': msg}
    
    discount = SellerDiscountCode.objects.filter(
        code=code, seller_id=seller_id, is_active=True
    ).first()
    
    if not discount:
        return {'success': False, 'message': 'کد نامعتبر است.'}
    
    now = timezone.now()
    if now < discount.valid_from:
        return {'success': False, 'message': 'این کد هنوز فعال نشده است.'}
    if now > discount.valid_until:
        return {'success': False, 'message': 'این کد منقضی شده است.'}
    
    if discount.used_count >= discount.max_uses:
        return {'success': False, 'message': 'ظرفیت این کد پر شده است.'}
    
    if discount.min_order_amount and order_amount < discount.min_order_amount:
        return {'success': False, 'message': f'حداقل مبلغ سفارش: {discount.min_order_amount:,} تومان'}
    
    if phone:
        already_used = Order.objects.filter(
            discount_code_used=code,
            customer_guest_info__phone=phone,
            product__shop__owner_id=seller_id,
            
        ).exists()
        if already_used:
            return {'success': False, 'message': 'شما قبلاً از این کد استفاده کرده‌اید.'}
    
    discount_amount = 0
    if discount.discount_type == 'fixed':
        discount_amount = int(discount.discount_value)
    elif discount.discount_type == 'percent':
        discount_amount = int(order_amount * discount.discount_percent / 100)
        if discount.max_discount_amount and discount_amount > discount.max_discount_amount:
            discount_amount = int(discount.max_discount_amount)
    elif discount.discount_type == 'free_shipping':
        discount_amount = 50000
    
    return {
        'success': True,
        'message': f'کد {code} معتبر است.',
        'discount_amount': discount_amount,
        'discount_type': discount.discount_type,
        'final_amount': order_amount - discount_amount,
    }


@transaction.atomic
def apply_discount_code(code, seller_id, phone, order_amount, ip_address='0.0.0.0'):
    """اعتبارسنجی + مصرف کد (برای ثبت سفارش)"""
    
    result = check_discount_validity(code, seller_id, phone, order_amount, ip_address)
    if not result['success']:
        return result
    
    # مصرف کد (با قفل)
    discount = SellerDiscountCode.objects.select_for_update().get(
        code=code, seller_id=seller_id
    )
    discount.used_count = models.F('used_count') + 1
    discount.save(update_fields=['used_count'])
    
    return result


@extend_schema(description='آنالیتیکس فروشنده - نمودار فروش')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def seller_analytics(request):
    """آمار فروش فروشنده برای نمودارها"""
    from django.db.models import Sum, Count
    from django.utils import timezone
    from datetime import timedelta
    
    if not request.user.is_seller:
        return Response({'error': 'فقط فروشندگان'}, status=status.HTTP_403_FORBIDDEN)
    
    period = request.query_params.get('period', 'monthly')  # daily, weekly, monthly, yearly
    
    # فروش‌های فروشنده
    orders = Order.objects.filter(
        product__shop__owner=request.user,
        status__in=['confirmed', 'packed', 'shipped', 'delivered']
    )
    
    now = timezone.now()
    
    # داده‌های نمودار
    chart_data = []
    
    if period == 'daily':
        # ۳۰ روز گذشته
        for i in range(29, -1, -1):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            day_orders = orders.filter(created_at__gte=day_start, created_at__lt=day_end)
            chart_data.append({
                'label': day_start.strftime('%m/%d'),
                'amount': float(day_orders.aggregate(Sum('total_price'))['total_price__sum'] or 0),
                'count': day_orders.count()
            })
    elif period == 'weekly':
        # ۱۲ هفته گذشته
        for i in range(11, -1, -1):
            week_start = (now - timedelta(weeks=i)).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=now.weekday())
            week_end = week_start + timedelta(days=7)
            week_orders = orders.filter(created_at__gte=week_start, created_at__lt=week_end)
            chart_data.append({
                'label': f'هفته {12-i}',
                'amount': float(week_orders.aggregate(Sum('total_price'))['total_price__sum'] or 0),
                'count': week_orders.count()
            })
    elif period == 'yearly':
        # ۱۲ ماه گذشته
        for i in range(11, -1, -1):
            month_start = (now - timedelta(days=i*30)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year+1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month+1)
            month_orders = orders.filter(created_at__gte=month_start, created_at__lt=month_end)
            chart_data.append({
                'label': month_start.strftime('%Y/%m'),
                'amount': float(month_orders.aggregate(Sum('total_price'))['total_price__sum'] or 0),
                'count': month_orders.count()
            })
    else:  # monthly (default)
        # ۳۰ روز گذشته
        for i in range(29, -1, -1):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            day_orders = orders.filter(created_at__gte=day_start, created_at__lt=day_end)
            chart_data.append({
                'label': day_start.strftime('%m/%d'),
                'amount': float(day_orders.aggregate(Sum('total_price'))['total_price__sum'] or 0),
                'count': day_orders.count()
            })
    
    # آمار کلی
    total_sales = float(orders.aggregate(Sum('total_price'))['total_price__sum'] or 0)
    total_orders = orders.count()
    
    # پرفروش‌ترین محصولات
    top_products = []
    products = request.user.shops.values_list('products', flat=True)
    for p in orders.values('product__title').annotate(
        total=Sum('total_price'), count=Count('id')
    ).order_by('-total')[:5]:
        top_products.append({
            'title': p['product__title'],
            'amount': float(p['total'] or 0),
            'count': p['count']
        })
    
    return Response({
        'total_sales': total_sales,
        'total_orders': total_orders,
        'avg_order': total_sales / total_orders if total_orders > 0 else 0,
        'chart_data': chart_data,
        'top_products': top_products,
    })
