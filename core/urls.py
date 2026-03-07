from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/upload/', views.upload_document, name='upload_document'),
    path('api/payment/', views.process_payment, name='process_payment'),
    path('api/status/<str:access_code>/', views.check_status, name='check_status'),
]
