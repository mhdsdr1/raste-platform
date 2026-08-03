from rest_framework import serializers
from .models import LoyaltySettings, CustomerLoyaltyPoints, LoyaltyTransaction


class LoyaltySettingsSerializer(serializers.ModelSerializer):
    """سریالایزر تنظیمات باشگاه"""
    class Meta:
        model = LoyaltySettings
        fields = [
            'id', 'seller', 'is_active',
            'points_per_1000_toman',
            'first_purchase_bonus', 'referral_bonus', 'birthday_bonus',
            'high_value_bonus', 'high_value_threshold',
            'points_to_credit_rate', 'free_shipping_points',
            'min_redeem_points',
        ]
        read_only_fields = ['id', 'seller']


class CustomerLoyaltyPointsSerializer(serializers.ModelSerializer):
    """سریالایزر امتیازات مشتری"""
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    tier_display = serializers.CharField(source='get_tier_display', read_only=True)
    
    # مقادیر قابل تبدیل
    credit_value = serializers.SerializerMethodField()
    can_get_free_shipping = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomerLoyaltyPoints
        fields = [
            'id', 'customer', 'customer_name', 'customer_phone',
            'seller', 'total_points_earned', 'available_points',
            'tier', 'tier_display',
            'credit_value', 'can_get_free_shipping',
            'created_at', 'updated_at',
        ]
    
    def get_credit_value(self, obj):
        """ارزش ریالی امتیازات"""
        try:
            settings = LoyaltySettings.objects.get(seller=obj.seller)
            return obj.available_points // settings.points_to_credit_rate
        except LoyaltySettings.DoesNotExist:
            return 0
    
    def get_can_get_free_shipping(self, obj):
        """آیا می‌تونه ارسال رایگان بگیره؟"""
        try:
            settings = LoyaltySettings.objects.get(seller=obj.seller)
            return obj.available_points >= settings.free_shipping_points
        except LoyaltySettings.DoesNotExist:
            return False


class LoyaltyTransactionSerializer(serializers.ModelSerializer):
    """سریالایزر تراکنش امتیاز"""
    type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    
    class Meta:
        model = LoyaltyTransaction
        fields = [
            'id', 'customer', 'seller',
            'transaction_type', 'type_display',
            'points', 'description',
            'order', 'created_at',
        ]


class RedeemPointsSerializer(serializers.Serializer):
    """سریالایزر مصرف امتیاز"""
    seller_id = serializers.IntegerField()
    points = serializers.IntegerField(min_value=1)
    redeem_type = serializers.ChoiceField(choices=['credit', 'free_shipping'])
