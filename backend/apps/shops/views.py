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
    return Response(ShopSerializer(shops, many=True).data)


@extend_schema(description='جزئیات فروشگاه')
@api_view(['GET'])
def shop_detail(request, shop_id):
    try:
        shop = Shop.objects.get(id=shop_id)
    except Shop.DoesNotExist:
        return Response({'error': 'فروشگاه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    return Response(ShopSerializer(shop).data)


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
    shop.save()
    return Response(ShopSerializer(shop).data)


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
    allowed = ['title', 'description', 'price', 'stock', 'condition', 'category', 'color',
               'health_status', 'health_description', 'allow_local_test', 'allow_courier',
               'story', 'is_visible', 'buy_link_active']
    for field in allowed:
        if field in request.data:
            setattr(product, field, request.data[field])
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
