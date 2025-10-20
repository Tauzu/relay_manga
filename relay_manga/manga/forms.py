from django import forms
from .models import Manga, Page

class MangaForm(forms.ModelForm):
    class Meta:
        model = Manga
        fields = ['title']

class PageForm(forms.ModelForm):
    class Meta:
        model = Page
        fields = ['title', 'image', 'parent']
        widgets = {
            'title': forms.TextInput(attrs={'class': 'border rounded px-2 py-1 w-full', 'placeholder': 'ページタイトル'}),
        }
