from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),            # ホーム画面
    path('list/', views.page_list, name='page_list'),  
    path('create/', views.create_page, name='create_page'),
]
