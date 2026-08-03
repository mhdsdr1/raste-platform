from django.urls import path
from . import views

urlpatterns = [
    # Orders
    path('create/', views.create_order, name='create-order'),
    path('my/', views.my_orders, name='my-orders'),
    path('track/<str:tracking_code>/', views.order_detail, name='order-detail'),
    path('<int:order_id>/status/', views.update_order_status, name='update-order-status'),
    
    # Discount Codes
    path('discounts/create/', views.create_discount_code, name='create-discount'),
    path('discounts/my/', views.my_discount_codes, name='my-discounts'),
    path('discounts/validate/', views.validate_discount_code, name='validate-discount'),
]
