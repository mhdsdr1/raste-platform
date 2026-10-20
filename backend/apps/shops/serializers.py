from rest_framework import serializers
from .models import Shop, Product, SellerExpense, SellerDebt, DebtPayment, InstallmentPlan, Installment


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
    settlement_paid = serializers.FloatField(read_only=True)
    tx_remaining = serializers.FloatField(read_only=True)
    settlements_data = serializers.SerializerMethodField()
    
    def get_settlements_data(self, obj):
        result = []
        
        # ═══ ۱. از DebtPayment (payments) ═══
        for p in obj.payments.all().order_by('payment_date'):
            try:
                import jdatetime
                jd = jdatetime.date.fromgregorian(date=p.payment_date)
                date_shamsi = f"{jd.year}/{jd.month:02d}/{jd.day:02d}"
            except:
                date_shamsi = str(p.payment_date)
            
            result.append({
                'id': 'pay_' + str(p.id),
                'date_shamsi': date_shamsi,
                'date': str(p.payment_date),
                'amount': float(p.amount),
                'method': p.get_payment_method_display(),
                'notes': p.notes or '',
            })
        
        # ═══ ۲. از settlements (SellerDebt معکوس) ═══
        for s in obj.settlements.all().order_by('transaction_date'):
            try:
                import jdatetime
                jd = jdatetime.date.fromgregorian(date=s.transaction_date)
                date_shamsi = f"{jd.year}/{jd.month:02d}/{jd.day:02d}"
            except:
                date_shamsi = str(s.transaction_date)
            
            notes = s.notes or ''
            method = 'نقدی'
            if 'کارت' in notes: method = 'کارت به کارت'
            elif 'پوز' in notes: method = 'پوز'
            elif 'چک' in notes: method = 'چک'
            elif 'سایر' in notes: method = 'سایر'
            
            result.append({
                'id': 'set_' + str(s.id),
                'date_shamsi': date_shamsi,
                'date': str(s.transaction_date),
                'amount': float(s.amount),
                'method': method,
                'notes': notes,
            })
        
        # مرتب‌سازی بر اساس تاریخ
        result.sort(key=lambda x: x['date'])
        return result
    
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
            'parent_debt', 'settlement_paid', 'tx_remaining', 'settlements_data',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'seller']

class DebtPaymentSerializer(serializers.ModelSerializer):
    """سریالایزر پرداخت‌های بدهی/طلب"""
    
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    payment_date_shamsi = serializers.SerializerMethodField()
    
    def get_payment_date_shamsi(self, obj):
        if not obj.payment_date:
            return ''
        try:
            import jdatetime
            jd = jdatetime.date.fromgregorian(date=obj.payment_date)
            return f"{jd.year}/{jd.month:02d}/{jd.day:02d}"
        except:
            return str(obj.payment_date)
    
    class Meta:
        model = DebtPayment
        fields = [
            'id', 'debt', 'amount',
            'payment_date', 'payment_date_shamsi',
            'payment_method', 'payment_method_display',
            'notes', 'is_full_settlement',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

class InstallmentSerializer(serializers.ModelSerializer):
    """سریالایزر قسط"""
    
    due_date_shamsi = serializers.SerializerMethodField()
    paid_date_shamsi = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    
    def get_due_date_shamsi(self, obj):
        if not obj.due_date:
            return ''
        try:
            import jdatetime
            jd = jdatetime.date.fromgregorian(date=obj.due_date)
            return f"{jd.year}/{jd.month:02d}/{jd.day:02d}"
        except:
            return str(obj.due_date)
    
    def get_paid_date_shamsi(self, obj):
        if not obj.paid_date:
            return ''
        try:
            import jdatetime
            jd = jdatetime.date.fromgregorian(date=obj.paid_date)
            return f"{jd.year}/{jd.month:02d}/{jd.day:02d}"
        except:
            return str(obj.paid_date)
    
    class Meta:
        model = Installment
        fields = [
            'id', 'number', 'amount',
            'due_date', 'due_date_shamsi',
            'is_paid', 'paid_date', 'paid_date_shamsi',
            'is_overdue',
        ]
        read_only_fields = ['id']


class InstallmentPlanSerializer(serializers.ModelSerializer):
    """سریالایزر طرح اقساط"""
    
    installments = InstallmentSerializer(many=True, read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    plan_type_display = serializers.CharField(source='get_plan_type_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    guarantee_display = serializers.CharField(source='get_guarantee_display', read_only=True)
    
    paid_count = serializers.IntegerField(read_only=True)
    total_paid = serializers.FloatField(read_only=True)
    total_installments = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = InstallmentPlan
        fields = [
            'id', 'shop', 'shop_name',
            'person_name', 'person_phone', 'person_national_id',
            'person_postal_code', 'person_address',
            'plan_type', 'plan_type_display',
            'total_amount', 'installment_count', 'payment_day',
            'payment_method', 'payment_method_display',
            'guarantee', 'guarantee_display',
            'notes',
            'check_serial', 'check_notes', 'guarantee_serial', 'guarantee_notes',
            'installments', 'paid_count', 'total_paid', 'total_installments',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'seller']
