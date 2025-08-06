from django import forms
from .models import Manga, Page

class MangaForm(forms.ModelForm):
    class Meta:
        model = Manga
        fields = ['title']

class PageForm(forms.ModelForm):
    class Meta:
        model = Page
        fields = ['image', 'parent']
