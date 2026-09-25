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


from django.db.models import Sum, Count, F, Q, Avg
from django.utils import timezone
from datetime import timedelta


from django.db.models import Sum, Count, F, Q, Avg
from django.utils import timezone
from datetime import timedelta


def to_persian_date(gregorian_date):
    """تبدیل تاریخ میلادی به شمسی"""
    try:
        import jdatetime
        if hasattr(gregorian_date, 'date'):
            gregorian_date = gregorian_date.date()
        jd = jdatetime.date.fromgregorian(date=gregorian_date)
        return f"{jd.year}/{jd.month:02d}/{jd.day:02d}"
    except Exception as e:
        print("to_persian_date error:", e)
        if hasattr(gregorian_date, 'strftime'):
            return gregorian_date.strftime('%Y/%m/%d')
        return str(gregorian_date)


def to_gregorian_date(date_str):
    """
    تبدیل تاریخ شمسی (1405/06/01) یا میلادی (2026-08-23) به میلادی
    خروجی: رشته میلادی YYYY-MM-DD یا None
    """
    if not date_str:
        return None
    try:
        import jdatetime
        date_str = str(date_str).strip()
        
        # اگه میلادی بود (YYYY-MM-DD)
        if '-' in date_str and len(date_str.split('-')[0]) == 4:
            return date_str  # همون میلادی برمی‌گردونیم
        
        # اگه شمسی بود (YYYY/MM/DD)
        if '/' in date_str:
            parts = date_str.split('/')
            if len(parts) == 3:
                jy, jm, jd = int(parts[0]), int(parts[1]), int(parts[2])
                g = jdatetime.date(jy, jm, jd).togregorian()
                return g.strftime('%Y-%m-%d')
        
        return None
    except Exception as e:
        print("to_gregorian_date error:", e, "input:", date_str)
        return None


