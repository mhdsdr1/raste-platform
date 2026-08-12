from rest_framework import serializers
from .models import Shop, Product


class ProductSerializer(serializers.ModelSerializer):
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    is_stock = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'shop', 'shop_name', 'title', 'description', 'price', 'stock',
            'image', 'condition', 'health_status', 'health_description',
            'allow_local_test', 'allow_courier', 'story', 'category', 'color',
            'buy_link_active', 'is_visible', 'is_stock',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'shop', 'created_at', 'updated_at']


class ProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'title', 'description', 'price', 'stock', 'image',
            'condition', 'health_status', 'health_description',
            'allow_local_test', 'allow_courier', 'story', 'category', 'color',
        ]


class ShopSerializer(serializers.ModelSerializer):
    products_count = serializers.IntegerField(read_only=True)
    active_products_count = serializers.IntegerField(read_only=True)
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    
    class Meta:
        model = Shop
        fields = [
            'id', 'owner', 'owner_name', 'name', 'slug', 'description',
            'logo', 'banner', 'shop_type', 'contact_phone', 'address',
            'geo_lat', 'geo_lng', 'is_active',
            'products_count', 'active_products_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']


class ShopCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = ['name', 'slug', 'description', 'shop_type', 'contact_phone', 'address']
