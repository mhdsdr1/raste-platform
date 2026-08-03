from django.contrib import admin
from .models import GroupDeal, GroupDealParticipant


@admin.register(GroupDeal)
class GroupDealAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'deal_maker', 'status', 'current_participants', 'min_participants', 'deadline']
    list_filter = ['status']
    search_fields = ['title', 'deal_maker__phone']


@admin.register(GroupDealParticipant)
class GroupDealParticipantAdmin(admin.ModelAdmin):
    list_display = ['group_deal', 'guest_name', 'guest_phone', 'payment_status', 'created_at']
    list_filter = ['payment_status']
