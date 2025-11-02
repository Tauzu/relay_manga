from django import forms
from .models import Manga, Page

class MangaForm(forms.ModelForm):
    class Meta:
        model = Manga
        fields = ['title', 'cover_image']
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300',
                'placeholder': 'マンガのタイトルを入力'
            }),
            'cover_image': forms.ClearableFileInput(attrs={
                'class': 'hidden',
                'accept': 'image/*'
            }),
        }
        labels = {
            'title': 'タイトル',
            'cover_image': '表紙画像',
        }

class PageForm(forms.ModelForm):
    class Meta:
        model = Page
        fields = ['title', 'image', 'parent']
        widgets = {
            'title': forms.TextInput(attrs={'class': 'border rounded px-2 py-1 w-full', 'placeholder': 'ページタイトル'}),
        }
