from rest_framework import serializers
from .models import Order, SellerDiscountCode


class OrderCreateSerializer(serializers.Serializer):
    """سریالایزر ایجاد سفارش"""
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(default=1, min_value=1)
    source = serializers.ChoiceField(choices=['web', 'telegram', 'eitaa', 'sms', 'manual'], default='web')
    payment_method = serializers.ChoiceField(choices=['online', 'cod', 'manual'], default='manual')
    shipping_address = serializers.CharField(required=False, allow_blank=True)
    customer_name = serializers.CharField(required=False, allow_blank=True)
    customer_phone = serializers.CharField(required=False, allow_blank=True)
    discount_code = serializers.CharField(required=False, allow_blank=True)


class OrderSerializer(serializers.ModelSerializer):
    """سریالایزر نمایش سفارش"""
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=12, decimal_places=0, read_only=True)
    shop_name = serializers.CharField(source='product.shop.name', read_only=True)
    final_price = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'tracking_code', 'product', 'product_title', 'product_price',
            'shop_name', 'quantity', 'total_price', 'final_price',
            'customer_user', 'customer_guest_info',
            'source', 'status', 'is_confirmed',
            'payment_method', 'payment_status',
            'discount_code_used', 'discount_amount_applied', 'courier_fee',
            'shipping_address', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'tracking_code', 'created_at', 'updated_at']


# ==================== DISCOUNT CODE ====================

class DiscountCodeCreateSerializer(serializers.Serializer):
    """سریالایزر ایجاد کد تخفیف"""
    code = serializers.CharField(max_length=50)
    discount_type = serializers.ChoiceField(choices=['fixed', 'percent', 'free_shipping'])
    discount_value = serializers.IntegerField(required=False, min_value=1000)
    discount_percent = serializers.IntegerField(required=False, min_value=1, max_value=99)
    min_order_amount = serializers.IntegerField(required=False, min_value=0)
    max_discount_amount = serializers.IntegerField(required=False, min_value=0)
    max_uses = serializers.IntegerField(default=1, min_value=1)
    valid_days = serializers.IntegerField(default=30, min_value=1, max_value=365)
    note = serializers.CharField(required=False, allow_blank=True)


class DiscountCodeSerializer(serializers.ModelSerializer):
    """سریالایزر نمایش کد تخفیف"""
    is_expired = serializers.BooleanField(read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = SellerDiscountCode
        fields = [
            'id', 'seller', 'code', 'discount_type',
            'discount_value', 'discount_percent',
            'min_order_amount', 'max_discount_amount',
            'max_uses', 'used_count',
            'valid_from', 'valid_until',
            'is_active', 'is_expired', 'is_valid',
            'note', 'created_at',
        ]
        read_only_fields = ['id', 'seller', 'used_count', 'created_at']


class ValidateDiscountSerializer(serializers.Serializer):
    """سریالایزر اعتبارسنجی کد تخفیف"""
    code = serializers.CharField(max_length=50)
    seller_id = serializers.IntegerField()
    order_amount = serializers.IntegerField(min_value=0)
