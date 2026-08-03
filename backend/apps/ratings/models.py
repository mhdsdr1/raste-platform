from django.db import models
from django.conf import settings
from apps.orders.models import Order


class PublicRating(models.Model):
    """مدل امتیازدهی عمومی (۱ تا ۳ ستاره) - برای فروشنده و پیک"""
    
    RATING_TARGETS = [
        ('seller', 'فروشنده'),
        ('courier', 'پیک'),
    ]
    
    # چه کسی امتیاز میده
    rater = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ratings_given',
        verbose_name='امتیازدهنده'
    )
    
    # به چه کسی امتیاز داده میشه
    rated_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ratings_received',
        verbose_name='دریافت‌کننده امتیاز'
    )
    
    # نوع هدف
    target_type = models.CharField(
        max_length=10, choices=RATING_TARGETS,
        verbose_name='نوع'
    )
    
    # سفارش مرتبط
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE,
        related_name='ratings',
        verbose_name='سفارش'
    )
    
    # ستاره (۱ تا ۳)
    stars = models.IntegerField(
        choices=[(1, '⭐ معمولی'), (2, '⭐⭐ خوب'), (3, '⭐⭐⭐ عالی')],
        verbose_name='ستاره'
    )
    
    # امتیاز عددی (محاسبه خودکار: ستاره × ۳۳.۳۳)
    score = models.IntegerField(verbose_name='امتیاز از ۱۰۰')
    
    # عوامل امتیاز فروشنده
    quality_score = models.IntegerField(
        null=True, blank=True,
        choices=[(1, 'ضعیف'), (2, 'متوسط'), (3, 'عالی')],
        verbose_name='کیفیت کالا'
    )
    speed_score = models.IntegerField(
        null=True, blank=True,
        choices=[(1, 'کند'), (2, 'معمولی'), (3, 'سریع')],
        verbose_name='سرعت ارسال'
    )
    communication_score = models.IntegerField(
        null=True, blank=True,
        choices=[(1, 'ضعیف'), (2, 'خوب'), (3, 'عالی')],
        verbose_name='ارتباط با مشتری'
    )
    accuracy_score = models.IntegerField(
        null=True, blank=True,
        choices=[(1, 'ندارد'), (2, 'متوسط'), (3, 'کامل')],
        verbose_name='تطابق با توضیحات'
    )
    
    # عوامل امتیاز پیک
    delivery_speed_score = models.IntegerField(
        null=True, blank=True,
        choices=[(1, 'کند'), (2, 'معمولی'), (3, 'سریع')],
        verbose_name='سرعت پیک'
    )
    behavior_score = models.IntegerField(
        null=True, blank=True,
        choices=[(1, 'ضعیف'), (2, 'خوب'), (3, 'عالی')],
        verbose_name='رفتار پیک'
    )
    package_health_score = models.IntegerField(
        null=True, blank=True,
        choices=[(1, 'آسیب‌دیده'), (2, 'سالم'), (3, 'کاملاً سالم')],
        verbose_name='سلامت بسته'
    )
    
    # نظر متنی
    comment = models.TextField(null=True, blank=True, verbose_name='نظر')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ثبت')
    
    class Meta:
        verbose_name = 'امتیاز عمومی'
        verbose_name_plural = 'امتیازات عمومی'
        unique_together = ['rater', 'order', 'target_type']
        indexes = [
            models.Index(fields=['rated_user']),
            models.Index(fields=['order']),
        ]
    
    def __str__(self):
        return f"{'⭐' * self.stars} - {self.rated_user.phone}"
    
    def save(self, *args, **kwargs):
        """محاسبه خودکار امتیاز از ستاره"""
        if not self.score:
            self.score = int(self.stars * 33.33)
        super().save(*args, **kwargs)


class SellerHiddenRating(models.Model):
    """مدل امتیاز مخفی مشتریان (فقط فروشنده می‌بینه)"""
    
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hidden_ratings_given',
        verbose_name='فروشنده'
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hidden_ratings_received',
        verbose_name='مشتری'
    )
    
    # عوامل امتیاز مخفی
    loyalty_score = models.IntegerField(default=50, verbose_name='وفاداری (۰-۱۰۰)')
    prompt_payment_score = models.IntegerField(default=50, verbose_name='پرداخت به موقع')
    low_return_score = models.IntegerField(default=50, verbose_name='مرجوعی کم')
    referral_score = models.IntegerField(default=50, verbose_name='معرفی به دیگران')
    
    # میانگین وزنی
    total_score = models.IntegerField(default=50, verbose_name='امتیاز کل')
    
    # یادداشت فروشنده
    seller_note = models.TextField(null=True, blank=True, verbose_name='یادداشت فروشنده')
    
    updated_at = models.DateTimeField(auto_now=True, verbose_name='آخرین بروزرسانی')
    
    class Meta:
        verbose_name = 'امتیاز مخفی'
        verbose_name_plural = 'امتیازات مخفی'
        unique_together = ['seller', 'customer']
    
    def __str__(self):
        return f"{self.customer.phone}: {self.total_score}/100"
    
    def save(self, *args, **kwargs):
        """محاسبه خودکار امتیاز کل"""
        self.total_score = int(
            (self.loyalty_score + self.prompt_payment_score + 
             self.low_return_score + self.referral_score) / 4
        )
        super().save(*args, **kwargs)
