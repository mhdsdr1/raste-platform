from django.db import models
from django.conf import settings


class ChatRoom(models.Model):
    """اتاق گفتگو"""
    
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='chat_rooms',
        verbose_name='شرکت‌کنندگان'
    )
    
    # می‌تونه مربوط به یه سفارش خاص باشه
    order = models.ForeignKey(
        'orders.Order',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='chat_rooms',
        verbose_name='سفارش مرتبط'
    )
    
    is_active = models.BooleanField(default=True, verbose_name='فعال')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='آخرین پیام')
    
    class Meta:
        verbose_name = 'اتاق گفتگو'
        verbose_name_plural = 'اتاق‌های گفتگو'
        ordering = ['-updated_at']
    
    def __str__(self):
        participants = self.participants.all()
        names = ', '.join([p.phone for p in participants[:3]])
        return f"گفتگو: {names}"
    
    @property
    def last_message(self):
        """آخرین پیام"""
        return self.messages.order_by('-created_at').first()
    
    @property
    def unread_count(self):
        """تعداد پیام‌های خوانده نشده"""
        return self.messages.filter(is_read=False).count()


class ChatMessage(models.Model):
    """پیام چت"""
    
    MESSAGE_TYPES = [
        ('text', '📝 متن'),
        ('image', '🖼️ تصویر'),
        ('product', '🛍️ محصول'),
        ('location', '📍 موقعیت'),
        ('order', '📦 سفارش'),
    ]
    
    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name='اتاق'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages',
        verbose_name='فرستنده'
    )
    
    # نوع پیام
    message_type = models.CharField(
        max_length=15, choices=MESSAGE_TYPES,
        default='text', verbose_name='نوع پیام'
    )
    
    # محتوا
    content = models.TextField(null=True, blank=True, verbose_name='متن پیام')
    attachment = models.FileField(
        upload_to='chat/%Y/%m/', null=True, blank=True,
        verbose_name='فایل پیوست'
    )
    
    # برای پیام‌های محصول و سفارش
    reference_id = models.IntegerField(null=True, blank=True, verbose_name='شناسه مرجع')
    
    # وضعیت
    is_read = models.BooleanField(default=False, verbose_name='خوانده شده')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ارسال')
    
    class Meta:
        verbose_name = 'پیام'
        verbose_name_plural = 'پیام‌ها'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['room', 'created_at']),
            models.Index(fields=['sender']),
        ]
    
    def __str__(self):
        return f"{self.sender.phone}: {self.content[:50]}"
