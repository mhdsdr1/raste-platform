from django.contrib import admin
from .models import PublicRating, SellerHiddenRating


@admin.register(PublicRating)
class PublicRatingAdmin(admin.ModelAdmin):
    list_display = ['rater', 'rated_user', 'target_type', 'stars', 'created_at']
    list_filter = ['target_type', 'stars']


@admin.register(SellerHiddenRating)
class SellerHiddenRatingAdmin(admin.ModelAdmin):
    list_display = ['seller', 'customer', 'total_score', 'loyalty_score']
