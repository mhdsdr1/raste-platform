from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
from django.shortcuts import render

def home(request):
    return HttpResponse("""
    <html dir="rtl" lang="fa">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>راسته</title>
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#16a34a">
    <style>
        body { font-family: Tahoma; text-align: center; padding: 50px; background: #f0fdf4; }
        a { color: #16a34a; font-size: 20px; text-decoration: none; display: block; margin: 10px; }
    </style></head>
    <body>
        <h1>🚀 به راسته خوش آمدید!</h1>
        <p>پلتفرم یکپارچه خرید و فروش محلی</p>
        <a href="/api/v1/docs/">📖 مستندات API (Swagger)</a>
        <a href="/admin/">⚙️ پنل مدیریت</a>
        <a href="/offline/">📴 صفحه آفلاین</a>
    </body>
    </html>
    """)

def offline(request):
    return HttpResponse("""
    <html dir="rtl" lang="fa">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>راسته - آفلاین</title>
    <style>
        body { font-family: Tahoma; text-align: center; padding: 50px; background: #fef3c7; }
        .offline-icon { font-size: 80px; }
        h1 { color: #92400e; }
        p { color: #78350f; font-size: 18px; }
        .btn { background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 20px; }
    </style></head>
    <body>
        <div class="offline-icon">📴</div>
        <h1>شما آفلاین هستید</h1>
        <p>اتصال اینترنت برقرار نیست. راسته به محض اتصال مجدد در دسترس خواهد بود.</p>
        <p>صفحاتی که قبلاً بازدید کرده‌اید، به صورت آفلاین قابل مشاهده هستند.</p>
        <a href="/" class="btn">🔄 تلاش مجدد</a>
    </body>
    </html>
    """)

urlpatterns = [
    path('', home, name='home'),
    path('offline/', offline, name='offline'),
    path('admin/', admin.site.urls),
    path('api/v1/users/', include('apps.users.urls')),
    path('api/v1/shops/', include('apps.shops.urls')),
    path('api/v1/orders/', include('apps.orders.urls')),
    path('api/v1/deals/', include('apps.deals.urls')),
    path('api/v1/courier/', include('apps.courier.urls')),
    path('api/v1/chat/', include('apps.chat.urls')),
    path('api/v1/ratings/', include('apps.ratings.urls')),
    path('api/v1/loyalty/', include('apps.loyalty.urls')),
]

# Swagger
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
urlpatterns += [
    path('api/v1/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/v1/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

# PWA
urlpatterns += [
    path('', include('pwa.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
