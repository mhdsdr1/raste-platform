from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from .models import Shop, Product, SellerExpense
from .serializers import (
    ShopSerializer, ShopCreateSerializer,
    ProductSerializer, ProductCreateSerializer,
)


@extend_schema(description='ایجاد فروشگاه جدید', request=ShopCreateSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_shop(request):
    user = request.user
    if not user.is_seller:
        return Response({'error': 'فقط فروشندگان'}, status=status.HTTP_403_FORBIDDEN)
    serializer = ShopCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    shop = Shop.objects.create(owner=user, **serializer.validated_data)
    return Response(ShopSerializer(shop).data, status=status.HTTP_201_CREATED)


@extend_schema(description='لیست فروشگاه‌های کاربر')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_my_shops(request):
    shops = request.user.shops.all()
    return Response(ShopSerializer(shops, many=True, context={'request': request}).data)


@extend_schema(description='جزئیات فروشگاه')
@api_view(['GET'])
def shop_detail(request, shop_id):
    try:
        shop = Shop.objects.get(id=shop_id)
    except Shop.DoesNotExist:
        return Response({'error': 'فروشگاه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    return Response(ShopSerializer(shop, context={'request': request}).data)


@extend_schema(description='آپدیت فروشگاه')
@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_shop(request, shop_id):
    try:
        shop = Shop.objects.get(id=shop_id, owner=request.user)
    except Shop.DoesNotExist:
        return Response({'error': 'فروشگاه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    allowed = ['name', 'description', 'shop_type', 'contact_phone', 'address', 'is_active']
    for field in allowed:
        if field in request.data:
            setattr(shop, field, request.data[field])
    
    # عکس‌ها از request.FILES میان
    if 'logo' in request.FILES:
        shop.logo = request.FILES['logo']
    if 'banner' in request.FILES:
        shop.banner = request.FILES['banner']
    
    shop.save()
    return Response(ShopSerializer(shop, context={'request': request}).data)


@extend_schema(description='ایجاد محصول', request=ProductCreateSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_product(request, shop_id):
    try:
        shop = Shop.objects.get(id=shop_id, owner=request.user)
    except Shop.DoesNotExist:
        return Response({'error': 'فروشگاه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    serializer = ProductCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    product = Product.objects.create(shop=shop, **serializer.validated_data)
    
    # عکس محصول از request.FILES
    print('DEBUG FILES:', list(request.FILES.keys()))
    print('DEBUG DATA keys:', list(request.data.keys()))
    if 'image' in request.FILES:
        product.image = request.FILES['image']
        product.save()
    else:
        print('DEBUG: image not in FILES')
    
    # ═══ چک دسته‌های پرخطر ═══
    category = product.category or ''
    if category in Product.BANNED_CATEGORIES:
        product.approval_status = 'rejected'
        product.rejection_reason = 'این دسته‌بندی طبق قوانین پلتفرم ممنوع است'
        product.is_visible = False
        product.save()
        # نوتیف به فروشنده
        try:
            from apps.users.models import Notification
            Notification.create_notif(
                user=request.user,
                title='⚠️ آگهی شما رد شد',
                message=f'آگهی «{product.title}» به دلیل «{product.rejection_reason}» رد شد.',
                notif_type='alert',
                link='/seller/products',
                icon='⚠️',
            )
        except Exception as e:
            print('Notif error:', e)
        return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)
    
    if category in Product.HIGH_RISK_CATEGORIES:
        product.approval_status = 'pending_review'
        product.rejection_reason = 'این دسته‌بندی نیازمند تایید دستی است'
        product.is_visible = False
        product.save()
        # نوتیف به ادمین
        try:
            from apps.users.models import Notification, User
            for admin in User.objects.filter(is_staff=True):
                Notification.create_notif(
                    user=admin,
                    title='⚠️ محصول نیازمند تایید',
                    message=f'محصول «{product.title}» در دسته پرخطر ثبت شد و نیازمند تایید است.',
                    notif_type='alert',
                    link='/admin/appeals',
                    icon='⚠️',
                )
        except Exception as e:
            print('Notif error:', e)
        return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)
    
    # ═══ بررسی خودکار با AI ═══
    try:
        from .ai_moderator import moderate_product
        image_file = request.FILES.get('image')
        result = moderate_product(
            title=product.title or '',
            description=product.description or '',
            image_file=image_file,
        )
        
        if result['status'] == 'approved':
            product.approval_status = 'approved'
        elif result['status'] == 'rejected':
            product.approval_status = 'rejected'
            product.rejection_reason = result['reason']
            product.is_visible = False
            # هشدار به فروشنده
            try:
                from apps.users.models import Notification
                Notification.create_notif(
                    user=request.user,
                    title='⚠️ آگهی شما رد شد',
                    message=f'آگهی «{product.title}» به دلیل استفاده از عبارات ممنوع رد شد. می‌توانید اعتراض کنید.',
                    notif_type='alert',
                    link=f'/seller/appeal/{product.id}',
                    icon='⚠️',
                )
            except Exception as e:
                print('Notif error:', e)
        elif result['status'] == 'pending_review':
            product.approval_status = 'pending_review'
            product.rejection_reason = result['reason']
            product.is_visible = False
            try:
                from apps.users.models import Notification, User
                print('DEBUG: creating seller notif for', request.user.phone)
                Notification.create_notif(
                    user=request.user,
                    title='⏳ آگهی شما در انتظار بررسی',
                    message=f'آگهی «{product.title}» به دلیل وجود متن در عکس، در صف بررسی دستی قرار گرفت. حداکثر ۲۴ ساعت آینده نتیجه اعلام می‌شود.',
                    notif_type='system',
                    link='/seller/products',
                    icon='⏳',
                )
                # نوتیف به ادمین‌ها (به جز خود فروشنده)
                admin_list = User.objects.filter(is_staff=True).exclude(id=request.user.id)
                print('DEBUG: admin list =', [a.phone for a in admin_list])
                for admin in admin_list:
                    Notification.create_notif(
                        user=admin,
                        title='⚠️ محصول نیازمند بررسی',
                        message=f'محصول «{product.title}» حاوی متن در عکس است و نیازمند بررسی دستی است.',
                        notif_type='alert',
                        link='/admin/appeals',
                        icon='⚠️',
                    )
            except Exception as e:
                print('Notif error:', e)
        
        product.save()
    except Exception as e:
        import traceback
        traceback.print_exc()
        product.approval_status = 'approved'  # فال‌بک: اگه AI خطا داد، تایید کن
        product.save()
    
    return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)


@extend_schema(description='لیست محصولات فروشگاه')
@api_view(['GET'])
def list_products(request, shop_id):
    try:
        shop = Shop.objects.get(id=shop_id, is_active=True)
    except Shop.DoesNotExist:
        return Response({'error': 'فروشگاه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    products = shop.products.filter(is_visible=True, is_deleted=False)
    return Response(ProductSerializer(products, many=True).data)


@extend_schema(description='جزئیات محصول')
@api_view(['GET'])
def product_detail(request, product_id):
    try:
        product = Product.objects.get(id=product_id, is_visible=True)
    except Product.DoesNotExist:
        return Response({'error': 'محصول یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    return Response(ProductSerializer(product).data)


@extend_schema(description='آپدیت محصول')
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_product(request, product_id):
    try:
        product = Product.objects.get(id=product_id, shop__owner=request.user)
    except Product.DoesNotExist:
        return Response({'error': 'محصول یافت نشد یا دسترسی ندارید'}, status=status.HTTP_404_NOT_FOUND)
    allowed = ['title', 'description', 'price', 'stock', 'purchase_price', 'warehouse_stock', 'condition', 'category', 'color',
                      'colors',
                      'sizes',
               'health_status', 'health_description', 'allow_local_test', 'allow_courier',
               'story', 'is_visible', 'buy_link_active']
    for field in allowed:
        if field in request.data:
            value = request.data[field]
            # اگه محصول پنهان شده (is_deleted)، فروشنده نمی‌تونه is_visible رو تغییر بده
            if field == 'is_visible' and product.is_deleted:
                continue
            if field in ['colors', 'sizes'] and isinstance(value, str):
                import json
                value = json.loads(value)
            # تبدیل رشته به بولین برای فیلدهای checkbox
            if field in ['allow_courier', 'allow_local_test', 'is_visible', 'buy_link_active']:
                if isinstance(value, str):
                    value = value.lower() == 'true'
            setattr(product, field, value)
    
    # عکس محصول از request.FILES
    if 'image' in request.FILES:
        product.image = request.FILES['image']
    # اگه stock توی request هست، همون رو استفاده کن
    if 'stock' in request.data and not product.colors and not product.sizes:
        product.stock = request.data['stock']
    elif product.colors and isinstance(product.colors, dict) and len(product.colors) > 0:
        product.stock = sum(int(v) for v in product.colors.values() if isinstance(v, (int, float)) and v > 0)
    elif product.sizes and isinstance(product.sizes, dict) and len(product.sizes) > 0:
        product.stock = sum(int(v) for v in product.sizes.values() if isinstance(v, (int, float)) and v > 0)
    product.save()
    return Response(ProductSerializer(product).data)


@extend_schema(description='لیست همه محصولات فروشگاه (حتی مخفی‌ها)')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_products(request, shop_id):
    try:
        shop = Shop.objects.get(id=shop_id, owner=request.user)
    except Shop.DoesNotExist:
        return Response({'error': 'فروشگاه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    products = shop.products.all()
    return Response(ProductSerializer(products, many=True).data)


@extend_schema(description='ثبت درخواست اطلاع‌رسانی موجودی')
@api_view(['POST'])
def notify_me(request, product_id):
    phone = request.data.get('phone')
    if not phone:
        return Response({'error': 'شماره الزامی'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'محصول یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    return Response({'message': f'در صورت موجود شدن {product.title} به شما اطلاع داده میشه'})


@extend_schema(description='حذف محصول')
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_product(request, product_id):
    try:
        product = Product.objects.get(id=product_id, shop__owner=request.user)
    except Product.DoesNotExist:
        return Response({'error': 'محصول یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    product.delete()
    return Response({'message': 'محصول حذف شد'})


# ==================== SELLER EXPENSES ====================

@extend_schema(description='لیست هزینه‌های جانبی')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_expenses(request):
    if not request.user.is_seller:
        return Response({'error': 'فقط فروشندگان'}, status=status.HTTP_403_FORBIDDEN)
    
    expenses = SellerExpense.objects.filter(seller=request.user)
    
    shop_id = request.query_params.get('shop_id')
    if shop_id and shop_id != 'all':
        expenses = expenses.filter(shop_id=shop_id)
    
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    if date_from:
        expenses = expenses.filter(expense_date__gte=date_from)
    if date_to:
        expenses = expenses.filter(expense_date__lte=date_to)
    
    from .serializers import SellerExpenseSerializer
    total = sum(e.amount for e in expenses)
    
    # گروه‌بندی بر اساس فروشگاه
    from apps.shops.models import Shop
    shops_grouped = []
    for shop in Shop.objects.filter(owner=request.user):
        shop_expenses = expenses.filter(shop=shop)
        if shop_expenses.exists():
            shops_grouped.append({
                'shop_id': shop.id,
                'shop_name': shop.name,
                'expenses': SellerExpenseSerializer(shop_expenses, many=True).data,
                'total': sum(e.amount for e in shop_expenses),
            })
    
    # هزینه‌های بدون فروشگاه (عمومی)
    general_expenses = expenses.filter(shop__isnull=True)
    general_total = sum(e.amount for e in general_expenses)
    
    return Response({
        'expenses': SellerExpenseSerializer(expenses, many=True).data,
        'total': total,
        'shops_grouped': shops_grouped,
        'general_expenses': SellerExpenseSerializer(general_expenses, many=True).data,
        'general_total': general_total,
    })


@extend_schema(description='افزودن هزینه جانبی')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_expense(request):
    if not request.user.is_seller:
        return Response({'error': 'فقط فروشندگان'}, status=status.HTTP_403_FORBIDDEN)
    
    from .serializers import SellerExpenseSerializer
    from django.utils import timezone
    
    title = request.data.get('title')
    amount = request.data.get('amount')
    
    if not title or not amount:
        return Response({'error': 'عنوان و مبلغ الزامی است'}, status=status.HTTP_400_BAD_REQUEST)
    
    shop_id = request.data.get('shop')
    expense = SellerExpense.objects.create(
        seller=request.user,
        shop_id=shop_id if shop_id else None,
        title=title,
        icon=request.data.get('icon', ''),
        amount=amount,
        expense_date=request.data.get('expense_date', timezone.now().date()),
        notes=request.data.get('notes', ''),
    )
    
    return Response(SellerExpenseSerializer(expense).data, status=status.HTTP_201_CREATED)


@extend_schema(description='حذف هزینه جانبی')
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_expense(request, expense_id):
    try:
        expense = SellerExpense.objects.get(id=expense_id, seller=request.user)
    except SellerExpense.DoesNotExist:
        return Response({'error': 'هزینه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    
    expense.delete()
    return Response({'message': 'حذف شد'})


@extend_schema(description='ویرایش هزینه جانبی')
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_expense(request, expense_id):
    try:
        expense = SellerExpense.objects.get(id=expense_id, seller=request.user)
    except SellerExpense.DoesNotExist:
        return Response({'error': 'هزینه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    
    for field in ['title', 'icon', 'amount', 'expense_date', 'notes']:
        if field in request.data:
            setattr(expense, field, request.data[field])
    
    expense.save()
    from .serializers import SellerExpenseSerializer
    return Response(SellerExpenseSerializer(expense).data)


@extend_schema(description='جدول ماتریسی هزینه‌ها به تفکیک فروشگاه و نوع')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def expenses_matrix(request):
    """جدول هزینه‌ها: فروشگاه × نوع هزینه"""
    if not request.user.is_seller:
        return Response({'error': 'فقط فروشندگان'}, status=status.HTTP_403_FORBIDDEN)
    
    from apps.shops.models import Shop
    from django.db.models import Sum
    
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    
    # تبدیل شمسی به میلادی
    from apps.orders.views import to_gregorian_date
    greg_from = to_gregorian_date(date_from) if date_from else None
    greg_to = to_gregorian_date(date_to) if date_to else None
    
    expenses = SellerExpense.objects.filter(seller=request.user)
    if greg_from:
        expenses = expenses.filter(expense_date__gte=greg_from)
    if greg_to:
        expenses = expenses.filter(expense_date__lte=greg_to)
    
    # همه فروشگاه‌های کاربر
    shops = Shop.objects.filter(owner=request.user).order_by('id')
    
    # همه انواع هزینه (یکتا)
    expense_types = list(expenses.values_list('title', flat=True).distinct().order_by('title'))
    
    # اگر هیچ هزینه‌ای نبود
    if not expense_types:
        return Response({
            'shops': [],
            'expense_types': [],
            'matrix': {},
            'row_totals': {},
            'col_totals': {},
            'grand_total': 0,
        })
    
    # ساخت ماتریس
    matrix = {}
    row_totals = {}
    
    for shop in shops:
        matrix[shop.id] = {}
        shop_total = 0
        for etype in expense_types:
            amount = expenses.filter(shop=shop, title=etype).aggregate(Sum('amount'))['amount__sum'] or 0
            matrix[shop.id][etype] = float(amount)
            shop_total += float(amount)
        row_totals[shop.id] = shop_total
    
    # جمع هر ستون (نوع هزینه)
    col_totals = {}
    for etype in expense_types:
        col_total = expenses.filter(title=etype).aggregate(Sum('amount'))['amount__sum'] or 0
        col_totals[etype] = float(col_total)
    
    # جمع کل
    grand_total = float(expenses.aggregate(Sum('amount'))['amount__sum'] or 0)
    
    return Response({
        'shops': [{'id': s.id, 'name': s.name} for s in shops],
        'expense_types': expense_types,
        'matrix': matrix,
        'row_totals': row_totals,
        'col_totals': col_totals,
        'grand_total': grand_total,
    })

# ═══════════════════════════════════════════════════════════
# بدهکاران و بستانکاران
# ═══════════════════════════════════════════════════════════

@extend_schema(description='لیست بدهکاران و بستانکاران')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_debts(request):
    """لیست بدهکاران/بستانکاران با فیلتر"""
    if not request.user.is_seller:
        return Response({'error': 'فقط فروشندگان'}, status=status.HTTP_403_FORBIDDEN)
    
    from .models import SellerDebt
    from .serializers import SellerDebtSerializer
    from apps.orders.views import to_gregorian_date
    from django.db.models import Sum, Q
    
    debts = SellerDebt.objects.filter(seller=request.user)
    
    # فیلتر فروشگاه
    shop_id = request.query_params.get('shop_id')
    if shop_id and shop_id != 'all':
        debts = debts.filter(shop_id=shop_id)
    
    # فیلتر نوع (بدهکار/بستانکار)
    debt_type = request.query_params.get('debt_type')
    if debt_type and debt_type != 'all':
        debts = debts.filter(debt_type=debt_type)
    
    # فیلتر شخص
    person_name = request.query_params.get('person_name')
    if person_name:
        debts = debts.filter(person_name__icontains=person_name)
    
    # فیلتر تاریخ (شمسی → میلادی)
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    greg_from = to_gregorian_date(date_from) if date_from else None
    greg_to = to_gregorian_date(date_to) if date_to else None
    
    if greg_from:
        debts = debts.filter(transaction_date__gte=greg_from)
    if greg_to:
        debts = debts.filter(transaction_date__lte=greg_to)
    
    # فیلتر سررسید گذشته
    if request.query_params.get('overdue') == 'true':
        from django.utils import timezone
        debts = debts.filter(due_date__lt=timezone.now().date()).filter(paid_amount__lt=models.F('amount'))
    
    # جمع‌ها
    debtor_total = debts.filter(debt_type='debtor').aggregate(Sum('amount'))['amount__sum'] or 0
    creditor_total = debts.filter(debt_type='creditor').aggregate(Sum('amount'))['amount__sum'] or 0
    debtor_paid = debts.filter(debt_type='debtor').aggregate(Sum('paid_amount'))['paid_amount__sum'] or 0
    creditor_paid = debts.filter(debt_type='creditor').aggregate(Sum('paid_amount'))['paid_amount__sum'] or 0
    
    # ترتیب
    sort = request.query_params.get('sort', 'desc')
    if sort == 'asc':
        debts = debts.order_by('due_date', 'transaction_date')
    else:
        debts = debts.order_by('-due_date', '-transaction_date')
    
    # لیست اشخاص (گروه‌بندی شده)
    persons = {}
    for d in debts:
        key = d.person_name
        if key not in persons:
            persons[key] = {
                'name': d.person_name,
                'phone': d.person_phone,
                'national_id': d.person_national_id,
                'address': d.person_address,
                'postal_code': d.person_postal_code,
                'debtor_total': 0,
                'creditor_total': 0,
                'debtor_paid': 0,
                'creditor_paid': 0,
                'count': 0,
            }
        if d.debt_type == 'debtor':
            persons[key]['debtor_total'] += float(d.amount)
            persons[key]['debtor_paid'] += float(d.paid_amount)
        else:
            persons[key]['creditor_total'] += float(d.amount)
            persons[key]['creditor_paid'] += float(d.paid_amount)
        persons[key]['count'] += 1
    
    persons_list = sorted(persons.values(), key=lambda x: x['name'])
    
    # خلاصه هر فروشگاه (برای حالت "همه فروشگاه‌ها")
    from apps.shops.models import Shop
    shop_summary = []
    for shop in Shop.objects.filter(owner=request.user):
        shop_debts = SellerDebt.objects.filter(seller=request.user, shop=shop)
        shop_debtor_total = shop_debts.filter(debt_type='debtor').aggregate(Sum('amount'))['amount__sum'] or 0
        shop_creditor_total = shop_debts.filter(debt_type='creditor').aggregate(Sum('amount'))['amount__sum'] or 0
        shop_debtor_paid = shop_debts.filter(debt_type='debtor').aggregate(Sum('paid_amount'))['paid_amount__sum'] or 0
        shop_creditor_paid = shop_debts.filter(debt_type='creditor').aggregate(Sum('paid_amount'))['paid_amount__sum'] or 0
        
        shop_debtor_remaining = float(shop_debtor_total) - float(shop_debtor_paid)
        shop_creditor_remaining = float(shop_creditor_total) - float(shop_creditor_paid)
        shop_balance = shop_debtor_remaining - shop_creditor_remaining
        
        if shop_debts.exists():
            shop_summary.append({
                'shop_id': shop.id,
                'shop_name': shop.name,
                'debtor_total': float(shop_debtor_total),
                'creditor_total': float(shop_creditor_total),
                'debtor_remaining': shop_debtor_remaining,
                'creditor_remaining': shop_creditor_remaining,
                'balance': shop_balance,
                'count': shop_debts.count(),
                'debtor_count': shop_debts.filter(debt_type='debtor').count(),
                'creditor_count': shop_debts.filter(debt_type='creditor').count(),
            })
    
    # هزینه‌های عمومی (بدون فروشگاه)
    general_debts = SellerDebt.objects.filter(seller=request.user, shop__isnull=True)
    if general_debts.exists():
        gen_debtor_total = general_debts.filter(debt_type='debtor').aggregate(Sum('amount'))['amount__sum'] or 0
        gen_creditor_total = general_debts.filter(debt_type='creditor').aggregate(Sum('amount'))['amount__sum'] or 0
        gen_debtor_paid = general_debts.filter(debt_type='debtor').aggregate(Sum('paid_amount'))['paid_amount__sum'] or 0
        gen_creditor_paid = general_debts.filter(debt_type='creditor').aggregate(Sum('paid_amount'))['paid_amount__sum'] or 0
        
        gen_debtor_remaining = float(gen_debtor_total) - float(gen_debtor_paid)
        gen_creditor_remaining = float(gen_creditor_total) - float(gen_creditor_paid)
        gen_balance = gen_debtor_remaining - gen_creditor_remaining
        
        shop_summary.insert(0, {
            'shop_id': None,
            'shop_name': 'عمومی (همه فروشگاه‌ها)',
            'debtor_total': float(gen_debtor_total),
            'creditor_total': float(gen_creditor_total),
            'debtor_remaining': gen_debtor_remaining,
            'creditor_remaining': gen_creditor_remaining,
            'balance': gen_balance,
            'count': general_debts.count(),
        })
    
    return Response({
        'debts': SellerDebtSerializer(debts, many=True).data,
        'total_count': debts.count(),
        'summary': {
            'debtor_total': float(debtor_total),
            'creditor_total': float(creditor_total),
            'debtor_paid': float(debtor_paid),
            'creditor_paid': float(creditor_paid),
            'debtor_remaining': float(debtor_total) - float(debtor_paid),
            'creditor_remaining': float(creditor_total) - float(creditor_paid),
            'balance': float(debtor_total) - float(creditor_total),
        },
        'persons': persons_list,
        'shop_summary': shop_summary,
    })


@extend_schema(description='افزودن بدهکار/بستانکار')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_debt(request):
    """ایجاد بدهکار/بستانکار جدید"""
    if not request.user.is_seller:
        return Response({'error': 'فقط فروشندگان'}, status=status.HTTP_403_FORBIDDEN)
    
    from .models import SellerDebt, Shop
    from .serializers import SellerDebtSerializer
    from apps.orders.views import to_gregorian_date
    from django.utils import timezone
    
    # تبدیل تاریخ شمسی
    from datetime import datetime as dt
    
    trans_date = request.data.get('transaction_date')
    greg_trans = to_gregorian_date(trans_date) if trans_date else timezone.now().date().isoformat()
    # تبدیل string به date
    if greg_trans and isinstance(greg_trans, str):
        greg_trans = dt.strptime(greg_trans, '%Y-%m-%d').date()
    
    due = request.data.get('due_date')
    greg_due = to_gregorian_date(due) if due else None
    # تبدیل string به date
    if greg_due and isinstance(greg_due, str):
        greg_due = dt.strptime(greg_due, '%Y-%m-%d').date()
    
    # فروشگاه (اجباری)
    shop_id = request.data.get('shop')
    if not shop_id or shop_id == 'all':
        return Response({'error': 'فروشگاه الزامی است'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        shop = Shop.objects.get(id=shop_id, owner=request.user)
    except Shop.DoesNotExist:
        return Response({'error': 'فروشگاه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    
    person_name = request.data.get('person_name', '').strip()
    person_national_id = request.data.get('person_national_id', '').strip()
    
    # ═══ چک تکراری بودن کد ملی با نام متفاوت ═══
    if person_national_id:
        existing = SellerDebt.objects.filter(
            seller=request.user,
            person_national_id=person_national_id
        ).exclude(person_name=person_name).first()
        
        if existing:
            return Response({
                'error': 'این کد ملی برای فرد دیگری ثبت شده است'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    # ═══ اعتبارسنجی طول ═══
    card_number = request.data.get('card_number', '') or ''
    sheba_number = request.data.get('sheba_number', '') or ''
    
    if card_number and len(card_number) > 16:
        return Response({'error': 'شماره کارت نباید بیشتر از ۱۶ رقم باشد'}, status=status.HTTP_400_BAD_REQUEST)
    if sheba_number and len(sheba_number) > 24:
        return Response({'error': 'شبا نباید بیشتر از ۲۴ رقم باشد'}, status=status.HTTP_400_BAD_REQUEST)
    
    # parent_debt (برای تسویه)
    parent_debt_id = request.data.get('parent_debt')
    parent_debt = None
    if parent_debt_id:
        try:
            parent_debt = SellerDebt.objects.get(id=parent_debt_id, seller=request.user)
        except SellerDebt.DoesNotExist:
            pass
    
    try:
        debt = SellerDebt.objects.create(
            seller=request.user,
            shop=shop,
            debt_type=request.data.get('debt_type', 'debtor'),
            person_name=person_name,
            person_phone=request.data.get('person_phone', ''),
            person_national_id=person_national_id,
            person_address=request.data.get('person_address', ''),
            person_postal_code=request.data.get('person_postal_code', ''),
            bank_name=request.data.get('bank_name', ''),
            card_number=card_number,
            sheba_number=sheba_number,
            amount=request.data.get('amount', 0),
            paid_amount=request.data.get('paid_amount', 0),
            due_date=greg_due,
            payment_type=request.data.get('payment_type', 'credit'),
            is_installment=request.data.get('is_installment', False),
            installment_count=request.data.get('installment_count'),
            installment_amount=request.data.get('installment_amount'),
            notes=request.data.get('notes', ''),
            transaction_date=greg_trans,
            parent_debt=parent_debt,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': f'خطا در ذخیره: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(SellerDebtSerializer(debt).data, status=status.HTTP_201_CREATED)


@extend_schema(description='ویرایش بدهکار/بستانکار')
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_debt(request, debt_id):
    """ویرایش"""
    from .models import SellerDebt
    from .serializers import SellerDebtSerializer
    from apps.orders.views import to_gregorian_date
    
    try:
        debt = SellerDebt.objects.get(id=debt_id, seller=request.user)
    except SellerDebt.DoesNotExist:
        return Response({'error': 'یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    
    # تبدیل تاریخ‌ها
    from datetime import datetime as dt
    
    if 'transaction_date' in request.data:
        greg = to_gregorian_date(request.data['transaction_date'])
        if greg and isinstance(greg, str):
            greg = dt.strptime(greg, '%Y-%m-%d').date()
        request.data['transaction_date'] = greg
    
    if 'due_date' in request.data and request.data['due_date']:
        greg = to_gregorian_date(request.data['due_date'])
        if greg and isinstance(greg, str):
            greg = dt.strptime(greg, '%Y-%m-%d').date()
        request.data['due_date'] = greg
    elif 'due_date' in request.data and not request.data['due_date']:
        request.data['due_date'] = None
    
    # ═══ چک تکراری بودن کد ملی (اگه تغییر کرده) ═══
    new_nid = request.data.get('person_national_id', debt.person_national_id)
    new_name = request.data.get('person_name', debt.person_name)
    
    if new_nid:
        existing = SellerDebt.objects.filter(
            seller=request.user,
            person_national_id=new_nid
        ).exclude(person_name=new_name).exclude(id=debt.id).first()
        
        if existing:
            return Response({
                'error': 'این کد ملی برای فرد دیگری ثبت شده است'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = SellerDebtSerializer(debt, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(description='حذف بدهکار/بستانکار')
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_debt(request, debt_id):
    """حذف"""
    from .models import SellerDebt
    
    try:
        debt = SellerDebt.objects.get(id=debt_id, seller=request.user)
        debt.delete()
        return Response({'message': 'حذف شد'}, status=status.HTTP_200_OK)
    except SellerDebt.DoesNotExist:
        return Response({'error': 'یافت نشد'}, status=status.HTTP_404_NOT_FOUND)


@extend_schema(description='پرداخت (تسویه)')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pay_debt(request, debt_id):
    """پرداخت مبلغ"""
    from .models import SellerDebt
    from .serializers import SellerDebtSerializer
    
    try:
        debt = SellerDebt.objects.get(id=debt_id, seller=request.user)
    except SellerDebt.DoesNotExist:
        return Response({'error': 'یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    
    pay_amount = float(request.data.get('amount', 0))
    if pay_amount <= 0:
        return Response({'error': 'مبلغ نامعتبر'}, status=status.HTTP_400_BAD_REQUEST)
    
    debt.paid_amount = min(float(debt.paid_amount) + pay_amount, float(debt.amount))
    debt.save()
    
    return Response(SellerDebtSerializer(debt).data)

@extend_schema(description='گرفتن مشخصات شخص با کد ملی')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_person_by_nid(request):
    """با کد ملی، آخرین مشخصات شخص رو برمی‌گردونه"""
    from .models import SellerDebt
    
    nid = request.query_params.get('nid', '').strip()
    if not nid or len(nid) != 10:
        return Response({'error': 'کد ملی نامعتبر'}, status=status.HTTP_400_BAD_REQUEST)
    
    # آخرین تراکنش این شخص (جدیدترین)
    debt = SellerDebt.objects.filter(
        seller=request.user,
        person_national_id=nid
    ).order_by('-created_at').first()
    
    if not debt:
        return Response({'found': False})
    
    return Response({
        'found': True,
        'person': {
            'person_name': debt.person_name,
            'person_phone': debt.person_phone,
            'person_national_id': debt.person_national_id,
            'person_address': debt.person_address,
            'person_postal_code': debt.person_postal_code,
            'bank_name': debt.bank_name,
            'card_number': debt.card_number,
            'sheba_number': debt.sheba_number,
        }
    })

# ═══════════════════════════════════════════════════════════
# پرداخت‌ها (تسویه)
# ═══════════════════════════════════════════════════════════

@extend_schema(description='لیست پرداخت‌های یک بدهی')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_payments(request, debt_id):
    """لیست پرداخت‌های یه بدهی"""
    from .models import SellerDebt, DebtPayment
    from .serializers import DebtPaymentSerializer
    
    try:
        debt = SellerDebt.objects.get(id=debt_id, seller=request.user)
    except SellerDebt.DoesNotExist:
        return Response({'error': 'یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    
    payments = debt.payments.all()
    
    return Response({
        'debt_id': debt.id,
        'person_name': debt.person_name,
        'person_phone': debt.person_phone,
        'debt_type': debt.debt_type,
        'total_amount': float(debt.amount),
        'total_paid': float(debt.total_paid),
        'remaining': float(debt.remaining),
        'payments': DebtPaymentSerializer(payments, many=True).data,
    })


@extend_schema(description='ثبت پرداخت جدید')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment(request, debt_id):
    """ثبت پرداخت جدید"""
    from .models import SellerDebt, DebtPayment
    from .serializers import DebtPaymentSerializer
    from apps.orders.views import to_gregorian_date
    from datetime import datetime as dt
    
    try:
        debt = SellerDebt.objects.get(id=debt_id, seller=request.user)
    except SellerDebt.DoesNotExist:
        return Response({'error': 'یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    
    amount = float(request.data.get('amount', 0))
    if amount <= 0:
        return Response({'error': 'مبلغ باید بیشتر از صفر باشد'}, status=status.HTTP_400_BAD_REQUEST)
    
    if amount > float(debt.remaining):
        return Response({'error': f'مبلغ بیشتر از مانده ({debt.remaining}) است'}, status=status.HTTP_400_BAD_REQUEST)
    
    # تاریخ
    pay_date = request.data.get('payment_date')
    if pay_date:
        greg_date = to_gregorian_date(pay_date)
        if greg_date and isinstance(greg_date, str):
            greg_date = dt.strptime(greg_date, '%Y-%m-%d').date()
    else:
        from django.utils import timezone
        greg_date = timezone.now().date()
    
    # بررسی تسویه کامل
    is_full = (amount == float(debt.remaining))
    
    payment = DebtPayment.objects.create(
        debt=debt,
        amount=amount,
        payment_date=greg_date,
        payment_method=request.data.get('payment_method', 'cash'),
        notes=request.data.get('notes', ''),
        is_full_settlement=is_full,
    )
    
    # آپدیت paid_amount توی SellerDebt
    debt.paid_amount = debt.total_paid
    debt.save()
    
    return Response({
        'payment': DebtPaymentSerializer(payment).data,
        'debt_remaining': float(debt.remaining),
        'debt_total_paid': float(debt.total_paid),
    }, status=status.HTTP_201_CREATED)


@extend_schema(description='حذف پرداخت')
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_payment(request, payment_id):
    """حذف پرداخت"""
    from .models import DebtPayment
    
    try:
        payment = DebtPayment.objects.get(id=payment_id, debt__seller=request.user)
        debt = payment.debt
        payment.delete()
        
        # آپدیت paid_amount
        debt.paid_amount = debt.total_paid
        debt.save()
        
        return Response({'message': 'حذف شد', 'debt_remaining': float(debt.remaining)})
    except DebtPayment.DoesNotExist:
        return Response({'error': 'یافت نشد'}, status=status.HTTP_404_NOT_FOUND)


@extend_schema(description='ثبت اعتراض به رد آگهی')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_appeal(request, product_id):
    from .models import Product
    from django.utils import timezone
    try:
        product = Product.objects.get(id=product_id, shop__owner=request.user)
    except Product.DoesNotExist:
        return Response({'error': 'محصول یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    if product.approval_status not in ['rejected', 'pending_review']:
        return Response({'error': 'فقط برای آگهی‌های رد شده یا در انتظار بررسی قابل اعتراض است'}, status=status.HTTP_400_BAD_REQUEST)
    if product.appeal_status == 'pending':
        return Response({'error': 'اعتراض شما قبلاً ثبت شده'}, status=status.HTTP_400_BAD_REQUEST)
    appeal_text = request.data.get('appeal_text', '').strip()
    if not appeal_text:
        return Response({'error': 'متن اعتراض الزامی است'}, status=status.HTTP_400_BAD_REQUEST)
    product.appeal_text = appeal_text
    product.appeal_status = 'pending'
    product.appeal_created_at = timezone.now()
    
    # فایل پیوست اعتراض — فقط اگه ادمین اجازه داده باشه
    if 'appeal_attachment' in request.FILES:
        if not product.allow_appeal_attachment:
            return Response({'error': 'ارسال فایل پیوست برای این اعتراض مجاز نیست'}, status=status.HTTP_400_BAD_REQUEST)
        file = request.FILES['appeal_attachment']
        max_size = product.appeal_attachment_max_size_mb * 1024 * 1024
        if file.size > max_size:
            return Response({'error': f'حجم فایل نباید بیشتر از {product.appeal_attachment_max_size_mb} مگابایت باشد'}, status=status.HTTP_400_BAD_REQUEST)
        product.appeal_attachment = file
    
    product.save()
    
    # ثبت پیام در تاریخچه
    from .models import AppealMessage
    AppealMessage.objects.create(
        product=product,
        sender=request.user,
        sender_type='seller',
        message=appeal_text,
        attachment=product.appeal_attachment if product.appeal_attachment else None,
    )
    
    try:
        from apps.users.models import Notification, User
        for admin in User.objects.filter(is_staff=True):
            Notification.create_notif(
                user=admin, title='⚠️ اعتراض جدید به آگهی',
                message='فروشنده ' + request.user.phone + ' به رد آگهی «' + product.title + '» اعتراض کرد.',
                notif_type='alert', link='/admin/appeals', icon='📩',
            )
    except Exception as e:
        print('Notif error:', e)
    return Response({'message': 'اعتراض شما ثبت شد', 'appeal_status': 'pending'})


@extend_schema(description='لیست اعتراضات (ادمین)')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_appeals(request):
    if not request.user.is_staff:
        return Response({'error': 'دسترسی ندارید'}, status=status.HTTP_403_FORBIDDEN)
    from .models import Product
    from .serializers import ProductSerializer
    from django.db.models import Q
    products = Product.objects.filter(
        Q(appeal_status='pending') | 
        Q(approval_status='pending_review', appeal_status='none')
    ).order_by('-created_at')
    return Response({'appeals': ProductSerializer(products, many=True).data, 'count': products.count()})


@extend_schema(description='بررسی اعتراض (ادمین)')
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def review_appeal(request, product_id):
    if not request.user.is_staff:
        return Response({'error': 'دسترسی ندارید'}, status=status.HTTP_403_FORBIDDEN)
    from .models import Product
    from .serializers import ProductSerializer
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'محصول یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    action = request.data.get('action')
    admin_notes = request.data.get('admin_notes', '')
    admin_response = request.data.get('admin_response', '')
    
    if action == 'accept':
        product.approval_status = 'approved'
        product.appeal_status = 'accepted'
        product.rejection_reason = ''
        product.is_visible = True
        msg = 'اعتراض پذیرفته شد'
    elif action == 'reject':
        product.appeal_status = 'rejected'
        if admin_notes:
            product.rejection_reason = admin_notes
        msg = 'اعتراض رد شد'
    elif action == 'respond':
        product.appeal_status = 'responded'
        msg = 'پاسخ ارسال شد'
    else:
        return Response({'error': 'action باید accept یا reject یا respond باشد'}, status=status.HTTP_400_BAD_REQUEST)
    
    if admin_response:
        product.admin_response = admin_response
    
    # فعال‌سازی پیوست برای فروشنده
    if 'allow_appeal_attachment' in request.data:
        product.allow_appeal_attachment = str(request.data['allow_appeal_attachment']).lower() in ['true', '1', 'yes']
    
    if 'appeal_attachment_max_size_mb' in request.data:
        try:
            product.appeal_attachment_max_size_mb = int(request.data['appeal_attachment_max_size_mb'])
        except (ValueError, TypeError):
            pass
    
    # فایل پیوست
    if 'admin_attachment' in request.FILES:
        from .models import SystemSettings
        settings = SystemSettings.get_settings()
        max_size = settings.admin_attachment_max_size_mb * 1024 * 1024
        file = request.FILES['admin_attachment']
        if file.size > max_size:
            return Response({'error': f'حجم فایل نباید بیشتر از {settings.admin_attachment_max_size_mb} مگابایت باشد'}, status=status.HTTP_400_BAD_REQUEST)
        product.admin_attachment = file
    
    product.save()
    
    # ثبت پاسخ ادمین در تاریخچه
    from .models import AppealMessage
    admin_msg = admin_response if admin_response else msg
    AppealMessage.objects.create(
        product=product,
        sender=request.user,
        sender_type='admin',
        message=admin_msg,
        attachment=product.admin_attachment if product.admin_attachment else None,
    )
    
    try:
        from apps.users.models import Notification
        Notification.create_notif(
            user=product.shop.owner,
            title='📩 نتیجه اعتراض: ' + msg,
            message='آگهی «' + product.title + '» - ' + msg,
            notif_type='order' if action == 'accept' else 'alert',
            link=f'/seller/appeal/{product.id}', icon='✅' if action == 'accept' else '❌',
        )
    except Exception as e:
        print('Notif error:', e)
    return Response(ProductSerializer(product).data)

@extend_schema(description='تنظیمات سیستم')
@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def system_settings(request):
    """GET: خواندن، PATCH: آپدیت (فقط ادمین)"""
    from .models import SystemSettings
    
    if request.method == 'GET':
        settings = SystemSettings.get_settings()
        return Response({
            'appeal_max_file_size_mb': settings.appeal_max_file_size_mb,
            'admin_attachment_max_size_mb': settings.admin_attachment_max_size_mb,
        })
    
    # PATCH — فقط ادمین
    if not request.user.is_staff:
        return Response({'error': 'دسترسی ندارید'}, status=status.HTTP_403_FORBIDDEN)
    
    settings = SystemSettings.get_settings()
    
    if 'appeal_max_file_size_mb' in request.data:
        try:
            settings.appeal_max_file_size_mb = int(request.data['appeal_max_file_size_mb'])
        except (ValueError, TypeError):
            pass
    
    if 'admin_attachment_max_size_mb' in request.data:
        try:
            settings.admin_attachment_max_size_mb = int(request.data['admin_attachment_max_size_mb'])
        except (ValueError, TypeError):
            pass
    
    settings.save()
    
    return Response({
        'appeal_max_file_size_mb': settings.appeal_max_file_size_mb,
        'admin_attachment_max_size_mb': settings.admin_attachment_max_size_mb,
    })

@extend_schema(description='جزئیات اعتراض برای فروشنده')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def appeal_detail(request, product_id):
    """اطلاعات اعتراض یک محصول برای فروشنده"""
    from .serializers import ProductSerializer
    try:
        product = Product.objects.get(id=product_id, shop__owner=request.user)
    except Product.DoesNotExist:
        return Response({'error': 'محصول یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    
    return Response({
        'id': product.id,
        'title': product.title,
        'description': product.description,
        'rejection_reason': product.rejection_reason,
        'approval_status': product.approval_status,
        'appeal_status': product.appeal_status,
        'appeal_text': product.appeal_text,
        'admin_response': product.admin_response,
        'admin_attachment_url': request.build_absolute_uri(product.admin_attachment.url) if product.admin_attachment else '',
        'appeal_attachment_url': request.build_absolute_uri(product.appeal_attachment.url) if product.appeal_attachment else '',
        'allow_appeal_attachment': product.allow_appeal_attachment,
        'appeal_attachment_max_size_mb': product.appeal_attachment_max_size_mb,
    })

@extend_schema(description='تاریخچه پیام‌های اعتراض (ادمین)')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def appeal_messages(request, product_id):
    """لیست کامل پیام‌های مکالمه اعتراض - فقط ادمین"""
    if not request.user.is_staff:
        return Response({'error': 'دسترسی ندارید'}, status=status.HTTP_403_FORBIDDEN)
    
    from .models import Product, AppealMessage
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'محصول یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    
    messages = AppealMessage.objects.filter(product=product).order_by('created_at')
    
    result = []
    for m in messages:
        attachment_url = ''
        if m.attachment:
            attachment_url = request.build_absolute_uri(m.attachment.url)
        result.append({
            'id': m.id,
            'sender_type': m.sender_type,
            'sender_phone': m.sender.phone if m.sender else '',
            'message': m.message,
            'attachment_url': attachment_url,
            'created_at': m.created_at.isoformat(),
        })
    
    return Response({
        'product_id': product.id,
        'product_title': product.title,
        'messages': result,
    })

@extend_schema(description='درخت کاربران → فروشگاه‌ها → محصولات (ادمین)')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_tree(request):
    """درخت کامل برای مرکز کنترل - فقط ادمین/مدیر"""
    if not request.user.can_access_control:
        return Response({'error': 'دسترسی ندارید'}, status=status.HTTP_403_FORBIDDEN)
    
    from apps.users.models import User
    from .models import Shop, Product
    from django.db.models import Q, Count
    
    search = request.query_params.get('search', '').strip()
    
    # لیست کاربران (فقط کسانی که فروشگاه دارن یا ادمین/مدیرن)
    users_qs = User.objects.filter(
        Q(shops__isnull=False) | Q(role__in=['admin', 'owner'])
    ).distinct()
    
    if search:
        users_qs = users_qs.filter(
            Q(phone__icontains=search) |
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search) |
            Q(national_id__icontains=search) |
            Q(shops__name__icontains=search) |
            Q(shops__products__title__icontains=search)
        ).distinct()
    
    users_qs = users_qs.order_by('-created_at')[:50]  # محدودیت ۵۰ کاربر
    
    result = []
    for u in users_qs:
        shops = Shop.objects.filter(owner=u)
        # اگه جستجو روی فروشگاه/محصول بود، فقط فروشگاه‌های مرتبط رو نشون بده
        if search:
            shops = shops.filter(
                Q(name__icontains=search) |
                Q(products__title__icontains=search)
            ).distinct()
        
        shops_data = []
        for s in shops:
            products = Product.objects.filter(shop=s).order_by('-created_at')
            if search:
                products = products.filter(title__icontains=search)
            products = products[:100]
            products_data = [{
                'id': p.id,
                'title': p.title,
                'price': float(p.price) if p.price else 0,
                'approval_status': p.approval_status,
                'is_visible': p.is_visible,
                'is_deleted': p.is_deleted or not p.is_visible,
            } for p in products]
            
            shops_data.append({
                'id': s.id,
                'name': s.name,
                'is_active': s.is_active,
                'products_count': Product.objects.filter(shop=s).count(),
                'products': products_data,
            })
        
        result.append({
            'id': u.id,
            'phone': u.phone,
            'full_name': u.get_full_name() or '',
            'role': u.role,
            'is_blocked': u.is_blocked,
            'shops': shops_data,
            'shops_count': len(shops_data),
            'total_products': sum(s['products_count'] for s in shops_data),
        })
    
    return Response({
        'users': result,
        'total': users_qs.count(),
    })

@extend_schema(description='عملیات گروهی ادمین (حذف/بن/هشدار/بازگردانی)')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_bulk_action(request):
    """عملیات گروهی روی کاربر/فروشگاه/محصول - فقط ادمین/مدیر"""
    if not request.user.can_access_control:
        return Response({'error': 'دسترسی ندارید'}, status=status.HTTP_403_FORBIDDEN)
    
    from apps.users.models import User
    from .models import Shop, Product
    from django.utils import timezone
    
    action = request.data.get('action')
    items = request.data.get('items', [])
    reason = request.data.get('reason', '')
    banned_until = request.data.get('banned_until')  # 'YYYY-MM-DD'
    
    if action not in ['soft_delete', 'hard_delete', 'ban', 'warning', 'restore', 'history']:
        return Response({'error': 'action نامعتبر'}, status=status.HTTP_400_BAD_REQUEST)
    
    if not items:
        return Response({'error': 'هیچ آیتمی انتخاب نشده'}, status=status.HTTP_400_BAD_REQUEST)
    
    results = []
    
    for item in items:
        try:
            item_type = item.get('type')
            item_id = item.get('id')
            
            if item_type == 'user':
                obj = User.objects.get(id=item_id)
                # فقط مدیر می‌تونه ادمین‌ها رو تغییر بده
                if obj.role in ['admin', 'owner'] and not request.user.is_owner:
                    results.append({'id': item_id, 'status': 'forbidden', 'name': item.get('name')})
                    continue
                
                if action == 'soft_delete':
                    obj.is_active = False
                    obj.save()
                elif action == 'ban':
                    obj.is_blocked = True
                    obj.blocked_reason = reason or 'بن توسط ادمین'
                    # اگه تاریخ بن داده شده
                    if banned_until:
                        from datetime import datetime
                        from zoneinfo import ZoneInfo
                        iran_tz = ZoneInfo('Asia/Tehran')
                        try:
                            # فرمت کامل: 2026-11-15T18:30 (به وقت ایران)
                            dt = datetime.fromisoformat(banned_until.replace('Z', '+00:00'))
                            if dt.tzinfo is None:
                                # naive → به وقت ایران تبدیل
                                dt = dt.replace(tzinfo=iran_tz)
                            obj.banned_until = dt
                        except:
                            try:
                                # فقط تاریخ: 2026-11-15 (پیش‌فرض 23:59 ایران)
                                dt = datetime.strptime(banned_until, '%Y-%m-%d').replace(hour=23, minute=59)
                                obj.banned_until = dt.replace(tzinfo=iran_tz)
                            except:
                                pass
                    obj.save()
                    # نوتیف به کاربر
                    try:
                        from apps.users.models import Notification
                        Notification.create_notif(
                            user=obj,
                            title='⛔ حساب شما مسدود شد',
                            message=f'حساب شما توسط مدیر مسدود شد.' + (f' دلیل: {reason}' if reason else '') + (f' تا تاریخ: {banned_until}' if banned_until else ''),
                            notif_type='alert',
                            link='/dashboard',
                            icon='⛔',
                        )
                    except Exception as e:
                        print('Ban notif error:', e)
                elif action == 'warning':
                    from django.utils import timezone
                    obj.warnings_count = (obj.warnings_count or 0) + 1
                    obj.last_warning_at = timezone.now()
                    obj.last_warning_message = reason or ''
                    obj.save()
                    # نوتیف به کاربر
                    try:
                        from apps.users.models import Notification
                        Notification.create_notif(
                            user=obj,
                            title='⚠️ هشدار از طرف مدیر',
                            message=reason or 'شما یک هشدار از طرف مدیر دریافت کردید. در صورت تکرار، حساب شما مسدود خواهد شد.',
                            notif_type='alert',
                            link='/dashboard',
                            icon='⚠️',
                        )
                    except Exception as e:
                        print('Warning notif error:', e)
                elif action == 'restore':
                    obj.is_blocked = False
                    obj.is_active = True
                    obj.blocked_reason = ''
                    obj.banned_until = None
                    obj.save()
                else:
                    obj.save()
            
            elif item_type == 'shop':
                obj = Shop.objects.get(id=item_id)
                if action == 'soft_delete':
                    obj.is_active = False
                    obj.save()
                    # نوتیف به فروشنده
                    try:
                        from apps.users.models import Notification
                        Notification.create_notif(
                            user=obj.owner,
                            title='🚫 فروشگاه شما غیرفعال شد',
                            message=f'فروشگاه «{obj.name}» توسط مدیر غیرفعال شد.' + (f' دلیل: {reason}' if reason else ''),
                            notif_type='alert',
                            link='/seller/shops',
                            icon='🚫',
                        )
                    except Exception as e:
                        print('Shop notif error:', e)
                elif action == 'ban':
                    obj.is_active = False
                    obj.save()
                    try:
                        from apps.users.models import Notification
                        Notification.create_notif(
                            user=obj.owner,
                            title='⛔ فروشگاه شما مسدود شد',
                            message=f'فروشگاه «{obj.name}» توسط مدیر مسدود شد.' + (f' دلیل: {reason}' if reason else ''),
                            notif_type='alert',
                            link='/seller/shops',
                            icon='⛔',
                        )
                    except Exception as e:
                        print('Shop notif error:', e)
                elif action == 'restore':
                    obj.is_active = True
                    obj.save()
                    try:
                        from apps.users.models import Notification
                        Notification.create_notif(
                            user=obj.owner,
                            title='✅ فروشگاه شما فعال شد',
                            message=f'فروشگاه «{obj.name}» توسط مدیر مجدداً فعال شد.',
                            notif_type='order',
                            link='/seller/shops',
                            icon='✅',
                        )
                    except Exception as e:
                        print('Shop notif error:', e)
                else:
                    obj.save()
            
            elif item_type == 'product':
                obj = Product.objects.get(id=item_id)
                if action == 'soft_delete':
                    obj.is_deleted = True
                    obj.is_visible = False
                    obj.deleted_at = timezone.now()
                    obj.delete_reason = reason or 'حذف توسط ادمین'
                    obj.save()
                    # نوتیف به فروشنده
                    try:
                        from apps.users.models import Notification
                        Notification.create_notif(
                            user=obj.shop.owner,
                            title='🚫 محصول شما غیرفعال شد',
                            message=f'محصول «{obj.title}» توسط مدیر غیرفعال شد.' + (f' دلیل: {reason}' if reason else ''),
                            notif_type='alert',
                            link='/seller/products',
                            icon='🚫',
                        )
                    except Exception as e:
                        print('Delete notif error:', e)
                elif action == 'hard_delete':
                    # حذف کامل از دیتابیس
                    owner = obj.shop.owner
                    product_title = obj.title
                    obj.delete()
                    # نوتیف به فروشنده
                    try:
                        from apps.users.models import Notification
                        Notification.create_notif(
                            user=owner,
                            title='🗑️ محصول شما حذف شد',
                            message=f'محصول «{product_title}» توسط مدیر به طور کامل حذف شد.' + (f' دلیل: {reason}' if reason else ''),
                            notif_type='alert',
                            link='/seller/products',
                            icon='🗑️',
                        )
                    except Exception as e:
                        print('Hard delete notif error:', e)
                elif action == 'restore':
                    obj.is_deleted = False
                    obj.is_visible = True
                    obj.deleted_at = None
                    obj.delete_reason = ''
                    obj.save()
                    # نوتیف به فروشنده
                    try:
                        from apps.users.models import Notification
                        Notification.create_notif(
                            user=obj.shop.owner,
                            title='✅ محصول شما بازگردانی شد',
                            message=f'محصول «{obj.title}» توسط مدیر بازگردانی شد و مجدداً قابل نمایش است.',
                            notif_type='order',
                            link='/seller/products',
                            icon='✅',
                        )
                    except Exception as e:
                        print('Restore notif error:', e)
            
            results.append({'id': item_id, 'type': item_type, 'name': item.get('name'), 'status': 'ok'})
        except Exception as e:
            results.append({'id': item.get('id'), 'type': item.get('type'), 'name': item.get('name'), 'status': 'error', 'error': str(e)})
    
    return Response({
        'action': action,
        'results': results,
        'success_count': sum(1 for r in results if r['status'] == 'ok'),
        'error_count': sum(1 for r in results if r['status'] != 'ok'),
    })
