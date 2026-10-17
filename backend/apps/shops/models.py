from django.db import models
from django.conf import settings


class Shop(models.Model):
    """مدل فروشگاه"""
    
    SHOP_TYPES = [
        ('social', 'فروشنده اجتماعی'),
        ('hybrid', 'فروشگاه‌دار هیبریدی'),
        ('network', 'فروشنده تلفنی/شبکه‌ای'),
    ]
    
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='shops',
        verbose_name='مالک'
    )
    name = models.CharField(max_length=100, verbose_name='نام فروشگاه')
    slug = models.SlugField(unique=True, allow_unicode=True, verbose_name='شناسه یکتا')
    description = models.TextField(null=True, blank=True, verbose_name='توضیحات')
    
    # تصاویر
    logo = models.ImageField(upload_to='shops/logos/', null=True, blank=True, verbose_name='لوگو')
    banner = models.ImageField(upload_to='shops/banners/', null=True, blank=True, verbose_name='بنر')
    
    # نوع فروشگاه
    shop_type = models.CharField(
        max_length=15, choices=SHOP_TYPES, default='social',
        verbose_name='نوع فروشگاه'
    )
    
    # اطلاعات تماس و موقعیت
    contact_phone = models.CharField(max_length=15, null=True, blank=True, verbose_name='تلفن تماس')
    address = models.TextField(null=True, blank=True, verbose_name='آدرس')
    geo_lat = models.FloatField(null=True, blank=True, verbose_name='عرض جغرافیایی')
    geo_lng = models.FloatField(null=True, blank=True, verbose_name='طول جغرافیایی')
    
    # وضعیت
    is_active = models.BooleanField(default=True, verbose_name='فعال')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='آخرین بروزرسانی')
    
    class Meta:
        verbose_name = 'فروشگاه'
        verbose_name_plural = 'فروشگاه‌ها'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['owner']),
        ]
    
    def __str__(self):
        return self.name
    
    @property
    def products_count(self):
        """تعداد کل محصولات"""
        return self.products.count()
    
    @property
    def active_products_count(self):
        """تعداد محصولات فعال"""
        return self.products.filter(is_visible=True).count()

class Product(models.Model):
    """مدل محصول (کالا)"""
    
    CONDITION_CHOICES = [
        ('new', 'نو'),
        ('like_new', 'در حد نو'),
        ('used', 'کارکرده'),
        ('needs_repair', 'نیاز به تعمیر'),
    ]
    
    HEALTH_STATUS_CHOICES = [
        ('perfect', 'کاملاً سالم'),
        ('scratched', 'خط و خش جزئی'),
        ('minor_damage', 'آسیب جزئی'),
        ('major_damage', 'آسیب جدی'),
    ]
    
    shop = models.ForeignKey(
        Shop,
        on_delete=models.CASCADE,
        related_name='products',
        verbose_name='فروشگاه'
    )
    title = models.CharField(max_length=200, verbose_name='عنوان')
    description = models.TextField(null=True, blank=True, default='', verbose_name='توضیحات')
    price = models.DecimalField(max_digits=12, decimal_places=0, verbose_name='قیمت (تومان)')
    stock = models.IntegerField(default=1, verbose_name='موجودی')
    purchase_price = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True, verbose_name='قیمت خرید')
    warehouse_stock = models.IntegerField(default=0, verbose_name='موجودی انبار')
    
    # تصاویر
    image = models.ImageField(upload_to='products/', null=True, blank=True, verbose_name='تصویر اصلی')
    
    # وضعیت کالا (برای استوک)
    condition = models.CharField(
        max_length=20, choices=CONDITION_CHOICES, default='new',
        verbose_name='وضعیت کالا'
    )
    health_status = models.CharField(
        max_length=20, choices=HEALTH_STATUS_CHOICES,
        null=True, blank=True, verbose_name='وضعیت سلامت'
    )
    health_description = models.TextField(null=True, blank=True, verbose_name='توضیحات سلامت')
    
    # قابلیت‌ها
    allow_local_test = models.BooleanField(default=False, verbose_name='امکان تست حضوری')
    allow_courier = models.BooleanField(default=False, verbose_name='امکان ارسال با پیک')
    
    # داستان محصول (برای جذب مهندس ایرجی)
    colors = models.JSONField(default=dict, blank=True, verbose_name="رنگ‌بندی با موجودی")
    color = models.CharField(max_length=50, null=True, blank=True, default="", verbose_name="رنگ")
    sizes = models.JSONField(default=dict, blank=True, verbose_name='سایزبندی')
    category = models.CharField(max_length=100, blank=True, default="", verbose_name="دسته‌بندی")
    story = models.TextField(null=True, blank=True, verbose_name='داستان محصول')
    
    # وضعیت نمایش
    buy_link_active = models.BooleanField(default=True, verbose_name='لینک خرید فعال')
    is_visible = models.BooleanField(default=True, verbose_name='قابل نمایش')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='آخرین بروزرسانی')
    
    class Meta:
        verbose_name = 'محصول'
        verbose_name_plural = 'محصولات'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['shop']),
            models.Index(fields=['condition']),
            models.Index(fields=['price']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.shop.name})"
    
    @property
    def is_stock(self):
        """آیا کالا استوک است؟"""
        return self.condition != 'new'
    
    @property
    def discount_percent(self):
        """درصد تخفیف (برای هم‌خرید) - بعداً تکمیل میشه"""
        return None

    @property
    def total_colors_stock(self):
        """جمع موجودی همه رنگ‌ها"""
        if self.colors:
            return sum(int(v) for v in self.colors.values() if isinstance(v, (int, float)) and v > 0)
        return None


