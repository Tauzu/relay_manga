from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('new/', views.create_manga, name='create_manga'),
    path('list/', views.manga_list, name='manga_list'),
    path('<int:manga_id>/', views.manga_viewer, name='manga_viewer'),
    path('<int:manga_id>/create/', views.create_page, name='create_page'),
    path('<int:manga_id>/editor/', views.manga_editor, name='manga_editor'),
    path('<int:manga_id>/editor/<int:parent_id>/', views.manga_editor, name='manga_editor_with_parent'),
    path('page/<int:parent_id>/continue/', views.continue_page, name='continue_page'),
    path('page/<int:page_id>/like/', views.like_page, name='like_page'),
    path("page/<int:page_id>/viewer/", views.page_viewer, name="page_viewer"),
    path("page/<int:page_id>/branches/", views.page_branches_json, name="page_branches_json"),
    
    # バトンパス機能
    path('page/<int:page_id>/pass-baton/', views.pass_baton, name='pass_baton'),
    path('my-page/', views.my_page, name='my_page'),

    # AI画像生成
    path('page/<int:parent_id>/generate-ai/', views.generate_page_with_ai, name='generate_page_with_ai'),
]