from django.contrib import admin
from .models import LoyaltySettings, CustomerLoyaltyPoints, LoyaltyTransaction


@admin.register(LoyaltySettings)
class LoyaltySettingsAdmin(admin.ModelAdmin):
    list_display = ['seller', 'is_active', 'points_per_1000_toman']


@admin.register(CustomerLoyaltyPoints)
class CustomerLoyaltyPointsAdmin(admin.ModelAdmin):
    list_display = ['customer', 'seller', 'available_points', 'tier']


@admin.register(LoyaltyTransaction)
class LoyaltyTransactionAdmin(admin.ModelAdmin):
    list_display = ['customer', 'seller', 'transaction_type', 'points', 'created_at']
