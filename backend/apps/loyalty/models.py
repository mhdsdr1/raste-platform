from django.db import models
from django.conf import settings
from apps.orders.models import Order


class LoyaltySettings(models.Model):
    """تنظیمات باشگاه مشتریان (هر فروشنده می‌تونه تنظیمات خودش رو داشته باشه)"""
    
    seller = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='loyalty_settings',
        verbose_name='فروشنده'
    )
    
    # فعال‌سازی
    is_active = models.BooleanField(default=False, verbose_name='فعال')
    
    # نحوه کسب امتیاز
    points_per_1000_toman = models.IntegerField(
        default=1, verbose_name='امتیاز به ازای هر ۱,۰۰۰ تومان خرید'
    )
    
    # امتیازهای ویژه
    first_purchase_bonus = models.IntegerField(default=50, verbose_name='امتیاز اولین خرید')
    referral_bonus = models.IntegerField(default=100, verbose_name='امتیاز معرفی دوست')
    birthday_bonus = models.IntegerField(default=200, verbose_name='امتیاز تولد')
    high_value_bonus = models.IntegerField(default=0, verbose_name='امتیاز خرید ویژه')
    high_value_threshold = models.DecimalField(
        max_digits=12, decimal_places=0, null=True, blank=True,
        verbose_name='آستانه خرید ویژه (تومان)'
    )
    
    # نحوه مصرف امتیاز
    points_to_credit_rate = models.IntegerField(
        default=10, verbose_name='نرخ تبدیل (هر ۱۰ امتیاز = ۱ تومان)'
    )
    free_shipping_points = models.IntegerField(
        default=500, verbose_name='امتیاز لازم برای ارسال رایگان'
    )
    
    # حداقل‌ها
    min_redeem_points = models.IntegerField(default=100, verbose_name='حداقل امتیاز قابل مصرف')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'تنظیمات باشگاه'
        verbose_name_plural = 'تنظیمات باشگاه‌ها'
    
    def __str__(self):
        return f"باشگاه {self.seller.phone}"


class CustomerLoyaltyPoints(models.Model):
    """امتیازات یک مشتری نزد یک فروشنده"""
    
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='loyalty_points',
        verbose_name='مشتری'
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='given_loyalty_points',
        verbose_name='فروشنده'
    )
    
    # امتیازات
    total_points_earned = models.IntegerField(default=0, verbose_name='کل امتیاز کسب‌شده')
    available_points = models.IntegerField(default=0, verbose_name='امتیاز قابل مصرف')
    
    # رتبه (بر اساس امتیاز کل)
    TIER_CHOICES = [
        ('bronze', '🥉 برنزی'),
        ('silver', '🥈 نقره‌ای'),
        ('gold', '🥇 طلایی'),
        ('platinum', '💎 پلاتینیوم'),
    ]
    tier = models.CharField(max_length=20, choices=TIER_CHOICES, default='bronze', verbose_name='رتبه')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'امتیاز مشتری'
        verbose_name_plural = 'امتیازات مشتریان'
        unique_together = ['customer', 'seller']
        indexes = [
            models.Index(fields=['customer', 'seller']),
            models.Index(fields=['tier']),
        ]
    
    def __str__(self):
        return f"{self.customer.phone}: {self.available_points} امتیاز"
    
    def update_tier(self):
        """بروزرسانی رتبه بر اساس کل امتیازات"""
        if self.total_points_earned >= 10000:
            self.tier = 'platinum'
        elif self.total_points_earned >= 5000:
            self.tier = 'gold'
        elif self.total_points_earned >= 1000:
            self.tier = 'silver'
        else:
            self.tier = 'bronze'
        self.save(update_fields=['tier'])


class LoyaltyTransaction(models.Model):
    """تراکنش‌های امتیاز"""
    
    TRANSACTION_TYPES = [
        ('earn', '➕ کسب امتیاز'),
        ('redeem', '➖ مصرف امتیاز'),
        ('expire', '❌ انقضا'),
        ('bonus', '🎁 جایزه'),
        ('referral', '👥 معرفی'),
        ('birthday', '🎂 تولد'),
    ]
    
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='loyalty_transactions',
        verbose_name='مشتری'
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='loyalty_transactions_given',
        verbose_name='فروشنده'
    )
    
    # نوع تراکنش
    transaction_type = models.CharField(
        max_length=20, choices=TRANSACTION_TYPES,
        verbose_name='نوع'
    )
    
    # امتیاز
    points = models.IntegerField(verbose_name='امتیاز')
    
    # توضیحات
    description = models.CharField(max_length=255, verbose_name='توضیحات')
    
    # سفارش مرتبط (اگر مربوط به خریده)
    order = models.ForeignKey(
        Order, null=True, blank=True,
        on_delete=models.SET_NULL,
        verbose_name='سفارش'
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ')
    
    class Meta:
        verbose_name = 'تراکنش امتیاز'
        verbose_name_plural = 'تراکنش‌های امتیاز'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.customer.phone}: {self.get_transaction_type_display()} {self.points}"
