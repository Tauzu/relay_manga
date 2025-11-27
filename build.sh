#!/usr/bin/env bash
# exit on error
set -o errexit

echo "=================================="
echo "リレーマンガ - ビルド開始"
echo "=================================="

# 依存パッケージのインストール
echo "📦 依存パッケージをインストール中..."
pip install -r requirements.txt

# 静的ファイルの収集
echo "📁 静的ファイルを収集中..."
python manage.py collectstatic --no-input

# データベースマイグレーション
echo "🗄️  データベースをマイグレーション中..."
python manage.py migrate

echo "=================================="
echo "✅ ビルド完了！"
echo "=================================="