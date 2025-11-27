from .models import Baton

def pending_baton_count(request):
    """
    未達成バトン数をすべてのテンプレートで利用可能にする
    """
    if request.user.is_authenticated:
        # 未達成バトンのページ数（重複を除く）
        count = Baton.objects.filter(
            to_user=request.user,
            is_completed=False
        ).values('page').distinct().count()
        
        return {'pending_baton_count': count}
    
    return {'pending_baton_count': 0}