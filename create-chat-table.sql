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