@extend_schema(description='آنالیتیکس فروشنده - داشبورد مالی')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def seller_analytics(request):
    if not request.user.is_seller:
        return Response({'error': 'فقط فروشندگان'}, status=status.HTTP_403_FORBIDDEN)
    
    period = request.query_params.get('period', 'monthly')
    shop_id = request.query_params.get('shop_id')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    
    from apps.shops.models import Shop, SellerExpense
    shops = Shop.objects.filter(owner=request.user)
    
    if shop_id and shop_id != 'all':
        shops = shops.filter(id=shop_id)
    
    shop_ids = list(shops.values_list('id', flat=True))
    
    orders = Order.objects.filter(
        product__shop_id__in=shop_ids,
        status__in=['confirmed', 'packed', 'shipped', 'delivered']
    )
    
    if date_from:
        orders = orders.filter(created_at__date__gte=date_from)
    if date_to:
        orders = orders.filter(created_at__date__lte=date_to)
    
    now = timezone.now()
    
    # محاسبه بازه
    if period == 'daily':
        orders = orders.filter(created_at__gte=now - timedelta(days=1))
        chart_count = 24
    elif period == 'weekly':
        orders = orders.filter(created_at__gte=now - timedelta(days=7))
        chart_count = 7
    elif period == 'yearly':
        orders = orders.filter(created_at__gte=now - timedelta(days=365))
        chart_count = 12
    else:  # monthly
        orders = orders.filter(created_at__gte=now - timedelta(days=30))
        chart_count = 30
    
    # نمودار
    chart_data = []
    
    # ═══════════════════════════════════════════════════════
    # حالت ۱: بازه زمانی دستی (date_from و date_to)
    # ═══════════════════════════════════════════════════════
    if date_from and date_to:
        from datetime import datetime
        try:
            start_d = datetime.strptime(date_from, '%Y-%m-%d').date()
            end_d = datetime.strptime(date_to, '%Y-%m-%d').date()
            delta = (end_d - start_d).days
            
            if delta <= 60:
                # نمایش روزانه
                for i in range(delta + 1):
                    day = start_d + timedelta(days=i)
                    day_orders = orders.filter(created_at__date=day)
                    chart_data.append({
                        'label': to_persian_date(day),
                        'amount': float(day_orders.aggregate(Sum('total_price'))['total_price__sum'] or 0),
                        'count': day_orders.count()
                    })
            else:
                # نمایش ماهانه برای بازه‌های طولانی
                current = start_d.replace(day=1)
                while current <= end_d:
                    if current.month == 12:
                        next_month = current.replace(year=current.year+1, month=1)
                    else:
                        next_month = current.replace(month=current.month+1)
                    month_orders = orders.filter(created_at__date__gte=current, created_at__date__lt=next_month)
                    chart_data.append({
                        'label': to_persian_date(current)[:7],
                        'amount': float(month_orders.aggregate(Sum('total_price'))['total_price__sum'] or 0),
                        'count': month_orders.count()
                    })
                    current = next_month
        except Exception as e:
            print("chart_data date range error:", e)
    
    # ═══════════════════════════════════════════════════════
    # حالت ۲: بر اساس period (روزانه/هفتگی/ماهانه/سالانه)
    # ═══════════════════════════════════════════════════════
    elif period == 'daily':
        for i in range(23, -1, -1):
            hour_start = (now - timedelta(hours=i)).replace(minute=0, second=0, microsecond=0)
            hour_end = hour_start + timedelta(hours=1)
            hour_orders = orders.filter(created_at__gte=hour_start, created_at__lt=hour_end)
            chart_data.append({
                'label': hour_start.strftime('%H:00'),
                'amount': float(hour_orders.aggregate(Sum('total_price'))['total_price__sum'] or 0),
                'count': hour_orders.count()
            })
    elif period == 'weekly':
        for i in range(6, -1, -1):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            day_orders = orders.filter(created_at__gte=day_start, created_at__lt=day_end)
            chart_data.append({
                'label': to_persian_date(day_start),
                'amount': float(day_orders.aggregate(Sum('total_price'))['total_price__sum'] or 0),
                'count': day_orders.count()
            })
    elif period == 'yearly':
        for i in range(11, -1, -1):
            month_start = (now - timedelta(days=i*30)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year+1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month+1)
            month_orders = orders.filter(created_at__gte=month_start, created_at__lt=month_end)
            chart_data.append({
                'label': to_persian_date(month_start)[:7],
                'amount': float(month_orders.aggregate(Sum('total_price'))['total_price__sum'] or 0),
                'count': month_orders.count()
            })
    else:  # monthly
        for i in range(29, -1, -1):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            day_orders = orders.filter(created_at__gte=day_start, created_at__lt=day_end)
            chart_data.append({
                'label': to_persian_date(day_start),
                'amount': float(day_orders.aggregate(Sum('total_price'))['total_price__sum'] or 0),
                'count': day_orders.count()
            })
    
    # آمار کلی
    total_sales = float(orders.aggregate(Sum('total_price'))['total_price__sum'] or 0)
    total_orders = orders.count()
    
    purchase_cost = 0
    for order in orders:
        if order.product.purchase_price:
            purchase_cost += float(order.product.purchase_price) * order.quantity
    
    # ═══════════════════════════════════════════════════════
    # هزینه‌های جانبی
    # ═══════════════════════════════════════════════════════
    from django.db.models import Q
    
    expenses_qs = SellerExpense.objects.filter(seller=request.user)
    
    # فیلتر فروشگاه
    if shop_id and shop_id != 'all':
        # فقط هزینه‌های همین فروشگاه
        expenses_qs = expenses_qs.filter(shop_id=shop_id)
    
    # فیلتر تاریخ
    if date_from:
        expenses_qs = expenses_qs.filter(expense_date__gte=date_from)
    if date_to:
        expenses_qs = expenses_qs.filter(expense_date__lte=date_to)
    
    # جمع کل هزینه‌های در بازه
    total_expenses = float(expenses_qs.aggregate(Sum('amount'))['amount__sum'] or 0)
    
    # لیست هزینه‌ها (برای نمایش در صفحه)
    expenses_list = []
    for e in expenses_qs.order_by('-expense_date')[:50]:
        expenses_list.append({
            'id': e.id,
            'title': e.title,
            'icon': e.icon,
            'amount': float(e.amount),
            'expense_date': e.expense_date.isoformat(),
            'shop_id': e.shop_id,
            'shop_name': e.shop.name if e.shop else None,
            'notes': e.notes,
        })
    
    # هزینه‌های هر فروشگاه (وقتی همه فروشگاه‌ها انتخاب شده)
    expenses_by_shop = []
    if not shop_id or shop_id == 'all':
        for shop in Shop.objects.filter(owner=request.user):
            shop_exp = expenses_qs.filter(shop=shop)
            shop_total = float(shop_exp.aggregate(Sum('amount'))['amount__sum'] or 0)
            if shop_total > 0:
                expenses_by_shop.append({
                    'shop_id': shop.id,
                    'shop_name': shop.name,
                    'total': shop_total,
                    'expenses': [{
                        'id': e.id,
                        'title': e.title,
                        'icon': e.icon,
                        'amount': float(e.amount),
                        'expense_date': e.expense_date.isoformat(),
                    } for e in shop_exp.order_by('-expense_date')[:20]]
                })
        
        # هزینه‌های عمومی (بدون فروشگاه)
        general_exp = expenses_qs.filter(shop__isnull=True)
        general_total = float(general_exp.aggregate(Sum('amount'))['amount__sum'] or 0)
        if general_total > 0:
            expenses_by_shop.insert(0, {
                'shop_id': None,
                'shop_name': 'عمومی (همه فروشگاه‌ها)',
                'total': general_total,
                'expenses': [{
                    'id': e.id,
                    'title': e.title,
                    'icon': e.icon,
                    'amount': float(e.amount),
                    'expense_date': e.expense_date.isoformat(),
                } for e in general_exp.order_by('-expense_date')[:20]]
            })
    
    gross_profit = total_sales - purchase_cost
    net_profit = gross_profit - total_expenses
    margin = (net_profit / total_sales * 100) if total_sales > 0 else 0
    
    # جدول فروشگاه‌ها
    shops_breakdown = []
    for shop in Shop.objects.filter(owner=request.user):
        shop_orders = orders.filter(product__shop=shop)
        shop_sales = float(shop_orders.aggregate(Sum('total_price'))['total_price__sum'] or 0)
        shop_purchase = 0
        for order in shop_orders:
            if order.product.purchase_price:
                shop_purchase += float(order.product.purchase_price) * order.quantity
        shop_profit = shop_sales - shop_purchase
        shop_margin = (shop_profit / shop_sales * 100) if shop_sales > 0 else 0
        
        # سهم هزینه‌های جانبی از این فروشگاه (به نسبت فروش)
        shop_expense_share = 0
        if total_sales > 0:
            shop_expense_share = (shop_sales / total_sales) * total_expenses
        shop_net_profit = shop_profit - shop_expense_share
        
        shops_breakdown.append({
            'id': shop.id,
            'name': shop.name,
            'sales': shop_sales,
            'profit': shop_profit,
            'net_profit': shop_net_profit,
            'margin': round(shop_margin, 1),
            'orders': shop_orders.count(),
        })
    
    shops_breakdown.sort(key=lambda x: x['sales'], reverse=True)
    
    # پرفروش‌ترین محصولات
    top_products = []
    for p in orders.values('product__title', 'product__id').annotate(
        total=Sum('total_price'), 
        count=Count('id'),
        qty=Sum('quantity'),
    ).order_by('-qty')[:10]:
        # محاسبه سود خالص
        product_orders = orders.filter(product_id=p['product__id'])
        product_purchase = 0
        for po in product_orders:
            if po.product.purchase_price:
                product_purchase += float(po.product.purchase_price) * po.quantity
        product_gross = float(p['total'] or 0) - product_purchase
        # سهم هزینه جانبی
        product_expense_share = 0
        if total_sales > 0:
            product_expense_share = (float(p['total'] or 0) / total_sales) * total_expenses
        product_net = product_gross - product_expense_share
        product_margin = (product_net / float(p['total'] or 0) * 100) if p['total'] else 0
        
        top_products.append({
            'id': p['product__id'],
            'title': p['product__title'],
            'amount': float(p['total'] or 0),
            'count': p['count'],
            'quantity': p['qty'] or 0,
            'purchase_cost': product_purchase,
            'gross_profit': product_gross,
            'net_profit': product_net,
            'margin': round(product_margin, 1),
        })
    
    # لیست سفارشات (برای نمایش جدول)
    orders_list = []
    if request.query_params.get('show_orders') == 'true':
        for o in orders.order_by('-created_at')[:50]:
            orders_list.append({
                'id': o.id,
                'tracking_code': o.tracking_code,
                'product_title': o.product.title,
                'quantity': o.quantity,
                'total_price': float(o.total_price),
                'status': o.status,
                'created_at': o.created_at.isoformat(),
            })
    
    return Response({
        'summary': {
            'total_sales': total_sales,
            'total_orders': total_orders,
            'avg_order': total_sales / total_orders if total_orders > 0 else 0,
            'purchase_cost': purchase_cost,
            'total_expenses': total_expenses,
            'gross_profit': gross_profit,
            'net_profit': net_profit,
            'margin': round(margin, 1),
        },
        'chart_data': chart_data,
        'top_products': top_products,
        'shops_breakdown': shops_breakdown,
        'orders_list': orders_list,
        'expenses_list': expenses_list,
        'expenses_by_shop': expenses_by_shop,
    })
