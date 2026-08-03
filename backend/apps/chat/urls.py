from django.urls import path
from . import views

urlpatterns = [
    path('rooms/', views.my_rooms, name='my-rooms'),
    path('rooms/create/', views.create_or_get_room, name='create-room'),
    path('rooms/<int:room_id>/', views.room_messages, name='room-messages'),
    path('rooms/<int:room_id>/send/', views.send_message, name='send-message'),
    path('rooms/<int:room_id>/search/', views.search_messages, name='search-messages'),
]
