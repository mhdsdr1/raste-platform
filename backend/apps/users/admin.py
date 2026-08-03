from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, OTPCode, Wallet, WalletTransaction, AbuseLog


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['id', 'phone', 'user_type', 'subscription_plan', 'is_blocked', 'created_at']
    list_filter = ['user_type', 'subscription_plan', 'is_blocked', 'is_staff']
    search_fields = ['phone', 'first_name', 'last_name']
    ordering = ['-created_at']
    actions = ['block_users', 'unblock_users']
    
    fieldsets = UserAdmin.fieldsets + (
        ('اطلاعات راسته', {
            'fields': ('phone', 'user_type', 'subscription_plan', 'subscription_expiry', 'trial_used', 'is_blocked', 'blocked_reason')
        }),
    )
    
    def block_users(self, request, queryset):
        queryset.update(is_blocked=True, blocked_reason='مسدود توسط ادمین')
    block_users.short_description = '🚫 مسدود کردن کاربران'
    
    def unblock_users(self, request, queryset):
        queryset.update(is_blocked=False, blocked_reason='')
    unblock_users.short_description = '🟢 آزاد کردن کاربران'


@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):
    list_display = ['phone', 'code', 'purpose', 'is_used', 'expires_at', 'created_at']
    list_filter = ['purpose', 'is_used']
    search_fields = ['phone']


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ['user', 'balance', 'frozen_balance', 'available_balance']
    search_fields = ['user__phone']


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ['wallet', 'transaction_type', 'amount', 'balance_after', 'created_at']
    list_filter = ['transaction_type', 'is_successful']
    search_fields = ['wallet__user__phone']


@admin.register(AbuseLog)
class AbuseLogAdmin(admin.ModelAdmin):
    list_display = ['phone', 'risk_score', 'action_taken', 'is_vpn', 'device_type', 'created_at']
    list_filter = ['action_taken', 'risk_score', 'is_vpn', 'device_type']
    search_fields = ['phone', 'device_id', 'ip_address']
    ordering = ['-created_at']
