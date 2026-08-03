from django.contrib import admin
from .models import Shop, Product


@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'owner', 'shop_type', 'is_active', 'created_at']
    list_filter = ['shop_type', 'is_active']
    search_fields = ['name', 'owner__phone']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'shop', 'price', 'stock', 'condition', 'created_at']
    list_filter = ['condition', 'allow_courier', 'allow_local_test']
    search_fields = ['title', 'shop__name']
