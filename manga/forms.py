from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from .models import Manga, Page, UserProfile, Baton

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


class SignupWithEmailForm(UserCreationForm):
    """メールアドレス付き新規登録フォーム"""
    email = forms.EmailField(
        required=False,
        widget=forms.EmailInput(attrs={
            'class': 'w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300',
            'placeholder': 'メールアドレス（任意）'
        }),
        label='メールアドレス（任意）',
        help_text='バトンパスの通知を受け取る場合は入力してください'
    )
    
    class Meta:
        model = User
        fields = ('username', 'email', 'password1', 'password2')
        widgets = {
            'username': forms.TextInput(attrs={
                'class': 'w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300'
            })
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['password1'].widget.attrs.update({
            'class': 'w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300'
        })
        self.fields['password2'].widget.attrs.update({
            'class': 'w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300'
        })


class UserProfileForm(forms.ModelForm):
    """ユーザープロフィール編集フォーム"""
    class Meta:
        model = UserProfile
        fields = ['email']
        widgets = {
            'email': forms.EmailInput(attrs={
                'class': 'w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300',
                'placeholder': 'メールアドレス'
            })
        }
        labels = {
            'email': 'メールアドレス（任意）'
        }


class BatonPassForm(forms.Form):
    """バトンパスフォーム"""
    to_user = forms.CharField(
        label='送り先のユーザー名',
        widget=forms.TextInput(attrs={
            'class': 'w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300',
            'placeholder': 'ユーザー名を入力'
        })
    )
    
    def clean_to_user(self):
        username = self.cleaned_data['to_user']
        try:
            user = User.objects.get(username=username)
            return user
        except User.DoesNotExist:
            raise forms.ValidationError('指定されたユーザーが見つかりません')


class UsernameChangeForm(forms.Form):
    """ユーザー名変更フォーム"""
    new_username = forms.CharField(
        label='新しいユーザー名',
        max_length=150,
        widget=forms.TextInput(attrs={
            'class': 'w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300',
            'placeholder': '新しいユーザー名'
        })
    )
    
    def __init__(self, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = user
    
    def clean_new_username(self):
        new_username = self.cleaned_data['new_username']
        
        # 現在のユーザー名と同じ場合は変更不要
        if self.user and new_username == self.user.username:
            raise forms.ValidationError('現在と同じユーザー名です')
        
        # 既に使用されているか確認
        if User.objects.filter(username=new_username).exists():
            raise forms.ValidationError('このユーザー名は既に使用されています')
        
        return new_username