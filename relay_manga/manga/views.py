from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import Manga, Page
from .forms import MangaForm, PageForm
import json

def home(request):
    return render(request, 'manga/home.html')

@login_required
def create_manga(request):
    if request.method == "POST":
        form = MangaForm(request.POST, request.FILES)  # ✅ FILES を追加
        if form.is_valid():
            manga = form.save(commit=False)
            manga.created_by = request.user
            manga.save()
            return redirect('manga_detail', manga_id=manga.id)
    else:
        form = MangaForm()
    return render(request, 'manga/create_manga.html', {'form': form})

def manga_list(request):
    mangas = Manga.objects.all().order_by('-updated_at')
    return render(request, 'manga/manga_list.html', {'mangas': mangas})

def manga_detail(request, manga_id):
    manga = get_object_or_404(Manga, id=manga_id)
    pages = list(manga.pages.select_related('author', 'parent'))

    # --- 各ページの深さを計算 ---
    def get_depth(page):
        depth = 0
        p = page.parent
        while p:
            depth += 1
            p = p.parent
        return depth

    nodes = []
    edges = []
    for page in pages:
        nodes.append({
            "id": page.id,
            "title": page.display_title,
            "author": page.author.username,
            "imageUrl": page.thumbnail.url,
            "level": get_depth(page),
        })

        if page.parent_id:
            edges.append({"from": page.parent_id, "to": page.id})

    return render(request, 'manga/manga_detail.html', {
        'manga': manga,
        'nodes': json.dumps(nodes),
        'edges': json.dumps(edges),
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

    # ✅ ユーザーがうぃーね済みかどうか判定
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

def page_viewer(request, page_id):
    """クリックしたページから、親→子（優先度順）までのリストを構築してビューアに渡す"""
    page = get_object_or_404(Page, id=page_id)

    # 🔹 1. 親ページをすべて再帰的に遡る
    ancestors = []
    current = page.parent
    while current:
        ancestors.insert(0, current)
        current = current.parent

    # 🔹 2. 優先度の高い子を再帰的にたどる
    descendants = []
    def traverse_best_child(p):
        children = list(p.children.all())
        if not children:
            return
        best_child = max(children, key=lambda c: c.get_priority())
        descendants.append(best_child)
        traverse_best_child(best_child)

    traverse_best_child(page)

    # 🔹 3. リストを統合（親 → 現在 → 優先子孫）
    ordered_pages = ancestors + [page] + descendants

    # 🔹 4. JSON 用データ
    pages_data = []
    for p in ordered_pages:
        # 子ページ（分岐先）も含める
        children_data = [
            {
                "id": c.id,
                "title": c.display_title,
                "author": c.author.username,
                "priority": c.get_priority(),
            }
            for c in p.children.all()
        ]

        pages_data.append({
            "id": p.id,
            "title": p.display_title,
            "image": p.image.url,
            "likes": p.likes,
            "like_url": f"/page/{p.id}/like/",
            "author": p.author.username,
            "children": children_data,  # ✅ 追加！
        })

    # 現在のページのインデックスを特定
    current_index = ordered_pages.index(page)

    return render(request, "manga/viewer.html", {
        "manga": page.manga,
        "pages": ordered_pages,
        "pages_json": pages_data,
        "current_index": current_index,
        "first_page": page,
    })

def page_branches_json(request, page_id):
    """指定ページの分岐（子ページ）を返す"""
    page = get_object_or_404(Page, id=page_id)
    children = page.children.all()

    data = [
        {
            "id": child.id,
            "title": child.display_title,
            "author": child.author.username,
            "priority": child.get_priority(),
        }
        for child in children
    ]
    return JsonResponse({"branches": data})

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

@require_POST
def like_page(request, page_id):
    """ページに1うぃーね追加（ログインしていてもしていなくても同じ扱い）"""
    page = get_object_or_404(Page, id=page_id)

    # 👍 likes を1つ加算
    page.likes += 1
    page.save(update_fields=["likes"])

    return JsonResponse({
        "likes": page.likes
    })


from django.contrib.auth.views import LoginView

class CustomLoginView(LoginView):
    template_name = "registration/login.html"

    def get_success_url(self):
        next_url = self.request.GET.get("next") or self.request.POST.get("next")
        return next_url or super().get_success_url()


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