class SellerExpense(models.Model):
    """هزینه‌های جانبی فروشنده"""
    
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='expenses',
        verbose_name='فروشنده'
    )
    shop = models.ForeignKey(
        'shops.Shop',
        on_delete=models.CASCADE,
        related_name='expenses',
        null=True, blank=True,
        verbose_name='فروشگاه'
    )
    title = models.CharField(max_length=100, verbose_name='عنوان')
    icon = models.CharField(max_length=10, blank=True, default='', verbose_name='آیکون')
    amount = models.DecimalField(max_digits=12, decimal_places=0, verbose_name='مبلغ (تومان)')
    expense_date = models.DateField(verbose_name='تاریخ')
    notes = models.TextField(blank=True, default='', verbose_name='یادداشت')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'هزینه جانبی'
        verbose_name_plural = 'هزینه‌های جانبی'
        ordering = ['-expense_date', '-created_at']
    
    def __str__(self):
        return f"{self.icon} {self.title} - {self.amount:,} تومان"

class SellerDebt(models.Model):
    """بدهکاران و بستانکاران فروشنده"""
    
    DEBT_TYPE_CHOICES = [
        ('debtor', 'بدهکار (طلب من از دیگران)'),
        ('creditor', 'بستانکار (طلب دیگران از من)'),
    ]
    
    PAYMENT_TYPE_CHOICES = [
        ('cash', 'نقدی'),
        ('check', 'چکی'),
        ('installment', 'اقساطی'),
        ('credit', 'نسیه'),
    ]
    
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='debts',
        verbose_name='فروشنده'
    )
    shop = models.ForeignKey(
        'shops.Shop',
        on_delete=models.SET_NULL,
        related_name='debts',
        null=True, blank=True,
        verbose_name='فروشگاه'
    )
    debt_type = models.CharField(
        max_length=10,
        choices=DEBT_TYPE_CHOICES,
        verbose_name='نوع'
    )
    
    # اطلاعات شخص
    person_name = models.CharField(max_length=100, verbose_name='نام شخص')
    person_phone = models.CharField(max_length=15, verbose_name='شماره تماس')
    person_national_id = models.CharField(max_length=10, blank=True, default='', verbose_name='کد ملی')
    person_address = models.TextField(blank=True, default='', verbose_name='آدرس')
    person_postal_code = models.CharField(max_length=10, blank=True, default='', verbose_name='کد پستی')
    bank_name = models.CharField(max_length=50, blank=True, default='', verbose_name='نام بانک')
    card_number = models.CharField(max_length=16, blank=True, default='', verbose_name='شماره کارت')
    sheba_number = models.CharField(max_length=26, blank=True, default='', verbose_name='شماره شبا')
    
    # مالی
    amount = models.DecimalField(max_digits=12, decimal_places=0, verbose_name='مبلغ (تومان)')
    paid_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0, verbose_name='پرداخت‌شده')
    
    # سررسید
    due_date = models.DateField(null=True, blank=True, verbose_name='تاریخ سررسید')
    payment_type = models.CharField(
        max_length=15,
        choices=PAYMENT_TYPE_CHOICES,
        default='credit',
        verbose_name='نوع پرداخت'
    )
    
    # اقساط
    is_installment = models.BooleanField(default=False, verbose_name='اقساطی')
    installment_count = models.IntegerField(null=True, blank=True, verbose_name='تعداد اقساط')
    installment_amount = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True, verbose_name='مبلغ هر قسط')
    
    # توضیحات
    notes = models.TextField(blank=True, default='', verbose_name='شرح')
    transaction_date = models.DateField(verbose_name='تاریخ تراکنش')
    
    # ═══ اتصال به تراکنش اصلی (برای تسویه) ═══
    parent_debt = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='settlements',
        verbose_name='تراکنش اصلی'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'بدهکار/بستانکار'
        verbose_name_plural = 'بدهکاران و بستانکاران'
        ordering = ['-transaction_date', '-created_at']
        indexes = [
            models.Index(fields=['seller', 'debt_type']),
            models.Index(fields=['seller', 'person_name']),
            models.Index(fields=['due_date']),
        ]
    
    def __str__(self):
        return f"{self.get_debt_type_display()} - {self.person_name} - {self.amount}"
    
    @property
    def settlement_paid(self):
        """مجموع تسویه‌های این تراکنش (از settlements)"""
        from django.db.models import Sum
        result = self.settlements.aggregate(total=Sum('amount'))['total']
        return float(result or 0)
    
    @property
    def tx_remaining(self):
        """مانده خود تراکنش = amount - مجموع پرداخت‌ها (DebtPayment + settlements)"""
        from django.db.models import Sum
        paid = self.payments.aggregate(total=Sum('amount'))['total'] or 0
        settled = self.settlement_paid
        return float(self.amount) - float(paid) - float(settled)
    
    @property
    def total_paid(self):
        """مجموع پرداخت‌ها از DebtPayment"""
        from django.db.models import Sum
        result = self.payments.aggregate(total=Sum('amount'))['total']
        return float(result or 0)
    
    @property
    def remaining(self):
        """مانده = مبلغ کل - مجموع پرداخت‌ها"""
        return float(self.amount) - self.total_paid
    
    @property
    def is_overdue(self):
        """آیا سررسید گذشته؟"""
        from django.utils import timezone
        if not self.due_date:
            return False
        return self.due_date < timezone.now().date() and self.remaining > 0

