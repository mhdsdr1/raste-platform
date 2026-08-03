from . import views_marketplace
from django.urls import path
from . import views

urlpatterns = [
    # Shop URLs
    path('', views.create_shop, name='create-shop'),
    path('my/', views.list_my_shops, name='my-shops'),
    path('<int:shop_id>/', views.shop_detail, name='shop-detail'),
    
    # Product URLs
    path('<int:shop_id>/products/', views.create_product, name='create-product'),
    path('<int:shop_id>/products/list/', views.list_products, name='list-products'),
    path('products/<int:product_id>/', views.product_detail, name='product-detail'),
]

# Marketplace URLs
urlpatterns += [
    path('marketplace/', views_marketplace.marketplace_search, name='marketplace-search'),
    path('marketplace/suggestions/', views_marketplace.search_suggestions, name='search-suggestions'),
    path('marketplace/categories/', views_marketplace.marketplace_categories, name='marketplace-categories'),
]

# Product update endpoint
urlpatterns += [
    path('products/<int:product_id>/update/', views.update_product, name='update-product'),
]

# All products (including hidden) for seller
urlpatterns += [
    path('<int:shop_id>/products/all/', views.list_all_products, name='list-all-products'),
]

urlpatterns += [
    path('products/<int:product_id>/notify/', views.notify_me, name='notify-me'),
]
