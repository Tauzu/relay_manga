from django.contrib import admin
from .models import Manga, Page

@admin.register(Manga)
class MangaAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'created_by', 'created_at')

@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ('id', 'manga', 'author', 'created_at', 'parent')
