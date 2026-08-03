from django.urls import path
from . import views

urlpatterns = [
    # تنظیمات
    path('settings/', views.my_loyalty_settings, name='loyalty-settings'),
    
    # مشتری
    path('my/<int:seller_id>/', views.my_points_with_seller, name='my-points'),
    path('transactions/', views.my_transactions, name='my-transactions'),
    path('redeem/', views.redeem_points, name='redeem-points'),
    
    # فروشنده
    path('customers/', views.my_loyal_customers, name='my-customers'),
    path('bonus/', views.give_bonus_points, name='give-bonus'),
]
