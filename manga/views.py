from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LoginView
from django.contrib.auth import login
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.core.mail import send_mail
from django.conf import settings
from .models import Manga, Page, Baton, UserProfile
from .forms import MangaForm, PageForm, SignupWithEmailForm, UserProfileForm, BatonPassForm, UsernameChangeForm
import json


def home(request):
    return render(request, 'manga/home.html')


@login_required
def create_manga(request):
    if request.method == "POST":
        form = MangaForm(request.POST, request.FILES)
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
        thumbnail_url = page.image.build_url(width=100, height=100, crop='fill') if page.image else ''
        
        nodes.append({
            "id": page.id,
            "title": page.display_title,
            "author": page.author.username,
            "imageUrl": thumbnail_url,
            "level": get_depth(page),
        })

        if page.parent_id:
            edges.append({"from": page.parent_id, "to": page.id})

    return render(request, 'manga/manga_detail.html', {
        'manga': manga,
        'nodes': json.dumps(nodes),
        'edges': json.dumps(edges),
    })


def page_viewer(request, page_id):
    """クリックしたページから、親→子（優先度順）までのリストを構築してビューアに渡す"""
    page = get_object_or_404(Page, id=page_id)

    # 1. 親ページをすべて再帰的に遡る
    ancestors = []
    current = page.parent
    while current:
        ancestors.insert(0, current)
        current = current.parent

    # 2. 優先度の高い子を再帰的にたどる
    descendants = []
    def traverse_best_child(p):
        children = list(p.children.all())
        if not children:
            return
        best_child = max(children, key=lambda c: c.get_priority())
        descendants.append(best_child)
        traverse_best_child(best_child)

    traverse_best_child(page)

    # 3. リストを統合
    ordered_pages = ancestors + [page] + descendants

    # 4. JSON用データ
    pages_data = []
    for p in ordered_pages:
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
            "children": children_data,
        })

    current_index = ordered_pages.index(page)

    # 5. ツリービュー用データ
    manga = page.manga
    all_pages = list(manga.pages.select_related('author', 'parent'))

    def get_depth(p):
        depth = 0
        parent = p.parent
        while parent:
            depth += 1
            parent = parent.parent
        return depth

    nodes = []
    edges = []
    for p in all_pages:
        thumbnail_url = p.image.build_url(width=100, height=100, crop='fill') if p.image else ''
        
        nodes.append({
            "id": p.id,
            "title": p.display_title,
            "author": p.author.username,
            "imageUrl": thumbnail_url,
            "level": get_depth(p),
        })

        if p.parent_id:
            edges.append({"from": p.parent_id, "to": p.id})

    return render(request, "manga/viewer.html", {
        "manga": page.manga,
        "pages": ordered_pages,
        "pages_json": json.dumps(pages_data),
        "current_index": current_index,
        "first_page": page,
        "nodes": json.dumps(nodes),
        "edges": json.dumps(edges),
        "current_page_id": page.id,
    })


def page_branches_json(request, page_id):
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

    if parent is None and manga.pages.filter(parent__isnull=True).exists():
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
def manga_editor(request, manga_id, parent_id=None):
    """おえかきエディタ画面"""
    manga = get_object_or_404(Manga, id=manga_id)
    parent = None
    if parent_id:
        parent = get_object_or_404(Page, id=parent_id, manga=manga)
    
    return render(request, 'manga/manga_editor.html', {
        'manga': manga,
        'parent': parent,
    })


def page_list(request):
    pages = Page.objects.all().order_by('-created_at')
    return render(request, 'manga/page_list.html', {'pages': pages})


@require_POST
def like_page(request, page_id):
    """ページに1うぃーね追加"""
    page = get_object_or_404(Page, id=page_id)
    page.likes += 1
    page.save(update_fields=["likes"])
    return JsonResponse({"likes": page.likes})


# ========== バトンパス機能 ==========

@login_required
def pass_baton(request, page_id):
    """バトンパス処理"""
    page = get_object_or_404(Page, id=page_id)
    
    if request.method == 'POST':
        form = BatonPassForm(request.POST)
        if form.is_valid():
            to_user = form.cleaned_data['to_user']
            
            # 自分自身には送れない
            if to_user == request.user:
                form.add_error('to_user', '自分自身にはバトンを渡せません')
            else:
                # バトン作成
                baton = Baton.objects.create(
                    page=page,
                    from_user=request.user,
                    to_user=to_user
                )
                
                # メール通知
                try:
                    if hasattr(to_user, 'profile') and to_user.profile.email:
                        send_mail(
                            subject=f'【リレーマンガ】{request.user.username}さんからバトンが届きました',
                            message=f'{request.user.username}さんから「{page.manga.title}」のバトンが届きました。\n'
                                    f'ページ: {page.display_title}\n'
                                    f'マイページから確認してください。',
                            from_email=settings.DEFAULT_FROM_EMAIL,
                            recipient_list=[to_user.profile.email],
                            fail_silently=True,
                        )
                except Exception as e:
                    pass  # メール送信失敗しても処理は続行
                
                return redirect('page_viewer', page_id=page.id)
    else:
        form = BatonPassForm()
    
    return render(request, 'manga/pass_baton.html', {
        'form': form,
        'page': page,
    })


