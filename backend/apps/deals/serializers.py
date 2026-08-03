from rest_framework import serializers
from .models import GroupDeal, GroupDealParticipant


class GroupDealCreateSerializer(serializers.Serializer):
    """سریالایزر ایجاد هم‌خرید"""
    title = serializers.CharField(max_length=200)
    description = serializers.CharField()
    market_price = serializers.IntegerField(min_value=1000)
    wholesale_price = serializers.IntegerField(min_value=1000)
    min_participants = serializers.IntegerField(min_value=2)
    payment_type = serializers.ChoiceField(choices=['full', 'deposit'], default='full')
    deposit_percent = serializers.IntegerField(default=30, min_value=1, max_value=99)
    deadline_hours = serializers.IntegerField(default=48, min_value=1, max_value=168)  # ۱ تا ۱۶۸ ساعت
    slug = serializers.SlugField()


class GroupDealSerializer(serializers.ModelSerializer):
    """سریالایزر نمایش هم‌خرید"""
    deal_maker_name = serializers.CharField(source='deal_maker.get_full_name', read_only=True)
    remaining_slots = serializers.IntegerField(read_only=True)
    progress_percent = serializers.IntegerField(read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    calculated_price = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = GroupDeal
        fields = [
            'id', 'title', 'description', 'image',
            'market_price', 'wholesale_price', 'discount_percent',
            'min_participants', 'current_participants', 'remaining_slots',
            'progress_percent', 'calculated_price',
            'payment_type', 'deposit_percent',
            'deadline', 'is_expired', 'status',
            'deal_maker', 'deal_maker_name', 'slug',
            'created_at',
        ]
        read_only_fields = ['id', 'deal_maker', 'current_participants', 'status', 'created_at']


class ParticipantSerializer(serializers.ModelSerializer):
    """سریالایزر ثبت‌نام در هم‌خرید"""
    class Meta:
        model = GroupDealParticipant
        fields = ['guest_name', 'guest_phone']
