from rest_framework import serializers
from . import models


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
