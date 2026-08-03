from django.urls import path
from . import views

urlpatterns = [
    # Courier
    path('register/', views.register_courier, name='register-courier'),
    path('upload-docs/', views.upload_documents, name='upload-docs'),
    path('pricing/', views.list_pricing, name='list-pricing'),
    
    # Requests
    path('request/', views.request_courier, name='request-courier'),
    path('accept/<int:request_id>/', views.accept_request, name='accept-request'),
]
