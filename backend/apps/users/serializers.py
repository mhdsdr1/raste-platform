from rest_framework import serializers
from . import models
Address = models.Address
Favorite = models.Favorite


class RequestOTPSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=15)
    purpose = serializers.ChoiceField(
        choices=['register', 'login', 'order_confirm'],
        default='register'
    )


class VerifyOTPSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=15)
    code = serializers.CharField(max_length=6)
    purpose = serializers.ChoiceField(
        choices=['register', 'login', 'order_confirm'],
        default='register'
    )
    user_type = serializers.ChoiceField(
        choices=['buyer', 'seller', 'courier', 'service_provider', 'hybrid'],
        default='buyer'
    )


class WalletSerializer(serializers.ModelSerializer):
    available_balance = serializers.IntegerField(read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    
    class Meta:
        model = models.Wallet
        fields = ['id', 'user', 'user_phone', 'balance', 'frozen_balance', 'available_balance']


class WalletTransactionSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    
    class Meta:
        model = models.WalletTransaction
        fields = ['id', 'wallet', 'transaction_type', 'type_display', 'amount', 'balance_after', 'description', 'reference_type', 'is_successful', 'created_at']


class ChargeWalletSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=10000, max_value=50000000)


class WithdrawSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=50000)
    card_number = serializers.CharField(max_length=16, required=False)

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['id', 'title', 'receiver_name', 'receiver_phone', 'province', 'city', 'postal_code', 'full_address', 'is_default', 'created_at']
        read_only_fields = ['id', 'created_at']


class FavoriteSerializer(serializers.ModelSerializer):
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=12, decimal_places=0, read_only=True)
    product_image = serializers.SerializerMethodField()
    shop_name = serializers.CharField(source='product.shop.name', read_only=True)
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    
    def get_product_image(self, obj):
        if obj.product.images:
            try:
                first = obj.product.images[0] if isinstance(obj.product.images, list) else obj.product.images
                return first.get('url', '') if isinstance(first, dict) else str(first)
            except:
                return ''
        return ''
    
    class Meta:
        model = Favorite
        fields = ['id', 'product', 'product_id', 'product_title', 'product_price', 'product_image', 'shop_name', 'created_at']
        read_only_fields = ['id', 'created_at']

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    user_type_display = serializers.CharField(source='get_user_type_display', read_only=True)
    
    def get_full_name(self, obj):
        return obj.get_full_name() or ''
    
    class Meta:
        model = models.User
        fields = [
            'id', 'phone', 'username', 'first_name', 'last_name', 'full_name',
            'email', 'national_id', 'user_type', 'user_type_display',
            'avatar', 'birthday', 'preferred_contact', 'subscription_plan',
            'is_active', 'is_blocked', 'created_at',
        ]
        read_only_fields = ['id', 'phone', 'user_type', 'created_at', 'is_active', 'is_blocked']
