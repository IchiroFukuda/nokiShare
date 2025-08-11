# チャット機能のセットアップ

このドキュメントでは、NokiShareにチャット機能を追加する手順を説明します。

## 前提条件

- Supabaseプロジェクトが設定済み
- 基本的なデータベーステーブル（companies, users, products）が作成済み

## セットアップ手順

### 1. チャットテーブルの作成

`create-chat-table.sql`ファイルの内容をSupabaseのSQLエディタで実行してください：

```sql
-- チャットメッセージテーブル
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'company')),
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- チャットメッセージテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_chat_messages_product_id ON public.chat_messages(product_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- RLS (Row Level Security) の設定
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- チャットメッセージテーブルのポリシー
-- 製品に関連するメッセージは誰でも読み取り可能（公開ページ用）
CREATE POLICY "Chat messages are viewable by everyone" ON public.chat_messages
  FOR SELECT USING (true);

-- メッセージの挿入は誰でも可能（公開ページ用）
CREATE POLICY "Chat messages are insertable by everyone" ON public.chat_messages
  FOR INSERT WITH CHECK (true);

-- 権限設定
GRANT ALL PRIVILEGES ON public.chat_messages TO authenticated;
GRANT ALL PRIVILEGES ON public.chat_messages TO anon;
```

### 2. リアルタイム機能の有効化

Supabaseのダッシュボードで、リアルタイム機能を有効にしてください：

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. 左側のメニューから「Database」→「Replication」を選択
4. 「chat_messages」テーブルの「INSERT」イベントを有効化

### 3. アプリケーションの再起動

チャット機能を有効にするために、アプリケーションを再起動してください：

```bash
npm run dev
```

## 機能の確認

### 会社側での確認

1. 製品詳細ページ（`/products/[id]`）にアクセス
2. ページ下部にチャットコンポーネントが表示されることを確認
3. メッセージを送信して動作を確認

### 顧客側での確認

1. 共有された製品ページ（`/public/products/[unique_key]`）にアクセス
2. ページ下部にチャットコンポーネントが表示されることを確認
3. メッセージを送信して動作を確認

## トラブルシューティング

### チャットが表示されない場合

1. データベーステーブルが正しく作成されているか確認
2. ブラウザのコンソールでエラーメッセージを確認
3. Supabaseの接続設定が正しいか確認

### リアルタイム更新が動作しない場合

1. Supabaseのリアルタイム機能が有効化されているか確認
2. ブラウザのコンソールでエラーメッセージを確認
3. ネットワーク接続を確認

### メッセージの送信に失敗する場合

1. APIエンドポイント（`/api/chat/[product_id]`）が正しく動作しているか確認
2. データベースの権限設定を確認
3. 製品IDが正しく渡されているか確認

## セキュリティに関する注意事項

- チャットメッセージは誰でも読み取り・送信可能です
- 機密情報を含むメッセージの送信は避けてください
- 必要に応じて、認証や承認機能を追加することを検討してください

## カスタマイズ

チャット機能は以下の方法でカスタマイズできます：

- メッセージの表示スタイルの変更
- ファイル添付機能の追加
- 既読機能の追加
- 通知機能の追加
- メッセージの検索・フィルタリング機能の追加 
