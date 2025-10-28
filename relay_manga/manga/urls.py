from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('new/', views.create_manga, name='create_manga'),
    path('list/', views.manga_list, name='manga_list'),
    path('<int:manga_id>/', views.manga_detail, name='manga_detail'),
    path('<int:manga_id>/create/', views.create_page, name='create_page'),  # 親なし
    path('page/<int:parent_id>/continue/', views.continue_page, name='continue_page'),  # 親あり
    path('page/<int:page_id>/', views.page_detail, name='page_detail'),
    path('page/<int:page_id>/like/', views.like_page, name='like_page'),
    path('page/<int:page_id>/like_status/', views.page_like_status, name='page_like_status'),
    path("page/<int:page_id>/viewer/", views.page_viewer, name="page_viewer"),
    path("page/<int:page_id>/branches/", views.page_branches_json, name="page_branches_json"),
]
