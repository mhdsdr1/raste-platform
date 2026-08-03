from django.db import models
from django.conf import settings


class Courier(models.Model):
    """مدل پیک"""
    
    VEHICLE_TYPES = [
        ('motorcycle', '🏍️ موتور'),
        ('car', '🚗 سواری'),
        ('pickup', '🚛 وانت'),
        ('bicycle', '🚲 دوچرخه'),
    ]
    
    APPROVAL_STATUSES = [
        ('pending', 'در انتظار بررسی'),
        ('documents_uploaded', 'مدارک بارگذاری شده'),
        ('approved', '✅ تأیید شده'),
        ('rejected', '❌ رد شده'),
    ]
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='courier',
        verbose_name='کاربر'
    )
    
    # اطلاعات پایه
    vehicle_type = models.CharField(
        max_length=20, choices=VEHICLE_TYPES,
        verbose_name='نوع وسیله نقلیه'
    )
    vehicle_plate = models.CharField(
        max_length=10, null=True, blank=True,
        verbose_name='شماره پلاک'
    )
    
    # وضعیت
    is_active = models.BooleanField(default=False, verbose_name='فعال')
    is_online = models.BooleanField(default=False, verbose_name='آنلاین')
    
    # موقعیت
    current_lat = models.FloatField(null=True, blank=True, verbose_name='موقعیت فعلی (عرض)')
    current_lng = models.FloatField(null=True, blank=True, verbose_name='موقعیت فعلی (طول)')
    max_distance_km = models.IntegerField(default=10, verbose_name='حداکثر مسافت (کیلومتر)')
    
    # امتیاز
    rating = models.FloatField(default=5.0, verbose_name='امتیاز')
    total_deliveries = models.IntegerField(default=0, verbose_name='کل ارسال‌ها')
    
    # مدارک و تأیید
    approval_status = models.CharField(
        max_length=25, choices=APPROVAL_STATUSES,
        default='pending', verbose_name='وضعیت تأیید'
    )
    national_card_image = models.ImageField(
        upload_to='courier_docs/', null=True, blank=True,
        verbose_name='تصویر کارت ملی'
    )
    license_image = models.ImageField(
        upload_to='courier_docs/', null=True, blank=True,
        verbose_name='تصویر گواهینامه'
    )
    vehicle_card_image = models.ImageField(
        upload_to='courier_docs/', null=True, blank=True,
        verbose_name='تصویر کارت ماشین'
    )
    
    # تأیید مدیر
    admin_note = models.TextField(null=True, blank=True, verbose_name='یادداشت مدیر')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='approved_couriers',
        verbose_name='تأییدکننده'
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name='تاریخ تأیید')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ثبت‌نام')
    
    class Meta:
        verbose_name = 'پیک'
        verbose_name_plural = 'پیک‌ها'
    
    def __str__(self):
        return f"{self.user.phone} - {self.get_vehicle_type_display()}"


class CourierPricing(models.Model):
    """مدل تعرفه پیک (تنظیم توسط مدیر)"""
    
    vehicle_type = models.CharField(
        max_length=20, choices=Courier.VEHICLE_TYPES,
        unique=True, verbose_name='نوع وسیله'
    )
    
    # هزینه‌ها
    city_base_fee = models.DecimalField(
        max_digits=12, decimal_places=0,
        verbose_name='هزینه پایه درون‌شهری (تومان)'
    )
    city_per_km_fee = models.DecimalField(
        max_digits=12, decimal_places=0,
        verbose_name='هر کیلومتر درون‌شهری (تومان)'
    )
    suburb_base_fee = models.DecimalField(
        max_digits=12, decimal_places=0,
        verbose_name='هزینه پایه حومه (تومان)'
    )
    suburb_per_km_fee = models.DecimalField(
        max_digits=12, decimal_places=0,
        verbose_name='هر کیلومتر حومه (تومان)'
    )
    
    min_distance_km = models.IntegerField(default=1, verbose_name='حداقل مسافت')
    max_distance_km = models.IntegerField(default=50, verbose_name='حداکثر مسافت')
    
    is_active = models.BooleanField(default=True, verbose_name='فعال')
    
    class Meta:
        verbose_name = 'تعرفه پیک'
        verbose_name_plural = 'تعرفه‌های پیک'
    
    def __str__(self):
        return f"تعرفه {self.get_vehicle_type_display()}"


class CourierRequest(models.Model):
    """مدل درخواست پیک"""
    
    STATUS_CHOICES = [
        ('pending', 'منتظر پیک'),
        ('accepted', 'پذیرفته شده'),
        ('picked_up', 'تحویل از فروشنده'),
        ('in_transit', 'در مسیر'),
        ('delivered', 'تحویل به مشتری'),
        ('cancelled', 'لغو'),
    ]
    
    order = models.OneToOneField(
        'orders.Order', on_delete=models.CASCADE,
        related_name='courier_request',
        verbose_name='سفارش'
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='courier_requests',
        verbose_name='فروشنده'
    )
    courier = models.ForeignKey(
        Courier, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='assignments',
        verbose_name='پیک'
    )
    
    # آدرس‌ها
    pickup_address = models.TextField(verbose_name='آدرس فروشنده')
    pickup_lat = models.FloatField(verbose_name='موقعیت فروشنده (عرض)')
    pickup_lng = models.FloatField(verbose_name='موقعیت فروشنده (طول)')
    delivery_address = models.TextField(verbose_name='آدرس مشتری')
    delivery_lat = models.FloatField(verbose_name='موقعیت مشتری (عرض)')
    delivery_lng = models.FloatField(verbose_name='موقعیت مشتری (طول)')
    
    # مسافت و هزینه
    distance_km = models.FloatField(verbose_name='مسافت (کیلومتر)')
    estimated_fee = models.DecimalField(
        max_digits=12, decimal_places=0,
        verbose_name='هزینه پیشنهادی (تومان)'
    )
    final_fee = models.DecimalField(
        max_digits=12, decimal_places=0, null=True, blank=True,
        verbose_name='هزینه نهایی (تومان)'
    )
    
    # وضعیت
    status = models.CharField(
        max_length=25, choices=STATUS_CHOICES,
        default='pending', verbose_name='وضعیت'
    )
    
    # کدهای QR
    pickup_code = models.CharField(max_length=4, verbose_name='کد تحویل')
    delivery_code = models.CharField(max_length=4, verbose_name='کد دریافت')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    
    class Meta:
        verbose_name = 'درخواست پیک'
        verbose_name_plural = 'درخواست‌های پیک'
    
    def __str__(self):
        return f"پیک {self.order.tracking_code}"
    
    def save(self, *args, **kwargs):
        """تولید کدهای QR"""
        import random
        if not self.pickup_code:
            self.pickup_code = str(random.randint(1000, 9999))
        if not self.delivery_code:
            self.delivery_code = str(random.randint(1000, 9999))
        super().save(*args, **kwargs)
