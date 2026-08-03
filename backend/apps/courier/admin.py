from django.contrib import admin
from .models import Courier, CourierPricing, CourierRequest


@admin.register(Courier)
class CourierAdmin(admin.ModelAdmin):
    list_display = ['user', 'vehicle_type', 'approval_status', 'is_active', 'rating', 'total_deliveries', 'created_at']
    list_filter = ['approval_status', 'vehicle_type', 'is_active']
    search_fields = ['user__phone', 'vehicle_plate']
    readonly_fields = ['national_card_image', 'license_image', 'vehicle_card_image']
    
    actions = ['approve_couriers', 'reject_couriers']
    
    def approve_couriers(self, request, queryset):
        for courier in queryset:
            courier.approval_status = 'approved'
            courier.is_active = True
            courier.save()
    approve_couriers.short_description = '✅ تأیید پیک‌های انتخاب شده'
    
    def reject_couriers(self, request, queryset):
        queryset.update(approval_status='rejected', is_active=False)
    reject_couriers.short_description = '❌ رد پیک‌های انتخاب شده'


@admin.register(CourierPricing)
class CourierPricingAdmin(admin.ModelAdmin):
    list_display = ['vehicle_type', 'city_base_fee', 'city_per_km_fee', 'suburb_base_fee', 'is_active']
    list_filter = ['is_active']


@admin.register(CourierRequest)
class CourierRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'courier', 'status', 'distance_km', 'estimated_fee', 'created_at']
    list_filter = ['status']
