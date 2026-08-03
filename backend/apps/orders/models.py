from django.db import models
from django.conf import settings
from apps.shops.models import Product
import random
from django.utils import timezone


class Order(models.Model):
    """مدل سفارش"""
    
    SOURCE_CHOICES = [
        ('web', 'وب'),
        ('telegram', 'تلگرام'),
        ('eitaa', 'ایتا'),
        ('sms', 'پیامک'),
        ('manual', 'دستی (تلفنی)'),
    ]
    
    STATUS_CHOICES = [
        ('pending_confirmation', 'در انتظار تأیید'),
        ('confirmed', 'تأیید شده'),
        ('packed', 'بسته‌بندی شده'),
        ('shipped', 'ارسال شده'),
        ('delivered', 'تحویل داده شده'),
        ('cancelled', 'لغو شده'),
    ]
    
    PAYMENT_METHODS = [
        ('online', 'آنلاین'),
        ('cod', 'پرداخت در محل'),
        ('manual', 'کارت به کارت'),
    ]
    
    PAYMENT_STATUSES = [
        ('pending', 'در انتظار'),
        ('paid', 'پرداخت شده'),
        ('failed', 'ناموفق'),
        ('refunded', 'عودت داده شده'),
    ]
    
    tracking_code = models.CharField(
        max_length=20, unique=True, db_index=True,
        verbose_name='کد رهگیری'
    )
    customer_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='orders_as_customer',
        verbose_name='مشتری (کاربر)'
    )
    customer_guest_info = models.JSONField(
        null=True, blank=True,
        verbose_name='اطلاعات مشتری مهمان'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='orders',
        verbose_name='محصول'
    )
    quantity = models.IntegerField(default=1, verbose_name='تعداد')
    total_price = models.DecimalField(
        max_digits=12, decimal_places=0,
        verbose_name='مبلغ کل (تومان)'
    )
    source = models.CharField(
        max_length=20, choices=SOURCE_CHOICES, default='web',
        verbose_name='منبع سفارش'
    )
    status = models.CharField(
        max_length=25, choices=STATUS_CHOICES,
        default='pending_confirmation',
        verbose_name='وضعیت سفارش'
    )
    confirmation_code = models.CharField(
        max_length=4, null=True, blank=True,
        verbose_name='کد تأیید'
    )
    is_confirmed = models.BooleanField(default=False, verbose_name='تأیید شده؟')
    payment_method = models.CharField(
        max_length=20, choices=PAYMENT_METHODS, default='manual',
        verbose_name='روش پرداخت'
    )
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUSES, default='pending',
        verbose_name='وضعیت پرداخت'
    )
    discount_code_used = models.CharField(
        max_length=50, null=True, blank=True,
        verbose_name='کد تخفیف استفاده شده'
    )
    discount_amount_applied = models.DecimalField(
        max_digits=12, decimal_places=0, default=0,
        verbose_name='مبلغ تخفیف'
    )
    courier_fee = models.DecimalField(
        max_digits=12, decimal_places=0, default=0,
        verbose_name='هزینه پیک'
    )
    shipping_address = models.TextField(null=True, blank=True, verbose_name='آدرس ارسال')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ثبت')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='آخرین بروزرسانی')
    
    class Meta:
        verbose_name = 'سفارش'
        verbose_name_plural = 'سفارشات'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tracking_code']),
            models.Index(fields=['customer_user']),
            models.Index(fields=['status']),
            models.Index(fields=['source']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"سفارش {self.tracking_code} - {self.product.title}"
    
    def save(self, *args, **kwargs):
        if not self.tracking_code:
            self.tracking_code = self.generate_tracking_code()
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_tracking_code():
        now = timezone.now()
        date_part = now.strftime('%y%m%d')
        random_part = str(random.randint(1000, 9999))
        return f'RST-{date_part}-{random_part}'
    
    @property
    def final_price(self):
        return self.total_price - self.discount_amount_applied + self.courier_fee


# ==================== SELLER DISCOUNT CODE ====================

class SellerDiscountCode(models.Model):
    """مدل کد تخفیف فروشنده"""
    
    DISCOUNT_TYPES = [
        ('fixed', '💰 مبلغ ثابت'),
        ('percent', '📊 درصدی'),
        ('free_shipping', '🚚 ارسال رایگان'),
    ]
    
    # فروشنده
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='discount_codes',
        verbose_name='فروشنده'
    )
    
    # کد (قابل سفارشی‌سازی)
    code = models.CharField(max_length=50, db_index=True, verbose_name='کد')
    
    # نوع تخفیف
    discount_type = models.CharField(
        max_length=20, choices=DISCOUNT_TYPES,
        verbose_name='نوع تخفیف'
    )
    
    # مقدار (برای fixed: تومان، برای percent: درصد)
    discount_value = models.DecimalField(
        max_digits=12, decimal_places=0, null=True, blank=True,
        verbose_name='مقدار تخفیف'
    )
    discount_percent = models.IntegerField(
        null=True, blank=True,
        verbose_name='درصد تخفیف (حداکثر ۹۹)'
    )
    
    # شرایط
    min_order_amount = models.DecimalField(
        max_digits=12, decimal_places=0, null=True, blank=True,
        verbose_name='حداقل مبلغ سفارش (تومان)'
    )
    max_discount_amount = models.DecimalField(
        max_digits=12, decimal_places=0, null=True, blank=True,
        verbose_name='سقف تخفیف (تومان) - برای درصدی'
    )
    
    # محدودیت استفاده
    max_uses = models.IntegerField(default=1, verbose_name='حداکثر تعداد استفاده')
    used_count = models.IntegerField(default=0, verbose_name='تعداد استفاده شده')
    
    # بازه زمانی
    valid_from = models.DateTimeField(verbose_name='تاریخ شروع')
    valid_until = models.DateTimeField(verbose_name='تاریخ پایان')
    
    # وضعیت
    is_active = models.BooleanField(default=True, verbose_name='فعال')
    
    # توضیحات
    note = models.CharField(max_length=200, null=True, blank=True, verbose_name='یادداشت')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    
    class Meta:
        verbose_name = 'کد تخفیف فروشنده'
        verbose_name_plural = 'کدهای تخفیف فروشندگان'
        constraints = [
            models.UniqueConstraint(fields=['seller', 'code'], name='unique_seller_code')
        ]
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['seller']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.get_discount_type_display()}"
    
    @property
    def is_expired(self):
        """آیا منقضی شده؟"""
        return timezone.now() > self.valid_until
    
    @property
    def is_valid(self):
        """آیا معتبر است؟"""
        return (
            self.is_active and
            not self.is_expired and
            timezone.now() >= self.valid_from and
            self.used_count < self.max_uses
        )
