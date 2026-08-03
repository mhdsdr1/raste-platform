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
    description = models.TextField(verbose_name='توضیحات')
    price = models.DecimalField(max_digits=12, decimal_places=0, verbose_name='قیمت (تومان)')
    stock = models.IntegerField(default=1, verbose_name='موجودی')
    
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
