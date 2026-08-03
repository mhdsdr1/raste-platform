from django.db import models
from django.conf import settings
from django.utils import timezone


class GroupDeal(models.Model):
    """مدل هم‌خرید"""
    
    PAYMENT_TYPES = [
        ('full', 'کل مبلغ'),
        ('deposit', 'بیعانه'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'فعال'),
        ('completed', 'تکمیل شده - در انتظار خرید'),
        ('cancelled', 'لغو - تعداد نرسید'),
        ('closed', 'بسته شده - تحویل انجام شد'),
    ]
    
    # واسط (Deal Maker)
    deal_maker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='deals',
        verbose_name='واسط خرید'
    )
    
    # مشخصات محصول
    title = models.CharField(max_length=200, verbose_name='عنوان')
    description = models.TextField(verbose_name='توضیحات')
    image = models.ImageField(upload_to='deals/', null=True, blank=True, verbose_name='تصویر')
    
    # قیمت‌ها
    market_price = models.DecimalField(
        max_digits=12, decimal_places=0,
        verbose_name='قیمت تک در بازار (تومان)'
    )
    wholesale_price = models.DecimalField(
        max_digits=12, decimal_places=0,
        verbose_name='قیمت عمده (تومان)'
    )
    
    # شرایط
    min_participants = models.IntegerField(verbose_name='حداقل نفرات')
    current_participants = models.IntegerField(default=0, verbose_name='تعداد فعلی')
    
    # پرداخت
    payment_type = models.CharField(
        max_length=20, choices=PAYMENT_TYPES, default='full',
        verbose_name='نوع پرداخت'
    )
    deposit_percent = models.IntegerField(default=30, verbose_name='درصد بیعانه')
    
    # زمان‌بندی
    deadline = models.DateTimeField(verbose_name='مهلت ثبت‌نام')
    
    # وضعیت
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='active',
        verbose_name='وضعیت'
    )
    
    # لینک یکتا
    slug = models.SlugField(unique=True, verbose_name='شناسه یکتا')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    
    class Meta:
        verbose_name = 'هم‌خرید'
        verbose_name_plural = 'هم‌خریدها'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['status']),
            models.Index(fields=['deadline']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.current_participants}/{self.min_participants})"
    
    @property
    def is_expired(self):
        """آیا مهلت تمام شده؟"""
        return timezone.now() > self.deadline
    
    @property
    def remaining_slots(self):
        """تعداد ظرفیت باقی‌مانده"""
        return max(0, self.min_participants - self.current_participants)
    
    @property
    def progress_percent(self):
        """درصد پیشرفت"""
        if self.min_participants == 0:
            return 100
        return min(100, int(self.current_participants / self.min_participants * 100))
    
    @property
    def discount_percent(self):
        """درصد تخفیف نسبت به قیمت بازار"""
        if self.market_price == 0:
            return 0
        return int((1 - self.wholesale_price / self.market_price) * 100)
    
    @property
    def calculated_price(self):
        """قیمت قابل پرداخت توسط هر شرکت‌کننده"""
        if self.payment_type == 'deposit':
            return int(self.wholesale_price * self.deposit_percent / 100)
        return self.wholesale_price


class GroupDealParticipant(models.Model):
    """مدل شرکت‌کننده در هم‌خرید"""
    
    PAYMENT_STATUSES = [
        ('pending', 'در انتظار پرداخت'),
        ('paid', 'پرداخت شده'),
        ('refunded', 'عودت داده شده'),
    ]
    
    group_deal = models.ForeignKey(
        GroupDeal,
        on_delete=models.CASCADE,
        related_name='participants',
        verbose_name='هم‌خرید'
    )
    
    # کاربر (می‌تونه مهمان باشه)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        verbose_name='کاربر'
    )
    guest_name = models.CharField(max_length=100, null=True, blank=True, verbose_name='نام مهمان')
    guest_phone = models.CharField(max_length=15, null=True, blank=True, verbose_name='شماره مهمان')
    
    # پرداخت
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUSES, default='pending',
        verbose_name='وضعیت پرداخت'
    )
    amount_paid = models.DecimalField(
        max_digits=12, decimal_places=0,
        verbose_name='مبلغ پرداختی (تومان)'
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ثبت‌نام')
    
    class Meta:
        verbose_name = 'شرکت‌کننده'
        verbose_name_plural = 'شرکت‌کنندگان'
        unique_together = ['group_deal', 'guest_phone']
        indexes = [
            models.Index(fields=['group_deal']),
            models.Index(fields=['guest_phone']),
        ]
    
    def __str__(self):
        name = self.guest_name or (self.user.phone if self.user else 'ناشناس')
        return f"{name} - {self.group_deal.title}"
