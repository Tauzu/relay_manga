from django.db import models
from django.contrib.auth.models import User
from cloudinary.models import CloudinaryField

class Manga(models.Model):
    title = models.CharField(max_length=100)
    
    # CloudinaryFieldに変更
    cover_image = CloudinaryField(
        'image',
        blank=True,
        null=True,
        folder='covers',
        transformation={
            'width': 800,
            'height': 800,
            'crop': 'limit',
            'quality': 85,
            'fetch_format': 'auto'
        }
    )
    
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class Page(models.Model):
    manga = models.ForeignKey(Manga, on_delete=models.CASCADE, related_name='pages')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=100, blank=True, default="")
    
    # CloudinaryFieldに変更
    image = CloudinaryField(
        'image',
        folder='pages',
        transformation={
            'width': 1280,
            'height': 1280,
            'crop': 'limit',
            'quality': 85,
            'fetch_format': 'auto'
        }
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    parent = models.ForeignKey(
        'self', null=True, blank=True,
        related_name='children',
        on_delete=models.CASCADE
    )
    
    likes = models.PositiveIntegerField(default=0)

    @property
    def display_title(self):
        """空なら 'Page {id}' を返す"""
        return self.title or f"Page {self.id}"
    
    @property
    def thumbnail(self):
        """サムネイル用のURL生成"""
        if self.image:
            # Cloudinaryの変換パラメータでサムネイル生成
            return type('obj', (object,), {
                'url': self.image.build_url(width=100, height=100, crop='fill')
            })
        return None

    def __str__(self):
        return f"{self.manga.title} - {self.display_title} by {self.author.username}"

    def count_descendants(self):
        """再帰的にすべての子孫ページ数を数える"""
        total = self.children.count()
        for child in self.children.all():
            total += child.count_descendants()
        return total

    def get_priority(self):
        """ページの優先度（likes + 子孫の優先度）"""
        total = self.likes
        for child in self.children.all():
            total += 1 + child.get_priority()
        return total