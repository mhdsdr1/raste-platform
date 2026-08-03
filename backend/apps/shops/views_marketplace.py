from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.db.models import Q, Avg, Count, F
from django.utils import timezone

from .models import Shop, Product
from .serializers import ProductSerializer, ShopSerializer


@extend_schema(
    description='جستجوی پیشرفته در بازارگاه راسته',
    parameters=[
        OpenApiParameter(name='q', description='جستجوی متنی', type=str),
        OpenApiParameter(name='category', description='دسته‌بندی (new, like_new, used, needs_repair)', type=str),
        OpenApiParameter(name='condition', description='وضعیت کالا', type=str),
        OpenApiParameter(name='min_price', description='حداقل قیمت', type=int),
        OpenApiParameter(name='max_price', description='حداکثر قیمت', type=int),
        OpenApiParameter(name='city', description='شهر', type=str),
        OpenApiParameter(name='has_courier', description='امکان ارسال با پیک', type=bool),
        OpenApiParameter(name='allow_local_test', description='امکان تست حضوری', type=bool),
        OpenApiParameter(name='min_rating', description='حداقل امتیاز (۱ تا ۳)', type=int),
        OpenApiParameter(name='sort_by', description='مرتب‌سازی (newest, price_asc, price_desc, rating, nearest)', type=str),
        OpenApiParameter(name='page', description='شماره صفحه', type=int),
        OpenApiParameter(name='page_size', description='تعداد در صفحه', type=int),
    ]
)
@api_view(['GET'])
def marketplace_search(request):
    """جستجوی پیشرفته در بازارگاه"""
    
    # پایه کوئری
    products = Product.objects.select_related('shop', 'shop__owner').filter(
        is_visible=True,
        buy_link_active=True,
        shop__is_active=True,
    )
    
    # ========== فیلترها ==========
    
    # جستجوی متنی
    q = request.query_params.get('q', '')
    if q:
        products = products.filter(
            Q(title__icontains=q) |
            Q(description__icontains=q) |
            Q(shop__name__icontains=q) |
            Q(story__icontains=q)
        )
    
    # وضعیت کالا
    condition = request.query_params.get('condition')
    if condition:
        products = products.filter(condition=condition)
    
    # بازه قیمت
    min_price = request.query_params.get('min_price')
    max_price = request.query_params.get('max_price')
    if min_price:
        products = products.filter(price__gte=int(min_price))
    if max_price:
        products = products.filter(price__lte=int(max_price))
    
    # موقعیت
    city = request.query_params.get('city')
    if city:
        products = products.filter(shop__address__icontains=city)
    
    # فیلتر پیک
    has_courier = request.query_params.get('has_courier')
    if has_courier and has_courier.lower() == 'true':
        products = products.filter(allow_courier=True)
    
    # فیلتر تست حضوری
    allow_local_test = request.query_params.get('allow_local_test')
    if allow_local_test and allow_local_test.lower() == 'true':
        products = products.filter(allow_local_test=True)
    
    # ========== مرتب‌سازی ==========
    
    sort_by = request.query_params.get('sort_by', 'newest')
    
    if sort_by == 'price_asc':
        products = products.order_by('price')
    elif sort_by == 'price_desc':
        products = products.order_by('-price')
    elif sort_by == 'rating':
        # میانگین امتیاز فروشنده
        products = products.annotate(
            avg_rating=Avg('shop__owner__ratings_received__stars',
                           filter=Q(shop__owner__ratings_received__target_type='seller'))
        ).order_by(F('avg_rating').desc(nulls_last=True))
    elif sort_by == 'popular':
        # پرفروش‌ترین
        products = products.annotate(
            order_count=Count('orders', filter=Q(orders__status__in=['confirmed', 'packed', 'shipped', 'delivered']))
        ).order_by(F('order_count').desc(nulls_last=True))
    elif sort_by == 'nearest':
        # نزدیک‌ترین (اگر lat,lng داده باشه)
        user_lat = request.query_params.get('lat')
        user_lng = request.query_params.get('lng')
        if user_lat and user_lng:
            # محاسبه فاصله تقریبی
            products = products.annotate(
                distance=(F('shop__geo_lat') - float(user_lat))**2 + 
                         (F('shop__geo_lng') - float(user_lng))**2
            ).order_by('distance')
        else:
            products = products.order_by('-created_at')
    else:
        # newest (پیش‌فرض)
        products = products.order_by('-created_at')
    
    # ========== خروجی ==========
    
    # خلاصه
    total_count = products.count()
    
    # صفحه‌بندی دستی
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 20))
    start = (page - 1) * page_size
    end = start + page_size
    
    products_page = products[start:end]
    
    # تبدیل به دیکشنری با اطلاعات اضافه
    results = []
    for p in products_page:
        product_data = ProductSerializer(p).data
        
        # اضافه کردن اطلاعات فروشگاه
        product_data['shop'] = {
            'id': p.shop.id,
            'name': p.shop.name,
            'slug': p.shop.slug,
            'city': p.shop.address[:50] if p.shop.address else '',
        }
        
        # اضافه کردن میانگین امتیاز
        avg_rating = p.shop.owner.ratings_received.filter(target_type='seller').aggregate(
            avg=Avg('stars')
        )['avg']
        product_data['shop_rating'] = round(avg_rating, 1) if avg_rating else 0
        product_data['shop_rating_stars'] = '⭐' * round(avg_rating) if avg_rating else ''
        
        # تعداد فروش
        product_data['sales_count'] = p.orders.filter(
            status__in=['confirmed', 'packed', 'shipped', 'delivered']
        ).count()
        
        results.append(product_data)
    
    return Response({
        'count': total_count,
        'page': page,
        'page_size': page_size,
        'total_pages': (total_count // page_size) + (1 if total_count % page_size else 0),
        'results': results,
    })


@extend_schema(description='پیشنهادات جستجو (Autocomplete)')
@api_view(['GET'])
def search_suggestions(request):
    """پیشنهادات جستجو با ۳ حرف اول"""
    q = request.query_params.get('q', '')
    if len(q) < 2:
        return Response([])
    
    # جستجو در محصولات
    products = Product.objects.filter(
        Q(title__icontains=q) | Q(description__icontains=q),
        is_visible=True,
        buy_link_active=True,
    ).values('id', 'title', 'price')[:5]
    
    # جستجو در فروشگاه‌ها
    shops = Shop.objects.filter(
        Q(name__icontains=q),
        is_active=True,
    ).values('id', 'name', 'slug')[:3]
    
    return Response({
        'products': list(products),
        'shops': list(shops),
    })


@extend_schema(description='دسته‌بندی‌های بازارگاه')
@api_view(['GET'])
def marketplace_categories(request):
    """دسته‌بندی‌های موجود"""
    return Response({
        'conditions': [
            {'value': 'new', 'label': '🟢 نو', 'count': Product.objects.filter(condition='new', is_visible=True).count()},
            {'value': 'like_new', 'label': '🔵 در حد نو', 'count': Product.objects.filter(condition='like_new', is_visible=True).count()},
            {'value': 'used', 'label': '🟠 کارکرده', 'count': Product.objects.filter(condition='used', is_visible=True).count()},
            {'value': 'needs_repair', 'label': '🔴 نیاز به تعمیر', 'count': Product.objects.filter(condition='needs_repair', is_visible=True).count()},
        ],
        'features': [
            {'value': 'has_courier', 'label': '🛵 ارسال با پیک', 'count': Product.objects.filter(allow_courier=True, is_visible=True).count()},
            {'value': 'allow_local_test', 'label': '🤝 تست حضوری', 'count': Product.objects.filter(allow_local_test=True, is_visible=True).count()},
        ]
    })
