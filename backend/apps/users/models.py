from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
import random


class User(AbstractUser):
    phone = models.CharField(max_length=15, unique=True, db_index=True, verbose_name='شماره تلفن')
    national_id = models.CharField(max_length=10, null=True, blank=True, unique=True, db_index=True, verbose_name='کد ملی')
    
    USER_TYPES = [
        ('buyer', 'خریدار'),
        ('seller', 'فروشنده'),
        ('courier', 'پیک'),
        ('service_provider', 'سرویس‌دهنده'),
        ('hybrid', 'هیبرید'),
    ]
    user_type = models.CharField(max_length=20, choices=USER_TYPES, default='buyer', verbose_name='نوع کاربر')
    
    PREFERRED_CONTACT_CHOICES = [
        ('sms', 'پیامک'),
        ('eitaa', 'ایتا'),
        ('telegram', 'تلگرام'),
        ('phone_call', 'تماس تلفنی'),
    ]
    preferred_contact = models.CharField(max_length=15, choices=PREFERRED_CONTACT_CHOICES, default='sms', verbose_name='روش تماس ترجیحی')
    
    SUBSCRIPTION_PLANS = [
        ('free', 'رایگان'),
        ('silver', 'نقره‌ای'),
        ('gold', 'طلایی'),
    ]
    subscription_plan = models.CharField(max_length=15, choices=SUBSCRIPTION_PLANS, default='free', verbose_name='پلن اشتراک')
    subscription_start = models.DateTimeField(null=True, blank=True, verbose_name='تاریخ شروع اشتراک')
    subscription_expiry = models.DateTimeField(null=True, blank=True, verbose_name='تاریخ پایان اشتراک')
    trial_used = models.BooleanField(default=False, verbose_name='دوره آزمایشی استفاده شده؟')
    
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True, verbose_name='تصویر پروفایل')
    birthday = models.DateField(null=True, blank=True, verbose_name='تاریخ تولد')
    
    # وضعیت امنیتی
    is_blocked = models.BooleanField(default=False, verbose_name='مسدود شده؟')
    blocked_reason = models.TextField(null=True, blank=True, verbose_name='دلیل مسدودیت')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ عضویت')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='آخرین به‌روزرسانی')
    
    class Meta:
        verbose_name = 'کاربر'
        verbose_name_plural = 'کاربران'
        indexes = [
            models.Index(fields=['phone']),
            models.Index(fields=['national_id']),
            models.Index(fields=['user_type']),
        ]
    
    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.phone})"
    
    @property
    def is_seller(self):
        return self.user_type in ['seller', 'hybrid']
    
    @property
    def is_courier(self):
        return self.user_type == 'courier'
    
    @property
    def is_service_provider(self):
        return self.user_type == 'service_provider'
    
    @property
    def subscription_active(self):
        if self.subscription_plan == 'free':
            return True
        if not self.subscription_expiry:
            return False
        return timezone.now() < self.subscription_expiry
    
    @property
    def monthly_order_limit(self):
        limits = {'free': 10, 'silver': 50, 'gold': float('inf')}
        return limits.get(self.subscription_plan, 10)
    
    @property
    def monthly_product_limit(self):
        limits = {'free': 10, 'silver': 50, 'gold': float('inf')}
        return limits.get(self.subscription_plan, 10)
    
    @property
    def monthly_service_limit(self):
        limits = {'free': 3, 'silver': 15, 'gold': float('inf')}
        return limits.get(self.subscription_plan, 3)


