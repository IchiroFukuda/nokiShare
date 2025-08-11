# 環境設定管理ガイド

このプロジェクトでは、複数の環境（ローカル、ステージング、本番）に対応した設定ファイルを使用しています。

## 📁 環境設定ファイル一覧

### 1. ローカル開発環境
- **ファイル**: `env.local.example` → `.env.local`
- **用途**: 開発者のローカルマシンでの開発・テスト
- **特徴**: 
  - デバッグログ有効
  - ローカルSupabase使用
  - テスト用APIキー

### 2. ステージング環境
- **ファイル**: `env.staging.example` → `.env.staging`
- **用途**: 本番前の最終テスト環境
- **特徴**:
  - 本番に近い設定
  - テスト用APIキー
  - 監視・ログ機能有効

### 3. 本番環境
- **ファイル**: `env.production.example` → `.env.production`
- **用途**: 実際のユーザーが使用する本番環境
- **特徴**:
  - 本番用APIキー
  - セキュリティ強化
  - パフォーマンス最適化

## 🚀 セットアップ手順

### ローカル環境のセットアップ

```bash
# 1. 環境設定ファイルをコピー
cp env.local.example .env.local

# 2. 必要な値を設定
# - Supabase URL/キー
# - データベース接続情報
# - その他の設定値

# 3. アプリケーション起動
npm run dev
```

### ステージング環境のセットアップ

```bash
# 1. 環境設定ファイルをコピー
cp env.staging.example .env.staging

# 2. 本番環境に近い値を設定
# - ステージング用Supabase
# - ステージング用ドメイン
# - テスト用APIキー

# 3. 環境変数を設定
export NODE_ENV=staging
npm run build
npm start
```

### 本番環境のセットアップ

```bash
# 1. 環境設定ファイルをコピー
cp env.production.example .env.production

# 2. 本番用の値を設定
# - 本番用Supabase
# - 本番用ドメイン
# - 本番用APIキー

# 3. 環境変数を設定
export NODE_ENV=production
npm run build
npm start
```

## 🔐 セキュリティ設定

### 本番環境での必須設定

1. **強力なシークレットキー**
   ```bash
   # 32文字以上のランダムな文字列
   JWT_SECRET=your-very-long-and-random-secret-key-here
   ENCRYPTION_KEY=your-very-long-and-random-encryption-key-here
   ```

2. **HTTPS強制**
   ```bash
   FORCE_HTTPS=true
   HSTS_MAX_AGE=31536000
   ```

3. **レート制限**
   ```bash
   ENABLE_RATE_LIMITING=true
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

## 📊 監視・ログ設定

### 本番環境での監視設定

1. **エラー監視**
   ```bash
   SENTRY_DSN=your-production-sentry-dsn
   ```

2. **パフォーマンス監視**
   ```bash
   NEW_RELIC_LICENSE_KEY=your-new-relic-key
   ```

3. **ログ集約**
   ```bash
   LOG_AGGREGATION_URL=your-production-log-url
   ```

## 🗄️ データベース設定

### 環境別データベース設定

| 環境 | データベース | 用途 |
|------|-------------|------|
| ローカル | ローカルPostgreSQL | 開発・テスト |
| ステージング | ステージングSupabase | 統合テスト |
| 本番 | 本番Supabase | 実際のユーザー |

## 🔄 環境切り替え

### 開発時の環境切り替え

```bash
# ローカル環境
npm run dev

# ステージング環境
NODE_ENV=staging npm run dev

# 本番環境（開発時は推奨しない）
NODE_ENV=production npm run dev
```

### デプロイ時の環境切り替え

```bash
# ステージングデプロイ
npm run build:staging
npm run deploy:staging

# 本番デプロイ
npm run build:production
npm run deploy:production
```

## ⚠️ 注意事項

1. **機密情報の管理**
   - `.env.*` ファイルはGitにコミットしない
   - 本番環境のシークレットは安全に管理
   - CI/CDで環境変数を適切に設定

2. **環境設定の検証**
   - デプロイ前に設定値の確認
   - 本番環境での動作テスト
   - セキュリティ設定の確認

3. **バックアップ・復旧**
   - 環境設定のバックアップ
   - 緊急時の復旧手順
   - 設定変更の履歴管理

## 📝 設定変更時のチェックリスト

- [ ] 環境設定ファイルの更新
- [ ] データベース接続の確認
- [ ] APIキーの有効性確認
- [ ] セキュリティ設定の確認
- [ ] パフォーマンス設定の確認
- [ ] 監視・ログ設定の確認
- [ ] 動作テストの実行
- [ ] チームメンバーへの通知 
