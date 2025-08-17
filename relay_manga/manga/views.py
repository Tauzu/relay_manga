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

def manga_detail(request, manga_id):
    manga = get_object_or_404(Manga, id=manga_id)
    root_pages = manga.pages.filter(parent__isnull=True)
    return render(request, 'manga/manga_detail.html', {
        'manga': manga,
        'root_pages': root_pages
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
