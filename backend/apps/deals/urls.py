from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.create_deal, name='create-deal'),
    path('list/', views.list_deals, name='list-deals'),
    path('my/', views.my_deals, name='my-deals'),
    path('<slug:slug>/', views.deal_detail, name='deal-detail'),
    path('<slug:slug>/join/', views.join_deal, name='join-deal'),
]
