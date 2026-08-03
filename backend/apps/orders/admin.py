from django.contrib import admin
from .models import Order, SellerDiscountCode


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'tracking_code', 'product', 'total_price', 'status', 'source', 'created_at']
    list_filter = ['status', 'source', 'payment_method', 'payment_status']
    search_fields = ['tracking_code', 'product__title']
    date_hierarchy = 'created_at'


@admin.register(SellerDiscountCode)
class SellerDiscountCodeAdmin(admin.ModelAdmin):
    list_display = ['code', 'seller', 'discount_type', 'used_count', 'max_uses', 'is_active', 'valid_until']
    list_filter = ['discount_type', 'is_active']
    search_fields = ['code', 'seller__phone']
