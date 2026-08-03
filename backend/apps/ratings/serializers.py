from rest_framework import serializers
from .models import PublicRating, SellerHiddenRating


class PublicRatingCreateSerializer(serializers.Serializer):
    """سریالایزر ایجاد امتیاز"""
    order_id = serializers.IntegerField()
    target_type = serializers.ChoiceField(choices=['seller', 'courier'])
    stars = serializers.IntegerField(min_value=1, max_value=3)
    comment = serializers.CharField(required=False, allow_blank=True)
    
    # عوامل فروشنده
    quality_score = serializers.IntegerField(min_value=1, max_value=3, required=False)
    speed_score = serializers.IntegerField(min_value=1, max_value=3, required=False)
    communication_score = serializers.IntegerField(min_value=1, max_value=3, required=False)
    accuracy_score = serializers.IntegerField(min_value=1, max_value=3, required=False)
    
    # عوامل پیک
    delivery_speed_score = serializers.IntegerField(min_value=1, max_value=3, required=False)
    behavior_score = serializers.IntegerField(min_value=1, max_value=3, required=False)
    package_health_score = serializers.IntegerField(min_value=1, max_value=3, required=False)


class PublicRatingSerializer(serializers.ModelSerializer):
    """سریالایزر نمایش امتیاز"""
    rater_name = serializers.CharField(source='rater.get_full_name', read_only=True)
    stars_display = serializers.SerializerMethodField()
    
    class Meta:
        model = PublicRating
        fields = [
            'id', 'rater', 'rater_name', 'rated_user',
            'target_type', 'order', 'stars', 'stars_display', 'score',
            'quality_score', 'speed_score', 'communication_score', 'accuracy_score',
            'delivery_speed_score', 'behavior_score', 'package_health_score',
            'comment', 'created_at',
        ]
        read_only_fields = ['id', 'rater', 'score', 'created_at']
    
    def get_stars_display(self, obj):
        return '⭐' * obj.stars


class UserRatingSummarySerializer(serializers.Serializer):
    """سریالایزر خلاصه امتیازات یک کاربر"""
    average_stars = serializers.FloatField()
    total_ratings = serializers.IntegerField()
    average_score = serializers.IntegerField()
    stars_display = serializers.CharField()


class SellerHiddenRatingSerializer(serializers.ModelSerializer):
    """سریالایزر امتیاز مخفی مشتری"""
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    
    class Meta:
        model = SellerHiddenRating
        fields = [
            'id', 'seller', 'customer', 'customer_name', 'customer_phone',
            'loyalty_score', 'prompt_payment_score', 'low_return_score', 'referral_score',
            'total_score', 'seller_note', 'updated_at',
        ]
        read_only_fields = ['id', 'seller', 'total_score', 'updated_at']
