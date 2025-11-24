from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Page, Baton, UserProfile
from django.contrib.auth.models import User

@receiver(post_save, sender=Page)
def update_manga_timestamp(sender, instance, created, **kwargs):
    """
    Page が新規作成された場合のみ、親の Manga の updated_at を更新する
    """
    if created:
        manga = instance.manga
        manga.updated_at = timezone.now()
        manga.save(update_fields=["updated_at"])


@receiver(post_save, sender=Page)
def complete_batons(sender, instance, created, **kwargs):
    """
    新しいページが追加されたら、親ページへのバトンを完了にする
    """
    if created and instance.parent:
        # 親ページへの未完了バトンを完了にする
        Baton.objects.filter(
            page=instance.parent,
            to_user=instance.author,
            is_completed=False
        ).update(is_completed=True)


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    ユーザー作成時に自動的にUserProfileを作成
    """
    if created:
        UserProfile.objects.get_or_create(user=instance)