@login_required
def my_page(request):
    """マイページ"""
    user = request.user
    
    # 自分が描いたページ
    my_pages = Page.objects.filter(author=user).select_related('manga').order_by('-created_at')
    
    # 未達成バトンをページごとにグループ化
    pending_batons_raw = Baton.objects.filter(
        to_user=user,
        is_completed=False
    ).select_related('page__manga', 'from_user').order_by('-created_at')
    
    # ページIDごとにグループ化
    pending_grouped = {}
    for baton in pending_batons_raw:
        page_id = baton.page.id
        if page_id not in pending_grouped:
            pending_grouped[page_id] = {
                'page': baton.page,
                'senders': [],
                'latest_date': baton.created_at,
                'count': 0
            }
        pending_grouped[page_id]['senders'].append(baton.from_user.username)
        pending_grouped[page_id]['count'] += 1
        if baton.created_at > pending_grouped[page_id]['latest_date']:
            pending_grouped[page_id]['latest_date'] = baton.created_at
    
    # リスト形式に変換
    pending_batons = []
    for group_data in pending_grouped.values():
        pending_batons.append({
            'page': group_data['page'],
            'first_sender': group_data['senders'][0],
            'count': group_data['count'],
            'latest_date': group_data['latest_date']
        })
    
    # 最新順にソート
    pending_batons.sort(key=lambda x: x['latest_date'], reverse=True)
    
    # 達成済みバトンをページごとにグループ化
    completed_batons_raw = Baton.objects.filter(
        to_user=user,
        is_completed=True
    ).select_related('page__manga', 'from_user').order_by('-created_at')
    
    # ページIDごとにグループ化
    completed_grouped = {}
    for baton in completed_batons_raw:
        page_id = baton.page.id
        if page_id not in completed_grouped:
            completed_grouped[page_id] = {
                'page': baton.page,
                'senders': [],
                'latest_date': baton.created_at,
                'count': 0
            }
        completed_grouped[page_id]['senders'].append(baton.from_user.username)
        completed_grouped[page_id]['count'] += 1
        if baton.created_at > completed_grouped[page_id]['latest_date']:
            completed_grouped[page_id]['latest_date'] = baton.created_at
    
    # リスト形式に変換
    completed_batons = []
    for group_data in completed_grouped.values():
        completed_batons.append({
            'page': group_data['page'],
            'first_sender': group_data['senders'][0],
            'count': group_data['count'],
            'latest_date': group_data['latest_date']
        })
    
    # 最新順にソート
    completed_batons.sort(key=lambda x: x['latest_date'], reverse=True)
    
    # プロフィールフォーム
    profile, created = UserProfile.objects.get_or_create(user=user)
    
    # ユーザー名変更フォーム
    username_form = UsernameChangeForm(user=user)
    
    if request.method == 'POST':
        action = request.POST.get('action')
        
        if action == 'update_profile':
            form = UserProfileForm(request.POST, instance=profile)
            if form.is_valid():
                form.save()
                return redirect('my_page')
        
        elif action == 'change_username':
            username_form = UsernameChangeForm(request.POST, user=user)
            if username_form.is_valid():
                user.username = username_form.cleaned_data['new_username']
                user.save()
                return redirect('my_page')
        
        profile_form = UserProfileForm(instance=profile)
    else:
        profile_form = UserProfileForm(instance=profile)
    
    return render(request, 'manga/my_page.html', {
        'my_pages': my_pages,
        'pending_batons': pending_batons,
        'completed_batons': completed_batons,
        'profile_form': profile_form,
        'username_form': username_form,
    })

# ========== 認証関連 ==========

class CustomLoginView(LoginView):
    template_name = "registration/login.html"

    def get_success_url(self):
        next_url = self.request.GET.get("next") or self.request.POST.get("next")
        return next_url or super().get_success_url()


def signup(request):
    if request.method == "POST":
        form = SignupWithEmailForm(request.POST)
        if form.is_valid():
            user = form.save()
            
            # メールアドレスが入力されていればプロフィールに保存
            email = form.cleaned_data.get('email')
            if email:
                profile, created = UserProfile.objects.get_or_create(user=user)
                profile.email = email
                profile.save()
            
            login(request, user)
            return redirect("home")
    else:
        form = SignupWithEmailForm()
    return render(request, "registration/signup.html", {"form": form})