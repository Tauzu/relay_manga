from django.db import models
from django.contrib.auth.models import User
from imagekit.models import ImageSpecField
from imagekit.processors import ResizeToFill
from imagekit.models import ProcessedImageField
from imagekit.processors import ResizeToFit

class Manga(models.Model):
    title = models.CharField(max_length=100)

    # 表紙画像を軽量化
    cover_image = ProcessedImageField(
        upload_to='covers/',
        processors=[ResizeToFit(800, 800)],  # 表紙は少し小さめでもOK
        format='JPEG',
        options={'quality': 85},
        null=True,
        blank=True
    )

    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # ✅ 自動更新フィールド

    def __str__(self):
        return self.title


class Page(models.Model):
    manga = models.ForeignKey(Manga, on_delete=models.CASCADE, related_name='pages')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=100, blank=True, default="")

    # imagekit による自動リサイズ・圧縮
    image = ProcessedImageField(
        upload_to='pages/',
        processors=[ResizeToFit(1280, 1280)],  # 最大1280pxにリサイズ
        format='JPEG',
        options={'quality': 85}  # 画質85で軽量化
    )

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
    likes = models.PositiveIntegerField(default=0)  # 👍 いいね数

    @property
    def display_title(self):
        """空なら 'Page {id}' を返す"""
        return self.title or f"Page {self.id}"

    def __str__(self):
        return f"{self.manga.title} - {self.display_title} by {self.author.username}"

    def count_descendants(self):
        """再帰的にすべての子孫ページ数を数える"""
        total = self.children.count()
        for child in self.children.all():
            total += child.count_descendants()
        return total

    @property
    def likes(self):
        return self.likes_rel.count()  # 👍 PageLike を数える

    # --- 💡 優先度（いいね数＋子孫の総数） ---
    def get_priority(self):
        """このページの優先度（いいね数＋子孫の総数）を返す"""
        total = self.likes  # likes フィールドがある前提
        for child in self.children.all():
            total += 1 + child.get_priority()  # 子も再帰的に足す
        return total

class PageLike(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name="likes_rel")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "page")  # ✅ ユーザーごとに1回だけ
