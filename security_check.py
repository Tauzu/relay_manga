#!/usr/bin/env python
"""
本番環境デプロイ前のセキュリティチェックスクリプト
"""
import os
import sys

def check_environment():
    """環境変数のチェック"""
    required_vars = [
        'SECRET_KEY',
        'DATABASE_URL',
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET',
        'ALLOWED_HOSTS',
    ]
    
    optional_vars = [
        'EMAIL_HOST_USER',
        'EMAIL_HOST_PASSWORD',
    ]
    
    print("=== 環境変数チェック ===\n")
    
    all_ok = True
    for var in required_vars:
        if os.environ.get(var):
            print(f"✅ {var}: 設定済み")
        else:
            print(f"❌ {var}: 未設定（必須）")
            all_ok = False
    
    print()
    for var in optional_vars:
        if os.environ.get(var):
            print(f"✅ {var}: 設定済み")
        else:
            print(f"⚠️  {var}: 未設定（メール機能が使えません）")
    
    return all_ok

def check_debug_mode():
    """DEBUGモードのチェック"""
    print("\n=== DEBUGモードチェック ===\n")
    
    debug = os.environ.get('DEBUG', 'True')
    if debug.lower() in ['false', '0', 'no']:
        print("✅ DEBUG=False（本番環境向け）")
        return True
    else:
        print("❌ DEBUG=True（開発環境向け）")
        print("   本番環境ではDEBUG=Falseに設定してください")
        return False

def check_secret_key():
    """SECRET_KEYの強度チェック"""
    print("\n=== SECRET_KEYチェック ===\n")
    
    secret_key = os.environ.get('SECRET_KEY', '')
    
    if not secret_key:
        print("❌ SECRET_KEYが設定されていません")
        return False
    
    if len(secret_key) < 50:
        print("⚠️  SECRET_KEYが短すぎます（50文字以上推奨）")
        return False
    
    if 'django-insecure' in secret_key:
        print("❌ デフォルトのSECRET_KEYが使用されています")
        return False
    
    print(f"✅ SECRET_KEY: 適切な長さ（{len(secret_key)}文字）")
    return True

def check_allowed_hosts():
    """ALLOWED_HOSTSのチェック"""
    print("\n=== ALLOWED_HOSTSチェック ===\n")
    
    allowed_hosts = os.environ.get('ALLOWED_HOSTS', '')
    
    if not allowed_hosts:
        print("❌ ALLOWED_HOSTSが設定されていません")
        return False
    
    if '*' in allowed_hosts:
        print("❌ ALLOWED_HOSTSに'*'が含まれています（セキュリティリスク）")
        return False
    
    hosts = [h.strip() for h in allowed_hosts.split(',')]
    print(f"✅ ALLOWED_HOSTS: {', '.join(hosts)}")
    return True

def check_database():
    """データベース設定のチェック"""
    print("\n=== データベースチェック ===\n")
    
    db_url = os.environ.get('DATABASE_URL', '')
    
    if not db_url:
        print("❌ DATABASE_URLが設定されていません")
        return False
    
    if 'sqlite' in db_url.lower():
        print("⚠️  SQLiteが使用されています（本番環境ではPostgreSQL推奨）")
        return False
    
    if 'postgres' in db_url.lower():
        print("✅ PostgreSQLが設定されています")
        return True
    
    print("⚠️  不明なデータベース設定です")
    return False

def main():
    """メインチェック処理"""
    print("=" * 50)
    print("リレーマンガ - 本番環境セキュリティチェック")
    print("=" * 50)
    
    checks = [
        check_environment(),
        check_debug_mode(),
        check_secret_key(),
        check_allowed_hosts(),
        check_database(),
    ]
    
    print("\n" + "=" * 50)
    if all(checks):
        print("✅ すべてのチェックに合格しました！")
        print("=" * 50)
        return 0
    else:
        print("❌ 一部のチェックに失敗しました")
        print("   上記の問題を修正してから再度実行してください")
        print("=" * 50)
        return 1

if __name__ == '__main__':
    sys.exit(main())
