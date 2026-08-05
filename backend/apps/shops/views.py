from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from .models import Shop, Product
from .serializers import (
    ShopSerializer, ShopCreateSerializer,
    ProductSerializer, ProductCreateSerializer,
)


# ==================== SHOP ====================

@extend_schema(
    description='ایجاد فروشگاه جدید',
    request=ShopCreateSerializer,
    responses=ShopSerializer
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_shop(request):
    user = request.user
    
    if not user.is_seller:
        return Response(
            {'error': 'فقط فروشندگان می‌توانند فروشگاه ایجاد کنند.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = ShopCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # ایجاد فروشگاه با فیلدهای مشخص (بدون **)
    shop = Shop.objects.create(
        owner=user,
        name=serializer.validated_data['name'],
        slug=serializer.validated_data['slug'],
        description=serializer.validated_data.get('description', ''),
        shop_type=serializer.validated_data['shop_type'],
        contact_phone=serializer.validated_data.get('contact_phone', ''),
        address=serializer.validated_data.get('address', ''),
    )
    
    return Response(ShopSerializer(shop).data, status=status.HTTP_201_CREATED)


@extend_schema(description='لیست فروشگاه‌های کاربر')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_my_shops(request):
    shops = request.user.shops.all()
    return Response(ShopSerializer(shops, many=True).data)


@extend_schema(description='جزئیات فروشگاه')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def shop_detail(request, shop_id):
    try:
        shop = Shop.objects.get(id=shop_id, owner=request.user)
    except Shop.DoesNotExist:
        return Response({'error': 'فروشگاه یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
    
    return Response(ShopSerializer(shop).data)


# ==================== PRODUCT ====================

@extend_schema(
    description='اضافه کردن محصول جدید',
    request=ProductCreateSerializer,
    responses=ProductSerializer
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_product(request, shop_id):
    try:
        shop = Shop.objects.get(id=shop_id, owner=request.user)
    except Shop.DoesNotExist:
        return Response({'error': 'فروشگاه یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
    
    if shop.active_products_count >= request.user.monthly_product_limit:
        return Response(
            {'error': f'سقف محصولات پلن {request.user.get_subscription_plan_display()} پر شده است.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = ProductCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # ایجاد محصول با فیلدهای مشخص
    product = Product.objects.create(
        shop=shop,
        title=serializer.validated_data['title'],
        description=serializer.validated_data['description'],
        price=serializer.validated_data['price'],
        stock=serializer.validated_data.get('stock', 1),
        image=serializer.validated_data.get('image', None),
        condition=serializer.validated_data.get('condition', 'new'),
        health_status=serializer.validated_data.get('health_status', None),
        health_description=serializer.validated_data.get('health_description', ''),
        allow_local_test=serializer.validated_data.get('allow_local_test', False),
        allow_courier=serializer.validated_data.get('allow_courier', False),
        story=serializer.validated_data.get('story', ''),
    )
    
    return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)


@extend_schema(description='لیست محصولات یک فروشگاه')
@api_view(['GET'])
def list_products(request, shop_id):
    try:
        shop = Shop.objects.get(id=shop_id, is_active=True)
    except Shop.DoesNotExist:
        return Response({'error': 'فروشگاه یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
    
    products = shop.products.filter(is_visible=True)
    return Response(ProductSerializer(products, many=True).data)


@extend_schema(description='جزئیات یک محصول')
@api_view(['GET'])
def product_detail(request, product_id):
    try:
        product = Product.objects.get(id=product_id, is_visible=True)
    except Product.DoesNotExist:
        return Response({'error': 'محصول یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
    
    return Response(ProductSerializer(product).data)


@extend_schema(description='آپدیت محصول')
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_product(request, product_id):
    """آپدیت محصول (فقط توسط صاحب فروشگاه)"""
    try:
        product = Product.objects.get(id=product_id, shop__owner=request.user)
    except Product.DoesNotExist:
        return Response({'error': 'محصول یافت نشد یا دسترسی ندارید.'}, status=status.HTTP_404_NOT_FOUND)
    
    # فقط فیلدهایی که توی request هستن رو آپدیت کن
    allowed_fields = ['title', 'description', 'price', 'stock', 'condition', 
                      'color',
                      'health_status', 'health_description', 'allow_local_test', 
                      'allow_courier', 'story', 'is_visible', 'buy_link_active']
    
    for field in allowed_fields:
        if field in request.data:
            setattr(product, field, request.data[field])
    
    product.save()
    return Response(ProductSerializer(product).data)

@extend_schema(description='لیست همه محصولات فروشگاه (حتی مخفی‌ها) - مخصوص فروشنده')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_products(request, shop_id):
    """لیست همه محصولات برای فروشنده"""
    try:
        shop = Shop.objects.get(id=shop_id, owner=request.user)
    except Shop.DoesNotExist:
        return Response({'error': 'فروشگاه یافت نشد یا دسترسی ندارید.'}, status=status.HTTP_404_NOT_FOUND)
    
    products = shop.products.all()  # همه محصولات، حتی مخفی‌ها
    return Response(ProductSerializer(products, many=True).data)

@extend_schema(description='ثبت درخواست اطلاع‌رسانی موجودی')
@api_view(['POST'])
def notify_me(request, product_id):
    """کاربر می‌خواد وقتی محصول موجود شد بهش خبر بدیم"""
    phone = request.data.get('phone')
    if not phone:
        return Response({'error': 'شماره تلفن الزامی است'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'محصول یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    
    # TODO: ذخیره توی دیتابیس notify_me
    # فعلاً فقط پیام موفقیت
    return Response({'message': f'در صورت موجود شدن {product.title} به شما اطلاع داده میشه'})

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
