# Gunicorn設定ファイル
import os

# ワーカー設定
workers = 2
worker_class = 'sync'

# タイムアウト設定（AI画像生成用に延長）
timeout = 180  # 3分（AI画像生成は30秒〜2分かかる可能性がある）
graceful_timeout = 30
keepalive = 5

# ログ設定
accesslog = '-'
errorlog = '-'
loglevel = 'info'

# バインド設定
bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"

# リソース制限
max_requests = 1000
max_requests_jitter = 50
