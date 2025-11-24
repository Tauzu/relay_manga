# リレーマンガ

誰でもマンガの続きが描ける！コラボレーション型マンガ投稿サイト

## 特徴

- 🎨 **ブラウザで描ける**: おえかきエディタ搭載
- 🌳 **分岐型ストーリー**: 一つのマンガから複数の続きが生まれる
- 👥 **バトンパス機能**: 特定のユーザーに続きを依頼
- 👍 **うぃーね機能**: お気に入りのページを応援
- 📱 **レスポンシブ対応**: スマホでも快適に閲覧・投稿

## 技術スタック

- **Backend**: Django 5.2.4
- **Frontend**: TailwindCSS, Fabric.js, Vis.js
- **Database**: PostgreSQL
- **Storage**: Cloudinary
- **Hosting**: Render

## ローカル開発環境のセットアップ

### 必要なもの
- Python 3.11+
- Git

### インストール手順

1. リポジトリをクローン
```bash
git clone https://github.com/your-username/relay-manga.git
cd relay-manga
```

2. 仮想環境を作成・有効化
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

3. 依存パッケージをインストール
```bash
pip install -r requirements.txt
```

4. 環境変数を設定
```bash
cp .env.example .env
# .envファイルを編集して必要な値を設定
```

5. マイグレーション実行
```bash
python manage.py migrate
```

6. 開発サーバー起動
```bash
python manage.py runserver
```

7. ブラウザで開く
```
http://localhost:8000
```

## 本番環境へのデプロイ

詳細は [DEPLOYMENT.md](DEPLOYMENT.md) を参照してください。

## 主な機能

### 1. マンガ作成
- タイトルと表紙画像を設定
- 最初のページを追加

### 2. ページ追加
- 既存のページの続きを描く
- おえかきエディタまたは画像アップロード
- 分岐（一つのページから複数の続き）が可能

### 3. ビューア
- スライド形式でページを閲覧
- ツリービューで全体構造を確認
- 優先度（いいね数）に基づいて自動的に最適なルートを表示

### 4. バトンパス
- 特定のユーザーに続きを依頼
- メール通知機能
- マイページで受け取ったバトンを確認

### 5. マイページ
- 自分が描いたページ一覧
- 受け取ったバトン一覧
- メールアドレス設定

## ディレクトリ構造

```
relay-manga/
├── manga/                  # メインアプリ
│   ├── models.py          # データモデル
│   ├── views.py           # ビュー
│   ├── forms.py           # フォーム
│   ├── urls.py            # URL設定
│   ├── static/            # 静的ファイル
│   └── templates/         # テンプレート
├── relay_manga/           # プロジェクト設定
│   ├── settings.py        # 基本設定
│   └── production_settings.py  # 本番環境設定
├── requirements.txt       # Python依存パッケージ
├── build.sh              # ビルドスクリプト
├── runtime.txt           # Pythonバージョン
└── manage.py             # Django管理コマンド
```

## ライセンス

MIT License

## 貢献

プルリクエスト歓迎！

## 作者

Your Name

## サポート

問題や質問がある場合は、GitHubのIssuesを作成してください。
