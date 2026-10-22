from . import views
from django.urls import path
from .installment_summary import installment_shop_summary
from . import installments_views
from . import views_marketplace

urlpatterns = [
    path('products/<int:product_id>/appeal/', views.submit_appeal, name='submit-appeal'),
    path('appeals/', views.list_appeals, name='list-appeals'),
    path('appeals/<int:product_id>/review/', views.review_appeal, name='review-appeal'),

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
    # پرداخت‌ها
    path('debts/<int:debt_id>/payments/', views.list_payments, name='list-payments'),
    path('debts/<int:debt_id>/payments/create/', views.create_payment, name='create-payment'),
    path('debts/payments/<int:payment_id>/delete/', views.delete_payment, name='delete-payment'),
    # اقساط
    path('installments/', installments_views.list_installment_plans, name='list-installments'),
    path('installments/shop-summary/', installment_shop_summary, name='installment-shop-summary'),
    path('installments/create/', installments_views.create_installment_plan, name='create-installment'),
    path('installments/calculate/', installments_views.calculate_installments, name='calculate-installments'),
    path('installments/person/', installments_views.get_person_installments, name='person-installments'),
    path('installments/<int:installment_id>/toggle/', installments_views.toggle_installment_paid, name='toggle-installment'),
    path('installments/<int:plan_id>/delete/', installments_views.delete_installment_plan, name='delete-installment'),
    path('installments/<int:installment_id>/update-amount/', installments_views.update_installment_amount, name='update-installment-amount'),
    path('installments/<int:plan_id>/update-person/', installments_views.update_plan_person, name='update-plan-person'),



]
