from django.db import models
from django.contrib.auth.models import User
from imagekit.models import ImageSpecField
from imagekit.processors import ResizeToFill


class Manga(models.Model):
    title = models.CharField(max_length=100)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Page(models.Model):
    manga = models.ForeignKey(Manga, on_delete=models.CASCADE, related_name='pages')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    image = models.ImageField(upload_to='pages/')

    # ✅ 正方形にトリミングしたサムネイル（100x100）
    thumbnail = ImageSpecField(
        source='image',
        processors=[ResizeToFill(100, 100)],  # 長辺を基準にクロップして100x100に
        format='JPEG',
        options={'quality': 80}
    )

    created_at = models.DateTimeField(auto_now_add=True)
    parent = models.ForeignKey(
        'self', null=True, blank=True,
        related_name='children',
        on_delete=models.CASCADE
    )

    def __str__(self):
        return f"{self.manga.title} - Page {self.id} by {self.author.username}"