class DebtPayment(models.Model):
    """پرداخت‌های بدهی/طلب"""
    
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'نقدی'),
        ('card', 'کارت به کارت'),
        ('pos', 'پوز'),
        ('check', 'چک'),
        ('other', 'سایر'),
    ]
    
    debt = models.ForeignKey(
        'shops.SellerDebt',
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name='بدهی/طلب'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=0, verbose_name='مبلغ (تومان)')
    payment_date = models.DateField(verbose_name='تاریخ تسویه')
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default='cash',
        verbose_name='روش تسویه'
    )
    notes = models.TextField(blank=True, default='', verbose_name='توضیحات')
    is_full_settlement = models.BooleanField(default=False, verbose_name='تسویه کامل')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'پرداخت'
        verbose_name_plural = 'پرداخت‌ها'
        ordering = ['-payment_date', '-created_at']
    
    def __str__(self):
        return f"{self.debt.person_name} - {self.amount} ({self.get_payment_method_display()})"

class InstallmentPlan(models.Model):
    """طرح خرید اقساطی"""
    
    PLAN_TYPE_CHOICES = [
        ('regular', 'اقساط منظم'),
        ('custom', 'اقساط دلخواه'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('check', 'چک'),
        ('cash', 'نقد'),
        ('other', 'سایر'),
    ]
    
    GUARANTEE_CHOICES = [
        ('check', 'چک'),
        ('surety', 'سفته'),
        ('other', 'سایر'),
    ]
    
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='installment_plans',
        verbose_name='فروشنده'
    )
    shop = models.ForeignKey(
        'shops.Shop',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='installment_plans',
        verbose_name='فروشگاه'
    )
    
    # اطلاعات شخص
    person_name = models.CharField(max_length=100, verbose_name='نام')
    person_phone = models.CharField(max_length=15, verbose_name='موبایل')
    person_national_id = models.CharField(max_length=10, blank=True, default='', verbose_name='کد ملی')
    person_postal_code = models.CharField(max_length=10, blank=True, default='', verbose_name='کد پستی')
    person_address = models.TextField(blank=True, default='', verbose_name='آدرس')
    
    # نوع طرح
    plan_type = models.CharField(max_length=20, choices=PLAN_TYPE_CHOICES, default='regular')
    
    # اقساط منظم
    total_amount = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True, verbose_name='مبلغ کل')
    installment_count = models.IntegerField(null=True, blank=True, verbose_name='تعداد اقساط')
    payment_day = models.CharField(max_length=10, blank=True, default='last', verbose_name='روز سررسید')
    
    # پرداخت و تضمینات
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='check', verbose_name='نحوه پرداخت')
    guarantee = models.CharField(max_length=20, choices=GUARANTEE_CHOICES, default='check', verbose_name='تضمینات')
    
    notes = models.TextField(blank=True, default='', verbose_name='توضیحات')
    
    # اطلاعات چک پرداخت
    check_serial = models.CharField(max_length=50, blank=True, default='', verbose_name='سریال چک پرداخت')
    check_notes = models.TextField(blank=True, default='', verbose_name='شرح چک پرداخت')
    
    # اطلاعات تضمینات
    guarantee_serial = models.CharField(max_length=50, blank=True, default='', verbose_name='سریال تضمین')
    guarantee_notes = models.TextField(blank=True, default='', verbose_name='شرح تضمین')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'طرح اقساط'
        verbose_name_plural = 'طرح‌های اقساط'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.person_name} - {self.installments.count()} قسط"
    
    @property
    def paid_count(self):
        return self.installments.filter(is_paid=True).count()
    
    @property
    def total_paid(self):
        from django.db.models import Sum
        return float(self.installments.filter(is_paid=True).aggregate(t=Sum('amount'))['t'] or 0)
    
    @property
    def total_installments(self):
        return self.installments.count()


class Installment(models.Model):
    """قسط"""
    
    plan = models.ForeignKey(
        InstallmentPlan,
        on_delete=models.CASCADE,
        related_name='installments',
        verbose_name='طرح اقساط'
    )
    number = models.IntegerField(verbose_name='شماره قسط')
    amount = models.DecimalField(max_digits=12, decimal_places=0, verbose_name='مبلغ')
    due_date = models.DateField(verbose_name='سررسید')
    
    # وضعیت
    is_paid = models.BooleanField(default=False, verbose_name='پرداخت شده')
    paid_date = models.DateField(null=True, blank=True, verbose_name='تاریخ پرداخت')
    
    class Meta:
        verbose_name = 'قسط'
        verbose_name_plural = 'اقساط'
        ordering = ['number']
    
    def __str__(self):
        return f"قسط {self.number} - {self.amount}"
    
    @property
    def is_overdue(self):
        """سررسید گذشته"""
        from django.utils import timezone
        if self.is_paid:
            return False
        return self.due_date < timezone.now().date()
