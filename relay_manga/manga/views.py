from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import Manga, Page, PageLike
from .forms import MangaForm, PageForm

def home(request):
    return render(request, 'manga/home.html')

@login_required
def create_manga(request):
    if request.method == 'POST':
        form = MangaForm(request.POST)
        if form.is_valid():
            manga = form.save(commit=False)
            # ログインしているときだけユーザーをセット
            if request.user.is_authenticated:
                manga.created_by = request.user
            manga.save()
            return redirect('manga_detail', manga_id=manga.id)
    else:
        form = MangaForm()
    return render(request, 'manga/create_manga.html', {'form': form})

def manga_list(request):
    mangas = Manga.objects.all().order_by('-created_at')
    return render(request, 'manga/manga_list.html', {'mangas': mangas})

import json

def manga_detail(request, manga_id):
    manga = get_object_or_404(Manga, id=manga_id)
    pages = list(manga.pages.select_related('author', 'parent'))

    nodes = []
    edges = []
    for page in pages:
        nodes.append({
            "id": page.id,
            "label": f"Page {page.id}\n{page.author.username}",
            "imageUrl": page.thumbnail.url,  # ✅ カスタムツールチップ用
        })

        if page.parent_id:
            edges.append({"from": page.parent_id, "to": page.id})

    return render(request, 'manga/manga_detail.html', {
        'manga': manga,
        'nodes': json.dumps(nodes),
        'edges': json.dumps(edges),
    })

def manga_tree(request, manga_id):
    manga = get_object_or_404(Manga, id=manga_id)
    pages = manga.pages.all()

    nodes = []
    edges = []

    for page in pages:
        nodes.append({
            "id": page.id,
            "label": f"Page {page.id}\n{page.author.username}",
            "title": f"<img src='{page.thumbnail.url}' width='120'>",  # ✅ サムネイルをツールチップに
        })
        if page.parent:
            edges.append({"from": page.parent.id, "to": page.id})

    return render(request, "manga/manga_tree.html", {
        "manga": manga,
        "nodes": nodes,
        "edges": edges,
    })

def page_detail(request, page_id):
    page = get_object_or_404(Page, id=page_id)

    # 親ページ
    parent = page.parent

    # 子ページ一覧
    children = list(page.children.all())

    # 優先度で最大の子を「次のページ」に設定
    next_page = None
    if children:
        next_page = max(children, key=lambda c: c.priority)

    # ✅ ユーザーがいいね済みかどうか判定
    liked = False
    if request.user.is_authenticated:
        liked = PageLike.objects.filter(user=request.user, page=page).exists()

    return render(request, 'manga/page_detail.html', {
        'page': page,
        'parent': parent,
        'next_page': next_page,
        'children': children,
        'liked': liked,   # ← テンプレートに渡す
    })

@login_required
def create_page(request, manga_id, parent_id=None):
    manga = get_object_or_404(Manga, id=manga_id)
    parent = None
    if parent_id:
        parent = get_object_or_404(Page, id=parent_id, manga=manga)

    # ✅ ルートページ制御：親なしで新規作成しようとしている場合
    if parent is None and manga.pages.filter(parent__isnull=True).exists():
        # すでにルートがあるのでマンガ詳細にリダイレクト
        return redirect('manga_detail', manga_id=manga.id)

    if request.method == 'POST':
        form = PageForm(request.POST, request.FILES)
        if form.is_valid():
            page = form.save(commit=False)
            page.manga = manga
            page.author = request.user
            if parent:
                page.parent = parent
            page.save()
            return redirect('manga_detail', manga_id=manga.id)
    else:
        form = PageForm()

    return render(request, 'manga/create_page.html', {
        'form': form,
        'manga': manga,
        'parent': parent,
    })

@login_required
def continue_page(request, parent_id):
    parent = get_object_or_404(Page, id=parent_id)
    manga = parent.manga

    if request.method == 'POST':
        form = PageForm(request.POST, request.FILES)
        if form.is_valid():
            page = form.save(commit=False)
            page.manga = manga
            page.author = request.user
            page.parent = parent   # ✅ 親をセット
            page.save()
            return redirect('manga_detail', manga_id=manga.id)
    else:
        form = PageForm()

    return render(request, 'manga/create_page.html', {
        'form': form,
        'manga': manga,
        'parent': parent,   # ✅ ここで親情報をテンプレートに渡す
    })

def page_list(request):
    pages = Page.objects.all().order_by('-created_at')
    return render(request, 'manga/page_list.html', {'pages': pages})

from django.http import JsonResponse
from django.views.decorators.http import require_POST

@login_required
@require_POST
def like_page(request, page_id):
    page = get_object_or_404(Page, id=page_id)

    # ✅ すでにいいねしているか確認
    like, created = PageLike.objects.get_or_create(user=request.user, page=page)

    return JsonResponse({
        "likes": page.likes,
        "already": not created
    })

from django.contrib.auth.views import LoginView
from django.urls import reverse

class CustomLoginView(LoginView):
    def get_success_url(self):
        next_url = self.get_redirect_url()  # ログインフォームの hidden input に入ってる next の値
        if next_url and "/like/" in next_url:
            # 例: /page/3/like/ → /page/3/
            page_id = next_url.split("/")[2]
            return reverse("page_detail", args=[page_id])
        return super().get_success_url()


from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login

def signup(request):
    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)  # 登録後すぐログイン状態にする
            return redirect("home")
    else:
        form = UserCreationForm()
    return render(request, "registration/signup.html", {"form": form})
