from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import Manga, Page
from .forms import MangaForm, PageForm

def home(request):
    return render(request, 'manga/home.html')

# @login_required
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

@login_required
def create_page(request, manga_id):
    manga = get_object_or_404(Manga, id=manga_id)

    if request.method == 'POST':
        form = PageForm(request.POST, request.FILES)
        if form.is_valid():
            page = form.save(commit=False)
            page.manga = manga
            page.author = request.user
            page.save()
            return redirect('manga_detail', manga_id=manga.id)
    else:
        form = PageForm()

    return render(request, 'manga/create_page.html', {
        'form': form,
        'manga': manga
    })

def page_list(request):
    pages = Page.objects.all().order_by('-created_at')
    return render(request, 'manga/page_list.html', {'pages': pages})
