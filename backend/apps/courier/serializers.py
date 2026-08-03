from rest_framework import serializers
from .models import Courier, CourierPricing, CourierRequest
from django.utils import timezone
import random


class CourierRegisterSerializer(serializers.Serializer):
    """سریالایزر ثبت‌نام پیک"""
    vehicle_type = serializers.ChoiceField(
        choices=['motorcycle', 'car', 'pickup', 'bicycle']
    )
    vehicle_plate = serializers.CharField(max_length=10, required=False)
    max_distance_km = serializers.IntegerField(default=10, min_value=1, max_value=100)


class CourierSerializer(serializers.ModelSerializer):
    """سریالایزر پیک"""
    phone = serializers.CharField(source='user.phone', read_only=True)
    name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = Courier
        fields = [
            'id', 'user', 'phone', 'name',
            'vehicle_type', 'vehicle_plate',
            'is_active', 'is_online',
            'rating', 'total_deliveries',
            'approval_status', 'admin_note',
            'current_lat', 'current_lng',
        ]
        read_only_fields = ['id', 'user', 'approval_status']


class CourierPricingSerializer(serializers.ModelSerializer):
    """سریالایزر تعرفه پیک"""
    class Meta:
        model = CourierPricing
        fields = '__all__'


class CourierRequestCreateSerializer(serializers.Serializer):
    """سریالایزر ایجاد درخواست پیک"""
    order_id = serializers.IntegerField()
    pickup_address = serializers.CharField()
    pickup_lat = serializers.FloatField()
    pickup_lng = serializers.FloatField()
    delivery_address = serializers.CharField()
    delivery_lat = serializers.FloatField()
    delivery_lng = serializers.FloatField()
    distance_km = serializers.FloatField(min_value=0.1)
    vehicle_type = serializers.ChoiceField(
        choices=['motorcycle', 'car', 'pickup']
    )


class CourierRequestSerializer(serializers.ModelSerializer):
    """سریالایزر نمایش درخواست پیک"""
    courier_name = serializers.CharField(source='courier.user.get_full_name', read_only=True)
    courier_phone = serializers.CharField(source='courier.user.phone', read_only=True)
    order_tracking = serializers.CharField(source='order.tracking_code', read_only=True)
    
    class Meta:
        model = CourierRequest
        fields = [
            'id', 'order', 'order_tracking',
            'courier', 'courier_name', 'courier_phone',
            'pickup_address', 'delivery_address',
            'distance_km', 'estimated_fee', 'final_fee',
            'status', 'pickup_code', 'delivery_code',
            'created_at',
        ]
        read_only_fields = ['id', 'estimated_fee', 'final_fee', 'created_at']
