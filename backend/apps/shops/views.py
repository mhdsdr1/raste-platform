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
