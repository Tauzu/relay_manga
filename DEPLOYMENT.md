# リレーマンガ - デプロイ手順書

## 前提条件

1. Renderアカウントの作成
2. Cloudinaryアカウントの作成
3. Gmailアカウント（メール送信用）

---

## 1. Cloudinaryの設定

### 1.1 アカウント作成
1. [Cloudinary](https://cloudinary.com/)にアクセス
2. 無料アカウントを作成

### 1.2 API情報の取得
1. ダッシュボードから以下の情報をコピー：
   - Cloud Name
   - API Key
   - API Secret

---

## 2. Gmailアプリパスワードの設定

### 2.1 2段階認証の有効化
1. Googleアカウントのセキュリティ設定にアクセス
2. 2段階認証を有効化

### 2.2 アプリパスワードの生成
1. [アプリパスワード](https://myaccount.google.com/apppasswords)にアクセス
2. アプリを選択：「メール」
3. デバイスを選択：「その他」→「Django App」
4. 生成されたパスワードをコピー（16桁）

---

## 3. Renderへのデプロイ

### 3.1 新規Webサービスの作成
1. [Render](https://render.com/)にログイン
2. 「New」→「Web Service」を選択
3. GitHubリポジトリを接続
4. 以下の設定を入力：

```
Name: relay-manga
Environment: Python 3
Build Command: ./build.sh
Start Command: gunicorn relay_manga.wsgi:application
```

### 3.2 PostgreSQLデータベースの作成
1. 「New」→「PostgreSQL」を選択
2. 以下の設定を入力：

```
Name: relay-manga-db
Database: relay_manga
User: relay_manga_user
```

3. データベース作成後、「Internal Database URL」をコピー

### 3.3 環境変数の設定

Webサービスの「Environment」タブで以下を設定：

#### 必須の環境変数

```bash
# Django設定
SECRET_KEY=<自動生成されたキー>
DEBUG=False
ALLOWED_HOSTS=your-app-name.onrender.com
RENDER=True

# データベース
DATABASE_URL=<PostgreSQLのInternal Database URL>

# Cloudinary
CLOUDINARY_CLOUD_NAME=<CloudinaryのCloud Name>
CLOUDINARY_API_KEY=<CloudinaryのAPI Key>
CLOUDINARY_API_SECRET=<CloudinaryのAPI Secret>

# メール設定
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=<あなたのGmailアドレス>
EMAIL_HOST_PASSWORD=<Gmailアプリパスワード>
DEFAULT_FROM_EMAIL=noreply@relay-manga.com
```

---

## 4. デプロイ実行

### 4.1 手動デプロイ
1. 「Manual Deploy」→「Deploy latest commit」をクリック
2. ビルドログを確認

### 4.2 自動デプロイの設定
1. 「Settings」→「Build & Deploy」
2. 「Auto-Deploy」を有効化
3. これでGitHubにpushすると自動デプロイされます

---

## 5. デプロイ後の確認

### 5.1 管理者ユーザーの作成
Renderのシェルから実行：

```bash
python manage.py createsuperuser
```

### 5.2 動作確認
1. `https://your-app-name.onrender.com`にアクセス
2. 新規登録してメールアドレスを登録
3. バトンパス機能でメール送信をテスト

---

## 6. トラブルシューティング

### エラー: "DisallowedHost"
→ `ALLOWED_HOSTS`にドメインが含まれているか確認

### エラー: "CSRF verification failed"
→ `CSRF_TRUSTED_ORIGINS`が正しく設定されているか確認

### メールが送信されない
→ Gmailアプリパスワードが正しいか確認
→ 2段階認証が有効になっているか確認

### 画像がアップロードできない
→ Cloudinary設定が正しいか確認
→ 環境変数が正しく設定されているか確認

---

## 7. セキュリティチェックリスト

- [ ] `DEBUG=False`になっている
- [ ] `SECRET_KEY`が本番用に変更されている
- [ ] `ALLOWED_HOSTS`が適切に設定されている
- [ ] データベースURLが外部に漏れていない
- [ ] Cloudinary APIキーが外部に漏れていない
- [ ] メールパスワードが外部に漏れていない
- [ ] HTTPS（SSL）が有効になっている

---

## 8. パフォーマンス最適化

### 8.1 推奨設定
- Renderのプラン：Starter（$7/month）以上推奨
- PostgreSQL：Starter（$7/month）以上推奨
- Cloudinary：無料プランで十分（25GB/月）

### 8.2 キャッシュ設定（オプション）
将来的にRedisを追加することで高速化可能

---

## 9. バックアップ

### 9.1 データベースバックアップ
Renderは自動的に日次バックアップを作成

### 9.2 手動バックアップ
```bash
# Renderシェルから実行
python manage.py dumpdata > backup.json
```

---

## 10. 更新手順

### 10.1 コード更新
```bash
git add .
git commit -m "Update message"
git push origin main
```

→ 自動デプロイが有効なら自動的にデプロイされます

### 10.2 マイグレーション
新しいモデルを追加した場合：

```bash
# ローカルで実行
python manage.py makemigrations
git add manga/migrations/*
git commit -m "Add new migration"
git push
```

Renderが自動的に`python manage.py migrate`を実行します

---

## サポート

問題が発生した場合：
1. Renderのログを確認
2. エラーメッセージをGoogle検索
3. Django公式ドキュメントを参照
