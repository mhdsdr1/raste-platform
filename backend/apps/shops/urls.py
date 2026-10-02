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

urlpatterns += [
    path('<int:shop_id>/products/all/', views.list_all_products, name='list-all-products'),
]

urlpatterns += [
    path('<int:shop_id>/update/', views.update_shop, name='update-shop'),
]

urlpatterns += [
    path('products/<int:product_id>/delete/', views.delete_product, name='delete-product'),
]

urlpatterns += [
    path('expenses/', views.list_expenses, name='list-expenses'),
    path('expenses/create/', views.create_expense, name='create-expense'),
    path('expenses/<int:expense_id>/delete/', views.delete_expense, name='delete-expense'),
]

urlpatterns += [
    path('expenses/<int:expense_id>/', views.update_expense, name='update-expense'),
]

urlpatterns += [
    path('expenses/matrix/', views.expenses_matrix, name='expenses-matrix'),
    # بدهکاران و بستانکاران
    path('debts/', views.list_debts, name='list-debts'),
    path('debts/create/', views.create_debt, name='create-debt'),
    path('debts/person/', views.get_person_by_nid, name='get-person-by-nid'),
    path('debts/<int:debt_id>/', views.update_debt, name='update-debt'),
    path('debts/<int:debt_id>/delete/', views.delete_debt, name='delete-debt'),
    path('debts/<int:debt_id>/pay/', views.pay_debt, name='pay-debt'),

]
