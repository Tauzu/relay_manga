from django.contrib import admin
from .models import Manga, Page, UserProfile, Baton

@admin.register(Manga)
class MangaAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'created_by', 'created_at')

@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ('id', 'manga', 'author', 'created_at', 'parent', 'title')

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'email')
    search_fields = ('user__username', 'email')

@admin.register(Baton)
class BatonAdmin(admin.ModelAdmin):
    list_display = ('id', 'from_user', 'to_user', 'page', 'created_at', 'is_completed')
    list_filter = ('is_completed', 'created_at')
    search_fields = ('from_user__username', 'to_user__username')