class OTPCode(models.Model):
    phone = models.CharField(max_length=15, verbose_name='شماره تلفن')
    code = models.CharField(max_length=6, verbose_name='کد')
    
    PURPOSE_CHOICES = [
        ('register', 'ثبت‌نام'),
        ('login', 'ورود'),
        ('order_confirm', 'تأیید سفارش'),
    ]
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, default='register', verbose_name='هدف')
    
    is_used = models.BooleanField(default=False, verbose_name='استفاده شده؟')
    expires_at = models.DateTimeField(verbose_name='تاریخ انقضا')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    
    class Meta:
        verbose_name = 'کد تأیید'
        verbose_name_plural = 'کدهای تأیید'
        indexes = [
            models.Index(fields=['phone', 'purpose']),
        ]
    
    def __str__(self):
        return f"{self.phone} - {self.code}"
    
    @classmethod
    def generate(cls, phone, purpose='register'):
        cls.objects.filter(phone=phone, purpose=purpose, is_used=False).update(is_used=True)
        code = str(random.randint(1000, 9999))
        expires_at = timezone.now() + timezone.timedelta(minutes=5)
        otp = cls.objects.create(phone=phone, code=code, purpose=purpose, expires_at=expires_at)
        return otp
    
    @property
    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at


class Wallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet', verbose_name='کاربر')
    balance = models.DecimalField(max_digits=12, decimal_places=0, default=0, verbose_name='موجودی (تومان)')
    frozen_balance = models.DecimalField(max_digits=12, decimal_places=0, default=0, verbose_name='موجودی مسدود (تومان)')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'کیف پول'
        verbose_name_plural = 'کیف پول‌ها'
    
    def __str__(self):
        return f"کیف پول {self.user.phone}: {self.balance:,} تومان"
    
    @property
    def available_balance(self):
        return self.balance - self.frozen_balance


class WalletTransaction(models.Model):
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions', verbose_name='کیف پول')
    
    TRANSACTION_TYPES = [
        ('deposit', '💰 شارژ کیف پول'),
        ('withdraw', '🏦 برداشت'),
        ('sale', '🛍️ درآمد فروش'),
        ('courier_fee', '🛵 هزینه پیک'),
        ('courier_income', '🛵 درآمد پیک'),
        ('refund', '↩️ بازگشت وجه'),
        ('commission', '📊 کارمزد راسته'),
        ('subscription', '⭐ شارژ اشتراک'),
        ('bonus', '🎁 هدیه'),
    ]
    
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES, verbose_name='نوع')
    amount = models.DecimalField(max_digits=12, decimal_places=0, verbose_name='مبلغ (تومان)')
    balance_after = models.DecimalField(max_digits=12, decimal_places=0, verbose_name='موجودی پس از تراکنش')
    description = models.CharField(max_length=255, verbose_name='توضیحات')
    
    reference_id = models.IntegerField(null=True, blank=True, verbose_name='شناسه مرجع')
    reference_type = models.CharField(max_length=50, null=True, blank=True, verbose_name='نوع مرجع')
    
    is_successful = models.BooleanField(default=True, verbose_name='موفق')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ')
    
    class Meta:
        verbose_name = 'تراکنش کیف پول'
        verbose_name_plural = 'تراکنش‌های کیف پول'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['wallet']),
            models.Index(fields=['transaction_type']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.wallet.user.phone}: {self.get_transaction_type_display()} {self.amount:,} تومان"


# ==================== ANTI-ABUSE ====================

