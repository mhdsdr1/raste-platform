from django.urls import path
from . import views

urlpatterns = [
    # نوتیفیکیشن‌ها
    path('notifications/', views.notification_list, name='notifications'),
    path('notifications/unread/', views.notification_unread_count, name='notif-unread'),
    path('notifications/<int:notif_id>/read/', views.notification_mark_read, name='notif-read'),
    path('notifications/read-all/', views.notification_mark_all_read, name='notif-read-all'),
    path('notifications/<int:notif_id>/', views.notification_delete, name='notif-delete'),


    # پروفایل
    path('profile/', views.profile_view, name='profile'),
    path('addresses/', views.address_list, name='addresses'),
    path('addresses/<int:address_id>/', views.address_detail, name='address-detail'),
    path('favorites/', views.favorite_list, name='favorites'),
    path('favorites/<int:product_id>/', views.favorite_delete, name='favorite-delete'),
    path('wallet/', views.wallet_info, name='wallet-info'),

    # Auth
    path('auth/request-otp/', views.request_otp, name='request-otp'),
    path('auth/verify-otp/', views.verify_otp, name='verify-otp'),
    path('me/', views.me, name='me'),
]

# Wallet URLs
from . import views_wallet

urlpatterns += [
    path('wallet/', views_wallet.my_wallet, name='my-wallet'),
    path('wallet/transactions/', views_wallet.my_transactions, name='wallet-transactions'),
    path('wallet/charge/', views_wallet.charge_wallet, name='charge-wallet'),
    path('wallet/withdraw/', views_wallet.withdraw, name='withdraw'),
]

# Anti-Abuse URLs
from . import views_antiabuse

urlpatterns += [
    path('anti-abuse/report-device/', views_antiabuse.report_device, name='report-device'),
    path('anti-abuse/logs/', views_antiabuse.abuse_logs, name='abuse-logs'),
    path('anti-abuse/check/<int:user_id>/', views_antiabuse.check_user_risk, name='check-risk'),
]
