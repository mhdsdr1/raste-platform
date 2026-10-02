from rest_framework import serializers
from .models import Shop, Product, SellerExpense, SellerDebt


class ProductSerializer(serializers.ModelSerializer):
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    is_stock = serializers.BooleanField(read_only=True)
    owner_name = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    def get_image_url(self, obj):
        if obj.image:
            return obj.image.url
        return None
    image_url = serializers.SerializerMethodField()

    def get_image_url(self, obj):
        if obj.image:
            return obj.image.url
        return None
    
    def get_owner_name(self, obj):
        owner = obj.shop.owner
        return owner.get_full_name() or owner.phone
    
    class Meta:
        model = Product
        fields = [
            'id', 'shop', 'shop_name', 'owner_name', 'title', 'description', 'price', 'stock', 'purchase_price', 'warehouse_stock',
            'image', 'image_url', 'condition', 'health_status', 'health_description',
            'allow_local_test', 'allow_courier', 'story', 'category', 'color',
        'colors',
        'sizes',
        'colors',
        'sizes',
            'buy_link_active', 'is_visible', 'is_stock',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'shop', 'created_at', 'updated_at']


class ProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'title', 'description', 'price', 'stock', 'purchase_price', 'warehouse_stock', 'image',
            'condition', 'health_status', 'health_description',
            'allow_local_test', 'allow_courier', 'story', 'category', 'color',
        'colors',
        'sizes',
        'colors',
        'sizes',
        ]


class ShopSerializer(serializers.ModelSerializer):
    products_count = serializers.IntegerField(read_only=True)
    active_products_count = serializers.IntegerField(read_only=True)
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    logo_url = serializers.SerializerMethodField()
    banner_url = serializers.SerializerMethodField()

    def get_logo_url(self, obj):
        if obj.logo:
            return obj.logo.url
        return None

    def get_banner_url(self, obj):
        if obj.banner:
            return obj.banner.url
        return None
    
    class Meta:
        model = Shop
        fields = [
            'id', 'owner', 'owner_name', 'name', 'slug', 'description',
            'logo', 'banner', 'logo_url', 'banner_url', 'shop_type', 'contact_phone', 'address',
            'geo_lat', 'geo_lng', 'is_active',
            'products_count', 'active_products_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']


class ShopCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = ['name', 'slug', 'description', 'shop_type', 'contact_phone', 'address']


class SellerExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerExpense
        fields = ['id', 'shop', 'title', 'icon', 'amount', 'expense_date', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']

class SellerDebtSerializer(serializers.ModelSerializer):
    """سریالایزر بدهکاران و بستانکاران"""
    
    debt_type_display = serializers.CharField(source='get_debt_type_display', read_only=True)
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    remaining = serializers.FloatField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    
    # تاریخ‌های شمسی
    transaction_date_shamsi = serializers.SerializerMethodField()
    due_date_shamsi = serializers.SerializerMethodField()
    
    def get_transaction_date_shamsi(self, obj):
        if not obj.transaction_date:
            return ''
        try:
            import jdatetime
            jd = jdatetime.date.fromgregorian(date=obj.transaction_date)
            return f"{jd.year}/{jd.month:02d}/{jd.day:02d}"
        except:
            return str(obj.transaction_date)
    
    def get_due_date_shamsi(self, obj):
        if not obj.due_date:
            return ''
        try:
            import jdatetime
            jd = jdatetime.date.fromgregorian(date=obj.due_date)
            return f"{jd.year}/{jd.month:02d}/{jd.day:02d}"
        except:
            return str(obj.due_date)
    
    class Meta:
        model = SellerDebt
        fields = [
            'id', 'shop', 'shop_name',
            'debt_type', 'debt_type_display',
            'person_name', 'person_phone',
            'person_national_id', 'person_address', 'person_postal_code',
            'bank_name', 'card_number', 'sheba_number',
            'amount', 'paid_amount', 'remaining',
            'due_date', 'is_overdue',
            'payment_type', 'payment_type_display',
            'is_installment', 'installment_count', 'installment_amount',
            'notes', 'transaction_date', 'transaction_date_shamsi', 'due_date_shamsi',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'seller']
