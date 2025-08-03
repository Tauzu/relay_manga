from django.db import models
from django.contrib.auth.models import User

class Page(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    image = models.ImageField(upload_to='pages/')
    created_at = models.DateTimeField(auto_now_add=True)
    parent = models.ForeignKey(
        'self', null=True, blank=True,
        related_name='children',
        on_delete=models.CASCADE
    )

    def __str__(self):
        return f"Page {self.id} by {self.author.username}"
