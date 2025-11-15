from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Page

@receiver(post_save, sender=Page)
def update_manga_timestamp(sender, instance, created, **kwargs):
    """
    Page が新規作成された場合のみ、親の Manga の updated_at を更新する
    """
    if created:
        manga = instance.manga
        manga.updated_at = timezone.now()
        manga.save(update_fields=["updated_at"])
