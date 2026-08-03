from django.contrib import admin
from django.db.models import Count, Sum, Avg
from django.utils import timezone

from apps.users.models import User
from apps.orders.models import Order
from apps.courier.models import Courier


class RasteAdminSite(admin.AdminSite):
    site_header = 'پنل مدیریت راسته'
    site_title = 'راسته - مدیریت'
    index_title = 'داشبورد راسته'
    
    def index(self, request, extra_context=None):
        extra_context = extra_context or {}
        
        # آمار کلی
        now = timezone.now()
        this_month = now.replace(day=1)
        
        extra_context['total_users'] = User.objects.count()
        extra_context['total_sellers'] = User.objects.filter(user_type__in=['seller', 'hybrid']).count()
        extra_context['total_couriers'] = Courier.objects.filter(is_active=True).count()
        extra_context['total_orders'] = Order.objects.count()
        extra_context['monthly_orders'] = Order.objects.filter(created_at__gte=this_month).count()
        extra_context['monthly_revenue'] = Order.objects.filter(
            created_at__gte=this_month,
            payment_status='paid'
        ).aggregate(total=Sum('total_price'))['total'] or 0
        
        # سفارشات در انتظار
        extra_context['pending_orders'] = Order.objects.filter(status='pending_confirmation').count()
        
        # پیک‌های در انتظار تأیید
        extra_context['pending_couriers'] = Courier.objects.filter(approval_status__in=['pending', 'documents_uploaded']).count()
        
        # کاربران مسدود
        extra_context['blocked_users'] = User.objects.filter(is_blocked=True).count()
        
        return super().index(request, extra_context)