class AbuseLog(models.Model):
    """ثبت تلاش‌های مشکوک و تقلب"""
    
    ACTION_CHOICES = [
        ('flagged', '🚩 پرچم‌گذاری'),
        ('blocked', '🚫 مسدود'),
        ('verified', '✅ تأیید هویت'),
        ('allowed', '🟢 مجاز'),
    ]
    
    # کاربر (اگر وجود داشته باشه)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='abuse_logs')
    
    # اطلاعات ثبت‌نام
    phone = models.CharField(max_length=15, null=True, blank=True, verbose_name='شماره تلفن')
    device_id = models.CharField(max_length=255, null=True, blank=True, db_index=True, verbose_name='شناسه دستگاه (FingerprintJS)')
    browser_id = models.CharField(max_length=255, null=True, blank=True, verbose_name='شناسه مرورگر (Local Storage)')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='آدرس IP')
    geo_location = models.CharField(max_length=255, null=True, blank=True, verbose_name='موقعیت جغرافیایی')
    
    # امتیاز ریسک
    risk_score = models.IntegerField(default=0, verbose_name='امتیاز ریسک (۰-۱۰۰)')
    risk_factors = models.JSONField(default=dict, verbose_name='عوامل ریسک')
    
    # اطلاعات دستگاه
    device_type = models.CharField(max_length=20, null=True, blank=True, verbose_name='نوع دستگاه')
    user_agent = models.TextField(null=True, blank=True, verbose_name='User Agent')
    
    # اقدام انجام شده
    action_taken = models.CharField(max_length=20, choices=ACTION_CHOICES, default='flagged', verbose_name='اقدام')
    
    # اطلاعات اضافه
    is_vpn = models.BooleanField(default=False, verbose_name='VPN/Proxy؟')
    is_emulator = models.BooleanField(default=False, verbose_name='شبیه‌ساز؟')
    is_rapid_signup = models.BooleanField(default=False, verbose_name='ثبت‌نام سریع؟')
    multiple_accounts_count = models.IntegerField(default=0, verbose_name='تعداد حساب‌های مرتبط')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ')
    
    class Meta:
        verbose_name = 'لاگ امنیتی'
        verbose_name_plural = 'لاگ‌های امنیتی'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['phone']),
            models.Index(fields=['device_id']),
            models.Index(fields=['ip_address']),
            models.Index(fields=['risk_score']),
        ]
    
    def __str__(self):
        return f"{self.phone or 'ناشناس'}: ریسک {self.risk_score}"
    
    @staticmethod
    def calculate_risk(device_id, browser_id, ip_address, phone, device_type='modern'):
        """محاسبه امتیاز ریسک با ۶ لایه"""
        risk = 0
        factors = {}
        
        # لایه ۱: بررسی تکراری بودن شماره
        if phone and User.objects.filter(phone=phone).exists():
            risk += 100
            factors['phone_duplicate'] = 100
        
        # لایه ۲: بررسی Device Fingerprint تکراری
        if device_id:
            existing = AbuseLog.objects.filter(device_id=device_id).exclude(phone=phone)
            if existing.exists():
                weight = 30 if device_type == 'modern' else 15
                risk += weight
                factors['device_fingerprint'] = weight
        
        # لایه ۳: بررسی Browser Fingerprint تکراری
        if browser_id:
            existing = AbuseLog.objects.filter(browser_id=browser_id).exclude(phone=phone)
            if existing.exists():
                weight = 20 if device_type == 'modern' else 30
                risk += weight
                factors['browser_fingerprint'] = weight
        
        # لایه ۴: بررسی IP
        if ip_address:
            # چک VPN/Proxy (ساده)
            if ip_address.startswith(('10.', '172.', '192.168.')):
                pass  # IP داخلی - نادیده بگیر
            else:
                existing = AbuseLog.objects.filter(ip_address=ip_address).exclude(phone=phone)
                if existing.exists():
                    risk += 40
                    factors['ip_match'] = 40
        
        # لایه ۵: ثبت‌نام سریع از یک دستگاه
        if device_id:
            recent = AbuseLog.objects.filter(
                device_id=device_id,
                created_at__gte=timezone.now() - timezone.timedelta(hours=24)
            ).count()
            if recent >= 2:
                risk += 30
                factors['rapid_signup'] = 30
        
        # لایه ۶: تعداد حساب‌های مرتبط
        if device_id:
            count = AbuseLog.objects.filter(device_id=device_id).count()
            if count >= 3:
                risk += 100
                factors['multiple_accounts'] = 100
        
        return min(risk, 100), factors
    
    @staticmethod
    def get_risk_level(score):
        """تعیین سطح ریسک"""
        if score >= 80:
            return 'high', '🚫 خطرناک - مسدود'
        elif score >= 60:
            return 'medium', '⚠️ مشکوک - نیاز به تأیید'
        elif score >= 30:
            return 'low', '🟡 کم'
        else:
            return 'normal', '🟢 عادی'
