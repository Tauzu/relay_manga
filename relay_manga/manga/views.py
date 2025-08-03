from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from .forms import PageForm
from .models import Page

def home(request):
    return render(request, 'manga/home.html')

@login_required
def create_page(request):
    if request.method == "POST":
        form = PageForm(request.POST, request.FILES)
        if form.is_valid():
            page = form.save(commit=False)
            page.author = request.user
            page.save()
            return redirect('page_list')
    else:
        form = PageForm()
    return render(request, 'manga/create_page.html', {'form': form})

def page_list(request):
    pages = Page.objects.all().order_by('-created_at')
    return render(request, 'manga/page_list.html', {'pages': pages})
