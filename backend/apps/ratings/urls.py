from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.create_rating, name='create-rating'),
    path('user/<int:user_id>/', views.user_ratings, name='user-ratings'),
    path('hidden/set/', views.set_hidden_rating, name='set-hidden-rating'),
    path('hidden/my/', views.my_hidden_ratings, name='my-hidden-ratings'),
]
