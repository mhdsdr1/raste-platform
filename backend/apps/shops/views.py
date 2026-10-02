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
        print('DEBUG image saved:', product.image)
    else:
        print('DEBUG: image not in FILES')
    
    return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)


@extend_schema(description='لیست محصولات فروشگاه')
@api_view(['GET'])
def list_products(request, shop_id):
    try:
        shop = Shop.objects.get(id=shop_id, is_active=True)
    except Shop.DoesNotExist:
        return Response({'error': 'فروشگاه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    products = shop.products.filter(is_visible=True)
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
    
    # فروشگاه
    shop_id = request.data.get('shop')
    shop = None
    if shop_id and shop_id != 'all':
        try:
            shop = Shop.objects.get(id=shop_id, owner=request.user)
        except Shop.DoesNotExist:
            pass
    
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
